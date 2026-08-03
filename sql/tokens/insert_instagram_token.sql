-- Insert Instagram token (uses same Page token as Facebook)
-- Instagram Business Account is connected to EventNexus Page

-- Delete existing Instagram entry if any
DELETE FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
  AND platform = 'instagram';

-- Insert fresh Instagram token
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
    'instagram',
    '17841473316101833',
    'blogpieesti',
    'REPLACE_WITH_BACKEND_SECRET',
    NULL,
    NOW() + INTERVAL '60 days',
    true,
    NOW(),
    NOW()
);

-- Verify both accounts
SELECT 
    platform,
    account_id,
    account_name,
    LENGTH(access_token) as token_length,
    expires_at,
    is_connected
FROM social_media_accounts
WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
ORDER BY platform;
