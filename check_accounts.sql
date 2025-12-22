SELECT platform, account_id, account_name, is_connected, 
       LEFT(access_token, 20) || '...' as token_preview,
       expires_at
FROM social_media_accounts 
WHERE is_connected = true;
