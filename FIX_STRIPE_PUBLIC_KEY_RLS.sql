-- ============================================
-- FIX STRIPE PUBLIC KEY ACCESS - Run in Supabase SQL Editor
-- ============================================
-- Problem: Users getting 406 error when trying to upgrade subscription
-- Root Cause: RLS policies block access to stripe_public_key in system_config
-- Solution: Allow all users to read stripe_public_key
-- ============================================
-- Run this at: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new
-- ============================================

BEGIN;

-- Step 1: Check current policies (for debugging)
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'system_config'
ORDER BY policyname;

-- Step 2: Drop all existing restrictive policies
DROP POLICY IF EXISTS "Admin full access to system_config" ON public.system_config;
DROP POLICY IF EXISTS "Allow authenticated users to read system config" ON public.system_config;
DROP POLICY IF EXISTS "Only service role can modify system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can read system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can insert system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can delete system config" ON public.system_config;
DROP POLICY IF EXISTS "Service role can manage system config" ON public.system_config;
DROP POLICY IF EXISTS "Anyone can read stripe_public_key" ON public.system_config;
DROP POLICY IF EXISTS "Admins can read all system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can manage system config" ON public.system_config;
DROP POLICY IF EXISTS "Service role full access" ON public.system_config;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new policies

-- Policy 1: Allow ALL users (authenticated and anonymous) to read stripe_public_key
-- This is critical for Stripe checkout initialization
CREATE POLICY "Anyone can read stripe_public_key"
ON public.system_config
FOR SELECT
USING (key = 'stripe_public_key');

-- Policy 2: Admins can read all system config
CREATE POLICY "Admins can read all system config"
ON public.system_config
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 3: Admins can insert/update/delete system config
CREATE POLICY "Admins can manage system config"
ON public.system_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 4: Service role can do anything
CREATE POLICY "Service role full access"
ON public.system_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 5: Check if stripe_public_key exists
DO $$
DECLARE
  key_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.system_config WHERE key = 'stripe_public_key'
  ) INTO key_exists;
  
  IF NOT key_exists THEN
    -- Insert placeholder if it doesn't exist
    INSERT INTO public.system_config (key, value, updated_at)
    VALUES ('stripe_public_key', '"pk_test_YOUR_KEY_HERE"'::jsonb, NOW());
    RAISE NOTICE '✓ Inserted placeholder stripe_public_key';
  ELSE
    RAISE NOTICE '✓ stripe_public_key already exists';
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check new policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 50) as using_clause
FROM pg_policies 
WHERE tablename = 'system_config'
ORDER BY policyname;

-- Check stripe_public_key value
SELECT 
  key, 
  value,
  updated_at,
  pg_typeof(value) as value_type
FROM public.system_config 
WHERE key = 'stripe_public_key';

-- ============================================
-- NEXT STEP: Update with your actual Stripe key
-- ============================================
-- Run this after confirming the policies are correct:
/*
UPDATE public.system_config 
SET 
  value = '"pk_test_YOUR_ACTUAL_STRIPE_KEY_FROM_DASHBOARD"'::jsonb,
  updated_at = NOW()
WHERE key = 'stripe_public_key';

-- Verify
SELECT * FROM public.system_config WHERE key = 'stripe_public_key';
*/
