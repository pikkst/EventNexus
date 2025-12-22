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
    WHEN value #>> '{}' = '1527493881796179' THEN '✅ CORRECT'
    WHEN value #>> '{}' = '6d56544a86f98e40365d560139e489c1' THEN '✅ CORRECT'
    ELSE '❌ WRONG'
  END as status
FROM system_config
WHERE key LIKE '%client%'
ORDER BY key;
