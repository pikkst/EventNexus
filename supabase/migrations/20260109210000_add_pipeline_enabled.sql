-- Add pipeline_enabled column to city_configs
ALTER TABLE city_configs
ADD COLUMN IF NOT EXISTS pipeline_enabled BOOLEAN DEFAULT true;

-- Add last_bootstrap_at for tracking
ALTER TABLE city_configs
ADD COLUMN IF NOT EXISTS last_bootstrap_at TIMESTAMPTZ;

COMMENT ON COLUMN city_configs.pipeline_enabled IS 'Whether automated pipeline (fetch/parse/publish) is enabled for this city';
COMMENT ON COLUMN city_configs.last_bootstrap_at IS 'Timestamp of last successful bootstrap (event source discovery)';
