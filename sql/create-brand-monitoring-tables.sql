-- Brand Monitoring System Tables
-- Creates tables for storing brand protection monitoring data

-- Create brand_monitoring_alerts table
CREATE TABLE IF NOT EXISTS brand_monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('code', 'domain', 'brand', 'search', 'social', 'competitor')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  action_taken TEXT,
  detected_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create monitoring_stats table (single row for platform-wide stats)
CREATE TABLE IF NOT EXISTS monitoring_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  code_scans INTEGER NOT NULL DEFAULT 0,
  domain_checks INTEGER NOT NULL DEFAULT 0,
  brand_mentions INTEGER NOT NULL DEFAULT 0,
  search_results INTEGER NOT NULL DEFAULT 0,
  social_mentions INTEGER NOT NULL DEFAULT 0,
  competitor_alerts INTEGER NOT NULL DEFAULT 0,
  critical_alerts INTEGER NOT NULL DEFAULT 0,
  warning_alerts INTEGER NOT NULL DEFAULT 0,
  info_alerts INTEGER NOT NULL DEFAULT 0,
  last_scan_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row_stats CHECK (id = 1)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type ON brand_monitoring_alerts(type);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON brand_monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON brand_monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON brand_monitoring_alerts(timestamp DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monitoring_alerts_updated_at
  BEFORE UPDATE ON brand_monitoring_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_stats_updated_at
  BEFORE UPDATE ON monitoring_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial monitoring_stats row
INSERT INTO monitoring_stats (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE brand_monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admin full access to monitoring alerts"
  ON brand_monitoring_alerts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin full access to monitoring stats"
  ON monitoring_stats
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON brand_monitoring_alerts TO authenticated;
GRANT ALL ON monitoring_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE brand_monitoring_alerts IS 'Stores alerts from brand protection monitoring system';
COMMENT ON TABLE monitoring_stats IS 'Stores aggregate statistics for monitoring system (single row)';

COMMENT ON COLUMN brand_monitoring_alerts.type IS 'Type of monitoring: code, domain, brand, search, social, competitor';
COMMENT ON COLUMN brand_monitoring_alerts.severity IS 'Alert severity: critical, warning, info';
COMMENT ON COLUMN brand_monitoring_alerts.status IS 'Alert status: open, investigating, resolved, dismissed';
COMMENT ON COLUMN brand_monitoring_alerts.metadata IS 'Additional alert data in JSON format';

-- Create view for monitoring dashboard
CREATE OR REPLACE VIEW monitoring_dashboard_summary AS
SELECT
  type,
  severity,
  status,
  COUNT(*) as count,
  MAX(timestamp) as latest_alert
FROM brand_monitoring_alerts
GROUP BY type, severity, status;

-- Grant view access
GRANT SELECT ON monitoring_dashboard_summary TO authenticated;

-- Create function to get alert counts by severity
CREATE OR REPLACE FUNCTION get_alert_counts_by_severity()
RETURNS TABLE (
  severity TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.severity,
    COUNT(*)::BIGINT
  FROM brand_monitoring_alerts a
  WHERE a.status IN ('open', 'investigating')
  GROUP BY a.severity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent alerts
CREATE OR REPLACE FUNCTION get_recent_alerts(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  type TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  alert_timestamp TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.type,
    a.severity,
    a.title,
    a.description,
    a.url,
    a.timestamp as alert_timestamp,
    a.status
  FROM brand_monitoring_alerts a
  ORDER BY a.timestamp DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_alert_counts_by_severity() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_alerts(INTEGER) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Brand monitoring tables created successfully!';
  RAISE NOTICE 'Tables: brand_monitoring_alerts, monitoring_stats';
  RAISE NOTICE 'Views: monitoring_dashboard_summary';
  RAISE NOTICE 'Functions: get_alert_counts_by_severity(), get_recent_alerts()';
END $$;
