-- Fix Social Media Hub OAuth Configuration

-- 1. Ensure OAuth credentials are in system_config
INSERT INTO system_config (key, value, description, updated_at)
VALUES
  ('facebook_client_id', '"1527493881796179"', 'Facebook/Instagram App ID', NOW()),
  ('facebook_client_secret', '"6d56544a86f98e40365d560139e489c1"', 'Facebook/Instagram App Secret', NOW()),
  ('instagram_client_id', '"1527493881796179"', 'Instagram uses Facebook App ID', NOW()),
  ('instagram_client_secret', '"6d56544a86f98e40365d560139e489c1"', 'Instagram uses Facebook App Secret', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 2. Verify entries
SELECT key, value, description 
FROM system_config 
WHERE key LIKE '%client%' 
ORDER BY key;
