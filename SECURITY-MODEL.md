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
| `{q}users` | owner only | never from the client — the API owns it |
| `{q}teachers`, `{q}students` | owner only | owner may create with a fixed default role, and update everything except privileged fields |

Privileged fields — `role`, `subscriptionType`, `subscriptionStatus`,
`subscriptionEndDate`, `stripeCustomerId`, `stripePaymentIntentId` — can never
be written by a client. They are assigned server-side after payment
verification.

The escalation path that mattered was not `users`. `hooks/useUseRole.js` trusts
`teachers/{uid}.role` for admin checks, and the old rule let an owner rewrite
their own document freely — a working self-service admin grant from the browser
console (#419).

### Content

`{q}module`, `{q}lesson`, `{q}content` are publicly readable: the landing page
and module list read them directly, unauthenticated. Any signed-in user may
write them.

**Pricing fields are the exception.** `price`, `Price` and `isFeatured` may only
be changed by an admin, because the Stripe charge is computed from `price` read
server-side at checkout. A client that can write that field can set its own
price (#429).

### Money and PII

`{q}payment_logs`, `{q}subscriptions`, `enterprise_contacts`, `{q}counters` are
stated explicitly as `read, write: if false`. They were already denied by
default; naming them means the omission reads as deliberate and cannot be
reopened by a future catch-all match.

`{q}entitlements` is readable by its owner and writable by nobody. Only the
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

## Collection qualifier

Environments are separated by a collection-name prefix:

| Environment | Qualifier |
|---|---|
| production | `prod.` |
| development | `` (unprefixed) |

All three tiers must agree. They did not: the server used `prod_`, which no
collection ever used, so every production API request read and wrote an empty
namespace and returned `200 []` while doing it (#427).

Consequences that still hold:

- Resolve it only through `utils/schemaQualifier` — never interpolate the env
  var, which yields the literal string `"undefined"` when unset and creates
  collections named `undefinedusers`.
- The server **refuses to boot** in production without it.
- Cloud Functions cannot use that module: it throws when the qualifier is unset
  in production, and Functions always run with `NODE_ENV=production` without
  setting it. `functions/utils/identityCollections` defaults to `prod.` instead.

## Deploy order

Three orderings are load-bearing, each learned the hard way:

1. **Rules before the frontend that depends on them.** Firestore denies by
   default, so shipping a client that reads `prod.teachers` before the rule
   exists costs every user their role.
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
- **`teachers` / `students` remain readable at their unprefixed names** as a
  transitional fallback for profiles not yet copied. They are now the
  development-side data.

## Testing

| Suite | Location | Covers |
|---|---|---|
| Rules | `tests/rules/` | emulator-backed, every rule above |
| Server | `server/__tests__/` | auth middleware, ownership, entitlements, qualifier, claims |

Both run in CI. Rules tests are checked against the *previous* rules as well:
if a test does not fail against the version it was written to fix, it is not
testing anything.
