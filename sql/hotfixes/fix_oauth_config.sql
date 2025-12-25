-- Fix Social Media Hub OAuth Configuration

-- 1. Ensure OAuth credentials are in system_config
INSERT INTO system_config (key, value, updated_at)
VALUES
  ('facebook_client_id', '"1527493881796179"', NOW()),
  ('facebook_client_secret', '"6d56544a86f98e40365d560139e489c1"', NOW()),
  ('instagram_client_id', '"1527493881796179"', NOW()),
  ('instagram_client_secret', '"6d56544a86f98e40365d560139e489c1"', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 2. Verify entries
SELECT key, value
FROM system_config 
WHERE key LIKE '%client%' 
ORDER BY key;
