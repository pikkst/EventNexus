-- Update OAuth scopes to include pages_show_list for better page access
-- This ensures /me/accounts returns the list of Facebook Pages

UPDATE system_config
SET config_value = '"pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"'
WHERE config_key = 'facebook_oauth_scope';

UPDATE system_config
SET config_value = '"pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"'
WHERE config_key = 'instagram_oauth_scope';

-- Verify the update
SELECT config_key, config_value 
FROM system_config 
WHERE config_key IN ('facebook_oauth_scope', 'instagram_oauth_scope');
