-- Fix script: Generate agency_slug for users who don't have one
-- Run this ONLY if verify_agency_slug.sql shows users without slugs

-- Generate slugs for Pro+ tier users without slugs
UPDATE public.users 
SET agency_slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE agency_slug IS NULL 
  AND name IS NOT NULL
  AND subscription_tier IN ('pro', 'premium', 'enterprise');

-- Show what was updated
SELECT 
    'Updated users' as action,
    COUNT(*) as count
FROM public.users
WHERE agency_slug IS NOT NULL
  AND subscription_tier IN ('pro', 'premium', 'enterprise');

-- Display the results
SELECT 
    id,
    name,
    agency_slug,
    subscription_tier,
    'https://eventnexus.eu/#/agency/' || agency_slug as public_url
FROM public.users
WHERE subscription_tier IN ('pro', 'premium', 'enterprise')
ORDER BY subscription_tier, name;
