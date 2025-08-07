Write-Host "Deploying Curriculum Portal Backend to Google App Engine..." -ForegroundColor Green
Write-Host ""

# Check if gcloud is installed
try {
    gcloud version | Out-Null
} catch {
    Write-Host "ERROR: Google Cloud CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Google Cloud CLI from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Then run: gcloud auth login" -ForegroundColor Yellow
    Write-Host "And: gcloud config set project curriculum-portal-1ce8f" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if user is authenticated
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $account) {
        throw "Not authenticated"
    }
} catch {
    Write-Host "ERROR: Not authenticated with Google Cloud" -ForegroundColor Red
    Write-Host "Please run: gcloud auth login" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Set the project
Write-Host "Setting project to curriculum-portal-1ce8f..." -ForegroundColor Blue
gcloud config set project curriculum-portal-1ce8f

# Deploy to App Engine
Write-Host "Deploying to Google App Engine..." -ForegroundColor Blue
gcloud app deploy app.yaml --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "Your backend API is now available at: https://curriculum-portal-1ce8f.appspot.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Test the API by visiting: https://curriculum-portal-1ce8f.appspot.com/api/subscription/test" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
