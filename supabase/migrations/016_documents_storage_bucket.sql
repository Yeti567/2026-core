-- ============================================================================
-- Migration: Documents Storage Bucket
-- Description: Creates storage bucket for document files including PDFs
-- ============================================================================

-- Create the documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB max file size
  ARRAY[
    'application/pdf',
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage RLS Policies for Documents Bucket
-- ============================================================================

-- Policy: Authenticated users can read their company's documents
DROP POLICY IF EXISTS "Company members can view documents" ON storage.objects;
CREATE POLICY "Company members can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can upload documents for their company
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'internal_auditor', 'safety_coordinator')
  )
);

-- Policy: Admins can update documents for their company
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
CREATE POLICY "Admins can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'internal_auditor')
  )
);

-- Policy: Admins can delete documents for their company
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
