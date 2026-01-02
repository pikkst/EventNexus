-- Check Autonomous Operations Data and Functions
-- Run this in Supabase SQL Editor

-- 1. Check if tables exist and have data
SELECT 
  'autonomous_actions' as table_name,
  COUNT(*) as record_count
FROM autonomous_actions
UNION ALL
SELECT 
  'autonomous_rules' as table_name,
  COUNT(*) as record_count
FROM autonomous_rules
UNION ALL
SELECT 
  'optimization_opportunities' as table_name,
  COUNT(*) as record_count
FROM optimization_opportunities;

-- 2. Check if required functions exist
SELECT 
  routine_name,
  routine_type
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
    'auto_post_campaign_to_social'
  )
ORDER BY routine_name;

-- 3. Check campaigns table for test data
SELECT 
  id,
  title,
  status,
  created_at
FROM campaigns
LIMIT 5;

-- 4. Check if there are any active autonomous rules
SELECT 
  rule_name,
  rule_type,
  is_active,
  priority
FROM autonomous_rules
WHERE is_active = true
ORDER BY priority DESC;

-- 5. Check recent autonomous actions
SELECT 
  action_type,
  reason,
  status,
  confidence_score,
  created_at
FROM autonomous_actions
ORDER BY created_at DESC
LIMIT 10;
