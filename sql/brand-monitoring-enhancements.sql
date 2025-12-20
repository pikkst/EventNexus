-- Brand Monitoring System Enhancements
-- Adds: whitelist, notes, priority, historical tracking, stats

-- 1. Whitelist Table (prevent false positives)
CREATE TABLE IF NOT EXISTS brand_monitoring_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text NOT NULL,
  reason text,
  whitelisted_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(url, title)
);

-- RLS for whitelist
ALTER TABLE brand_monitoring_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage whitelist"
  ON brand_monitoring_whitelist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 2. Alert Notes/Comments
CREATE TABLE IF NOT EXISTS brand_monitoring_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES brand_monitoring_alerts(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS for notes
ALTER TABLE brand_monitoring_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage notes"
  ON brand_monitoring_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 3. Add priority field to alerts
ALTER TABLE brand_monitoring_alerts 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 4. Historical Stats Table (daily snapshots)
CREATE TABLE IF NOT EXISTS brand_monitoring_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_alerts int DEFAULT 0,
  critical_alerts int DEFAULT 0,
  warning_alerts int DEFAULT 0,
  info_alerts int DEFAULT 0,
  new_alerts_today int DEFAULT 0,
  resolved_today int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

-- RLS for history
ALTER TABLE brand_monitoring_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view history"
  ON brand_monitoring_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Function to snapshot daily stats
CREATE OR REPLACE FUNCTION snapshot_daily_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO brand_monitoring_history (
    date,
    total_alerts,
    critical_alerts,
    warning_alerts,
    info_alerts,
    new_alerts_today,
    resolved_today
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE status NOT IN ('deleted')),
    COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('deleted')),
    COUNT(*) FILTER (WHERE severity = 'warning' AND status NOT IN ('deleted')),
    COUNT(*) FILTER (WHERE severity = 'info' AND status NOT IN ('deleted')),
    COUNT(*) FILTER (WHERE timestamp::date = CURRENT_DATE AND status = 'open'),
    COUNT(*) FILTER (WHERE status = 'resolved' AND updated_at::date = CURRENT_DATE)
  FROM brand_monitoring_alerts
  ON CONFLICT (date) DO UPDATE SET
    total_alerts = EXCLUDED.total_alerts,
    critical_alerts = EXCLUDED.critical_alerts,
    warning_alerts = EXCLUDED.warning_alerts,
    info_alerts = EXCLUDED.info_alerts,
    new_alerts_today = EXCLUDED.new_alerts_today,
    resolved_today = EXCLUDED.resolved_today;
END;
$$;

-- 6. Add updated_at to alerts for tracking
ALTER TABLE brand_monitoring_alerts 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_alerts_updated_at ON brand_monitoring_alerts;
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON brand_monitoring_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_status ON brand_monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON brand_monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON brand_monitoring_alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON brand_monitoring_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON brand_monitoring_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whitelist_lookup ON brand_monitoring_whitelist(url, title);

-- 8. Function to get last 30 days stats
CREATE OR REPLACE FUNCTION get_alert_trends(days int DEFAULT 30)
RETURNS TABLE (
  date date,
  total int,
  critical int,
  warnings int
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    date,
    total_alerts as total,
    critical_alerts as critical,
    warning_alerts as warnings
  FROM brand_monitoring_history
  WHERE date >= CURRENT_DATE - days
  ORDER BY date DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_alert_trends TO authenticated;
GRANT EXECUTE ON FUNCTION snapshot_daily_stats TO authenticated;

-- Initial snapshot
SELECT snapshot_daily_stats();

COMMENT ON TABLE brand_monitoring_whitelist IS 'Whitelisted URLs that should be ignored in future scans';
COMMENT ON TABLE brand_monitoring_notes IS 'Admin notes and comments on alerts';
COMMENT ON TABLE brand_monitoring_history IS 'Daily snapshots of monitoring statistics';
