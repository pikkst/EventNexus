-- ============================================================
-- EventNexus AI Generated Images Storage Setup
-- ============================================================
-- Purpose: Create storage bucket for AI-generated marketing materials
-- ============================================================

-- Create storage bucket for event images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for event-images bucket
CREATE POLICY IF NOT EXISTS "Public Access to event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY IF NOT EXISTS "Users can update their own event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete their own event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Display success message
SELECT 
  '✅ STORAGE SETUP COMPLETE' as status,
  'event-images bucket created with public access' as message,
  'AI-generated images will be stored in ai-generated/ folder' as note;

-- Show bucket details
SELECT 
  id,
  name,
  CASE WHEN public THEN '✅ Public' ELSE '⚠️ Private' END as access,
  created_at
FROM storage.buckets
WHERE id = 'event-images';
