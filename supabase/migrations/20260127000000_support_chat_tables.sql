-- Support chat threads and messages for AI/admin hybrid support
-- Run this migration after deploying the ai-support-chat Edge Function

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Support threads table
CREATE TABLE IF NOT EXISTS support_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  mode TEXT NOT NULL DEFAULT 'ai' CHECK (mode IN ('ai', 'human')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  language TEXT DEFAULT 'en',
  assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('visitor', 'admin', 'ai')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_original TEXT NOT NULL,
  content_en TEXT,
  content_lang TEXT DEFAULT 'en',
  translated_to_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_threads_status ON support_threads(status);
CREATE INDEX IF NOT EXISTS idx_support_threads_mode ON support_threads(mode);
CREATE INDEX IF NOT EXISTS idx_support_threads_user_id ON support_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_assigned_admin ON support_threads(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_last_message ON support_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_author ON support_messages(author_type, author_id);

-- RLS Policies
ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Threads: users can see their own threads, admins see all
CREATE POLICY "Users can view own threads"
  ON support_threads FOR SELECT
  USING (
    auth.uid() = user_id 
    OR guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Threads: anyone can create (for guest support)
CREATE POLICY "Anyone can create threads"
  ON support_threads FOR INSERT
  WITH CHECK (true);

-- Threads: admins can update
CREATE POLICY "Admins can update threads"
  ON support_threads FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Messages: users can see messages in their threads, admins see all
CREATE POLICY "Users can view messages in own threads"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_threads
      WHERE support_threads.id = support_messages.thread_id
      AND (
        support_threads.user_id = auth.uid()
        OR support_threads.guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
      )
    )
  );

-- Messages: anyone can insert (for support requests)
CREATE POLICY "Anyone can create messages"
  ON support_messages FOR INSERT
  WITH CHECK (true);

-- Messages: admins can update (for editing replies)
CREATE POLICY "Admins can update messages"
  ON support_messages FOR UPDATE
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Function to update thread timestamp on new message
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_threads
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update thread timestamp
DROP TRIGGER IF EXISTS trigger_update_thread_timestamp ON support_messages;
CREATE TRIGGER trigger_update_thread_timestamp
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_timestamp();

-- Grant permissions
GRANT SELECT, INSERT ON support_threads TO anon, authenticated;
GRANT SELECT, INSERT ON support_messages TO anon, authenticated;
GRANT UPDATE, DELETE ON support_threads TO authenticated;
GRANT UPDATE ON support_messages TO authenticated;

-- Comments
COMMENT ON TABLE support_threads IS 'Support chat threads for AI/admin hybrid support system';
COMMENT ON TABLE support_messages IS 'Messages within support threads (visitor, admin, or AI responses)';
COMMENT ON COLUMN support_threads.mode IS 'ai = AI-only responses, human = admin assignment requested';
COMMENT ON COLUMN support_threads.status IS 'open = awaiting response, assigned = admin handling, closed = resolved';
