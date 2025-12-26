-- ============================================
-- Admin Inbox for Resend Email Integration
-- ============================================
-- Table to store incoming emails from Resend webhook
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email TEXT NOT NULL,
    from_name TEXT,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived', 'spam')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    replied_at TIMESTAMPTZ,
    message_id TEXT,
    in_reply_to TEXT,
    resend_webhook_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_inbox_status ON public.admin_inbox(status);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_priority ON public.admin_inbox(priority);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_from_email ON public.admin_inbox(from_email);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_created_at ON public.admin_inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_message_id ON public.admin_inbox(message_id);

-- Enable RLS
ALTER TABLE public.admin_inbox ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view inbox messages
CREATE POLICY "Admin full access to inbox"
    ON public.admin_inbox
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_admin_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_admin_inbox_updated_at ON public.admin_inbox;
CREATE TRIGGER trigger_admin_inbox_updated_at
    BEFORE UPDATE ON public.admin_inbox
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_inbox_updated_at();

-- Grant access to service role (for Edge Functions)
GRANT ALL ON public.admin_inbox TO service_role;

-- Function to get inbox statistics
DROP FUNCTION IF EXISTS public.get_inbox_stats();
CREATE FUNCTION public.get_inbox_stats()
RETURNS TABLE (
    total INTEGER,
    unread INTEGER,
    replied INTEGER,
    high_priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE status = 'unread')::INTEGER AS unread,
        COUNT(*) FILTER (WHERE status = 'replied')::INTEGER AS replied,
        COUNT(*) FILTER (WHERE priority IN ('high', 'urgent'))::INTEGER AS high_priority
    FROM public.admin_inbox;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check is in RLS)
GRANT EXECUTE ON FUNCTION public.get_inbox_stats() TO authenticated;
