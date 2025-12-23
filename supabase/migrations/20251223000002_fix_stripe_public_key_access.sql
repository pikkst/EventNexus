-- Fix Stripe public key access for subscription checkout
-- Date: 2025-12-23
-- Problem: Users getting 406 error when trying to read stripe_public_key from system_config
-- Solution: Allow all authenticated users to read stripe_public_key specifically

BEGIN;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin full access to system_config" ON public.system_config;
DROP POLICY IF EXISTS "Allow authenticated users to read system config" ON public.system_config;
DROP POLICY IF EXISTS "Only service role can modify system config" ON public.system_config;

-- Re-enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow ALL users (authenticated and anonymous) to read stripe_public_key
-- This is needed for Stripe checkout initialization
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

-- Policy 4: Service role can do anything (for migrations and scripts)
CREATE POLICY "Service role full access"
ON public.system_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify the stripe_public_key exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_config WHERE key = 'stripe_public_key') THEN
    INSERT INTO public.system_config (key, value, updated_at)
    VALUES ('stripe_public_key', '"pk_test_YOUR_KEY_HERE"'::jsonb, NOW());
    RAISE NOTICE 'Inserted placeholder stripe_public_key';
  END IF;
END $$;

COMMIT;

-- Test query (should work for any user)
COMMENT ON POLICY "Anyone can read stripe_public_key" ON public.system_config 
IS 'Allows all users to read Stripe public key for checkout initialization';
