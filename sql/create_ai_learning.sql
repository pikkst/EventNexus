-- Campaign AI Learning System
-- Super AI Campaign Manager - Phase 3: AI Learning

-- ============================================
-- Pattern Recognition Functions
-- ============================================

-- Analyze top performing campaigns to identify patterns
CREATE OR REPLACE FUNCTION analyze_campaign_patterns(
  p_min_ctr DECIMAL DEFAULT 2.0,
  p_min_conversions INTEGER DEFAULT 5,
  p_days_back INTEGER DEFAULT 90
)
RETURNS TABLE(
  pattern_type VARCHAR,
  pattern_data JSONB,
  avg_ctr DECIMAL(5,2),
  avg_roi DECIMAL(10,2),
  campaign_count BIGINT,
  confidence_score DECIMAL(5,2)
) AS $$
BEGIN
  -- Analyze headline patterns
  RETURN QUERY
  SELECT 
    'headline_length' as pattern_type,
    jsonb_build_object(
      'length_range', 
      CASE 
        WHEN LENGTH(c.title) < 30 THEN 'short'
        WHEN LENGTH(c.title) < 60 THEN 'medium'
        ELSE 'long'
      END,
      'avg_length', AVG(LENGTH(c.title))::INTEGER
    ) as pattern_data,
    ROUND(AVG(cp.ctr), 2) as avg_ctr,
    ROUND(AVG(cp.roi), 2) as avg_roi,
    COUNT(*)::BIGINT as campaign_count,
    ROUND(LEAST(COUNT(*)::DECIMAL / 10 * 100, 100), 2) as confidence_score
  FROM campaigns c
  JOIN campaign_performance cp ON c.id = cp.campaign_id
  WHERE 
    cp.ctr >= p_min_ctr
    AND cp.total_conversions >= p_min_conversions
    AND c.created_at >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY 
    CASE 
      WHEN LENGTH(c.title) < 30 THEN 'short'
      WHEN LENGTH(c.title) < 60 THEN 'medium'
      ELSE 'long'
    END
  HAVING COUNT(*) >= 3;
END;
$$ LANGUAGE plpgsql;

-- Get best performing content elements
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
      c.target_audience::TEXT as element_value,
      ROUND(AVG(cp.ctr), 2) as avg_ctr,
      ROUND(AVG(cp.engagement_rate), 2) as avg_engagement_rate,
      SUM(cp.total_impressions)::BIGINT as total_impressions,
      SUM(cp.total_conversions)::BIGINT as total_conversions,
      COUNT(*)::BIGINT as campaign_count
    FROM campaigns c
    JOIN campaign_performance cp ON c.id = cp.campaign_id
    WHERE c.target_audience IS NOT NULL
      AND c.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY c.target_audience
    ORDER BY avg_ctr DESC, avg_engagement_rate DESC
    LIMIT p_limit;
  
  ELSE
    -- Default: return empty
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Identify campaigns that need optimization
CREATE OR REPLACE FUNCTION identify_underperforming_campaigns()
RETURNS TABLE(
  campaign_id UUID,
  campaign_title VARCHAR,
  issue_type VARCHAR,
  severity VARCHAR,
  current_ctr DECIMAL(5,2),
  current_roi DECIMAL(10,2),
  total_spend DECIMAL(10,2),
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.title as campaign_title,
    CASE 
      WHEN cp.ctr < 0.5 AND cp.total_impressions > 1000 THEN 'low_ctr'
      WHEN cp.roi < 0 AND cp.total_spend > 100 THEN 'negative_roi'
      WHEN cp.conversion_rate < 1.0 AND cp.total_clicks > 100 THEN 'low_conversion'
      WHEN cp.engagement_rate < 0.5 AND cp.total_impressions > 500 THEN 'low_engagement'
    END as issue_type,
    CASE 
      WHEN cp.total_spend > 500 OR cp.total_impressions > 10000 THEN 'critical'
      WHEN cp.total_spend > 200 OR cp.total_impressions > 5000 THEN 'warning'
      ELSE 'info'
    END as severity,
    cp.ctr as current_ctr,
    cp.roi as current_roi,
    cp.total_spend,
    CASE 
      WHEN cp.ctr < 0.5 AND cp.total_impressions > 1000 THEN 'Consider A/B testing headline and image. Current CTR is below platform average.'
      WHEN cp.roi < 0 AND cp.total_spend > 100 THEN 'Pause campaign immediately. Negative ROI detected. Review targeting and creative.'
      WHEN cp.conversion_rate < 1.0 AND cp.total_clicks > 100 THEN 'Improve landing page or CTA. Getting clicks but no conversions.'
      WHEN cp.engagement_rate < 0.5 AND cp.total_impressions > 500 THEN 'Content not resonating. Try different messaging or visuals.'
    END as recommendation
  FROM campaigns c
  JOIN campaign_performance cp ON c.id = cp.campaign_id
  WHERE 
    cp.is_active = true
    AND (
      (cp.ctr < 0.5 AND cp.total_impressions > 1000)
      OR (cp.roi < 0 AND cp.total_spend > 100)
      OR (cp.conversion_rate < 1.0 AND cp.total_clicks > 100)
      OR (cp.engagement_rate < 0.5 AND cp.total_impressions > 500)
    )
  ORDER BY 
    CASE 
      WHEN cp.total_spend > 500 OR cp.total_impressions > 10000 THEN 1
      WHEN cp.total_spend > 200 OR cp.total_impressions > 5000 THEN 2
      ELSE 3
    END,
    cp.total_spend DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- A/B Test Creation Functions
-- ============================================

-- Generate A/B test variants for a campaign
CREATE OR REPLACE FUNCTION create_ab_test_from_campaign(
  p_campaign_id UUID,
  p_test_type VARCHAR, -- 'headline', 'image', 'cta', 'copy'
  p_variant_a JSONB,
  p_variant_b JSONB
)
RETURNS UUID AS $$
DECLARE
  v_test_id UUID;
BEGIN
  INSERT INTO campaign_ab_tests (
    campaign_id,
    test_name,
    test_type,
    variant_a,
    variant_b,
    status
  )
  VALUES (
    p_campaign_id,
    p_test_type || ' Test - ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI'),
    p_test_type,
    p_variant_a,
    p_variant_b,
    'running'
  )
  RETURNING id INTO v_test_id;
  
  RETURN v_test_id;
