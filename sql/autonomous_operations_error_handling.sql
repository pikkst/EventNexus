-- ============================================================
-- ERROR HANDLING & MONITORING FOR AUTONOMOUS OPERATIONS
-- Date: 2025-12-30
-- Description: Comprehensive error handling, fallback mechanisms,
--              campaign tracking, ROI analytics, and admin notifications
-- ============================================================

-- ============================================================
-- TABLE: autonomous_operation_errors
-- Logs all errors that occur during autonomous operations
-- ============================================================
CREATE TABLE IF NOT EXISTS autonomous_operation_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  operation_type TEXT NOT NULL, -- 'campaign_creation', 'social_posting', 'campaign_optimization', 'intelligence_gathering'
  error_type TEXT NOT NULL, -- 'token_expired', 'api_error', 'network_error', 'validation_error', 'ai_generation_failed'
  error_message TEXT NOT NULL,
  error_details JSONB, -- Full error stack, API response, etc.
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID REFERENCES users(id), -- Admin who should be notified
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  notification_sent BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_autonomous_errors_created ON autonomous_operation_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_errors_resolved ON autonomous_operation_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_autonomous_errors_type ON autonomous_operation_errors(error_type);

-- ============================================================
-- TABLE: campaign_performance_metrics
-- Tracks real campaign performance and ROI
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Traffic metrics
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2), -- Click-through rate percentage
  
  -- Conversion metrics
  new_signups INTEGER DEFAULT 0,
  new_organizers INTEGER DEFAULT 0, -- Creators who signed up
  new_events_created INTEGER DEFAULT 0,
  tickets_sold INTEGER DEFAULT 0,
  
  -- Revenue metrics
  gross_revenue DECIMAL(10,2) DEFAULT 0, -- Total ticket sales
  net_revenue DECIMAL(10,2) DEFAULT 0, -- After platform fees
  
  -- Campaign costs
  ad_spend DECIMAL(10,2) DEFAULT 0, -- If using paid ads
  ai_generation_cost DECIMAL(10,2) DEFAULT 0, -- Cost of AI usage
  total_cost DECIMAL(10,2) DEFAULT 0,
  
  -- ROI calculations
  roi DECIMAL(10,2), -- Return on Investment percentage
  roas DECIMAL(10,2), -- Return on Ad Spend
  cost_per_signup DECIMAL(10,2),
  cost_per_organizer DECIMAL(10,2),
  cost_per_event DECIMAL(10,2),
  lifetime_value DECIMAL(10,2), -- Estimated LTV of acquired users
  
  -- Engagement metrics
  social_shares INTEGER DEFAULT 0,
  social_comments INTEGER DEFAULT 0,
  social_likes INTEGER DEFAULT 0,
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  
  -- Attribution
  source TEXT, -- 'facebook', 'instagram', 'email', 'organic'
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  
  -- Performance scoring
  performance_score DECIMAL(5,2), -- 0-100 score based on multiple factors
  quality_score DECIMAL(5,2) -- Quality of traffic/conversions
);

CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign ON campaign_performance_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_recorded ON campaign_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_roi ON campaign_performance_metrics(roi DESC);

