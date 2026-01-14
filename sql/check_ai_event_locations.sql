-- Verify AI-created events have valid location data
-- Run this in Supabase SQL Editor

-- 1. Check recent events created by AI (should have 'ai' or 'agent' in source/notes)
SELECT 
  id,
  name,
  location,
  created_at,
  updated_at,
  CASE 
    WHEN location IS NULL THEN '❌ NO LOCATION'
    WHEN location->'coordinates' IS NULL THEN '❌ NO COORDINATES'
    ELSE '✅ HAS LOCATION'
  END as location_status
FROM public.events
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check location field structure
-- (This shows what the location field looks like)
SELECT 
  id,
  name,
  location,
  jsonb_pretty(location) as "location_pretty"
FROM public.events
WHERE location IS NOT NULL
LIMIT 3;

-- 3. Find events WITHOUT valid location
SELECT 
  COUNT(*) as "total_events",
  COUNT(CASE WHEN location IS NULL THEN 1 END) as "missing_location",
  COUNT(CASE WHEN location->'coordinates' IS NULL THEN 1 END) as "missing_coordinates"
FROM public.events;

-- 4. Check if there are any "test" or "ai-generated" events
SELECT 
  id,
  name,
  location,
  created_at
FROM public.events
WHERE name ILIKE '%test%' OR name ILIKE '%ai%' OR name ILIKE '%agent%'
ORDER BY created_at DESC
LIMIT 10;

-- SUCCESS INDICATORS:
-- ✅ AI events have valid location field with coordinates
-- ✅ location is JSON like: {"lat": 59.43, "lng": 24.75, "city": "Tallinn"}
-- ✅ No NULL locations in recent events

-- ISSUES TO LOOK FOR:
-- ❌ location IS NULL → Event won't appear on map
-- ❌ location->'coordinates' IS NULL → Invalid JSON structure
-- ❌ Missing lat/lng fields → Can't display on leaflet
