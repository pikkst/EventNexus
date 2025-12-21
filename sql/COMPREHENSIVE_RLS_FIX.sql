-- COMPREHENSIVE RLS FIX: Remove ALL recursive policies from ALL tables
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    -- Get all tables in public schema with RLS enabled (exclude PostGIS system tables)
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns', 'raster_columns', 'raster_overviews')
    LOOP
        RAISE NOTICE 'Processing table: %', table_record.tablename;
        
        -- Disable RLS temporarily
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        
        -- Drop all policies on this table
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_record.tablename 
            AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                policy_record.policyname, 
                table_record.tablename
            );
            dropped_count := dropped_count + 1;
            RAISE NOTICE '  Dropped policy: %', policy_record.policyname;
        END LOOP;
        
        -- Re-enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total policies dropped: %', dropped_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- Create simple NON-RECURSIVE policies for main tables
-- ============================================

-- USERS TABLE
CREATE POLICY "users_public_read"
ON public.users
FOR SELECT
TO public
USING (true);

CREATE POLICY "users_own_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_own_update"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- EVENTS TABLE
CREATE POLICY "events_public_read"
ON public.events
FOR SELECT
TO public
USING (true);

CREATE POLICY "events_owner_all"
ON public.events
FOR ALL
TO authenticated
USING (auth.uid() = organizer_id);

-- NOTIFICATIONS TABLE
CREATE POLICY "notifications_public_read"
ON public.notifications
FOR SELECT
TO public
USING (true);

CREATE POLICY "notifications_user_insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "notifications_user_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_user_delete"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- TICKETS TABLE
CREATE POLICY "tickets_public_read"
ON public.tickets
FOR SELECT
TO public
USING (true);

CREATE POLICY "tickets_user_insert"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets_user_update"
ON public.tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- BRAND_MONITORING_ALERTS TABLE
CREATE POLICY "brand_alerts_public_read"
ON public.brand_monitoring_alerts
FOR SELECT
TO public
USING (true);

CREATE POLICY "brand_alerts_auth_all"
ON public.brand_monitoring_alerts
FOR ALL
TO authenticated
USING (true);

-- BRAND_MONITORING_WHITELIST TABLE
CREATE POLICY "brand_whitelist_public_read"
ON public.brand_monitoring_whitelist
FOR SELECT
TO public
USING (true);

CREATE POLICY "brand_whitelist_auth_all"
ON public.brand_monitoring_whitelist
FOR ALL
TO authenticated
USING (true);

-- CAMPAIGNS TABLE
CREATE POLICY "campaigns_public_all"
ON public.campaigns
FOR ALL
TO public
USING (true);

-- ============================================
-- Verification
-- ============================================

SELECT 
    '✅ All policies dropped and recreated' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

SELECT 
    '✅ Policy breakdown' as info,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
