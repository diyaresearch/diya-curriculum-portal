# DIYA Curriculum Portal

A full-stack curriculum portal built with React, Express, and Firebase. This project provides a platform for managing and viewing educational materials.

## Version
1.0

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)

## Introduction

DIYA Curriculum Portal is a platform served for the educators and content creators. Content creators can upload educational materials and manage them easily in the portal, while educators can generate lesson plans based on the existing contents. The platform leverages React for the frontend, Express for the backend API, and Firebase for authentication and data storage.

## Features

- User Authentication (Firebase)
- Educational Contents Management (Create, Read, Update, Delete)
- User Roles (Admin, Consumer, Producer)
- Responsive Design
- Real-time Updates

## Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Express.js
- **Database:** Firebase Firestore, Firebase Storage
- **Authentication:** Firebase Auth
- **Other Tools:**
  - Node.js
  - npm

## Installation

### Prerequisites

Ensure you have the following installed on your local development machine:

- **Node.js**: You can download and install Node.js from the [official Node.js website](https://nodejs.org/). Choose the version that best suits your development environment (LTS is recommended for most users).
- **npm or yarn**:

  - **npm** is included with Node.js, so it will be installed automatically when you install Node.js.
  - **yarn** can be installed globally after installing Node.js using the following command:

  ```bash
  npm install -g yarn
  ```

  For more details, you can refer to the [npm documentation](https://docs.npmjs.com/) or the [Yarn documentation](https://yarnpkg.com/getting-started)

### Clone the Repository

It is a private repository, make sure you have the access to it.

```bash
git clone https://github.com/diyaresearch/diya-curriculum-portal.git
```

### Install Dependencies

For the frontend:

```bash
cd portal-app
npm install
# or
yarn install
```

For the backend:

```bash
cd server
npm install
# or
yarn install
```

## Usage

### Environment variables

Both tiers use `.env.example` as the template — copy it, don't write files from
scratch: `cp portal-app/.env.example portal-app/.env.development` and
`cp server/.env.example server/.env.development` (swap `.production` as needed).

#### Naming convention

- **Frontend (`portal-app/`):** every variable is prefixed `REACT_APP_`. This
  isn't a style choice — Create React App only inlines variables with that
  prefix into the client bundle; anything else is invisible to the app.
- **Backend (`server/`):** no prefix. Node reads `process.env` directly, so
  none is needed.

Where a value must agree across tiers (`DATABASE_SCHEMA_QUALIFIER` /
`REACT_APP_DATABASE_SCHEMA_QUALIFIER`), the name matches once the prefix is
accounted for.

#### File precedence

The two tiers load env files differently — knowing which one wins matters when
a value looks wrong:

- **Backend:** `server/index.js` calls `dotenv.config({ path: `.env.${NODE_ENV}` })`.
  Exactly one file loads, selected by `NODE_ENV` (`development` / `production` /
  `test`) — there is no base `server/.env` and no merging between files.
- **Frontend:** Create React App loads several files and merges them, most
  specific wins:
  `.env.development.local` / `.env.production.local` → `.env.local` (skipped
  for `test`) → `.env.development` / `.env.production` → `.env`. In this repo,
  `portal-app/.env` holds the Firebase project keys shared by every tier;
  `.env.development` / `.env.production` hold the values that differ per tier
  (server URL, schema qualifier, home page). A real shell environment variable
  overrides all of these files.

#### Frontend Configuration

Create a `.env.development` or `.env.production` file in the `portal-app` folder and add the Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_SERVER_ORIGIN_URL=http://localhost:3001
REACT_APP_DATABASE_SCHEMA_QUALIFIER=""
REACT_APP_HOME_PAGE=http://localhost:3000
```

#### Backend Configuration

Create a `.env.development` or `.env.production` file in the `server` folder with the following required variables:

```env
NODE_ENV=development
PORT=3001
SERVER_ALLOW_ORIGIN=http://localhost:3000
DATABASE_SCHEMA_QUALIFIER=
FIREBASE_PROJECT_ID=curriculum-portal-1ce8f
ENABLE_MOCK_FIREBASE=false
```

**Important Notes:**
- `FIREBASE_PROJECT_ID` must be the real project ID (`curriculum-portal-1ce8f`); placeholder values are ignored
- `DATABASE_SCHEMA_QUALIFIER` prefixes Firestore collection names and **must match** its
  frontend counterpart for the same tier (#427): empty for development, `prod.` for
  production. An empty value is intentional for development, not a placeholder to fill in.
- Set `ENABLE_MOCK_FIREBASE=true` to use mock Firebase for development/testing without real credentials
- For production, also include `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### Firebase Admin credentials

Do **not** download a service account key. Authenticate with Application Default
Credentials instead:

```bash
gcloud auth application-default login --project curriculum-portal-1ce8f
```

On startup the server prints which credential it picked and whether Firestore is
actually reachable. You can also check it any time:

```bash
curl -s http://localhost:3001/api/health
```

Downloaded JSON keys are what took the API down in issue #418: they never expire
visibly, and revoking one breaks every environment at once. Full details,
including the production setup and how to diagnose credential failures, are in
[server/CREDENTIALS.md](server/CREDENTIALS.md).

### Start the application

To start the application, you can run the start script we provide.

Make sure you give the access to the script:

```sh
chmod +x start.sh
```

Run the script:

```sh
./start.sh
```

The application will be available at the following URL:

```
http://localhost:3000
```

Make sure that port 3000 and 3001 are available and not being used by other services.

Or you can start the frontend and backend separately.

#### Local dev without touching production data

By default, dev and production are two collection prefixes in the **same**
Firebase project (`curriculum-portal-1ce8f`) — see [Environment
variables](#environment-variables) above. `./start.sh --emulator` instead
runs the Firebase emulator suite (Firestore + Auth) locally and points both
the frontend and backend at it:

```sh
./start.sh --emulator
```

No `gcloud auth application-default login`, no real Firebase project, and
nothing you do locally can reach production data. Requires Java (the
emulator runs on the JVM) and network access on first run to fetch
`firebase-tools` via `npx`. The emulator UI is at
[http://localhost:4000](http://localhost:4000). Data lives only in the
running emulator process and resets when it stops.

To opt in when running the frontend or backend individually instead of via
`start.sh`, run the emulator suite yourself
(`npx firebase-tools emulators:start --only auth,firestore`) and set:
- Backend: `FIRESTORE_EMULATOR_HOST=localhost:8080` and
  `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` (the Admin SDK picks these up
  automatically — no code change, no credentials needed)
- Frontend: `REACT_APP_USE_FIREBASE_EMULATOR=true` in a gitignored
  `portal-app/.env.development.local`

#### Staging project (#428)

A real second Firebase project, **`curriculum-portal-staging`**, exists for
work that the emulator can't cover (data that needs to persist between runs,
or a second person hitting the same backend). It mirrors production's
Firestore setup (Native mode, `nam5`) and Auth setup (Email/Password only,
nothing else enabled) but is on the free Spark plan — no Cloud Functions, so
the Stripe webhook-dependent payment routes aren't exercised there yet.

- **Backend:** create `server/.env.staging` (`FIREBASE_PROJECT_ID=curriculum-portal-staging`,
  `DATABASE_SCHEMA_QUALIFIER=` — unprefixed, same as development, since staging
  is a wholly separate project) and run `NODE_ENV=staging npm start`. Credentials
  come from the same `gcloud auth application-default login` account as
  production — no new key file — as long as that account has access to the
  staging project too.
- **Frontend:** CRA hardcodes `NODE_ENV=development` for `npm start`, so there's
  no `.env.staging` for the frontend the way there is for the backend. Instead,
  override the six `REACT_APP_FIREBASE_*` keys in `portal-app/.env.development.local`
  (gitignored) with the staging project's web app config, from Firebase Console →
  Project Settings → curriculum-portal-staging → Your apps.
- `firebase use staging` (via the `staging` alias in `.firebaserc`) targets this
  project for `firebase deploy`/`firebase firestore:indexes` etc.

This is one slice of the larger #428 epic — a new staging project exists, but
`DATABASE_SCHEMA_QUALIFIER` is still how dev/prod separate within the shared
production project, and `teachers`/`students` are not yet merged into `users`.

#### Running the Backend

Navigate to the server directory and start the backend server:

```bash
cd server
npm start
# or
yarn start
```

#### Running the Frontend

Navigate to the portal-app directory and start the React app:

```bash
cd portal-app
npm start
# or
yarn start
```

## Checking Deployment Version and Viewing Logs

### Checking Deployment Version

To verify the currently deployed version of your application in Google Cloud:

1. Log in to Google Cloud Console. Make sure you are in the curriculun-portal project.

2. Navigate to App Engine: Search App Engine, and then go to Versions from the left-hand navigation menu.

3. View Current Deployment: The table will display a list of all deployed versions, with the active version marked under the Traffic column. The active version is the one currently serving traffic. 

### Viewing Logs

#### View Logs from Google Cloud Console

1. Log in to Google Cloud Console. Make sure you are in the curriculun-portal project.

2. Navigate to Logs Explorer: Search Logs Explorer then you can see the logs.

3. Filter Logs:
Use the filters to narrow down the logs:
Resource Type: Select App Engine or the relevant resource.
Version: Filter logs for a specific deployment version.
Use the search bar to enter specific keywords or request IDs for deeper analysis.

4. View Logs:
Click on a log entry to view detailed information, including stack traces, payloads, and timestamps.

5. Optional: Export Logs:
Use the export functionality to save logs for further analysis or integration with third-party tools.

#### View Logs Using Google Cloud SDK

1. Open the terminal or Google Cloud SDK Shell.

2. To view logs for App Engine, use the following command:
```bash
gcloud app logs read
```

3. To filter logs by severity (e.g., errors or warnings):
```bash
gcloud app logs read --severity=ERROR
```

4. To view logs for a specific version:
```bash
gcloud app logs read --version=<VERSION_ID>
```
Replace <VERSION_ID> with the version name from your deployment.

5. To stream logs in real-time:
```bash
gcloud app logs tail
```