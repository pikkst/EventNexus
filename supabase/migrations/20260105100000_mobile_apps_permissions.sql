-- ============================================
-- Mobile Apps Permissions & Policies
-- Date: 2026-01-05
-- Purpose: Ensure all necessary RLS policies and permissions for EventNexus mobile apps
-- Apps: EventNexusScanner (for staff) & EventNexusLiveMap (for attendees)
-- ============================================

-- ============================================
-- 1. EVENTS TABLE POLICIES (for Live Map app)
-- ============================================

-- Ensure anonymous users can view active events (critical for Live Map browsing)
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;

CREATE POLICY "Anyone can view active events"
    ON public.events FOR SELECT
    TO public, anon, authenticated
    USING (
        status = 'active' 
        OR organizer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- 2. TICKETS TABLE POLICIES (for both apps)
-- ============================================

-- Live Map: Users can view their own tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;

CREATE POLICY "Users can view their own tickets"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Live Map: Authenticated users can purchase tickets
DROP POLICY IF EXISTS "Authenticated users can purchase tickets" ON public.tickets;

CREATE POLICY "Authenticated users can purchase tickets"
    ON public.tickets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Scanner: Organizers can view tickets for their events
DROP POLICY IF EXISTS "Organizers can view tickets for their events" ON public.tickets;

CREATE POLICY "Organizers can view tickets for their events"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Scanner: Update ticket status when scanned (mark as used)
DROP POLICY IF EXISTS "Organizers can update ticket scan status" ON public.tickets;

CREATE POLICY "Organizers can update ticket scan status"
    ON public.tickets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = tickets.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- ============================================
-- 3. NOTIFICATIONS TABLE POLICIES (for Live Map)
-- ============================================

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- System can create notifications (for proximity radar, etc.)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    TO authenticated, service_role
    WITH CHECK (true);

-- ============================================
-- 4. USERS TABLE POLICIES (for both apps)
-- ============================================

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ============================================
-- 5. ENSURE ROW LEVEL SECURITY IS ENABLED
-- ============================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. GRANT PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================

-- Events: anonymous can SELECT, authenticated can do more
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;

-- Tickets: authenticated only
GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;

-- Notifications: authenticated only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Users: authenticated can view and update own profile
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Verify all policies are in place
DO $$ 
DECLARE
    policy_count INT;
    policy_rec RECORD;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename IN ('events', 'tickets', 'notifications', 'users');
    
    RAISE NOTICE 'Total RLS policies for mobile apps: %', policy_count;
    
    -- List all policies
    RAISE NOTICE '=== Events Policies ===';
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'events'
    LOOP
        RAISE NOTICE '  - %', policy_rec.policyname;
    END LOOP;
    
    RAISE NOTICE '=== Tickets Policies ===';
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'tickets'
    LOOP
        RAISE NOTICE '  - %', policy_rec.policyname;
    END LOOP;
    
    RAISE NOTICE '=== Notifications Policies ===';
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'notifications'
    LOOP
        RAISE NOTICE '  - %', policy_rec.policyname;
    END LOOP;
    
    RAISE NOTICE '=== Users Policies ===';
    FOR policy_rec IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users'
    LOOP
        RAISE NOTICE '  - %', policy_rec.policyname;
    END LOOP;
END $$;

-- ============================================
-- 8. TEST QUERIES (Run these in SQL Editor to verify)
-- ============================================

-- Test 1: Anonymous users can see active events
-- SET ROLE anon;
-- SELECT COUNT(*) FROM events WHERE status = 'active';

-- Test 2: Authenticated users can see their tickets
-- (Login as user first)
-- SELECT COUNT(*) FROM tickets WHERE user_id = auth.uid();

-- Test 3: Authenticated users can see their notifications
-- SELECT COUNT(*) FROM notifications WHERE user_id = auth.uid();

-- ============================================
-- SUMMARY
-- ============================================

COMMENT ON TABLE public.events IS 'Events table - Mobile apps: anonymous can browse active events, authenticated can manage';
COMMENT ON TABLE public.tickets IS 'Tickets table - Mobile apps: users can view/purchase own tickets, organizers can scan/validate';
COMMENT ON TABLE public.notifications IS 'Notifications table - Mobile apps: users can view/manage own notifications';
COMMENT ON TABLE public.users IS 'Users table - Mobile apps: users can view/update own profile';

-- Migration complete
SELECT 'Mobile Apps Permissions Migration Completed ✅' AS status;
