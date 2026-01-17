-- Enable automatic archival of expired events
-- Runs daily at 2 AM UTC to clean up past events from map

-- Enable pg_cron extension (Supabase Cloud has this available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule archive job to run daily at 2 AM UTC
SELECT cron.schedule(
  'archive-expired-events-daily',
  '0 2 * * *', -- Cron expression: minute hour day month weekday
  $$
  SELECT
    net.http_post(
      url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/archive-expired-events',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Alternative: Use Supabase's built-in Edge Function Cron (recommended)
-- Configure in Supabase Dashboard → Edge Functions → archive-expired-events → Cron
-- Schedule: 0 2 * * * (daily at 2 AM UTC)

-- View active cron jobs
-- SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('archive-expired-events-daily');

COMMENT ON EXTENSION pg_cron IS 
  'Automatic event archival runs daily at 2 AM UTC. Archives events where end_time has passed.';

-- Create a manual trigger function for immediate archival
CREATE OR REPLACE FUNCTION trigger_archive_expired_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT 
    net.http_post(
      url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/archive-expired-events',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION trigger_archive_expired_events IS 
  'Manually trigger archive-expired-events Edge Function. Useful for testing or immediate cleanup.';

-- Grant execute to authenticated users (admins)
GRANT EXECUTE ON FUNCTION trigger_archive_expired_events() TO authenticated;
