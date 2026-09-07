# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIYA Curriculum Portal is a full-stack educational platform built with React frontend, Express.js backend, and Firebase for authentication and data storage. The platform serves educators and content creators, allowing content creators to upload educational materials and educators to generate lesson plans.

## Architecture

### Repository Structure
- `portal-app/` - React frontend application (port 3000)
- `server/` - Express.js backend API (port 3001), deployed to App Engine
- `functions/` - Express app wrapped in a single Firebase Function (`payments`), deployed to
  Cloud Functions
- `start.sh` - Script to start both `portal-app/` and `server/` concurrently (`functions/` isn't
  part of it - run it separately with `firebase emulators:start --only functions`, or deploy it
  with `firebase deploy --only functions`)

### Frontend (portal-app/)
- **Framework**: React 18, built with Vite (`vite.config.js`) — react-scripts/CRA and the
  `@craco/craco` patch it needed were removed in #503
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: React hooks, Firebase context
- **Key Dependencies**: Firebase SDK, React Quill, jsPDF, React Modal
- **Testing**: Vitest + React Testing Library (`npm test` runs `vitest run`)
- **Lint**: flat-config ESLint (`eslint.config.js`), which replaces CRA's bundled
  `react-app` shareable config

### Backend (server/)
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK
- **File Storage**: Firebase Storage, Google Cloud Storage
- **Key Dependencies**: Firebase Admin, Multer, PDFKit, CORS
- **Owns**: users, roles, content, lessons, modules, subscription *management* (status/cancel/
  reactivate/enterprise-contact - `routes/subscription.js`). Does **not** own payment processing
  (see below) - `routes/payment.js` still exists here but its non-webhook routes are unreachable
  from the app as of #439; see the comment at the top of that file before touching it.

