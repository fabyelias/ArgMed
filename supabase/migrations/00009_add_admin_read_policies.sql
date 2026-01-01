-- Add RLS policies to allow legal_admin to read all data for admin panel
-- This allows super admins to view users, professionals, and consultations

-- Allow legal_admin to read all users (patients)
CREATE POLICY "Legal admins can view all patients"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
);

-- Allow legal_admin to read all professionals
CREATE POLICY "Legal admins can view all professionals"
ON public.professionals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
);

-- Allow legal_admin to read all consultations
CREATE POLICY "Legal admins can view all consultations"
ON public.consultations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
);

-- Allow legal_admin to read all profiles
CREATE POLICY "Legal admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'legal_admin'
  )
);

-- Allow legal_admin to read professional documents
CREATE POLICY "Legal admins can view all professional documents"
ON public.professional_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
);

-- Allow legal_admin to update professional verification status
CREATE POLICY "Legal admins can update professional verification"
ON public.professionals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
);

-- Allow legal_admin to update professional documents status
CREATE POLICY "Legal admins can update professional documents"
ON public.professional_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'legal_admin'
  )
);
