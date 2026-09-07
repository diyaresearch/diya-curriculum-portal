# portal-app

The DIYA Curriculum Portal frontend: React 18 built with [Vite](https://vite.dev).
It was bootstrapped with Create React App and migrated off `react-scripts` in
issue #503 — CRA was formally sunset by the React team and accounted for nearly
all of this package's dependency advisories.

## Available scripts

Run these from `portal-app/`. Node 22.12 or newer is required (Vite 7, Vitest 5).

### `npm start` (alias: `npm run dev`)

Starts the Vite dev server on [http://localhost:3000](http://localhost:3000)
with hot module replacement. `/api/*` is proxied to the local `server/` backend
on port 3001 — payments are *not* covered by that proxy; they go straight to
Cloud Functions via `src/utils/paymentsApi.js`.

### `npm run build`

Builds to `build/`, with hashed assets under `build/static/`. Those two paths
are not Vite's defaults (`dist/` + `assets/`) — they're pinned in
`vite.config.js` because the repo-root `firebase.json` serves
`portal-app/build` at the site root and applies immutable caching to
`/static/**`. Changing either one means changing the hosting config too.

### `npm run preview`

Serves the contents of `build/` locally, which is the closest local
approximation of what Firebase Hosting will serve.

### `npm test` / `npm run test:watch`

Runs [Vitest](https://vitest.dev) once, or in watch mode. Configuration lives in
the `test` block of `vite.config.js`; `src/setupTests.js` registers the
`@testing-library/jest-dom` matchers and the module mocks (Firebase Auth,
react-pdf, axios) that keep tests off the network. Tests use Vitest's globals
plus `vi` for mocking — there is no `jest` global.

### `npm run lint`

ESLint with a flat config (`eslint.config.js`), which replaces CRA's bundled
`react-app` / `react-app/jest` presets. Warnings fail the run
(`--max-warnings=0`), same as before.

## Environment variables

Client-side config comes from `.env*` files in this directory and must be
prefixed `VITE_` — Vite only inlines that prefix into the bundle. Read them as
`import.meta.env.VITE_FOO`, never `process.env`. Start from `.env.example`; the
root README's "Environment variables" section covers file precedence, the
Firebase emulator toggle, and the staging project.
