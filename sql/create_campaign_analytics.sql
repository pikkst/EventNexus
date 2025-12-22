-- Campaign Analytics & Tracking System
-- Super AI Campaign Manager - Phase 1: Foundation

-- ============================================
-- 1. Campaign Analytics Table
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Traffic Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Conversion Funnel
  landing_page_views INTEGER DEFAULT 0,
  sign_ups INTEGER DEFAULT 0,
  event_views INTEGER DEFAULT 0,
  ticket_purchases INTEGER DEFAULT 0,
  
  -- Revenue Tracking
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  
  -- Engagement Metrics
  time_on_site INTEGER DEFAULT 0, -- seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  pages_per_session DECIMAL(5,2) DEFAULT 1.0,
  
  -- Social Media Engagement
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  
  -- Source Attribution
  source VARCHAR(50), -- facebook, instagram, twitter, linkedin, direct
  medium VARCHAR(50), -- social, email, organic, paid
  content VARCHAR(100), -- utm_content
  term VARCHAR(100), -- utm_term
  
  -- Geographic Data
  country_code VARCHAR(2),
  city VARCHAR(100),
  
  -- Device Data
  device_type VARCHAR(20), -- desktop, mobile, tablet
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Time Tracking
  recorded_at TIMESTAMPTZ DEFAULT now(),
  date DATE GENERATED ALWAYS AS (recorded_at::date) STORED
);

-- ============================================
-- 2. Campaign Performance Summary (Aggregated)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Aggregated Metrics
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  
  -- Calculated Metrics
  ctr DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_impressions > 0 
    THEN (total_clicks::decimal / total_impressions * 100) 
    ELSE 0 END
  ) STORED,
  conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_clicks > 0 
    THEN (total_conversions::decimal / total_clicks * 100) 
    ELSE 0 END
  ) STORED,
  
  -- Financial Metrics
  total_spend DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  roi DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN total_spend > 0 
    THEN ((total_revenue - total_spend) / total_spend * 100) 
    ELSE 0 END
  ) STORED,
  
  -- Engagement
  total_likes INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_impressions > 0 
    THEN ((total_likes + total_shares + total_comments)::decimal / total_impressions * 100) 
    ELSE 0 END
  ) STORED,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one summary per campaign
  CONSTRAINT unique_campaign_performance UNIQUE (campaign_id)
);

-- ============================================
-- 3. A/B Testing System
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Test Configuration
  test_name VARCHAR(100),
  test_type VARCHAR(50), -- 'headline', 'image', 'cta', 'copy', 'timing'
  
  -- Variants
  variant_a JSONB NOT NULL, -- original
  variant_b JSONB NOT NULL, -- test variant
  
  -- Performance
  variant_a_impressions INTEGER DEFAULT 0,
  variant_a_clicks INTEGER DEFAULT 0,
  variant_a_conversions INTEGER DEFAULT 0,
  
  variant_b_impressions INTEGER DEFAULT 0,
  variant_b_clicks INTEGER DEFAULT 0,
  variant_b_conversions INTEGER DEFAULT 0,
  
  -- Results
  winner VARCHAR(10), -- 'a', 'b', or null (ongoing)
  confidence_level DECIMAL(5,2), -- statistical confidence %
  improvement_percentage DECIMAL(5,2),
  
  -- Timeline
  test_started_at TIMESTAMPTZ DEFAULT now(),
  test_ended_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'paused', 'cancelled')),
  
  -- AI Analysis
  ai_recommendation TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Campaign Insights (AI-Generated)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Insight Details
  insight_type VARCHAR(50) CHECK (insight_type IN (
    'performance', 'audience', 'timing', 'creative', 'budget', 'platform', 'opportunity'
  )),
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  
  -- Content
  title VARCHAR(200),
  description TEXT,
  insight_data JSONB, -- detailed metrics/data
  
  -- AI Recommendation
  ai_recommendation TEXT,
  suggested_action VARCHAR(50), -- 'pause', 'scale', 'optimize', 'ab_test', 'none'
  confidence_score DECIMAL(5,2), -- 0-100
  
  -- Status
  is_acted_upon BOOLEAN DEFAULT false,
  action_taken VARCHAR(100),
  action_result TEXT,
  
  -- Timeline
  created_at TIMESTAMPTZ DEFAULT now(),
  acted_at TIMESTAMPTZ
);

