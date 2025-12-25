-- Check and fix RLS policies for campaign_social_content
-- This table links to campaigns table via campaign_id
-- User ownership is determined through the campaigns table

-- Enable RLS
ALTER TABLE campaign_social_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Admins can view all campaigns" ON campaign_social_content;
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON campaign_social_content;

-- Create new policies using JOIN with campaigns table
-- Note: Assumes campaigns table has either user_id or created_by column

-- 1. Users can view content for their own campaigns
CREATE POLICY "Users can view own campaign content"
  ON campaign_social_content
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE created_by = auth.uid()
    )
  );

-- 2. Users can insert content for their own campaigns
CREATE POLICY "Users can insert own campaign content"
  ON campaign_social_content
  FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE created_by = auth.uid()
    )
  );

-- 3. Users can update content for their own campaigns
CREATE POLICY "Users can update own campaign content"
  ON campaign_social_content
  FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE created_by = auth.uid()
    )
  );

-- 4. Users can delete content for their own campaigns
CREATE POLICY "Users can delete own campaign content"
  ON campaign_social_content
  FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns 
      WHERE created_by = auth.uid()
    )
  );

-- 5. Admins can view all campaign content
CREATE POLICY "Admins can view all campaign content"
  ON campaign_social_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 6. Admins can manage all campaign content
CREATE POLICY "Admins can manage all campaign content"
  ON campaign_social_content
  FOR ALL
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

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaign_social_content'
ORDER BY ordinal_position;
