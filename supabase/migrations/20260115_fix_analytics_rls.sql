-- Fix RLS Policy for Analytics Events
-- Allow Edge Functions (anon role) to insert AI crawler visits and analytics

-- Drop restrictive policy
DROP POLICY IF EXISTS "Service role can insert analytics" ON analytics_events;

-- Create new permissive policy that allows:
-- 1. Authenticated users (normal tracking)
-- 2. Anon role (Edge Functions, AI crawler tracking)
CREATE POLICY "Allow analytics inserts"
ON analytics_events
FOR INSERT
TO public
WITH CHECK (true);

-- Ensure SELECT is still restricted to admins only
-- (this policy should already exist, but let's ensure it)
DROP POLICY IF EXISTS "Admins can view analytics" ON analytics_events;

CREATE POLICY "Admins can view analytics"
ON analytics_events
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Add comment explaining why insert is open
COMMENT ON POLICY "Allow analytics inserts" ON analytics_events IS 
'Allows any insert to analytics_events (authenticated users + anon Edge Functions). 
Data validation happens in application layer. SELECT remains restricted to admins.';
