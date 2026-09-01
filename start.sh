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
  export REACT_APP_USE_FIREBASE_EMULATOR=true
  echo "Backend and frontend will connect to the local emulators, not the real Firebase project."
fi

# Navigate to the portal-app directory, install dependencies, and start the React application
cd portal-app
echo "Installing dependencies for React application..."
npm install
echo "Starting React application..."
npm start &

# Navigate to the server directory, install dependencies, and start the Express server
cd ../server
echo "Installing dependencies for Express server..."
npm install
npm install cors
echo "Starting Express server..."
npm start &

# Wait for all background jobs to finish
wait
