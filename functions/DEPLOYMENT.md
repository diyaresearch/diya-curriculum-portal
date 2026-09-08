# Backend Deployment Instructions

Deploys `functions/` — the whole API — to Cloud Functions, where it runs as the
function `payments` and is reachable two ways:

- directly, at `https://us-central1-curriculum-portal-1ce8f.cloudfunctions.net/payments`
- through the Firebase Hosting rewrite of `/api/**` (repo-root `firebase.json`)

There used to be a second backend: an App Engine service deployed from
`server/`, live at `https://curriculum-portal-1ce8f.uc.r.appspot.com`. #439
collapsed it into this one — see the note at the top of `app.js` for why — so
`gcloud app deploy` is no longer part of shipping this project.

> **The function is still named `payments`, and now serves everything.** The
> name is historical. It is referenced by the Hosting rewrite, by the Stripe
> webhook endpoint registered in the Stripe dashboard, and by
> `portal-app/.env.production`. Renaming it means updating all three and
> deleting the old function, which is a deliberate coordinated change rather
> than something to slip into an unrelated deploy.

## Prerequisites

1. **Install the Firebase CLI**: https://firebase.google.com/docs/cli
2. **Authenticate**:
   ```bash
   firebase login
   ```
3. **Confirm the project**:
   ```bash
   firebase use curriculum-portal-1ce8f
   ```
