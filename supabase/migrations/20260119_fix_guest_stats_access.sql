-- ============================================
-- Fix Guest Stats Access for Landing Page
-- Date: 2026-01-19
-- Purpose: Allow anonymous (guest) users to view platform statistics
-- ============================================

-- Issue: Guest users cannot see platform stats (events count, cities count, etc.)
-- because city_configs and other tables have RLS that only allows authenticated users

-- Solution: Add read-only policies for anonymous users on tables used for stats

-- ============================================
-- 1. Allow anonymous users to read city configs (for city count stats)
-- ============================================
CREATE POLICY "Anonymous can read active city configs"
    ON public.city_configs FOR SELECT
    TO anon, public
    USING (active = true);

-- ============================================
-- 2. Ensure events table allows anonymous reads (already fixed, but verify)
-- ============================================
-- This was fixed in 20251223000001_fix_events_rls_anon.sql
-- Verify the policy exists:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'events' 
        AND policyname = 'Anyone can view active events'
    ) THEN
        RAISE NOTICE 'Events policy not found - creating it';
        
        CREATE POLICY "Anyone can view active events"
            ON public.events FOR SELECT
            TO public, anon, authenticated
            USING (
                status = 'active' 
                OR organizer_id = auth.uid()
                OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            );
    ELSE
        RAISE NOTICE 'Events policy already exists';
    END IF;
END $$;

-- ============================================
-- 3. Allow anonymous users to count tickets (for ticket stats)
-- ============================================
-- Only allow counting, not viewing ticket details
CREATE POLICY "Anonymous can count tickets"
    ON public.tickets FOR SELECT
    TO anon, public
    USING (
        -- Only allow access to minimal columns for counting
        -- Tickets themselves remain private (users can only see their own)
        false -- This policy will be used only by authenticated users
    );

-- Better approach: Keep tickets private, stats will use authenticated counts or cache
-- Drop the above policy if it was created
DROP POLICY IF EXISTS "Anonymous can count tickets" ON public.tickets;

-- ============================================
-- 4. Verification Queries
-- ============================================

-- Test as anonymous user (these should return counts > 0):
-- SELECT COUNT(*) FROM city_configs WHERE active = true;
-- SELECT COUNT(*) FROM events WHERE status = 'active' AND archived_at IS NULL AND date >= CURRENT_DATE;

-- ============================================
-- 5. Add helpful comments
-- ============================================

COMMENT ON POLICY "Anonymous can read active city configs" ON public.city_configs IS 
'Allows anonymous (guest) users to view active city configurations for platform statistics display on landing page';

COMMENT ON TABLE public.city_configs IS 
'City configurations for multi-city event discovery. Active cities are publicly visible for stats.';
