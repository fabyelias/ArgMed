# Verificación Post-Deploy - ArgMed

## Checklist de Verificación

Después de completar el deploy, sigue estos pasos para verificar que todo funciona correctamente:

### 1. Verificar que el sitio carga

- [ ] Abre https://argmed.online
- [ ] El sitio carga sin errores
- [ ] La página principal se muestra correctamente

### 2. Verificar conexión a Supabase (CRÍTICO)

- [ ] Presiona F12 para abrir DevTools
- [ ] Ve a la pestaña **Network**
- [ ] Intenta **registrarte como paciente**
- [ ] En la pestaña Network, busca peticiones a Supabase
- [ ] Verifica que las URLs son: `https://msnppinpethxfxskfgsv.supabase.co`
- [ ] NO debería haber errores `ERR_NAME_NOT_RESOLVED`
- [ ] NO debería haber peticiones a `bfhtmtnazzwthragaqfl.supabase.co`

### 3. Verificar consola sin errores

- [ ] En DevTools, ve a la pestaña **Console**
- [ ] NO debería haber errores rojos relacionados con Supabase
- [ ] Si hay warnings (amarillo), está bien, pero NO errores rojos

### 4. Probar funcionalidad básica

#### Registro de Paciente
- [ ] Ir a "Registrarse" → "Como Paciente"
- [ ] Completar el formulario con datos de prueba
- [ ] El registro se completa exitosamente
- [ ] Se crea el usuario en Supabase

#### Login
- [ ] Intentar hacer login con las credenciales creadas
- [ ] El login funciona correctamente
- [ ] Redirige al dashboard del paciente

### 5. Verificar en Supabase Dashboard

- [ ] Abre https://supabase.com/dashboard/project/msnppinpethxfxskfgsv
- [ ] Ve a **Table Editor** → **profiles**
- [ ] Verifica que apareció el nuevo usuario registrado
- [ ] Ve a **Table Editor** → **users**
- [ ] Verifica que apareció el registro del paciente

---

## Comandos de Verificación Rápida

### Desde el VPS (SSH)

```bash
ssh root@89.117.32.202

# Verificar que los archivos se actualizaron
cd /var/www/argmed.online
ls -la

# Verificar que el .env existe (SOLO si hiciste deploy via SSH al VPS)
cat .env

# Verificar logs del servidor web (si hay errores)
tail -50 /var/log/apache2/argmed_error.log
# O si usas Nginx:
tail -50 /var/log/nginx/error.log
```

### Desde tu navegador

1. **Limpiar caché del navegador:**
   - Chrome: Ctrl + Shift + Delete
   - Selecciona "Imágenes y archivos en caché"
   - Periodo: "Últimas 24 horas"
   - Click en "Borrar datos"

2. **Hard Refresh:**
   - Ctrl + F5 (Windows)
   - Cmd + Shift + R (Mac)

---

## Errores Comunes y Soluciones

### Error: "ERR_NAME_NOT_RESOLVED" persiste

**Causa:** El navegador tiene caché del build antiguo

**Solución:**
1. Ctrl + Shift + Delete → Borrar caché
2. Ctrl + F5 (hard refresh)
3. Cierra y abre el navegador
4. Verifica en modo incógnito: Ctrl + Shift + N

### Error: "Invalid API key"

**Causa:** El Anon Key de Supabase no está configurado correctamente

**Solución:**
```bash
# Verificar en el VPS que el .env tiene el Anon Key correcto
ssh root@89.117.32.202
cd /var/www/argmed.online
grep SUPABASE_ANON_KEY .env
```

### Error: 404 en archivos JS/CSS

**Causa:** Los archivos no se subieron correctamente

**Solución:**
```bash
# Verificar que la carpeta assets existe
ssh root@89.117.32.202
ls -la /var/www/argmed.online/assets/

# Si no existe, volver a hacer deploy
```

---

## Estado Esperado Post-Deploy

### Network Tab (F12 → Network)

**Correcto:**
```
✅ signup    200    POST    https://msnppinpethxfxskfgsv.supabase.co/auth/v1/signup
✅ token     200    POST    https://msnppinpethxfxskfgsv.supabase.co/auth/v1/token
```

**Incorrecto (NO debería aparecer):**
```
❌ signup    ERR_NAME_NOT_RESOLVED    https://bfhtmtnazzwthragaqfl.supabase.co/auth/v1/signup
```

### Console Tab (F12 → Console)

**Correcto:**
```
✅ Sin errores rojos de Supabase
✅ Puede haber warnings (amarillo) normales
```

**Incorrecto (NO debería aparecer):**
```
❌ Supabase Anon Key no configurada
❌ Failed to fetch
❌ ERR_NAME_NOT_RESOLVED
```

---

## Contacto y Soporte

Si después de verificar todo sigue habiendo problemas:

1. Revisa los logs del servidor web
2. Verifica que el archivo .env está en el VPS
3. Confirma que el build se generó con las variables correctas
4. Prueba en modo incógnito para descartar caché

**Backup creado:** El script creó un backup automático en el VPS antes de subir archivos. Si algo sale mal, puedes restaurarlo.

---

**Última actualización:** 2024-12-25
**Proyecto Supabase:** msnppinpethxfxskfgsv
**Dominio:** argmed.online
