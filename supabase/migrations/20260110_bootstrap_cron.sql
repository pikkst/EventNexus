-- 🔧 CRON JOB: Process bootstrap queue automatically
-- Runs every 5 minutes to check for cities needing bootstrap

-- Create pg_cron extension if not exists
create extension if not exists pg_cron;

-- Schedule bootstrap queue processor
-- Runs every 5 minutes
select cron.schedule(
  'process-bootstrap-queue',
  '*/5 * * * *', -- Every 5 minutes
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/bootstrap-city',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Alternative: Use Supabase Edge Function Cron (preferred for Supabase projects)
-- This is configured via supabase/config.toml instead of SQL

comment on extension pg_cron is 'Automatic bootstrap queue processing every 5 minutes';
