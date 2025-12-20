-- ============================================================
-- EventNexus Storage Fix for Banner Uploads
-- ============================================================
-- Purpose: Update avatar bucket to support banner uploads
-- Problem: Banners use avatars bucket but need separate policies
-- ============================================================

BEGIN;

-- 1. Update avatars bucket size limit to 10MB (to handle pre-compression uploads)
-- ============================================================
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

-- 2. Add policies for banner uploads (banners/ folder)
-- ============================================================

-- Allow authenticated users to upload their own banners
DROP POLICY IF EXISTS "Users can upload their own banner" ON storage.objects;
CREATE POLICY "Users can upload their own banner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'banners'
  AND auth.uid()::text = (string_to_array((storage.foldername(name))[2], '-'))[1]
);

-- Allow authenticated users to update their own banners
DROP POLICY IF EXISTS "Users can update their own banner" ON storage.objects;
CREATE POLICY "Users can update their own banner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'banners'
  AND auth.uid()::text = (string_to_array((storage.foldername(name))[2], '-'))[1]
);

-- Allow everyone to view banners (public bucket)
DROP POLICY IF EXISTS "Anyone can view banners" ON storage.objects;
CREATE POLICY "Anyone can view banners"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'banners'
);

-- Allow authenticated users to delete their own banners
DROP POLICY IF EXISTS "Users can delete their own banner" ON storage.objects;
CREATE POLICY "Users can delete their own banner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'banners'
  AND auth.uid()::text = (string_to_array((storage.foldername(name))[2], '-'))[1]
);

COMMIT;

-- 3. Verification
-- ============================================================
SELECT 
  '✅ STORAGE FIX APPLIED' as status,
  '' as detail;

-- Check bucket settings
SELECT 
  '📦 Bucket Settings' as section,
  id as bucket,
  (file_size_limit / 1024 / 1024)::text || 'MB' as size_limit,
  array_length(allowed_mime_types, 1)::text || ' mime types' as mimes
FROM storage.buckets
WHERE id = 'avatars';

-- Check policies
SELECT 
  '🔒 Storage Policies' as section,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%avatar%' OR policyname LIKE '%banner%')
ORDER BY policyname;

-- Summary
SELECT 
  '📊 Summary' as section,
  'Avatars folder: ' || 
    (SELECT COUNT(*) FROM pg_policies 
     WHERE policyname LIKE '%avatar%')::text || ' policies' as avatars,
  'Banners folder: ' || 
    (SELECT COUNT(*) FROM pg_policies 
     WHERE policyname LIKE '%banner%')::text || ' policies' as banners;

-- Expected structure
SELECT 
  '📁 Expected Upload Structure' as section,
  'avatars/{userId}-{timestamp}.jpg → User profile pictures' as avatars_folder,
  'banners/{userId}-banner-{timestamp}.jpg → Profile banners' as banners_folder;

SELECT 
  '✅ Users can now upload:' as info,
  '• Avatars up to 10MB (compressed to ~500KB)' as avatars,
  '• Banners up to 10MB (compressed to ~800KB)' as banners,
  '• Both stored in "avatars" bucket' as storage;
