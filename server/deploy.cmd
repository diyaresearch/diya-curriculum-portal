@echo off
echo Deploying Curriculum Portal Backend to Google App Engine...
echo.

REM Check if gcloud is installed
gcloud version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Google Cloud CLI is not installed or not in PATH
    echo Please install Google Cloud CLI from: https://cloud.google.com/sdk/docs/install
    echo Then run: gcloud auth login
    echo And: gcloud config set project curriculum-portal-1ce8f
    pause
    exit /b 1
)

REM Check if user is authenticated
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Not authenticated with Google Cloud
    echo Please run: gcloud auth login
    pause
    exit /b 1
)

REM Set the project
echo Setting project to curriculum-portal-1ce8f...
gcloud config set project curriculum-portal-1ce8f

REM Deploy to App Engine
echo Deploying to Google App Engine...
gcloud app deploy app.yaml --quiet

if %ERRORLEVEL% eq 0 (
    echo.
    echo ✅ Deployment successful!
    echo Your backend API is now available at: https://curriculum-portal-1ce8f.appspot.com
    echo.
    echo Test the API by visiting: https://curriculum-portal-1ce8f.appspot.com/api/subscription/test
) else (
    echo.
    echo ❌ Deployment failed!
    echo Please check the error messages above.
)

pause
