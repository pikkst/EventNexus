-- Delete both accounts and start fresh
DELETE FROM social_media_accounts 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');

-- Insert with the CORRECT PAGE ACCESS TOKEN from our curl command
-- Use this token: EAAVtP2I4llMBQfNMyqxZC1icE7CFvBzZA53gyZB6H9Lwa17feg5JW9KDTlqZAMLUZCZAKzgWOSLgHJCUxmktk1MZCgix2peP6VK7qVrZA7wqGm9REuaO82YtSuTDpTkWAGDVpvYPZALfQ1aiiLJ4fgpKjdLS2aWC1x9SJ8bCbURRiRq6PxztDbq31txs4bkmuvrpcWbqZB2UhcX7F740quwvXrDzoWzjyXAeirjeUHW0ABvZCcZD

INSERT INTO social_media_accounts (user_id, platform, account_id, account_name, access_token, is_connected, expires_at, updated_at)
VALUES 
  (
    (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com'),
    'facebook',
    '864504226754704',
    'EventNexus',
    'EAAVtP2I4llMBQfNMyqxZC1icE7CFvBzZA53gyZB6H9Lwa17feg5JW9KDTlqZAMLUZCZAKzgWOSLgHJCUxmktk1MZCgix2peP6VK7qVrZA7wqGm9REuaO82YtSuTDpTkWAGDVpvYPZALfQ1aiiLJ4fgpKjdLS2aWC1x9SJ8bCbURRiRq6PxztDbq31txs4bkmuvrpcWbqZB2UhcX7F740quwvXrDzoWzjyXAeirjeUHW0ABvZCcZD',
    true,
    NOW() + INTERVAL '60 days',
    NOW()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com'),
    'instagram',
    '17841473316101833',
    'blogpieesti',
    'EAAVtP2I4llMBQfNMyqxZC1icE7CFvBzZA53gyZB6H9Lwa17feg5JW9KDTlqZAMLUZCZAKzgWOSLgHJCUxmktk1MZCgix2peP6VK7qVrZA7wqGm9REuaO82YtSuTDpTkWAGDVpvYPZALfQ1aiiLJ4fgpKjdLS2aWC1x9SJ8bCbURRiRq6PxztDbq31txs4bkmuvrpcWbqZB2UhcX7F740quwvXrDzoWzjyXAeirjeUHW0ABvZCcZD',
    true,
    NOW() + INTERVAL '60 days',
    NOW()
  );

-- Verify
SELECT platform, account_id, account_name, is_connected, 
       LEFT(access_token, 30) as token_preview
FROM social_media_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');
