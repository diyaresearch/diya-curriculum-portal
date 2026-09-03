# Security model

How authorization actually works in this codebase, and why it is arranged this
way. Written while closing issues #382, #419, #420, #422–#425, #427, #429 and
#430; each rule below exists because something specific went wrong.

`SECURITY.md` covers secret handling and incident history. This document covers
the runtime model.

## The shape of the problem

The frontend talks to Firestore **two ways**:

```
                     ┌── client SDK ──────────────► Firestore
  portal-app ────────┤                              (governed by firestore.rules)
                     └── HTTPS ──► Express API ───► Firestore
                                   Cloud Functions  (Admin SDK — bypasses rules)
```

Both paths reach the same data, and they are governed by completely different
mechanisms. **A check on one path is not a check on the other.** This is the
single most important thing to understand here: it is why the site appeared
healthy during the #418 outage (client reads worked, API reads did not), and
why server-side authorization alone was never sufficient.

Rule of thumb: if the client SDK can read it, only `firestore.rules` protects
it. If only the server can reach it, the API's middleware protects it.

## Layer 1 — Firestore rules

`portal-app/firestore.rules`. The only thing standing between a browser and the
database.

### Identity

| Collection | Read | Write |
|---|---|---|
| `users` | owner only | owner may create with a fixed default role (`teacherDefault` or `studentDefault`), and update everything except privileged fields |

Privileged fields — `role`, `subscriptionType`, `subscriptionStatus`,
`subscriptionEndDate`, `stripeCustomerId`, `stripePaymentIntentId` — can never
be written by a client. They are assigned server-side after payment
verification.

