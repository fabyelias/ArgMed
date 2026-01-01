-- Fix admin RLS policies - remove problematic recursive policy and add corrected ones

-- First, drop the problematic policy if it exists
DROP POLICY IF EXISTS "Legal admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Legal admins can view all patients" ON public.users;
DROP POLICY IF EXISTS "Legal admins can view all professionals" ON public.professionals;
DROP POLICY IF EXISTS "Legal admins can view all consultations" ON public.consultations;
DROP POLICY IF EXISTS "Legal admins can view all professional documents" ON public.professional_documents;
DROP POLICY IF EXISTS "Legal admins can update professional verification" ON public.professionals;
DROP POLICY IF EXISTS "Legal admins can update professional documents" ON public.professional_documents;

-- Allow legal_admin to read all profiles (using legal_team table to avoid recursion)
CREATE POLICY "Legal admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);

-- Allow legal_admin to read all users (patients)
CREATE POLICY "Legal admins can view all patients"
ON public.users
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);

-- Allow legal_admin to read all professionals
CREATE POLICY "Legal admins can view all professionals"
ON public.professionals
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);

-- Allow legal_admin to read all consultations
CREATE POLICY "Legal admins can view all consultations"
ON public.consultations
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);

-- Allow legal_admin to read professional documents
CREATE POLICY "Legal admins can view all professional documents"
ON public.professional_documents
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);

-- Allow legal_admin to update professional verification status
CREATE POLICY "Legal admins can update professional verification"
ON public.professionals
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);

-- Allow legal_admin to update professional documents status
CREATE POLICY "Legal admins can update professional documents"
ON public.professional_documents
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.legal_team WHERE is_active = true
  )
);
