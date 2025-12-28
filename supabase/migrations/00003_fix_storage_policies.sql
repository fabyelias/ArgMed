-- Fix Storage Policies for Professional Documents
-- Created: 2025-12-27
-- Description: Drop and recreate storage policies to fix conflicts

-- ============================================================================
-- DROP EXISTING CONFLICTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Professionals can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Legal team can view all documents" ON storage.objects;

-- ============================================================================
-- CREATE STORAGE POLICIES FOR DOCTOR-DOCUMENTS BUCKET
-- ============================================================================

-- Professionals can upload their own documents
CREATE POLICY "Professionals can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'doctor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Professionals can view their own documents
CREATE POLICY "Professionals can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'doctor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Professionals can update their own documents
CREATE POLICY "Professionals can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'doctor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'doctor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Professionals can delete their own documents
CREATE POLICY "Professionals can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'doctor-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Legal team can view all documents (oversight)
CREATE POLICY "Legal team can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'doctor-documents'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'legal_admin')
    )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Professionals can upload own documents" ON storage.objects IS
'Allows professionals to upload documents to their own folder in doctor-documents bucket';

COMMENT ON POLICY "Legal team can view all documents" ON storage.objects IS
'Allows legal team oversight of all professional documents';
