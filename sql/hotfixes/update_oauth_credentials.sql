-- Update OAuth credentials for Facebook and Instagram
-- Both use the same Facebook App ID

-- Update Facebook credentials
INSERT INTO system_config (key, value, updated_at)
VALUES 
  ('facebook_client_id', '"1527493881796179"', NOW()),
  ('facebook_client_secret', '"6d56544a86f98e40365d560139e489c1"', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Update Instagram credentials (same as Facebook since it uses Facebook OAuth)
INSERT INTO system_config (key, value, updated_at)
VALUES 
  ('instagram_client_id', '"1527493881796179"', NOW()),
  ('instagram_client_secret', '"6d56544a86f98e40365d560139e489c1"', NOW())
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the credentials were saved
SELECT key, value, updated_at 
FROM system_config 
WHERE key IN ('facebook_client_id', 'facebook_client_secret', 'instagram_client_id', 'instagram_client_secret')
ORDER BY key;
