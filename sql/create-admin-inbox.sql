-- Admin Inbox Table for Email Management
-- Stores all incoming emails from support@mail.eventnexus.eu, info@mail.eventnexus.eu, etc.
-- Received via Resend Inbound Webhooks

CREATE TABLE IF NOT EXISTS admin_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email metadata
  from_email text NOT NULL,
  from_name text,
  to_email text NOT NULL,
  subject text NOT NULL,
  
  -- Email content
  body_text text,
  body_html text,
  
  -- Attachments (array of {name, url, size, type})
  attachments jsonb DEFAULT '[]'::jsonb,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived', 'spam')),
  
  -- Reply tracking
  replied_by uuid REFERENCES auth.users(id),
  replied_at timestamptz,
  reply_body text,
  
  -- Tags for categorization
  tags text[] DEFAULT '{}',
  
  -- Priority flag
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  message_id text UNIQUE, -- Resend message ID for threading
  in_reply_to text, -- For email threads
  resend_webhook_data jsonb, -- Full webhook payload for debugging
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_inbox_status ON admin_inbox(status);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_to_email ON admin_inbox(to_email);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_from_email ON admin_inbox(from_email);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_created_at ON admin_inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_inbox_priority ON admin_inbox(priority) WHERE status != 'archived';
CREATE INDEX IF NOT EXISTS idx_admin_inbox_message_id ON admin_inbox(message_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_inbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_admin_inbox_updated_at ON admin_inbox;
CREATE TRIGGER trigger_admin_inbox_updated_at
  BEFORE UPDATE ON admin_inbox
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_inbox_updated_at();

-- RLS Policies (admin-only access)
ALTER TABLE admin_inbox ENABLE ROW LEVEL SECURITY;

-- Admin users can view all inbox messages
CREATE POLICY "Admins can view all inbox messages"
  ON admin_inbox
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin users can update inbox messages (mark as read, reply, etc)
CREATE POLICY "Admins can update inbox messages"
  ON admin_inbox
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin users can delete/archive inbox messages
CREATE POLICY "Admins can delete inbox messages"
  ON admin_inbox
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Service role can insert (for webhook)
CREATE POLICY "Service role can insert inbox messages"
  ON admin_inbox
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to get inbox statistics
CREATE OR REPLACE FUNCTION get_inbox_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'unread', COUNT(*) FILTER (WHERE status = 'unread'),
    'read', COUNT(*) FILTER (WHERE status = 'read'),
    'replied', COUNT(*) FILTER (WHERE status = 'replied'),
    'archived', COUNT(*) FILTER (WHERE status = 'archived'),
    'spam', COUNT(*) FILTER (WHERE status = 'spam'),
    'high_priority', COUNT(*) FILTER (WHERE priority IN ('high', 'urgent') AND status NOT IN ('archived', 'spam')),
    'today', COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)
  )
  INTO stats
  FROM admin_inbox;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_inbox_stats() TO authenticated;

COMMENT ON TABLE admin_inbox IS 'Stores incoming emails received via Resend webhooks for admin management';
COMMENT ON COLUMN admin_inbox.message_id IS 'Unique Resend message ID for tracking';
COMMENT ON COLUMN admin_inbox.resend_webhook_data IS 'Full webhook payload from Resend for debugging';
