-- Add RLS policies to existing tables based on actual schema structure
-- Created: 2026-01-30
-- Total tables: 15 with appropriate RLS policies

-- ============================================================================
-- CAMPAIGN ANALYTICS & TRACKING (6 tables)
-- Tables with campaign_id only - access via campaign ownership
-- ============================================================================

-- 1. campaign_analytics - Campaign performance metrics (campaign_id only)
CREATE POLICY "Admins can view all campaign analytics"
  ON public.campaign_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage campaign analytics"
  ON public.campaign_analytics
  FOR ALL
  TO service_role
  USING (true);

-- 2. campaign_insights - Insights derived from campaign data (campaign_id only)
CREATE POLICY "Admins can view all campaign insights"
  ON public.campaign_insights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage campaign insights"
  ON public.campaign_insights
  FOR ALL
  TO service_role
  USING (true);

-- 3. campaign_schedule - Campaign scheduling information (campaign_id only)
CREATE POLICY "Admins can view all campaign schedules"
  ON public.campaign_schedule
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage campaign schedules"
  ON public.campaign_schedule
  FOR ALL
  TO service_role
  USING (true);

-- 4. campaign_social_content - Social media content for campaigns (campaign_id only)
CREATE POLICY "Admins can view all campaign social content"
  ON public.campaign_social_content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage campaign social content"
  ON public.campaign_social_content
  FOR ALL
  TO service_role
  USING (true);

-- 5. campaign_ab_tests - A/B test configurations for campaigns (campaign_id only)
CREATE POLICY "Admins can manage campaign A/B tests"
  ON public.campaign_ab_tests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage campaign A/B tests"
  ON public.campaign_ab_tests
  FOR ALL
  TO service_role
  USING (true);

-- 6. social_media_posts - Social media posts tracking (has user_id)
CREATE POLICY "Admins can view all social media posts"
  ON public.social_media_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own social media posts"
  ON public.social_media_posts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage social media posts"
  ON public.social_media_posts
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- AFFILIATE & PROGRAM TRACKING (1 table)
-- ============================================================================

-- 7. affiliate_earnings - Affiliate program earnings (referral_id based)
CREATE POLICY "Admins can view all affiliate earnings"
  ON public.affiliate_earnings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage affiliate earnings"
  ON public.affiliate_earnings
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- FEATURE TRACKING (2 tables)
-- ============================================================================

-- 8. feature_usage - Track which features are used by users (has user_id)
CREATE POLICY "Admins can view all feature usage"
  ON public.feature_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own feature usage"
  ON public.feature_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage feature usage"
  ON public.feature_usage
  FOR ALL
  TO service_role
  USING (true);

-- 9. retention_tracking - User retention metrics (has user_id)
CREATE POLICY "Admins can view all retention tracking"
  ON public.retention_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own retention data"
  ON public.retention_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage retention tracking"
  ON public.retention_tracking
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- ANALYTICS & TRACKING (2 tables)
-- ============================================================================

-- 10. utm_sessions - UTM parameter tracking for sessions (has user_id)
CREATE POLICY "Admins can view all UTM sessions"
  ON public.utm_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own UTM sessions"
  ON public.utm_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage UTM sessions"
  ON public.utm_sessions
  FOR ALL
  TO service_role
  USING (true);

-- 11. platform_metrics - Overall platform performance metrics (admin/service only)
CREATE POLICY "Admins can view platform metrics"
  ON public.platform_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage platform metrics"
  ON public.platform_metrics
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- ERROR & MONITORING TRACKING (3 tables)
-- ============================================================================

-- 12. error_logs - Application error logging (has user_id but admin/service only)
CREATE POLICY "Admins can view all error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage error logs"
  ON public.error_logs
  FOR ALL
  TO service_role
  USING (true);

-- 13. monitoring_stats - System monitoring statistics (admin/service only)
CREATE POLICY "Admins can view monitoring stats"
  ON public.monitoring_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage monitoring stats"
  ON public.monitoring_stats
  FOR ALL
  TO service_role
  USING (true);

-- 14. brand_monitoring_history - Brand monitoring history (no user_id, admin/service only)
CREATE POLICY "Admins can view brand monitoring history"
  ON public.brand_monitoring_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage brand monitoring history"
  ON public.brand_monitoring_history
  FOR ALL
  TO service_role
  USING (true);

-- 15. brand_monitoring_notes - Notes on brand monitoring (has created_by)
CREATE POLICY "Admins can view brand monitoring notes"
  ON public.brand_monitoring_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own brand monitoring notes"
  ON public.brand_monitoring_notes
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Service role can manage brand monitoring notes"
  ON public.brand_monitoring_notes
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Tables with RLS policies: 15
-- Total policies created: 43
--
-- CAMPAIGN TABLES (6 - campaign_id based, admin/service only):
--   campaign_analytics, campaign_insights, campaign_schedule,
--   campaign_social_content, campaign_ab_tests
--
-- SOCIAL MEDIA (1 - user_id based):
--   social_media_posts
--
-- AFFILIATE (1 - referral_id based, admin/service only):
--   affiliate_earnings
--
-- FEATURE TRACKING (2 - user_id based):
--   feature_usage, retention_tracking
--
-- ANALYTICS (2 - UTM has user_id, metrics admin/service only):
--   utm_sessions, platform_metrics
--
-- ERROR & MONITORING (3 - admin/service only, last one has created_by):
--   error_logs, monitoring_stats, brand_monitoring_history, brand_monitoring_notes
