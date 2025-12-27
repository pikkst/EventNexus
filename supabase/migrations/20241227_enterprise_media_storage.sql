-- Enterprise Media Storage Buckets and Policies
-- This migration creates storage buckets for Enterprise tier media uploads
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets for different media types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- Enterprise landing page media
  ('enterprise-media', 'enterprise-media', true, 524288000, ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]),
  
  -- Event highlight media (images and videos)
  ('event-highlights', 'event-highlights', true, 524288000, ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]),
  
  -- Team member avatars
  ('team-avatars', 'team-avatars', true, 10485760, ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]),
  
  -- Partner logos
  ('partner-logos', 'partner-logos', true, 5242880, ARRAY[
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp'
  ]),
  
  -- Media coverage outlet logos
  ('media-logos', 'media-logos', true, 5242880, ARRAY[
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp'
  ]),
  
  -- Testimonial avatars
  ('testimonial-avatars', 'testimonial-avatars', true, 5242880, ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES - Enterprise Media
-- ============================================================================

-- Allow Enterprise users to upload to enterprise-media bucket
CREATE POLICY "Enterprise users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'enterprise-media' 
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) = 'enterprise'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Enterprise users to update their own media
CREATE POLICY "Enterprise users can update their media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'enterprise-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) = 'enterprise'
);

-- Allow Enterprise users to delete their own media
CREATE POLICY "Enterprise users can delete their media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'enterprise-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) = 'enterprise'
);

-- Public read access for enterprise-media
CREATE POLICY "Public read access for enterprise media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'enterprise-media');

-- ============================================================================
-- STORAGE POLICIES - Event Highlights
-- ============================================================================

-- Allow Pro+ users to upload event highlights
CREATE POLICY "Pro+ users can upload event highlights"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-highlights' 
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('pro', 'premium', 'enterprise')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Pro+ users to update their event highlights
CREATE POLICY "Pro+ users can update event highlights"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-highlights'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('pro', 'premium', 'enterprise')
);

-- Allow Pro+ users to delete their event highlights
CREATE POLICY "Pro+ users can delete event highlights"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-highlights'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('pro', 'premium', 'enterprise')
);

-- Public read access for event highlights
CREATE POLICY "Public read access for event highlights"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-highlights');

-- ============================================================================
-- STORAGE POLICIES - Team Avatars
-- ============================================================================

-- Allow Premium+ users to upload team avatars
CREATE POLICY "Premium+ users can upload team avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-avatars' 
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Premium+ users to update team avatars
CREATE POLICY "Premium+ users can update team avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
);

-- Allow Premium+ users to delete team avatars
CREATE POLICY "Premium+ users can delete team avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
);

-- Public read access for team avatars
CREATE POLICY "Public read access for team avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'team-avatars');

-- ============================================================================
-- STORAGE POLICIES - Partner Logos
-- ============================================================================

-- Allow Premium+ users to upload partner logos
CREATE POLICY "Premium+ users can upload partner logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-logos' 
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Premium+ users to update partner logos
CREATE POLICY "Premium+ users can update partner logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partner-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
);

-- Allow Premium+ users to delete partner logos
CREATE POLICY "Premium+ users can delete partner logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'partner-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
);

-- Public read access for partner logos
CREATE POLICY "Public read access for partner logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'partner-logos');

-- ============================================================================
-- STORAGE POLICIES - Media Logos
-- ============================================================================

-- Allow Enterprise users to upload media logos
CREATE POLICY "Enterprise users can upload media logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-logos' 
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) = 'enterprise'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Enterprise users to update media logos
CREATE POLICY "Enterprise users can update media logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) = 'enterprise'
);

-- Allow Enterprise users to delete media logos
CREATE POLICY "Enterprise users can delete media logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) = 'enterprise'
);

-- Public read access for media logos
CREATE POLICY "Public read access for media logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media-logos');

-- ============================================================================
-- STORAGE POLICIES - Testimonial Avatars
-- ============================================================================

-- Allow Premium+ users to upload testimonial avatars
CREATE POLICY "Premium+ users can upload testimonial avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'testimonial-avatars' 
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow Premium+ users to update testimonial avatars
CREATE POLICY "Premium+ users can update testimonial avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'testimonial-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
);

-- Allow Premium+ users to delete testimonial avatars
CREATE POLICY "Premium+ users can delete testimonial avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'testimonial-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT subscription_tier 
    FROM public.users 
    WHERE id = auth.uid()
  ) IN ('premium', 'enterprise')
);

-- Public read access for testimonial avatars
CREATE POLICY "Public read access for testimonial avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'testimonial-avatars');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's storage quota based on tier
CREATE OR REPLACE FUNCTION get_user_storage_quota(user_id uuid)
RETURNS bigint AS $$
DECLARE
  user_tier text;
  quota bigint;
BEGIN
  SELECT subscription_tier INTO user_tier
  FROM public.users
  WHERE id = user_id;
  
  CASE user_tier
    WHEN 'free' THEN quota := 104857600;      -- 100 MB
    WHEN 'pro' THEN quota := 1073741824;      -- 1 GB
    WHEN 'premium' THEN quota := 10737418240;  -- 10 GB
    WHEN 'enterprise' THEN quota := 53687091200; -- 50 GB
    ELSE quota := 104857600; -- Default 100 MB
  END CASE;
  
  RETURN quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user's current storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id uuid)
RETURNS bigint AS $$
DECLARE
  total_size bigint;
BEGIN
  SELECT COALESCE(SUM(size), 0) INTO total_size
  FROM storage.objects
  WHERE (storage.foldername(name))[1] = user_id::text;
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can upload more data
CREATE OR REPLACE FUNCTION can_user_upload(user_id uuid, file_size bigint)
RETURNS boolean AS $$
DECLARE
  quota bigint;
  usage bigint;
BEGIN
  quota := get_user_storage_quota(user_id);
  usage := get_user_storage_usage(user_id);
  
  RETURN (usage + file_size) <= quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_storage_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_storage_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_upload(uuid, bigint) TO authenticated;

-- ============================================================================
-- MEDIA TRACKING TABLE (optional - for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.media_uploads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bucket_id text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  media_type text CHECK (media_type IN ('image', 'video', 'logo', 'avatar')) NOT NULL,
  purpose text, -- 'hero', 'event-highlight', 'team', 'partner', 'testimonial', 'media-coverage'
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_processed boolean DEFAULT false,
  processed_at timestamptz,
  public_url text
);

-- Enable RLS
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploads
CREATE POLICY "Users can view their own media uploads"
ON public.media_uploads FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own uploads
CREATE POLICY "Users can insert their own media uploads"
ON public.media_uploads FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own uploads
CREATE POLICY "Users can update their own media uploads"
ON public.media_uploads FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own uploads
CREATE POLICY "Users can delete their own media uploads"
ON public.media_uploads FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_media_uploads_user_id ON public.media_uploads(user_id);
CREATE INDEX idx_media_uploads_bucket ON public.media_uploads(bucket_id);
CREATE INDEX idx_media_uploads_media_type ON public.media_uploads(media_type);
CREATE INDEX idx_media_uploads_purpose ON public.media_uploads(purpose);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Comment for documentation
COMMENT ON TABLE public.media_uploads IS 'Tracks all media uploads for analytics and management';
COMMENT ON FUNCTION get_user_storage_quota(uuid) IS 'Returns storage quota in bytes based on user subscription tier';
COMMENT ON FUNCTION get_user_storage_usage(uuid) IS 'Returns current storage usage in bytes for a user';
COMMENT ON FUNCTION can_user_upload(uuid, bigint) IS 'Checks if user has enough quota to upload a file';
