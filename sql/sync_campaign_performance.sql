-- ============================================================
-- Sync Campaign Performance
-- ============================================================
-- Syncs campaign.metrics (JSONB) to campaign_performance table
-- This enables autonomous operations to make decisions
-- ============================================================

-- Create campaign_performance table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaign_performance (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_spend DECIMAL(10,2) DEFAULT 0.00,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  roi DECIMAL(10,4) DEFAULT 0.0000,
  ctr DECIMAL(10,4) DEFAULT 0.0000,
  conversion_rate DECIMAL(10,4) DEFAULT 0.0000,
  cost_per_click DECIMAL(10,2) DEFAULT 0.00,
  cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_campaign_performance_roi ON campaign_performance(roi DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_ctr ON campaign_performance(ctr DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_updated ON campaign_performance(last_updated DESC);

-- ============================================================
-- FUNCTION: sync_campaign_to_performance
-- Syncs a single campaign's metrics to performance table
-- ============================================================
CREATE OR REPLACE FUNCTION sync_campaign_to_performance(p_campaign_id UUID)
RETURNS VOID AS $$
DECLARE
  v_campaign RECORD;
  v_views INTEGER;
  v_clicks INTEGER;
  v_conversions INTEGER;
  v_revenue DECIMAL(10,2);
  v_spend DECIMAL(10,2);
  v_roi DECIMAL(10,4);
  v_ctr DECIMAL(10,4);
  v_conversion_rate DECIMAL(10,4);
BEGIN
  -- Get campaign with metrics
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Extract metrics from JSONB
  v_views := COALESCE((v_campaign.metrics->>'views')::INTEGER, 0);
  v_clicks := COALESCE((v_campaign.metrics->>'clicks')::INTEGER, 0);
  v_conversions := COALESCE((v_campaign.metrics->>'guestSignups')::INTEGER, 0) + 
                  COALESCE((v_campaign.metrics->>'proConversions')::INTEGER, 0);
  v_revenue := COALESCE((v_campaign.metrics->>'revenueValue')::DECIMAL, 0.00);
  
  -- Calculate spend (use budget if available, otherwise estimate from metrics)
  v_spend := COALESCE(v_campaign.budget, 0.00);
  IF v_spend = 0 AND v_views > 0 THEN
    -- Estimate spend: €0.10 per view (typical social media CPM)
    v_spend := (v_views * 0.10);
  END IF;

  -- Calculate performance metrics
  v_roi := CASE WHEN v_spend > 0 THEN v_revenue / v_spend ELSE 0 END;
  v_ctr := CASE WHEN v_views > 0 THEN (v_clicks::DECIMAL / v_views) * 100 ELSE 0 END;
  v_conversion_rate := CASE WHEN v_clicks > 0 THEN (v_conversions::DECIMAL / v_clicks) * 100 ELSE 0 END;

  -- Upsert into campaign_performance
  INSERT INTO campaign_performance (
    campaign_id,
    total_impressions,
    total_clicks,
    total_conversions,
    total_spend,
    revenue,
    roi,
    ctr,
    conversion_rate,
    cost_per_click,
    cost_per_conversion,
    last_updated
  ) VALUES (
    p_campaign_id,
    v_views,
    v_clicks,
    v_conversions,
    v_spend,
    v_revenue,
    v_roi,
    v_ctr,
    v_conversion_rate,
    CASE WHEN v_clicks > 0 THEN v_spend / v_clicks ELSE 0 END,
    CASE WHEN v_conversions > 0 THEN v_spend / v_conversions ELSE 0 END,
    NOW()
  )
  ON CONFLICT (campaign_id) DO UPDATE SET
    total_impressions = EXCLUDED.total_impressions,
    total_clicks = EXCLUDED.total_clicks,
    total_conversions = EXCLUDED.total_conversions,
    total_spend = EXCLUDED.total_spend,
    revenue = EXCLUDED.revenue,
    roi = EXCLUDED.roi,
    ctr = EXCLUDED.ctr,
    conversion_rate = EXCLUDED.conversion_rate,
    cost_per_click = EXCLUDED.cost_per_click,
    cost_per_conversion = EXCLUDED.cost_per_conversion,
    last_updated = NOW();

END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: sync_all_campaigns_to_performance
-- Syncs all active campaigns to performance table
-- ============================================================
CREATE OR REPLACE FUNCTION sync_all_campaigns_to_performance()
RETURNS JSONB AS $$
DECLARE
  v_campaign RECORD;
  v_synced_count INTEGER := 0;
BEGIN
  -- Sync all active campaigns
  FOR v_campaign IN
    SELECT id FROM campaigns WHERE status = 'Active'
  LOOP
    PERFORM sync_campaign_to_performance(v_campaign.id);
    v_synced_count := v_synced_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'synced_campaigns', v_synced_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Auto-sync on campaign metrics update
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_sync_campaign_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if metrics changed or status is Active
  IF (NEW.metrics IS DISTINCT FROM OLD.metrics) OR 
     (NEW.status = 'Active' AND OLD.status != 'Active') THEN
    PERFORM sync_campaign_to_performance(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_campaign_performance_trigger ON campaigns;

-- Create trigger
CREATE TRIGGER sync_campaign_performance_trigger
  AFTER UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_campaign_performance();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE campaign_performance ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin full access to campaign_performance" ON campaign_performance;
DROP POLICY IF EXISTS "Organizers see own campaign performance" ON campaign_performance;

-- Admin can see all performance data
CREATE POLICY "Admin full access to campaign_performance" ON campaign_performance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Organizers can see all campaign performance (no user_id in campaigns table)
CREATE POLICY "Organizers see campaign performance" ON campaign_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('organizer', 'admin')
    )
  );

-- ============================================================
-- Initial sync of existing campaigns
-- ============================================================
-- Run this to populate performance table with current data
DO $$
BEGIN
  PERFORM sync_all_campaigns_to_performance();
  RAISE NOTICE '✅ Initial campaign performance sync complete';
END
$$;

-- ============================================================
-- Test queries
-- ============================================================
-- Check performance data:
-- SELECT * FROM campaign_performance ORDER BY roi DESC;

-- Sync all campaigns manually:
-- SELECT * FROM sync_all_campaigns_to_performance();

-- Check specific campaign performance:
-- SELECT c.title, cp.* 
-- FROM campaign_performance cp
-- JOIN campaigns c ON c.id = cp.campaign_id
-- WHERE c.status = 'Active'
-- ORDER BY cp.roi DESC;
-- ============================================================
