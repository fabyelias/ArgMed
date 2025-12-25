# 🏥 ArgMed - Plataforma de Telemedicina

Plataforma integral de telemedicina para el mercado argentino que conecta pacientes con profesionales médicos a través de videoconsultas seguras.

## 🌐 Producción

- **URL:** https://argmed.online
- **VPS:** 89.117.32.202 (Hostinger)
- **Base de Datos:** Supabase
- **Pagos:** MercadoPago

---

## ✨ Características Principales

### Para Pacientes 👨‍⚕️
- ✅ Registro simple con DNI argentino
- 🔍 Búsqueda de profesionales por especialidad
- 🗺️ Búsqueda geolocalizada de profesionales cercanos
- 💳 Pagos seguros con MercadoPago
- 🎥 Videoconsultas en tiempo real (WebRTC)
- 💬 Chat en vivo durante consultas
- 📋 Historial médico completo

### Para Profesionales 👨‍⚕️
- ✅ Registro con verificación de matrícula médica
- 📄 Verificación de documentos por administradores
- 💰 Recepción automática de pagos (90% de la consulta)
- 📞 Sistema de aceptación de consultas
- 🎥 Sala de videoconsulta integrada
- 💬 Chat con pacientes
- 📊 Historial de consultas

### Para Administradores 🔐
- 👥 Gestión de usuarios (pacientes y profesionales)
- ✅ Aprobación de documentación médica
- 📊 Dashboard con estadísticas
- 🔒 Configuración de seguridad

### Para Equipo Legal ⚖️
- 📋 Supervisión de la plataforma
- 🔍 Auditoría de consultas
- ✅ Cumplimiento normativo

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 18.2** - Framework UI
- **Vite 4.4** - Build tool ultrarrápido
- **React Router 6** - Navegación
- **Tailwind CSS** - Estilos utility-first
- **Radix UI** - Componentes accesibles
- **Framer Motion** - Animaciones
- **Lucide React** - Iconos

### Backend & Servicios
- **Supabase** - BaaS completo
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage
  - Edge Functions
- **MercadoPago** - Procesamiento de pagos
- **WebRTC** - Videollamadas P2P

### Comunicación en Tiempo Real
- **Supabase Realtime** - Señalización WebRTC
- **WebRTC** - Peer-to-peer video/audio
- **Custom hooks** - useWebRTC, useChat

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Git

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/argmed.git
cd argmed

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus credenciales
# VITE_MP_PUBLIC_KEY=tu_clave_mercadopago
# VITE_PLATFORM_ADMIN_ALIAS=tu_alias_mercadopago

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo (puerto 3000)

# Build
npm run build            # Build de producción
npm run build:prod       # Build directo sin generación de LLMs
npm run preview          # Previsualizar build de producción

# Deployment
npm run deploy           # Deploy automático a VPS (PowerShell)
npm run deploy:bash      # Deploy automático a VPS (Bash)

# Calidad de código
npm run lint             # Ejecutar ESLint
```

---

## 🏗️ Estructura del Proyecto

```
ArgMed/
├── public/              # Assets estáticos
│   ├── .htaccess       # Configuración Apache
│   ├── sw.js           # Service Worker (PWA)
│   └── argmed-logo.svg
├── src/
│   ├── components/     # Componentes reutilizables
│   │   ├── ui/        # Componentes UI base (Radix wrappers)
│   │   ├── layouts/   # Layouts por rol
│   │   └── ...
│   ├── pages/         # Páginas de la aplicación
│   │   ├── patient/   # Portal de pacientes
│   │   ├── professional/ # Portal de profesionales
│   │   ├── admin/     # Dashboard administrativo
│   │   └── legal/     # Interfaz equipo legal
│   ├── contexts/      # React Context (estado global)
│   │   ├── AuthContext.jsx
│   │   ├── ConsultationContext.jsx
│   │   └── NotificationContext.jsx
│   ├── hooks/         # Custom hooks
│   │   ├── useWebRTC.js
│   │   ├── useChat.js
│   │   └── useDoctorRegistration.js
│   ├── services/      # Lógica de negocio
│   │   └── paymentService.js
│   ├── lib/           # Utilidades y configuración
│   │   ├── customSupabaseClient.js
│   │   └── utils.js
│   ├── App.jsx        # Componente principal
│   ├── main.jsx       # Entry point
│   └── index.css      # Estilos globales
├── plugins/           # Plugins de Vite
├── .env               # Variables de entorno (no commitear)
├── .env.example       # Ejemplo de variables de entorno
├── vite.config.js     # Configuración de Vite
├── tailwind.config.js # Configuración de Tailwind
├── deploy.sh          # Script de deployment (Bash)
├── deploy.ps1         # Script de deployment (PowerShell)
├── DEPLOYMENT.md      # Guía de deployment
└── README.md          # Este archivo
```

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# MercadoPago
VITE_MP_PUBLIC_KEY=tu_clave_publica_mercadopago
VITE_PLATFORM_ADMIN_ALIAS=tu_alias_mercadopago

# Producción
VITE_PRODUCTION_URL=https://argmed.online
```

