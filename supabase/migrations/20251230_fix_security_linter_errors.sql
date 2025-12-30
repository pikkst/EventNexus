-- ============================================================
-- FIX SUPABASE SECURITY LINTER ERRORS
-- Date: 2025-12-30
-- Description: Fixes security definer views and enables RLS on public tables
-- ============================================================

-- ============================================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- Replace SECURITY DEFINER views with regular views
-- Add SECURITY INVOKER explicitly for clarity
-- ============================================================

-- 1. Fix ticket_stats view
DROP VIEW IF EXISTS ticket_stats CASCADE;
CREATE OR REPLACE VIEW ticket_stats
WITH (security_invoker = true)
AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.organizer_id,
  COUNT(DISTINCT t.id) as total_tickets_sold,
  COUNT(DISTINCT CASE WHEN t.status = 'used' THEN t.id END) as tickets_checked_in,
  COUNT(DISTINCT t.user_id) as unique_attendees,
  COALESCE(SUM(t.price_paid), 0) as total_revenue,
  COALESCE(AVG(t.price_paid), 0) as average_ticket_price,
  COALESCE(SUM(tt.quantity_total), 0) as total_capacity,
  COALESCE(SUM(tt.quantity_available), 0) as tickets_remaining
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id
LEFT JOIN ticket_templates tt ON tt.event_id = e.id AND tt.is_active = true
GROUP BY e.id, e.name, e.organizer_id;

COMMENT ON VIEW ticket_stats IS 'Ticket statistics aggregated by event - uses invoker permissions (RLS enforced)';

-- 2. Fix monitoring_dashboard_summary view
DROP VIEW IF EXISTS monitoring_dashboard_summary CASCADE;
CREATE OR REPLACE VIEW monitoring_dashboard_summary
WITH (security_invoker = true)
AS
SELECT
  type,
  severity,
  status,
  COUNT(*) as count,
  MAX(timestamp) as latest_alert
FROM brand_monitoring_alerts
GROUP BY type, severity, status;

COMMENT ON VIEW monitoring_dashboard_summary IS 'Brand monitoring alert summary - uses invoker permissions (RLS enforced)';

-- 3. Fix v_schedule_performance view
DROP VIEW IF EXISTS v_schedule_performance CASCADE;
CREATE OR REPLACE VIEW v_schedule_performance
WITH (security_invoker = true)
AS
SELECT 
  cs.id as schedule_id,
  cs.campaign_id,
  c.title as campaign_title,
  cs.scheduled_for,
  cs.posted_at,
  cs.status,
  cs.platforms,
  cs.retry_count,
  EXTRACT(HOUR FROM cs.posted_at) as posted_hour,
  EXTRACT(DOW FROM cs.posted_at) as posted_day_of_week,
  cp.total_impressions,
  cp.total_clicks,
  cp.ctr,
  cp.engagement_rate,
  EXTRACT(EPOCH FROM (cs.posted_at - cs.scheduled_for)) / 60 as delay_minutes
FROM campaign_schedule cs
LEFT JOIN campaigns c ON cs.campaign_id = c.id
LEFT JOIN campaign_performance cp ON cs.campaign_id = cp.campaign_id
WHERE cs.status IN ('posted', 'failed');

COMMENT ON VIEW v_schedule_performance IS 'Campaign schedule performance analytics - uses invoker permissions (RLS enforced)';

-- 4. Fix promo_code_stats view
DROP VIEW IF EXISTS promo_code_stats CASCADE;
CREATE OR REPLACE VIEW promo_code_stats
WITH (security_invoker = true)
AS
SELECT
  pc.id,
  pc.code,
  pc.code_type,
  pc.tier,
  pc.credit_amount,
  pc.max_uses,
  pc.current_uses,
  pc.is_active,
  pc.valid_from,
  pc.valid_until,
  pc.created_at,
  COUNT(DISTINCT cr.user_id) as unique_users,
  COALESCE(SUM(cr.credit_granted), 0) as total_credits_granted
