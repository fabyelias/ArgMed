-- ============================================
-- ARGMED - Agregar columnas photo_url
-- ============================================

-- Tabla profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN photo_url TEXT;
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
        ALTER TABLE users ADD COLUMN photo_url TEXT;
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
        ALTER TABLE professionals ADD COLUMN photo_url TEXT;
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
        ALTER TABLE legal_team ADD COLUMN photo_url TEXT;
    END IF;
END $$;
