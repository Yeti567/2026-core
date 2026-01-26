-- ============================================================================
-- Migration: Certifications Storage Bucket
-- Description: Creates storage bucket for certificate files
-- ============================================================================

-- Create the certifications storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certifications',
  'certifications',
  false,
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage RLS Policies for Certifications Bucket
-- ============================================================================

-- Policy: Authenticated users can read their company's certificates
DROP POLICY IF EXISTS "Company members can view certificates" ON storage.objects;
CREATE POLICY "Company members can view certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certifications'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Admins and supervisors can upload certificates for their company
DROP POLICY IF EXISTS "Admins can upload certificates" ON storage.objects;
CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certifications'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'supervisor')
  )
);

-- Policy: Admins can update certificates for their company
DROP POLICY IF EXISTS "Admins can update certificates" ON storage.objects;
CREATE POLICY "Admins can update certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certifications'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'supervisor')
  )
);

-- Policy: Admins can delete certificates for their company
DROP POLICY IF EXISTS "Admins can delete certificates" ON storage.objects;
CREATE POLICY "Admins can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certifications'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- ============================================================================
-- Add storage path columns to worker_certifications if not exists
-- ============================================================================

DO $$
BEGIN
  -- Add certificate_image_path if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'worker_certifications' 
    AND column_name = 'certificate_image_path'
  ) THEN
    ALTER TABLE worker_certifications 
    ADD COLUMN certificate_image_path TEXT;
  END IF;

  -- Add thumbnail_path if it doesn't exist  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'worker_certifications' 
    AND column_name = 'thumbnail_path'
  ) THEN
    ALTER TABLE worker_certifications 
    ADD COLUMN thumbnail_path TEXT;
  END IF;

  -- Add file_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'worker_certifications' 
    AND column_name = 'file_type'
  ) THEN
    ALTER TABLE worker_certifications 
    ADD COLUMN file_type TEXT CHECK (file_type IN ('pdf', 'image'));
  END IF;
END
$$;

-- ============================================================================
-- Comment
-- ============================================================================


