# DIYA Curriculum Portal

A full-stack curriculum portal built with React, Express, and Firebase. This project provides a platform for managing and viewing educational materials.

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

### Firebase Configuration

Create a .env file in the root of the portal-app folder and add the Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### Service Account Key

1. In the Firebase Console, go to the Project Settings.
2. Navigate to the "Service accounts" tab.
3. Click "Generate new private key" and download the serviceAccountKey.json file.
4. Place the serviceAccountKey.json file in the server directory.

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
