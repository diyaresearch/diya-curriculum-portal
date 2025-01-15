#!/bin/bash

# Function to stop all child processes
stop_processes() {
  echo "Stopping React application and Express server..."
  kill $(jobs -p)
}

# Trap SIGINT and SIGTERM to stop processes
trap stop_processes SIGINT SIGTERM

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