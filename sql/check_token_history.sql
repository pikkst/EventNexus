-- Check token history - we need to see the OLD token that worked
-- The one with updated_at BEFORE today's OAuth fix

SELECT 
    platform,
    account_id,
    account_name,
    LENGTH(access_token) as token_length,
    LEFT(access_token, 20) || '...' as token_preview,
    expires_at,
    created_at,
    updated_at
FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
  AND platform = 'facebook'
ORDER BY updated_at DESC;

-- Token length 192 = new PAGE token (doesn't work)
-- Token length 296 = old extended token (worked yesterday?)
