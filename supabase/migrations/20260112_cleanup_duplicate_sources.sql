-- Cleanup duplicate event sources
-- Keep only the most recent source for each (city_id, url) pair

-- Create a temporary table with sources to keep (highest id = most recent)
CREATE TEMP TABLE sources_to_keep AS
SELECT DISTINCT ON (city_id, url) id
FROM event_sources
ORDER BY city_id, url, created_at DESC, id DESC;

-- Delete duplicates (keep only the most recent source for each URL per city)
DELETE FROM event_sources
WHERE id NOT IN (SELECT id FROM sources_to_keep);

-- Log cleanup results
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % duplicate event sources', deleted_count;
END $$;

-- Verify no duplicates remain
SELECT 
  city_id,
  url,
  COUNT(*) as duplicate_count
FROM event_sources
GROUP BY city_id, url
HAVING COUNT(*) > 1;

-- If above query returns rows, there are still duplicates (should be empty)