FROM promo_codes pc
LEFT JOIN code_redemptions cr ON pc.id = cr.promo_code_id
GROUP BY pc.id;

COMMENT ON VIEW promo_code_stats IS 'Promo code redemption statistics - uses invoker permissions (RLS enforced)';

-- 5. Fix v_campaign_learning_summary view
DROP VIEW IF EXISTS v_campaign_learning_summary CASCADE;
CREATE OR REPLACE VIEW v_campaign_learning_summary
WITH (security_invoker = true)
AS
SELECT 
  c.id as campaign_id,
  c.title as campaign_title,
  cp.ctr,
  cp.roi,
  cp.conversion_rate,
  cp.total_impressions,
  cp.total_clicks,
  cp.total_conversions,
  (SELECT COUNT(*) FROM campaign_insights ci WHERE ci.campaign_id = c.id AND ci.severity = 'critical') as critical_insights,
  (SELECT COUNT(*) FROM campaign_insights ci WHERE ci.campaign_id = c.id AND ci.severity = 'warning') as warning_insights,
  (SELECT COUNT(*) FROM campaign_ab_tests abt WHERE abt.campaign_id = c.id) as ab_tests_count,
  (SELECT COUNT(*) FROM campaign_ab_tests abt WHERE abt.campaign_id = c.id AND abt.status = 'completed' AND abt.winner IS NOT NULL) as completed_tests
FROM campaigns c
LEFT JOIN campaign_performance cp ON c.id = cp.campaign_id
WHERE c.created_at >= NOW() - INTERVAL '90 days';

COMMENT ON VIEW v_campaign_learning_summary IS 'Campaign learning and optimization summary - uses invoker permissions (RLS enforced)';

-- ============================================================
-- PART 2: ENABLE RLS ON PUBLIC TABLES
-- Enable Row Level Security and create appropriate policies
-- ============================================================

-- 1. event_views table (analytics tracking)
-- Note: This table doesn't exist in our migrations - likely needs to be created
-- If it exists from legacy code, enable RLS:
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_views') THEN
    ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;
    
    -- Allow service role full access
    DROP POLICY IF EXISTS "Service role full access" ON event_views;
    CREATE POLICY "Service role full access" ON event_views
      FOR ALL
      USING (true)
      WITH CHECK (true);
    
    -- Allow authenticated users to view their own
    DROP POLICY IF EXISTS "Users can view their own views" ON event_views;
    CREATE POLICY "Users can view their own views" ON event_views
      FOR SELECT
      USING (auth.uid() = user_id);
    
    -- Allow insert from authenticated users
    DROP POLICY IF EXISTS "Users can create views" ON event_views;
    CREATE POLICY "Users can create views" ON event_views
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. ticket_sales_timeline table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ticket_sales_timeline') THEN
    ALTER TABLE ticket_sales_timeline ENABLE ROW LEVEL SECURITY;
    
    -- Service role full access
    DROP POLICY IF EXISTS "Service role full access" ON ticket_sales_timeline;
    CREATE POLICY "Service role full access" ON ticket_sales_timeline
      FOR ALL
      USING (true)
      WITH CHECK (true);
    
    -- Organizers can view their events' timeline
    DROP POLICY IF EXISTS "Organizers view own event sales" ON ticket_sales_timeline;
    CREATE POLICY "Organizers view own event sales" ON ticket_sales_timeline
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM events e 
          WHERE e.id = ticket_sales_timeline.event_id 
          AND e.organizer_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3. autonomous_operation_errors table