4. **Runtime identity.** The deployed function authenticates as the project's
   default compute service account, which needs Firestore access (once per
   project):
   ```bash
   gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
     --member=serviceAccount:curriculum-portal-1ce8f@appspot.gserviceaccount.com \
     --role=roles/datastore.user
   ```
   Do **not** bundle a `serviceAccountKey.json`. `firebase.json`'s functions
   `ignore` list excludes it, and `config/credentials.js` refuses to read one
   on a Google-managed runtime. See [CREDENTIALS.md](CREDENTIALS.md).

   That same `ignore` list excludes every `.env*` file, and this matters:
   #439 moved the API's env files here from `server/`, where a `.gcloudignore`
   had been keeping them out of the App Engine upload (#418). They hold live
   Stripe secret keys. The deployed function reads its secrets from Secret
   Manager (see `index.js`) and never loads a `.env` file, so excluding them
   costs nothing — but adding a file to that directory without adding it to
   the ignore list would ship it.

## Secrets

The function reads Stripe credentials from Secret Manager, bound in `index.js`
— not from a `.env` file, which is why the deploy artifact excludes them:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY_TEST
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

`utils/stripeClient.js` defaults to the TEST key unless `STRIPE_LIVEMODE` is
explicitly truthy, so a deploy that forgets to set the live key fails safe
rather than taking real money against the wrong account.

## Deploy Firestore Rules and Indexes

Rules and composite indexes live in source (`portal-app/firestore.rules`,
`portal-app/firestore.indexes.json`) and are **not** deployed by
`firebase deploy --only functions`. They have their own pipeline.

### CI deploys them (#428)

`.github/workflows/deploy-firestore-config.yml` runs the rules test suite
against a real Firestore emulator and then deploys rules and indexes — first
to `curriculum-portal-staging`, then to `curriculum-portal-1ce8f` — on every
push to `main` that touches `firestore.rules`, `firestore.indexes.json`,
`firebase.json`, `.firebaserc`, or `tests/rules/`. Its `workflow_dispatch`
trigger takes a `target` input (`staging` or `production`) for re-syncing one
project without an empty commit.

Two things it deliberately does not do:

- **It never deletes an index.** The deploy runs without `--force`, so an
  index that is live but absent from `firestore.indexes.json` is left alone
  and reported. Removing one stays a manual, deliberate act.
- **It never deploys Hosting or Functions.** Automating those is a separate
  decision; the rules are safe to automate only because the emulator suite
  can prove them correct first.

### One-time setup: Workload Identity Federation

Until this is configured the workflow still runs on every qualifying push,
but the deploy steps warn and no-op instead of failing — so an unconfigured
repo does not sit permanently red.

Authentication is Workload Identity Federation: GitHub mints a short-lived
OIDC token that GCP exchanges for an access token. There is no
service-account JSON key to store, leak, or rotate, which is the whole point
(#426).

Run once, as a project owner, substituting your own numeric project number:

```bash
# 1. A pool and a provider that trusts this repository, in the prod project.
gcloud iam workload-identity-pools create github \
  --project=curriculum-portal-1ce8f --location=global \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github \
  --project=curriculum-portal-1ce8f --location=global \
  --workload-identity-pool=github \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository \
  --attribute-condition="assertion.repository == 'diyaresearch/diya-curriculum-portal'"

# 2. One deploy service account per project, each with only the two roles a
#    rules+indexes deploy needs. Repeat for curriculum-portal-staging.
gcloud iam service-accounts create firestore-config-deployer \
  --project=curriculum-portal-1ce8f --display-name="CI Firestore config deploy"

for role in roles/firebaserules.admin roles/datastore.indexAdmin; do
  gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
    --member=serviceAccount:firestore-config-deployer@curriculum-portal-1ce8f.iam.gserviceaccount.com \
    --role="$role"
done

# 3. Let the pool impersonate that account, but only from this repo.
gcloud iam service-accounts add-iam-policy-binding \
  firestore-config-deployer@curriculum-portal-1ce8f.iam.gserviceaccount.com \
  --project=curriculum-portal-1ce8f \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/diyaresearch/diya-curriculum-portal"
```

Then set three **repository variables** (Settings → Secrets and variables →
Actions → Variables). Variables, not secrets: a provider resource name and
two service-account emails are public identifiers — the trust lives in the
IAM binding above, not in keeping the strings hidden.

| Variable | Value |
|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github` |
| `GCP_DEPLOY_SA_STAGING` | `firestore-config-deployer@curriculum-portal-staging.iam.gserviceaccount.com` |
| `GCP_DEPLOY_SA_PRODUCTION` | `firestore-config-deployer@curriculum-portal-1ce8f.iam.gserviceaccount.com` |

Optionally create a `production` GitHub Environment with a required reviewer;
the production job already targets it, so the gate takes effect with no
workflow change.

### Deploying by hand

Still supported, and still the way to apply an index *deletion*. From the
repo root, using the aliases in `.firebaserc`:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project staging
firebase deploy --only firestore:rules,firestore:indexes --project default
```

Composite indexes can take several minutes to build after deploying; a query
that needs one fails with `FAILED_PRECONDITION` until the build finishes —
a query that works locally against an already-built index can 500 on a fresh
project otherwise (#434).

## Deploy

From the repo root:

```bash
firebase deploy --only functions
```

To ship the frontend and the Hosting rewrite alongside it:

```bash
cd portal-app && npm run build && cd ..
firebase deploy --only hosting,functions
```

## Verification

First confirm the Admin credential works:

```bash
curl -s https://us-central1-curriculum-portal-1ce8f.cloudfunctions.net/payments/api/health
# {"status":"ok","firestore":"reachable"}   -> credentials are good
# {"status":"degraded",...}                 -> see CREDENTIALS.md
```

Then confirm the routes that used to live on the other backend are actually
being served by this one — a deploy that half-worked looks fine on `/api/health`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  https://us-central1-curriculum-portal-1ce8f.cloudfunctions.net/payments/api/units
# 200

curl -s -o /dev/null -w '%{http_code}\n' \
  https://us-central1-curriculum-portal-1ce8f.cloudfunctions.net/payments/api/user/me
# 401 - authenticated route, correctly rejecting an anonymous call
```

Then exercise a payment route end to end while logged in as `teacherDefault`
to confirm the deploy actually took (e.g. the upgrade flow hitting
`/api/subscription/initiate-upgrade`), and check that Stripe's webhook
deliveries are still landing — the Stripe dashboard's webhook log shows 2xx
responses for the endpoint.

## Running it locally

The deployed artifact is a Cloud Function, but `npm start` runs the same
Express app (`app.js`) on a plain port via `local.js` — which is what
`start.sh`, the Vite dev proxy and CI all expect:

```bash
cd functions
npm install
npm start          # http://localhost:3001
```

`npm run serve` runs it through the Functions emulator instead, which is worth
doing before a deploy to check the function wrapper itself.
