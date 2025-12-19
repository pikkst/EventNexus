-- ============================================
-- Admin Features: Campaigns & System Config
-- ============================================
-- Tables for platform campaigns and system configuration
-- ============================================

-- Campaigns table for platform growth campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    copy TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Active', 'Draft', 'Paused', 'Completed')),
    placement TEXT NOT NULL CHECK (placement IN ('landing_page', 'dashboard', 'both')),
    target TEXT NOT NULL CHECK (target IN ('attendees', 'organizers', 'all')),
    cta TEXT NOT NULL,
    image_url TEXT,
    tracking_code TEXT UNIQUE NOT NULL,
    incentive JSONB,
    metrics JSONB DEFAULT '{"views": 0, "clicks": 0, "guestSignups": 0, "proConversions": 0, "revenueValue": 0}'::jsonb,
    tracking JSONB DEFAULT '{"sources": {"facebook": 0, "x": 0, "instagram": 0, "direct": 0}}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user status fields for admin moderation
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- User sessions table for activity tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_placement ON public.campaigns(placement);
CREATE INDEX IF NOT EXISTS idx_campaigns_target ON public.campaigns(target);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ended_at ON public.user_sessions(ended_at);

-- RLS Policies for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to campaigns"
    ON public.campaigns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Public read access to active campaigns"
    ON public.campaigns
    FOR SELECT
    USING (status = 'Active');

-- RLS Policies for system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to system config"
    ON public.system_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- RLS Policies for user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
    ON public.user_sessions
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admin full access to sessions"
    ON public.user_sessions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Initialize default system configuration
INSERT INTO public.system_config (key, value) VALUES
    ('global_ticket_fee', '2.5'::jsonb),
    ('credit_value', '0.50'::jsonb),
    ('maintenance_mode', 'false'::jsonb),
    ('platform_name', '"EventNexus"'::jsonb),
    ('max_events_per_organizer', '100'::jsonb),
    ('max_tickets_per_user', '50'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Function to track campaign metrics
CREATE OR REPLACE FUNCTION increment_campaign_metric(
    p_campaign_id UUID,
    p_metric TEXT,
    p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.campaigns
    SET 
        metrics = jsonb_set(
            metrics,
            ARRAY[p_metric],
            to_jsonb((COALESCE((metrics->p_metric)::integer, 0) + p_amount))
        ),
        updated_at = NOW()
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track campaign source
CREATE OR REPLACE FUNCTION increment_campaign_source(
    p_campaign_id UUID,
    p_source TEXT,
    p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.campaigns
    SET 
        tracking = jsonb_set(
            tracking,
            ARRAY['sources', p_source],
            to_jsonb((COALESCE((tracking->'sources'->p_source)::integer, 0) + p_amount))
        ),
        updated_at = NOW()
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.campaigns IS 'Platform growth campaigns managed by admins';
COMMENT ON TABLE public.system_config IS 'Global system configuration key-value store';
COMMENT ON TABLE public.user_sessions IS 'User session tracking for analytics';
COMMENT ON FUNCTION increment_campaign_metric IS 'Atomically increment campaign metric counters';
COMMENT ON FUNCTION increment_campaign_source IS 'Atomically increment campaign traffic source counters';
