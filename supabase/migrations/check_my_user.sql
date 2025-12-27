-- Check specific user's agency_slug configuration
-- Replace 'your-email@example.com' with your actual email

-- Show your user details
SELECT 
    '=== YOUR USER DETAILS ===' as section,
    '' as details
UNION ALL
SELECT 
    'Email' as section,
    email as details
FROM public.users
WHERE email = 'huntersest@gmail.com'
UNION ALL
SELECT 
    'Name' as section,
    name as details
FROM public.users
WHERE email = 'huntersest@gmail.com'
UNION ALL
SELECT 
    'Subscription Tier' as section,
    subscription_tier as details
FROM public.users
WHERE email = 'huntersest@gmail.com'
UNION ALL
SELECT 
    'Agency Slug' as section,
    COALESCE(agency_slug, '❌ NOT SET') as details
FROM public.users
WHERE email = 'huntersest@gmail.com'
UNION ALL
SELECT 
    'Public URL' as section,
    CASE 
        WHEN agency_slug IS NOT NULL THEN 'https://eventnexus.eu/#/agency/' || agency_slug
        ELSE '❌ Cannot generate - slug not set'
    END as details
FROM public.users
WHERE email = 'huntersest@gmail.com';

-- If slug is missing, show what it WOULD be
SELECT 
    '=== SUGGESTED SLUG ===' as info,
    LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) as suggested_slug,
    'Run fix_missing_slugs.sql to auto-generate' as action
FROM public.users
WHERE email = 'huntersest@gmail.com'
AND agency_slug IS NULL;

-- Show full user record
SELECT 
    '=== FULL USER RECORD ===' as section;

SELECT * FROM public.users WHERE email = 'huntersest@gmail.com';
