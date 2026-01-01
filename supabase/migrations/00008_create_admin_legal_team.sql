-- Create legal_team table for super admin users
-- This table stores admin users who have full access to the platform

CREATE TABLE IF NOT EXISTS public.legal_team (
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

-- Create the super admin user profile first
-- Note: This will fail if the user doesn't exist in auth.users
-- You need to create the user in Supabase Auth Dashboard first with:
-- Email: melinexoba@argmed.com
-- Password: GrupoNexoBA2025

-- After creating the auth user, run this to get the UUID and insert into profiles and legal_team:
-- INSERT INTO public.profiles (id, role, full_name, terms_accepted)
-- SELECT id, 'legal_admin', 'MelinexoBA', true
-- FROM auth.users
-- WHERE email = 'melinexoba@argmed.com';

-- INSERT INTO public.legal_team (id, email, full_name, role)
-- SELECT id, 'melinexoba@argmed.com', 'MelinexoBA', 'super_admin'
-- FROM auth.users
-- WHERE email = 'melinexoba@argmed.com';
