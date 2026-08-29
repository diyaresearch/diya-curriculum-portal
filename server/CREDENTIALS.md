# Firebase Admin credentials

The backend talks to Firestore through the Firebase Admin SDK, which needs a
Google Cloud identity. This document is the single source of truth for how that
identity is chosen, set up, and diagnosed.

Written after issue #418, where an expired downloaded key silently took down
every Firestore-backed API route in production and locally.

## How the credential is chosen

`config/credentials.js` resolves exactly one credential, highest priority first:

| # | Source | When it applies |
|---|---|---|
| 1 | `FIREBASE_SERVICE_ACCOUNT` | Set to service account JSON, or its base64 encoding. For CI and secret managers. |
| 2 | Runtime service account | Automatic on App Engine, Cloud Run, and Cloud Functions. |
| 3 | `GOOGLE_APPLICATION_CREDENTIALS` | Set to the path of a credential file. |
| 4 | gcloud ADC | `~/.config/gcloud/application_default_credentials.json` exists. |
| 5 | `serviceAccountKey.json` | Local only, and only with `FIREBASE_ALLOW_KEY_FILE=true`. |

Downloaded JSON keys are last and opt-in on purpose. They do not expire in any
visible way, they are easy to leak, and revoking one takes the service down with
no warning — which is precisely what happened in #418. On App Engine and Cloud
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

## Production (App Engine)

App Engine runs as `appengine-default@curriculum-portal-1ce8f.iam.gserviceaccount.com`. Grant
it Firestore access once, then deploy with no key material at all:

`app.yaml` pins the identity with `service_account:`, which the org policy
`constraints/appengine.enforceServiceAccountActAsCheck` requires. The
application also needs an app-level default service account set once:

```bash
gcloud app update --project=curriculum-portal-1ce8f \
  --service-account=appengine-default@curriculum-portal-1ce8f.iam.gserviceaccount.com
```

The service account started with **no roles at all**. These are the ones the
deploy and the running app actually need (verified 2026-08-28):

```bash
SA=serviceAccount:appengine-default@curriculum-portal-1ce8f.iam.gserviceaccount.com

# Runtime: read and write Firestore
gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
  --member=$SA --role=roles/datastore.user --condition=None

# Build: push and pull the container image, write build logs
gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
  --member=$SA --role=roles/artifactregistry.writer --condition=None
gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
  --member=$SA --role=roles/cloudbuild.builds.builder --condition=None
gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
  --member=$SA --role=roles/logging.logWriter --condition=None

# Buckets: Cloud Build staging, and the app's own storage bucket.
# Scoped to the buckets rather than granting project-wide storage.admin.
for B in staging.curriculum-portal-1ce8f.appspot.com curriculum-portal-1ce8f.appspot.com; do
  gcloud storage buckets add-iam-policy-binding gs://$B \
    --member=$SA --role=roles/storage.admin --project=curriculum-portal-1ce8f
done
```

Then deploy:

```bash
cd server && gcloud app deploy app.yaml --project=curriculum-portal-1ce8f --quiet
```

Confirm the runtime identity in the logs — it must name the metadata server,
never a key file:

```bash
gcloud app logs read --project=curriculum-portal-1ce8f --limit=50 | grep "Firebase initialized"
# Firebase initialized with attached runtime service account (metadata server)
```

`.gcloudignore` excludes `serviceAccountKey.json`, so the key cannot ride along
in the deployed artifact even if it is still sitting in the directory.

## Checking whether credentials work

```bash
curl -s https://curriculum-portal-1ce8f.uc.r.appspot.com/api/health
```

- `200 {"status":"ok","firestore":"reachable"}` — credential is valid.
- `503 {"status":"degraded",...}` — the Admin credential cannot reach Firestore.
  The response body and the server log both carry the underlying error.

The same check runs once at startup, so the server log names the problem and the
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
rm server/serviceAccountKey.json
gcloud iam service-accounts keys list \
  --iam-account=firebase-adminsdk-2jl7h@curriculum-portal-1ce8f.iam.gserviceaccount.com
# then, for each stale key id:
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=firebase-adminsdk-2jl7h@curriculum-portal-1ce8f.iam.gserviceaccount.com
```

A copy of this key also exists in git history (see SECURITY.md); purging history
is tracked separately.
