#!/bin/bash

# Run from the repo root:
#   ./start.sh              production project (curriculum-portal-1ce8f)
#   ./start.sh --staging    curriculum-portal-staging (#428)
#   ./start.sh --emulator   local Firebase emulator suite — no cloud credentials, no
#                           write access to production data (#428)
#
# Whichever you pick, this script points BOTH halves at it. That is the whole
# reason to use it rather than starting the two `npm start`s by hand: the
# frontend reads its project from portal-app/.env*, the backend reads its own
# from functions/.env.${NODE_ENV}, and nothing links the two files. Setting one
# and forgetting the other is silent — the browser writes to one project while
# the API reads another, and the only symptom is a 401 from verifyIdToken,
# which rejects a token minted by one project when the Admin SDK is configured
# for a different one. Sign-up itself still looks fine, because it is a direct
# client-side setDoc that never reaches the backend.
#
# portal-app/src/utils/verifyBackendProject.ts checks the two agree at boot and
# says so in the console if they don't.

USE_EMULATOR=false
USE_STAGING=false
for arg in "$@"; do
  case "$arg" in
    --emulator) USE_EMULATOR=true ;;
    --staging) USE_STAGING=true ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: ./start.sh [--staging | --emulator]" >&2
      exit 1
      ;;
  esac
done

if [ "$USE_EMULATOR" = true ] && [ "$USE_STAGING" = true ]; then
  echo "--staging and --emulator are mutually exclusive: pick one target." >&2
  exit 1
fi

# The project ID the emulator suite runs under. A `demo-` prefix is Firebase's
# reserved convention for a project that does not exist: the emulators accept
# it without credentials and refuse to reach any real cloud resource with it,
# so an emulator run cannot touch production even if a credential is lying
# around. Both halves are pinned to this same value below — under the emulator
# a project ID is still a data namespace, so two different IDs would mean the
# frontend and backend writing into the same emulator but never seeing each
# other's documents.
EMULATOR_PROJECT="demo-diya-portal"

# Vite mode for the frontend. `vite --mode staging` loads portal-app/.env then
# .env.staging, and does NOT load .env.development — so .env.staging has to
# carry VITE_SERVER_ORIGIN_URL and the Stripe key too, not just the six
# VITE_FIREBASE_* values. See portal-app/.env.example.
VITE_MODE=""

# Function to stop all child processes
stop_processes() {
  echo "Stopping all processes..."
  kill $(jobs -p) 2>/dev/null
}

# Trap SIGINT and SIGTERM to stop processes
trap stop_processes SIGINT SIGTERM

if [ "$USE_EMULATOR" = true ]; then
  echo "Starting Firebase emulator suite (auth + firestore) as $EMULATOR_PROJECT..."
  npx --yes firebase-tools@14 emulators:start --only auth,firestore --project "$EMULATOR_PROJECT" &
  # Give the emulators a moment to bind their ports before the app tries to
  # connect — cheap and avoids a flaky first request.
  sleep 5

  # Backend: FIRESTORE_EMULATOR_HOST is the highest-precedence branch in
  # functions/config/credentials.js, so this wins over any real ADC login.
  export FIRESTORE_EMULATOR_HOST="localhost:8080"
  export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
  export FIREBASE_PROJECT_ID="$EMULATOR_PROJECT"

  # Frontend: Vite exposes VITE_-prefixed variables from the environment, and
  # they take precedence over the .env files — which is how the emulator flag
  # has always been passed, and is what lets the project ID be pinned here
  # without editing a gitignored file.
  export VITE_USE_FIREBASE_EMULATOR=true
  export VITE_FIREBASE_PROJECT_ID="$EMULATOR_PROJECT"

  echo "Both halves target the local emulators as $EMULATOR_PROJECT — not a real Firebase project."

elif [ "$USE_STAGING" = true ]; then
  # Backend: local.js loads .env.${NODE_ENV}, so this selects
  # functions/.env.staging (FIREBASE_PROJECT_ID=curriculum-portal-staging).
  export NODE_ENV=staging
  VITE_MODE="staging"

  # Both files are gitignored (.gitignore excludes every .env* but
  # .env.example), so each machine creates them once. Fail here rather than
  # let the run start half-configured: with .env.staging missing, Vite would
  # quietly fall back to .env alone — which is production — and that silent
  # fallback is the exact failure this flag exists to prevent.
  missing=false
  if [ ! -f functions/.env.staging ]; then
    echo "Missing functions/.env.staging — see the README's \"Staging project\" section." >&2
    missing=true
  fi
  if [ ! -f portal-app/.env.staging ]; then
    echo "Missing portal-app/.env.staging — copy portal-app/.env.example and fill in the" >&2
    echo "curriculum-portal-staging web app config (Firebase Console -> Project Settings)." >&2
    missing=true
  fi
  if [ "$missing" = true ]; then
    exit 1
  fi

  echo "Both halves target curriculum-portal-staging."

else
  # .env.development.local is the pre-#428 way of pointing the frontend at
  # staging, and it is precisely the thing that breaks this script's promise:
  # Vite merges it on top of .env for the default `development` mode, so the
  # browser silently lands on whatever project it names while the backend —
  # which never reads it — stays on production. --staging replaces it. Refuse
  # rather than print "both halves target production" and be wrong about it.
  if [ -f portal-app/.env.development.local ] \
     && grep -qE '^[[:space:]]*VITE_FIREBASE_PROJECT_ID=' portal-app/.env.development.local; then
    overridden=$(grep -E '^[[:space:]]*VITE_FIREBASE_PROJECT_ID=' portal-app/.env.development.local | tail -1 | cut -d= -f2-)
    echo "portal-app/.env.development.local overrides the frontend project to ${overridden}," >&2
    echo "but the backend would start on production — the exact mismatch ./start.sh exists to" >&2
    echo "prevent. Delete that file and use ./start.sh --staging instead; its values now live" >&2
    echo "in portal-app/.env.staging." >&2
    exit 1
  fi

  echo "Both halves target the PRODUCTION project (curriculum-portal-1ce8f)."
  echo "Use --staging or --emulator to keep test data out of it."
fi

# Navigate to the portal-app directory, install dependencies, and start the React application
cd portal-app
echo "Installing dependencies for React application..."
npm install
echo "Starting React application..."
if [ -n "$VITE_MODE" ]; then
  npm start -- --mode "$VITE_MODE" &
else
  npm start &
fi

# Navigate to the API directory, install dependencies, and start it.
#
# functions/ is the whole backend since #439 - it deploys as a Cloud Function
# but `npm start` runs local.js, the same Express app on a plain port, which is
# what the Vite dev proxy expects. Payments are served by this too now; they
# used to need the Functions emulator running separately.
cd ../functions
echo "Installing dependencies for the API..."
npm install
echo "Starting the API..."
npm start &

# Wait for all background jobs to finish
wait
