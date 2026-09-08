#!/usr/bin/env bash
#
# One-time setup for the automated Firestore rules/indexes deploy (#428).
#
# .github/workflows/deploy-firestore-config.yml deploys firestore.rules and
# firestore.indexes.json to staging and production on every push to main that
# touches them — but only once it can authenticate. Until then it runs, warns,
# and no-ops. This script is what flips it on.
#
# It sets up Workload Identity Federation: GitHub mints a short-lived OIDC
# token, GCP exchanges it for an access token. No service-account JSON key is
# created, downloaded, or stored anywhere — which is the point (#426 is an
# open P0 about purging exactly that kind of key from this project).
#
# Requires: gcloud authenticated as a user with Owner (or Project IAM Admin +
# Service Account Admin) on BOTH projects, the gh CLI authenticated with admin
# on the repo, and Editor on the repo's Actions variables.
#
#   ./scripts/setup-ci-firestore-deploy.sh
#
# Safe to re-run: every create is guarded by an existence check, and every
# IAM grant is additive (add-iam-policy-binding, never set-iam-policy), so
# running it twice changes nothing the second time.

set -euo pipefail

PROD_PROJECT="curriculum-portal-1ce8f"
STAGING_PROJECT="curriculum-portal-staging"
REPO="diyaresearch/diya-curriculum-portal"

POOL="github"
PROVIDER="github"
SA_NAME="firestore-config-deployer"

# Only what a rules+indexes deploy actually needs. Not Editor, not Owner.
DEPLOY_ROLES=("roles/firebaserules.admin" "roles/datastore.indexAdmin")

info() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

for cmd in gcloud gh; do
  command -v "$cmd" >/dev/null || { echo "error: $cmd is not installed" >&2; exit 1; }
done

gcloud auth print-access-token >/dev/null 2>&1 || {
  echo "error: gcloud is not authenticated. Run: gcloud auth login" >&2; exit 1;
}

PROD_NUMBER="$(gcloud projects describe "$PROD_PROJECT" --format='value(projectNumber)')"
echo "Production project number: $PROD_NUMBER"

info "Enabling required APIs"
# sts + iamcredentials are what the OIDC exchange and the impersonation call
# go through; without them the auth step fails with a bare 403.
gcloud services enable iam.googleapis.com sts.googleapis.com iamcredentials.googleapis.com \
  --project="$PROD_PROJECT"
gcloud services enable iam.googleapis.com sts.googleapis.com iamcredentials.googleapis.com \
  --project="$STAGING_PROJECT"

info "Creating the workload identity pool and provider (in $PROD_PROJECT)"
# The pool lives in one project; service accounts in either project can trust
# it, so there is no need for a second pool in staging.
if ! gcloud iam workload-identity-pools describe "$POOL" \
      --project="$PROD_PROJECT" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" \
    --project="$PROD_PROJECT" --location=global \
    --display-name="GitHub Actions"
else
  echo "pool '$POOL' already exists, skipping"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" \
      --project="$PROD_PROJECT" --location=global \
      --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  # The attribute-condition is the security boundary. Without it, ANY GitHub
  # repository in the world could mint tokens against this pool.
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --project="$PROD_PROJECT" --location=global \
    --workload-identity-pool="$POOL" \
    --display-name="GitHub Actions OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '${REPO}'"
else
  echo "provider '$PROVIDER' already exists, skipping"
fi

PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROD_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"

setup_service_account() {
  local project="$1"
  local sa="${SA_NAME}@${project}.iam.gserviceaccount.com"

  info "Service account for $project"
  if ! gcloud iam service-accounts describe "$sa" --project="$project" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$SA_NAME" \
      --project="$project" \
      --display-name="CI Firestore config deploy"
    # Creation is eventually consistent; the IAM grants below can 404 without
    # a moment's pause.
    sleep 10
  else
    echo "service account already exists, skipping create"
  fi

  for role in "${DEPLOY_ROLES[@]}"; do
    echo "granting $role on $project"
    gcloud projects add-iam-policy-binding "$project" \
      --member="serviceAccount:${sa}" \
      --role="$role" \
      --condition=None \
      --quiet >/dev/null
  done

  # Let the pool impersonate this account, but only for workflows running in
  # this repository.
  echo "allowing $REPO to impersonate $sa"
  gcloud iam service-accounts add-iam-policy-binding "$sa" \
    --project="$project" \
    --role="roles/iam.workloadIdentityUser" \
    --member="$PRINCIPAL" \
    --quiet >/dev/null
}

setup_service_account "$PROD_PROJECT"
setup_service_account "$STAGING_PROJECT"

info "Setting the repository variables on $REPO"
# Variables, not secrets: a provider resource name and two service-account
# emails are public identifiers. The trust lives in the IAM bindings above,
# not in keeping these strings hidden.
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$REPO" \
  --body "projects/${PROD_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
gh variable set GCP_DEPLOY_SA_PRODUCTION --repo "$REPO" \
  --body "${SA_NAME}@${PROD_PROJECT}.iam.gserviceaccount.com"
gh variable set GCP_DEPLOY_SA_STAGING --repo "$REPO" \
  --body "${SA_NAME}@${STAGING_PROJECT}.iam.gserviceaccount.com"

info "Done"
cat <<EOF
Verify it end to end without waiting for a rules change:

  gh workflow run "Deploy Firestore config" --ref main -f target=staging
  gh run watch \$(gh run list --workflow "Deploy Firestore config" --limit 1 --json databaseId --jq '.[0].databaseId')

A green run whose "Deploy rules and indexes to staging" step is no longer
skipped means #428's last acceptance criterion is met. Then run it again with
-f target=production.
EOF
