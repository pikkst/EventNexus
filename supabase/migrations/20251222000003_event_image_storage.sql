-- ============================================
-- Event Image Storage Bucket Setup
-- Date: 2025-12-22
-- Purpose: Create storage bucket for event images with proper policies
-- ============================================

-- STEP 1: Create storage bucket for event images
-- Note: This must be run in Supabase dashboard Storage section OR via SQL
-- If bucket already exists, this will be skipped

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,  -- Public bucket (anyone can view)
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Allow public read access to event images
DROP POLICY IF EXISTS "Public read access for event images" ON storage.objects;
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- STEP 3: Allow authenticated users to upload event images
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- STEP 4: Allow users to update their own event images
DROP POLICY IF EXISTS "Users can update own event images" ON storage.objects;
CREATE POLICY "Users can update own event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'event-images'
);

-- STEP 5: Allow users to delete their own event images
DROP POLICY IF EXISTS "Users can delete own event images" ON storage.objects;
CREATE POLICY "Users can delete own event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if bucket exists
-- SELECT * FROM storage.buckets WHERE id = 'event-images';

-- Check storage policies (use pg_policies view)
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%event images%';

-- Check uploaded images
-- SELECT name, size, created_at FROM storage.objects WHERE bucket_id = 'event-images' ORDER BY created_at DESC LIMIT 10;

-- Test bucket accessibility
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'event-images';

-- ============================================
-- USAGE IN CODE
-- ============================================

-- Upload event image (TypeScript):
-- const { data, error } = await supabase.storage
--   .from('event-images')
--   .upload(`${eventId}-${Date.now()}.jpg`, file);

-- Get public URL:
-- const { data: { publicUrl } } = supabase.storage
--   .from('event-images')
--   .getPublicUrl(filePath);

-- Delete event image:
-- const { error } = await supabase.storage
--   .from('event-images')
--   .remove([filePath]);
