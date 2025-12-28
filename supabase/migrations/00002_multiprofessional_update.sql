-- ArgMed - Multiprofessional Platform Update
-- Created: 2025-12-27
-- Description: Update schema to support multiple professional types with automatic approval

-- ============================================================================
-- UPDATE PROFESSIONALS TABLE
-- ============================================================================

-- Add professional_type field (free text for any profession)
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS professional_type TEXT;

-- Update specialization to be nullable and rename it conceptually
-- (we'll keep 'specialization' for backward compatibility but use professional_type going forward)
ALTER TABLE public.professionals
ALTER COLUMN specialization DROP NOT NULL;

-- Make license_number nullable initially (some professionals might not have one yet)
ALTER TABLE public.professionals
ALTER COLUMN license_number DROP NOT NULL;

-- Drop unique constraint on license_number to allow professionals to update it
ALTER TABLE public.professionals
DROP CONSTRAINT IF EXISTS professionals_license_number_key;

-- Add new verification statuses for auto-approval flow
-- New flow: pending -> submitted -> approved (automatic)
-- Old 'rejected' status removed since there's no manual review
ALTER TABLE public.professionals
DROP CONSTRAINT IF EXISTS professionals_verification_status_check;

ALTER TABLE public.professionals
ADD CONSTRAINT professionals_verification_status_check
CHECK (verification_status IN ('pending', 'submitted', 'approved'));

-- ============================================================================
-- UPDATE PROFESSIONAL_DOCUMENTS TABLE
-- ============================================================================

-- Change structure to support consolidated documents per professional
-- Instead of separate rows per document type, use columns for each document

-- First, backup the old structure if needed, then drop and recreate
DROP TABLE IF EXISTS public.professional_documents_old;

-- Create new consolidated structure
CREATE TABLE IF NOT EXISTS public.professional_documents_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID UNIQUE NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,

    -- License number
    national_license TEXT,
    provincial_license TEXT,

    -- Document URLs
    title_document TEXT, -- Diploma/Certificate
    dni_front TEXT,
    dni_back TEXT,

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
    rejection_reason TEXT,

    -- Terms acceptance
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate existing data if any
INSERT INTO public.professional_documents_new (professional_id, national_license, provincial_license, title_document, dni_front, dni_back, status, created_at, updated_at)
SELECT
    professional_id,
    MAX(CASE WHEN document_type = 'title_document' THEN file_path END) as national_license,
    NULL as provincial_license,
    MAX(CASE WHEN document_type = 'title_document' THEN file_path END) as title_document,
    MAX(CASE WHEN document_type = 'dni_front' THEN file_path END) as dni_front,
    MAX(CASE WHEN document_type = 'dni_back' THEN file_path END) as dni_back,
    MAX(status) as status,
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at
FROM public.professional_documents
GROUP BY professional_id
ON CONFLICT (professional_id) DO NOTHING;

-- Drop old table and rename new one
DROP TABLE IF EXISTS public.professional_documents CASCADE;
ALTER TABLE public.professional_documents_new RENAME TO professional_documents;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Add index for professional_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_professionals_type ON public.professionals(professional_type);

-- Update existing index
DROP INDEX IF EXISTS idx_professionals_specialization;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.professional_documents ENABLE ROW LEVEL SECURITY;

-- Professionals can view and update their own documents
CREATE POLICY "Professionals can view own documents" ON public.professional_documents
    FOR SELECT USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can insert own documents" ON public.professional_documents
    FOR INSERT WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Professionals can update own documents" ON public.professional_documents
    FOR UPDATE USING (auth.uid() = professional_id);

-- Legal team can view all documents (for oversight, even though no approval needed)
CREATE POLICY "Legal team can view all documents" ON public.professional_documents
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

-- Update timestamp trigger for professional_documents
CREATE TRIGGER update_professional_documents_updated_at
    BEFORE UPDATE ON public.professional_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.professionals.professional_type IS 'Type of professional: médico, abogado, gasista, electricista, psicólogo, etc.';
COMMENT ON COLUMN public.professional_documents.national_license IS 'National license/registration number';
COMMENT ON COLUMN public.professional_documents.provincial_license IS 'Provincial license/registration number';
COMMENT ON COLUMN public.professional_documents.title_document IS 'URL to diploma/certificate/title document';
COMMENT ON COLUMN public.professional_documents.terms_accepted IS 'Whether professional accepted terms and conditions during onboarding';
