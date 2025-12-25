# 🗄️ Supabase Database Setup - ArgMed

## 📊 Información del Proyecto

- **Project ID:** msnppinpethxfxskfgsv
- **URL:** https://msnppinpethxfxskfgsv.supabase.co
- **Database:** PostgreSQL 15
- **Region:** (verificar en dashboard)

---

## 🚀 Configurar Base de Datos desde Cero

### Método 1: SQL Editor en Supabase Dashboard (Recomendado)

1. **Ir al SQL Editor:**
   - Abre: https://msnppinpethxfxskfgsv.supabase.co/project/msnppinpethxfxskfgsv/sql

2. **Ejecutar la migración:**
   - Copia todo el contenido de `migrations/00001_initial_schema.sql`
   - Pégalo en el SQL Editor
   - Click en **"Run"** o presiona `Ctrl+Enter`

3. **Verificar:**
   - Ve a **Table Editor** para ver las tablas creadas
   - Deberías ver: profiles, users, professionals, consultations, etc.

### Método 2: CLI de Supabase

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref msnppinpethxfxskfgsv

# Ejecutar migraciones
supabase db push
```

### Método 3: psql (Línea de comandos)

```bash
# Conectarse a la base de datos
psql "postgresql://postgres:[YOUR-PASSWORD]@db.msnppinpethxfxskfgsv.supabase.co:5432/postgres"

# Ejecutar el archivo SQL
\i supabase/migrations/00001_initial_schema.sql

# Verificar tablas
\dt
```

---

## 📋 Estructura de la Base de Datos

### Tablas Principales

#### 1. **profiles** (Perfiles base)
- Usuario base para todos los roles
- Campos: id, role, full_name, photo_url, phone

#### 2. **users** (Pacientes)
- Información específica de pacientes
- Campos: dni, first_name, last_name, email, birth_date

#### 3. **professionals** (Profesionales médicos)
- Información de médicos
- Campos: specialization, license_number, consultation_fee, payment_alias
- Verificación: verification_status (pending/approved/rejected)

#### 4. **professional_documents** (Documentos de verificación)
- Matrícula, DNI, título
- Status: pending/approved/rejected

#### 5. **consultations** (Consultas médicas)
- Registro completo de consultas
- Estados: pending, accepted, in_progress, completed
- Payment: pending, paid, refunded

#### 6. **consultation_requests** (Sistema de enrutamiento inteligente)
- Solicitudes de consulta automáticas
- Cicla entre doctores disponibles

#### 7. **payments** (Pagos)
- Transacciones de MercadoPago
- División: 90% doctor, 10% plataforma

#### 8. **transfers** (Transferencias a profesionales)
- Distribución automática de fondos

#### 9. **chat_messages** (Chat en tiempo real)
- Mensajería durante consultas

#### 10. **notifications** (Notificaciones)
- Alertas para usuarios

#### 11. **legal_team** (Equipo legal)
- Acceso especial para supervisión

---

## 🔐 Seguridad (RLS - Row Level Security)

Todas las tablas tienen **Row Level Security habilitado**:

- ✅ Usuarios solo ven sus propios datos
- ✅ Pacientes solo ven sus consultas
- ✅ Doctores solo ven sus consultas
- ✅ Profesionales aprobados son públicos (para búsqueda)
- ✅ Chat protegido por consulta
- ✅ Documentos solo visibles para dueño y admins

---

## 📦 Storage Buckets

### Buckets creados:

1. **avatars** (público)
   - Fotos de perfil de usuarios
   - Acceso: Público para lectura

2. **professional_documents** (privado)
   - Matrícula médica, DNI, títulos
   - Acceso: Solo profesional y admins

3. **chat_files** (privado)
   - Archivos compartidos en chat
   - Acceso: Solo participantes de la consulta

---

## 🔍 Verificar Instalación

### Desde SQL Editor:

```sql
-- Ver todas las tablas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Contar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Ver buckets de storage
SELECT * FROM storage.buckets;
```

### Resultado esperado:
```
✅ 11 tablas creadas
✅ 15+ políticas RLS activas
✅ 3 buckets de storage
✅ Triggers de updated_at funcionando
✅ Índices para performance
```

---

## 🛠️ Comandos Útiles

### Ver estructura de una tabla:
```sql
\d+ public.professionals
```

### Ver políticas RLS de una tabla:
```sql
SELECT * FROM pg_policies WHERE tablename = 'consultations';
```

### Insertar datos de prueba:
```sql
-- Ejemplo: Crear un perfil de prueba
INSERT INTO public.profiles (id, role, full_name)
VALUES (gen_random_uuid(), 'patient', 'Test Patient');
```

---

## 📝 Migraciones Futuras

Para agregar nuevas tablas o modificar existentes:

1. Crear nuevo archivo en `migrations/`:
   ```
   00002_add_new_feature.sql
   00003_modify_consultations.sql
   ```

2. Ejecutar en orden numérico

3. Documentar cambios en este README

---

## 🔄 Conexión desde la Aplicación

La aplicación se conecta automáticamente usando:

```javascript
// src/lib/customSupabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msnppinpethxfxskfgsv.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Variables en `.env`:
```
VITE_SUPABASE_URL=https://msnppinpethxfxskfgsv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 🆘 Troubleshooting

### Error: "permission denied for schema public"
**Solución:** Verifica que estés usando la contraseña correcta del proyecto

### Error: "relation already exists"
**Solución:** Las tablas ya existen, usa `DROP TABLE` si quieres recrear:
```sql
-- ⚠️ CUIDADO: Esto borra todos los datos
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Luego ejecuta el migration again
```

### RLS bloqueando queries
**Solución:** Verifica que el usuario esté autenticado:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

---

## 📚 Referencias

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**🎯 Base de datos lista para ArgMed!**
