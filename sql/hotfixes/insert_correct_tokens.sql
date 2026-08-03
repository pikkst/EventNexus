-- Delete both accounts and start fresh
DELETE FROM social_media_accounts 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');

-- Insert with the CORRECT PAGE ACCESS TOKEN from our curl command
-- Use a backend-managed token value instead of committing secrets to source control.

INSERT INTO social_media_accounts (user_id, platform, account_id, account_name, access_token, is_connected, expires_at, updated_at)
VALUES 
  (
    (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com'),
    'facebook',
    '864504226754704',
    'EventNexus',
    'REPLACE_WITH_BACKEND_SECRET',
    true,
    NOW() + INTERVAL '60 days',
    NOW()
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com'),
    'instagram',
    '17841473316101833',
    'blogpieesti',
    'REPLACE_WITH_BACKEND_SECRET',
    true,
    NOW() + INTERVAL '60 days',
    NOW()
  );

-- Verify
SELECT platform, account_id, account_name, is_connected, 
       LEFT(access_token, 30) as token_preview
FROM social_media_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');
