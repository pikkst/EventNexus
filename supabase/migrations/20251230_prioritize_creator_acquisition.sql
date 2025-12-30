-- ============================================================
-- MIGRATION: Prioritize Creator Acquisition in Early Stage
-- Date: 2025-12-30
-- Description: Update strategic recommendation logic to prioritize
--              creator acquisition when platform has <100 events
--              or <20 organizers. Supply creates demand!
-- ============================================================

-- Update capture_platform_intelligence function to reflect new priority
CREATE OR REPLACE FUNCTION capture_platform_intelligence()
RETURNS JSONB AS $$
DECLARE
  v_total_events INTEGER;
  v_active_events INTEGER;
  v_total_users INTEGER;
  v_total_organizers INTEGER;
  v_total_tickets INTEGER;
  v_total_revenue DECIMAL;
  v_top_categories JSONB;
  v_top_cities JSONB;
  v_conversion_rate DECIMAL;
  v_new_users_week INTEGER;
  v_result JSONB;
BEGIN
  -- Count metrics
  SELECT COUNT(*) INTO v_total_events FROM events;
  SELECT COUNT(*) INTO v_active_events FROM events WHERE end_date >= NOW();
  SELECT COUNT(*) INTO v_total_users FROM users;
  SELECT COUNT(DISTINCT user_id) INTO v_total_organizers FROM events;
  SELECT COUNT(*) INTO v_total_tickets FROM tickets;
  SELECT COALESCE(SUM(price), 0) INTO v_total_revenue FROM tickets;
  
  -- Top categories
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('category', category, 'count', event_count)
      ORDER BY event_count DESC
    ), '[]'::JSONB
  ) INTO v_top_categories
  FROM (
    SELECT category, COUNT(*) as event_count
    FROM events
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) cat_data;
  
  -- Top cities
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('city', city, 'count', event_count)
      ORDER BY event_count DESC
    ), '[]'::JSONB
  ) INTO v_top_cities
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
  
  -- Log to intelligence table with updated priority logic
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
    -- UPDATED: Creator acquisition is PRIORITY 1 in early stage
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

-- Update get_strategic_recommendation function with creator priority
CREATE OR REPLACE FUNCTION get_strategic_recommendation()
RETURNS TABLE(
  strategy_type TEXT,
  target_audience TEXT,
  rationale TEXT,
  confidence_score DECIMAL,
  key_metrics JSONB
) AS $$
DECLARE
  v_intelligence JSONB;
BEGIN
  -- Get current platform intelligence
  v_intelligence := capture_platform_intelligence();
  
  -- Return strategic recommendation with CREATOR ACQUISITION as PRIORITY 1
  RETURN QUERY
  SELECT 
    -- Strategy Type Logic
    CASE 
      -- PRIORITY 1: Creator acquisition in early stage (<100 events OR <20 organizers)
      -- Logic: Without events, we can't attract attendees. Supply creates demand.
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
    
    -- Target Audience Logic
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
    
    -- Rationale Logic (explains WHY this strategy)
    CASE 
      -- PRIORITY 1: Creator acquisition rationale
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
      
      -- PRIORITY 3: User acquisition rationale
      WHEN (v_intelligence->>'new_users_this_week')::INTEGER < 10 
           AND (v_intelligence->>'total_events')::INTEGER >= 20 
      THEN 'Low new user acquisition (' || (v_intelligence->>'new_users_this_week') || 
           ' this week), but we have ' || (v_intelligence->>'total_events') || 
           ' events ready. Now we can attract attendees. Highlight map-first discovery, easy booking, QR tickets.'
      
      WHEN (v_intelligence->>'active_events')::INTEGER > 10 
        THEN 'Platform has momentum with ' || (v_intelligence->>'active_events') || ' active events. Focus on engagement and category growth.'
      ELSE 'Standard retention strategy'
    END::TEXT as rationale,
    
    -- Confidence Score
    CASE 
      WHEN (v_intelligence->>'total_events')::INTEGER > 100 
           AND (v_intelligence->>'total_users')::INTEGER > 100 
      THEN 95.0
      WHEN (v_intelligence->>'total_events')::INTEGER > 50 
           AND (v_intelligence->>'total_users')::INTEGER > 50 
      THEN 85.0
      WHEN (v_intelligence->>'total_events')::INTEGER > 20 
           AND (v_intelligence->>'total_users')::INTEGER > 20 
      THEN 75.0
      WHEN (v_intelligence->>'total_events')::INTEGER < 5 
           AND (v_intelligence->>'total_organizers')::INTEGER < 3 
      THEN 90.0  -- High confidence in creator acquisition need
      ELSE 60.0
    END::DECIMAL as confidence_score,
    
    v_intelligence as key_metrics;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the priority logic
COMMENT ON FUNCTION get_strategic_recommendation() IS 
'Returns intelligent marketing strategy recommendation based on real-time platform data.
PRIORITY LOGIC:
1. CREATOR ACQUISITION (early stage: <100 events OR <20 organizers) - Supply creates demand
2. ACTIVATION (low conversion: <5% with >50 users) - Convert browsers to buyers
3. USER ACQUISITION (have events: >=20 events, <10 new users/week) - Bring attendees
4. ENGAGEMENT (good metrics: >10 active events) - Optimize and grow
5. RETENTION (default) - Keep users engaged

This ensures platform focuses on getting EVENT CREATORS first, then attracting attendees.';
