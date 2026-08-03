-- Update with FRESH Page token obtained 2025-12-22
UPDATE social_media_accounts
SET 
  access_token = 'REPLACE_WITH_BACKEND_SECRET',
  updated_at = NOW(),
  expires_at = NOW() + INTERVAL '60 days'
WHERE 
  user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
  AND platform = 'facebook'
  AND account_id = '864504226754704';

-- If row doesn't exist, insert it
INSERT INTO social_media_accounts (
    user_id, platform, account_id, account_name, access_token, 
    refresh_token, expires_at, is_connected, created_at, updated_at
)
SELECT 
    'f2ecf6c6-14c1-4dbd-894b-14ee6493d807', 'facebook', '864504226754704', 
    'EventNexus', 'REPLACE_WITH_BACKEND_SECRET',
    NULL, NOW() + INTERVAL '60 days', true, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM social_media_accounts 
    WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807' 
    AND platform = 'facebook'
);

-- Verify
SELECT platform, account_id, account_name, LENGTH(access_token) as token_length, expires_at
FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807' AND platform = 'facebook';
