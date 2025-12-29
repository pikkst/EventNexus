-- Check if cron job is configured and running

-- 1. Check cron job exists
SELECT 
  '✓ CRON JOB STATUS' as check_type,
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN '✓ Active and running'
    ELSE '✗ Inactive - needs restart'
  END as status
FROM cron.job 
WHERE jobname = 'process-scheduled-payouts-daily';

-- 2. Check recent execution history
SELECT 
  '📊 RECENT EXECUTIONS' as check_type,
  runid,
  start_time,
  end_time,
  status,
  return_message,
  end_time - start_time as duration
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-payouts-daily'
)
ORDER BY start_time DESC 
LIMIT 10;

-- 3. Check next scheduled run
SELECT 
  '⏰ NEXT RUN' as check_type,
  jobname,
  schedule,
  -- Next 2 AM UTC after now
  (DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day' + INTERVAL '2 hours') AT TIME ZONE 'UTC' as next_run_utc,
  (DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day' + INTERVAL '2 hours') AT TIME ZONE 'Europe/Tallinn' as next_run_estonia
FROM cron.job 
WHERE jobname = 'process-scheduled-payouts-daily';
