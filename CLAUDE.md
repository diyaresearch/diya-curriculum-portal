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
   - Place your `serviceAccountKey.json` file in the `server/` directory
   - This file contains Firebase Admin SDK credentials
   - **NEVER** commit this file to version control

### Environment Variables Reference

**Frontend (.env.development/.env.production in portal-app/):**
- `REACT_APP_SERVER_ORIGIN_URL` - Backend server URL
- `REACT_APP_DATABASE_SCHEMA_QUALIFIER` - Database schema prefix
- `REACT_APP_HOME_PAGE` - Frontend application URL
- `REACT_APP_DIYA_BASE_URL` - DIYA research organization URL
- `REACT_APP_FIREBASE_*` - Firebase configuration keys
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_test_* or pk_live_*)

**Backend (.env.development/.env.production in server/):**
- `NODE_ENV` - Environment (development/production)
- `SERVER_ALLOW_ORIGIN` - CORS allowed origin
- `PORT` - Server port (default: 3001)
- `DATABASE_SCHEMA_QUALIFIER` - Schema prefix for multi-environment support
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_* or sk_live_*)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret
- `ENABLE_MOCK_FIREBASE` - Use mock Firebase for development (true/false)

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

The user roles (admin, teacherDefault, teacherPlus) are stored in Firebase Firestore collections as string
values in a role field within user documents.

Available Roles:
- admin - Administrative access
- teacherDefault - Basic teacher role (default)
- teacherPlus - Premium teacher role (subscription-based)
- teacherEnterprise - Enterprise teacher role

Schema Relationships

The backend uses a hybrid collection structure with both legacy and unified collections:

Legacy Collections (for backwards compatibility):

- teachers - Historical teacher user data
- students - Historical student user data

Unified Collections:

- {SCHEMA_QUALIFIER}users - Main unified user table (modern approach)
- {SCHEMA_QUALIFIER}payment_logs - Payment transaction logs
- {SCHEMA_QUALIFIER}subscriptions - Subscription management

User Lookup Pattern:

The system follows a hierarchical lookup pattern in server/routes/user.js:16-30:
1. First checks teachers collection
2. Then checks students collection
3. Finally checks unified users collection

Role Assignment Logic:

- Default registration: Users get teacherDefault role (server/routes/user.js:75)
- Subscription upgrades: Premium plans assign teacherPlus role (server/routes/payment.js:191)
- Cancellations: Reset to teacherDefault role (server/routes/subscription.js:397)

Schema Environment:

- SCHEMA_QUALIFIER is defined by DATABASE_SCHEMA_QUALIFIER environment variable
- Allows multiple database environments (dev/staging/prod) with prefixed table names

Admin Functions:

- Admin role verification: server/routes/user.js:160,186
- Admin-only endpoints for user management and role updates
- Admin logs accessible via /admin/logs endpoint

The system maintains backward compatibility with legacy teachers/students collections while transitioning to a unified users collection architecture.
- User routes: server/routes/user.js (mounted at /api/user)
- User registration: POST /api/user/register

Authentication Integration

- Uses Firebase Admin SDK for Firestore operations
- Requires authenticateUser middleware for protected routes
- JWT token verification handled by middleware

Database Schema

- SCHEMA_QUALIFIER: Environment-based table prefix for multi-environment support
- Primary collection: {SCHEMA_QUALIFIER}users (unified modern approach)
- Legacy collections: teachers, students (forbackward compatibility)


Multi-Collection Compatibility

The /me endpoint demonstrates the transition strategy:
- Legacy support: Checks old teachers/students collections
- Modern approach: Falls back to unified users collection
- Ensures no user data is lost during migration

Role-Based Access Control

- teacherDefault: Basic access (default for new users)
- teacherPlus: Premium features (subscription-based)
- admin: Full system access and user management
- teacherEnterprise: Enterprise-level access

Security Considerations

- All routes except GET /:userId require authentication
- Admin functions double-check role permissions
- Uses Firebase UID as document keys for security
- Server-side timestamps prevent client manipulation

This file serves as the user identity and permission management layer, handling the complete user
lifecycle from registration to role management.

## How do I login as admin in the portal

Based on the codebase analysis, there is no  traditional admin login interface in the portal. The admin role is assigned at the database level, not through a separate login process.

