# ========================================
# ArgMed - Generador de ZIP para CloudPanel
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ArgMed - Generador de ZIP para CloudPanel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipname = "argmed-dist-$timestamp.zip"

try {
    Write-Host "[1/4] Limpiando build anterior..." -ForegroundColor Yellow
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }

    Write-Host "[2/4] Construyendo aplicacion para produccion..." -ForegroundColor Yellow
    npm run build

    if ($LASTEXITCODE -ne 0) {
        throw "La construccion fallo. Verifica los errores arriba."
    }

    Write-Host "[3/4] Creando archivo ZIP..." -ForegroundColor Yellow
    Compress-Archive -Path "dist\*" -DestinationPath $zipname -Force

    Write-Host "[4/4] Verificando archivo creado..." -ForegroundColor Yellow

    if (Test-Path $zipname) {
        $fileSize = (Get-Item $zipname).Length / 1MB

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✓ EXITO! ZIP creado correctamente" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Archivo:    " -NoNewline -ForegroundColor White
        Write-Host $zipname -ForegroundColor Cyan
        Write-Host "Tamaño:     " -NoNewline -ForegroundColor White
        Write-Host ("{0:N2} MB" -f $fileSize) -ForegroundColor Cyan
        Write-Host "Ubicacion:  " -NoNewline -ForegroundColor White
        Write-Host (Get-Location).Path -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Pasos para subir a CloudPanel:" -ForegroundColor Yellow
        Write-Host "  1. Ve a File Manager en CloudPanel" -ForegroundColor White
        Write-Host "  2. Navega a la carpeta de tu sitio web" -ForegroundColor White
        Write-Host "  3. HAZ BACKUP del contenido actual" -ForegroundColor Red
        Write-Host "  4. Sube el archivo ZIP" -ForegroundColor White
        Write-Host "  5. Extrae el contenido en el directorio raiz" -ForegroundColor White
        Write-Host ""

        # Abrir la ubicación del archivo
        $openFolder = Read-Host "Deseas abrir la carpeta donde esta el ZIP? (S/N)"
        if ($openFolder -eq "S" -or $openFolder -eq "s") {
            explorer .
        }
    } else {
        throw "El archivo ZIP no se creo correctamente."
    }
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
