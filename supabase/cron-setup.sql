-- Supabase Cron Job Setup
-- Create scheduled job to trigger process-event-reports Edge Function

-- Step 1: Ensure pg_cron extension is enabled (should be by default)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create the cron job via Supabase Dashboard
-- Go to: Integrations → Cron → Create a new job
-- 
-- Job Details:
-- - Name: process-event-reports-hourly
-- - Cron: 0 * * * * (every hour at minute 0)
-- - Database: postgres
-- - SQL (see below)

-- Step 3: SQL to execute (copy paste into Supabase Cron job)
SELECT
  http_post(
    'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-event-reports',
    '{}'::jsonb,
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY'),
      http_header('Content-Type', 'application/json')
    ]
  );

-- Instructions:
-- 1. Go to Supabase Dashboard
-- 2. Click: Integrations → Cron
-- 3. Click: "Create a new job"
-- 4. Fill in:
--    - Schedule: 0 * * * *
--    - Database: postgres (default)
--    - Name: process-event-reports-hourly
--    - Command: paste the SELECT statement above
-- 5. Click Create
-- 6. Job should now run every hour!

-- To verify:
-- - Check Integrations → Cron → see your job listed
-- - Check Edge Functions → Logs for execution
