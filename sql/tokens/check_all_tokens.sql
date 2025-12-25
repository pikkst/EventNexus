-- Check if ANY tokens exist in the table
SELECT 
    COUNT(*) as total_tokens,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT platform) as unique_platforms
FROM social_media_accounts;

-- Check all tokens (any user)
SELECT 
    user_id,
    platform,
    account_id,
    account_name,
    is_connected,
    created_at,
    updated_at
FROM social_media_accounts
ORDER BY updated_at DESC
LIMIT 10;

-- Verify your user_id exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'huntersest@gmail.com';
