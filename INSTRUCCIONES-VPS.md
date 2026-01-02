# 📋 Instrucciones para Actualizar ArgMed en VPS

## Opción 1: Actualización directa desde GitHub (Recomendado)

### Paso 1: Conectar al VPS por SSH
```bash
ssh usuario@tu-vps.com
```

### Paso 2: Navegar al directorio de la aplicación
```bash
cd /ruta/a/argmed
# Por ejemplo: cd /home/argmed/htdocs/www.argmed.online
```

### Paso 3: Hacer backup del directorio actual (opcional pero recomendado)
```bash
cp -r . ../argmed-backup-$(date +%Y%m%d-%H%M%S)
```

### Paso 4: Hacer pull de los cambios desde GitHub
```bash
git pull origin main
```

### Paso 5: Instalar dependencias (por si acaso)
```bash
npm install
```

### Paso 6: Construir la aplicación para producción
```bash
npm run build
```

### Paso 7: Reiniciar el servidor (si aplica)
```bash
# Si usas PM2:
pm2 restart argmed

# Si usas un servicio systemd:
sudo systemctl restart argmed

# Si es CloudPanel, generalmente se actualiza automáticamente al hacer el build
```

---

## Opción 2: Subir manualmente desde CloudPanel

### Paso 1: Crear el ZIP para subir

En tu computadora local, ejecuta:

```bash
# Windows PowerShell
cd C:\Users\fabye\Desktop\ArgMed
npm run build
Compress-Archive -Path dist\* -DestinationPath argmed-dist-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip
```

O usa el script que crearé en el siguiente paso.

### Paso 2: En CloudPanel

1. Ve a **File Manager**
2. Navega a la carpeta de tu sitio web
3. Haz backup del contenido actual
4. Sube el archivo `argmed-dist-XXXXXXXX.zip`
5. Extrae el contenido en el directorio raíz del sitio

---

## 📊 Aplicar cambios en Supabase

### Paso 1: Ir al Dashboard de Supabase
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto ArgMed

### Paso 2: Ejecutar el SQL
1. En el menú lateral, ve a **SQL Editor**
2. Haz clic en **New Query**
3. Abre el archivo `supabase-update.sql` que está en tu escritorio
4. Copia todo el contenido
5. Pégalo en el editor SQL de Supabase
6. Haz clic en **RUN** o presiona `Ctrl + Enter`

### Paso 3: Verificar que se aplicó correctamente
Ejecuta esta consulta para verificar:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name = 'payload';
```

Deberías ver que la columna `payload` existe con tipo `jsonb`.

---

## ✅ Verificación de la actualización

Después de actualizar, verifica que todo funcione correctamente:

1. **Perfil de Usuario**
   - ✓ Botón "Volver al inicio" visible
   - ✓ Sesiones mostrando datos de videollamadas
   - ✓ Bitácora mostrando registros médicos

2. **Foto de Perfil**
   - ✓ Cambiar foto y verificar que se actualice en el inicio
   - ✓ La foto debe verse en todas las páginas

3. **Buscar Profesionales**
   - ✓ Tarjetas mejoradas con foto, matrícula, precio
   - ✓ Indicador de "En línea"
   - ✓ Al solicitar sesión, el profesional debe recibir la notificación

4. **Historial Médico**
   - ✓ Botón "Volver al inicio" visible
   - ✓ Registros mostrando correctamente

5. **Configuración**
   - ✓ Botón "Volver al inicio" visible

---

## 🔍 Solución de Problemas

### La aplicación no se actualiza
```bash
# Limpiar caché del navegador
# Ctrl + Shift + R en Chrome/Edge
# Ctrl + F5 en Firefox

# Limpiar build y reconstruir
rm -rf dist
npm run build
```

### Error 404 después de actualizar
Verifica que el archivo `.htaccess` o la configuración de Nginx tenga la redirección correcta para SPA:

```apache
# .htaccess para Apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Las notificaciones no llegan a los profesionales
Verifica que se ejecutó correctamente el SQL en Supabase para agregar la columna `payload`.

---

## 📞 Contacto de Soporte

Si tienes problemas con la actualización, revisa los logs:

```bash
# Logs de PM2
pm2 logs argmed

# Logs del servidor web
sudo tail -f /var/log/nginx/error.log
# O
sudo tail -f /var/log/apache2/error.log
```
