# 🚨 ACCIÓN REQUERIDA - Actualizar Producción

## ❌ Problema Detectado

La aplicación en producción (argmed.online) está usando el **proyecto antiguo de Supabase**:
- Error: `POST https://bfhtmtnazzwthragaqfl.supabase.co/auth/v1/signup net::ERR_NAME_NOT_RESOLVED`
- Proyecto viejo: bfhtmtnazzwthragaqfl (no existe más)
- Proyecto nuevo: msnppinpethxfxskfgsv (correcto)

## ✅ Solución

### ⚡ Script de Verificación (Opcional pero Recomendado)

Antes de desplegar, puedes verificar que el build local tiene la configuración correcta:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-build.ps1
```

Esto verificará que:
- ✅ El .env tiene el nuevo proyecto de Supabase
- ✅ El build se genera correctamente
- ✅ El build NO contiene referencias al proyecto antiguo
- ✅ El build contiene el proyecto nuevo

---

### Opción 1: Actualizar archivo .env en el VPS (Recomendado)

1. **Conectarse al VPS:**
   ```bash
   ssh root@89.117.32.202
   ```

2. **Ir al directorio de la app:**
   ```bash
   cd /var/www/argmed.online
   ```

3. **Crear/actualizar archivo .env:**
   ```bash
   nano .env
   ```

4. **Agregar estas variables:**
   ```env
   VITE_SUPABASE_URL=https://msnppinpethxfxskfgsv.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbnBwaW5wZXRoeGZ4c2tmZ3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTAwNzUsImV4cCI6MjA4MjI2NjA3NX0.lbVZLpuDDjs57ahwM9YMrZZ5IJNUEG5zm5EeN1rkC7w
   VITE_MP_PUBLIC_KEY=APP_USR-cbeda534-2cad-4b72-b2db-6e0fd7055386
   VITE_PLATFORM_ADMIN_ALIAS=fabyelias.mp
   VITE_PRODUCTION_URL=https://argmed.online
   ```

5. **Guardar:** Ctrl+O, Enter, Ctrl+X

6. **Hacer un nuevo build:**
   ```bash
   npm run build
   ```

7. **Verificar que funcionó:**
   - Abre https://argmed.online
   - Revisa la consola (F12)
   - NO debería haber errores de Supabase

---

### Opción 2: Deploy desde VS Code

1. **Asegúrate de tener el .env actualizado localmente**

2. **Ejecuta el deploy:**
   ```bash
   npm run deploy
   ```

3. **El script subirá el nuevo build con la configuración correcta**

---

### Opción 3: Build manual y FTP

1. **En VS Code, genera el build:**
   ```bash
   npm run build
   ```

2. **Sube la carpeta `dist/` al VPS:**
   - Usa FileZilla/WinSCP
   - Destino: `/var/www/argmed.online/`
   - Sobrescribe todos los archivos

---

## ⚠️ IMPORTANTE

El problema es que el build de producción tiene **hardcoded** la URL antigua de Supabase.

Cuando ejecutas `npm run build`, Vite **compila las variables de entorno** dentro del código JavaScript.

Por eso necesitas:
1. Tener el `.env` correcto en el servidor
2. Ejecutar `npm run build` en el servidor
3. O hacer el build localmente y subirlo

---

## 🔍 Verificar que funcionó

Después de actualizar:

1. Abre https://argmed.online
2. Presiona F12 (DevTools)
3. Ve a la pestaña Network
4. Intenta registrarte como paciente
5. Verifica que las peticiones van a: `https://msnppinpethxfxskfgsv.supabase.co`

Si ves el nuevo dominio, ¡funcionó! ✅

---

## 📝 Comandos Rápidos

```bash
# Conectar al VPS
ssh root@89.117.32.202

# Ir al directorio
cd /var/www/argmed.online

# Pull del nuevo código
git pull origin main

# Instalar dependencias (si cambiaron)
npm install

# Crear .env con las variables correctas
cat > .env << 'ENVEOF'
VITE_SUPABASE_URL=https://msnppinpethxfxskfgsv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbnBwaW5wZXRoeGZ4c2tmZ3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTAwNzUsImV4cCI6MjA4MjI2NjA3NX0.lbVZLpuDDjs57ahwM9YMrZZ5IJNUEG5zm5EeN1rkC7w
VITE_MP_PUBLIC_KEY=APP_USR-cbeda534-2cad-4b72-b2db-6e0fd7055386
VITE_PLATFORM_ADMIN_ALIAS=fabyelias.mp
VITE_PRODUCTION_URL=https://argmed.online
ENVEOF

# Build
npm run build

# Verificar
ls -la dist/

# Listo!
```

---

**🎯 Ejecuta estos pasos ahora para que producción funcione con el nuevo Supabase.**
