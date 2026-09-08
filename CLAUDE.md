# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIYA Curriculum Portal is a full-stack educational platform built with React frontend, Express.js backend, and Firebase for authentication and data storage. The platform serves educators and content creators, allowing content creators to upload educational materials and educators to generate lesson plans.

## Architecture

### Repository Structure
- `portal-app/` - React frontend application (port 3000)
- `functions/` - the entire Express backend API. Deployed as a single Cloud Function
  (`payments`); runs locally on port 3001 via `npm start`
- `start.sh` - Script to start `portal-app/` and `functions/` concurrently

### Frontend (portal-app/)
- **Framework**: React 18, built with Vite (`vite.config.js`) — react-scripts/CRA and the
  `@craco/craco` patch it needed were removed in #503
- **Language**: JavaScript and TypeScript side by side — see "TypeScript" below
- **Styling**: Tailwind CSS, from the `@theme` tokens in `src/index.css`
- **Routing**: React Router DOM
- **State Management**: React hooks, Firebase context
- **Key Dependencies**: Firebase SDK, React Quill, jsPDF, React Modal
- **Testing**: Vitest + React Testing Library (`npm test` runs `vitest run`)
- **Lint**: flat-config ESLint (`eslint.config.js`), which replaces CRA's bundled
  `react-app` shareable config

### Backend (functions/)

**There is one backend.** It owns everything: users, roles, content, lessons, modules,
subscription management, *and* all payment processing including the Stripe webhook.

- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK
- **File Storage**: Firebase Storage
- **Key Dependencies**: Firebase Admin, Multer, PDFKit, CORS, Stripe, sanitize-html
- **Deployed as**: a single `onRequest` Cloud Function named `payments`

Three files decide how it runs, and the split matters:

- `app.js` - builds the Express app. The only place routes and middleware are assembled.
- `index.js` - Cloud Functions entry. Wraps `app.js`; this is what deploys.
- `local.js` - plain-Node entry. `app.listen()` plus dotenv, env validation and the boot
  credential check. Used by `npm start`, `start.sh` and CI. Nothing in `app.js` depends on
  it having run.

The function is still *named* `payments` even though it now serves the whole API. That name
is load-bearing in three places outside this repo's code - the Hosting rewrite in
`firebase.json`, the Stripe webhook endpoint registered in the Stripe dashboard, and
`portal-app/.env.production` - so renaming it is a coordinated change, not a refactor.

There were **two** backends until #439: this one for payments, and an App Engine service in
`server/` for everything else. They shared ~1,330 lines across nine modules by copy-paste,
and four had silently drifted - `functions/` never received #428's emulator support or
#434's pagination fix, and each backend had its own Stripe initializer that disagreed with
the other about TEST vs LIVE keys. Neither deploy target could require code from a sibling
directory, so there was no shared package to extract; collapsing to one backend removed the
problem instead of managing it. `server/` and its `app.yaml` are gone. If you find a
reference to App Engine, `.uc.r.appspot.com`, or `server/` anywhere, it is stale.

**Stripe lives in exactly one place**: `utils/stripeClient.js`. `routes/payment.js`,
`routes/subscription.js` and the webhook all use it, and it resolves the key per call
(defaulting to TEST unless `STRIPE_LIVEMODE` is explicitly truthy) rather than at require
time, because Cloud Functions populates bound secrets after module load.

**Firestore is initialized once, at startup.** `app.js` calls
`databaseService.initialize()` when it builds the app and mounts
`middleware/ensureDatabase.js` ahead of every router, so a handler can call
`databaseService.getDb()` / `.getAdmin()` directly — it cannot be reached
before the service is ready. Do not reintroduce `await
databaseService.initialize()` at the top of a controller or route; there were
~35 of those before #396, none of them awaited anywhere the failure could be
handled, so a dead credential surfaced as an unhandled rejection plus
"DatabaseService not initialized" from every route after it. `/api/health` is
registered *before* that gate on purpose: its job is to report a broken
database, so it must not be short-circuited by one. Timestamps go through
`utils/timestamps.js` (`serverTimestamp(admin)`), not a hand-written
`admin.firestore?.FieldValue?.serverTimestamp?.() || new Date()`, and user
lookups go through `databaseService.getUserDocument()`, not `findUserDocument`
directly.

