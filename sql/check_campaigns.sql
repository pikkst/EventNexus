-- Check if autonomous campaigns were created
SELECT 
  id,
  title,
  status,
  placement,
  target,
  created_at,
  ai_metadata->'autonomous' as is_autonomous,
  ai_metadata->'strategy_type' as strategy,
  ai_metadata->'target_audience' as target_audience
FROM campaigns
WHERE ai_metadata IS NOT NULL
  AND ai_metadata->>'autonomous' = 'true'
ORDER BY created_at DESC
LIMIT 5;

-- Check all campaigns
SELECT 
  id,
  title,
  status,
  placement,
  target,
  created_at
FROM campaigns
ORDER BY created_at DESC
LIMIT 10;
