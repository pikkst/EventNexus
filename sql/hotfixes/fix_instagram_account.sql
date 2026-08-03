-- Manual fix: Insert Instagram Business Account with correct ID
-- Use this if OAuth keeps failing to fetch Page data

-- Your known values from OAuth authorization:
-- Page ID: 864504226754704 (EventNexus)
-- Instagram Business Account ID: 17841473316101833 (blogpieesti)
-- User ID: f2ecf6c6-14c1-4dbd-894b-14ee6493d807

-- First, delete the incorrect Instagram entry
DELETE FROM social_media_accounts 
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807' 
AND platform = 'instagram';

-- Insert Instagram Business Account with correct ID
INSERT INTO social_media_accounts (
  user_id,
  platform,
  account_id,
  account_name,
  access_token,
  refresh_token,
  expires_at,
  is_connected,
  updated_at
) VALUES (
  'f2ecf6c6-14c1-4dbd-894b-14ee6493d807',
  'instagram',
  '17841473316101833', -- Instagram Business Account ID (blogpieesti)
  'blogpieesti',
  'REPLACE_WITH_BACKEND_SECRET', -- Facebook token (works for Instagram too)
  NULL,
  NOW() + INTERVAL '60 days', -- Token expires in 60 days
  true,
  NOW()
)
ON CONFLICT (user_id, platform, account_id)
DO UPDATE SET
  access_token = EXCLUDED.access_token,
  is_connected = true,
  updated_at = NOW();

-- Verify both accounts
SELECT 
  platform,
  account_id,
  account_name,
  LEFT(access_token, 20) || '...' as token_preview,
  expires_at,
  is_connected
FROM social_media_accounts 
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY platform;

-- To get the access token:
-- 1. Copy the access_token from your Facebook connection in the same table
-- 2. OR reconnect Facebook and copy the new token from the database
-- 3. Page access tokens work for both Facebook Page posts AND Instagram Business Account posts
