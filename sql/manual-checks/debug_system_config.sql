-- Debug: Check ALL system config entries to find where "Parool123456" is coming from

SELECT 
  key,
  value,
  value #>> '{}' as plain_text,
  pg_typeof(value) as type,
  created_at,
  updated_at
FROM system_config
ORDER BY key;

-- Specifically check OAuth credentials
SELECT 
  key,
  value,
  value #>> '{}' as plain_text,
  CASE 
    WHEN value #>> '{}' = 'REPLACE_WITH_FACEBOOK_APP_ID' THEN '✅ CORRECT'
    WHEN value #>> '{}' = 'REPLACE_WITH_BACKEND_SECRET' THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status
FROM system_config
WHERE key LIKE '%client%'
ORDER BY key;
