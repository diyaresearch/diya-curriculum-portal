#!/bin/bash

# Run from the repo root:
#   ./start.sh              real Firebase project (curriculum-portal-1ce8f)
#   ./start.sh --emulator   local Firebase emulator suite — no cloud credentials, no
#                           write access to production data (#428)

USE_EMULATOR=false
for arg in "$@"; do
  case "$arg" in
    --emulator) USE_EMULATOR=true ;;
  esac
done

# Function to stop all child processes
stop_processes() {
  echo "Stopping all processes..."
  kill $(jobs -p) 2>/dev/null
}

# Trap SIGINT and SIGTERM to stop processes
trap stop_processes SIGINT SIGTERM

if [ "$USE_EMULATOR" = true ]; then
  echo "Starting Firebase emulator suite (auth + firestore)..."
  npx --yes firebase-tools@14 emulators:start --only auth,firestore &
  # Give the emulators a moment to bind their ports before the app tries to
  # connect — cheap and avoids a flaky first request.
  sleep 5

  export FIRESTORE_EMULATOR_HOST="localhost:8080"
  export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
  export VITE_USE_FIREBASE_EMULATOR=true
  echo "Backend and frontend will connect to the local emulators, not the real Firebase project."
fi

# Navigate to the portal-app directory, install dependencies, and start the React application
cd portal-app
echo "Installing dependencies for React application..."
npm install
echo "Starting React application..."
npm start &

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
