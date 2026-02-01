-- Fix tables with RLS enabled but 0 policies (complete lockout)
-- Created: 2026-01-30
-- Only includes tables that ACTUALLY EXIST in schema

-- ============================================================================
-- CRITICAL PRIORITY: Financial & User Data (6 tables)
-- ============================================================================

-- 1. subscription_payments - Financial transactions
CREATE POLICY "Admins can view all subscription payments"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own subscription payments"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage subscription payments"
  ON public.subscription_payments
  FOR ALL
  TO service_role
  USING (true);

-- 2. payouts - Organizer payouts (uses user_id, not organizer_id)
CREATE POLICY "Admins can view all payouts"
  ON public.payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own payouts"
  ON public.payouts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage payouts"
  ON public.payouts
  FOR ALL
  TO service_role
  USING (true);

-- 3. refunds - Ticket refunds (has event_id directly)
CREATE POLICY "Admins can view all refunds"
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Organizers can view refunds for their events"
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = refunds.event_id AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own refunds"
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage refunds"
  ON public.refunds
  FOR ALL
  TO service_role
  USING (true);

-- 4. event_analytics - Event performance analytics
CREATE POLICY "Admins can view all event analytics"
  ON public.event_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Organizers can view analytics for their events"
  ON public.event_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_analytics.event_id AND events.organizer_id = auth.uid())
  );

CREATE POLICY "Service role can manage event analytics"
  ON public.event_analytics
  FOR ALL
  TO service_role
  USING (true);

-- 5. user_sessions - User session tracking
CREATE POLICY "Admins can view all user sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage user sessions"
  ON public.user_sessions
  FOR ALL
  TO service_role
  USING (true);

-- 6. ticket_scans - Ticket scanning records
CREATE POLICY "Admins can view all ticket scans"
  ON public.ticket_scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Organizers can view scans for their events"
  ON public.ticket_scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN events e ON e.id = t.event_id
      WHERE t.id = ticket_scans.ticket_id AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage ticket scans"
  ON public.ticket_scans
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- HIGH PRIORITY: Campaign & Marketing Data (2 tables)
-- ============================================================================

-- 7. user_campaigns - User-specific campaign tracking
CREATE POLICY "Admins can view all user campaigns"
  ON public.user_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own campaigns"
  ON public.user_campaigns
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage user campaigns"
  ON public.user_campaigns
  FOR ALL
  TO service_role
  USING (true);

-- 8. user_conversions - User conversion tracking
CREATE POLICY "Admins can view all user conversions"
  ON public.user_conversions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage user conversions"
  ON public.user_conversions
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- MEDIUM PRIORITY: Testing & A/B (1 table)
-- ============================================================================

-- 9. ab_tests - Platform A/B testing
CREATE POLICY "Admins can manage A/B tests"
  ON public.ab_tests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage A/B tests"
  ON public.ab_tests
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- LOW PRIORITY: Feature Management (1 table)
-- ============================================================================

-- 10. feature_unlocks - Feature flag unlocks per user
CREATE POLICY "Admins can manage feature unlocks"
  ON public.feature_unlocks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own feature unlocks"
  ON public.feature_unlocks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage feature unlocks"
  ON public.feature_unlocks
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Tables secured: 10 (only tables that exist in schema)
-- Total policies created: 28
--
-- CRITICAL TIER (6 tables):
--   subscription_payments, payouts, refunds, event_analytics, user_sessions, ticket_scans
--
-- HIGH TIER (2 tables):
--   user_campaigns, user_conversions
--
-- MEDIUM TIER (1 table):
--   ab_tests
--
-- LOW TIER (1 table):
--   feature_unlocks
--
-- TABLES SKIPPED (don't exist in schema - would need to be created first):
--   campaign_analytics, campaign_insights, campaign_schedule, campaign_social_content,
--   campaign_ab_tests, social_media_posts, affiliate_earnings, feature_usage,
--   retention_tracking, utm_sessions, error_logs, monitoring_stats, platform_metrics,
--   brand_monitoring_history, brand_monitoring_notes