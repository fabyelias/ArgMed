@echo off
echo ========================================
echo   ArgMed - Generador de ZIP para CloudPanel
echo ========================================
echo.

REM Obtener fecha y hora actual
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%-%HH%%Min%%Sec%"

echo [1/4] Limpiando build anterior...
if exist dist rmdir /s /q dist

echo [2/4] Construyendo aplicacion para produccion...
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ERROR: La construccion fallo. Verifica los errores arriba.
    pause
    exit /b 1
)

echo [3/4] Creando archivo ZIP...
set "zipname=argmed-dist-%timestamp%.zip"

REM Usar PowerShell para crear el ZIP
powershell -command "Compress-Archive -Path 'dist\*' -DestinationPath '%zipname%' -Force"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudo crear el archivo ZIP.
    pause
    exit /b 1
)

echo [4/4] Verificando archivo creado...
if exist "%zipname%" (
    echo.
    echo ========================================
    echo   EXITO! ZIP creado correctamente
    echo ========================================
    echo.
    echo Archivo: %zipname%
    echo Ubicacion: %CD%
    echo.
    echo Sube este archivo a CloudPanel en:
    echo 1. File Manager
    echo 2. Navega a la carpeta de tu sitio
    echo 3. Sube el ZIP
    echo 4. Extrae el contenido
    echo.
) else (
    echo.
    echo ERROR: El archivo ZIP no se creo correctamente.
)

echo.
pause
