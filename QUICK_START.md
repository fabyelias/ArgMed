# 🚀 Guía de Inicio Rápido - ArgMed desde VS Code

Esta guía te ayudará a trabajar con ArgMed desde Visual Studio Code y desplegarlo a tu servidor en producción.

---

## ✅ Configuración Completada

Ya está todo configurado y listo para usar:

- ✅ **VPS Hostinger:** 89.117.32.202
- ✅ **Dominio:** argmed.online
- ✅ **Base de Datos:** Supabase (https://bfhtmtnazzwthragaqfl.supabase.co)
- ✅ **Pagos:** MercadoPago (configurado)
- ✅ **Dependencias:** Instaladas (680 paquetes)
- ✅ **Servidor de desarrollo:** Funcionando en http://localhost:3000

---

## 🎯 Workflow Diario

### 1. Iniciar Desarrollo

```bash
# Abrir proyecto en VS Code
cd c:\Users\fabye\Downloads\ArgMed

# Iniciar servidor de desarrollo
npm run dev
```

**El servidor se iniciará en:**
- 🌐 Local: http://localhost:3000
- 🌐 Network: http://192.168.100.25:3000

### 2. Hacer Cambios

Edita cualquier archivo en `src/` y los cambios se reflejarán automáticamente (Hot Module Replacement).

**Archivos principales:**
- `src/pages/` - Páginas de la aplicación
- `src/components/` - Componentes reutilizables
- `src/contexts/` - Estado global
- `src/hooks/` - Custom hooks
- `src/lib/customSupabaseClient.js` - Configuración Supabase

### 3. Probar Localmente

1. Abre http://localhost:3000 en tu navegador
2. Prueba las funcionalidades
3. Revisa la consola de Chrome DevTools (F12) para errores

### 4. Desplegar a Producción

**Opción A: Deploy Automático (Recomendado)**

```bash
npm run deploy
```

Esto hará:
1. ✅ Build de producción
2. ✅ Backup en VPS
3. ✅ Subida de archivos
4. ✅ Configuración de permisos

**Opción B: Deploy Manual**

```bash
# 1. Generar build
npm run build

# 2. Subir manualmente con FileZilla/WinSCP
# Carpeta local: dist/
# Destino VPS: /var/www/argmed.online/
```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Generar build de producción
npm run preview          # Previsualizar build localmente

# Deployment
npm run deploy           # Deploy automático a VPS

# Verificación
npm run lint             # Revisar código (requiere config ESLint)
```

---

## 📁 Archivos Importantes

### Variables de Entorno (.env)
```env
VITE_MP_PUBLIC_KEY=APP_USR-cbeda534-2cad-4b72-b2db-6e0fd7055386
VITE_PLATFORM_ADMIN_ALIAS=fabyelias.mp
VITE_PRODUCTION_URL=https://argmed.online
```

**⚠️ NUNCA** commitees este archivo a Git (ya está en .gitignore)

### Configuración de Supabase
`src/lib/customSupabaseClient.js`
- URL: https://bfhtmtnazzwthragaqfl.supabase.co
- Ya configurado y funcionando

### Scripts de Deploy
- `deploy.ps1` - PowerShell (Windows)
- `deploy.sh` - Bash (Linux/Mac/Git Bash)

---

## 🌐 URLs Importantes

### Desarrollo
- **Local:** http://localhost:3000
- **Network:** http://192.168.100.25:3000

### Producción
- **Sitio web:** https://argmed.online
- **VPS IP:** 89.117.32.202

### Dashboards
- **Supabase:** https://supabase.com/dashboard/project/bfhtmtnazzwthragaqfl
- **MercadoPago:** https://www.mercadopago.com.ar/developers/panel

---

## 🎨 Desarrollo de Funcionalidades

### Agregar una nueva página

1. Crear archivo en `src/pages/`:
```jsx
// src/pages/MiNuevaPagina.jsx
export default function MiNuevaPagina() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Mi Nueva Página</h1>
    </div>
  );
}
```

2. Agregar ruta en `src/App.jsx`:
```jsx
import MiNuevaPagina from './pages/MiNuevaPagina';

// Dentro de <Routes>
<Route path="/mi-nueva-pagina" element={<MiNuevaPagina />} />
```

### Crear un componente reutilizable

```jsx
// src/components/MiComponente.jsx
export default function MiComponente({ titulo, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      {children}
    </div>
  );
}
```

### Usar Supabase en tus componentes

```jsx
import { supabase } from '@/lib/customSupabaseClient';

// Leer datos
const { data, error } = await supabase
  .from('tabla')
  .select('*');

// Insertar datos
const { data, error } = await supabase
  .from('tabla')
  .insert({ campo: 'valor' });

// Suscribirse a cambios en tiempo real
const channel = supabase
  .channel('mi-canal')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'tabla' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

---

## 🐛 Solución de Problemas Comunes

