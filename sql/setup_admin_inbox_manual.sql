-- Run this directly in Supabase SQL Editor
-- to create admin_inbox table

-- Drop existing objects if they exist to avoid conflicts
DROP TRIGGER IF EXISTS trigger_admin_inbox_updated_at ON public.admin_inbox;
DROP FUNCTION IF EXISTS public.update_admin_inbox_updated_at();
DROP FUNCTION IF EXISTS public.get_inbox_stats();
DROP TABLE IF EXISTS public.admin_inbox CASCADE;

-- Create admin_inbox table
CREATE TABLE public.admin_inbox (
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
    replied_by UUID REFERENCES auth.users(id),
    reply_body TEXT,
    message_id TEXT,
    in_reply_to TEXT,
    resend_webhook_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_admin_inbox_status ON public.admin_inbox(status);
CREATE INDEX idx_admin_inbox_priority ON public.admin_inbox(priority);
CREATE INDEX idx_admin_inbox_from_email ON public.admin_inbox(from_email);
CREATE INDEX idx_admin_inbox_created_at ON public.admin_inbox(created_at DESC);
CREATE INDEX idx_admin_inbox_message_id ON public.admin_inbox(message_id);

-- Enable RLS
ALTER TABLE public.admin_inbox ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access
DROP POLICY IF EXISTS "Admin full access to inbox" ON public.admin_inbox;
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
CREATE FUNCTION public.update_admin_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_admin_inbox_updated_at
    BEFORE UPDATE ON public.admin_inbox
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_inbox_updated_at();

-- Grant access to service role (for Edge Functions)
GRANT ALL ON public.admin_inbox TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Function to get inbox statistics
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_inbox_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inbox_stats() TO service_role;

-- Insert test message to verify setup
INSERT INTO public.admin_inbox (
    from_email, 
    from_name, 
    to_email, 
    subject, 
    body_text, 
    status, 
    priority
) VALUES (
    'test@example.com',
    'Test User',
    'support@mail.eventnexus.eu',
    'Test Message - Admin Inbox Setup',
    'This is a test message to verify the admin inbox is working correctly.',
    'unread',
    'normal'
);

-- Verify setup
SELECT 'Setup complete!' as message, COUNT(*) as test_messages FROM public.admin_inbox;
