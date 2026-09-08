# The API

One Express app serving the whole backend, deployed as the Cloud Function
`payments`. It was two backends until #439 — an App Engine service in `server/`
and this function — which shared ~1,330 lines by copy-paste and had drifted
apart in four of them. See the note at the top of `app.js`.

## Layout

| Path | What it is |
|---|---|
| `app.js` | Builds the Express app: CORS, rate limiting, routes, health, error handling. The only place the app is assembled. |
| `index.js` | Cloud Functions entry — wraps `app.js` as the `payments` function. Deployed. |
| `local.js` | Plain-Node entry — the same app on a port. Used by `npm start`, `start.sh` and CI. |
| `routes/` | HTTP surface. `stripeWebhook.js` is separate from `payment.js` because it needs a raw body. |
| `controllers/` | Handlers for units, modules and lessons. |
| `services/databaseService.js` | Firestore access, plus the mock used when `ENABLE_MOCK_FIREBASE=true`. |
| `config/credentials.js` | Decides which Admin credential to use, without contacting Google. |
| `utils/stripeClient.js` | The one Stripe client. Resolves TEST vs LIVE per call. |

## Running locally

```bash
npm install
npm start          # http://localhost:3001
npm test           # jest
```

`npm start` needs no cloud credentials if you set `ENABLE_MOCK_FIREBASE=true`,
or point it at the Firebase emulator with `FIRESTORE_EMULATOR_HOST`. From the
repo root, `./start.sh` brings this up alongside the frontend, and
`./start.sh --emulator` does it against the emulator suite.

`npm run serve` runs it through the Functions emulator, which exercises the
deployed wrapper rather than `local.js`.

Deploying: see [DEPLOYMENT.md](DEPLOYMENT.md). Credentials: see
[CREDENTIALS.md](CREDENTIALS.md).

## Base URL

`/api` — through the Firebase Hosting rewrite, or appended to the function's
own URL (`.../payments/api/units`). The payment routes are additionally
mounted without the `/api/payment` prefix for backwards compatibility.

## Endpoints

| Prefix | Owns |
|---|---|
| `/api/units`, `/api/unit/:id` | Content nuggets |
| `/api/lessons`, `/api/lesson/:id` | Lesson plans, including PDF download |
| `/api/modules`, `/api/module/:id` | Modules and entitlement-gated contents |
| `/api/user` | Profiles, registration, roles |
| `/api/subscription` | Subscription status, upgrade, cancel, reactivate |
| `/api/payment` | Stripe payment processing and the webhook |
| `/api/health` | Liveness plus a real Firestore reachability check |

## Authentication

A Firebase ID token in the `Authorization: Bearer <token>` header, verified by
`middleware/authenticateUser.js`. `middleware/optionalAuth.js` attaches the
caller when a token is present and carries on when it is not — used by routes
that are public but show more to an entitled user. `middleware/requireRole.js`
gates admin-only routes.

## Error Responses

- `400 Bad Request` — the request format is incorrect.
- `401 Unauthorized` — missing or invalid credentials.
- `403 Forbidden` — authenticated, but not permitted.
- `404 Not Found` — the requested resource does not exist.
- `429 Too Many Requests` — rate limited (`middleware/rateLimiter.js`).
- `500 Internal Server Error` — an internal error. Detail is withheld outside
  development; see `middleware/errorHandler.js`.
- `503 Service Unavailable` — a dependency is down: Firestore on `/api/health`,
  or Stripe on a payment route when no key is configured.