-- ============================================================
-- TABLE: social_media_post_tracking
-- Tracks individual social media posts and their performance
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_post_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Post details
  platform TEXT NOT NULL, -- 'facebook', 'instagram', 'twitter', 'linkedin'
  post_id TEXT, -- Platform's post ID
  post_url TEXT,
  post_content TEXT,
  post_image_url TEXT,
  
  -- Posting status
  status TEXT DEFAULT 'pending', -- 'pending', 'posted', 'failed', 'scheduled'
  posted_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_type TEXT, -- 'token_expired', 'api_error', 'rate_limit', 'permission_denied'
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  -- Attribution
  signups_attributed INTEGER DEFAULT 0,
  events_created_attributed INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(10,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_social_posts_campaign ON social_media_post_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_post_tracking(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_media_post_tracking(platform);

-- ============================================================
-- FUNCTION: log_autonomous_error
-- Logs an error and optionally notifies admin
-- ============================================================
CREATE OR REPLACE FUNCTION log_autonomous_error(
  p_operation_type TEXT,
  p_error_type TEXT,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_notify_admin BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
  v_admin_id UUID;
  v_notification_id UUID;
BEGIN
  -- Get admin user
  SELECT id INTO v_admin_id 
  FROM users 
  WHERE role = 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Log error
  INSERT INTO autonomous_operation_errors (
    operation_type,
    error_type,
    error_message,
    error_details,
    campaign_id,
    user_id
  ) VALUES (
    p_operation_type,
    p_error_type,
    p_error_message,
    p_error_details,
    p_campaign_id,
    v_admin_id
  )
  RETURNING id INTO v_error_id;
  
  -- Notify admin if requested
  IF p_notify_admin AND v_admin_id IS NOT NULL THEN
    INSERT INTO notifications (
      id,
      user_id,
      title,
      message,
      type,
      sender_name,
      metadata
    ) VALUES (
      uuid_generate_v4(),
      v_admin_id,
      '⚠️ Autonomous Operation Error',
      'Error in ' || p_operation_type || ': ' || p_error_message,
      'system',
      'EventNexus System',
      jsonb_build_object(
        'error_id', v_error_id,
        'error_type', p_error_type,
        'operation', p_operation_type,
        'campaign_id', p_campaign_id,
        'action_url', '/admin/autonomous-ops'
      )
    )
    RETURNING id INTO v_notification_id;
    
    -- Mark error as notified
    UPDATE autonomous_operation_errors
    SET notification_sent = TRUE
    WHERE id = v_error_id;
  END IF;
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: record_campaign_performance
-- Records campaign performance metrics
-- ============================================================
CREATE OR REPLACE FUNCTION record_campaign_performance(
  p_campaign_id UUID,
  p_metrics JSONB
)
RETURNS UUID AS $$
DECLARE
  v_metric_id UUID;
  v_roi DECIMAL(10,2);
  v_roas DECIMAL(10,2);
  v_performance_score DECIMAL(5,2);
BEGIN
  -- Calculate ROI
  IF (p_metrics->>'total_cost')::DECIMAL > 0 THEN
    v_roi := (((p_metrics->>'net_revenue')::DECIMAL - (p_metrics->>'total_cost')::DECIMAL) 
              / (p_metrics->>'total_cost')::DECIMAL) * 100;
  ELSE
    v_roi := 0;
  END IF;
  
  -- Calculate ROAS
  IF (p_metrics->>'ad_spend')::DECIMAL > 0 THEN
    v_roas := (p_metrics->>'gross_revenue')::DECIMAL / (p_metrics->>'ad_spend')::DECIMAL;
  ELSE
    v_roas := 0;
  END IF;
  
  -- Calculate performance score (0-100)
  v_performance_score := LEAST(100, (
    -- CTR weight: 30%
    COALESCE((p_metrics->>'ctr')::DECIMAL, 0) * 3 +
    -- Conversion weight: 40%
    LEAST(40, COALESCE((p_metrics->>'new_signups')::INTEGER, 0) * 2) +
    -- ROI weight: 30%
    LEAST(30, GREATEST(0, v_roi / 10))
  ));
  
  -- Insert metrics
  INSERT INTO campaign_performance_metrics (
    campaign_id,
    views,
    clicks,
    ctr,
    new_signups,
    new_organizers,
    new_events_created,
    tickets_sold,
    gross_revenue,
    net_revenue,
    ad_spend,
    ai_generation_cost,
    total_cost,
    roi,
    roas,
    cost_per_signup,
    cost_per_organizer,
    cost_per_event,
    social_shares,
    social_comments,
    social_likes,
    performance_score,
    source,
    utm_campaign,
    utm_source,
    utm_medium
  ) VALUES (
    p_campaign_id,
    COALESCE((p_metrics->>'views')::INTEGER, 0),
    COALESCE((p_metrics->>'clicks')::INTEGER, 0),
    COALESCE((p_metrics->>'ctr')::DECIMAL, 0),
    COALESCE((p_metrics->>'new_signups')::INTEGER, 0),
    COALESCE((p_metrics->>'new_organizers')::INTEGER, 0),
    COALESCE((p_metrics->>'new_events_created')::INTEGER, 0),
    COALESCE((p_metrics->>'tickets_sold')::INTEGER, 0),
    COALESCE((p_metrics->>'gross_revenue')::DECIMAL, 0),
    COALESCE((p_metrics->>'net_revenue')::DECIMAL, 0),
    COALESCE((p_metrics->>'ad_spend')::DECIMAL, 0),
    COALESCE((p_metrics->>'ai_generation_cost')::DECIMAL, 0),
    COALESCE((p_metrics->>'total_cost')::DECIMAL, 0),
    v_roi,
    v_roas,
    -- Calculate cost per metrics
    CASE 
      WHEN (p_metrics->>'new_signups')::INTEGER > 0 
      THEN (p_metrics->>'total_cost')::DECIMAL / (p_metrics->>'new_signups')::INTEGER
      ELSE 0
    END,
    CASE 
      WHEN (p_metrics->>'new_organizers')::INTEGER > 0 
      THEN (p_metrics->>'total_cost')::DECIMAL / (p_metrics->>'new_organizers')::INTEGER
      ELSE 0
    END,
    CASE 
      WHEN (p_metrics->>'new_events_created')::INTEGER > 0 
      THEN (p_metrics->>'total_cost')::DECIMAL / (p_metrics->>'new_events_created')::INTEGER
      ELSE 0
    END,
    COALESCE((p_metrics->>'social_shares')::INTEGER, 0),
    COALESCE((p_metrics->>'social_comments')::INTEGER, 0),
    COALESCE((p_metrics->>'social_likes')::INTEGER, 0),
    v_performance_score,
    p_metrics->>'source',
    p_metrics->>'utm_campaign',
    p_metrics->>'utm_source',
    p_metrics->>'utm_medium'
  )
  RETURNING id INTO v_metric_id;
  
  -- Update campaign metrics table
  UPDATE campaigns
  SET 
    metrics = jsonb_set(
      COALESCE(metrics, '{}'::JSONB),
      '{views}',
      to_jsonb(COALESCE((metrics->>'views')::INTEGER, 0) + COALESCE((p_metrics->>'views')::INTEGER, 0))
    ),
    metrics = jsonb_set(
      metrics,
      '{clicks}',
      to_jsonb(COALESCE((metrics->>'clicks')::INTEGER, 0) + COALESCE((p_metrics->>'clicks')::INTEGER, 0))
    ),
    metrics = jsonb_set(
      metrics,
      '{guestSignups}',
      to_jsonb(COALESCE((metrics->>'guestSignups')::INTEGER, 0) + COALESCE((p_metrics->>'new_signups')::INTEGER, 0))
    ),
    metrics = jsonb_set(
      metrics,
      '{revenueValue}',
      to_jsonb(COALESCE((metrics->>'revenueValue')::DECIMAL, 0) + COALESCE((p_metrics->>'net_revenue')::DECIMAL, 0))
    ),
    ai_metadata = jsonb_set(
      COALESCE(ai_metadata, '{}'::JSONB),
      '{last_performance_update}',
      to_jsonb(NOW())
    ),
    ai_metadata = jsonb_set(
      ai_metadata,
      '{performance_score}',
      to_jsonb(v_performance_score)
    ),
    ai_metadata = jsonb_set(
      ai_metadata,
      '{roi}',
      to_jsonb(v_roi)
    )
  WHERE id = p_campaign_id;
  
  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: track_social_media_post
-- Tracks social media post and handles errors
-- ============================================================
CREATE OR REPLACE FUNCTION track_social_media_post(
  p_campaign_id UUID,
  p_platform TEXT,
  p_post_content TEXT,
  p_post_image_url TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  v_post_id UUID;
BEGIN
  INSERT INTO social_media_post_tracking (
    campaign_id,
    platform,
    post_content,
    post_image_url,
    status
  ) VALUES (
    p_campaign_id,
    p_platform,
    p_post_content,
    p_post_image_url,
    p_status
  )
  RETURNING id INTO v_post_id;
  
  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: update_post_status
-- Updates social media post status and handles errors
-- ============================================================
CREATE OR REPLACE FUNCTION update_post_status(
  p_post_id UUID,
  p_status TEXT,
  p_platform_post_id TEXT DEFAULT NULL,
  p_post_url TEXT DEFAULT NULL,
  p_error_type TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_campaign_id UUID;
  v_platform TEXT;
  v_retry_count INTEGER;
BEGIN
  -- Get post details
  SELECT campaign_id, platform, retry_count 
  INTO v_campaign_id, v_platform, v_retry_count
  FROM social_media_post_tracking
  WHERE id = p_post_id;
  
  -- Update post
  UPDATE social_media_post_tracking
  SET 
    status = p_status,
    post_id = COALESCE(p_platform_post_id, post_id),
    post_url = COALESCE(p_post_url, post_url),
    posted_at = CASE WHEN p_status = 'posted' THEN NOW() ELSE posted_at END,
    error_type = p_error_type,
    error_message = p_error_message,
    error_details = p_error_details,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
    last_retry_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE last_retry_at END
  WHERE id = p_post_id;
  
  -- If error and exceeds retries, log error and notify admin
  IF p_status = 'failed' AND v_retry_count >= 3 THEN
    PERFORM log_autonomous_error(
      'social_posting',
      COALESCE(p_error_type, 'posting_failed'),
      'Failed to post to ' || v_platform || ' after ' || v_retry_count || ' retries: ' || COALESCE(p_error_message, 'Unknown error'),
      jsonb_build_object(
        'post_id', p_post_id,
        'platform', v_platform,
        'error_details', p_error_details
      ),
      v_campaign_id,
      TRUE -- Notify admin
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: get_campaign_analytics
-- Returns comprehensive analytics for a campaign
-- ============================================================
CREATE OR REPLACE FUNCTION get_campaign_analytics(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_analytics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'campaign_id', p_campaign_id,
    'total_performance', (
      SELECT jsonb_build_object(
        'total_views', COALESCE(SUM(views), 0),
        'total_clicks', COALESCE(SUM(clicks), 0),
        'avg_ctr', COALESCE(AVG(ctr), 0),
        'total_signups', COALESCE(SUM(new_signups), 0),
        'total_organizers', COALESCE(SUM(new_organizers), 0),
        'total_events_created', COALESCE(SUM(new_events_created), 0),
        'total_revenue', COALESCE(SUM(net_revenue), 0),
        'total_cost', COALESCE(SUM(total_cost), 0),
        'avg_roi', COALESCE(AVG(roi), 0),
        'avg_performance_score', COALESCE(AVG(performance_score), 0),
        'best_roi', COALESCE(MAX(roi), 0),
        'worst_roi', COALESCE(MIN(roi), 0)
      )
      FROM campaign_performance_metrics
      WHERE campaign_id = p_campaign_id
    ),
    'social_media_performance', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'platform', platform,
          'total_posts', COUNT(*),
          'successful_posts', COUNT(*) FILTER (WHERE status = 'posted'),
          'failed_posts', COUNT(*) FILTER (WHERE status = 'failed'),
          'total_impressions', COALESCE(SUM(impressions), 0),
          'total_engagement', COALESCE(SUM(engagement), 0),
          'total_clicks', COALESCE(SUM(clicks), 0),
          'signups_attributed', COALESCE(SUM(signups_attributed), 0)
        )
      )
      FROM social_media_post_tracking
      WHERE campaign_id = p_campaign_id
      GROUP BY platform
    ),
    'errors', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'error_type', error_type,
          'error_message', error_message,
          'created_at', created_at,
          'resolved', resolved
        )
        ORDER BY created_at DESC
      )
      FROM autonomous_operation_errors
      WHERE campaign_id = p_campaign_id
      LIMIT 10
    ),
    'performance_over_time', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', DATE(recorded_at),
          'views', views,
          'clicks', clicks,
          'signups', new_signups,
          'revenue', net_revenue,
          'roi', roi,
          'performance_score', performance_score
        )
        ORDER BY recorded_at ASC
      )
      FROM campaign_performance_metrics
      WHERE campaign_id = p_campaign_id
    )
  ) INTO v_analytics;
  
  RETURN v_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: get_top_performing_campaigns
