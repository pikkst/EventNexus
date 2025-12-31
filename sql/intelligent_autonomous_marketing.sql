-- ============================================================
-- Intelligent Autonomous Marketing - SQL Functions
-- ============================================================
-- Integrates strategic marketing automation with autonomous ops
-- Uses REAL platform data for intelligent campaign decisions
-- ============================================================

-- Add metadata column to campaigns for AI strategy tracking
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::JSONB;

-- Table: marketing_intelligence_log
-- Tracks platform intelligence snapshots for strategy decisions
CREATE TABLE IF NOT EXISTS marketing_intelligence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  total_events INTEGER,
  active_events INTEGER,
  total_users INTEGER,
  total_organizers INTEGER,
  total_tickets_sold INTEGER,
  total_revenue DECIMAL(12,2),
  top_categories JSONB,
  top_cities JSONB,
  conversion_rate DECIMAL(5,2),
  new_users_this_week INTEGER,
  strategic_recommendation TEXT,
  confidence_score DECIMAL(5,2)
);

-- ============================================================
-- FUNCTION: capture_platform_intelligence
-- Captures current platform state for strategic analysis
-- ============================================================
CREATE OR REPLACE FUNCTION capture_platform_intelligence()
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_total_events INTEGER;
  v_active_events INTEGER;
  v_total_users INTEGER;
  v_total_organizers INTEGER;
  v_total_tickets INTEGER;
  v_total_revenue DECIMAL(12,2);
  v_top_categories JSONB;
  v_top_cities JSONB;
  v_conversion_rate DECIMAL(5,2);
  v_new_users_week INTEGER;
  v_result JSONB;
