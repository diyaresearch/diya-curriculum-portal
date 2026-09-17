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

`module` and `content` are publicly readable: the landing page and module list
read them directly, unauthenticated. Any signed-in user may write them.

**`lesson` is not.** A lesson is readable only when it is explicitly published
(`isPublic == true`), by its own author, or by an admin (#430). It used to be
`allow read: if true`, which let any anonymous client read - and list - every
lesson in the project straight from the SDK, contents included, whatever the
API did. A browse listing must now constrain its query (`where('isPublic', '==',
true)`, or `where('authorId', '==', uid)` for an author's own); rules are not
filters, so an unconstrained `getDocs(collection(db, 'lesson'))` is refused
outright rather than quietly returning everything.

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
  contents to an entitled one, and a lesson inside a paid module is refused to
  anyone without an entitlement (#430).

### Entitlements (#430)

Paid content is gated in two places, because neither alone is sufficient.

- **`utils/entitlements.check.js` is where the real decision is made.**
  `canAccessModule` gates a module's contents; `canAccessLesson` gates the
  lessons inside it. A lesson carries no back reference to its module, so the
  question is asked in reverse - which modules list this lesson id in
  `lessonPlans`, and is any of them paid? Access then requires an entitlement
  document (written only by the Stripe webhook), authorship of the lesson or of
  a gating module, or admin.
- **Rules are the blunt half.** Security rules cannot run that query - there
  are no queries in rules - so `lesson` is restricted to published documents
  plus your own, and the API carries the entitlement logic. This is why the
  lesson routes take `optionalAuth`: the check needs to know who is asking.

Both lesson read paths are gated, not just the JSON one - `GET /api/lesson/:id`
and `GET /api/lessons/:id/download` serve the same content, and the PDF route
checks before a single byte is piped, since a half-written response cannot be
turned back into a 403.

### Rate limiting (#383)

`functions/middleware/rateLimiter.js` has two tiers:

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

There were two copies of this file until #439, and they had diverged: the
Cloud Function's carried only the strict tier, so the general limiter covered
every route on one backend and none on the other. Collapsing to a single
backend leaves one limiter covering everything.

It keys by the authenticated user (`req.user.uid`) when there is one, falling
back to IP otherwise - a shared IP (a school network is the obvious case here)
does not mean a shared budget. `app.set('trust proxy', 1)` in `functions/app.js`
is load-bearing for this: Cloud Functions terminates the request through
exactly one proxy hop, and without trusting it every request looks like it
comes from the same address.

**Caveat:** the limiter's store is in-memory, so it only limits per
*instance*. Cloud Functions can and does run several concurrent instances
under load - exactly when a limit matters most - so this raises the bar
significantly without being a hard global ceiling. A shared store (Firestore-
or Memorystore-backed, for instance) would close that gap; out of scope here.

### Stored XSS (#381)

ReactQuill-authored content (`Description`/`Instructions`/`objectives`/section
`intro`s) is rendered via `dangerouslySetInnerHTML`, and can reach Firestore
by either of the two paths in the diagram above - so the fix has to hold on
both:

- **Render** (`portal-app/src/**`) - every `dangerouslySetInnerHTML` wraps its
  input in `DOMPurify.sanitize()`. This is the defense that actually has to
  hold: it runs regardless of which path got the content into Firestore, or
  whether it was ever sanitized on the way in. See
  `portal-app/src/pages/__tests__/xssSanitization.test.jsx`.
- **Write, via the API** (`functions/utils/sanitizeHtml.js`) - a second layer,
  applied to every rich-text field the content/lesson/module controllers
  write. Does **not** cover the client-SDK path: `upload-content/index.jsx`
  writes its `Instructions` field straight to Firestore
  (`addDoc`/`updateDoc`), never touching the server at all, and #419 lets any
  signed-in user write any `content`/`lesson`/`module` document directly.
  Reduces stored garbage and covers what does flow through the server; it
  is not, by itself, complete.
- **CSP** (`firebase.json`'s hosting headers) - shipped as
  `Content-Security-Policy-Report-Only`, deliberately not enforcing yet.
  A wrong `connect-src` would silently break Firebase Auth/Firestore calls
  or Stripe in production, and there's no way to verify hosting headers
  against a live deploy from this repo alone. Report-only logs what
  *would* have been blocked to the browser console with zero risk of
  breaking anything; the intended next step is watching the console on the
  real deployed site for a while, adjusting the policy for anything
  legitimate it would have blocked, and only then renaming the header to
  `Content-Security-Policy` to actually enforce it. `style-src` includes
  `'unsafe-inline'` and will keep needing to: this codebase sets inline
  `style={{...}}` on nearly every element, which CSP treats the same as an
  inline `style="..."` attribute regardless of how React applies it -
  removing that would need nonce-based styling, a real refactor, not part
  of this fix. `script-src` has no such exception and is the directive
  that actually matters most: CRA's production build has no inline
  `<script>` tags, so this blocks arbitrary inline script injection - the
  actual XSS payload class - without an escape hatch.

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

- **A published lesson inside a paid module is still readable directly.** The
  rule can only see `isPublic`; it cannot run the reverse lookup that decides
  whether a paid module contains the lesson, so a document marked
  `isPublic: true` that is *also* listed in a paid module's `lessonPlans` is
  readable from the SDK. Every path the app itself uses goes through the API,
  which checks properly, so this needs someone to craft a direct SDK read of an
  id they already know. Closing it for real means denormalising the gating
  module onto the lesson document - a schema change plus a backfill - or
  splitting public metadata from paid content into separate collections.

## Testing

| Suite | Location | Covers |
|---|---|---|
| Rules | `tests/rules/` | emulator-backed, every rule above |
| API | `functions/__tests__/` | auth middleware, ownership, entitlements, claims, payments |

Both run in CI. Rules tests are checked against the *previous* rules as well:
if a test does not fail against the version it was written to fix, it is not
testing anything.
