# Script para verificar el build antes de desplegar a producción
# Verifica que el build tenga la configuración correcta de Supabase

Write-Host "🔍 Verificando configuración del build..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que .env existe y tiene las variables correctas
Write-Host "1️⃣ Verificando archivo .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "msnppinpethxfxskfgsv") {
        Write-Host "   ✅ .env tiene el nuevo proyecto de Supabase" -ForegroundColor Green
    } else {
        Write-Host "   ❌ .env NO tiene el nuevo proyecto de Supabase" -ForegroundColor Red
        Write-Host "   Proyecto esperado: msnppinpethxfxskfgsv" -ForegroundColor Red
        exit 1
    }

    if ($envContent -match "bfhtmtnazzwthragaqfl") {
        Write-Host "   ⚠️  ADVERTENCIA: .env contiene referencia al proyecto ANTIGUO" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ❌ Archivo .env no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Hacer build de producción
Write-Host "2️⃣ Generando build de producción..." -ForegroundColor Yellow
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build falló" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Build generado exitosamente" -ForegroundColor Green
Write-Host ""

# 3. Verificar que el build NO contiene el proyecto antiguo
Write-Host "3️⃣ Verificando que el build NO contiene proyecto antiguo..." -ForegroundColor Yellow

$distFiles = Get-ChildItem -Path "dist/assets" -Filter "*.js" -Recurse
$foundOld = $false

foreach ($file in $distFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "bfhtmtnazzwthragaqfl") {
        Write-Host "   ❌ ENCONTRADO proyecto antiguo en: $($file.Name)" -ForegroundColor Red
        $foundOld = $true
    }
}

if ($foundOld) {
    Write-Host "   ❌ El build contiene referencias al proyecto ANTIGUO" -ForegroundColor Red
    Write-Host "   Limpia el cache y vuelve a hacer build:" -ForegroundColor Yellow
    Write-Host "   rm -rf node_modules/.vite" -ForegroundColor Yellow
    Write-Host "   npm run build:prod" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "   ✅ Build NO contiene proyecto antiguo" -ForegroundColor Green
}

Write-Host ""

# 4. Verificar que el build contiene el proyecto nuevo
Write-Host "4️⃣ Verificando que el build contiene proyecto NUEVO..." -ForegroundColor Yellow

$foundNew = $false
foreach ($file in $distFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "msnppinpethxfxskfgsv") {
        Write-Host "   ✅ ENCONTRADO proyecto nuevo en: $($file.Name)" -ForegroundColor Green
        $foundNew = $true
        break
    }
}

if (-not $foundNew) {
    Write-Host "   ❌ El build NO contiene el proyecto nuevo" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ VERIFICACIÓN EXITOSA" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "El build está listo para producción." -ForegroundColor Green
Write-Host "Contiene la configuración correcta de Supabase (msnppinpethxfxskfgsv)" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Yellow
Write-Host "  npm run deploy" -ForegroundColor Cyan
Write-Host "  O sube manualmente la carpeta dist/ al VPS" -ForegroundColor Cyan
Write-Host ""
