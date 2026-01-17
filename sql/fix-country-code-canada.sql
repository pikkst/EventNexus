-- Emergency fix for AI Pipeline country code
-- Add Canada country code if missing
-- Run this in Supabase SQL Editor

-- Update Canada country code
UPDATE public.city_configs 
SET country_code = 'ca' 
WHERE country = 'Canada' 
  AND (country_code IS NULL OR country_code = '');

-- Verify the update
SELECT city_name, country, country_code 
FROM public.city_configs 
WHERE country IN ('Estonia', 'Canada')
ORDER BY country, city_name;