BEGIN
  -- Count events
  SELECT COUNT(*) INTO v_total_events FROM events;
  SELECT COUNT(*) INTO v_active_events FROM events WHERE status = 'published';
  
  -- Count users
  SELECT COUNT(*) INTO v_total_users FROM users;
  SELECT COUNT(*) INTO v_total_organizers FROM users WHERE role IN ('organizer', 'admin');
  
  -- Ticket metrics
  SELECT COUNT(*), COALESCE(SUM(price::DECIMAL), 0) 
  INTO v_total_tickets, v_total_revenue 
  FROM tickets;
  
  -- Top categories
  SELECT jsonb_agg(cat_data)
  INTO v_top_categories
  FROM (
    SELECT 
      category,
      COUNT(*) as event_count
    FROM events
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) cat_data;
  
  -- Top cities
  SELECT jsonb_agg(city_data)
  INTO v_top_cities
  FROM (
    SELECT 
      SPLIT_PART(location::TEXT, ',', 1) as city,
      COUNT(*) as event_count
    FROM events
    WHERE location IS NOT NULL
    GROUP BY SPLIT_PART(location::TEXT, ',', 1)
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) city_data;
  
  -- Conversion rate
  SELECT 
    CASE 
      WHEN v_total_users > 0 THEN 
        ((SELECT COUNT(DISTINCT user_id) FROM tickets)::DECIMAL / v_total_users) * 100
      ELSE 0
    END
  INTO v_conversion_rate;
  
  -- New users this week
  SELECT COUNT(*) 
  INTO v_new_users_week 
  FROM users 
  WHERE created_at >= NOW() - INTERVAL '7 days';
  
  -- Build result
  v_result := jsonb_build_object(
    'total_events', v_total_events,
    'active_events', v_active_events,
    'total_users', v_total_users,
    'total_organizers', v_total_organizers,
    'total_tickets_sold', v_total_tickets,
    'total_revenue', v_total_revenue,
    'top_categories', COALESCE(v_top_categories, '[]'::JSONB),
    'top_cities', COALESCE(v_top_cities, '[]'::JSONB),
    'conversion_rate', v_conversion_rate,
    'new_users_this_week', v_new_users_week,
    'captured_at', NOW()
  );
  
  -- Log to intelligence table
  INSERT INTO marketing_intelligence_log (
    total_events,
    active_events,
    total_users,
    total_organizers,
    total_tickets_sold,
    total_revenue,
    top_categories,
    top_cities,
    conversion_rate,
    new_users_this_week,
    strategic_recommendation,
    confidence_score
  ) VALUES (
    v_total_events,
    v_active_events,
    v_total_users,
    v_total_organizers,
    v_total_tickets,
    v_total_revenue,
    COALESCE(v_top_categories, '[]'::JSONB),
    COALESCE(v_top_cities, '[]'::JSONB),
    v_conversion_rate,
    v_new_users_week,
    -- Strategic recommendation based on data
    -- PRIORITY 1: Creator acquisition in early stage (<100 events OR <20 organizers)
    CASE 
      WHEN v_total_events < 100 OR v_total_organizers < 20 THEN 
        '🚨 EARLY STAGE: Focus on creator acquisition - need events before attendees'
      WHEN v_conversion_rate < 5 AND v_total_users > 50 THEN 
        'Focus on conversion optimization - users browsing but not buying'
      WHEN v_new_users_week < 10 AND v_total_events >= 20 THEN 
        'Focus on user acquisition - have events, need attendees'
      ELSE 'Focus on engagement and retention'
    END,
    -- Confidence based on data completeness
    CASE 
      WHEN v_total_events > 100 AND v_total_users > 100 THEN 95.0
      WHEN v_total_events > 50 AND v_total_users > 50 THEN 85.0
      WHEN v_total_events > 20 AND v_total_users > 20 THEN 75.0
      ELSE 60.0
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: get_strategic_recommendation
-- Returns data-driven marketing strategy recommendation
-- PRIORITY LOGIC: Creator acquisition FIRST in early stage!
-- ============================================================
CREATE OR REPLACE FUNCTION get_strategic_recommendation()
RETURNS TABLE(
  strategy_type TEXT,
  target_audience TEXT,
  rationale TEXT,
  confidence_score DECIMAL,
  key_metrics JSONB
)
SECURITY DEFINER
AS $$
DECLARE
  v_intelligence JSONB;
BEGIN
  -- Get current platform intelligence
  v_intelligence := capture_platform_intelligence();
  
  -- Return strategic recommendation based on real data
  -- PRIORITY 1: Creator acquisition in early stage (<100 events OR <20 organizers)
  -- Logic: Without events, we can't attract attendees. Supply creates demand.
  RETURN QUERY
  SELECT 
    CASE 
      -- PRIORITY 1: Creator acquisition (early stage)
      WHEN (v_intelligence->>'total_events')::INTEGER < 100 
           OR (v_intelligence->>'total_organizers')::INTEGER < 20 
      THEN 'acquisition'
      
      -- PRIORITY 2: Activation (have users, low conversion)
      WHEN (v_intelligence->>'conversion_rate')::DECIMAL < 5 
           AND (v_intelligence->>'total_users')::INTEGER > 50 
      THEN 'activation'
      
      -- PRIORITY 3: User acquisition (have events, need attendees)
      WHEN (v_intelligence->>'new_users_this_week')::INTEGER < 10 
           AND (v_intelligence->>'total_events')::INTEGER >= 20 
      THEN 'acquisition'
      
      -- PRIORITY 4: Engagement (good metrics, optimize)
      WHEN (v_intelligence->>'active_events')::INTEGER > 10 
      THEN 'engagement'
      
      ELSE 'retention'
    END::TEXT as strategy_type,
    
    CASE 
      -- PRIORITY 1: Target creators in early stage
      WHEN (v_intelligence->>'total_events')::INTEGER < 100 
           OR (v_intelligence->>'total_organizers')::INTEGER < 20 
      THEN 'creators'
      
      -- PRIORITY 2: Target attendees for conversion
      WHEN (v_intelligence->>'conversion_rate')::DECIMAL < 5 
           AND (v_intelligence->>'total_users')::INTEGER > 50 
      THEN 'attendees'
      
      -- PRIORITY 3: Target new users when have events
      WHEN (v_intelligence->>'new_users_this_week')::INTEGER < 10 
           AND (v_intelligence->>'total_events')::INTEGER >= 20 
      THEN 'platform-growth'
      
      -- PRIORITY 4: Target attendees for engagement
      WHEN (v_intelligence->>'active_events')::INTEGER > 10 
      THEN 'attendees'
      
      ELSE 'retention'
    END::TEXT as target_audience,
    
    CASE 
      -- PRIORITY 1: Creator acquisition rationale (early stage)
      WHEN (v_intelligence->>'total_events')::INTEGER < 100 
           OR (v_intelligence->>'total_organizers')::INTEGER < 20 
      THEN '🚨 EARLY STAGE PRIORITY: Only ' || (v_intelligence->>'total_organizers') || 
           ' organizers created ' || (v_intelligence->>'total_events') || 
           ' events. Platform needs SUPPLY before DEMAND. Without events, attendees have nothing to book. ' ||
           'Target event creators, venue owners, promoters. Highlight: Zero listing fees, AI tools, 95% revenue retention, Stripe direct payouts.'
      
      -- PRIORITY 2: Activation rationale
      WHEN (v_intelligence->>'conversion_rate')::DECIMAL < 5 
           AND (v_intelligence->>'total_users')::INTEGER > 50 
      THEN 'Conversion rate is ' || ROUND((v_intelligence->>'conversion_rate')::NUMERIC, 1) || 
           '%. Users browsing but not buying. Highlight easy booking: Secure Stripe payments, instant QR tickets, transparent pricing.'
      
      -- PRIORITY 3: User acquisition rationale (have events)
      WHEN (v_intelligence->>'new_users_this_week')::INTEGER < 10 
           AND (v_intelligence->>'total_events')::INTEGER >= 20 
      THEN 'Low new user acquisition (' || (v_intelligence->>'new_users_this_week') || 
           ' this week), but we have ' || (v_intelligence->>'total_events') || 
           ' events ready. Now we can attract attendees. Highlight map-first discovery, easy booking, QR tickets.'
      
      WHEN (v_intelligence->>'conversion_rate')::DECIMAL < 5 
           AND (v_intelligence->>'total_users')::INTEGER > 50 
        THEN 'Conversion rate is ' || (v_intelligence->>'conversion_rate') || '%. Focus on converting browsers to buyers.'
      WHEN (v_intelligence->>'total_organizers')::INTEGER < 20 
        THEN 'Only ' || (v_intelligence->>'total_organizers') || ' organizers. Need more event creators.'
      WHEN (v_intelligence->>'active_events')::INTEGER > 10 
        THEN (v_intelligence->>'active_events') || ' active events available. Promote to attendees.'
      ELSE 'Platform has ' || (v_intelligence->>'total_users') || ' users. Focus on retention and engagement.'
    END::TEXT as rationale,
    
    CASE 
      WHEN (v_intelligence->>'total_events')::INTEGER > 100 
           AND (v_intelligence->>'total_users')::INTEGER > 100 THEN 95.0
      WHEN (v_intelligence->>'total_events')::INTEGER > 50 
           AND (v_intelligence->>'total_users')::INTEGER > 50 THEN 85.0
      WHEN (v_intelligence->>'total_events')::INTEGER > 20 
           AND (v_intelligence->>'total_users')::INTEGER > 20 THEN 75.0
      ELSE 60.0
    END::DECIMAL as confidence_score,
    
    v_intelligence as key_metrics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: auto_create_strategic_campaign
-- Automatically creates campaign based on platform intelligence
-- Called by Edge Function with AI integration
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_strategic_campaign(
  p_admin_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_strategy RECORD;
  v_intelligence JSONB;
  v_action_id UUID;
  v_campaign_id UUID;
  v_campaign_name TEXT;
  v_campaign_description TEXT;
BEGIN
  -- Get strategic recommendation
  SELECT * INTO v_strategy FROM get_strategic_recommendation() LIMIT 1;
  
  -- Generate campaign name and description based on strategy
  v_campaign_name := CASE v_strategy.strategy_type
    WHEN 'acquisition' THEN 
      CASE v_strategy.target_audience
        WHEN 'creators' THEN '🎯 Creator Acquisition - Zero Fees, AI Tools'
        ELSE '🚀 Platform Growth - Join EventNexus'
      END
    WHEN 'activation' THEN '💳 Convert Browsers to Buyers - Easy Booking'
    WHEN 'engagement' THEN '🎉 Discover Amazing Events Near You'
    ELSE '🌟 EventNexus Platform Promotion'
  END;
  
  v_campaign_description := CASE v_strategy.strategy_type
    WHEN 'acquisition' THEN 
      CASE v_strategy.target_audience
        WHEN 'creators' THEN 'Target event organizers, venue owners, and promoters. Highlight: Zero listing fees, AI marketing tools, 95% revenue retention, Stripe direct payouts.'
        ELSE 'Grow platform user base with compelling value proposition.'
      END
    WHEN 'activation' THEN 'Drive conversions by highlighting secure Stripe payments, instant QR tickets, and transparent pricing.'
    WHEN 'engagement' THEN 'Promote active events to increase engagement and ticket sales.'
    ELSE 'General platform promotion campaign.'
  END;
  
  -- Create actual campaign in campaigns table
  INSERT INTO campaigns (
    title,
    status,
    copy,
    placement,
    target,
    cta,
    image_url,
    tracking_code,
    ai_metadata
  ) VALUES (
    v_campaign_name,
    'Active',
    v_campaign_description,
    'both',
    'organizers',
    'Learn More',
    'https://eventnexus.eu/og-image.png',
    'autonomous_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    jsonb_build_object(
      'autonomous', true,
      'strategy_type', v_strategy.strategy_type,
      'target_audience', v_strategy.target_audience,
      'rationale', v_strategy.rationale,
      'confidence_score', v_strategy.confidence_score,
      'platform_intelligence', v_strategy.key_metrics,
      'created_by', 'intelligent_autonomous_marketing',
      'objective', CASE v_strategy.strategy_type
        WHEN 'acquisition' THEN 'conversions'
        WHEN 'activation' THEN 'conversions'
        WHEN 'engagement' THEN 'engagement'
        ELSE 'awareness'
      END,
      'budget', 1000.00,
      'daily_budget', 50.00,
      'platforms', ARRAY['facebook', 'instagram', 'google']
    )
  ) RETURNING id INTO v_campaign_id;
  
  -- Log this autonomous marketing action
  INSERT INTO autonomous_actions (
    campaign_id,
    action_type,
    reason,
    previous_state,
    new_state,
    confidence_score,
    expected_impact,
    status
  ) VALUES (
    v_campaign_id,
    'creative_refreshed',
    'Autonomous strategic campaign creation: ' || v_strategy.rationale,
    jsonb_build_object(
      'platform_state', v_strategy.key_metrics
    ),
    jsonb_build_object(
      'campaign_id', v_campaign_id,
      'campaign_name', v_campaign_name,
      'strategy_type', v_strategy.strategy_type,
      'target_audience', v_strategy.target_audience,
      'admin_user_id', p_admin_user_id
    ),
    v_strategy.confidence_score,
    CASE v_strategy.strategy_type
      WHEN 'acquisition' THEN 'Expected: 50 new signups, 200 engagements'
      WHEN 'activation' THEN 'Expected: 300 engagements, €1000 revenue'
      WHEN 'creator_acquisition' THEN 'Expected: 20 new organizers'
      WHEN 'engagement' THEN 'Expected: 400 engagements, €800 revenue'
      ELSE 'Expected: 250 engagements, €600 revenue'
    END,
    'pending'
  ) RETURNING id INTO v_action_id;
  
  -- Return success with campaign details
  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', v_campaign_id,
    'campaign_name', v_campaign_name,
    'action_id', v_action_id,
    'strategy', jsonb_build_object(
      'type', v_strategy.strategy_type,
      'target', v_strategy.target_audience,
      'rationale', v_strategy.rationale,
      'confidence', v_strategy.confidence_score
    ),
    'intelligence', v_strategy.key_metrics
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: run_intelligent_autonomous_operations
-- Enhanced autonomous operations with strategic marketing
-- ============================================================
CREATE OR REPLACE FUNCTION run_intelligent_autonomous_operations()
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_standard_result JSONB;
  v_marketing_result JSONB;
  v_intelligence JSONB;
  v_strategy RECORD;
  v_logs JSONB;
BEGIN
  -- Log intelligent marketing start
  PERFORM log_autonomous_action(
    'intelligent_analysis_start',
    NULL,
    NULL,
    '🤖 Starting intelligent autonomous operations...',
    NULL,
    'checking'
  );
  
  -- Capture platform intelligence
  PERFORM log_autonomous_action(
    'platform_analysis',
    NULL,
    NULL,
    '📊 Analyzing platform state...',
    NULL,
    'checking'
  );
  
  v_intelligence := capture_platform_intelligence();
  
  -- Get strategic recommendation
  SELECT * INTO v_strategy FROM get_strategic_recommendation() LIMIT 1;
  
  -- Log platform intelligence findings
  PERFORM log_autonomous_action(
    'intelligence_captured',
    NULL,
    NULL,
    format('📈 Platform snapshot: %s events, %s organizers, %s users', 
      v_intelligence->>'total_events',
      v_intelligence->>'total_organizers', 
      v_intelligence->>'total_users'
    ),
    jsonb_build_object(
      'total_events', v_intelligence->>'total_events',
      'active_events', v_intelligence->>'active_events',
      'total_organizers', v_intelligence->>'total_organizers',
      'total_users', v_intelligence->>'total_users',
      'conversion_rate', v_intelligence->>'conversion_rate'
    ),
    'action_taken'
  );
  
  -- Log strategic recommendation
  IF (v_intelligence->>'total_events')::INTEGER < 100 OR 
     (v_intelligence->>'total_organizers')::INTEGER < 20 THEN
    PERFORM log_autonomous_action(
      'early_stage_detected',
      NULL,
      NULL,
      format('🚨 EARLY STAGE DETECTED! Only %s organizers created %s events. Platform needs SUPPLY before DEMAND.',
        v_intelligence->>'total_organizers',
        v_intelligence->>'total_events'
      ),
      jsonb_build_object(
        'stage', 'early',
        'strategy', v_strategy.strategy_type,
        'target', v_strategy.target_audience
      ),
      'action_taken'
    );
  END IF;
  
  PERFORM log_autonomous_action(
    'strategy_recommendation',
    NULL,
    NULL,
    format('💡 AI Strategy: %s targeting %s', 
      UPPER(v_strategy.strategy_type), 
      v_strategy.target_audience
    ),
    jsonb_build_object(
      'strategy_type', v_strategy.strategy_type,
      'target_audience', v_strategy.target_audience,
      'rationale', v_strategy.rationale,
      'confidence_score', v_strategy.confidence_score
    ),
    'action_taken'
  );
  
  -- Run standard autonomous operations (pause/scale/post)
  SELECT * INTO v_standard_result FROM run_autonomous_operations_with_posting();
  
  -- Check if we should create a strategic marketing campaign
  IF NOT EXISTS (
    SELECT 1 FROM campaigns 
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND ai_metadata IS NOT NULL
  ) AND (v_intelligence->>'total_events')::INTEGER >= 0 THEN
    
    PERFORM log_autonomous_action(
      'campaign_creation_start',
      NULL,
      NULL,
      '✅ Creating strategic marketing campaign...',
      NULL,
      'checking'
    );
    
    -- Get admin user for campaign creation
    DECLARE
      v_admin_id UUID;
    BEGIN
      SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
      
      IF v_admin_id IS NOT NULL THEN
        v_marketing_result := auto_create_strategic_campaign(v_admin_id);
        
        PERFORM log_autonomous_action(
          'campaign_created',
          (v_marketing_result->>'campaign_id')::UUID,
          v_marketing_result->>'campaign_name',
          format('✨ Campaign created: "%s" - %s targeting %s', 
            v_marketing_result->>'campaign_name',
            v_strategy.strategy_type, 
            v_strategy.target_audience
          ),
          v_marketing_result,
          'action_taken'
        );
      END IF;
    END;
  ELSE
    PERFORM log_autonomous_action(
      'campaign_skipped',
      NULL,
      NULL,
      '⏭️ Campaign creation skipped - recent campaign exists',
      jsonb_build_object('reason', 'Campaign created in last 24h'),
      'no_action'
    );
  END IF;
  
  -- Final summary
  PERFORM log_autonomous_action(
    'intelligent_operations_complete',
    NULL,
    NULL,
    format('✅ Intelligent operations complete - Strategy: %s targeting %s', 
      v_strategy.strategy_type, 
      v_strategy.target_audience
    ),
    jsonb_build_object(
      'platform_intelligence', v_intelligence,
      'strategy', jsonb_build_object(
        'type', v_strategy.strategy_type,
        'target', v_strategy.target_audience,
        'confidence', v_strategy.confidence_score
      )
    ),
    'action_taken'
  );
  
  -- Collect all logs created during this run
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'timestamp', timestamp,
      'action_type', action_type,
      'campaign_id', campaign_id,
      'campaign_title', campaign_title,
      'message', message,
      'details', details,
      'status', status
    ) ORDER BY timestamp ASC
  )
  INTO v_logs
  FROM autonomous_logs
  WHERE timestamp >= (v_intelligence->>'captured_at')::TIMESTAMPTZ;
  
  -- Return combined results with logs
  RETURN jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'standard_operations', v_standard_result,
    'intelligent_marketing', COALESCE(v_marketing_result, jsonb_build_object('skipped', true, 'reason', 'Recent campaign exists or low activity')),
    'platform_intelligence', v_intelligence,
    'strategy', jsonb_build_object(
      'type', v_strategy.strategy_type,
      'target', v_strategy.target_audience,
      'rationale', v_strategy.rationale
    ),
    'logs', COALESCE(v_logs, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_marketing_intelligence_captured 
  ON marketing_intelligence_log(captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_ai_metadata 
  ON campaigns USING gin(ai_metadata);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE marketing_intelligence_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access to marketing intelligence" ON marketing_intelligence_log;
DROP POLICY IF EXISTS "Service role can insert intelligence" ON marketing_intelligence_log;

-- Admin can see all
CREATE POLICY "Admin access to marketing intelligence" 
  ON marketing_intelligence_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role (backend functions) can insert
CREATE POLICY "Service role can insert intelligence" 
  ON marketing_intelligence_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Test the system
-- ============================================================
-- SELECT capture_platform_intelligence();
-- SELECT * FROM get_strategic_recommendation();
-- SELECT run_intelligent_autonomous_operations();
-- ============================================================
