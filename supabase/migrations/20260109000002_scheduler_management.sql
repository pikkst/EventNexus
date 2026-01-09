-- Scheduler Management Functions for AI Agent System
-- Allows UI to create/update/delete cron jobs without manual SQL

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Table to store scheduler configuration
CREATE TABLE IF NOT EXISTS public.scheduler_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT UNIQUE NOT NULL,
  schedule_cron TEXT NOT NULL, -- Cron expression (e.g., '0 */24 * * *')
  function_url TEXT NOT NULL, -- Edge Function URL to call
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT valid_job_name CHECK (job_name IN ('fetch-sources', 'parse-events', 'validate-events'))
);

-- Enable RLS
ALTER TABLE public.scheduler_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage scheduler
CREATE POLICY "Admins can manage scheduler configs"
  ON public.scheduler_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Function to convert hours to cron expression
CREATE OR REPLACE FUNCTION hours_to_cron(interval_hours INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF interval_hours = 1 THEN
    RETURN '0 * * * *'; -- Every hour
  ELSIF interval_hours = 24 THEN
    RETURN '0 0 * * *'; -- Daily at midnight
  ELSIF interval_hours < 24 THEN
    RETURN format('0 */%s * * *', interval_hours); -- Every N hours
  ELSE
    -- For intervals > 24h, run daily
    RETURN '0 0 * * *';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to schedule or update a cron job
CREATE OR REPLACE FUNCTION schedule_ai_pipeline_job(
  p_job_name TEXT,
  p_interval_hours INTEGER,
  p_function_url TEXT,
  p_enabled BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_cron_expression TEXT;
  v_cron_job_name TEXT;
  v_sql_command TEXT;
  v_config_id UUID;
BEGIN
  -- Generate cron expression
  v_cron_expression := hours_to_cron(p_interval_hours);
  v_cron_job_name := 'ai_agent_' || replace(p_job_name, '-', '_');
  
  -- Build the SQL command that will be executed by cron
  v_sql_command := format(
    $sql$SELECT net.http_post(
      url := %L,
      headers := '{"Authorization": "Bearer %s", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    )$sql$,
    p_function_url,
    current_setting('app.settings.service_role_key', true)
  );
  
  -- Remove existing cron job if it exists
  PERFORM cron.unschedule(v_cron_job_name);
  
  -- Create new cron job only if enabled
  IF p_enabled THEN
    PERFORM cron.schedule(
      v_cron_job_name,
      v_cron_expression,
      v_sql_command
    );
  END IF;
  
  -- Upsert scheduler config
  INSERT INTO public.scheduler_configs (
    job_name,
    schedule_cron,
    function_url,
    is_enabled,
    created_by,
    updated_at
  ) VALUES (
    p_job_name,
    v_cron_expression,
    p_function_url,
    p_enabled,
    auth.uid(),
    NOW()
  )
  ON CONFLICT (job_name) 
  DO UPDATE SET
    schedule_cron = EXCLUDED.schedule_cron,
    function_url = EXCLUDED.function_url,
    is_enabled = EXCLUDED.is_enabled,
    updated_at = NOW()
  RETURNING id INTO v_config_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_name', v_cron_job_name,
    'cron_expression', v_cron_expression,
    'enabled', p_enabled,
    'config_id', v_config_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a cron job
CREATE OR REPLACE FUNCTION unschedule_ai_pipeline_job(p_job_name TEXT)
RETURNS JSONB AS $$
DECLARE
  v_cron_job_name TEXT;
BEGIN
  v_cron_job_name := 'ai_agent_' || replace(p_job_name, '-', '_');
  
  -- Remove cron job
  PERFORM cron.unschedule(v_cron_job_name);
  
  -- Delete config
  DELETE FROM public.scheduler_configs WHERE job_name = p_job_name;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_name', v_cron_job_name
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active cron jobs
CREATE OR REPLACE FUNCTION get_active_cron_jobs()
RETURNS TABLE (
  jobid BIGINT,
  schedule TEXT,
  command TEXT,
  nodename TEXT,
  nodeport INTEGER,
  database TEXT,
  username TEXT,
  active BOOLEAN,
  jobname TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM cron.job
  WHERE cron.job.jobname LIKE 'ai_agent_%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update job statistics after execution
CREATE OR REPLACE FUNCTION update_job_stats(
  p_job_name TEXT,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.scheduler_configs
  SET 
    last_run_at = NOW(),
    run_count = run_count + 1,
    error_count = CASE WHEN p_success THEN error_count ELSE error_count + 1 END,
    last_error = CASE WHEN p_success THEN NULL ELSE p_error END,
    updated_at = NOW()
  WHERE job_name = p_job_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION schedule_ai_pipeline_job TO authenticated;
GRANT EXECUTE ON FUNCTION unschedule_ai_pipeline_job TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_cron_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_stats TO authenticated;

-- Insert default configurations
INSERT INTO public.scheduler_configs (job_name, schedule_cron, function_url, is_enabled, created_by)
VALUES 
  ('fetch-sources', '0 0 * * *', 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/fetch-sources', false, NULL),
  ('parse-events', '0 * * * *', 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/parse-event-ai', false, NULL),
  ('validate-events', '0 * * * *', 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/validate-event', false, NULL)
ON CONFLICT (job_name) DO NOTHING;

COMMENT ON TABLE public.scheduler_configs IS 'Stores configuration for AI Agent pipeline cron jobs';
COMMENT ON FUNCTION schedule_ai_pipeline_job IS 'Creates or updates a cron job for AI pipeline automation';
COMMENT ON FUNCTION unschedule_ai_pipeline_job IS 'Removes a cron job from the schedule';
COMMENT ON FUNCTION get_active_cron_jobs IS 'Returns list of currently active cron jobs';
