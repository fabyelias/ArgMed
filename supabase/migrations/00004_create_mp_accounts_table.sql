-- Create Mercado Pago Professional Accounts Table
-- Created: 2025-12-27
-- Description: Table to store Mercado Pago account connections for professionals

-- ============================================================================
-- CREATE MP_PROFESSIONAL_ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mp_professional_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID UNIQUE NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,

    -- Mercado Pago OAuth Data
    access_token TEXT,
    refresh_token TEXT,
    user_id_mp TEXT, -- Mercado Pago User ID
    public_key TEXT,

    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_refreshed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mp_accounts_professional_id ON public.mp_professional_accounts(professional_id);
CREATE INDEX IF NOT EXISTS idx_mp_accounts_user_id_mp ON public.mp_professional_accounts(user_id_mp);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.mp_professional_accounts ENABLE ROW LEVEL SECURITY;

-- Professionals can view their own MP account
CREATE POLICY "Professionals can view own MP account" ON public.mp_professional_accounts
    FOR SELECT USING (auth.uid() = professional_id);

-- Professionals can insert their own MP account
CREATE POLICY "Professionals can insert own MP account" ON public.mp_professional_accounts
    FOR INSERT WITH CHECK (auth.uid() = professional_id);

-- Professionals can update their own MP account
CREATE POLICY "Professionals can update own MP account" ON public.mp_professional_accounts
    FOR UPDATE USING (auth.uid() = professional_id)
    WITH CHECK (auth.uid() = professional_id);

-- Admins can view all MP accounts
CREATE POLICY "Admins can view all MP accounts" ON public.mp_professional_accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'legal_admin')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE TRIGGER update_mp_professional_accounts_updated_at
    BEFORE UPDATE ON public.mp_professional_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.mp_professional_accounts IS 'Stores Mercado Pago OAuth connection data for professionals to receive payments';
COMMENT ON COLUMN public.mp_professional_accounts.access_token IS 'Mercado Pago OAuth access token for API calls';
COMMENT ON COLUMN public.mp_professional_accounts.user_id_mp IS 'Mercado Pago user ID (collector_id)';
COMMENT ON COLUMN public.mp_professional_accounts.is_active IS 'Whether the MP account connection is currently active';
