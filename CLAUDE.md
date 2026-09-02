# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIYA Curriculum Portal is a full-stack educational platform built with React frontend, Express.js backend, and Firebase for authentication and data storage. The platform serves educators and content creators, allowing content creators to upload educational materials and educators to generate lesson plans.

## Architecture

### Repository Structure
- `portal-app/` - React frontend application (port 3000)
- `server/` - Express.js backend API (port 3001)
- `start.sh` - Script to start both frontend and backend concurrently

### Frontend (portal-app/)
- **Framework**: React 18 with Create React App
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: React hooks, Firebase context
- **Key Dependencies**: Firebase SDK, React Quill, jsPDF, React Modal

### Backend (server/)
- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK
- **File Storage**: Firebase Storage, Google Cloud Storage
- **Key Dependencies**: Firebase Admin, Multer, PDFKit, CORS

### Firebase Integration
- **Authentication**: Firebase Auth for user management
- **Database**: Firestore for content, lessons, modules, and user data
- **Storage**: Firebase Storage for file uploads
- **Configuration**: Environment variables for Firebase config

## Development Commands

### Quick Start
```bash
# Start both frontend and backend
chmod +x start.sh
./start.sh
```

### Frontend (portal-app/)
```bash
cd portal-app
npm install
npm start           # Development server (http://localhost:3000)
npm run build       # Production build
npm test            # Run tests
```

### Backend (server/)
```bash
cd server
npm install
npm start           # Start server (http://localhost:3001)
```

## Key Components and Routes

### Frontend Routes
- `/` - Home page with module exploration
- `/upload-content` - Content upload for producers
- `/lesson-generator` - AI lesson plan generation
- `/modules/:moduleId` - Module detail view
- `/lesson/:lessonId` - Lesson detail view
- `/user-profile` - User profile management
- `/nugget-builder` - Content nugget creation tool
- `/upgrade` - Subscription upgrade page

### Backend API Routes
- `/api/units` - Content management endpoints
- `/api/lessons` - Lesson CRUD operations
- `/api/modules` - Module management
- `/api/user` - User profile and authentication

### Key Components
- `Layout.jsx` - Main layout wrapper with navigation
- `Navbar.jsx` - Navigation component
- `Module.jsx` - Module display component
- `LessonDetail.jsx` - Lesson viewing component
- `ExploreModulesSection.jsx` - Module exploration interface

## Environment Configuration

⚠️ **IMPORTANT**: Never commit `.env` files or `serviceAccountKey.json` to version control!

### Setup Instructions

1. **Frontend Environment Setup**:
   ```bash
   cd portal-app
   cp .env.example .env.development
   # Edit .env.development with your actual values
   ```

2. **Backend Environment Setup**:
   ```bash
   cd server
   cp .env.example .env.development
   # Edit .env.development with your actual values
   ```

3. **Firebase Service Account**:
   - Authenticate with `gcloud auth application-default login` (do not download a service account key — see server/CREDENTIALS.md)
   - This file contains Firebase Admin SDK credentials
   - **NEVER** commit this file to version control

### Environment Variables Reference

**Frontend (.env.development/.env.production in portal-app/):**
- `REACT_APP_SERVER_ORIGIN_URL` - Backend server URL
- `REACT_APP_HOME_PAGE` - Frontend application URL
- `REACT_APP_DIYA_BASE_URL` - DIYA research organization URL
- `REACT_APP_FIREBASE_*` - Firebase configuration keys
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_test_* or pk_live_*)

**Backend (.env.development/.env.production in server/):**
- `NODE_ENV` - Environment (development/production)
- `SERVER_ALLOW_ORIGIN` - CORS allowed origin
- `PORT` - Server port (default: 3001)
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_* or sk_live_*)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret
- `ENABLE_MOCK_FIREBASE` - Use mock Firebase for development (true/false)

Dev, staging, and production are separate Firebase projects (see the README's
"Staging project" section) rather than a shared project split by a collection
prefix — that scheme (`DATABASE_SCHEMA_QUALIFIER`) was retired in #428.

### Security Notes
- See `SECURITY.md` for security best practices
- All sensitive data should be in gitignored `.env` files
- Use `.env.example` files as templates with placeholder values
- Different keys should be used for development vs production environments

## User Roles and Features

### Content Creators (Producers)
- Upload educational content
- Manage uploaded materials
- Create content nuggets

### Educators (Consumers)
- Browse and explore modules
- Generate lesson plans from content
- Save and manage lesson plans
- Access detailed lesson views

### System Features
- Firebase Authentication
- Real-time content updates
- PDF generation for lessons
- File upload and storage
- Responsive design

## Development Notes

- The application uses Firebase for all data persistence
- CORS is configured to allow frontend-backend communication
- The start script handles dependency installation automatically
- Both frontend and backend must be running for full functionality
- Ports 3000 and 3001 must be available

## Testing

Frontend testing uses Jest and React Testing Library (standard Create React App setup). No specific test scripts are configured for the backend.

## Code Documentation

## User Roles Storage

The user roles are stored in a single Firebase Firestore `users` collection, as a string
value in a `role` field within each user document. `teachers` and `students` used to be
separate collections, looked up ahead of `users` (see git history around #427/#431), with a
`DATABASE_SCHEMA_QUALIFIER` prefix layering dev/prod into one shared Firebase project on top
of that. Both were retired in #428: dev/staging and production are now separate Firebase
projects, and every account lives in one unprefixed `users` collection.

Available Roles:
- admin - Administrative access
- teacherPlus - Premium teacher role (subscription-based); intended to also scope content
  access to what that teacher created, once that's built (not yet implemented)
- teacherDefault - Basic teacher role (default); intended to read content marked for
  teachers, once that's built (not yet implemented)
- studentDefault - Student role (default for student self-signup); intended to read content
  marked for students, once that's built (not yet implemented)

User Lookup Pattern:

server/routes/user.js's `/me` handler reads the caller's own document directly from
`users` via `databaseService.getUserDocument` — no fallback chain.

Role Assignment Logic:

- Default registration (teacher path, via POST /api/user/register): teacherDefault
  (server/routes/user.js)
- Default registration (student path, client-side signup): studentDefault
  (portal-app/src/pages/sign_up/index.jsx)
- Subscription upgrades: Premium plans assign teacherPlus role (server/routes/payment.js)
- Cancellations: Reset to teacherDefault role (server/routes/subscription.js)

Admin Functions:

- Admin role verification: server/utils/ownership.js (`isAdminUser`)
- Admin-only endpoints for user management and role updates (PUT /api/user/updateRole)
- Custom claims mirror the role into the ID token as a fast path (server/utils/customClaims.js)

Authentication Integration

- Uses Firebase Admin SDK for Firestore operations
- Requires authenticateUser middleware for protected routes
- JWT token verification handled by middleware

Database Schema

- One collection: `users`. No prefix — see the README's "Staging project" section for how
  environments are separated instead.

Security Considerations

- All routes except GET /:userId require authentication
- Admin functions double-check role permissions
- Uses Firebase UID as document keys for security
- Server-side timestamps prevent client manipulation

This file serves as the user identity and permission management layer, handling the complete user
lifecycle from registration to role management.

## How do I login as admin in the portal

Based on the codebase analysis, there is no  traditional admin login interface in the portal. The admin role is assigned at the database level, not through a separate login process.

