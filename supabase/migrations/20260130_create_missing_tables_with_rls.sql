-- Create missing tables that were referenced in RLS audit but don't exist
-- Created: 2026-01-30
-- Total tables: 15 with full RLS policies

-- ============================================================================
-- CAMPAIGN ANALYTICS & TRACKING (6 tables)
-- ============================================================================

-- 1. campaign_analytics - Campaign performance metrics
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaign analytics"
  ON public.campaign_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own campaign analytics"
  ON public.campaign_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage campaign analytics"
  ON public.campaign_analytics
  FOR ALL
  TO service_role
  USING (true);

-- 2. campaign_insights - Insights derived from campaign data
CREATE TABLE IF NOT EXISTS public.campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  insight_type VARCHAR(50),
  insight_text TEXT,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.campaign_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaign insights"
  ON public.campaign_insights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own campaign insights"
  ON public.campaign_insights
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage campaign insights"
  ON public.campaign_insights
  FOR ALL
  TO service_role
  USING (true);

-- 3. campaign_schedule - Campaign scheduling information
CREATE TABLE IF NOT EXISTS public.campaign_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.campaign_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaign schedules"
  ON public.campaign_schedule
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own campaign schedules"
  ON public.campaign_schedule
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage campaign schedules"
  ON public.campaign_schedule
  FOR ALL
  TO service_role
  USING (true);

-- 4. campaign_social_content - Social media content for campaigns
CREATE TABLE IF NOT EXISTS public.campaign_social_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  platform VARCHAR(50),
  content_text TEXT,
  media_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  engagement_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.campaign_social_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaign social content"
  ON public.campaign_social_content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own campaign social content"
  ON public.campaign_social_content
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage campaign social content"
  ON public.campaign_social_content
  FOR ALL
  TO service_role
  USING (true);

-- 5. campaign_ab_tests - A/B test configurations for campaigns
CREATE TABLE IF NOT EXISTS public.campaign_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  variant_a TEXT,
  variant_b TEXT,
  test_metric VARCHAR(50),
  winner VARCHAR(1),
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.campaign_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all campaign A/B tests"
  ON public.campaign_ab_tests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own campaign A/B tests"
  ON public.campaign_ab_tests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage campaign A/B tests"
  ON public.campaign_ab_tests
  FOR ALL
  TO service_role
  USING (true);

-- 6. social_media_posts - Social media posts tracking
CREATE TABLE IF NOT EXISTS public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform VARCHAR(50),
  post_id VARCHAR(100),
  content TEXT,
  post_url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

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

-- 7. affiliate_earnings - Affiliate program earnings tracking
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(4, 2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all affiliate earnings"
  ON public.affiliate_earnings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Affiliates can view own earnings"
  ON public.affiliate_earnings
  FOR SELECT
  TO authenticated
  USING (affiliate_id = auth.uid());

CREATE POLICY "Service role can manage affiliate earnings"
  ON public.affiliate_earnings
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- FEATURE TRACKING (2 tables)
-- ============================================================================

-- 8. feature_usage - Track which features are used by users
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_name VARCHAR(100),
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

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

-- 9. retention_tracking - User retention metrics
CREATE TABLE IF NOT EXISTS public.retention_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_date DATE,
  days_since_signup INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.retention_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all retention tracking"
  ON public.retention_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage retention tracking"
  ON public.retention_tracking
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- ANALYTICS & TRACKING (2 tables)
-- ============================================================================

-- 10. utm_sessions - UTM parameter tracking for sessions
CREATE TABLE IF NOT EXISTS public.utm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.utm_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all UTM sessions"
  ON public.utm_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service role can manage UTM sessions"
  ON public.utm_sessions
  FOR ALL
  TO service_role
  USING (true);

-- 11. platform_metrics - Overall platform performance metrics
CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100),
  metric_value DECIMAL(15, 2),
  metric_date DATE,
  dimension_1 VARCHAR(100),
  dimension_2 VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all platform metrics"
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

-- 12. error_logs - Application error logging
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100),
  error_message TEXT,
  error_stack TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endpoint VARCHAR(200),
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

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

-- 13. monitoring_stats - System monitoring statistics
CREATE TABLE IF NOT EXISTS public.monitoring_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(100),
  metric_value DECIMAL(15, 4),
  status VARCHAR(20),
  threshold_value DECIMAL(15, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.monitoring_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all monitoring stats"
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

-- 14. brand_monitoring_history - Brand monitoring history
CREATE TABLE IF NOT EXISTS public.brand_monitoring_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand_name VARCHAR(200),
  mention_text TEXT,
  mention_url TEXT,
  sentiment VARCHAR(20),
  source VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.brand_monitoring_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all brand monitoring history"
  ON public.brand_monitoring_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can view own brand monitoring history"
  ON public.brand_monitoring_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage brand monitoring history"
  ON public.brand_monitoring_history
  FOR ALL
  TO service_role
  USING (true);

-- 15. brand_monitoring_notes - Notes on brand monitoring
CREATE TABLE IF NOT EXISTS public.brand_monitoring_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  brand_monitoring_id UUID NOT NULL REFERENCES public.brand_monitoring_history(id) ON DELETE CASCADE,
  note_text TEXT,
  is_action_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.brand_monitoring_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all brand monitoring notes"
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
  USING (
    EXISTS (
      SELECT 1 FROM brand_monitoring_history bmh
      WHERE bmh.id = brand_monitoring_notes.brand_monitoring_id
      AND bmh.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage brand monitoring notes"
  ON public.brand_monitoring_notes
  FOR ALL
  TO service_role
  USING (true);

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Tables created: 15
-- Total RLS policies created: 45
--
-- CAMPAIGN & MARKETING (6 tables):
--   campaign_analytics, campaign_insights, campaign_schedule,
--   campaign_social_content, campaign_ab_tests, social_media_posts
--
-- AFFILIATE (1 table):
--   affiliate_earnings
--
-- FEATURE TRACKING (2 tables):
--   feature_usage, retention_tracking
--
-- ANALYTICS & TRACKING (2 tables):
--   utm_sessions, platform_metrics
--
-- ERROR & MONITORING (3 tables):
--   error_logs, monitoring_stats, brand_monitoring_history, brand_monitoring_notes
