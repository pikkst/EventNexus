-- Add missing posting tracking columns to user_campaigns table
-- These columns track which platforms the campaign was posted to

-- Add boolean flags for posting status
ALTER TABLE user_campaigns 
ADD COLUMN IF NOT EXISTS facebook_posted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_posted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS twitter_posted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linkedin_posted BOOLEAN DEFAULT false;

-- Add post ID columns to store platform-specific post IDs
ALTER TABLE user_campaigns
ADD COLUMN IF NOT EXISTS facebook_post_id TEXT,
ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
ADD COLUMN IF NOT EXISTS twitter_post_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;

-- Add metrics JSONB column for tracking campaign performance
ALTER TABLE user_campaigns
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;

-- Update status column default to lowercase
ALTER TABLE user_campaigns 
ALTER COLUMN status SET DEFAULT 'draft';

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_user_campaigns_status ON user_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_user_campaigns_created_at ON user_campaigns(created_at DESC);

-- Create or replace update trigger
CREATE OR REPLACE FUNCTION update_user_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_campaigns_updated_at ON user_campaigns;
CREATE TRIGGER user_campaigns_updated_at
  BEFORE UPDATE ON user_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_user_campaigns_updated_at();

-- Verify additions
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'user_campaigns'
AND column_name IN (
  'facebook_posted', 'instagram_posted', 'twitter_posted', 'linkedin_posted',
  'facebook_post_id', 'instagram_post_id', 'twitter_post_id', 'linkedin_post_id',
  'metrics'
)
ORDER BY column_name;
