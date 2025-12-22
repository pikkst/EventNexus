-- Check and fix RLS policies for social_media_accounts
-- Users should be able to manage their own accounts

-- Enable RLS
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can insert own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can update own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can delete own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Admins can view all social accounts" ON social_media_accounts;

-- Create new policies
-- 1. Users can view their own accounts
CREATE POLICY "Users can view own social accounts"
  ON social_media_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can insert their own accounts
CREATE POLICY "Users can insert own social accounts"
  ON social_media_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own accounts
CREATE POLICY "Users can update own social accounts"
  ON social_media_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own accounts
CREATE POLICY "Users can delete own social accounts"
  ON social_media_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Admins can view all accounts (for admin dashboard)
CREATE POLICY "Admins can view all social accounts"
  ON social_media_accounts
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
WHERE tablename = 'social_media_accounts'
ORDER BY policyname;
