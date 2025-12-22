-- Update Facebook token with the directly obtained PAGE token
-- This token was obtained via Graph API direct query, not OAuth

UPDATE social_media_accounts
SET 
  access_token = 'EAAVtP2I4llMBQfNMyqxZC1icE7CFvBzZA53gyZB6H9Lwa17feg5JW9KDTlqZAMLUZCZAKzgWOSLgHJCUxmktk1MZCgix2peP6VK7qVrZA7wqGm9REuaO82YtSuTDpTkWAGDVpvYPZALfQ1aiiLJ4fgpKjdLS2aWC1x9SJ8bCbURRiRq6PxztDbq31txs4bkmuvrpcWbqZB2UhcX7F740quwvXrDzoWzjyXAeirjeUHW0ABvZCcZD',
  updated_at = NOW()
WHERE 
  user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
  AND platform = 'facebook'
  AND account_id = '864504226754704';

-- Verify the update
SELECT 
  platform,
  account_id,
  account_name,
  LENGTH(access_token) as token_length,
  expires_at,
  updated_at
FROM social_media_accounts
WHERE 
  user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
  AND platform = 'facebook';
