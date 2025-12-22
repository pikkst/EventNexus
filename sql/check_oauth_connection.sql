-- Check if Facebook connection was saved after OAuth
SELECT 
    platform,
    account_id,
    account_name,
    is_connected,
    LENGTH(access_token) as token_length,
    expires_at,
    created_at,
    updated_at
FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY updated_at DESC;
