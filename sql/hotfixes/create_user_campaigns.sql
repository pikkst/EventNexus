-- Create separate tables for user-generated campaigns
-- Admin campaigns (existing) are for platform growth
-- User campaigns are for their own event promotion

-- 1. Create user_campaigns table
CREATE TABLE IF NOT EXISTS user_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  copy TEXT NOT NULL,
  cta TEXT NOT NULL,
  image_url TEXT,
  tracking_code TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_event_id ON user_campaigns(event_id);

-- Enable RLS
ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_campaigns
CREATE POLICY "Users can view own campaigns"
  ON user_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns"
  ON user_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON user_campaigns FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns"
  ON user_campaigns FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user campaigns"
  ON user_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_campaigns' ORDER BY ordinal_position;

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_campaigns';
