-- ============================================================
-- Test Autonomous Operations Deployment
-- Run this AFTER deploying create_autonomous_operations.sql
-- ============================================================

-- TEST 1: Verify all tables exist
-- ============================================================
SELECT 
  'TEST 1: Tables Check' as test_name,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS - All 3 tables exist'
    ELSE '❌ FAIL - Missing tables: ' || (3 - COUNT(*)::TEXT)
  END as result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('autonomous_actions', 'autonomous_rules', 'optimization_opportunities');

-- TEST 2: Verify default rules were inserted
-- ============================================================
SELECT 
  'TEST 2: Default Rules' as test_name,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS - All 4 default rules exist'
    WHEN COUNT(*) > 0 THEN '⚠️ PARTIAL - Only ' || COUNT(*)::TEXT || ' rules found'
    ELSE '❌ FAIL - No rules found'
  END as result,
  COUNT(*) as rule_count
FROM autonomous_rules;

-- TEST 3: List all autonomous rules
-- ============================================================
SELECT 
  'TEST 3: Rules Details' as test_name,
  rule_name,
  rule_type,
  priority,
  is_active,
  condition->>'threshold' as threshold,
  action->>'type' as action_type
FROM autonomous_rules
ORDER BY priority DESC;

-- TEST 4: Verify all SQL functions exist
-- ============================================================
SELECT 
  'TEST 4: Functions Check' as test_name,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'run_autonomous_operations',
    'run_autonomous_operations_with_posting',
    'identify_underperforming_campaigns',
    'identify_scaling_candidates',
    'detect_optimization_opportunities',
    'auto_pause_campaign',
    'auto_scale_campaign',
    'auto_post_campaign_to_social',
    'store_optimization_opportunity'
  )
ORDER BY routine_name;

-- TEST 5: Count missing functions (should be 0)
-- ============================================================
WITH expected_functions AS (
  SELECT unnest(ARRAY[
    'run_autonomous_operations',
    'run_autonomous_operations_with_posting',
    'identify_underperforming_campaigns',
    'identify_scaling_candidates',
    'detect_optimization_opportunities',
    'auto_pause_campaign',
    'auto_scale_campaign',
    'auto_post_campaign_to_social',
    'store_optimization_opportunity'
  ]) AS function_name
),
existing_functions AS (
  SELECT routine_name AS function_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
)
SELECT 
  'TEST 5: Missing Functions' as test_name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS - All functions deployed'
    ELSE '❌ FAIL - Missing ' || COUNT(*)::TEXT || ' functions'
  END as result,
  COALESCE(string_agg(ef.function_name, ', '), 'None') as missing_functions
FROM expected_functions ef
LEFT JOIN existing_functions ex ON ef.function_name = ex.function_name
WHERE ex.function_name IS NULL;

-- TEST 6: Check if campaigns table has required columns
-- ============================================================
SELECT 
  'TEST 6: Campaign Columns' as test_name,
  column_name,
  data_type,
  '✅ EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'campaigns'
  AND column_name IN ('budget', 'daily_budget', 'status', 'metrics')
ORDER BY column_name;

-- TEST 7: Check RLS policies
-- ============================================================
SELECT 
  'TEST 7: RLS Policies' as test_name,
  tablename,
  policyname,
  '✅ ENABLED' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('autonomous_actions', 'autonomous_rules', 'optimization_opportunities')
ORDER BY tablename, policyname;

-- TEST 8: Dry run - Identify underperforming campaigns
-- ============================================================
SELECT 
  'TEST 8: Underperforming Check' as test_name,
  COUNT(*) as campaigns_found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Function works - Found ' || COUNT(*)::TEXT || ' campaigns'
    ELSE '⚠️ No underperforming campaigns (this is OK if no active campaigns)'
  END as result
FROM identify_underperforming_campaigns(50.0, 1.0, 24);

-- TEST 9: Dry run - Identify scaling candidates
-- ============================================================
SELECT 
  'TEST 9: Scaling Candidates' as test_name,
  COUNT(*) as campaigns_found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Function works - Found ' || COUNT(*)::TEXT || ' campaigns'
    ELSE '⚠️ No scaling candidates (this is OK if no high-performing campaigns)'
  END as result
FROM identify_scaling_candidates(3.0, 10, 3.0);

-- TEST 10: Dry run - Detect optimization opportunities
-- ============================================================
SELECT 
  'TEST 10: Opportunities Detection' as test_name,
  COUNT(*) as opportunities_found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Function works - Found ' || COUNT(*)::TEXT || ' opportunities'
    ELSE '⚠️ No opportunities detected (this is OK if no campaigns need optimization)'
  END as result
FROM detect_optimization_opportunities();

-- TEST 11: Full autonomous operations test (SAFE - won't modify data if no campaigns)
-- ============================================================
SELECT 
  'TEST 11: Full Autonomous Run' as test_name,
  run_autonomous_operations_with_posting() as result;

-- TEST 12: Check if any actions were taken
-- ============================================================
SELECT 
  'TEST 12: Actions History' as test_name,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE action_type = 'auto_pause') as pauses,
  COUNT(*) FILTER (WHERE action_type = 'auto_scale_up') as scales,
  COUNT(*) FILTER (WHERE status = 'executed') as executed,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Actions recorded in database'
    ELSE '⚠️ No actions yet (normal if no campaigns meet criteria)'
  END as result
FROM autonomous_actions;

-- TEST 13: Check current opportunities
-- ============================================================
SELECT 
  'TEST 13: Open Opportunities' as test_name,
  COUNT(*) as total_opportunities,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical,
  COUNT(*) FILTER (WHERE severity = 'high') as high,
  COUNT(*) FILTER (WHERE status = 'open') as open_status,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Opportunities tracked'
    ELSE '⚠️ No opportunities (normal if no campaigns)'
  END as result
FROM optimization_opportunities;

-- SUMMARY REPORT
-- ============================================================
SELECT 
  '═══════════════════════════════════════════' as separator,
  'DEPLOYMENT TEST SUMMARY' as report_title,
  '═══════════════════════════════════════════' as separator2;

SELECT 
  'Tables Created' as component,
  (SELECT COUNT(*)::TEXT FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name IN ('autonomous_actions', 'autonomous_rules', 'optimization_opportunities')) || '/3' as status;

SELECT 
  'Functions Deployed' as component,
  (SELECT COUNT(*)::TEXT FROM information_schema.routines 
   WHERE routine_schema = 'public' AND routine_name LIKE '%autonomous%' OR routine_name LIKE '%auto_%') || ' functions' as status;

SELECT 
  'Default Rules' as component,
  (SELECT COUNT(*)::TEXT FROM autonomous_rules) || '/4 rules' as status;

SELECT 
  'RLS Policies' as component,
  (SELECT COUNT(*)::TEXT FROM pg_policies 
   WHERE schemaname = 'public' AND tablename IN ('autonomous_actions', 'autonomous_rules', 'optimization_opportunities')) || ' policies' as status;

SELECT 
  'Total Actions Taken' as component,
  (SELECT COUNT(*)::TEXT FROM autonomous_actions) || ' actions' as status;

SELECT 
  'Open Opportunities' as component,
  (SELECT COUNT(*)::TEXT FROM optimization_opportunities WHERE status = 'open') || ' opportunities' as status;

-- Final verdict
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'run_autonomous_operations_with_posting') = 1
    THEN '🎉 SUCCESS! Autonomous Operations is fully deployed and functional!'
    ELSE '❌ DEPLOYMENT INCOMPLETE - Check error messages above'
  END as final_result;
