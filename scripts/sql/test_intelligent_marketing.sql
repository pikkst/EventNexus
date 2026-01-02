-- ============================================================
-- Test Intelligent Marketing with Sample Data
-- Creates test events to trigger campaign generation
-- ============================================================

-- Step 1: Check current state
SELECT 
  'Current State' as test,
  jsonb_pretty(capture_platform_intelligence()) as result;

-- Step 2: View strategic recommendation
SELECT 
  'Strategic Recommendation' as test,
  strategy_type,
  target_audience,
  rationale,
  confidence_score
FROM get_strategic_recommendation();

-- Step 3: View intelligence log
SELECT 
  'Intelligence Log' as test,
  total_events,
  total_users,
  new_users_this_week,
  strategic_recommendation,
  confidence_score,
  captured_at
FROM marketing_intelligence_log 
ORDER BY captured_at DESC 
LIMIT 3;

-- ============================================================
-- Optional: Create test events to trigger campaign generation
-- Uncomment and run if you want to see campaign creation
-- ============================================================

/*
-- Create 10 test events
INSERT INTO events (
  name,
  description,
  category,
  location,
  start_time,
  end_time,
  status,
  created_by
)
SELECT 
  'Test Event ' || i,
  'This is a test event for intelligent marketing system',
  CASE (i % 5)
    WHEN 0 THEN 'Music'
    WHEN 1 THEN 'Food & Drink'
    WHEN 2 THEN 'Arts'
    WHEN 3 THEN 'Sports'
    ELSE 'Technology'
  END,
  'Tallinn, Estonia',
  NOW() + (i || ' days')::INTERVAL,
  NOW() + (i || ' days')::INTERVAL + INTERVAL '3 hours',
  'published',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM generate_series(1, 10) as i;

-- Now test again - should create campaign
SELECT run_intelligent_autonomous_operations();

-- View created campaign
SELECT 
  'Created Campaign' as test,
  title,
  copy,
  target_audience,
  status,
  ai_metadata->>'strategy_type' as strategy,
  ai_metadata->>'confidence_score' as confidence
FROM campaigns
WHERE ai_metadata->>'auto_generated' = 'true'
ORDER BY created_at DESC
LIMIT 1;
*/

-- ============================================================
-- Monitoring Queries
-- ============================================================

-- View all actions taken
SELECT 
  'Autonomous Actions' as test,
  action_type,
  reason,
  confidence_score,
  status,
  created_at
FROM autonomous_actions
WHERE action_type = 'creative_refreshed'
ORDER BY created_at DESC
LIMIT 5;

-- View platform intelligence trend
SELECT 
  'Intelligence Trend' as test,
  total_events,
  total_users,
  new_users_this_week,
  strategic_recommendation,
  captured_at
FROM marketing_intelligence_log
ORDER BY captured_at DESC
LIMIT 10;
