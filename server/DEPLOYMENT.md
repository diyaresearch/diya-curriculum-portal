# Backend Deployment Instructions

Deploys `server/` to Google App Engine, where it's live today at
`https://curriculum-portal-1ce8f.uc.r.appspot.com` (also reachable at the
`.appspot.com` form of the same URL).

## Prerequisites
1. **Install Google Cloud CLI**: https://cloud.google.com/sdk/docs/install
2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```
3. **Set the project**:
   ```bash
   gcloud config set project curriculum-portal-1ce8f
   ```
4. **Grant the App Engine service account Firestore access** (once per project):
   ```bash
   gcloud projects add-iam-policy-binding curriculum-portal-1ce8f \
     --member=serviceAccount:appengine-default@curriculum-portal-1ce8f.iam.gserviceaccount.com \
     --role=roles/datastore.user
   ```
   The deployed service authenticates as this account. Do **not** bundle a
   `serviceAccountKey.json`; `.gcloudignore` excludes it and the app refuses to
   read one on App Engine. See [CREDENTIALS.md](CREDENTIALS.md).

## Deploy Firestore Rules and Indexes

Rules and composite indexes live in source (`portal-app/firestore.rules`,
`portal-app/firestore.indexes.json`) but are **not** deployed by `gcloud app
deploy` — that only ships the App Engine backend. Deploy them explicitly,
from the repo root, before or alongside a backend deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project curriculum-portal-1ce8f
```

Composite indexes can take several minutes to build after deploying; a query
that needs one fails with `FAILED_PRECONDITION` until the build finishes.
Run this on every deploy that touches `firestore.indexes.json` or
`firestore.rules` — a query that works locally against an already-built
index can 500 on a fresh project otherwise (#434).

## Deploy

```bash
cd server
gcloud app deploy app.yaml --quiet
```

(The `deploy.cmd`/`deploy.ps1` wrapper scripts that used to sit next to this
file did nothing but this one command, wrapped in Windows-only batch/
PowerShell that couldn't run in CI — see #439. Removed; run the `gcloud`
command directly.)

## Verification

First confirm the Admin credential works:
```bash
curl -s https://curriculum-portal-1ce8f.uc.r.appspot.com/api/health
# {"status":"ok","firestore":"reachable"}   -> credentials are good
# {"status":"degraded",...}                 -> see CREDENTIALS.md
```

Then exercise a payment route end to end while logged in as `teacherDefault`
to confirm the deploy actually took (e.g. the upgrade flow hitting
`/api/subscription/initiate-upgrade`).
