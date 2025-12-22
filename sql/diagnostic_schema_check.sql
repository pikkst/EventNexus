-- ============================================================
-- Diagnostic Schema Check
-- Verifies all required tables and columns for Phase 4
-- ============================================================

-- Check which tables exist
SELECT 
  'Tables Check' AS check_type,
  table_name,
  'EXISTS' AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'campaigns',
    'campaign_analytics', 
    'campaign_performance',
    'autonomous_actions',
    'autonomous_rules',
    'optimization_opportunities'
  )
ORDER BY table_name;

-- Check campaigns table structure
SELECT 
  'campaigns columns' AS check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaigns'
ORDER BY ordinal_position;

-- Check campaign_analytics table structure
SELECT 
  'campaign_analytics columns' AS check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaign_analytics'
ORDER BY ordinal_position;

-- Check campaign_performance table structure
SELECT 
  'campaign_performance columns' AS check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'campaign_performance'
ORDER BY ordinal_position;

-- Check autonomous tables if they exist
SELECT 
  'autonomous_actions columns' AS check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'autonomous_actions'
ORDER BY ordinal_position;

-- Check available functions
SELECT 
  'Functions Check' AS check_type,
  routine_name,
  'EXISTS' AS status
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND (
    routine_name LIKE '%autonomous%' 
    OR routine_name LIKE '%optimization%'
    OR routine_name LIKE '%campaign%'
  )
ORDER BY routine_name;

-- Sample data checks
SELECT 
  'Data Check: campaigns' AS check_type,
  COUNT(*) AS count,
  COUNT(CASE WHEN status = 'Active' OR status = 'active' THEN 1 END) AS active_count,
  MIN(created_at) AS oldest_campaign,
  MAX(created_at) AS newest_campaign
FROM campaigns;

SELECT 
  'Data Check: campaign_analytics' AS check_type,
  COUNT(*) AS total_records,
  COUNT(DISTINCT campaign_id) AS unique_campaigns,
  MIN(recorded_at) AS oldest_record,
  MAX(recorded_at) AS newest_record
FROM campaign_analytics;

SELECT 
  'Data Check: campaign_performance' AS check_type,
  COUNT(*) AS total_records,
  AVG(roi) AS avg_roi,
  AVG(ctr) AS avg_ctr,
  SUM(total_spend) AS total_spend
FROM campaign_performance;
