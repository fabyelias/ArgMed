#!/bin/bash
# Script de actualización de ArgMed en producción
# Uso: ./update-production.sh

set -e  # Detener ejecución si hay errores

echo "╔════════════════════════════════════════╗"
echo "║   Actualización ArgMed Producción     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Variables de configuración
REPO_DIR="/home/user/argmed-repo"
WEB_DIR="/home/user/htdocs/argmed.online"
BACKUP_DIR="/home/user/htdocs"
WEB_USER="www-data"
WEB_GROUP="www-data"

# 1. Verificar que estamos en el directorio correcto
echo "→ Cambiando al directorio del repositorio..."
cd "$REPO_DIR" || {
    echo "✗ Error: No se pudo acceder a $REPO_DIR"
    exit 1
}
echo "✓ Directorio: $(pwd)"
echo ""

# 2. Verificar estado de Git
echo "→ Verificando estado de Git..."
git status
echo ""

# 3. Guardar cambios locales si existen
if ! git diff-index --quiet HEAD --; then
    echo "⚠ Hay cambios locales sin commitear"
    echo "→ Guardando cambios locales..."
    git stash
    echo "✓ Cambios guardados en stash"
    echo ""
fi

# 4. Descargar últimos cambios
echo "→ Descargando últimos cambios desde GitHub..."
git pull origin main || {
    echo "✗ Error en git pull"
    exit 1
}
echo "✓ Cambios descargados"
echo ""

# 5. Instalar/actualizar dependencias
echo "→ Instalando dependencias..."
npm install || {
    echo "✗ Error al instalar dependencias"
    exit 1
}
echo "✓ Dependencias instaladas"
echo ""

# 6. Compilar aplicación
echo "→ Compilando aplicación React..."
npm run build || {
    echo "✗ Error durante la compilación"
    exit 1
}
echo "✓ Compilación exitosa"
echo ""

# 7. Verificar que dist/ existe
if [ ! -d "dist" ]; then
    echo "✗ Error: No se generó la carpeta dist/"
    exit 1
fi
echo "✓ Carpeta dist/ generada correctamente"
echo ""

# 8. Crear backup del sitio actual
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/argmed.online.backup.$TIMESTAMP"
echo "→ Creando backup del sitio actual..."
sudo cp -r "$WEB_DIR" "$BACKUP_PATH" || {
    echo "⚠ Advertencia: No se pudo crear el backup, continuando..."
}
echo "✓ Backup creado: $BACKUP_PATH"
echo ""

# 9. Limpiar directorio web
echo "→ Limpiando directorio web..."
sudo rm -rf "$WEB_DIR"/*
echo "✓ Directorio limpiado"
echo ""

# 10. Copiar nuevos archivos
echo "→ Copiando archivos compilados..."
sudo cp -r dist/* "$WEB_DIR/" || {
    echo "✗ Error al copiar archivos"
    echo "→ Restaurando backup..."
    sudo rm -rf "$WEB_DIR"/*
    sudo cp -r "$BACKUP_PATH"/* "$WEB_DIR"/
    exit 1
}
echo "✓ Archivos copiados"
echo ""

# 11. Configurar permisos
echo "→ Configurando permisos..."
sudo chown -R $WEB_USER:$WEB_GROUP "$WEB_DIR"
sudo chmod -R 755 "$WEB_DIR"
echo "✓ Permisos configurados"
echo ""

# 12. Limpiar backups antiguos (mantener solo los últimos 5)
echo "→ Limpiando backups antiguos..."
cd "$BACKUP_DIR"
ls -t argmed.online.backup.* 2>/dev/null | tail -n +6 | xargs -r sudo rm -rf
BACKUP_COUNT=$(ls -1 argmed.online.backup.* 2>/dev/null | wc -l)
echo "✓ Backups mantenidos: $BACKUP_COUNT"
echo ""

# 13. Resumen final
echo "╔════════════════════════════════════════╗"
echo "║     ✓ Actualización Completada        ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Sitio web: https://argmed.online"
echo "Backup guardado en: $BACKUP_PATH"
echo ""
echo "→ Verifica el sitio en tu navegador"
echo ""