END;
$$ LANGUAGE plpgsql;

-- Evaluate A/B test results and determine winner
CREATE OR REPLACE FUNCTION evaluate_ab_test(p_test_id UUID)
RETURNS VOID AS $$
DECLARE
  v_test RECORD;
  v_a_ctr DECIMAL;
  v_b_ctr DECIMAL;
  v_a_conv_rate DECIMAL;
  v_b_conv_rate DECIMAL;
  v_winner VARCHAR;
  v_improvement DECIMAL;
  v_confidence DECIMAL;
BEGIN
  -- Get test data
  SELECT * INTO v_test
  FROM campaign_ab_tests
  WHERE id = p_test_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A/B test not found: %', p_test_id;
  END IF;
  
  -- Calculate metrics
  v_a_ctr := CASE 
    WHEN v_test.variant_a_impressions > 0 
    THEN (v_test.variant_a_clicks::decimal / v_test.variant_a_impressions * 100)
    ELSE 0 
  END;
  
  v_b_ctr := CASE 
    WHEN v_test.variant_b_impressions > 0 
    THEN (v_test.variant_b_clicks::decimal / v_test.variant_b_impressions * 100)
    ELSE 0 
  END;
  
  v_a_conv_rate := CASE 
    WHEN v_test.variant_a_clicks > 0 
    THEN (v_test.variant_a_conversions::decimal / v_test.variant_a_clicks * 100)
    ELSE 0 
  END;
  
  v_b_conv_rate := CASE 
    WHEN v_test.variant_b_clicks > 0 
    THEN (v_test.variant_b_conversions::decimal / v_test.variant_b_clicks * 100)
    ELSE 0 
  END;
  
  -- Determine winner (prioritize conversion rate, fallback to CTR)
  IF v_a_conv_rate > v_b_conv_rate * 1.1 THEN
    v_winner := 'a';
    v_improvement := ((v_a_conv_rate - v_b_conv_rate) / NULLIF(v_b_conv_rate, 0) * 100);
  ELSIF v_b_conv_rate > v_a_conv_rate * 1.1 THEN
    v_winner := 'b';
    v_improvement := ((v_b_conv_rate - v_a_conv_rate) / NULLIF(v_a_conv_rate, 0) * 100);
  ELSIF v_a_ctr > v_b_ctr THEN
    v_winner := 'a';
    v_improvement := ((v_a_ctr - v_b_ctr) / NULLIF(v_b_ctr, 0) * 100);
  ELSIF v_b_ctr > v_a_ctr THEN
    v_winner := 'b';
    v_improvement := ((v_b_ctr - v_a_ctr) / NULLIF(v_a_ctr, 0) * 100);
  ELSE
    v_winner := NULL;
    v_improvement := 0;
  END IF;
  
  -- Calculate confidence (based on sample size)
  v_confidence := LEAST(
    ((v_test.variant_a_impressions + v_test.variant_b_impressions)::decimal / 1000 * 100),
    100
  );
  
  -- Update test with results
  UPDATE campaign_ab_tests
  SET 
    winner = v_winner,
    improvement_percentage = ROUND(v_improvement, 2),
    confidence_level = ROUND(v_confidence, 2),
    status = CASE 
      WHEN v_confidence >= 95 AND v_winner IS NOT NULL THEN 'completed'
      ELSE 'running'
    END,
    test_ended_at = CASE 
      WHEN v_confidence >= 95 AND v_winner IS NOT NULL THEN NOW()
      ELSE NULL
    END,
    ai_recommendation = CASE 
      WHEN v_winner = 'a' THEN 'Variant A performed ' || ROUND(v_improvement, 0)::TEXT || '% better. Apply these changes to future campaigns.'
      WHEN v_winner = 'b' THEN 'Variant B performed ' || ROUND(v_improvement, 0)::TEXT || '% better. Apply these changes to future campaigns.'
      ELSE 'Insufficient data or no clear winner. Continue test or try different variants.'
    END
  WHERE id = p_test_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Insight Generation
