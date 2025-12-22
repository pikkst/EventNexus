-- Check what tokens are actually saved in database
SELECT 
  platform,
  account_id,
  account_name,
  LENGTH(access_token) as token_length,
  LEFT(access_token, 20) as token_start,
  RIGHT(access_token, 20) as token_end,
  is_connected,
  created_at,
  updated_at
FROM social_media_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com')
ORDER BY platform, created_at DESC;

-- Check for whitespace issues
SELECT 
  platform,
  account_id,
  CASE 
    WHEN access_token != TRIM(access_token) THEN '⚠️ HAS WHITESPACE'
    ELSE '✅ Clean'
  END as whitespace_check,
  LENGTH(access_token) - LENGTH(TRIM(access_token)) as extra_chars
FROM social_media_accounts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'huntersest@gmail.com');