The escalation path that mattered: `hooks/useUseRole.js` trusts the profile
document's `role` field for admin checks, and the old rule let an owner
rewrite their own document freely — a working self-service admin grant from
the browser console (#419).

`teachers` and `students` used to be separate collections here, each with
their own copy of this rule; a `DATABASE_SCHEMA_QUALIFIER` prefix then
layered dev/prod into one shared Firebase project on top of that (#427). Both
were retired in #428: dev/staging and production are now separate Firebase
projects, so there is one `users` collection, unprefixed, everywhere — every
collection name below is likewise a plain literal, not a qualified one.

### Content

`module`, `lesson`, `content` are publicly readable: the landing page and
module list read them directly, unauthenticated. Any signed-in user may
write them.

**Pricing fields are the exception.** `price`, `Price` and `isFeatured` may only
be changed by an admin, because the Stripe charge is computed from `price` read
server-side at checkout. A client that can write that field can set its own
price (#429).

### Money and PII

`payment_logs`, `subscriptions`, `enterprise_contacts`, `counters` are
stated explicitly as `read, write: if false`. They were already denied by
default; naming them means the omission reads as deliberate and cannot be
reopened by a future catch-all match.

`entitlements` is readable by its owner and writable by nobody. Only the
Stripe webhook mints one, through the Admin SDK.

### Admin checks

```
isAdmin() = admin custom claim  OR  role == 'admin' in the profile document
```

The claim is a **fast path, never a gate**. It rides in the ID token and costs
nothing to read, but it only reaches the client on the next token refresh (up
to an hour), users predating the change have none, and `setCustomUserClaims`
can fail. So the document lookup remains, and the claim can only ever grant
access sooner or cheaper — never withhold it (#382).

Legacy roles such as `consumer` are deliberately outside the claim whitelist.
They are unprivileged, so they fall back to the document and lose nothing.

## Layer 2 — the API

The Admin SDK **bypasses rules entirely**. Every server-side check is therefore
the only check on that path.

- `authenticateUser` — requires a valid Firebase ID token
- `requireAdmin` / `requireRole` — role gate, reading the profile document
- `optionalAuth` — attaches a user when a token is present, proceeds when not.
  Used where a route is public but behaves differently for a signed-in user: a
  paid module returns storefront metadata to anonymous callers and full
  contents to an entitled one.

### Rate limiting (#383)

`server/middleware/rateLimiter.js` has two tiers:

- **General** — every `/api/*` route except `/api/health` (uptime monitoring
  polls that regularly and legitimately). `RATE_LIMIT_WINDOW_MS` /
  `RATE_LIMIT_MAX_REQUESTS` (`.env.*`, defaulting to 15 min / 100 requests)
  control it — these variables existed in every environment file and in
  `envValidator.js`'s optional-vars list well before anything read them.
- **Strict** — a separate, deliberately non-configurable, tighter budget (15
  min / 20 requests) on routes that are either expensive (a real Stripe API
  call) or a meaningful step in a flow worth throttling harder than general
  browsing: registration (`POST /api/user/register`), payment creation and
  confirmation, and subscription upgrades
  (`initiate-upgrade`/`complete-upgrade`). Mounted after `authenticateUser` on
  each of those routes specifically so it can key by uid.

`functions/middleware/rateLimiter.js` has just the strict tier, on the same
Stripe-calling routes in `functions/routes/payment.js` - #439 moved all
payment processing there, so those are the routes #383's own audit worried
about (#422/#425-adjacent concerns) in practice, not `server/`'s copies.

Both backends key by the authenticated user (`req.user.uid`) when there is
one, falling back to IP otherwise - a shared IP (a school network is the
obvious case here) does not mean a shared budget. `app.set('trust proxy', 1)`
is load-bearing for this in both `server/index.js` and `functions/index.js`:
App Engine and Cloud Functions each terminate the request through exactly one
proxy hop, and without trusting it every request looks like it comes from the
same address.

**Caveat, in both backends:** the limiter's store is in-memory, so it only
limits per *instance*. Both App Engine (`automatic_scaling.max_instances` in
`app.yaml`) and Cloud Functions can and do run several concurrent instances
under load - exactly when a limit matters most - so this raises the bar
significantly without being a hard global ceiling. A shared store (Firestore-
or Memorystore-backed, for instance) would close that gap; out of scope here.

### Ownership

`utils/ownership.js`. Ownership is recorded inconsistently, and the field names
do not tell you what a value means:

| Written by | `author` | `User` | `Author` |
|---|---|---|---|
| module / lesson | uid | — | — |
| content, client-created | — | uid | **display name** |
| content, server-created | — | — | **uid** |

So the obvious check — `Author === req.user.uid` — silently locks users out of
their own content. `resolveOwnerUid()` prefers the unambiguous fields and
accepts `Author` only when the value looks like a uid.

A document recording no owner is editable **only by an admin**. A missing owner
is not an invitation.

## Layer 3 — payments

Entitlements are granted only against a payment Stripe confirms:

1. The client asks the server to create a PaymentIntent or Checkout Session.
   **The amount is set server-side** from `planType` or the module's stored
   price; it is never accepted from the request body.
2. The client confirms with Stripe. Card details go directly to Stripe and
   never reach this application (#423).
3. The server retrieves the intent from Stripe and requires: status
   `succeeded`, `metadata.userId` matching the caller, and `metadata.planType`
   matching the plan being claimed — otherwise a monthly payment could be
   redeemed for a yearly subscription.
4. The grant is **claimed exactly once**. The PaymentIntent id is the document
   id of its own log entry, and `create()` fails if it exists, so a replayed
   confirmation loses the race and reports "already applied" rather than
   extending the term again. Stripe retries events routinely, so this is not
   hypothetical.

For module purchases the webhook additionally compares what Stripe charged
against the price recorded when the session was created. A mismatch is logged
and **the entitlement is withheld** rather than silently fulfilled.

## Environment separation (formerly a collection qualifier)

Environments used to be separated by a collection-name prefix instead of by
project: `prod.` for production, unprefixed for development, all three tiers
(frontend, backend, Cloud Functions) required to agree on the value. They did
not — the server used `prod_`, which no collection ever used, so every
production API request read and wrote an empty namespace and returned
`200 []` while doing it (#427).

That whole scheme — `DATABASE_SCHEMA_QUALIFIER`, `utils/schemaQualifier`, and
`functions/utils/identityCollections`'s independent qualifier logic — was
retired in #428. Dev, staging, and production are separate Firebase projects
now (see the README's "Staging project" section); every collection name is a
plain, unprefixed literal in every environment.

## Deploy order

Three orderings are load-bearing, each learned the hard way:

1. **Rules before the frontend that depends on them.** Firestore denies by
   default, so shipping a client that reads `users` before the rule exists
   costs every user their role.
2. **Hosting before the server when tightening auth.** A new frontend sending
   tokens to an old server is harmless; an old frontend without tokens against
   a new server is an outage.
3. **The entitlement webhook before any UI that gates on entitlement**, or a
   buyer pays and stays locked out.

## Known gaps

- **Lesson-level entitlement is not enforced in rules.** Lesson documents carry
  no `moduleId`, so no rule can express "this lesson belongs to a paid module".
  Gating them naively would also break listing: Firestore evaluates list rules
  per document and fails the whole query if any document fails, so the first
  paid lesson would break the module browser for everyone. The real fix is
  splitting public metadata from paid content (#430).
- **Rules are deployed by hand.** They should be deployed from source in CI
  (#435). The test suite runs in CI today; the deploy does not.

## Testing

| Suite | Location | Covers |
|---|---|---|
| Rules | `tests/rules/` | emulator-backed, every rule above |
| Server | `server/__tests__/` | auth middleware, ownership, entitlements, claims |

Both run in CI. Rules tests are checked against the *previous* rules as well:
if a test does not fail against the version it was written to fix, it is not
testing anything.
