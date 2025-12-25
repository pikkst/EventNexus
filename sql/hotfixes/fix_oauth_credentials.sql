-- Fix OAuth credentials in system_config
-- Remove the extra quotes from JSONB values

-- Delete old entries
DELETE FROM system_config WHERE key IN (
  'facebook_client_id',
  'facebook_client_secret',
  'instagram_client_id',
  'instagram_client_secret'
);

-- Insert correct credentials (both use same Facebook App)
-- Note: value column is JSONB, so we need to wrap in quotes and cast
INSERT INTO system_config (key, value, updated_at) VALUES
  ('facebook_client_id', '"1527493881796179"'::jsonb, NOW()),
  ('facebook_client_secret', '"6d56544a86f98e40365d560139e489c1"'::jsonb, NOW()),
  ('instagram_client_id', '"1527493881796179"'::jsonb, NOW()),
  ('instagram_client_secret', '"6d56544a86f98e40365d560139e489c1"'::jsonb, NOW());

-- Verify credentials are saved correctly
SELECT 
  key, 
  value,
  value #>> '{}' as plain_text_value,
  pg_typeof(value) as type,
  updated_at
FROM system_config 
WHERE key LIKE '%client_id' OR key LIKE '%client_secret'
ORDER BY key;
