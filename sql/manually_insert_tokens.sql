-- Manually insert Facebook and Instagram tokens
-- Using tokens obtained from get_page_token.sh script

-- Delete any existing entries first (clean slate)
DELETE FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807';

-- Insert Facebook Page token (from Method 1 of script)
INSERT INTO social_media_accounts (
    user_id,
    platform,
    account_id,
    account_name,
    access_token,
    refresh_token,
    expires_at,
    is_connected,
    created_at,
    updated_at
) VALUES (
    'f2ecf6c6-14c1-4dbd-894b-14ee6493d807',
    'facebook',
    '864504226754704',
    'EventNexus',
    'EAAVtP2I4llMBQfNMyqxZC1icE7CFvBzZA53gyZB6H9Lwa17feg5JW9KDTlqZAMLUZCZAKzgWOSLgHJCUxmktk1MZCgix2peP6VK7qVrZA7wqGm9REuaO82YtSuTDpTkWAGDVpvYPZALfQ1aiiLJ4fgpKjdLS2aWC1x9SJ8bCbURRiRq6PxztDbq31txs4bkmuvrpcWbqZB2UhcX7F740quwvXrDzoWzjyXAeirjeUHW0ABvZCcZD',
    NULL,
    NOW() + INTERVAL '60 days', -- Token expires in ~60 days based on script output
    true,
    NOW(),
    NOW()
);

-- Insert Instagram token (needs to be reconnected via OAuth or script)
-- For now, we'll need to get Instagram token separately

-- Verify insertion
SELECT 
    platform,
    account_id,
    account_name,
    LENGTH(access_token) as token_length,
    is_connected,
    expires_at,
    created_at
FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY platform;
