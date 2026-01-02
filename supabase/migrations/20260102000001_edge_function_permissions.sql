-- ============================================
-- Edge Function Permissions for upload-social-video
-- ============================================
-- Grants necessary permissions for Edge Functions to access tables
-- Service role bypasses RLS but we add explicit grants for clarity
-- ============================================

-- Grant Edge Functions (service_role) access to social_media_accounts
GRANT SELECT ON public.social_media_accounts TO service_role;
GRANT SELECT ON public.users TO service_role;

-- Create policy for Edge Functions to read social accounts
-- This allows the Edge Function to verify account ownership and get tokens
CREATE POLICY "Edge Functions can read social accounts for uploads"
    ON public.social_media_accounts
    FOR SELECT
    TO service_role
    USING (true);

-- Create policy for Edge Functions to read user profiles
CREATE POLICY "Edge Functions can read user profiles"
    ON public.users
    FOR SELECT
    TO service_role
    USING (true);

-- Optional: Create video_uploads table to track upload history
CREATE TABLE IF NOT EXISTS public.video_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
    video_url TEXT NOT NULL,
    caption TEXT,
    thumbnail_url TEXT,
    external_post_id TEXT,
    upload_status TEXT NOT NULL DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for video uploads
CREATE INDEX IF NOT EXISTS idx_video_uploads_user_id ON public.video_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_video_uploads_platform ON public.video_uploads(platform);
CREATE INDEX IF NOT EXISTS idx_video_uploads_status ON public.video_uploads(upload_status);

-- RLS for video_uploads
ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video uploads"
    ON public.video_uploads
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own video uploads"
    ON public.video_uploads
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Edge Functions can manage video uploads"
    ON public.video_uploads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can view all video uploads"
    ON public.video_uploads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Grant Edge Functions access to video_uploads
GRANT ALL ON public.video_uploads TO service_role;

-- Add comments
COMMENT ON TABLE public.video_uploads IS 'Tracks video uploads to social media platforms from Professional Ad Creator';
COMMENT ON COLUMN public.video_uploads.external_post_id IS 'Post/video ID returned by social platform API';
COMMENT ON COLUMN public.video_uploads.upload_status IS 'Current status of the upload: uploading, success, or failed';
