# Comandos de Deployment para ArgMed

## Opción 1: Script Completo (Recomendado)

### Pasos de instalación:

1. **Subir el script al servidor:**
```bash
scp update-production.sh user@tu-servidor:/home/user/
```

2. **Dar permisos de ejecución:**
```bash
ssh user@tu-servidor
chmod +x /home/user/update-production.sh
```

3. **Ejecutar el script:**
```bash
/home/user/update-production.sh
```

---

## Opción 2: Comando de Una Línea (Rápido)

```bash
cd /home/user/argmed-repo && git pull origin main && npm install && npm run build && sudo rm -rf /home/user/htdocs/argmed.online/* && sudo cp -r dist/* /home/user/htdocs/argmed.online/ && sudo chown -R www-data:www-data /home/user/htdocs/argmed.online && sudo chmod -R 755 /home/user/htdocs/argmed.online && echo "✓ Actualización completada - Visita https://argmed.online"
```

---

## Opción 3: Comandos Paso a Paso

```bash
# 1. Ir al directorio del repositorio
cd /home/user/argmed-repo

# 2. Descargar cambios
git pull origin main

# 3. Instalar dependencias
npm install

# 4. Compilar
npm run build

# 5. Crear backup (opcional pero recomendado)
sudo cp -r /home/user/htdocs/argmed.online /home/user/htdocs/argmed.online.backup.$(date +%Y%m%d_%H%M%S)

# 6. Limpiar directorio web
sudo rm -rf /home/user/htdocs/argmed.online/*

# 7. Copiar nuevos archivos
sudo cp -r dist/* /home/user/htdocs/argmed.online/

# 8. Configurar permisos
sudo chown -R www-data:www-data /home/user/htdocs/argmed.online
sudo chmod -R 755 /home/user/htdocs/argmed.online

# 9. Verificar
echo "✓ Actualización completada - Visita https://argmed.online"
```

---

## Comandos Útiles Adicionales

### Ver logs de Git (últimos cambios)
```bash
cd /home/user/argmed-repo && git log --oneline -10
```

### Verificar que el build fue exitoso
```bash
ls -lh /home/user/argmed-repo/dist/
```

### Ver backups existentes
```bash
ls -lht /home/user/htdocs/argmed.online.backup.* | head -5
```

### Restaurar desde backup (si algo salió mal)
```bash
# Reemplaza TIMESTAMP con la fecha del backup
sudo rm -rf /home/user/htdocs/argmed.online/*
sudo cp -r /home/user/htdocs/argmed.online.backup.TIMESTAMP/* /home/user/htdocs/argmed.online/
```

### Limpiar backups antiguos (mantener solo los últimos 5)
```bash
cd /home/user/htdocs && ls -t argmed.online.backup.* | tail -n +6 | xargs sudo rm -rf
```

---

## Notas Importantes

1. **Siempre crear backup antes de actualizar** (el script lo hace automáticamente)
2. **Verificar permisos** después de copiar archivos (www-data:www-data)
3. **Probar el sitio** en el navegador después de cada actualización
4. **Mantener backups limitados** para no llenar el disco (máximo 5)

---

## Solución de Problemas

### Si git pull falla por cambios locales:
```bash
cd /home/user/argmed-repo
git stash
git pull origin main
```

### Si el build falla:
```bash
# Limpiar caché de npm
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Si los permisos no son correctos:
```bash
sudo chown -R www-data:www-data /home/user/htdocs/argmed.online
sudo chmod -R 755 /home/user/htdocs/argmed.online
```

### Ver espacio en disco:
```bash
df -h
du -sh /home/user/htdocs/argmed.online*
```
