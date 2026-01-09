-- Add archived_at timestamp to events table for tracking when events were archived

ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for efficient queries on archived events
CREATE INDEX IF NOT EXISTS idx_events_archived_at ON public.events(archived_at) WHERE archived_at IS NOT NULL;

-- Update valid_job_name constraint to include archive-expired
-- CRITICAL: Must do this BEFORE inserting new job
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_job_name' 
    AND conrelid = 'public.scheduler_configs'::regclass
  ) THEN
    ALTER TABLE public.scheduler_configs DROP CONSTRAINT valid_job_name;
  END IF;
END $$;

-- Add updated constraint with archive-expired included
ALTER TABLE public.scheduler_configs 
  ADD CONSTRAINT valid_job_name 
  CHECK (job_name IN ('fetch-sources', 'parse-events', 'validate-events', 'archive-expired'));

-- NOW we can insert the archive job (constraint already updated)
INSERT INTO public.scheduler_configs (job_name, schedule_cron, function_url, is_enabled, created_by)
VALUES 
  ('archive-expired', '0 0 * * *', 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/archive-expired-events', false, NULL)
ON CONFLICT (job_name) DO NOTHING;

COMMENT ON COLUMN public.events.archived_at IS 'Timestamp when event was automatically archived after end time passed';
