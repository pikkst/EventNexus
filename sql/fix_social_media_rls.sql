-- Fix RLS Policies for social_media_accounts
-- This allows users to see and manage their own connected accounts

-- Enable RLS if not already enabled
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can manage own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Admins can view all social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can insert own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can update own social accounts" ON social_media_accounts;
DROP POLICY IF EXISTS "Users can delete own social accounts" ON social_media_accounts;

-- Policy 1: Users can view their own accounts
CREATE POLICY "Users can view own social accounts"
    ON social_media_accounts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own accounts
CREATE POLICY "Users can insert own social accounts"
    ON social_media_accounts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own accounts
CREATE POLICY "Users can update own social accounts"
    ON social_media_accounts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own accounts
CREATE POLICY "Users can delete own social accounts"
    ON social_media_accounts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy 5: Admins can view all accounts
CREATE POLICY "Admins can view all social accounts"
    ON social_media_accounts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'social_media_accounts'
ORDER BY policyname;
