-- Create legal_team table for super admin users
-- This table stores admin users who have full access to the platform

-- Drop existing table if it exists (to ensure clean recreation)
DROP TABLE IF EXISTS public.legal_team CASCADE;

CREATE TABLE public.legal_team (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'legal_reviewer')),
    permissions JSONB DEFAULT '{"view_all": true, "edit_all": true, "delete_all": true, "manage_users": true, "manage_professionals": true, "view_analytics": true}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_legal_team_email ON public.legal_team(email);

-- Enable RLS
ALTER TABLE public.legal_team ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Legal team members can view their own data
CREATE POLICY "Legal team members can view own data"
ON public.legal_team
FOR SELECT
USING (auth.uid() = id);

-- RLS Policy: Legal team members can update their own last_login
CREATE POLICY "Legal team members can update own data"
ON public.legal_team
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.legal_team TO authenticated;

-- To create a super admin user:
-- 1. Create the user in Supabase Auth Dashboard
-- 2. Run the following SQL (replace EMAIL and USERNAME):
--
-- WITH user_data AS (
--     SELECT id FROM auth.users WHERE email = 'ADMIN_EMAIL_HERE'
-- )
-- INSERT INTO public.profiles (id, role, full_name, terms_accepted, created_at)
-- SELECT id, 'legal_admin', 'ADMIN_NAME_HERE', true, NOW()
-- FROM user_data
-- ON CONFLICT (id) DO NOTHING;
--
-- WITH user_data AS (
--     SELECT id FROM auth.users WHERE email = 'ADMIN_EMAIL_HERE'
-- )
-- INSERT INTO public.legal_team (id, email, full_name, role, is_active)
-- SELECT id, 'ADMIN_EMAIL_HERE', 'ADMIN_NAME_HERE', 'super_admin', true
-- FROM user_data;
