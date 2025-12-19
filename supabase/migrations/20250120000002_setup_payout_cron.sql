-- ============================================
-- Automated Payout Cron Job Setup
-- ============================================
-- Sets up daily automated payout processing
-- Run this in Supabase SQL Editor after deploying Edge Functions

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily payout processing at 2 AM UTC
-- This will check for events that completed 2+ days ago and process payouts
SELECT cron.schedule(
  'process-scheduled-payouts-daily',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- Optional: Schedule more frequent checks during business hours (every 6 hours)
-- Uncomment the following to enable
/*
SELECT cron.schedule(
  'process-scheduled-payouts-frequent',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);
*/

-- View scheduled cron jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE 'process-scheduled-payouts%';

-- To manually test the function, run:
-- SELECT net.http_post(
--   url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--     'Content-Type', 'application/json'
--   ),
--   body := '{}'::jsonb
-- );

-- To unschedule (if needed):
-- SELECT cron.unschedule('process-scheduled-payouts-daily');

-- To check cron job history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-payouts-daily')
-- ORDER BY start_time DESC LIMIT 10;
