-- Enhanced Analytics Tracking with Geographic and Device Data
-- Created: 2026-01-15
-- Purpose: Add detailed tracking columns for comprehensive analytics

-- Add new columns to analytics_events table
ALTER TABLE IF EXISTS analytics_events 
ADD COLUMN IF NOT EXISTS user_country TEXT,
ADD COLUMN IF NOT EXISTS user_city TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS os TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS search_engine TEXT CHECK (search_engine IN ('Google', 'Bing', 'DuckDuckGo', 'Yahoo', 'Baidu', 'Yandex', 'Other'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_user_country ON analytics_events(user_country);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON analytics_events(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_browser ON analytics_events(browser);
CREATE INDEX IF NOT EXISTS idx_analytics_search_engine ON analytics_events(search_engine);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);

-- Add columns to funnel_tracking table
ALTER TABLE IF EXISTS funnel_tracking
ADD COLUMN IF NOT EXISTS user_country TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS os TEXT;

-- Create indexes for funnel tracking
CREATE INDEX IF NOT EXISTS idx_funnel_user_country ON funnel_tracking(user_country);
CREATE INDEX IF NOT EXISTS idx_funnel_device_type ON funnel_tracking(device_type);
CREATE INDEX IF NOT EXISTS idx_funnel_timestamp ON funnel_tracking(timestamp);

-- Create view for admin-filtered analytics (excludes admin users)
CREATE OR REPLACE VIEW analytics_events_public AS
SELECT 
  ae.*,
  u.role as user_role
FROM analytics_events ae
LEFT JOIN users u ON ae.user_id = u.id
WHERE u.role IS NULL OR u.role != 'admin';

-- Create function to get traffic by country
CREATE OR REPLACE FUNCTION get_traffic_by_country(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  country TEXT,
  visit_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ae.user_country, 'Unknown') as country,
    COUNT(*) as visit_count,
    COUNT(DISTINCT ae.user_id) as unique_users
  FROM analytics_events_public ae
  WHERE ae.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    AND ae.event_type = 'page_view'
  GROUP BY ae.user_country
  ORDER BY visit_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get traffic by device
CREATE OR REPLACE FUNCTION get_traffic_by_device(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  device TEXT,
  visit_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH device_counts AS (
    SELECT 
      COALESCE(ae.device_type, 'Unknown') as device,
      COUNT(*) as count
    FROM analytics_events_public ae
    WHERE ae.timestamp >= NOW() - (days_back || ' days')::INTERVAL
      AND ae.event_type = 'page_view'
    GROUP BY ae.device_type
  ),
  total AS (
    SELECT SUM(count) as total_count FROM device_counts
  )
  SELECT 
    dc.device,
    dc.count as visit_count,
    ROUND((dc.count::NUMERIC / t.total_count * 100), 2) as percentage
  FROM device_counts dc, total t
  ORDER BY dc.count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get traffic by browser
CREATE OR REPLACE FUNCTION get_traffic_by_browser(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  browser TEXT,
  visit_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH browser_counts AS (
    SELECT 
      COALESCE(ae.browser, 'Unknown') as browser,
      COUNT(*) as count
    FROM analytics_events_public ae
    WHERE ae.timestamp >= NOW() - (days_back || ' days')::INTERVAL
      AND ae.event_type = 'page_view'
    GROUP BY ae.browser
  ),
  total AS (
    SELECT SUM(count) as total_count FROM browser_counts
  )
  SELECT 
    bc.browser,
    bc.count as visit_count,
    ROUND((bc.count::NUMERIC / t.total_count * 100), 2) as percentage
  FROM browser_counts bc, total t
  ORDER BY bc.count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get traffic by search engine
CREATE OR REPLACE FUNCTION get_traffic_by_search_engine(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  search_engine TEXT,
  visit_count BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ae.search_engine, 'Direct/Other') as search_engine,
    COUNT(*) as visit_count,
    ROUND(
      (COUNT(*) FILTER (WHERE ae.event_type = 'conversion')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100), 
      2
    ) as conversion_rate
  FROM analytics_events_public ae
  WHERE ae.timestamp >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY ae.search_engine
  ORDER BY visit_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get referrer statistics
CREATE OR REPLACE FUNCTION get_top_referrers(
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  referrer_domain TEXT,
  visit_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ae.referrer IS NULL OR ae.referrer = '' THEN 'Direct'
      ELSE regexp_replace(ae.referrer, '^https?://([^/]+).*', '\1')
    END as referrer_domain,
    COUNT(*) as visit_count,
    COUNT(DISTINCT ae.user_id) as unique_users
  FROM analytics_events_public ae
  WHERE ae.timestamp >= NOW() - (days_back || ' days')::INTERVAL
    AND ae.event_type = 'page_view'
  GROUP BY referrer_domain
  ORDER BY visit_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_traffic_by_country TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_traffic_by_device TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_traffic_by_browser TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_traffic_by_search_engine TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_referrers TO authenticated, anon;

-- Comment on functions
COMMENT ON FUNCTION get_traffic_by_country IS 'Get visitor traffic grouped by country (excludes admin users)';
COMMENT ON FUNCTION get_traffic_by_device IS 'Get visitor traffic grouped by device type (excludes admin users)';
COMMENT ON FUNCTION get_traffic_by_browser IS 'Get visitor traffic grouped by browser (excludes admin users)';
COMMENT ON FUNCTION get_traffic_by_search_engine IS 'Get visitor traffic from search engines (excludes admin users)';
COMMENT ON FUNCTION get_top_referrers IS 'Get top referrer domains (excludes admin users)';
