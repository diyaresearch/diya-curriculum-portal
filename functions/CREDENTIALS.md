# Firebase Admin credentials

The backend talks to Firestore through the Firebase Admin SDK, which needs a
Google Cloud identity. This document is the single source of truth for how that
identity is chosen, set up, and diagnosed.

Written after issue #418, where an expired downloaded key silently took down
every Firestore-backed API route in production and locally.

## Where initialization happens

`config/firebaseConfig.js` holds the **only** `admin.initializeApp()` in this
backend, and everything reaches Firestore or Storage through it:

| Caller | How it gets a handle |
|---|---|
| `controllers/*`, `routes/*`, `middleware/*` | `databaseService.getDb()`, inside the handler — the same app, plus the mock mode below. `middleware/ensureDatabase.js` has already initialized it (#396), so no `await databaseService.initialize()` at the call site. |
| `routes/stripeWebhook.js` | `require("../config/firebaseConfig").db`, lazily. Never `databaseService`: a payment event must reach real Firestore or fail, and that layer can serve mock data in development. |

Controllers used to require `{ db, storage }` from `config/firebaseConfig` at
module load, which resolved a real credential the moment the file was
required — defeating `ENABLE_MOCK_FIREBASE` and forcing CI to hand the API an
emulator address just to boot it. #366 moved them onto `databaseService`;
nothing in the app now loads `config/firebaseConfig` at require time.

`services/databaseService.js` does not initialize anything itself; its real
(non-mock) mode delegates to `config/firebaseConfig`. Mock mode
(`ENABLE_MOCK_FIREBASE=true`, or development with no credential at all) never
touches the Admin SDK.

Until #362, `routes/payment.js` and `routes/stripeWebhook.js` each called a
bare `admin.initializeApp()` of their own. The Admin SDK keeps one default
app, so whichever module loaded first decided the credential for the entire
process — and a bare call ignores the precedence below entirely, which meant
a request landing on the webhook first could bind the process to a different
identity than every other route had resolved. `__tests__/single-firebase-init.test.js`
fails if a second initialization site reappears.

The client SDK is configured separately and shares nothing with this file —
see `portal-app/src/firebase/firebaseConfig.js`, which reads public
`VITE_FIREBASE_*` values out of the bundle. Admin credentials never appear in
the frontend.

## How the credential is chosen

`config/credentials.js` resolves exactly one credential, highest priority first:

| # | Source | When it applies |
|---|---|---|
| 1 | `FIREBASE_SERVICE_ACCOUNT` | Set to service account JSON, or its base64 encoding. For CI and secret managers. |
| 2 | Runtime service account | Automatic on Cloud Functions, Cloud Run, and App Engine. |
| 3 | `GOOGLE_APPLICATION_CREDENTIALS` | Set to the path of a credential file. |
| 4 | gcloud ADC | `~/.config/gcloud/application_default_credentials.json` exists. |
| 5 | `serviceAccountKey.json` | Local only, and only with `FIREBASE_ALLOW_KEY_FILE=true`. |

Downloaded JSON keys are last and opt-in on purpose. They do not expire in any
visible way, they are easy to leak, and revoking one takes the service down with
no warning — which is precisely what happened in #418. On Cloud Functions and Cloud
Run the resolver refuses to read one at all, because those runtimes already have
an identity.

## Local development

```bash
gcloud auth application-default login --project curriculum-portal-1ce8f
cd server && npm start
```

You should see:

```
Firebase initialized with gcloud ADC (/Users/you/.config/gcloud/application_default_credentials.json)
Firestore reachable - Admin credential is valid
```

If ADC has gone stale (`invalid_grant` / `invalid_rapt`), run the login command
again — that error means Google wants a re-authentication, not that anything is
misconfigured.

To use a downloaded key anyway (discouraged, and never in a deploy):

```bash
FIREBASE_ALLOW_KEY_FILE=true npm start
```

## Production (Cloud Functions)

The deployed function runs as the project's default compute service account,
`curriculum-portal-1ce8f@appspot.gserviceaccount.com`, and reaches Firestore
through the metadata server. There is no key material in the deploy at all.

> The API ran on App Engine until #439, as
> `appengine-default@curriculum-portal-1ce8f.iam.gserviceaccount.com` pinned by
> `app.yaml`'s `service_account:`. That service and its `app.yaml` are gone;
> the IAM grants below are the Cloud Functions equivalents.

Grant the runtime identity Firestore access once per project:

```bash
SA=serviceAccount:curriculum-portal-1ce8f@appspot.gserviceaccount.com

# Runtime: read and write Firestore
gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
  --member=$SA --role=roles/datastore.user --condition=None

# Runtime: read the Stripe secrets bound in index.js
gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
  --member=$SA --role=roles/secretmanager.secretAccessor --condition=None

# The app's own storage bucket, scoped rather than project-wide storage.admin
gcloud storage buckets add-iam-policy-binding gs://curriculum-portal-1ce8f.appspot.com \
  --member=$SA --role=roles/storage.admin --project=curriculum-portal-1ce8f
```

Then deploy from the repo root:

```bash
firebase deploy --only functions --project curriculum-portal-1ce8f
```

Confirm the runtime identity in the logs — it must name the metadata server,
never a key file:

```bash
firebase functions:log --project curriculum-portal-1ce8f | grep "Firebase initialized"
# Firebase initialized with attached runtime service account (metadata server)
```

`firebase.json`'s functions `ignore` list excludes `serviceAccountKey.json`
(and every `.env*` file, which hold live Stripe keys), so neither can ride
along in the deployed artifact even if still sitting in the directory.

## Checking whether credentials work

```bash
curl -s https://us-central1-curriculum-portal-1ce8f.cloudfunctions.net/payments/api/health
```

- `200 {"status":"ok","firestore":"reachable"}` — credential is valid.
- `503 {"status":"degraded",...}` — the Admin credential cannot reach Firestore.
  The response body and the function log both carry the underlying error.

The same check runs once at local startup, so the log names the problem and the
fix instead of leaving every route to fail with an opaque 500.

## Failure modes and what they mean

| Symptom | Cause | Fix |
|---|---|---|
| `16 UNAUTHENTICATED: Request had invalid authentication credentials` | The service account key was deleted or disabled. | Stop using the key file; switch to ADC or the runtime service account. |
| `invalid_grant` / `invalid_rapt` | Local gcloud ADC needs re-authentication. | `gcloud auth application-default login` |
| `7 PERMISSION_DENIED` | The identity is valid but lacks Firestore roles. | Grant `roles/datastore.user` to the service account. |
| Server logs `MOCK mode` outside development | No credential source was found. | Outside development this now throws instead; in development it means ADC is missing. |

## Retiring the old key

The key `firebase-adminsdk-2jl7h@curriculum-portal-1ce8f.iam.gserviceaccount.com`
(`private_key_id` `20fe6ad5…`) is already invalid. Once ADC is working, delete
the local file and the key itself so it cannot be confused for a live credential:

```bash
rm functions/serviceAccountKey.json
gcloud iam service-accounts keys list \
  --iam-account=firebase-adminsdk-2jl7h@curriculum-portal-1ce8f.iam.gserviceaccount.com
# then, for each stale key id:
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=firebase-adminsdk-2jl7h@curriculum-portal-1ce8f.iam.gserviceaccount.com
```

A copy of this key also exists in git history (see SECURITY.md); purging history
is tracked separately.
