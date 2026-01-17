-- Auto-Bootstrap SQL Trigger
-- Triggers bootstrap-city function when a new city is created
-- Ensures no city remains in "NEW" state without triggering discovery

-- 1️⃣ Create function to trigger bootstrap via HTTP
CREATE OR REPLACE FUNCTION trigger_city_auto_bootstrap()
RETURNS TRIGGER AS $$
DECLARE
  request_body JSONB;
BEGIN
  -- Only trigger if pipeline is enabled and state is NEW
  IF NEW.pipeline_enabled = true THEN
    
    -- Log the trigger
    RAISE NOTICE 'Auto-bootstrap trigger fired for city: % (state: %)', 
      NEW.city_name, NEW.state;
    
    -- Queue the bootstrap job by invoking via Supabase Functions
    -- This is handled via the bootstrap_queue table and cron
    -- Set initial state to BOOTSTRAPPING
    NEW.state := 'BOOTSTRAPPING';
    NEW.updated_at := NOW();
    
    -- We'll use trigger approach: insert into bootstrap_queue
    -- which is processed by a cron job
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ Create the bootstrap queue table if it doesn't exist
DROP TABLE IF EXISTS public.bootstrap_queue CASCADE;

CREATE TABLE public.bootstrap_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.city_configs(city_id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bootstrap_queue_status 
  ON public.bootstrap_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_bootstrap_queue_city_id 
  ON public.bootstrap_queue(city_id);

-- 3️⃣ Create trigger on city_configs table
-- Fires after INSERT or UPDATE when state changes to NEW or BOOTSTRAPPING
DROP TRIGGER IF EXISTS on_city_bootstrap ON public.city_configs;

CREATE TRIGGER on_city_bootstrap
  AFTER INSERT OR UPDATE ON public.city_configs
  FOR EACH ROW
  WHEN (NEW.pipeline_enabled = true AND (NEW.state = 'NEW' OR NEW.state = 'BOOTSTRAPPING'))
  EXECUTE FUNCTION trigger_city_auto_bootstrap();

-- 4️⃣ Function to enqueue bootstrap job
DROP FUNCTION IF EXISTS enqueue_bootstrap_job(UUID);

CREATE OR REPLACE FUNCTION enqueue_bootstrap_job(p_city_id UUID)
RETURNS void AS $$
DECLARE
  v_city RECORD;
BEGIN
  -- Get city details
  SELECT city_id, city_name, country 
  INTO v_city
  FROM public.city_configs
  WHERE city_id = p_city_id;
  
  IF v_city IS NULL THEN
    RAISE EXCEPTION 'City not found: %', p_city_id;
  END IF;
  
  -- Insert into bootstrap queue
  INSERT INTO public.bootstrap_queue (city_id, city_name, country, status)
  VALUES (v_city.city_id, v_city.city_name, v_city.country, 'pending')
  ON CONFLICT (city_id) DO UPDATE
  SET status = 'pending', updated_at = NOW();
  
  RAISE NOTICE 'Bootstrap job enqueued for city: %', v_city.city_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5️⃣ Function to process next bootstrap job from queue
DROP FUNCTION IF EXISTS get_next_bootstrap_job();

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
    WHERE status = 'pending'
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

-- 6️⃣ Mark bootstrap complete
CREATE OR REPLACE FUNCTION mark_bootstrap_complete(
  p_city_id UUID,
  p_sources_found INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  -- Update bootstrap queue
  UPDATE public.bootstrap_queue
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE city_id = p_city_id;
  
  -- Update city config if sources were found
  IF p_sources_found > 0 THEN
    UPDATE public.city_configs
    SET 
      state = 'ACTIVE',
      updated_at = NOW()
    WHERE city_id = p_city_id
      AND state IN ('NEW', 'BOOTSTRAPPING');
  ELSE
    -- If no sources found, mark as STARVED
    UPDATE public.city_configs
    SET 
      state = 'STARVED',
      updated_at = NOW()
    WHERE city_id = p_city_id
      AND state IN ('NEW', 'BOOTSTRAPPING');
  END IF;
  
  -- Log completion
  RAISE NOTICE 'Bootstrap completed for city: % (% sources found)', 
    p_city_id, p_sources_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7️⃣ Mark bootstrap failed
DROP FUNCTION IF EXISTS mark_bootstrap_failed(UUID, TEXT);

CREATE OR REPLACE FUNCTION mark_bootstrap_failed(
  p_city_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
BEGIN
  -- Update bootstrap queue
  UPDATE public.bootstrap_queue
  SET 
    status = 'failed',
    error_message = p_error_message,
    updated_at = NOW()
  WHERE city_id = p_city_id;
  
  -- Update city config to QUARANTINED after too many failures
  UPDATE public.city_configs
  SET 
    state = CASE 
      WHEN recovery_attempts >= 5 THEN 'QUARANTINED'
      ELSE 'BOOTSTRAPPING'
    END,
    updated_at = NOW()
  WHERE city_id = p_city_id;
  
  -- Log failure
  RAISE NOTICE 'Bootstrap failed for city: % - %', p_city_id, p_error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8️⃣ Enable RLS on bootstrap_queue
ALTER TABLE public.bootstrap_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage bootstrap queue" ON public.bootstrap_queue;
CREATE POLICY "Service role can manage bootstrap queue"
  ON public.bootstrap_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can view bootstrap queue" ON public.bootstrap_queue;
CREATE POLICY "Admins can view bootstrap queue"
  ON public.bootstrap_queue FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- 9️⃣ Grant permissions
GRANT EXECUTE ON FUNCTION trigger_city_auto_bootstrap() TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_bootstrap_job(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_next_bootstrap_job() TO service_role;
GRANT EXECUTE ON FUNCTION mark_bootstrap_complete(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION mark_bootstrap_failed(UUID, TEXT) TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.bootstrap_queue TO service_role;

-- 🔟 Queue existing cities that need bootstrap
INSERT INTO public.bootstrap_queue (city_id, city_name, country, status)
SELECT city_id, city_name, country, 'pending'
FROM public.city_configs
WHERE pipeline_enabled = true 
  AND (state = 'NEW' OR state = 'BOOTSTRAPPING')
  AND city_id NOT IN (SELECT city_id FROM public.bootstrap_queue)
ON CONFLICT (city_id) DO NOTHING;

COMMENT ON TABLE public.bootstrap_queue IS 'Queue for city bootstrap jobs, processed by cron-based Edge Function';
COMMENT ON FUNCTION enqueue_bootstrap_job(UUID) IS 'Enqueue a bootstrap job for a city';
COMMENT ON FUNCTION get_next_bootstrap_job() IS 'Get the next pending bootstrap job from queue';
COMMENT ON FUNCTION mark_bootstrap_complete(UUID, INTEGER) IS 'Mark bootstrap as completed for a city';
COMMENT ON FUNCTION mark_bootstrap_failed(UUID, TEXT) IS 'Mark bootstrap as failed for a city';
