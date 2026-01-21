-- Debug Ukrainian Cities: Check city_id consistency across tables
-- This script helps diagnose why Ukrainian cities don't work in the AI pipeline

-- 1. Check all Ukrainian cities in city_configs
SELECT 
  '1. Ukrainian cities in city_configs' AS check_name,
  city_id,
  city_name,
  country,
  active,
  pg_typeof(city_id) AS city_id_type
FROM city_configs
WHERE country = 'Ukraine'
ORDER BY city_name;

-- 2. Check all Ukrainian cities in city_health_view
SELECT 
  '2. Ukrainian cities in city_health_view' AS check_name,
  city_id,
  city_name,
  country,
  pg_typeof(city_id) AS city_id_type
FROM city_health_view
WHERE country = 'Ukraine'
ORDER BY city_name;

-- 3. Compare city_id between tables for Ukrainian cities
SELECT 
  '3. Comparison between tables' AS check_name,
  cc.city_id AS config_city_id,
  chv.city_id AS health_view_city_id,
  cc.city_name,
  cc.country,
  CASE 
    WHEN cc.city_id = chv.city_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END AS match_status,
  pg_typeof(cc.city_id) AS config_id_type,
  pg_typeof(chv.city_id) AS health_view_id_type
FROM city_configs cc
FULL OUTER JOIN city_health_view chv 
  ON cc.city_name = chv.city_name AND cc.country = chv.country
WHERE cc.country = 'Ukraine' OR chv.country = 'Ukraine'
ORDER BY cc.city_name;

-- 4. Find cities in city_configs but NOT in city_health_view
SELECT 
  '4. Cities in city_configs but MISSING from city_health_view' AS check_name,
  cc.city_id,
  cc.city_name,
  cc.country
FROM city_configs cc
LEFT JOIN city_health_view chv ON cc.city_id = chv.city_id
WHERE cc.country = 'Ukraine' 
  AND chv.city_id IS NULL;

-- 5. Find cities in city_health_view but NOT in city_configs
SELECT 
  '5. Cities in city_health_view but MISSING from city_configs' AS check_name,
  chv.city_id,
  chv.city_name,
  chv.country
FROM city_health_view chv
LEFT JOIN city_configs cc ON chv.city_id = cc.city_id
WHERE chv.country = 'Ukraine' 
  AND cc.city_id IS NULL;

-- 6. Check if city_id format is consistent (UUID vs TEXT vs INTEGER)
SELECT 
  '6. Data type analysis' AS check_name,
  'city_configs' AS table_name,
  pg_typeof(city_id) AS data_type,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE country = 'Ukraine') AS ukraine_count
FROM city_configs
GROUP BY pg_typeof(city_id)
UNION ALL
SELECT 
  '6. Data type analysis',
  'city_health_view',
  pg_typeof(city_id),
  COUNT(*),
  COUNT(*) FILTER (WHERE country = 'Ukraine')
FROM city_health_view
GROUP BY pg_typeof(city_id);

-- 7. Sample city_id values for Ukraine (first 5)
SELECT 
  '7. Sample city_id values (Ukraine)' AS check_name,
  city_id,
  city_name,
  LENGTH(city_id::TEXT) AS id_length,
  city_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AS is_uuid
FROM city_configs
WHERE country = 'Ukraine'
ORDER BY city_name
LIMIT 5;

-- 8. Check if there are duplicate city_names with different city_ids
SELECT 
  '8. Duplicate city names with different IDs' AS check_name,
  city_name,
  country,
  COUNT(DISTINCT city_id) AS distinct_city_ids,
  array_agg(DISTINCT city_id) AS all_city_ids
FROM (
  SELECT city_id, city_name, country FROM city_configs WHERE country = 'Ukraine'
  UNION ALL
  SELECT city_id, city_name, country FROM city_health_view WHERE country = 'Ukraine'
) combined
GROUP BY city_name, country
HAVING COUNT(DISTINCT city_id) > 1;

-- 9. Final summary
SELECT 
  '9. SUMMARY' AS check_name,
  (SELECT COUNT(*) FROM city_configs WHERE country = 'Ukraine') AS total_in_configs,
  (SELECT COUNT(*) FROM city_health_view WHERE country = 'Ukraine') AS total_in_health_view,
  (SELECT COUNT(*) FROM city_configs cc 
   INNER JOIN city_health_view chv ON cc.city_id = chv.city_id 
   WHERE cc.country = 'Ukraine') AS matching_by_id,
  (SELECT COUNT(*) FROM city_configs cc 
   INNER JOIN city_health_view chv ON cc.city_name = chv.city_name AND cc.country = chv.country
   WHERE cc.country = 'Ukraine') AS matching_by_name;
