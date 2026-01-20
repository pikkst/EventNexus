-- Supabase Storage Bucket Setup for Event Memories
-- Run this in Supabase SQL Editor to create storage bucket and policies
-- Created: 2026-01-20

-- Create the event-memories bucket (if it doesn't exist)
-- Note: You may need to create this via Supabase Dashboard > Storage if this fails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-memories',
  'event-memories',
  true, -- Public bucket for easy access
  10485760, -- 10MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-memories bucket

-- Policy: Anyone can view memories (public bucket)
CREATE POLICY "Public memories are viewable by anyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-memories');

-- Policy: Authenticated users can upload their own memories
CREATE POLICY "Users can upload their own memories"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-memories' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own memories
CREATE POLICY "Users can update their own memories"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-memories' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own memories
CREATE POLICY "Users can delete their own memories"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-memories' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Comments
COMMENT ON POLICY "Public memories are viewable by anyone" ON storage.objects IS 'Allow public read access to event memory media';
COMMENT ON POLICY "Users can upload their own memories" ON storage.objects IS 'Users can only upload to their own user_id folder';
COMMENT ON POLICY "Users can delete their own memories" ON storage.objects IS 'Users can only delete their own uploaded media';

-- Note: File path structure will be: {user_id}/{event_id}/{filename}
-- Example: 550e8400-e29b-41d4-a716-446655440000/abc123.../photo_1.jpg
