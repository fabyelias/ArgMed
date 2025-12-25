# 🚀 Guía de Deployment ArgMed

Esta guía te ayudará a desplegar tu aplicación ArgMed desde Visual Studio Code a tu VPS de Hostinger.

## 📋 Información del Servidor

- **Dominio:** argmed.online
- **IP del VPS:** 89.117.32.202
- **Hosting:** Hostinger VPS
- **Base de Datos:** Supabase (https://bfhtmtnazzwthragaqfl.supabase.co)
- **Pagos:** MercadoPago

---

## 🛠️ Configuración Inicial

### 1. Variables de Entorno

El archivo `.env` ya está configurado con:
```env
VITE_MP_PUBLIC_KEY=APP_USR-cbeda534-2cad-4b72-b2db-6e0fd7055386
VITE_PLATFORM_ADMIN_ALIAS=fabyelias.mp
VITE_PRODUCTION_URL=https://argmed.online
```

**Importante:** Nunca commitees el archivo `.env` a Git. Ya está en `.gitignore`.

### 2. Configuración de Supabase

La configuración de Supabase está en `src/lib/customSupabaseClient.js`:
- URL: `https://bfhtmtnazzwthragaqfl.supabase.co`
- Esta configuración ya está funcionando correctamente

---

## 🚀 Métodos de Deployment

### Método 1: Script Automático (PowerShell - Recomendado para Windows)

```bash
npm run deploy
```

Este script:
1. ✅ Instala dependencias
2. ✅ Genera el build de producción
3. ✅ Crea backup en el VPS
4. ✅ Sube archivos vía SSH/SCP
5. ✅ Configura permisos correctos

**Requisitos:**
- Git Bash instalado (incluye SSH/SCP)
- O WSL (Windows Subsystem for Linux)

### Método 2: Script Bash (Linux/Mac o Git Bash)

```bash
npm run deploy:bash
```

### Método 3: Manual (Sin SSH)

Si no tienes SSH configurado:

1. **Generar build:**
   ```bash
   npm run build
   ```

2. **Subir archivos:**
   - Usa FileZilla, WinSCP o el File Manager de Hostinger
   - Sube todo el contenido de la carpeta `dist/` a `/var/www/argmed.online/` (o la ruta que uses en tu VPS)
   - Asegúrate de subir también `public/.htaccess`

---

## 🔐 Configuración SSH (Recomendado)

Para usar los scripts automáticos, necesitas configurar SSH:

### 1. Generar clave SSH (si no tienes una)

```bash
ssh-keygen -t ed25519 -C "tu_email@example.com"
```

Presiona Enter para aceptar la ubicación predeterminada.

### 2. Copiar clave al VPS

```bash
ssh-copy-id root@89.117.32.202
```

O manualmente:
```bash
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@89.117.32.202 "cat >> ~/.ssh/authorized_keys"
```

### 3. Probar conexión

```bash
ssh root@89.117.32.202
```

Si te conectas sin pedir contraseña, ¡está configurado correctamente!

### 4. Configurar usuario y ruta en scripts

Edita `deploy.ps1` o `deploy.sh` según tu configuración:

```bash
$VPS_USER = "root"  # Cambia si usas otro usuario
$VPS_PATH = "/var/www/argmed.online"  # Ruta donde está tu app
```

---

## 📁 Estructura en el VPS

Tu VPS debería tener esta estructura:

```
/var/www/argmed.online/
├── index.html
├── .htaccess
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── backup-YYYYMMDD-HHMMSS.tar.gz (backups automáticos)
```

---

## 🔧 Configuración del Servidor Web (Apache/Nginx)

### Si usas Apache (recomendado en Hostinger)

El archivo `.htaccess` ya está configurado para:
- ✅ Reescritura de rutas (React Router)
- ✅ Cache de assets
- ✅ Headers de seguridad

**Configuración del Virtual Host:**

```apache
<VirtualHost *:80>
    ServerName argmed.online
    ServerAlias www.argmed.online
    DocumentRoot /var/www/argmed.online

    <Directory /var/www/argmed.online>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/argmed_error.log
    CustomLog ${APACHE_LOG_DIR}/argmed_access.log combined
</VirtualHost>

# HTTPS (necesario para WebRTC)
<VirtualHost *:443>
    ServerName argmed.online
    ServerAlias www.argmed.online
    DocumentRoot /var/www/argmed.online

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/privkey.pem
    SSLCertificateChainFile /path/to/chain.pem

    <Directory /var/www/argmed.online>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/argmed_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/argmed_ssl_access.log combined
</VirtualHost>
```

### Si usas Nginx

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name argmed.online www.argmed.online;

    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name argmed.online www.argmed.online;

    root /var/www/argmed.online;
    index index.html;

    # SSL (necesario para WebRTC)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Cache para assets
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # React Router - todas las rutas a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🌐 SSL/HTTPS (IMPORTANTE)

**⚠️ HTTPS es obligatorio para:**
- WebRTC (videollamadas)
- Geolocalización
- Notificaciones push
- Cámara y micrófono

### Obtener certificado SSL gratuito:

**Opción 1: Let's Encrypt (Recomendado)**

```bash
# Conectarse al VPS
ssh root@89.117.32.202

# Instalar Certbot
apt update
apt install certbot python3-certbot-apache

# Obtener certificado
certbot --apache -d argmed.online -d www.argmed.online

# Renovación automática (se configura automáticamente)
certbot renew --dry-run
```

**Opción 2: Hostinger SSL**

Si Hostinger ofrece SSL gratuito, activarlo desde el panel de control.

---

## 🧪 Workflow de Desarrollo

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
npm run dev

# Acceder en: http://localhost:3000
```

### Build de Prueba

```bash
# Generar build
npm run build

# Previsualizar build localmente
npm run preview
```

### Deployment a Producción

```bash
# Desplegar automáticamente
npm run deploy

# O manualmente:
npm run build
# Luego subir dist/ al VPS
```

---

## ✅ Checklist Pre-Deployment

Antes de cada deployment, verifica:

- [ ] Variables de entorno correctas en `.env`
- [ ] Build local funciona: `npm run build && npm run preview`
- [ ] Supabase está funcionando
- [ ] MercadoPago keys son correctas
- [ ] SSL/HTTPS está activo en el VPS
- [ ] Backup previo creado (script lo hace automáticamente)

---

## 🐛 Troubleshooting

### Error: "SSH not found"

**Solución:**
- Instala Git for Windows: https://git-scm.com/download/win
- O usa WSL: https://docs.microsoft.com/en-us/windows/wsl/install

### Error: "Permission denied"

**Solución:**
```bash
# En el VPS, asegúrate de que los permisos sean correctos
ssh root@89.117.32.202
cd /var/www/argmed.online
chown -R www-data:www-data .
chmod -R 755 .
```

### Página en blanco después de deployment

**Causas comunes:**
1. Rutas incorrectas - verifica `base: '/'` en `vite.config.js`
2. `.htaccess` no se subió correctamente
3. JavaScript bloqueado - revisa console del navegador

### WebRTC no funciona

**Solución:**
- Verifica que HTTPS esté activo
- Revisa que Supabase Realtime esté funcionando
- Comprueba permisos de cámara/micrófono en el navegador

### MercadoPago no carga

**Solución:**
- Verifica que `VITE_MP_PUBLIC_KEY` sea correcta
- Asegúrate de usar la key de producción (no test)
- Revisa la consola del navegador para errores

---

## 📊 Monitoreo Post-Deployment

Después de desplegar, verifica:

1. **Aplicación accesible:**
   - https://argmed.online

2. **Funciones críticas:**
   - [ ] Login de pacientes (DNI)
   - [ ] Login de profesionales
   - [ ] Búsqueda de profesionales
   - [ ] Inicio de consulta
   - [ ] Pagos con MercadoPago
   - [ ] Videollamadas WebRTC
   - [ ] Chat en tiempo real

3. **Performance:**
   - Usa Lighthouse en Chrome DevTools
   - Verifica tiempos de carga
   - Revisa tamaño de bundles

4. **Logs del servidor:**
   ```bash
   ssh root@89.117.32.202
   tail -f /var/log/apache2/argmed_error.log
   # O para Nginx:
   tail -f /var/log/nginx/error.log
   ```

---

## 🔄 Rollback (en caso de problemas)

Si algo sale mal después de un deployment:

```bash
# Conectarse al VPS
ssh root@89.117.32.202

# Ir al directorio
cd /var/www/argmed.online

# Listar backups disponibles
ls -lh backup-*.tar.gz

# Restaurar el backup más reciente
tar -xzf backup-20231223-154530.tar.gz

# Reiniciar servidor web
systemctl restart apache2
# O para Nginx:
systemctl restart nginx
```

---

## 📞 Soporte

Si tienes problemas:

1. Revisa logs en VS Code (Terminal)
2. Revisa logs del VPS: `/var/log/apache2/` o `/var/log/nginx/`
3. Revisa Supabase Dashboard para errores de DB
4. Revisa MercadoPago Dashboard para errores de pagos

---

## 🎯 Próximos Pasos

- [ ] Configurar CI/CD con GitHub Actions
- [ ] Implementar monitoring con Sentry o similar
- [ ] Configurar backups automáticos de Supabase
- [ ] Optimizar performance (lazy loading, code splitting)
- [ ] Implementar analytics (Google Analytics, Mixpanel)

---

**¡Tu aplicación ArgMed está lista para producción! 🎉**
