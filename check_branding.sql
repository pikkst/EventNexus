-- Check current branding configuration for hunterset
SELECT 
  id,
  name,
  email,
  role,
  subscription_tier,
  agency_slug,
  jsonb_pretty(branding) as branding_config
FROM users
WHERE email = 'huntersest@gmail.com';
