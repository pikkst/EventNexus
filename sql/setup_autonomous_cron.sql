-- ============================================================
-- AUTONOMOUS OPERATIONS CRON SCHEDULER
-- Runs intelligent autonomous marketing every 6 hours
-- ============================================================

-- Enable pg_cron extension (run once as admin)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing cron job if it exists (safe - won't error if doesn't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('run-autonomous-operations-6h');
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule autonomous operations to run every 6 hours
-- Cron syntax: minute hour day month weekday
-- */360 = every 360 minutes (6 hours)
-- 0 */6 * * * = at minute 0 of every 6th hour (00:00, 06:00, 12:00, 18:00)
SELECT cron.schedule(
  'run-autonomous-operations-6h',           -- job name
  '0 */6 * * *',                            -- every 6 hours at the top of the hour
  $$
    SELECT run_intelligent_autonomous_operations();
  $$
);

-- Alternative: Run at specific times (more predictable)
-- SELECT cron.schedule(
--   'run-autonomous-operations-scheduled',
--   '0 0,6,12,18 * * *',  -- At 00:00, 06:00, 12:00, 18:00 UTC
--   $$
--     SELECT run_intelligent_autonomous_operations();
--   $$
-- );

-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- ============================================================
-- MANUAL CONTROLS
-- ============================================================

-- To manually run now (for testing):
-- SELECT run_intelligent_autonomous_operations();

-- To pause the cron job:
-- UPDATE cron.job SET active = false WHERE jobname = 'run-autonomous-operations-6h';

-- To resume the cron job:
-- UPDATE cron.job SET active = true WHERE jobname = 'run-autonomous-operations-6h';

-- To delete the cron job:
-- SELECT cron.unschedule('run-autonomous-operations-6h');

-- ============================================================
-- MONITORING
-- ============================================================

-- Check last run time and next scheduled run
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job
WHERE jobname = 'run-autonomous-operations-6h';

-- Check recent execution logs
SELECT 
  al.timestamp,
  al.action_type,
  al.message,
  al.status,
  al.campaign_title
FROM autonomous_logs al
WHERE al.action_type IN ('intelligent_analysis_start', 'intelligent_operations_complete')
ORDER BY al.timestamp DESC
LIMIT 10;
