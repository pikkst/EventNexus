-- ============================================
-- Fix AI Learning Function Errors
-- ============================================
-- Fixes for admin dashboard AI Learning page errors:
-- 1. Fix get_top_performing_elements column reference (target_audience -> target)
-- 2. Resolve identify_underperforming_campaigns function overload conflict
-- ============================================

-- Drop the conflicting parameterless version of identify_underperforming_campaigns
-- The version with default parameters in create_autonomous_operations.sql will remain
DROP FUNCTION IF EXISTS identify_underperforming_campaigns();

-- Update get_top_performing_elements to use correct column name
CREATE OR REPLACE FUNCTION get_top_performing_elements(
  p_element_type VARCHAR, -- 'title', 'cta', 'platform', 'audience'
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  element_value TEXT,
  avg_ctr DECIMAL(5,2),
  avg_engagement_rate DECIMAL(5,2),
  total_impressions BIGINT,
  total_conversions BIGINT,
  campaign_count BIGINT
) AS $$
BEGIN
  IF p_element_type = 'platform' THEN
    RETURN QUERY
    SELECT 
      ca.source::TEXT as element_value,
      ROUND(AVG(CASE WHEN ca.impressions > 0 THEN (ca.clicks::decimal / ca.impressions * 100) ELSE 0 END), 2) as avg_ctr,
      ROUND(AVG(CASE WHEN ca.impressions > 0 THEN ((ca.likes + ca.shares + ca.comments)::decimal / ca.impressions * 100) ELSE 0 END), 2) as avg_engagement_rate,
      SUM(ca.impressions)::BIGINT as total_impressions,
      SUM(ca.ticket_purchases)::BIGINT as total_conversions,
      COUNT(DISTINCT ca.campaign_id)::BIGINT as campaign_count
    FROM campaign_analytics ca
    WHERE ca.source IS NOT NULL
      AND ca.recorded_at >= NOW() - INTERVAL '90 days'
    GROUP BY ca.source
    ORDER BY avg_ctr DESC, avg_engagement_rate DESC
    LIMIT p_limit;
  
  ELSIF p_element_type = 'audience' THEN
    RETURN QUERY
    SELECT 
      c.target::TEXT as element_value,
      ROUND(AVG(cp.ctr), 2) as avg_ctr,
      ROUND(AVG(cp.engagement_rate), 2) as avg_engagement_rate,
      SUM(cp.total_impressions)::BIGINT as total_impressions,
      SUM(cp.total_conversions)::BIGINT as total_conversions,
      COUNT(*)::BIGINT as campaign_count
    FROM campaigns c
    JOIN campaign_performance cp ON c.id = cp.campaign_id
    WHERE c.target IS NOT NULL
      AND c.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY c.target
    ORDER BY avg_ctr DESC, avg_engagement_rate DESC
    LIMIT p_limit;
  
  ELSE
    -- Default: return empty
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION get_top_performing_elements TO authenticated;

-- Verify the correct identify_underperforming_campaigns function exists
-- (Should be the one with default parameters from create_autonomous_operations.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'identify_underperforming_campaigns'
  ) THEN
    RAISE EXCEPTION 'identify_underperforming_campaigns function not found. Run create_autonomous_operations.sql first.';
  END IF;
END $$;
