-- Campaign Smart Scheduling System
-- Super AI Campaign Manager - Phase 2: Smart Scheduling

-- ============================================
-- Optimal Posting Time Analysis Functions
-- ============================================

-- Get best performing hours for a platform
CREATE OR REPLACE FUNCTION get_optimal_posting_hours(
  p_platform VARCHAR DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  hour_of_day INTEGER,
  avg_ctr DECIMAL(5,2),
  avg_engagement_rate DECIMAL(5,2),
  total_impressions BIGINT,
  total_clicks BIGINT,
  campaign_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM ca.recorded_at)::INTEGER as hour_of_day,
    ROUND(AVG(CASE WHEN ca.impressions > 0 THEN (ca.clicks::decimal / ca.impressions * 100) ELSE 0 END), 2) as avg_ctr,
    ROUND(AVG(CASE WHEN ca.impressions > 0 THEN ((ca.likes + ca.shares + ca.comments)::decimal / ca.impressions * 100) ELSE 0 END), 2) as avg_engagement_rate,
    SUM(ca.impressions)::BIGINT as total_impressions,
    SUM(ca.clicks)::BIGINT as total_clicks,
    COUNT(DISTINCT ca.campaign_id)::BIGINT as campaign_count
  FROM campaign_analytics ca
  WHERE 
    ca.recorded_at >= NOW() - INTERVAL '1 day' * p_days_back
    AND (p_platform IS NULL OR ca.source = p_platform)
    AND ca.impressions > 0
  GROUP BY EXTRACT(HOUR FROM ca.recorded_at)::INTEGER
  HAVING COUNT(DISTINCT ca.campaign_id) >= 3
  ORDER BY avg_ctr DESC, avg_engagement_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Get best performing days of week
CREATE OR REPLACE FUNCTION get_optimal_posting_days(
  p_platform VARCHAR DEFAULT NULL,
  p_days_back INTEGER DEFAULT 90
)
RETURNS TABLE(
  day_of_week INTEGER,
  day_name VARCHAR,
  avg_ctr DECIMAL(5,2),
  avg_engagement_rate DECIMAL(5,2),
  total_impressions BIGINT,
  total_clicks BIGINT,
  campaign_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DOW FROM ca.recorded_at)::INTEGER as day_of_week,
    TO_CHAR(ca.recorded_at, 'Day') as day_name,
    ROUND(AVG(CASE WHEN ca.impressions > 0 THEN (ca.clicks::decimal / ca.impressions * 100) ELSE 0 END), 2) as avg_ctr,
    ROUND(AVG(CASE WHEN ca.impressions > 0 THEN ((ca.likes + ca.shares + ca.comments)::decimal / ca.impressions * 100) ELSE 0 END), 2) as avg_engagement_rate,
    SUM(ca.impressions)::BIGINT as total_impressions,
    SUM(ca.clicks)::BIGINT as total_clicks,
    COUNT(DISTINCT ca.campaign_id)::BIGINT as campaign_count
  FROM campaign_analytics ca
  WHERE 
    ca.recorded_at >= NOW() - INTERVAL '1 day' * p_days_back
    AND (p_platform IS NULL OR ca.source = p_platform)
    AND ca.impressions > 0
  GROUP BY EXTRACT(DOW FROM ca.recorded_at)::INTEGER, TO_CHAR(ca.recorded_at, 'Day')
  HAVING COUNT(DISTINCT ca.campaign_id) >= 5
  ORDER BY avg_ctr DESC, avg_engagement_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Get platform-specific optimal time recommendations
