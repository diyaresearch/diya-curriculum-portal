# DIYA Ed Portal — Full Product & Codebase Assessment

_Prepared 2026-08-24 against `main` @ `ff2d07d`. Supersedes `ISSUE_TRIAGE_PLAN.md` — a local working
note that was never committed, drafted from the open-issue list alone and predating these findings._

> **Status.** The portal is pre-GA and not yet in real use. The security findings in §5 are recorded
> here in full, deliberately, so they can be fixed as a batch before general availability — tracked
> in [#426](https://github.com/diyaresearch/diya-curriculum-portal/issues/426). They are **not**
> being treated as a live incident, but each one is a hard gate on GA.
>
> **The ordered plan of work lives in
> [#446](https://github.com/diyaresearch/diya-curriculum-portal/issues/446)** (pinned), mirrored by
> the `Wave 0` → `GA Gate` milestones. This document is the *evidence*; #446 is the *sequence*.

## Context

DIYA Ed Portal (`diyaresearch/diya-curriculum-portal`) is a K-12 AI/Data-Science curriculum platform:
a React SPA on Firebase Hosting, an Express API on App Engine, Cloud Functions for Stripe, and one
Firestore database. You asked for an honest assessment of what works versus what is only promised —
covering product features by role, the Firebase/Firestore organisation across dev and prod, and
whether any CI/CD exists — plus a prioritised problem list with the issues that need to be created
or updated.

Findings come from three sources: **live probing of production**, **reading the code at `main`**
(917 commits on `main`, last commit 2026-02-01 — ~7 months stale), and the **full GitHub issue
history** (229 issues: 41 open, 188 closed). Every claim below marked *verified* was reproduced
directly; a few are marked *inferred* where I reasoned from code without executing it.

**Decisions taken:** student/classroom features are treated as a real roadmap gap rather than
marketing to be walked back; separate Firebase projects are the recommended target for environment
isolation; security and functionality block feature work. Credential rotation is deliberately
deferred to the GA gate ([#426](https://github.com/diyaresearch/diya-curriculum-portal/issues/426))
because the portal is not yet in real use.

Findings from this assessment were filed as issues #418–#445 and sequenced in
[#446](https://github.com/diyaresearch/diya-curriculum-portal/issues/446).

---

## 1. Headline verdict

The portal **looks healthy and is not**. The landing page renders, modules list, and signup works —
because the frontend talks to Firestore directly via the client SDK. Behind that, the entire Express
API has been returning `500` for an unknown period, the paywall is bypassable, and any signed-in
user can make themselves an admin from the browser console.

One root cause explains three separate symptoms that looked unrelated:

> **The Firebase Admin service-account key is dead — and it is the same key that leaked into git history.**
>
> `server/serviceAccountKey.json` is **byte-identical** to blob `9215ebe4…` in git history
> (verified: same `client_email`, same `private_key_id`, same `private_key`, project
> `curriculum-portal-1ce8f`). That credential now fails with `16 UNAUTHENTICATED`. That single fact
> causes: local dev Firestore failure, production `/api/*` 500s, and the still-open key-exposure risk.

**Silver lining:** because the key is revoked, the historical leak appears already neutralised.
**Do not treat it as closed** until confirmed in the GCP console — and the blob should still be purged.

### Live production status (verified today)

| Surface | URL | Status |
|---|---|---|
| Landing page | `…web.app/diya-ed` | ✅ Works (client SDK reads Firestore directly) |
| **Any deep link / refresh** | `…/diya-ed/upgrade` | ❌ **Blank white page** — `SyntaxError: Unexpected token '<'` |
| Express API — content | `/api/units`, `/api/lessons`, `/api/modules` | ❌ **500** — `16 UNAUTHENTICATED` |
| Express API — auth | `/api/user/me` | ⚠️ 401 (correct — needs a token) |
| Payments function | `…web.app/api/payment/test` | ✅ 200 |
| `users` / `prod.users` | Firestore REST, **no auth** | ❌ **Readable by anyone on the internet** |

---

## 2. What is working

- **Landing page, module browsing, search/filter** — via direct client-SDK reads.
- **Google auth and signup** for both teacher and student roles.
- **Teacher content authoring** end-to-end: nugget builder → lesson-plan builder (with Firestore
  drafts) → module builder. This is the most complete part of the product.
- **Module purchase via Stripe Embedded Checkout** (`functions/`) — the webhook verifies signatures
  correctly against `req.rawBody`, and is idempotent (doc id = checkout session id).
- **Yearly payment page** — properly implemented with Stripe Elements + PaymentIntent.
- **Admin role management API** — `PUT /api/user/updateRole` is correctly gated by `requireAdmin`.
- **PDF export** of lesson plans (jsPDF).

## 3. What is not working

- **Every production deep link and browser refresh.** `portal-app/package.json` sets
  `"homepage": "."` while `App.js:33` sets `basename="/diya-ed"`. At `/diya-ed/upgrade` the relative
  `./static/js/main.*.js` resolves to `/diya-ed/static/…`, which the SPA rewrite answers with
  `index.html`. The browser parses HTML as JavaScript and dies. Only the exact URL `/diya-ed`
  (no trailing slash) works. Bookmarks, shared links, and refresh are all broken.

  **Root cause (found 2026-08-27):** the committed value at `HEAD` is already correct
  (`"homepage": "/diya-ed"`). The broken `"."` exists **only as an uncommitted working-tree edit**,
  and the live build was deployed from that dirty tree — which is why the defect is invisible in git
  history. The fix is `git checkout portal-app/package.json`, rebuild, redeploy. The deeper problem
  is that releases are built from whatever is on someone's disk rather than from a committed ref
  ([#435](https://github.com/diyaresearch/diya-curriculum-portal/issues/435)).
- **The whole Express API** (dead credential, above).
- **The paywall.** Three independent bypasses (§5).
- **Dev environment.** Frontend qualifier `""` vs backend `dev_` — they read and write different
  collections and never meet.
- **Nugget detail pages in production** *(inferred)*. `ContentDetails.jsx:55` and
  `nugget-details.jsx:21` read the unqualified `"content"` collection while every writer uses
  `COLLECTIONS.content` → `prod.content`. Production should show "Content not found".
- **12 navigation targets are dead links** rendering blank pages — including
  `/classroom-management`, the **primary hero CTA of the TeacherPlus dashboard**. There is no
  `path="*"` catch-all, so every one renders Navbar + empty `<main>` + Footer.
- **Test data is live on the production home page** — "Testing prod module1", "Test Production
  Feature Module" appear in Featured Modules to real visitors.
- **Testimonials are fabricated.** `testimonials` has no Firestore rule → read denied → the UI
  silently falls back to hardcoded samples ("Sarah Johnson, Lincoln Elementary School"). The
  "Trusted by 1,000+ students and teachers worldwide" claim is unsourced.

---

## 4. Product features — expected vs built

### Teachers

| Promised | Built? |
|---|---|
| Planning tools | ✅ Nugget → lesson-plan → module authoring, with drafts |
| Ready-made modules | ✅ Browse, filter, purchase |
| **Classroom management** | ❌ **Does not exist.** `/classroom-management` is linked from the TeacherPlus hero CTA and the marketing section — **the route was never created** |

Tiering is incoherent. `teacherDefault` / `teacherPlus` work; **`teacherEnterprise` does not exist
anywhere in `portal-app/src`** — it is a marketing card with a "Contact Sales" button writing to
`enterprise_contacts`, a collection **nothing ever reads**.

### Students — signup-only

The landing page promises students *"Interactive modules, Projects, Science fair ideas"* and
*"Connect with your teacher's class."* **None of it exists.**

| Promised | Built? |
|---|---|
| Interactive modules | ❌ `/learning-modules` — route does not exist |
| Projects / science-fair ideas | ❌ `/project-ideas` — route does not exist |
| Connect with teacher's class | ❌ No classroom, roster, enrollment, assignment, or gradebook code anywhere |

A registered student gets a "Welcome to your Dashboard" banner **with no links**, and can read
teacher-oriented module pages. Worse, `ForStudentsSection` only renders when **logged out**, so its
student role-check can never pass, and its signup button points at `/signup` — also not a route.

Every closed student issue (#278, #279, #292, #295, #297, #403) is landing-page or signup work. **No
student functionality was ever scoped or built.** This is the single largest promise-vs-product gap.

---

## 5. Security findings

Ordered by severity. Items 1–4 are exploitable today by any registered user.

1. **Privilege escalation via Firestore rules.** `portal-app/firestore.rules:14-23`:
   ```
   match /users/{userId}      { allow read: if true; allow write: if isSignedIn(); }
   match /prod.users/{userId} { allow read: if true; allow write: if isSignedIn(); }
   ```
   `isSignedIn()` — not `isOwner()`, and the doc id is unconstrained. **Any authenticated user can
   write `role:"admin"` to their own or anyone else's document, straight from the browser.**
   `teachers`/`students` correctly use `isOwner`; `users` does not. Looks like an oversight.

2. **PII exposure — live.** `allow read: if true` makes every user profile world-readable. Verified
   by unauthenticated HTTPS GET: `users` and `prod.users` return `200` with documents. Exposed
   fields include email, full name, institution, job title, subscription tier, and Stripe
   customer/payment-intent ids. *(I confirmed the vulnerability and deliberately did not enumerate
   the data.)*

3. **Paywall bypass — free premium.** `server/routes/subscription.js:553`:
   ```js
   // For demo purposes, we'll simulate a successful payment
   await new Promise(resolve => setTimeout(resolve, 1000));
   … role: 'teacherPlus'
   ```
   No Stripe call, no charge. This is the **live path the Upgrade button uses**
   (`PaymentPage.jsx:46`). `complete-upgrade` (`:140`) is the same class of hole — it accepts an
   unverified `paymentIntentId`. *(Currently masked by the API being down; it goes live the moment
   the credential is fixed.)*

4. **PCI exposure.** `/payment` and `/payment/premium` collect **raw card number, CVC and expiry** in
   plain `<input>`s and POST them to your own API (`PaymentPage.jsx:226-340`). This is the default
   monthly-upgrade path. The yearly page does it correctly with Stripe Elements — the monthly one
   never got migrated.

5. **Unauthenticated write endpoints.** No auth middleware at all on `POST /api/module`,
   `POST /api/module/:id` (**including `price`**), `DELETE /api/module/:id`
   (`server/routes/modules.js:10-12`), and `POST /api/update/:id` (`units.js:16`).

6. **Charge-integrity break.** The Stripe amount is computed from `module.price` read from Firestore
   (`functions/routes/payment.js:279`), and rules let any signed-in user write that field. Set
   `price: 0.01`, buy, reset.

7. **No entitlement check.** Nothing grants access after a successful purchase — the webhook writes
   a `payment_logs` row and nothing else. Module content renders regardless of payment.

8. **Role from request body.** `POST /api/user/register` takes `role` from the client
   (`user.js:155,213`), validated only against the enum. First registration can self-assign `admin`.

9. **Unauthenticated PII endpoint.** `GET /api/user/:userId` returns the full user document —
   no auth, no redaction (`user.js:95-141`).

10. **`GET /api/lessons/admin`** returns non-public lessons with no auth check (`lessons.js:17`).

11. **Leaked service-account key** in git history (§1) — appears revoked; confirm and purge.

12. **Deploy bundle leaks secrets.** `server/.gcloudignore` excludes `.git` and `node_modules/` but
    **not** `.env*` or `serviceAccountKey.json`, so `gcloud app deploy` uploads production
    credentials into the App Engine artifact.

> Correction to an earlier assumption of mine: no *live* Stripe secret was ever committed. The
> `sk_live_`/`whsec_` hits in history are placeholder text in `.env.example`. Committed `.env` files
> contained only Firebase web API keys, which are public by design.

---

## 6. Firebase & Firestore organisation

### Current state

**One Firebase project, one Firestore database, for everything.** `.firebaserc` declares only
`curriculum-portal-1ce8f`. There is no second project, no named database, and no emulator config.
Dev and prod are separated **only by a collection-name prefix** — and that prefix is broken in
four distinct ways:

**(a) No tier agrees on the prefix.** Four values across four files, and *neither* pair matches:

| | Frontend | Backend | Match? |
|---|---|---|---|
| dev | `""` | `dev_` | ❌ |
| prod | `prod.` | **`prod_`** | ❌ |

Cloud Functions use a *third* mechanism — sniffing `req.headers.origin` for `localhost`
(`functions/routes/payment.js:25-47`) — which happens to yield `prod.`, matching the frontend but
not the Express server.

**(b) The prefix doesn't apply to the collections that matter most.** `teachers`, `students`, and
`testimonials` are hardcoded string literals, never prefixed. Since
`databaseService.getUserDocument()` resolves users **`teachers` → `students` → `{qualifier}users`**,
the legacy path wins and the qualifier is bypassed for the entire user population. Frontend signup
writes directly to `teachers`/`students`. **A dev-machine bug writing `teachers/{uid}` corrupts
production.**

**(c) Unset env var yields a literal collection named `undefinedusers`.** Five files interpolate
`` `${process.env.DATABASE_SCHEMA_QUALIFIER}` `` raw. `envValidator` warns but
`validateAndExit(false)` (`server/index.js:12`) **never exits** — and `server.log` shows this
happening in a real run.

**(d) Rules don't cover prefixed names.** `match /users/{userId}` does not match `dev_users` or
`prod_users`. Collections with **no rule at all**: every `dev_*`/`prod_*`, `payment_logs`,
`subscriptions`, `enterprise_contacts`, `counters`, `testimonials`. `firestore.indexes.json` is
empty despite at least two required composite indexes — so live index state exists only in the
console and would not survive a project rebuild.

Also dead: `subscriptions` and `sections` constants (declared, never used); `enterprise_contacts`
(written, never read); `teacher-signup-backend/` (only a `package.json` — no source at all).

### Recommendation — separate Firebase projects

Prefixes are the wrong tool: they give a shared blast radius, untestable rules, and — as above —
silently diverge. Target:

| Environment | Project | Collections |
|---|---|---|
| Local dev | Firebase **emulator suite** | Unprefixed |
| Staging | `diya-portal-staging` (new) | Unprefixed |
| Production | `curriculum-portal-1ce8f` (existing) | **Unprefixed** — drop `prod.` |

Migration sketch:
1. Stand up the staging project; move `firestore.rules` + `firestore.indexes.json` into deployable
   config with rules **unit tests** (`@firebase/rules-unit-testing`).
2. Delete the qualifier machinery — `schemaQualifier.js`, the raw interpolations, and the
   header-sniffing in `functions/`. Environment becomes *which project you point at*, not a prefix.
3. Collapse `teachers` + `students` into the unified `users` collection (the hybrid lookup already
   anticipates this), then delete the legacy path.
4. One-time copy of `prod.*` → unprefixed in production, then retire the prefixed copies.
5. Add the emulator to `start.sh` so local dev never touches a real project.

This also removes the single most dangerous property of today's setup: **a developer's laptop has
write access to production data by default.**

---

## 7. CI/CD

**CI exists but validates nothing that matters.** Three workflows in `.github/workflows/`:

| Workflow | What it does |
|---|---|
| `validate-pr.yml` | Regex-checks the PR title matches `^\[Issue #\d+\] .+`. That is the entire job. |
| `claude-code-review.yml` | Posts an LLM review comment. Advisory; `contents: read`, cannot block. |
| `claude.yml` | Responds to `@claude` mentions. |

**No workflow runs `npm ci`, `npm run build`, `npm test`, `pytest`, or any linter.** A PR that does
not compile merges green provided the title is formatted. Absent: Dependabot/Renovate, pre-commit
hooks, secret scanning, any deploy automation.

Deployment is entirely manual and self-contradictory: `deploy.cmd`/`deploy.ps1` are **Windows-only**
and end in `pause` (structurally unrunnable in CI) on a repo developed on macOS; `server/Dockerfile`
is orphaned; `server/vercel.json` is not a Vercel config (it is a copy of `package.json`). Releases
were hand-merged release branches (#285, #316, #333, #352, #386) — and that stopped: last merge to
`main` was Sept 2025, but commits continued to Feb 2026, pushed **directly to `main`**. Last CI run
was Dec 2025.

**Testing is largely theatre.** 35 of 51 Python tests patch `requests` and then assert on their own
mocks — they pass in 0.03 s without a server. `pytest.ini` uses `[tool:pytest]`, invalid for that
filename, so its config is silently inert. `run_tests.sh` hardcodes the **fake** suite and never runs
the 16 real integration tests — which are currently **2/16 red**, on genuine bugs (`GET
/api/user/non-existent-id` returns 500, expected 404). One React test covers 73 components. Zero
Express unit tests. `tests/README.md` claims "comprehensive" coverage; it is false.

> Correction to my earlier read: lint debt is **2 warnings, not hundreds**. The alarming build output
> was `server.log` — a stale 172 KB webpack log **committed to git** whose warnings no longer match
> the code. Real blocker: GitHub Actions sets `CI=true`, and CRA treats warnings as errors — so the
> first CI job added will fail on those 2 warnings until they're fixed.

**103 open vulnerabilities** (82 frontend / 21 backend), nothing watching them. `react-scripts@5` is
deprecated and unmaintained — the root cause of most frontend advisories. `stripe` is six majors
apart between `server` (`^14`) and `functions` (`^20`), both hitting the same Stripe account.

---

## 8. Problems by category

**A. Production down / broken** — dead credential; deep-link blank page; dev env split-brain;
prod nugget pages read wrong collection; test data on the live home page.

**B. Security** — items 1–12 in §5.

**C. Data architecture** — four mismatched qualifiers; unprefixed legacy collections;
`undefinedusers`; rules don't cover prefixed names; empty index config; dead collections.

**D. Engineering process** — no build/test/lint CI; fake tests; inert `pytest.ini`; 2 failing real
tests; manual Windows-only deploys; 13 unmerged branches incl. 3 stranded security fixes; 103 vulns;
committed `node_modules`/`server.log`/Firebase caches; dual lockfiles.

**E. Product gaps** — no student product; no classroom management; `teacherEnterprise` unimplemented;
no purchase entitlement; module drafts write-only.

**F. UX / navigation** — 12 dead links; no `path="*"`; `/user-profile` (the **only** admin UI) has
zero inbound links; ~2,100 lines of dead code (~10% of frontend); 51 `console.log`s; 35 `alert()`s
as primary UX; fake testimonials and unsourced trust claims.

---

## 9. Prioritised sequence

**The authoritative, ordered plan is [#446](https://github.com/diyaresearch/diya-curriculum-portal/issues/446)** (pinned), mirrored by milestones. It carries per-issue ordering, dependencies, parallelism, and the recommended model. Summary:

| Wave | Focus | Issues |
|---|---|---|
| **0 — Unblock** | Restore the dead Firebase credential; nothing is verifiable until this lands | 1 |
| **1 — Security lockdown** | Rules, endpoint auth, paywall, payment integrity, entitlement | 9 |
| **2 — Make it usable** | Deep links, dead links, prod collection reads, dead Stripe endpoints | 6 |
| **3 — Data foundation** | Unify the qualifier, then separate Firebase projects | 4 |
| **4 — Process** | CI, tests, dependencies, hygiene, consistency backlog | 31 |
| **5 — Product and UX** | Student and classroom epics, feature gaps, polish | 16 |
| **GA Gate** | Credential rotation, history purge, key policy — deferred to pre-launch | 1 |

Key sequencing notes:
- **#418 blocks everything.** The Firebase Admin credential is dead, which is why the production API 500s.
- **#419 + #420 + #382 are one change** — three defects in a single rules file.
- **Wave 2 can run in parallel with Wave 1** — no overlapping files.
- **#421 is the highest impact-per-effort item in the backlog.** Root cause: `homepage` was changed to `"."` in an uncommitted working tree and deployed from there. The committed value is already correct, so the fix is `git checkout portal-app/package.json` + rebuild + redeploy.
- **#435 (CI) makes everything after it durable** — today a PR that does not compile merges green.
- **#440 and #441 share one class data model** — build it once.

## 10. GitHub issues

### Update these (they exist but are wrong or under-scoped)

| # | Change needed |
|---|---|
| **#382** | Retitle. Rules **do** exist — the problem is they're permissive. Rescope to the privilege-escalation + PII exposure, with the exact rule lines. Raise to P0. |
| **#376** (closed) | **Reopen or supersede.** Its own steps 1 & 4 (purge history, rotate keys) were never done — the service-account blob is still extractable. |
| **#361** | Attach concrete evidence: four mismatched qualifier values; `undefinedusers`; validator that never exits. |
| **#362** | Broaden to cover three competing qualifier mechanisms and the `server/`↔`functions/` duplication. |
| **#354** | Note module drafts are write-only (`/module_builder/drafts` doesn't exist). |
| **#347** | Note the hero CTA "Manage My Classroom" is a dead link to a nonexistent feature. |
| **#109** | Rescope: the admin UI **exists** at `/user-profile` but is unreachable — linking it is a fraction of the original estimate. |
| **#379** | Quantify: 51 `console.log`s, 15 in `UpgradePage.jsx` alone. |
| **#399/#404/#405/#406/#407** | Fold in the 12 dead links and missing `path="*"`; these UX issues share that root cause. |

Also: 184 of 229 issues are unlabelled, and labels only encode size (`small`/`medium`/`large`) —
there is no type or priority dimension. Worth adding `bug`/`security`/`feature` + `P0`–`P3`.
`ISSUE_TRIAGE_PLAN.md` (2026-08-18) is sound in its ordering logic but predates these findings —
it should be regenerated from §9.

### Create these (25 new)

**P0** — Production API 500s (dead credential) · Firestore rules privilege escalation · User PII
world-readable · Production deep links blank · Demo-payment paywall bypass · Raw card data / PCI ·
Unauthenticated module & content write endpoints · `register` accepts `role` from body · Purge key
from history + fix `.gcloudignore`

**P1** — Schema qualifier mismatch · Separate Firebase projects (epic) · Client-writable module
price · No post-purchase entitlement · Prod nugget pages read unqualified collection · Undefined
`stripe` refs · Test data in production · Missing composite indexes

**P2** — Add build/test/lint CI · Fix `pytest.ini` + delete mock-only tests + fix 2 failures ·
103 dependency vulnerabilities · `react-scripts` → Vite migration · Repo hygiene

**P3** — Student product (epic) · Classroom management (epic) · Dead links + `path="*"` ·
`/user-profile` unreachable · Fake testimonials & trust claims · Dead-code removal

---

## 11. How to verify

- **Credential fix:** `curl -s -o /dev/null -w "%{http_code}" https://curriculum-portal-1ce8f.uc.r.appspot.com/api/units` → expect `200`, not `500`.
- **Rules fix:** unauthenticated `GET https://firestore.googleapis.com/v1/projects/curriculum-portal-1ce8f/databases/(default)/documents/prod.users` → expect `403`, not `200`. Add `@firebase/rules-unit-testing` cases asserting a non-owner write to `users/{other}` is denied.
- **Deep links:** load `…/diya-ed/upgrade` in a browser → page renders, console clean. Currently: blank, `SyntaxError: Unexpected token '<'`.
- **Paywall:** authenticated POST to `/api/subscription/process-payment` → expect rejection, and the user's `role` unchanged.
- **Dev environment:** with the emulator running, create a nugget in the UI and confirm it reads back — today the frontend (`""`) and backend (`dev_`) never meet.
- **CI:** open a PR with a deliberate compile error → the build job must fail.
- **Regression suite:** `pytest tests/test_refactored_api.py` → 16/16 green (currently 14/16).
