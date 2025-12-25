# ArgMed Deployment Script to Hostinger VPS (PowerShell)
# This script builds the project and deploys to argmed.online (89.117.32.202)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting ArgMed deployment process..." -ForegroundColor Cyan

# VPS Configuration
$VPS_USER = "root"  # Cambia esto según tu usuario SSH
$VPS_IP = "89.117.32.202"
$VPS_DOMAIN = "argmed.online"
$VPS_PATH = "/var/www/argmed.online"  # Cambia esto según tu configuración

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🔧 Building project for production..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Host "❌ Build failed! dist directory not found." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green

Write-Host "📤 Preparing to deploy to VPS..." -ForegroundColor Yellow
Write-Host "VPS: $VPS_DOMAIN ($VPS_IP)" -ForegroundColor Cyan

# Check if SSH/SCP is available (via WSL or Git Bash)
if (Get-Command scp -ErrorAction SilentlyContinue) {
    Write-Host "💾 Creating backup on VPS..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH} && tar -czf backup-`$(date +%Y%m%d-%H%M%S).tar.gz * 2>/dev/null || true"

    Write-Host "📤 Uploading files to VPS..." -ForegroundColor Yellow

    # Upload dist files
    scp -r dist/* "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"

    # Copy .htaccess
    Write-Host "📋 Copying .htaccess..." -ForegroundColor Yellow
    scp public/.htaccess "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"

    # Set permissions
    Write-Host "🔐 Setting permissions..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH} && chown -R www-data:www-data . && chmod -R 755 ."

    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Your application is live at: https://${VPS_DOMAIN}" -ForegroundColor Green
} else {
    Write-Host "❌ SSH/SCP not found!" -ForegroundColor Red
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host "  1. Git for Windows (includes Git Bash with SSH)" -ForegroundColor White
    Write-Host "  2. WSL (Windows Subsystem for Linux)" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Alternatively, you can:" -ForegroundColor Yellow
    Write-Host "  - Use FileZilla/WinSCP to manually upload the 'dist' folder" -ForegroundColor White
    Write-Host "  - Use FTP provided by Hostinger" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Build is ready in the 'dist' folder" -ForegroundColor Cyan

    # Open dist folder in Explorer
    Invoke-Item dist
}
