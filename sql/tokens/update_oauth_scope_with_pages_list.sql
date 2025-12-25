-- Update OAuth scopes to include pages_show_list for better page access
-- This ensures /me/accounts returns the list of Facebook Pages

UPDATE system_config
SET value = '"pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"'
WHERE key = 'facebook_oauth_scope';

UPDATE system_config
SET value = '"pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"'
WHERE key = 'instagram_oauth_scope';

-- Verify the update
SELECT key, value 
FROM system_config 
WHERE key IN ('facebook_oauth_scope', 'instagram_oauth_scope');