### Error: "Cannot find module"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Puerto 3000 ocupado

```bash
# Cambiar puerto en package.json
"dev": "vite --host :: --port 3001"
```

### Build falla

```bash
# Limpiar cache y rebuild
npm run build:prod
```

### Cambios no se reflejan en producción

```bash
# Limpiar cache del navegador (Ctrl + Shift + Del)
# O hacer hard refresh (Ctrl + F5)

# Verificar que el build se generó correctamente
ls dist/

# Verificar que se subió al VPS
ssh root@89.117.32.202 "ls -la /var/www/argmed.online/"
```

---

## 🔐 Configurar SSH para Deploy Automático

Para usar `npm run deploy`, necesitas configurar SSH:

### 1. Generar clave SSH

```bash
# En Git Bash o PowerShell
ssh-keygen -t ed25519 -C "tu_email@example.com"

# Presiona Enter 3 veces (acepta defaults)
```

### 2. Copiar clave al VPS

```bash
# Copiar clave pública al VPS
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@89.117.32.202 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# O manualmente:
# 1. Abre: C:\Users\fabye\.ssh\id_ed25519.pub
# 2. Copia el contenido
# 3. Pega en VPS: ~/.ssh/authorized_keys
```

### 3. Probar conexión

```bash
ssh root@89.117.32.202

# Si conecta sin pedir contraseña = ✅ Configurado correctamente
```

### 4. Configurar usuario en deploy.ps1

Edita `deploy.ps1` si usas otro usuario:

```powershell
$VPS_USER = "root"  # Cambia aquí si es necesario
$VPS_PATH = "/var/www/argmed.online"  # Ruta en el VPS
```

---

## 📊 Monitoreo y Debugging

### Ver logs en tiempo real

```bash
# Conectarse al VPS
ssh root@89.117.32.202

# Ver logs de Apache
tail -f /var/log/apache2/argmed_error.log

# O logs de Nginx
tail -f /var/log/nginx/error.log
```

### Verificar estado del servidor

```bash
# Conectarse al VPS
ssh root@89.117.32.202

# Ver estado de Apache
systemctl status apache2

# O Nginx
systemctl status nginx

# Reiniciar servidor web
systemctl restart apache2
```

### DevTools del navegador

1. Presiona F12 en Chrome
2. **Console:** Errores JavaScript
3. **Network:** Llamadas a APIs
4. **Application:** Storage, Service Workers
5. **Performance:** Optimización

---

## 🎯 Tips de Desarrollo

### 1. Hot Reload
- Los cambios en `src/` se reflejan automáticamente
- No necesitas recargar el navegador

### 2. Inspeccionar estado de React
- Instala React DevTools en Chrome
- Ver contextos, props, state en tiempo real

### 3. Debugger de Supabase
- Abre Supabase Dashboard
- Table Editor para ver datos
- Logs para ver queries

### 4. Test de pagos
- Usa tarjetas de prueba de MercadoPago
- No uses tarjetas reales en desarrollo

### 5. Variables de entorno
- Siempre usa `VITE_` como prefijo
- Accede con `import.meta.env.VITE_VARIABLE`

---

## ✅ Checklist Pre-Deploy

Antes de cada deploy:

- [ ] ✅ Build local funciona: `npm run build`
- [ ] ✅ Preview local funciona: `npm run preview`
- [ ] ✅ No hay errores en consola
- [ ] ✅ Funcionalidades críticas probadas:
  - [ ] Login de pacientes
  - [ ] Login de profesionales
  - [ ] Búsqueda de profesionales
  - [ ] Inicio de consulta
  - [ ] Videollamada
  - [ ] Chat
  - [ ] Pago
- [ ] ✅ Variables de entorno correctas
- [ ] ✅ Supabase funcionando
- [ ] ✅ MercadoPago funcionando

---

## 📞 Ayuda Rápida

### Servidor no inicia
```bash
npm install
npm run dev
```

### Build falla
```bash
npm run build:prod
```

### Deploy falla
```bash
# Deploy manual con FileZilla:
# 1. npm run build
# 2. Subir dist/ al VPS manualmente
```

### WebRTC no funciona
- Verifica HTTPS activo
- Verifica permisos de cámara/micrófono
- Revisa console del navegador

### Base de datos no conecta
- Verifica Supabase Dashboard
- Revisa `src/lib/customSupabaseClient.js`
- Revisa Network tab para errores

---

## 🎓 Recursos

### Documentación
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía completa de deployment
- [README.md](README.md) - Documentación general
- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)

### Dashboards
- Supabase: https://supabase.com/dashboard
- MercadoPago: https://www.mercadopago.com.ar/developers

---

**¡Estás listo para desarrollar y desplegar ArgMed! 🚀**

Si tienes dudas, revisa:
1. Esta guía (QUICK_START.md)
2. Documentación de deployment (DEPLOYMENT.md)
3. README general (README.md)
