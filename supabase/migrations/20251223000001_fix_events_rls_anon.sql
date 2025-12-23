-- ============================================
-- Fix Events RLS Policy for Anonymous Users
-- Date: 2025-12-23
-- Purpose: Allow unauthenticated (guest) users to view active events on map
-- ============================================

-- Problem: Current policy uses (status = 'active' OR organizer_id = auth.uid())
-- When auth.uid() is NULL (guest users), organizer_id = NULL is always FALSE/NULL
-- This blocks ALL events for guests

-- Solution: Allow anon role to SELECT active events explicitly

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;

-- Create new policy that works for both authenticated AND anonymous users
CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    TO public, anon, authenticated  -- Explicitly include anon role
    USING (
        status = 'active' 
        OR organizer_id = auth.uid()  -- Organizers can see their own events regardless of status
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')  -- Admins can see all
    );

-- Verify policy exists
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'events' AND policyname = 'Anyone can view active events';

-- Test queries (for verification in SQL editor):
-- As anonymous: SELECT COUNT(*) FROM events WHERE status = 'active';
-- As authenticated free user: SELECT COUNT(*) FROM events WHERE status = 'active';
-- As organizer: SELECT COUNT(*) FROM events WHERE organizer_id = auth.uid();
