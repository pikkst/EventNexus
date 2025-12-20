-- ============================================
-- Social Media Integration
-- ============================================
-- Tables for social media account connections and post scheduling
-- ============================================

-- Social media accounts table
CREATE TABLE IF NOT EXISTS public.social_media_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
    account_id TEXT NOT NULL,
    account_name TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    is_connected BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, account_id)
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS public.social_media_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')),
    content TEXT NOT NULL,
    image_url TEXT,
    scheduled_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
    external_post_id TEXT,
    error_message TEXT,
    metrics JSONB DEFAULT '{"likes": 0, "shares": 0, "comments": 0, "clicks": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign social content table (stores AI-generated social media content)
CREATE TABLE IF NOT EXISTS public.campaign_social_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    facebook_content JSONB,
    instagram_content JSONB,
    twitter_content JSONB,
    linkedin_content JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_media_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_media_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_campaign_id ON public.social_media_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_media_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_social_content_campaign_id ON public.campaign_social_content(campaign_id);

-- RLS Policies for social_media_accounts
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social accounts"
    ON public.social_media_accounts
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own social accounts"
    ON public.social_media_accounts
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all social accounts"
    ON public.social_media_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- RLS Policies for social_media_posts
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own social posts"
    ON public.social_media_posts
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own social posts"
    ON public.social_media_posts
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all social posts"
    ON public.social_media_posts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- RLS Policies for campaign_social_content
ALTER TABLE public.campaign_social_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign social content"
    ON public.campaign_social_content
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage campaign social content"
    ON public.campaign_social_content
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Function to update social post metrics
CREATE OR REPLACE FUNCTION increment_social_post_metric(
    p_post_id UUID,
    p_metric TEXT,
    p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.social_media_posts
    SET 
        metrics = jsonb_set(
            metrics,
            ARRAY[p_metric],
            to_jsonb((COALESCE((metrics->p_metric)::integer, 0) + p_amount))
        ),
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark post as posted
CREATE OR REPLACE FUNCTION mark_post_as_posted(
    p_post_id UUID,
    p_external_post_id TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.social_media_posts
    SET 
        status = 'posted',
        posted_at = NOW(),
        external_post_id = p_external_post_id,
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark post as failed
CREATE OR REPLACE FUNCTION mark_post_as_failed(
    p_post_id UUID,
    p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.social_media_posts
    SET 
        status = 'failed',
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add credit usage tracking to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'total_credits_used') THEN
        ALTER TABLE public.users ADD COLUMN total_credits_used INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'credits_added') THEN
        ALTER TABLE public.users ADD COLUMN credits_added INTEGER DEFAULT 0;
    END IF;
END $$;

-- Function to track credit usage
CREATE OR REPLACE FUNCTION track_credit_usage(
    p_user_id UUID,
    p_feature TEXT,
    p_credits_used INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Update total credits used
    UPDATE public.users
    SET total_credits_used = COALESCE(total_credits_used, 0) + p_credits_used
    WHERE id = p_user_id;
    
    -- Log the usage (could be extended to a credit_usage_log table if needed)
    INSERT INTO public.notifications (user_id, title, message, type, "isRead", timestamp)
    VALUES (
        p_user_id,
        'Credits Used',
        format('You used %s credits for %s', p_credits_used, p_feature),
        'system',
        false,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.social_media_accounts IS 'Stores connected social media accounts for users';
COMMENT ON TABLE public.social_media_posts IS 'Stores scheduled and posted social media content';
COMMENT ON TABLE public.campaign_social_content IS 'Stores AI-generated social media content for campaigns';
COMMENT ON FUNCTION increment_social_post_metric IS 'Atomically increment social post engagement metrics';
COMMENT ON FUNCTION track_credit_usage IS 'Track credit usage by users for analytics and notifications';
