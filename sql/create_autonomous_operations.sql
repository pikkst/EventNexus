-- ============================================================
-- Phase 4: Autonomous Campaign Operations
-- ============================================================
-- Auto-pause low ROI campaigns, auto-scale high performers,
-- proactive optimization opportunities, self-healing logic
-- ============================================================

-- Add budget column to campaigns table if it doesn't exist
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_budget DECIMAL(10,2);

-- Table: autonomous_actions
-- Tracks all autonomous decisions and actions taken by the system
CREATE TABLE IF NOT EXISTS autonomous_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'auto_pause',
    'auto_scale_up',
    'auto_scale_down',
    'optimization_applied',
    'ab_test_created',
    'budget_adjusted',
    'targeting_refined',
    'creative_refreshed'
  )),
  reason TEXT NOT NULL,
  previous_state JSONB NOT NULL, -- {budget, status, roi, ctr, etc.}
  new_state JSONB NOT NULL,
  confidence_score DECIMAL(5,2), -- 0-100% confidence in decision
  expected_impact TEXT,
  actual_impact JSONB, -- Measured after action taken
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'rolled_back', 'failed')),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: autonomous_rules
-- Configurable rules for autonomous behavior
CREATE TABLE IF NOT EXISTS autonomous_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('pause', 'scale', 'optimize', 'create')),
  condition JSONB NOT NULL, -- {metric: 'roi', operator: '<', threshold: 1.0, min_spend: 50}
  action JSONB NOT NULL, -- {type: 'auto_pause', params: {...}}
  priority INTEGER DEFAULT 50, -- Higher priority rules execute first
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: optimization_opportunities
-- System-detected opportunities for campaign improvement
CREATE TABLE IF NOT EXISTS optimization_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN (
    'low_conversion',
    'high_traffic_low_conversion',
    'declining_performance',
    'budget_inefficiency',
    'audience_mismatch',
    'creative_fatigue',
    'timing_optimization'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  estimated_impact JSONB, -- {roi_increase: 0.5, ctr_increase: 2.0}
  confidence_score DECIMAL(5,2), -- 0-100%
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_campaign ON autonomous_actions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_type ON autonomous_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_status ON autonomous_actions(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_rules_active ON autonomous_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_optimization_opportunities_campaign ON optimization_opportunities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_optimization_opportunities_status ON optimization_opportunities(status);

-- ============================================================
-- FUNCTION: identify_underperforming_campaigns
-- Returns campaigns that should be auto-paused based on rules
-- ============================================================
CREATE OR REPLACE FUNCTION identify_underperforming_campaigns(
  min_spend DECIMAL DEFAULT 50.0,
  max_roi DECIMAL DEFAULT 1.0,
  min_duration_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  campaign_id UUID,
  campaign_title TEXT,
  current_budget DECIMAL,
  total_spend DECIMAL,
  roi DECIMAL,
  ctr DECIMAL,
  conversion_rate DECIMAL,
  hours_running INTEGER,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    COALESCE(c.budget, 0.0)::DECIMAL AS current_budget,
    cp.total_spend,
    cp.roi,
    cp.ctr,
    cp.conversion_rate,
    (EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600)::INTEGER AS hours_running,
    CASE 
      WHEN cp.roi < 0.5 THEN 'CRITICAL: Pause immediately - ROI below 0.5x'
      WHEN cp.roi < max_roi AND cp.total_spend > min_spend THEN 'HIGH: Consider pausing - ROI below target'
      WHEN cp.ctr < 1.0 AND cp.total_spend > min_spend THEN 'MEDIUM: Low engagement - optimize creative'
      ELSE 'MONITOR: Continue tracking'
    END AS recommendation
  FROM campaigns c
  JOIN campaign_performance cp ON c.id = cp.campaign_id
  WHERE (c.status = 'active' OR c.status = 'Active')
    AND (EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600)::INTEGER >= min_duration_hours
    AND (
      (cp.roi < max_roi AND cp.total_spend > min_spend)
      OR (cp.ctr < 1.0 AND cp.total_spend > min_spend)
      OR cp.roi < 0.5
    )
  ORDER BY cp.roi ASC, cp.total_spend DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: identify_scaling_candidates
-- Returns high-performing campaigns that should be scaled up
-- ============================================================
CREATE OR REPLACE FUNCTION identify_scaling_candidates(
  min_roi DECIMAL DEFAULT 3.0,
  min_conversions INTEGER DEFAULT 10,
  max_budget_multiplier DECIMAL DEFAULT 3.0
)
RETURNS TABLE(
  campaign_id UUID,
  campaign_title TEXT,
  current_budget DECIMAL,
  suggested_budget DECIMAL,
  roi DECIMAL,
  conversions INTEGER,
  ctr DECIMAL,
  confidence_score DECIMAL,
  reasoning TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    COALESCE(c.budget, 100.0)::DECIMAL AS current_budget,
    LEAST(COALESCE(c.budget, 100.0) * 1.5, COALESCE(c.budget, 100.0) * max_budget_multiplier)::DECIMAL AS suggested_budget,
    cp.roi,
    cp.total_conversions,
    cp.ctr,
    CASE 
      WHEN cp.total_conversions >= 50 AND cp.roi >= 4.0 THEN 95.0
      WHEN cp.total_conversions >= 20 AND cp.roi >= 3.5 THEN 85.0
      WHEN cp.total_conversions >= 10 AND cp.roi >= 3.0 THEN 75.0
      ELSE 60.0
    END AS confidence_score,
    CASE 
      WHEN cp.roi >= 4.0 THEN 'Exceptional ROI - scale aggressively (1.5x budget)'
      WHEN cp.roi >= 3.5 THEN 'Strong ROI - moderate scaling (1.3x budget)'
      WHEN cp.roi >= 3.0 THEN 'Good ROI - conservative scaling (1.2x budget)'
      ELSE 'Monitor performance before scaling'
    END AS reasoning
  FROM campaigns c
  JOIN campaign_performance cp ON c.id = cp.campaign_id
  WHERE (c.status = 'active' OR c.status = 'Active')
    AND cp.roi >= min_roi
    AND cp.total_conversions >= min_conversions
    AND COALESCE(c.budget, 0.0) < 10000 -- Max budget cap
  ORDER BY cp.roi DESC, cp.total_conversions DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: detect_optimization_opportunities
-- Analyzes campaigns and identifies specific optimization needs
-- ============================================================
CREATE OR REPLACE FUNCTION detect_optimization_opportunities()
RETURNS TABLE(
  campaign_id UUID,
  opportunity_type TEXT,
  severity TEXT,
  description TEXT,
  suggested_action TEXT,
  estimated_impact JSONB,
  confidence_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM (
    -- High traffic, low conversion (audience mismatch or landing page issue)
    SELECT 
      c.id AS campaign_id,
      'high_traffic_low_conversion'::TEXT AS opportunity_type,
      'high'::TEXT AS severity,
      format('Campaign "%s" has %s clicks but only %s%% conversion rate', c.title, cp.total_clicks, ROUND(cp.conversion_rate, 2)) AS description,
      'Review targeting parameters and landing page experience. Consider A/B testing different audiences or CTAs.'::TEXT AS suggested_action,
      jsonb_build_object('conversion_rate_increase', 3.0, 'roi_increase', 1.5) AS estimated_impact,
      85.0::DECIMAL AS confidence_score
    FROM campaigns c
    JOIN campaign_performance cp ON c.id = cp.campaign_id
    WHERE (c.status = 'active' OR c.status = 'Active')
      AND cp.total_clicks > 100
      AND cp.conversion_rate < 2.0
      AND cp.total_spend > 50

    UNION ALL

    -- Declining performance (creative fatigue)
    SELECT 
      c.id AS campaign_id,
      'declining_performance'::TEXT AS opportunity_type,
      'medium'::TEXT AS severity,
      format('Campaign "%s" CTR declined from %s%% to %s%% over past 7 days', c.title, 
        COALESCE((SELECT AVG((clicks::DECIMAL / NULLIF(impressions, 0)) * 100) FROM campaign_analytics ca2 WHERE ca2.campaign_id = c.id AND ca2.recorded_at >= NOW() - INTERVAL '14 days' AND ca2.recorded_at < NOW() - INTERVAL '7 days'), 0),
        COALESCE((SELECT AVG((clicks::DECIMAL / NULLIF(impressions, 0)) * 100) FROM campaign_analytics ca3 WHERE ca3.campaign_id = c.id AND ca3.recorded_at >= NOW() - INTERVAL '7 days'), 0)
      ) AS description,
      'Refresh creative assets. Test new images, headlines, or ad copy variations.'::TEXT AS suggested_action,
      jsonb_build_object('ctr_increase', 2.5, 'engagement_increase', 30.0) AS estimated_impact,
      75.0::DECIMAL AS confidence_score
    FROM campaigns c
    JOIN campaign_performance cp ON c.id = cp.campaign_id
    WHERE (c.status = 'active' OR c.status = 'Active')
      AND EXISTS (
        SELECT 1 FROM campaign_analytics ca 
        WHERE ca.campaign_id = c.id 
        AND ca.recorded_at >= NOW() - INTERVAL '14 days'
        AND ca.impressions > 0
        GROUP BY ca.campaign_id
        HAVING AVG(CASE WHEN ca.recorded_at >= NOW() - INTERVAL '7 days' THEN (ca.clicks::DECIMAL / NULLIF(ca.impressions, 0)) * 100 ELSE NULL END) <
               AVG(CASE WHEN ca.recorded_at < NOW() - INTERVAL '7 days' THEN (ca.clicks::DECIMAL / NULLIF(ca.impressions, 0)) * 100 ELSE NULL END) * 0.7
      )

    UNION ALL

    -- Budget inefficiency (high spend, low ROI)
    SELECT 
      c.id AS campaign_id,
      'budget_inefficiency'::TEXT AS opportunity_type,
      'critical'::TEXT AS severity,
      format('Campaign "%s" spent $%s with only %sx ROI', c.title, ROUND(cp.total_spend, 2), ROUND(cp.roi, 2)) AS description,
      'Consider pausing or drastically reducing budget until performance improves. Analyze winning campaigns for insights.'::TEXT AS suggested_action,
      jsonb_build_object('cost_savings', cp.total_spend * 0.5) AS estimated_impact,
      90.0::DECIMAL AS confidence_score
    FROM campaigns c
    JOIN campaign_performance cp ON c.id = cp.campaign_id
    WHERE (c.status = 'active' OR c.status = 'Active')
      AND cp.total_spend > 100
      AND cp.roi < 1.0
  ) t
  ORDER BY t.severity DESC, t.confidence_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: auto_pause_campaign
-- Pauses a campaign and logs the autonomous action
-- ============================================================
CREATE OR REPLACE FUNCTION auto_pause_campaign(
  p_campaign_id UUID,
  p_reason TEXT,
  p_confidence_score DECIMAL DEFAULT 80.0
)
RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_previous_state JSONB;
BEGIN
  -- Capture current state
  SELECT jsonb_build_object(
    'status', c.status,
    'budget', COALESCE(c.budget, 0.0),
    'roi', COALESCE(cp.roi, 0.0),
    'ctr', COALESCE(cp.ctr, 0.0),
    'total_spend', COALESCE(cp.total_spend, 0.0)
  ) INTO v_previous_state
  FROM campaigns c
  LEFT JOIN campaign_performance cp ON c.id = cp.campaign_id
  WHERE c.id = p_campaign_id;

  -- Update campaign status (use Paused with capital P to match schema)
  UPDATE campaigns 
  SET status = 'Paused',
      updated_at = NOW()
  WHERE id = p_campaign_id;

  -- Log autonomous action
  INSERT INTO autonomous_actions (
    campaign_id,
    action_type,
    reason,
    previous_state,
    new_state,
    confidence_score,
    expected_impact,
    status,
    executed_at
  ) VALUES (
    p_campaign_id,
    'auto_pause',
    p_reason,
    v_previous_state,
    jsonb_build_object('status', 'paused'),
    p_confidence_score,
    'Prevent further budget loss on underperforming campaign',
    'executed',
    NOW()
  ) RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: auto_scale_campaign
-- Scales up a high-performing campaign budget
-- ============================================================
CREATE OR REPLACE FUNCTION auto_scale_campaign(
  p_campaign_id UUID,
  p_new_budget DECIMAL,
  p_reason TEXT,
  p_confidence_score DECIMAL DEFAULT 85.0
)
RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_previous_state JSONB;
  v_old_budget DECIMAL;
BEGIN
  -- Capture current state
  SELECT COALESCE(c.budget, 100.0), jsonb_build_object(
    'budget', COALESCE(c.budget, 100.0),
    'roi', COALESCE(cp.roi, 0.0),
    'conversions', COALESCE(cp.total_conversions, 0),
    'ctr', COALESCE(cp.ctr, 0.0)
  ) INTO v_old_budget, v_previous_state
  FROM campaigns c
  LEFT JOIN campaign_performance cp ON c.id = cp.campaign_id
  WHERE c.id = p_campaign_id;

  -- Update campaign budget
  UPDATE campaigns 
  SET budget = p_new_budget,
      updated_at = NOW()
  WHERE id = p_campaign_id;

  -- Log autonomous action
  INSERT INTO autonomous_actions (
    campaign_id,
    action_type,
    reason,
    previous_state,
    new_state,
    confidence_score,
    expected_impact,
    status,
    executed_at
  ) VALUES (
    p_campaign_id,
    'auto_scale_up',
    p_reason,
    v_previous_state,
    jsonb_build_object('budget', p_new_budget),
    p_confidence_score,
    format('Capitalize on high ROI. Expected additional revenue: $%s', ROUND((p_new_budget - v_old_budget) * (v_previous_state->>'roi')::DECIMAL, 2)),
    'executed',
    NOW()
  ) RETURNING id INTO v_action_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: store_optimization_opportunity
-- Inserts a detected opportunity into the table
-- ============================================================
CREATE OR REPLACE FUNCTION store_optimization_opportunity(
  p_campaign_id UUID,
  p_opportunity_type TEXT,
  p_severity TEXT,
  p_description TEXT,
  p_suggested_action TEXT,
  p_estimated_impact JSONB DEFAULT '{}'::JSONB,
  p_confidence_score DECIMAL DEFAULT 70.0
)
RETURNS UUID AS $$
DECLARE
  v_opportunity_id UUID;
BEGIN
  INSERT INTO optimization_opportunities (
    campaign_id,
    opportunity_type,
    severity,
    description,
    suggested_action,
    estimated_impact,
    confidence_score
  ) VALUES (
    p_campaign_id,
    p_opportunity_type,
    p_severity,
    p_description,
    p_suggested_action,
    p_estimated_impact,
    p_confidence_score
  ) RETURNING id INTO v_opportunity_id;

  RETURN v_opportunity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: run_autonomous_operations
-- Main orchestrator - analyzes all campaigns and takes actions
-- ============================================================
CREATE OR REPLACE FUNCTION run_autonomous_operations()
RETURNS JSONB AS $$
DECLARE
  v_paused_count INTEGER := 0;
  v_scaled_count INTEGER := 0;
  v_opportunities_count INTEGER := 0;
  v_campaign RECORD;
  v_result JSONB;
BEGIN
  -- 1. Auto-pause underperforming campaigns
  FOR v_campaign IN 
    SELECT * FROM identify_underperforming_campaigns(50.0, 1.0, 24)
    WHERE recommendation LIKE 'CRITICAL%' OR recommendation LIKE 'HIGH%'
  LOOP
    PERFORM auto_pause_campaign(
      v_campaign.campaign_id,
      v_campaign.recommendation,
      CASE 
        WHEN v_campaign.recommendation LIKE 'CRITICAL%' THEN 95.0
        ELSE 85.0
      END
    );
    v_paused_count := v_paused_count + 1;
  END LOOP;

  -- 2. Auto-scale high performers
  FOR v_campaign IN 
    SELECT * FROM identify_scaling_candidates(3.0, 10, 3.0)
    WHERE confidence_score >= 75.0
  LOOP
    PERFORM auto_scale_campaign(
      v_campaign.campaign_id,
      v_campaign.suggested_budget,
      v_campaign.reasoning,
      v_campaign.confidence_score
    );
    v_scaled_count := v_scaled_count + 1;
  END LOOP;

  -- 3. Detect and store optimization opportunities
  FOR v_campaign IN 
    SELECT * FROM detect_optimization_opportunities()
  LOOP
    -- Check if opportunity already exists for this campaign
    IF NOT EXISTS (
      SELECT 1 FROM optimization_opportunities 
      WHERE campaign_id = v_campaign.campaign_id 
        AND opportunity_type = v_campaign.opportunity_type
        AND status = 'open'
    ) THEN
      PERFORM store_optimization_opportunity(
        v_campaign.campaign_id,
        v_campaign.opportunity_type,
        v_campaign.severity,
        v_campaign.description,
        v_campaign.suggested_action,
        v_campaign.estimated_impact,
        v_campaign.confidence_score
      );
      v_opportunities_count := v_opportunities_count + 1;
    END IF;
  END LOOP;

  -- Return summary
  v_result := jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'actions_taken', jsonb_build_object(
      'campaigns_paused', v_paused_count,
      'campaigns_scaled', v_scaled_count,
      'opportunities_detected', v_opportunities_count
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Default autonomous rules
-- ============================================================
INSERT INTO autonomous_rules (rule_name, rule_type, condition, action, priority, is_active)
VALUES 
  ('Critical ROI Pause', 'pause', 
   '{"metric": "roi", "operator": "<", "threshold": 0.5, "min_spend": 50}'::JSONB,
   '{"type": "auto_pause", "notify_admin": true}'::JSONB,
   100, true),
  
  ('Low ROI Pause', 'pause',
   '{"metric": "roi", "operator": "<", "threshold": 1.0, "min_spend": 100, "min_duration_hours": 48}'::JSONB,
   '{"type": "auto_pause", "notify_admin": false}'::JSONB,
   90, true),
  
  ('High ROI Scale', 'scale',
   '{"metric": "roi", "operator": ">=", "threshold": 3.0, "min_conversions": 10}'::JSONB,
   '{"type": "auto_scale_up", "multiplier": 1.5, "max_budget": 10000}'::JSONB,
   80, true),
  
  ('Exceptional ROI Aggressive Scale', 'scale',
   '{"metric": "roi", "operator": ">=", "threshold": 4.0, "min_conversions": 20}'::JSONB,
   '{"type": "auto_scale_up", "multiplier": 2.0, "max_budget": 20000}'::JSONB,
   85, true)
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================
-- RLS Policies (Admin-only access)
-- ============================================================
ALTER TABLE autonomous_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin full access to autonomous_actions" ON autonomous_actions;
DROP POLICY IF EXISTS "Admin full access to autonomous_rules" ON autonomous_rules;
DROP POLICY IF EXISTS "Admin full access to optimization_opportunities" ON optimization_opportunities;

-- Create new policies
CREATE POLICY "Admin full access to autonomous_actions" ON autonomous_actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access to autonomous_rules" ON autonomous_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin full access to optimization_opportunities" ON optimization_opportunities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Complete! Test with:
-- SELECT * FROM run_autonomous_operations();
-- SELECT * FROM autonomous_actions ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM optimization_opportunities WHERE status = 'open';
-- ============================================================