-- Returns best performing campaigns by metric
-- ============================================================
CREATE OR REPLACE FUNCTION get_top_performing_campaigns(
  p_metric TEXT DEFAULT 'roi', -- 'roi', 'signups', 'revenue', 'performance_score'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  campaign_id UUID,
  campaign_title TEXT,
  metric_value DECIMAL,
  total_signups INTEGER,
  total_revenue DECIMAL,
  avg_roi DECIMAL,
  performance_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.title as campaign_title,
    CASE p_metric
      WHEN 'roi' THEN AVG(cpm.roi)
      WHEN 'signups' THEN SUM(cpm.new_signups)::DECIMAL
      WHEN 'revenue' THEN SUM(cpm.net_revenue)
      WHEN 'performance_score' THEN AVG(cpm.performance_score)
      ELSE AVG(cpm.roi)
    END as metric_value,
    SUM(cpm.new_signups)::INTEGER as total_signups,
    SUM(cpm.net_revenue) as total_revenue,
    AVG(cpm.roi) as avg_roi,
    AVG(cpm.performance_score) as performance_score
  FROM campaigns c
  JOIN campaign_performance_metrics cpm ON c.id = cpm.campaign_id
  GROUP BY c.id, c.title
  ORDER BY metric_value DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT ALL ON autonomous_operation_errors TO authenticated;
GRANT ALL ON campaign_performance_metrics TO authenticated;
GRANT ALL ON social_media_post_tracking TO authenticated;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE autonomous_operation_errors IS 'Logs all errors in autonomous operations with admin notification';
COMMENT ON TABLE campaign_performance_metrics IS 'Tracks real campaign performance, ROI, and conversions';
COMMENT ON TABLE social_media_post_tracking IS 'Tracks individual social media posts and their performance';
COMMENT ON FUNCTION log_autonomous_error IS 'Logs error and notifies admin via notification';
COMMENT ON FUNCTION record_campaign_performance IS 'Records campaign performance metrics and calculates ROI';
COMMENT ON FUNCTION track_social_media_post IS 'Creates tracking record for social media post';
COMMENT ON FUNCTION update_post_status IS 'Updates post status and handles error notifications';
COMMENT ON FUNCTION get_campaign_analytics IS 'Returns comprehensive analytics for a campaign';
COMMENT ON FUNCTION get_top_performing_campaigns IS 'Returns best performing campaigns by chosen metric';