CREATE OR REPLACE FUNCTION get_platform_optimal_times()
RETURNS TABLE(
  platform VARCHAR,
  optimal_hour INTEGER,
  optimal_day INTEGER,
  confidence_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH hourly_stats AS (
    SELECT 
      ca.source as platform,
      EXTRACT(HOUR FROM ca.recorded_at)::INTEGER as hour,
      AVG(CASE WHEN ca.impressions > 0 THEN (ca.clicks::decimal / ca.impressions * 100) ELSE 0 END) as avg_ctr,
      COUNT(DISTINCT ca.campaign_id) as sample_size
    FROM campaign_analytics ca
    WHERE ca.recorded_at >= NOW() - INTERVAL '60 days'
      AND ca.impressions > 0
      AND ca.source IS NOT NULL
    GROUP BY ca.source, EXTRACT(HOUR FROM ca.recorded_at)::INTEGER
    HAVING COUNT(DISTINCT ca.campaign_id) >= 3
  ),
  daily_stats AS (
    SELECT 
      ca.source as platform,
      EXTRACT(DOW FROM ca.recorded_at)::INTEGER as day,
      AVG(CASE WHEN ca.impressions > 0 THEN (ca.clicks::decimal / ca.impressions * 100) ELSE 0 END) as avg_ctr,
      COUNT(DISTINCT ca.campaign_id) as sample_size
    FROM campaign_analytics ca
    WHERE ca.recorded_at >= NOW() - INTERVAL '90 days'
      AND ca.impressions > 0
      AND ca.source IS NOT NULL
    GROUP BY ca.source, EXTRACT(DOW FROM ca.recorded_at)::INTEGER
    HAVING COUNT(DISTINCT ca.campaign_id) >= 5
  ),
  best_hours AS (
    SELECT DISTINCT ON (platform)
      platform,
      hour,
      avg_ctr,
      sample_size
    FROM hourly_stats
    ORDER BY platform, avg_ctr DESC, sample_size DESC
  ),
  best_days AS (
    SELECT DISTINCT ON (platform)
      platform,
      day,
      avg_ctr,
      sample_size
    FROM daily_stats
    ORDER BY platform, avg_ctr DESC, sample_size DESC
  )
  SELECT 
    COALESCE(bh.platform, bd.platform) as platform,
    bh.hour as optimal_hour,
    bd.day as optimal_day,
    ROUND(LEAST(
      (bh.sample_size::decimal / 10 * 100), 
      (bd.sample_size::decimal / 20 * 100), 
      100
    ), 2) as confidence_score
  FROM best_hours bh
  FULL OUTER JOIN best_days bd ON bh.platform = bd.platform
  WHERE bh.platform IS NOT NULL OR bd.platform IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Schedule Processing Functions
-- ============================================

-- Get next scheduled posts that are ready to execute
CREATE OR REPLACE FUNCTION get_ready_scheduled_posts()
RETURNS TABLE(
  id UUID,
  campaign_id UUID,
  scheduled_for TIMESTAMPTZ,
  timezone VARCHAR,
  platforms JSONB,
  content_variations JSONB,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.campaign_id,
    cs.scheduled_for,
    cs.timezone,
    cs.platforms,
    cs.content_variations,
    cs.retry_count
  FROM campaign_schedule cs
  WHERE 
    cs.status = 'scheduled'
    AND cs.scheduled_for <= NOW()
    AND cs.retry_count < cs.max_retries
  ORDER BY cs.scheduled_for ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Mark schedule as posting
CREATE OR REPLACE FUNCTION mark_schedule_posting(p_schedule_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_schedule
  SET 
    status = 'posting',
    updated_at = NOW()
  WHERE id = p_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- Mark schedule as posted successfully
CREATE OR REPLACE FUNCTION mark_schedule_posted(
  p_schedule_id UUID,
  p_post_ids JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_schedule
  SET 
    status = 'posted',
    posted_at = NOW(),
    post_ids = p_post_ids,
    updated_at = NOW()
  WHERE id = p_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- Mark schedule as failed (for retry)
CREATE OR REPLACE FUNCTION mark_schedule_failed(
  p_schedule_id UUID,
  p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_schedule
  SET 
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'scheduled'
    END,
    retry_count = retry_count + 1,
    scheduled_for = CASE 
      WHEN retry_count + 1 < max_retries 
      THEN NOW() + (INTERVAL '5 minutes' * POWER(2, retry_count))
      ELSE scheduled_for
    END,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Scheduling Helper Functions
-- ============================================

-- Calculate next optimal posting time for a platform
CREATE OR REPLACE FUNCTION calculate_next_optimal_time(
  p_platform VARCHAR,
  p_timezone VARCHAR DEFAULT 'UTC',
  p_days_ahead INTEGER DEFAULT 7
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_optimal_hour INTEGER;
  v_optimal_day INTEGER;
  v_current_time TIMESTAMPTZ;
  v_next_time TIMESTAMPTZ;
  v_attempts INTEGER := 0;
BEGIN
  -- Get platform optimal times
  SELECT optimal_hour, optimal_day
  INTO v_optimal_hour, v_optimal_day
  FROM get_platform_optimal_times()
  WHERE platform = p_platform
  LIMIT 1;
  
  -- Default to popular times if no data
  IF v_optimal_hour IS NULL THEN
    v_optimal_hour := CASE p_platform
      WHEN 'facebook' THEN 13  -- 1 PM
      WHEN 'instagram' THEN 11 -- 11 AM
      WHEN 'twitter' THEN 9    -- 9 AM
      WHEN 'linkedin' THEN 8   -- 8 AM
      ELSE 12
    END;
  END IF;
  
  IF v_optimal_day IS NULL THEN
    v_optimal_day := 3; -- Wednesday
  END IF;
  
  -- Convert current time to target timezone
  v_current_time := NOW() AT TIME ZONE p_timezone;
  
  -- Calculate next occurrence
  v_next_time := v_current_time + INTERVAL '1 day';
  
  -- Find next matching day of week
  WHILE EXTRACT(DOW FROM v_next_time)::INTEGER != v_optimal_day 
    AND v_attempts < 7 LOOP
    v_next_time := v_next_time + INTERVAL '1 day';
    v_attempts := v_attempts + 1;
  END LOOP;
  
  -- Set to optimal hour
  v_next_time := DATE_TRUNC('day', v_next_time) + (v_optimal_hour || ' hours')::INTERVAL;
  
  -- Convert back to UTC
  RETURN v_next_time AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Bulk Scheduling Function
-- ============================================

-- Schedule campaign for multiple platforms at optimal times
CREATE OR REPLACE FUNCTION schedule_campaign_auto(
  p_campaign_id UUID,
  p_platforms VARCHAR[],
  p_timezone VARCHAR DEFAULT 'Europe/Tallinn',
  p_content_variations JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_schedule_id UUID;
  v_optimal_time TIMESTAMPTZ;
  v_platform VARCHAR;
BEGIN
  -- Use first platform's optimal time for all platforms in this batch
  v_platform := p_platforms[1];
  v_optimal_time := calculate_next_optimal_time(v_platform, p_timezone, 7);
  
  -- Insert schedule
  INSERT INTO campaign_schedule (
    campaign_id,
    scheduled_for,
    timezone,
    platforms,
    content_variations,
    status
  )
  VALUES (
    p_campaign_id,
    v_optimal_time,
    p_timezone,
    array_to_json(p_platforms)::JSONB,
    p_content_variations,
    'scheduled'
  )
  RETURNING id INTO v_schedule_id;
  
  RETURN v_schedule_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Analytics Views
-- ============================================

-- View for schedule performance analysis
CREATE OR REPLACE VIEW v_schedule_performance AS
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_optimal_posting_hours TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimal_posting_days TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_optimal_times TO authenticated;
GRANT EXECUTE ON FUNCTION get_ready_scheduled_posts TO service_role;
GRANT EXECUTE ON FUNCTION mark_schedule_posting TO service_role;
GRANT EXECUTE ON FUNCTION mark_schedule_posted TO service_role;
GRANT EXECUTE ON FUNCTION mark_schedule_failed TO service_role;
GRANT EXECUTE ON FUNCTION calculate_next_optimal_time TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_campaign_auto TO authenticated;

GRANT SELECT ON v_schedule_performance TO authenticated;
