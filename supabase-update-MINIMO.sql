-- ============================================
-- ARGMED - Actualización MÍNIMA (Solo payload)
-- ============================================

-- Solo agregar la columna payload si no existe
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
    END IF;
END $$;
