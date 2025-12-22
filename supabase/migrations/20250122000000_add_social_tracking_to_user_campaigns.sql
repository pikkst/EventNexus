-- ============================================
-- Add Social Media Tracking to user_campaigns
-- ============================================
-- Adds columns to track social media posts for user campaigns
-- ============================================

-- Add social media tracking columns to user_campaigns
ALTER TABLE user_campaigns 
  ADD COLUMN IF NOT EXISTS facebook_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS facebook_post_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
  ADD COLUMN IF NOT EXISTS twitter_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS twitter_post_id TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_posted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT,
  ADD COLUMN IF NOT EXISTS last_posted_at TIMESTAMPTZ;

-- Create indexes for social media queries
CREATE INDEX IF NOT EXISTS idx_user_campaigns_facebook_posted ON user_campaigns(facebook_posted) WHERE facebook_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_campaigns_instagram_posted ON user_campaigns(instagram_posted) WHERE instagram_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_campaigns_status ON user_campaigns(status);

-- Create function to log social media posts
CREATE OR REPLACE FUNCTION log_user_campaign_post(
  p_campaign_id UUID,
  p_platform TEXT,
  p_post_id TEXT,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Update the campaign with post info
  CASE p_platform
    WHEN 'facebook' THEN
      UPDATE user_campaigns 
      SET 
        facebook_posted = TRUE,
        facebook_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
      
    WHEN 'instagram' THEN
      UPDATE user_campaigns 
      SET 
        instagram_posted = TRUE,
        instagram_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
      
    WHEN 'twitter' THEN
      UPDATE user_campaigns 
      SET 
        twitter_posted = TRUE,
        twitter_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
      
    WHEN 'linkedin' THEN
      UPDATE user_campaigns 
      SET 
        linkedin_posted = TRUE,
        linkedin_post_id = p_post_id,
        status = 'published',
        last_posted_at = NOW(),
        updated_at = NOW()
      WHERE id = p_campaign_id AND user_id = p_user_id;
  END CASE;
  
  -- Also log to social_media_posts table for unified tracking
  INSERT INTO social_media_posts (
    user_id,
    platform,
    content,
    status,
    posted_at,
    external_post_id
  ) VALUES (
    p_user_id,
    p_platform,
    (SELECT title || E'\n\n' || copy FROM user_campaigns WHERE id = p_campaign_id),
    'posted',
    NOW(),
    p_post_id
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_user_campaign_post TO authenticated;

-- Add comment
COMMENT ON FUNCTION log_user_campaign_post IS 'Logs a social media post for a user campaign and updates tracking fields';
