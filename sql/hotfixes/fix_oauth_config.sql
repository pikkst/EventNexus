-- Fix Social Media Hub OAuth Configuration

-- 1. Ensure OAuth credentials are in system_config
INSERT INTO system_config (key, value, updated_at)
VALUES
  ('facebook_client_id', '"REPLACE_WITH_FACEBOOK_APP_ID"', NOW()),
  ('facebook_client_secret', '"REPLACE_WITH_BACKEND_SECRET"', NOW()),
  ('instagram_client_id', '"REPLACE_WITH_FACEBOOK_APP_ID"', NOW()),
  ('instagram_client_secret', '"REPLACE_WITH_BACKEND_SECRET"', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 2. Verify entries
SELECT key, value
FROM system_config 
WHERE key LIKE '%client%' 
ORDER BY key;
