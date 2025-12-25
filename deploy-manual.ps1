# ArgMed Manual Deployment Script
# Este script sube el build local al VPS usando SCP con contraseña

$VPS_IP = "89.117.32.202"
$VPS_USER = "root"
$VPS_PATH = "/var/www/argmed.online"
$VPS_DOMAIN = "argmed.online"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ArgMed - Deploy Manual a Produccion" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el build existe
if (-not (Test-Path "dist")) {
    Write-Host "ERROR: No se encontro la carpeta dist/" -ForegroundColor Red
    Write-Host "Ejecuta primero: npm run build:prod" -ForegroundColor Yellow
    exit 1
}

Write-Host "Build encontrado en dist/" -ForegroundColor Green
Write-Host ""

# Verificar que el build tiene la configuracion correcta
Write-Host "Verificando configuracion de Supabase en el build..." -ForegroundColor Yellow
$files = Get-ChildItem -Path "dist/assets" -Filter "*.js"
$foundNew = $false
$foundOld = $false

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "msnppinpethxfxskfgsv") {
        $foundNew = $true
    }
    if ($content -match "bfhtmtnazzwthragaqfl") {
        $foundOld = $true
    }
}

if ($foundNew) {
    Write-Host "OK: Build contiene proyecto nuevo de Supabase" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: No se encontro el proyecto nuevo en el build" -ForegroundColor Yellow
}

if ($foundOld) {
    Write-Host "ERROR: Build contiene proyecto ANTIGUO de Supabase" -ForegroundColor Red
    Write-Host "Limpia el cache y reconstruye:" -ForegroundColor Yellow
    Write-Host "  rm -rf node_modules/.vite" -ForegroundColor White
    Write-Host "  npm run build:prod" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Opciones de Deploy" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Deploy via SSH (requiere contraseña del VPS)" -ForegroundColor Yellow
Write-Host "2. Abrir carpeta dist/ para FTP manual" -ForegroundColor Yellow
Write-Host "3. Mostrar instrucciones SSH manual" -ForegroundColor Yellow
Write-Host "4. Cancelar" -ForegroundColor Yellow
Write-Host ""

$choice = Read-Host "Selecciona una opcion (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Conectando al VPS..." -ForegroundColor Cyan
        Write-Host "VPS: ${VPS_USER}@${VPS_IP}" -ForegroundColor White
        Write-Host ""
        Write-Host "Se te pedira la contraseña del VPS varias veces" -ForegroundColor Yellow
        Write-Host "Presiona Enter para continuar o Ctrl+C para cancelar" -ForegroundColor Yellow
        Read-Host

        # Crear backup en el VPS
        Write-Host ""
        Write-Host "Creando backup en el VPS..." -ForegroundColor Yellow
        ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH} && tar -czf backup-`$(date +%Y%m%d-%H%M%S).tar.gz * 2>/dev/null || true"

        # Subir archivos
        Write-Host ""
        Write-Host "Subiendo archivos..." -ForegroundColor Yellow
        scp -r dist/* "${VPS_USER}@${VPS_IP}:${VPS_PATH}/"

        # Configurar permisos
        Write-Host ""
        Write-Host "Configurando permisos..." -ForegroundColor Yellow
        ssh "${VPS_USER}@${VPS_IP}" "cd ${VPS_PATH} && chown -R www-data:www-data . && chmod -R 755 ."

        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  Deploy completado!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tu aplicacion esta en: https://${VPS_DOMAIN}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Verificacion:" -ForegroundColor Yellow
        Write-Host "1. Abre https://${VPS_DOMAIN}" -ForegroundColor White
        Write-Host "2. Presiona F12 (DevTools)" -ForegroundColor White
        Write-Host "3. Ve a la pestaña Network" -ForegroundColor White
        Write-Host "4. Intenta registrarte como paciente" -ForegroundColor White
        Write-Host "5. Verifica que las peticiones van a: https://msnppinpethxfxskfgsv.supabase.co" -ForegroundColor White
        Write-Host ""
    }
    "2" {
        Write-Host ""
        Write-Host "Abriendo carpeta dist/..." -ForegroundColor Cyan
        Invoke-Item dist
        Write-Host ""
        Write-Host "Instrucciones para FTP manual:" -ForegroundColor Yellow
        Write-Host "1. Abre FileZilla o WinSCP" -ForegroundColor White
        Write-Host "2. Conecta a:" -ForegroundColor White
        Write-Host "   Host: ${VPS_IP}" -ForegroundColor Cyan
        Write-Host "   Usuario: ${VPS_USER}" -ForegroundColor Cyan
        Write-Host "   Puerto: 22" -ForegroundColor Cyan
        Write-Host "3. Navega a: ${VPS_PATH}" -ForegroundColor White
        Write-Host "4. Sube todo el contenido de la carpeta dist/" -ForegroundColor White
        Write-Host "5. Sobrescribe los archivos existentes" -ForegroundColor White
        Write-Host ""
    }
    "3" {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host "  Instrucciones SSH Manual" -ForegroundColor Cyan
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Copia y pega estos comandos en tu terminal:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "ssh ${VPS_USER}@${VPS_IP}" -ForegroundColor White
        Write-Host "cd ${VPS_PATH}" -ForegroundColor White
        Write-Host "git pull origin main" -ForegroundColor White
        Write-Host "cat > .env << 'ENVEOF'" -ForegroundColor White
        Write-Host "VITE_SUPABASE_URL=https://msnppinpethxfxskfgsv.supabase.co" -ForegroundColor White
        Write-Host "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbnBwaW5wZXRoeGZ4c2tmZ3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTAwNzUsImV4cCI6MjA4MjI2NjA3NX0.lbVZLpuDDjs57ahwM9YMrZZ5IJNUEG5zm5EeN1rkC7w" -ForegroundColor White
        Write-Host "VITE_MP_PUBLIC_KEY=APP_USR-cbeda534-2cad-4b72-b2db-6e0fd7055386" -ForegroundColor White
        Write-Host "VITE_PLATFORM_ADMIN_ALIAS=fabyelias.mp" -ForegroundColor White
        Write-Host "VITE_PRODUCTION_URL=https://argmed.online" -ForegroundColor White
        Write-Host "ENVEOF" -ForegroundColor White
        Write-Host "npm run build:prod" -ForegroundColor White
        Write-Host ""
    }
    default {
        Write-Host ""
        Write-Host "Deploy cancelado" -ForegroundColor Yellow
        Write-Host ""
    }
}