**Nota:** La configuración de Supabase está en `src/lib/customSupabaseClient.js`

---

## 💳 Sistema de Pagos

- **Plataforma:** MercadoPago (Argentina)
- **División de ingresos:**
  - 90% para el profesional
  - 10% comisión de plataforma
- **Flujo:**
  1. Paciente solicita consulta
  2. Profesional acepta
  3. Paciente realiza pago
  4. Fondos se distribuyen automáticamente
  5. Videoconsulta habilitada

---

## 🎥 Sistema de Videollamadas

- **Tecnología:** WebRTC (peer-to-peer)
- **Señalización:** Supabase Realtime
- **STUN Servers:** Google STUN
- **Características:**
  - Video HD en tiempo real
  - Audio bidireccional
  - Chat integrado
  - Controles de mute/video
  - Conexión directa (baja latencia)

---

## 🔒 Seguridad

- ✅ Autenticación con Supabase Auth
- ✅ Row Level Security (RLS) en base de datos
- ✅ Verificación de matrícula médica
- ✅ HTTPS obligatorio (SSL)
- ✅ Sesiones con timeout automático
- ✅ Protección de rutas por rol
- ✅ Encriptación end-to-end en videollamadas
- ✅ Pagos procesados por MercadoPago (PCI compliant)

---

## 🚀 Deployment

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para guía completa de deployment.

### Deploy Rápido

```bash
# 1. Generar build
npm run build

# 2. Desplegar automáticamente
npm run deploy
```

El script:
- ✅ Crea backup en VPS
- ✅ Sube archivos
- ✅ Configura permisos
- ✅ Actualiza .htaccess

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

- `profiles` - Perfil base de usuario
- `users` - Datos de pacientes
- `professionals` - Datos de médicos
- `consultations` - Registro de consultas
- `consultation_requests` - Sistema de enrutamiento
- `payments` - Transacciones
- `transfers` - Distribución de fondos
- `chat_messages` - Mensajería
- `professional_documents` - Verificación
- `notifications` - Notificaciones en tiempo real

---

## 📱 Progressive Web App (PWA)

La aplicación incluye características PWA:

- ✅ Service Worker configurado
- ✅ Manifest para instalación
- ✅ Notificaciones push
- ✅ Funcionalidad offline (básica)
- ✅ Instalable en móviles

---

## 🧪 Testing

```bash
# Ejecutar tests (cuando se implementen)
npm test

# Coverage
npm run test:coverage
```

---

## 🐛 Debugging

### Logs del Frontend
- Abre DevTools en el navegador
- Pestaña Console para errores JavaScript
- Pestaña Network para llamadas API

### Logs de Supabase
- Supabase Dashboard > Logs
- Real-time monitoring de queries
- Error tracking

### Logs del VPS
```bash
ssh root@89.117.32.202
tail -f /var/log/apache2/argmed_error.log
```

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu rama de feature: `git checkout -b feature/AmazingFeature`
3. Commit tus cambios: `git commit -m 'Add some AmazingFeature'`
4. Push a la rama: `git push origin feature/AmazingFeature`
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y confidencial.

---

## 👥 Equipo

- **Desarrollo:** Tu equipo
- **Hosting:** Hostinger VPS
- **Base de Datos:** Supabase
- **Pagos:** MercadoPago

---

## 📞 Soporte

Para problemas técnicos:
- Revisa [DEPLOYMENT.md](DEPLOYMENT.md)
- Abre un issue en el repositorio
- Contacta al equipo de desarrollo

---

## 🎯 Roadmap

- [ ] Tests unitarios y de integración
- [ ] CI/CD con GitHub Actions
- [ ] Monitoring y analytics
- [ ] Notificaciones push
- [ ] App móvil nativa (React Native)
- [ ] Sistema de valoraciones
- [ ] Recetas médicas digitales
- [ ] Integración con obras sociales

---

**¡Gracias por usar ArgMed! 🏥💙**
