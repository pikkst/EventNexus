-- Check and fix RLS policies for campaign_social_content
-- Users should be able to manage their own campaigns

-- Enable RLS
ALTER TABLE campaign_social_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Admins can view all campaigns" ON campaign_social_content;

-- Create new policies
-- 1. Users can view their own campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaign_social_content
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can insert their own campaigns
CREATE POLICY "Users can insert own campaigns"
  ON campaign_social_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own campaigns
CREATE POLICY "Users can update own campaigns"
  ON campaign_social_content
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns"
  ON campaign_social_content
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Admins can view all campaigns (for admin dashboard)
CREATE POLICY "Admins can view all campaigns"
  ON campaign_social_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'campaign_social_content'
ORDER BY policyname;