### Backend (functions/)
- **Framework**: Express, wrapped as a single `onRequest` Cloud Function named `payments`
- **Owns**: all payment processing - `create-payment-intent`, `create-module-checkout-session`,
  `create-embedded-checkout-session`, `confirm-payment`, `history`, and the Stripe webhook
  (`/webhook`). This is the one authoritative home for payments (#439) - it's the copy with the
  working idempotent webhook and the entitlement-granting logic for module purchases.
- `server/` used to duplicate every one of these routes byte-for-byte-adjacent, with real drift
  between the copies (a missing idempotency fix, a missing custom-claims sync) - #439 has the
  history if a route here looks unfamiliar next to `server/routes/payment.js`.
- The frontend reaches this exclusively through `portal-app/src/utils/paymentsApi.js` - never a
  hardcoded URL or `VITE_SERVER_ORIGIN_URL` for anything under `/api/payment/*`.

### Firebase Integration
- **Authentication**: Firebase Auth for user management
- **Database**: Firestore for content, lessons, modules, and user data
- **Storage**: Firebase Storage for file uploads
- **Configuration**: Environment variables for Firebase config

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
```

Requires Node 22.12+ (Vite 7 / Vitest 5). The build output directory (`build/`, assets
under `static/`) is deliberately CRA's, not Vite's default `dist/`+`assets/` — the root
`firebase.json` serves `portal-app/build` and caches `/static/**` immutably. See the
comments in `portal-app/vite.config.js` before changing either.

### Backend (server/)
```bash
cd server
npm install
npm start           # Start server (http://localhost:3001)
```

## Key Components and Routes

### Frontend Routes
- `/` - Home page with module exploration
- `/upload-content` - Content upload for producers
- `/lesson-generator` - AI lesson plan generation
- `/modules/:moduleId` - Module detail view
- `/lesson/:lessonId` - Lesson detail view
- `/user-profile` - User profile management
- `/nugget-builder` - Content nugget creation tool
- `/upgrade` - Subscription upgrade page

### Backend API Routes
`server/` (App Engine, `VITE_SERVER_ORIGIN_URL`):
- `/api/units` - Content management endpoints
- `/api/lessons` - Lesson CRUD operations
- `/api/modules` - Module management
- `/api/user` - User profile and authentication
- `/api/subscription` - Subscription management (status/cancel/reactivate/enterprise-contact) -
  not payment processing, see `functions/` below

`functions/` (Cloud Function `payments`, reached via `portal-app/src/utils/paymentsApi.js`):
- `/api/payment` - All payment processing: create-payment-intent, create-module-checkout-session,
  create-embedded-checkout-session, confirm-payment, history, and the Stripe webhook

### Key Components
- `Layout.jsx` - Main layout wrapper with navigation
- `Navbar.jsx` - Navigation component
- `Module.jsx` - Module display component
- `LessonDetail.jsx` - Lesson viewing component
- `ExploreModulesSection.jsx` - Module exploration interface

### Navigation Patterns (portal-app/)

Use React Router for anything that goes to another in-app route:
- `<Link to="/...">` for a link a user clicks (renders an `<a>`, no full page reload)
- `useNavigate()` (`navigate("/...")`) for programmatic navigation (after a form submit, a
  role check, a conditional redirect)

Plain `<a href="...">` is reserved for external links (`target="_blank"`, e.g. social links in
`Footer.jsx`, the DIYA base URL in `Navbar.jsx`) - React Router's `Link` is only meaningful for
routes this app itself serves.

`window.location.reload()` / `window.location.href = ...` are not a substitute for `navigate()` -
they force a full page reload, discarding in-memory state (React context, Firebase auth
listeners, etc.). They're used deliberately in a few places to force a hard refresh of
cached user/subscription data right after a mutation (see the comments around the
`window.location.reload()` calls in `pages/payment/PaymentPage.jsx`,
`pages/payment/YearlyPaymentPage.jsx`, `pages/module_builder/builder.jsx`, and
`pages/lesson-plans/builder.jsx`) - don't replace those with `navigate()`, which wouldn't
force the same reset. Reading `window.location.origin/hostname/pathname` (no navigation
involved) is unaffected by any of this.

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
after the second and render the wrong one. `useApi` (#370) does this for you -
prefer it for plain API reads; the manual form is for Firestore reads and
multi-value loads.

**A timer started in a handler is not covered by an effect's cleanup.** Use
`useSafeTimeout` (`@/hooks/useSafeTimeout`), which clears every pending timer
on unmount, rather than a bare `setTimeout`.

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
context. `getAuth()` is still correct in exactly two places: `utils/apiClient.js`
(it needs a fresh ID token per request) and `auth/googleAuth.js` (it runs the
sign-in flow itself).

### API calls, errors, and user feedback (portal-app/)

One way in, one way out. Established in #370 (transport) and #367 (reporting).

**Calling the backend.** Everything under `server/` goes through
`src/utils/apiClient.js` - never a bare `fetch` and never `axios` (removed in
#370, it is no longer a dependency):

```js
import { api } from "@/utils/apiClient";

const lesson = await api.get(`/api/lesson/${id}`);        // token attached automatically
const units  = await api.get("/api/units", { auth: false });  // public endpoint
await api.post("/api/lesson/", lessonData);
```

A non-2xx **throws** an `ApiError` carrying `{ status, code, details }` - there
is no `response.ok` to check. The client does **not** unwrap a response
envelope: only `server/routes/user.js` uses `responseHelpers.js`, the other 53
responses are raw `res.json()`, so the parsed body comes back verbatim.

Payments are the one exception - they live in `functions/`, not `server/`, and
keep using `src/utils/paymentsApi.js`.

For data a component loads on mount, prefer the hook, which adds cancellation
and a uniform shape:

```js
const { data, loading, error, refetch } = useApi(
  (signal) => api.get(`/api/lesson/${lessonId}`, { signal }),
  [lessonId]
);
```

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

For actions rather than reads, `useAsyncAction` (`@/hooks/useAsyncAction`)
gives `{ run, pending, error, reset }` and **drops a second call while one is
in flight**, which is what stops a double-clicked submit firing twice:

```js
const save = useAsyncAction(async () => {
  await api.post("/api/lesson/", lessonData);
  toast.success("Saved");
});

<button onClick={save.run} disabled={save.pending}>
  {save.pending ? <Loading variant="button" message="Saving..." /> : "Save"}
</button>
```

Never use `!data` as the loading test - "still fetching" and "there is nothing
here" are different states, and conflating them showed a permanent spinner for
records that simply did not exist.

**Render-time crashes.** `ErrorBoundary` wraps the routed content in `App.jsx`,
so a component that throws loses its page but keeps the navbar, with a "Try
again" that resets it. Before #367 there were none, and any render exception
blanked the entire app.

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
   cd server
   cp .env.example .env.development
   # Edit .env.development with your actual values
   ```

3. **Firebase Service Account**:
   - Authenticate with `gcloud auth application-default login` (do not download a service account key — see server/CREDENTIALS.md)
   - This file contains Firebase Admin SDK credentials
   - **NEVER** commit this file to version control

### Environment Variables Reference

**Frontend (.env.development/.env.production in portal-app/):** read as
`import.meta.env.VITE_*`; only the `VITE_` prefix is inlined into the bundle. The prefix
was `REACT_APP_` before #503.
- `VITE_SERVER_ORIGIN_URL` - Backend server URL
- `VITE_HOME_PAGE` - Frontend application URL
- `VITE_DIYA_BASE_URL` - DIYA research organization URL
- `VITE_FIREBASE_*` - Firebase configuration keys
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_test_* or pk_live_*)

**Backend (.env.development/.env.production in server/):**
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

server/routes/user.js's `/me` handler reads the caller's own document directly from
`users` via `databaseService.getUserDocument` — no fallback chain.

Role Assignment Logic:

- Default registration (teacher path, via POST /api/user/register): teacherDefault
  (server/routes/user.js)
- Default registration (student path, client-side signup): studentDefault
  (portal-app/src/pages/sign_up/index.jsx)
- Subscription upgrades: Premium plans assign teacherPlus role (server/routes/payment.js)
- Cancellations: Reset to teacherDefault role (server/routes/subscription.js)

Admin Functions:

- Admin role verification: server/utils/ownership.js (`isAdminUser`)
- Admin-only endpoints for user management and role updates (PUT /api/user/updateRole)
- Custom claims mirror the role into the ID token as a fast path (server/utils/customClaims.js)

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

