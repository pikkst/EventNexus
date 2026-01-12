-- Activate CRON jobs for city-guardian and pipeline
-- Run this in Supabase SQL Editor

-- 1. City Guardian (every 12 hours)
SELECT schedule_ai_pipeline_job(
  'city-guardian',
  12,
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/city-guardian',
  true
);

-- 2. Fetch Sources (every 6 hours) 
SELECT schedule_ai_pipeline_job(
  'fetch-sources',
  6,
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/fetch-sources',
  true
);

-- 3. Parse Events (every 6 hours, 1 hour after fetch)
SELECT schedule_ai_pipeline_job(
  'parse-events',
  6,
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/parse-event-ai',
  true
);

-- 4. Validate Events (every 6 hours, 2 hours after fetch)
SELECT schedule_ai_pipeline_job(
  'validate-events',
  6,
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/validate-event',
  true
);

-- Check active jobs
SELECT * FROM cron.job ORDER BY jobname;