**One controller per resource**, named `<resource>Controller.js` in the plural form its
routes use: `unitsController.js`, `lessonsController.js`, `modulesController.js`. Handlers
are exported `async (req, res) => {}` functions, never classes; Firestore comes from
`databaseService.getDb()` inside the handler; errors go through `utils/responseHelpers`
with a resource-scoped code, never `res.send(error.message)`; owner-or-admin checks are
`canMutate()` from `utils/ownership.js`. `functions/controllers/README.md` has the full
convention and a template, and `functions/__tests__/controller-conventions.test.js` fails
if a new controller drifts from it. Before #366 the directory held `content_submission.js`,
`update_submission.js`, `moduleController.js`, `lessonsController.js` and
`unitsController.js` — the units resource spread across three files in two naming styles,
each with its own idea of how to report an error.

**The webhook is `routes/stripeWebhook.js`**, registered in `app.js` *before*
`express.json()` with a raw body parser - Stripe signature verification needs the exact
bytes. There used to be a second webhook in `server/routes/payment.js` that wrote
`payment_logs` with `.add()`, so a Stripe retry appended a duplicate row instead of
updating the existing one. It was deleted in #439; this idempotent handler
(`set(..., {merge:true})`, doc id == `checkoutSessionId`) is the only one.

### Firebase Integration

- **Authentication**: Firebase Auth for user management
- **Database**: Firestore for content, lessons, modules, and user data
- **Storage**: Firebase Storage for file uploads