-- ============================================

-- Store AI-generated insight
CREATE OR REPLACE FUNCTION store_campaign_insight(
  p_campaign_id UUID,
  p_insight_type VARCHAR,
  p_severity VARCHAR,
  p_title VARCHAR,
  p_description TEXT,
  p_ai_recommendation TEXT,
  p_suggested_action VARCHAR,
  p_confidence_score DECIMAL,
  p_insight_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_insight_id UUID;
BEGIN
  INSERT INTO campaign_insights (
    campaign_id,
    insight_type,
    severity,
    title,
    description,
    ai_recommendation,
    suggested_action,
    confidence_score,
    insight_data
  )
  VALUES (
    p_campaign_id,
    p_insight_type,
    p_severity,
    p_title,
    p_description,
    p_ai_recommendation,
    p_suggested_action,
    p_confidence_score,
    p_insight_data
  )
  RETURNING id INTO v_insight_id;
  
  RETURN v_insight_id;
END;
$$ LANGUAGE plpgsql;

-- Get insights for a campaign
CREATE OR REPLACE FUNCTION get_campaign_insights(
  p_campaign_id UUID,
  p_severity VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  insight_type VARCHAR,
  severity VARCHAR,
  title VARCHAR,
  description TEXT,
  ai_recommendation TEXT,
  suggested_action VARCHAR,
  confidence_score DECIMAL,
  is_acted_upon BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.insight_type,
    ci.severity,
    ci.title,
    ci.description,
    ci.ai_recommendation,
    ci.suggested_action,
    ci.confidence_score,
    ci.is_acted_upon,
    ci.created_at
  FROM campaign_insights ci
  WHERE 
    ci.campaign_id = p_campaign_id
    AND (p_severity IS NULL OR ci.severity = p_severity)
  ORDER BY 
    CASE ci.severity
      WHEN 'critical' THEN 1
      WHEN 'warning' THEN 2
      WHEN 'success' THEN 3
      WHEN 'info' THEN 4
    END,
    ci.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Mark insight as acted upon
CREATE OR REPLACE FUNCTION mark_insight_acted(
  p_insight_id UUID,
  p_action_taken VARCHAR,
  p_action_result TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaign_insights
  SET 
    is_acted_upon = true,
    action_taken = p_action_taken,
    action_result = p_action_result,
    acted_at = NOW()
  WHERE id = p_insight_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Learning Summary Views
-- ============================================

CREATE OR REPLACE VIEW v_campaign_learning_summary AS
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION analyze_campaign_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performing_elements TO authenticated;
GRANT EXECUTE ON FUNCTION identify_underperforming_campaigns TO authenticated;
GRANT EXECUTE ON FUNCTION create_ab_test_from_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_ab_test TO authenticated;
GRANT EXECUTE ON FUNCTION store_campaign_insight TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_insights TO authenticated;
GRANT EXECUTE ON FUNCTION mark_insight_acted TO authenticated;

GRANT SELECT ON v_campaign_learning_summary TO authenticated;
