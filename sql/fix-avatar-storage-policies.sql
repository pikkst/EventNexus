-- Fix Avatar Upload Storage Policies
-- This fixes the RLS policy mismatch causing "new row violates row-level security policy" error
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Drop existing restrictive policies
-- ============================================

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- ============================================
-- PART 2: Create corrected policies matching actual upload paths
-- ============================================

-- Allow authenticated users to upload avatars and banners
-- Matches paths: avatars/{userId}-{timestamp}.{ext} and banners/{userId}-banner-{timestamp}.{ext}
CREATE POLICY "Users can upload their own avatar and banner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
    -- Match avatar uploads: avatars/98e14e29-eda3-4b9e-aa6e-22a229eaaeab-1766249438222.jpeg
    (name LIKE 'avatars/' || auth.uid()::text || '-%')
    OR
    -- Match banner uploads: banners/98e14e29-eda3-4b9e-aa6e-22a229eaaeab-banner-1766249438222.jpeg
    (name LIKE 'banners/' || auth.uid()::text || '-%')
  )
);

-- Allow authenticated users to update their own avatars and banners
CREATE POLICY "Users can update their own avatar and banner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (name LIKE 'avatars/' || auth.uid()::text || '-%')
    OR
    (name LIKE 'banners/' || auth.uid()::text || '-%')
  )
);

-- Allow everyone to view avatars and banners (public bucket)
CREATE POLICY "Anyone can view avatars and banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their own avatars and banners
CREATE POLICY "Users can delete their own avatar and banner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (name LIKE 'avatars/' || auth.uid()::text || '-%')
    OR
    (name LIKE 'banners/' || auth.uid()::text || '-%')
  )
);

-- ============================================
-- PART 3: Ensure bucket is properly configured
-- ============================================

-- Update bucket settings to allow larger files and proper mime types
UPDATE storage.buckets
SET 
  public = true,
  file_size_limit = 10485760, -- 10MB to handle pre-compression uploads
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

-- ============================================
-- PART 4: Verify policies are active
-- ============================================

SELECT 
    '✅ STORAGE POLICIES CHECK' as test,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN policyname LIKE '%avatar%' OR policyname LIKE '%banner%' 
        THEN '✅ Policy active'
        ELSE 'ℹ️ Other policy'
    END as status
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%' OR policyname LIKE '%banner%'
ORDER BY policyname;

-- Check bucket configuration
SELECT 
    '✅ BUCKET CONFIG CHECK' as test,
    id as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types,
    CASE 
        WHEN public = true AND file_size_limit >= 10485760 
        THEN '✅ Bucket properly configured'
        ELSE '⚠️ Check bucket settings'
    END as status
FROM storage.buckets
WHERE id = 'avatars';
