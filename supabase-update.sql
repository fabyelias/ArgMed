-- ============================================
-- ARGMED - Actualización de Base de Datos
-- Fecha: 2026-01-02
-- Descripción: Asegurar que las columnas payload existan en notifications
-- ============================================

-- 1. Agregar columna payload a la tabla notifications si no existe
-- Esta columna almacena datos JSON adicionales para las notificaciones
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        AND column_name = 'payload'
    ) THEN
        ALTER TABLE notifications
        ADD COLUMN payload JSONB;

        COMMENT ON COLUMN notifications.payload IS 'Datos adicionales para notificaciones (requestId, patientId, consultationId, etc.)';
    END IF;
END $$;

-- 2. Verificar que la columna photo_url existe en todas las tablas necesarias
-- Tabla profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE profiles
        ADD COLUMN photo_url TEXT;

        COMMENT ON COLUMN profiles.photo_url IS 'URL de la foto de perfil del usuario';
    END IF;
END $$;

-- Tabla users (pacientes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE users
        ADD COLUMN photo_url TEXT;

        COMMENT ON COLUMN users.photo_url IS 'URL de la foto de perfil del paciente';
    END IF;
END $$;

-- Tabla professionals (doctores)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'professionals'
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE professionals
        ADD COLUMN photo_url TEXT;

        COMMENT ON COLUMN professionals.photo_url IS 'URL de la foto de perfil del profesional';
    END IF;
END $$;

-- Tabla legal_team
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'legal_team'
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE legal_team
        ADD COLUMN photo_url TEXT;

        COMMENT ON COLUMN legal_team.photo_url IS 'URL de la foto de perfil del administrador legal';
    END IF;
END $$;

-- 3. Crear índices para mejorar el rendimiento de las consultas
-- Índice para búsquedas por patient_id en consultations
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id
ON consultations(patient_id);

-- Índice para búsquedas por doctor_id en consultations
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id
ON consultations(doctor_id);

-- Índice para búsquedas por user_id en medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_user_id
ON medical_records(user_id);

-- Índice para búsquedas por professional_id en medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_professional_id
ON medical_records(professional_id);

-- Índice para búsquedas por user_id y tipo en notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
ON notifications(user_id, type);

-- Índice para búsquedas por current_doctor_id en consultation_requests
CREATE INDEX IF NOT EXISTS idx_consultation_requests_current_doctor
ON consultation_requests(current_doctor_id);

-- ============================================
-- FIN DE LA ACTUALIZACIÓN
-- ============================================

-- Para verificar que todo se aplicó correctamente, ejecuta:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'payload';
