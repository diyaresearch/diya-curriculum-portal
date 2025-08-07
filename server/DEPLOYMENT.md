# Backend Deployment Instructions

## Current Issue
The payment page is returning a 404 error for the `/api/subscription/initiate-upgrade` endpoint because the backend server is not deployed to production. The frontend is hosted at https://curriculum-portal-1ce8f.web.app but trying to access a backend API that doesn't exist in production.

## Solution: Deploy Backend to Google App Engine

### Prerequisites
1. **Install Google Cloud CLI**: https://cloud.google.com/sdk/docs/install
2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```
3. **Set the project**:
   ```bash
   gcloud config set project curriculum-portal-1ce8f
   ```

### Deployment Steps

#### Option 1: Use the deployment scripts
Run one of these scripts from the server directory:

**For Command Prompt:**
```cmd
deploy.cmd
```

**For PowerShell:**
```powershell
.\deploy.ps1
```

#### Option 2: Manual deployment
```bash
cd server
gcloud app deploy app.yaml --quiet
```

### After Deployment
Once deployed, your backend API will be available at:
- **Base URL**: https://curriculum-portal-1ce8f.appspot.com
- **Test endpoint**: https://curriculum-portal-1ce8f.appspot.com/api/subscription/test

### Frontend Configuration
The frontend needs to be configured to use the production API URL:
- **Development**: http://localhost:3001/api
- **Production**: https://curriculum-portal-1ce8f.appspot.com/api

### Environment Variables
The production environment includes:
- `NODE_ENV=production`
- Database schema qualifier: `prod.`
- CORS allowed origins: production frontend URL

### Verification
After deployment, test the payment functionality:
1. Visit the payment page while logged in as teacherDefault
2. The `/api/subscription/initiate-upgrade` endpoint should work
3. No more 404 errors

## Current Status
✅ Backend code is complete and working locally  
❌ Backend is not deployed to production  
❌ Frontend cannot access API in production  

## Next Steps
1. Deploy the backend using the instructions above
2. Test the payment functionality
3. Frontend should automatically work with the deployed backend
