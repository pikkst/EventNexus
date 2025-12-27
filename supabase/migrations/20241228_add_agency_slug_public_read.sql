-- Add RLS policy to allow public reading of users by agency_slug
-- This is needed for public agency profile pages to work

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public users can view agency profiles by slug" ON public.users;

-- Create policy to allow anyone to read user profiles by agency_slug
-- This enables public agency pages like eventnexus.eu/#/agency/acme-events
CREATE POLICY "Public users can view agency profiles by slug"
ON public.users
FOR SELECT
USING (
  -- Allow reading if:
  -- 1. User has an agency_slug (meaning they want a public profile)
  -- 2. User is Pro tier or higher (Pro, Premium, Enterprise)
  agency_slug IS NOT NULL 
  AND subscription_tier IN ('pro', 'premium', 'enterprise')
);

-- Verify policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND policyname = 'Public users can view agency profiles by slug';

-- Test query (should return your user)
SELECT 
  id,
  name,
  email,
  agency_slug,
  subscription_tier,
  'Should be readable by anyone' as note
FROM public.users
WHERE agency_slug = 'huntersest';
