-- Check current state of tokens after update
SELECT 
    platform,
    account_id,
    account_name,
    LENGTH(access_token) as token_length,
    LEFT(access_token, 30) || '...' as token_start,
    is_connected,
    expires_at,
    updated_at
FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY platform, updated_at DESC;