-- ============================================
-- 5. Campaign Schedule
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Platforms
  platforms JSONB NOT NULL, -- ['facebook', 'instagram', 'twitter']
  
  -- Content Variations (platform-specific)
  content_variations JSONB, -- { facebook: {...}, instagram: {...} }
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'posting', 'posted', 'failed', 'cancelled'
  )),
  
  -- Execution
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  post_ids JSONB, -- { facebook: "123", instagram: "456" }
  
  -- Retry Logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. UTM Tracking Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS utm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session Info
  session_id VARCHAR(100) UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- UTM Parameters
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  
  -- First Touch
  first_visit_at TIMESTAMPTZ DEFAULT now(),
  landing_page TEXT,
  referrer TEXT,
  
  -- Device Info
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  ip_address INET,
  
  -- Geographic
  country_code VARCHAR(2),
  city VARCHAR(100),
  
  -- Conversion
  converted BOOLEAN DEFAULT false,
  conversion_type VARCHAR(50), -- 'signup', 'event_view', 'ticket_purchase'
  conversion_value DECIMAL(10,2),
  converted_at TIMESTAMPTZ,
  
  -- Session Duration
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  pages_viewed INTEGER DEFAULT 1
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_date ON campaign_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_source ON campaign_analytics(source);
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_recorded ON campaign_analytics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign ON campaign_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_active ON campaign_performance(is_active);

CREATE INDEX IF NOT EXISTS idx_campaign_ab_tests_campaign ON campaign_ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ab_tests_status ON campaign_ab_tests(status);

CREATE INDEX IF NOT EXISTS idx_campaign_insights_campaign ON campaign_insights(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_type ON campaign_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_severity ON campaign_insights(severity);
CREATE INDEX IF NOT EXISTS idx_campaign_insights_acted ON campaign_insights(is_acted_upon);

CREATE INDEX IF NOT EXISTS idx_campaign_schedule_scheduled ON campaign_schedule(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_schedule_status ON campaign_schedule(status);

CREATE INDEX IF NOT EXISTS idx_utm_sessions_campaign ON utm_sessions(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_utm_sessions_user ON utm_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_utm_sessions_converted ON utm_sessions(converted);
CREATE INDEX IF NOT EXISTS idx_utm_sessions_first_visit ON utm_sessions(first_visit_at DESC);

-- ============================================
-- RLS Policies
-- ============================================

-- Campaign Analytics - Admin only
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all analytics" ON campaign_analytics FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Campaign Performance - Admin only
ALTER TABLE campaign_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all performance" ON campaign_performance FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- A/B Tests - Admin only
ALTER TABLE campaign_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ab tests" ON campaign_ab_tests FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Campaign Insights - Admin only
ALTER TABLE campaign_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view insights" ON campaign_insights FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Campaign Schedule - Admin only
ALTER TABLE campaign_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage schedule" ON campaign_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- UTM Sessions - Service role only (tracking service)
ALTER TABLE utm_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can track sessions" ON utm_sessions FOR ALL USING (true);

-- ============================================
-- Helper Functions
-- ============================================

-- Update campaign performance summary
CREATE OR REPLACE FUNCTION update_campaign_performance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO campaign_performance (
    campaign_id,
    total_impressions,
    total_clicks,
    total_conversions,
    total_revenue
  )
  VALUES (
    NEW.campaign_id,
    NEW.impressions,
    NEW.clicks,
    CASE WHEN NEW.ticket_purchases > 0 THEN 1 ELSE 0 END,
    NEW.revenue_generated
  )
  ON CONFLICT (campaign_id) 
  DO UPDATE SET
    total_impressions = campaign_performance.total_impressions + NEW.impressions,
    total_clicks = campaign_performance.total_clicks + NEW.clicks,
    total_conversions = campaign_performance.total_conversions + 
      CASE WHEN NEW.ticket_purchases > 0 THEN 1 ELSE 0 END,
    total_revenue = campaign_performance.total_revenue + NEW.revenue_generated,
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_analytics_to_performance
  AFTER INSERT ON campaign_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_performance();

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_ab_tests_updated_at
  BEFORE UPDATE ON campaign_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER campaign_schedule_updated_at
  BEFORE UPDATE ON campaign_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Grant Permissions
-- ============================================
GRANT ALL ON campaign_analytics TO authenticated;
GRANT ALL ON campaign_performance TO authenticated;
GRANT ALL ON campaign_ab_tests TO authenticated;
GRANT ALL ON campaign_insights TO authenticated;
GRANT ALL ON campaign_schedule TO authenticated;
GRANT ALL ON utm_sessions TO authenticated;

GRANT ALL ON campaign_analytics TO service_role;
GRANT ALL ON campaign_performance TO service_role;
GRANT ALL ON campaign_ab_tests TO service_role;
GRANT ALL ON campaign_insights TO service_role;
GRANT ALL ON campaign_schedule TO service_role;
GRANT ALL ON utm_sessions TO service_role;

-- ============================================
-- Sample Data for Testing
-- ============================================
-- Uncomment to insert sample data:
/*
INSERT INTO campaign_performance (campaign_id, total_impressions, total_clicks, total_conversions, total_spend, total_revenue)
SELECT 
  id,
  FLOOR(RANDOM() * 10000 + 1000)::INTEGER,
  FLOOR(RANDOM() * 500 + 50)::INTEGER,
  FLOOR(RANDOM() * 50 + 5)::INTEGER,
  ROUND((RANDOM() * 500 + 100)::numeric, 2),
  ROUND((RANDOM() * 2000 + 500)::numeric, 2)
FROM campaigns
WHERE id IS NOT NULL
LIMIT 10;
*/
