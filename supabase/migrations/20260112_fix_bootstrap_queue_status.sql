-- Fix bootstrap_queue status constraint conflict
-- The old trigger was using 'queued' but the refined migration uses 'pending'

-- 1️⃣ Drop old conflicting triggers
DROP TRIGGER IF EXISTS on_city_created ON public.city_configs;
DROP TRIGGER IF EXISTS city_bootstrap_trigger ON public.city_configs;

-- 2️⃣ Drop old trigger function that uses 'queued' (CASCADE to drop dependent triggers)
DROP FUNCTION IF EXISTS trigger_city_bootstrap() CASCADE;

-- 3️⃣ Ensure the refined trigger and function are in place
-- (These should already exist from 20260110_auto_bootstrap_refined.sql)

-- 4️⃣ Update get_next_bootstrap_job to use 'pending' instead of 'queued'
-- (This ensures compatibility with the new status values)
CREATE OR REPLACE FUNCTION get_next_bootstrap_job()
RETURNS TABLE (city_id UUID, city_name TEXT, country TEXT) AS $$
  UPDATE public.bootstrap_queue
  SET 
    status = 'processing',
    attempts = attempts + 1,
    last_attempt = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT id
    FROM public.bootstrap_queue
    WHERE status = 'pending'  -- Changed from 'queued' to 'pending'
      AND attempts < 5  -- Max 5 retry attempts
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    bootstrap_queue.city_id,
    bootstrap_queue.city_name,
    bootstrap_queue.country;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 5️⃣ Update any existing 'queued' records to 'pending' (if any exist)
UPDATE public.bootstrap_queue 
SET status = 'pending' 
WHERE status = 'queued';

-- 6️⃣ Ensure constraint is correct
ALTER TABLE public.bootstrap_queue 
  DROP CONSTRAINT IF EXISTS bootstrap_queue_status_check;

ALTER TABLE public.bootstrap_queue 
  ADD CONSTRAINT bootstrap_queue_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
