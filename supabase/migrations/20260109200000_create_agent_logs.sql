-- Agent Activity Logs
-- Detailed logging for AI agent actions visible in admin UI

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Agent identification
  agent_name TEXT NOT NULL, -- 'bootstrap-city', 'fetch-sources', 'parse-event-ai', 'validate-event', 'publish-event'
  job_id UUID, -- Optional: group logs by job run
  
  -- Log level
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success', 'debug')),
  
  -- Context (nullable references - some logs may not have specific context)
  city_id UUID,
  source_id UUID,
  event_id UUID,
  
  -- Message
  message TEXT NOT NULL,
  details JSONB, -- Additional structured data (e.g., {events_found: 5, skipped: 2, errors: []})
  
  -- Performance
  duration_ms INTEGER, -- Execution time in milliseconds
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast queries
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_level ON agent_logs(level);
CREATE INDEX idx_agent_logs_job_id ON agent_logs(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_agent_logs_city_id ON agent_logs(city_id) WHERE city_id IS NOT NULL;

-- RLS policies
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read logs
CREATE POLICY "Allow authenticated users to read agent logs"
  ON agent_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert logs
CREATE POLICY "Allow service role to insert agent logs"
  ON agent_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Auto-cleanup: delete logs older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_agent_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_logs
  WHERE created_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily at 3am)
-- Note: Requires pg_cron extension
-- SELECT cron.schedule('cleanup-agent-logs', '0 3 * * *', 'SELECT cleanup_old_agent_logs()');

COMMENT ON TABLE agent_logs IS 'Detailed activity logs from AI agents for admin monitoring';
