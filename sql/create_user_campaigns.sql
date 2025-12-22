-- User Campaigns Table
-- For Enterprise/Premium users to generate AI campaigns and post to social media
-- Separate from admin 'campaigns' table which is for platform growth

-- Create user_campaigns table
CREATE TABLE IF NOT EXISTS user_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  copy TEXT NOT NULL,
  cta TEXT,
  image_url TEXT,
  tracking_code TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  facebook_posted BOOLEAN DEFAULT false,
  instagram_posted BOOLEAN DEFAULT false,
  twitter_posted BOOLEAN DEFAULT false,
  linkedin_posted BOOLEAN DEFAULT false,
  facebook_post_id TEXT,
  instagram_post_id TEXT,
  twitter_post_id TEXT,
  linkedin_post_id TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id ON user_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_event_id ON user_campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_status ON user_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_created_at ON user_campaigns(created_at DESC);

-- Enable RLS
ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own campaigns
CREATE POLICY "Users can view own campaigns"
  ON user_campaigns
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own campaigns
CREATE POLICY "Users can create own campaigns"
  ON user_campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own campaigns
CREATE POLICY "Users can update own campaigns"
  ON user_campaigns
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns"
  ON user_campaigns
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can see all campaigns
CREATE POLICY "Admins can view all campaigns"
  ON user_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_campaigns_updated_at
  BEFORE UPDATE ON user_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_user_campaigns_updated_at();

-- Grant permissions
GRANT ALL ON user_campaigns TO authenticated;
GRANT ALL ON user_campaigns TO service_role;