**Two SDKs, two configs, one initialization each** (#362). They share no
values and are set up in exactly one file apiece:

| | Client SDK (`firebase`) | Admin SDK (`firebase-admin`) |
| --- | --- | --- |
| Configured in | `portal-app/src/firebase/firebaseConfig.ts` | `functions/config/firebaseConfig.js` |
| From | `VITE_FIREBASE_*`, inlined into the bundle | a Google Cloud credential resolved by `functions/config/credentials.js` |
| Secret? | No — public project identifiers. Firestore rules and the backend's token checks are what protect data. | Yes. Never in the bundle, never in git; see `functions/CREDENTIALS.md`. |

In the frontend, import the instances rather than re-deriving them:

```js
import { db, storage } from "@/firebase/firebaseConfig";   // not getFirestore()/getStorage()
```

`getFirestore()` and `getFirestore(firebaseApp)` return that same default app,
so the scattered calls they replaced were fragile rather than wrong: a module
calling `getFirestore()` without importing the config worked only because
something else had imported it first, and the emulator wiring (#428) lives on
the exported instances. The client config also fails at load with the missing
variable names if a `VITE_FIREBASE_*` key is absent, instead of surfacing later
as `auth/invalid-api-key` on the sign-in button.

`getAuth()` is deliberately left alone by all of this: it initializes nothing,
so which spelling a file uses is not an initialization question. Where it is
legitimate — `utils/apiClient.ts` for a fresh ID token per request, and
`auth/googleAuth.js` for the sign-in flow itself — it stays. The component
call sites that still exist are "Auth and user state" below (#368) left to
finish, not a second config.

In the backend, `config/firebaseConfig.js` holds the only
`admin.initializeApp()`; `services/databaseService.js` delegates its real mode
to it, and everything else — controllers, routes, middleware — goes through
`databaseService.getDb()`. Nothing loads `config/firebaseConfig` at require
time any more (#366): doing so resolved a real credential the moment the file
was imported, which defeated `ENABLE_MOCK_FIREBASE`. `routes/payment.js`
and `routes/stripeWebhook.js` used to call a bare `admin.initializeApp()`
each, which skipped the credential precedence in `config/credentials.js`
entirely. Two tests fail if either consolidation regresses:
`functions/__tests__/single-firebase-init.test.js` and
`portal-app/src/firebase/__tests__/firebaseConfig.test.js`.

## Development Commands

### Quick Start
```bash
# Start both frontend and backend
chmod +x start.sh
./start.sh
```

### Frontend (portal-app/)
```bash
cd portal-app
npm install
npm start           # Vite dev server (http://localhost:3000)
npm run build       # Production build -> portal-app/build/ (assets under build/static/)
npm run preview     # Serve that build locally, as Firebase Hosting would
npm test            # Run tests once (vitest run)
npm run test:watch  # Watch mode
npm run lint        # ESLint, zero-warnings
npm run typecheck   # tsc --noEmit (the build does NOT type-check; see below)
```

Requires Node 22.12+ (Vite 7 / Vitest 5). The build output directory (`build/`, assets
under `static/`) is deliberately CRA's, not Vite's default `dist/`+`assets/` — the root
`firebase.json` serves `portal-app/build` and caches `/static/**` immutably. See the
comments in `portal-app/vite.config.js` before changing either.

### Backend (functions/)
```bash
cd functions
npm install
npm start           # Express app on http://localhost:3001 (via local.js)
npm test            # jest
npm run serve       # run it through the Firebase Functions emulator instead
```

## Key Components and Routes

### Frontend Routes

`App.jsx` holds the whole table. Every path a link in the UI points at is in it -
before #442/#444 twelve were not, and each rendered a blank page.

- `/` - Home page with module exploration
- `/upload-content` - Content upload for producers
- `/lesson-plans/builder` - Lesson plan builder (`/lesson-generator`, a second
  older builder, was removed in #444)
- `/module-builder` - Module builder. `/module/create` used to reach a stub form
  in `module_detail` containing the comment "For brevity, I'm not copying the
  entire form"; it is gone, and "Create Module" on `/my-plans` comes here with
  the selected lesson plans in navigation state.
- `/module/:moduleId` - Module detail view
- `/lesson/:lessonId` - Lesson detail view, from Firestore
- `/lesson/:moduleId/:lessonIndex` - a lesson of a *featured* module. Those
  modules live in `constants/featuredModules.js` rather than Firestore, so their
  resources have no lesson id to route by.
- `/lesson-plans/drafts`, `/module_builder/drafts` - both render `pages/drafts/DraftsPage`
- `/user-profile` - User profile management
- `/nugget-builder` - Content nugget creation tool
- `/upgrade` - Subscription upgrade page
- `/coming-soon?feature=<Name>` - honest destination for a link the home page
  advertises but the product has not built (Classroom Management, Community)
- `*` - `NotFound` (#421)

**Route guards live on the route, not in the page.** `ProtectedRoute`
(`@/components/ui/ProtectedRoute`) reads the shared auth context and renders
`Loading` until it settles:

```jsx
<Route path="/my-plans" element={<ProtectedRoute requireAuth><MyPlans /></ProtectedRoute>} />
<Route path="/cancel-subscription" element={
  <ProtectedRoute allowedRoles={[ROLES.TEACHER_PLUS]}><CancelSubscriptionPage /></ProtectedRoute>
} />
```

`redirectTo` (default `/`) sets where a rejected visitor lands. Before #444 the
component existed but was never rendered, and eight pages each carried their own
`useEffect(() => { if (!loading && !user) navigate("/") })` - so each painted a
frame of signed-in-only UI first, two of them redirected a signed-out visitor to
a *builder* page, and the role checks disagreed about which roles counted.

### Backend API Routes
All served by `functions/`, reached at `VITE_SERVER_ORIGIN_URL` (or same-origin via the
Firebase Hosting rewrite of `/api/**`):
- `/api/units` - Content management endpoints
- `/api/lessons` - Lesson CRUD operations
- `/api/modules` - Module management
- `/api/user` - User profile and authentication
- `/api/subscription` - Subscription management (status/cancel/reactivate/enterprise-contact)
- `/api/payment` - All payment processing: create-payment-intent, create-module-checkout-session,
  create-embedded-checkout-session, confirm-payment, history, and the Stripe webhook
- `/api/health` - Liveness plus a real Firestore reachability check (503 when the Admin
  credential is dead, so an outage like #418 shows up here instead of as 500s everywhere)

### Key Components
- `Layout.jsx` - Main layout wrapper with navigation
- `Navbar.jsx` - Navigation component
- `LessonDetail.jsx` - Lesson viewing component
- `ExploreModulesSection.jsx` - Module exploration interface
- `ProtectedRoute.jsx` - the one route guard; see "Frontend Routes" above

**One implementation per feature.** #444 removed ~2,100 lines that nothing
imported, plus a set of near-duplicates where it was not obvious which copy was
live: a second nugget form (`module_builder/index.jsx`), a second nugget detail
(`view-content/`, `module_builder/lesson-details.jsx`), a second lesson builder
(`lesson_generator/`), a third and fourth lesson detail (`components/content/LessonDetails.jsx`,
which sat behind an unreachable `/lesson/:id` route shadowed by `/lesson/:lessonId`),
and two 240-line drafts pages differing in six values, now `pages/drafts/DraftsPage`
plus two configs. Before adding a screen, check whether one of these already exists.

One duplicate pair deliberately survives: `components/content/OverlayTileView.jsx`
and `pages/module_builder/OverlayTileView.jsx`. They are not a copy - one renders
the capitalized nugget fields and links to `/content/:id`, the other the lowercase
lesson-plan fields and links to `/lesson-details/:id` - so merging them is a
behaviour change to content selection, not a deletion.

### Navigation Patterns (portal-app/)

Use React Router for anything that goes to another in-app route:
- `<Link to="/...">` for a link a user clicks (renders an `<a>`, no full page reload)
- `useNavigate()` (`navigate("/...")`) for programmatic navigation (after a form submit, a
  role check, a conditional redirect)

Plain `<a href="...">` is reserved for external links (`target="_blank"`, e.g. social links in
`Footer.jsx`, the DIYA base URL in `Navbar.jsx`) - React Router's `Link` is only meaningful for
routes this app itself serves.

The two remaining `<a href="/">` links to an in-app route are deliberate:
`ErrorBoundary.jsx` and `Layout.jsx`'s navbar fallback. Both render *because*
something above them threw, so a full reload is the recovery, not a regression.

`window.location.reload()` / `window.location.href = ...` are not a substitute for `navigate()` -
they force a full page reload, discarding in-memory state (React context, Firebase auth
listeners, etc.). They're used deliberately in a few places to force a hard refresh of
cached user/subscription data right after a mutation (see the comments around the
`window.location.reload()` calls in `pages/payment/PaymentPage.jsx`,
`pages/payment/YearlyPaymentPage.jsx`, `pages/module_builder/builder.jsx`, and
`pages/lesson-plans/builder.jsx`) - don't replace those with `navigate()`, which wouldn't
force the same reset. Reading `window.location.origin/hostname/pathname` (no navigation
involved) is unaffected by any of this.

### Styling (portal-app/)

**Tailwind utilities are the default.** The design tokens are the `@theme`
block in `src/index.css` — Tailwind 4 has no `tailwind.config.js`, that block
*is* the theme. Every token there is emitted as a CSS custom property on
`:root` *and* generates utilities by namespace:

```
--color-navy: #162040    ->  bg-navy   text-navy   border-navy
--text-body: 1.05rem     ->  text-body
```

Use the token name, not the hex. `navy` / `accent` / `success` / `danger` /
`link`, `ink-strong` → `ink` → `ink-muted` → `ink-faint` for text,
`surface` / `surface-subtle` / `surface-sunken` / `rule` / `rule-strong`,
and the `text-page-title` … `text-helper` scale. Before #360 the app carried
three yellows, four reds and six off-whites for what are visually one colour
each, because nothing named them.

**Inline `style` is for runtime-computed values only.** A class cannot take a
value that is not known until render. `Loading.tsx` is the reference: its
spinner ring is derived from a `size` prop, so *that* stays inline and
everything else about the component is a class list. A `style` prop the
component exposes to callers (`SectionCard`, `MetaChipsRow`) also stays — the
component's own appearance is in its classes, the prop spreads on top. A
library's `style` prop is that library's API, not a DOM inline style, so
`Modal.jsx`'s `react-modal` config stays as an object.

**Repeated appearance is a named constant** (`NAV_LINK` in `Navbar.jsx`,
`FOOTER_LINK`, `CHIP`), never a copied class list. The navbar is why: its link
style was inlined six times and the copies had drifted apart.

**Don't reach for Tailwind's named palette for a brand value** — Tailwind 4
redefined its defaults in OKLCH, so `red-500` is no longer `#ef4444`.

`src/App.css` is not the place for new rules. It holds exactly two kinds:
styles for markup this app does not render (`.react-pdf__*`) and
descendant/state selectors over a shared block (`.multi-select*`).

`src/constants/typography.js` (`TYPO`) is the **old** system — style objects
that could only be applied by spreading them into `style={{}}`. It survives
only for pages not yet migrated. Use the `text-*` utilities instead; do not
add a `TYPO` spread to a new component.

The audit, the remaining work (775 sites across `pages/` and
`components/home/`), and the full rationale are in `docs/STYLING.md`.

### TypeScript (portal-app/)

The app is **mid-migration** (#365): 18 files are TypeScript, ~82 are still
JavaScript, and both compile in the same build. `tsconfig.json` is what makes
that work — `allowJs: true` with `checkJs: false` means tsc resolves the
`.js`/`.jsx` files so a converted module can import one, without reporting
errors inside them.

`strict` is on and applies to the converted files. That is the point: a file
arrives fully typed when it moves, rather than arriving as implicit `any`.

**`npm run build` does not type-check.** Vite transpiles with esbuild, which
strips types without looking at them, so a type error compiles and ships. Only
`npm run typecheck` (`tsc --noEmit`) catches it, and CI runs it as a step of
the required `portal-app` job.

Converted so far — the priority list from the issue: `firebase/`, the API
utilities (`apiClient`, `apiOrigin`, `errorMessage`, `errorReporter`,
`validators`, `paymentsApi`), `constants/roles`, all four `hooks/`,
`context/AuthProvider`, and `components/ui/{FieldError,Loading}`.

Two files carry the shared types:

- `src/types/models.ts` — the Firestore document shapes (`UserDocument`,
  `UnitDocument`, `LessonDocument`, `ModuleDocument`). Almost every field is
  optional *on purpose*: these collections have no schema and predate any
  validation, so a document written before a field existed simply lacks it.
  Note the `content` collection uses `Capitalized` keys while `lesson` and
  `module` use camelCase — that is real, and these types are what stop a
  caller guessing. Keep them in step with `functions/controllers/`.
- `src/vite-env.d.ts` — the `VITE_*` variables, all optional (Vite only
  inlines what the current mode's .env defines). Keep in sync with
  `.env.example`.

`api.get()` and friends are generic, defaulting to `unknown`:

```ts
const lesson = await api.get<Lesson>(`/api/lesson/${id}`);
```

The default is `unknown` rather than `any` because the client deliberately
does not unwrap a response envelope — the body is whatever the route sent, so
a caller that does not say what it expects is made to narrow it.

When converting a file: `git mv` it (so history follows), type it properly
rather than reaching for `any` — `@typescript-eslint/no-explicit-any` is an
error — and check whether any *test* hardcodes its `.js` path or globs only
`js|jsx`. `firebase/__tests__/firebaseConfig.test.js` did both, and a scan
that only looks at `.js` silently stops covering each file as it moves.

### Modals (portal-app/)

One component: `@/components/ui/Modal`. Never import `react-modal` directly,
and never hand-roll a fixed-position overlay.

```js
<Modal open={isOpen} onClose={close} title="Delete this lesson?" size="small">
  ...
</Modal>
```

It wraps `react-modal` rather than replacing it, because the focus trap,
Escape handling, scroll lock and `role="dialog"` it provides are exactly what
the nine hand-rolled overlays were missing - a keyboard user could tab out of
those into the page behind, and a screen reader was never told a dialog had
opened. `Modal.setAppElement` is handled once inside the wrapper; it used to
be repeated in four files.

`dismissable={false}` for a dialog reporting an outcome already committed,
where dismissing by accident loses the message: it drops the close button and
ignores Escape and backdrop clicks.

### Form validation (portal-app/)

`useFormValidation` (`@/hooks/useFormValidation`) with rules from
`@/utils/validators`, and `FieldError` for the message:

```js
const form = useFormValidation({
  Title: [required("Title")],
  Description: [requiredRichText("Description")],
});

if (!form.validateAll(formData)) return;   // submit blocked, all errors shown
```

Two rules the app follows uniformly:

- **Check every field on submit, not one at a time.** The old pattern showed a
  toast for the first failure and stopped, so a form with three mistakes took
  three submits to discover them.
- **Show the message next to its field, wired for assistive tech.** `FieldError`
  renders `role="alert"` with an id, and `fieldErrorProps` puts the matching
  `aria-invalid` / `aria-describedby` on the input. Red text alone tells a
  screen-reader user nothing.

Validation runs on submit, then re-runs per field as the user edits it
(`form.revalidate`) - never on first keystroke, which shouts at someone who
has not finished typing.

Use `requiredRichText` for ReactQuill fields: an untouched editor still holds
`"<p><br></p>"`, so a plain `required` would accept a blank one.

### Effects: dependencies and cleanup (portal-app/)

`react-hooks/exhaustive-deps` is enforced (#526), so dependency arrays stay
correct on their own. What the linter cannot see, and what #374 fixed, is
lifetime:

**An async effect must not apply a result it no longer owns.** Every effect
that awaits and then sets state carries a cancellation flag, checked after
each await:

```js
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    const data = await api.get(`/api/lesson/${lessonId}`);
    if (cancelled) return;
    setLesson(data);
  };
  load();
  return () => { cancelled = true; };
}, [lessonId]);
```

Without it, moving quickly between two records lets the first response land
after the second and render the wrong one. This manual form is the pattern -
`useApi`, a hook that wrapped it, was added in #370 and removed in #444 without
ever acquiring a caller.

**A timer started in a handler is not covered by an effect's cleanup.** Use
`useSafeTimeout` (`@/hooks/useSafeTimeout`), which clears every pending timer
on unmount, rather than a bare `setTimeout`.

**Do not set state in an effect** - `react-hooks/set-state-in-effect` is on as
an error, and as of #525 nothing suppresses it. There were 34 such sites; they
came in four shapes, and each has a replacement:

| Shape | Instead |
| --- | --- |
| A value computed from other state (`setFiltered(filter(items))`) | derive it during render, `useMemo` if the work is worth caching |
| Reset-on-change (`setPage(1)` when the list changes) | adjust state during render, guarded by a "what I last saw" state |
| A prop or URL read into state | seed it in the `useState` initializer, plus the render-time adjustment for later changes |
| Fetch on mount, via a `useCallback` the effect calls | inline the async function into the effect - and give it a cancellation flag while you are there |

The render-time adjustment is React's documented alternative to an effect, and
it is one render rather than two:

```js
const [pagedOver, setPagedOver] = useState(items);
if (pagedOver !== items) {
  setPagedOver(items);
  setCurrentPage(1);
}
```

The last shape is worth knowing because the rule is interprocedural-blind: it
flags *any* call to a function that sets state, even one whose writes all sit
behind an `await`. That is not a false positive worth suppressing - the fix
(move the async function inside the effect) is also what gives it cancellation.

Deriving rather than mirroring is not only tidier. `OverlayTileView` kept its
filtered list in state, written by two effects - the unfiltered list, then the
filtered one - so refetching content while a filter was active painted every
item for a frame. `components/content/__tests__/OverlayTileView.test.jsx`
watches every commit, not just the last, because Testing Library flushes
effects before an assertion can see the frame in between.

### Auth and user state (portal-app/)

`AuthProvider` (`@/context/AuthProvider`, mounted in `App.jsx` inside the
router) owns **one** `onAuthStateChanged` and **one** realtime listener on
`users/{uid}`. Everything else reads from it:

```js
const { user, userData, role, loading, logout } = useAuth();
```

`useUserData()` and `useUserRole()` still exist and keep their old return
shapes - all 25 call sites are unchanged - but they are now thin reads of that
context rather than each opening their own listener and their own document
read. Before #368, a single screen could hold five to ten listeners on the
same document, and two components could disagree about the current role
depending on which read finished first.

Never call `getAuth()` in a component to learn who is signed in - use the
context. `getAuth()` is still correct in exactly two places: `utils/apiClient.ts`
(it needs a fresh ID token per request) and `auth/googleAuth.js` (it runs the
sign-in flow itself).

### API calls, errors, and user feedback (portal-app/)

One way in, one way out. Established in #370 (transport) and #367 (reporting).

**Calling the backend.** Everything goes through `src/utils/apiClient.ts` -
never a bare `fetch` and never `axios` (removed in #370, it is no longer a
dependency):

```js
import { api } from "@/utils/apiClient";

const lesson = await api.get(`/api/lesson/${id}`);        // token attached automatically
const units  = await api.get("/api/units", { auth: false });  // public endpoint
await api.post("/api/lesson/", lessonData);
```

A non-2xx **throws** an `ApiError` carrying `{ status, code, details }` - there
is no `response.ok` to check. The client does **not** unwrap a response
envelope: only `functions/routes/user.js` uses `responseHelpers.js`, the other 53
responses are raw `res.json()`, so the parsed body comes back verbatim.

Payments are the one exception, and no longer for architectural reasons: since
#439 they are on the same origin as everything else, resolved by the one
`src/utils/apiOrigin.ts`. `src/utils/paymentsApi.ts` survives as a four-line
wrapper only because its call sites read the raw `Response` (checking
`res.ok`, pulling Stripe's `client_secret` out of the body) instead of
apiClient's throw-on-error contract. Converting them is a change to live
payment flows, not a consolidation.

**Telling the user.** `alert()` is not used anywhere any more; there were 32 and
they are all gone. Use the toast channel, mounted once above the router:

```js
const toast = useToast();          // from @/components/ui/ToastProvider
toast.success("Profile updated successfully!");
toast.error(toUserMessage(error, "Failed to update profile"));
```

`toUserMessage(error, fallback)` (`@/utils/errorMessage`) turns an `ApiError`
into something a teacher can act on, keyed on `code`/`status` rather than
message text: offline, session expired, no permission, not found. It returns
**null** for a cancelled request, and `toast.*` ignores null - so callers never
need to guard that case.

**Pending states.** One indicator, `@/components/ui/Loading`, in three variants:
`page` (a whole route waiting on data), `inline` (a section still filling in),
`button` (inside a button mid-submit). All set `role="status"` with
`aria-live="polite"`; the ten hand-rolled `<div>Loading...</div>`s it replaced
announced nothing. The spin honours `prefers-reduced-motion`.

Guard a submit against a double click with an `isSubmitting` flag that the
button's `disabled` reads, set before the await and cleared in `finally`.
(`useAsyncAction` packaged this up in #370 and was removed unused in #444,
alongside `useApi`.)

Never use `!data` as the loading test - "still fetching" and "there is nothing
here" are different states, and conflating them showed a permanent spinner for
records that simply did not exist.

**Render-time crashes.** Before #367 there were no boundaries at all and any
render exception blanked the entire app. There are now three, each with a
`name` that identifies it in the log (#378):

| Boundary | Where | On a crash |
| --- | --- | --- |
| `root` | `index.jsx`, outside every provider | last resort - catches a throw in ToastProvider/AuthProvider/Layout itself |
| `route` | `RouteErrorBoundary` in `App.jsx` | loses the page, keeps the navbar; "Try again" resets it |
| `navbar` / `footer` | `Layout.jsx` | page survives its own chrome; the footer fails silently |

`RouteErrorBoundary` passes the pathname as a `resetKey`, so navigating away
clears the crash. A plain boundary does not: the router swaps the children but
the boundary stays mounted, so one broken page used to poison every page
reached from the navbar until a full reload.

Boundaries report through `reportError` (`@/utils/errorReporter`) rather than
calling `console.error` themselves. No reporting service is wired up and the
backend has no client-log route, so the console is the only destination today;
`setErrorSink` is the one seam to add one later.

## Environment Configuration

⚠️ **IMPORTANT**: Never commit `.env` files or `serviceAccountKey.json` to version control!

### Setup Instructions

1. **Frontend Environment Setup**:
   ```bash
   cd portal-app
   cp .env.example .env.development
   # Edit .env.development with your actual values
   ```

2. **Backend Environment Setup**:
   ```bash
   cd functions
   cp .env.example .env.development
   # Edit .env.development with your actual values
   ```

3. **Firebase Service Account**:
   - Authenticate with `gcloud auth application-default login` (do not download a service account key — see functions/CREDENTIALS.md)
   - This file contains Firebase Admin SDK credentials
   - **NEVER** commit this file to version control

### Environment Variables Reference

**Frontend (.env.development/.env.production in portal-app/):** read as
`import.meta.env.VITE_*`; only the `VITE_` prefix is inlined into the bundle. The prefix
was `REACT_APP_` before #503.
- `VITE_SERVER_ORIGIN_URL` - Backend API URL. Read in exactly one place,
  `src/utils/apiOrigin.ts`, which both `apiClient.ts` and `paymentsApi.ts` use.
  Blank means same-origin, relying on the Hosting rewrite of `/api/**`.
- `VITE_HOME_PAGE` - Frontend application URL
- `VITE_DIYA_BASE_URL` - DIYA research organization URL
- `VITE_FIREBASE_*` - Firebase configuration keys
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_test_* or pk_live_*)

**Backend (.env.development/.env.production in functions/):** local runs only -
the deployed function reads secrets from Secret Manager and loads no .env file.
- `NODE_ENV` - Environment (development/production)
- `SERVER_ALLOW_ORIGIN` - CORS allowed origin
- `PORT` - Server port (default: 3001)
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_* or sk_live_*)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret
- `ENABLE_MOCK_FIREBASE` - Use mock Firebase for development (true/false)

Dev, staging, and production are separate Firebase projects (see the README's
"Staging project" section) rather than a shared project split by a collection
prefix — that scheme (`DATABASE_SCHEMA_QUALIFIER`) was retired in #428.

### Security Notes
- See `SECURITY.md` for security best practices
- All sensitive data should be in gitignored `.env` files
- Use `.env.example` files as templates with placeholder values
- Different keys should be used for development vs production environments

## User Roles and Features

### Content Creators (Producers)
- Upload educational content
- Manage uploaded materials
- Create content nuggets

### Educators (Consumers)
- Browse and explore modules
- Generate lesson plans from content
- Save and manage lesson plans
- Access detailed lesson views

### System Features
- Firebase Authentication
- Real-time content updates
- PDF generation for lessons
- File upload and storage
- Responsive design

## Development Notes

- The application uses Firebase for all data persistence
- CORS is configured to allow frontend-backend communication
- The start script handles dependency installation automatically
- Both frontend and backend must be running for full functionality
- Ports 3000 and 3001 must be available

## Testing

Frontend testing uses Vitest and React Testing Library, configured in the `test` block of
`portal-app/vite.config.js` with `portal-app/src/setupTests.js` as the setup file. Tests use
Vitest's globals (`describe`/`test`/`expect`) plus `vi` for mocking — there is no `jest`
global. No specific test scripts are configured for the backend.

Firestore security rules are tested separately, in `tests/rules/` (Jest +
`@firebase/rules-unit-testing`, run by `firebase emulators:exec` against a real Firestore
emulator, so it needs Java). `cd tests/rules && npm test`. This suite is what gates the
automated rules deploy — `.github/workflows/firestore-rules-tests.yml` is `workflow_call`
only, and both `ci.yml` and `deploy-firestore-config.yml` call it, so a PR check and a
deploy gate can never diverge (#428).

## Code Documentation

## User Roles Storage

The user roles are stored in a single Firebase Firestore `users` collection, as a string
value in a `role` field within each user document. `teachers` and `students` used to be
separate collections, looked up ahead of `users` (see git history around #427/#431), with a
`DATABASE_SCHEMA_QUALIFIER` prefix layering dev/prod into one shared Firebase project on top
of that. Both were retired in #428: dev/staging and production are now separate Firebase
projects, and every account lives in one unprefixed `users` collection.

Available Roles:
- admin - Administrative access
- teacherPlus - Premium teacher role (subscription-based); intended to also scope content
  access to what that teacher created, once that's built (not yet implemented)
- teacherDefault - Basic teacher role (default); intended to read content marked for
  teachers, once that's built (not yet implemented)
- studentDefault - Student role (default for student self-signup); intended to read content
  marked for students, once that's built (not yet implemented)

User Lookup Pattern:

functions/routes/user.js's `/me` handler reads the caller's own document directly from
`users` via `databaseService.getUserDocument` — no fallback chain.

Role Assignment Logic:

- Default registration (teacher path, via POST /api/user/register): teacherDefault
  (functions/routes/user.js)
- Default registration (student path, client-side signup): studentDefault
  (portal-app/src/pages/sign_up/index.jsx)
- Subscription upgrades: Premium plans assign teacherPlus role (functions/routes/payment.js)
- Cancellations: Reset to teacherDefault role (functions/routes/subscription.js)

Admin Functions:

- Admin role verification: functions/utils/ownership.js (`isAdminUser`)
- Admin-only endpoints for user management and role updates (PUT /api/user/updateRole)
- Custom claims mirror the role into the ID token as a fast path (functions/utils/customClaims.js)

Authentication Integration

- Uses Firebase Admin SDK for Firestore operations
- Requires authenticateUser middleware for protected routes
- JWT token verification handled by middleware

Database Schema

- One collection: `users`. No prefix — see the README's "Staging project" section for how
  environments are separated instead.

Security Considerations

- All routes except GET /:userId require authentication
- Admin functions double-check role permissions
- Uses Firebase UID as document keys for security
- Server-side timestamps prevent client manipulation

This file serves as the user identity and permission management layer, handling the complete user
lifecycle from registration to role management.

## How do I login as admin in the portal

Based on the codebase analysis, there is no  traditional admin login interface in the portal. The admin role is assigned at the database level, not through a separate login process.