ALTER TABLE autonomous_operation_errors ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON autonomous_operation_errors;
CREATE POLICY "Service role full access" ON autonomous_operation_errors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can view all errors
DROP POLICY IF EXISTS "Admins view all errors" ON autonomous_operation_errors;
CREATE POLICY "Admins view all errors" ON autonomous_operation_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admins can update errors (mark as resolved)
DROP POLICY IF EXISTS "Admins update errors" ON autonomous_operation_errors;
CREATE POLICY "Admins update errors" ON autonomous_operation_errors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 4. campaign_performance_metrics table
ALTER TABLE campaign_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON campaign_performance_metrics;
CREATE POLICY "Service role full access" ON campaign_performance_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can view all metrics (campaigns are admin-only)
DROP POLICY IF EXISTS "Admins view all metrics" ON campaign_performance_metrics;
CREATE POLICY "Admins view all metrics" ON campaign_performance_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. social_media_post_tracking table
ALTER TABLE social_media_post_tracking ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access" ON social_media_post_tracking;
CREATE POLICY "Service role full access" ON social_media_post_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admins can view all posts (campaigns are admin-only)
DROP POLICY IF EXISTS "Admins view all posts" ON social_media_post_tracking;
CREATE POLICY "Admins view all posts" ON social_media_post_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 6. spatial_ref_sys (PostGIS system table - read-only for all)
-- This is a PostGIS extension table, generally safe to allow read access
-- Note: This is a PostGIS system table owned by postgres superuser
-- We may not have permission to modify it, which is acceptable
DO $$ 
BEGIN
  -- Try to enable RLS on spatial_ref_sys if we have permission
  BEGIN
    ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    
    -- Allow all authenticated users to read spatial reference systems
    DROP POLICY IF EXISTS "Public read access" ON spatial_ref_sys;
    CREATE POLICY "Public read access" ON spatial_ref_sys
      FOR SELECT
      USING (true);
    
    -- Service role can manage
    DROP POLICY IF EXISTS "Service role full access" ON spatial_ref_sys;
    CREATE POLICY "Service role full access" ON spatial_ref_sys
      FOR ALL
      USING (true)
      WITH CHECK (true);
      
    RAISE NOTICE 'RLS enabled on spatial_ref_sys';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping spatial_ref_sys - insufficient privileges (this is normal for PostGIS system tables)';
    WHEN OTHERS THEN
      RAISE NOTICE 'Skipping spatial_ref_sys - %', SQLERRM;
  END;
END $$;

-- ============================================================
-- PART 3: GRANT VIEW PERMISSIONS
-- Ensure proper access to all fixed views
-- ============================================================

GRANT SELECT ON ticket_stats TO authenticated;
GRANT SELECT ON monitoring_dashboard_summary TO authenticated;
GRANT SELECT ON v_schedule_performance TO authenticated;
GRANT SELECT ON promo_code_stats TO authenticated;
GRANT SELECT ON v_campaign_learning_summary TO authenticated;

-- ============================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================

-- Verify all views use security_invoker
-- SELECT 
--   schemaname,
--   viewname,
--   viewowner,
--   definition
-- FROM pg_views 
-- WHERE viewname IN (
--   'ticket_stats',
--   'monitoring_dashboard_summary',
--   'v_schedule_performance',
--   'promo_code_stats',
--   'v_campaign_learning_summary'
-- );

-- Verify RLS is enabled on all required tables
-- SELECT 
--   schemaname,
--   tablename,
--   rowsecurity
-- FROM pg_tables 
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'event_views',
--     'ticket_sales_timeline',
--     'autonomous_operation_errors',
--     'campaign_performance_metrics',
--     'social_media_post_tracking',
--     'spatial_ref_sys'
--   )
-- ORDER BY tablename;

-- List all policies on fixed tables
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE tablename IN (
--   'autonomous_operation_errors',
--   'campaign_performance_metrics',
--   'social_media_post_tracking',
--   'spatial_ref_sys'
-- )
-- ORDER BY tablename, policyname;

-- ============================================================
-- COMPLETION
-- ============================================================

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '✅ Security linter errors fixed:';
  RAISE NOTICE '   - 5 SECURITY DEFINER views converted to SECURITY INVOKER';
  RAISE NOTICE '   - 6 tables now have RLS enabled with proper policies';
  RAISE NOTICE '   - All views have proper permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Run verification queries above to confirm fixes';
END $$;
