-- Self-Healing City System
-- Adds state machine, health scoring, and auto-recovery capabilities

-- 1️⃣ ADD CITY STATE MACHINE COLUMNS
ALTER TABLE public.city_configs 
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'NEW' 
    CHECK (state IN ('NEW', 'BOOTSTRAPPING', 'DISCOVERING_SOURCES', 'ACTIVE', 'DEGRADED', 'STARVED', 'RECOVERING', 'QUARANTINED', 'HUMAN_REVIEW')),
  ADD COLUMN IF NOT EXISTS health_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (health_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS last_event_ingest_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_rate_7d NUMERIC(5,2) DEFAULT 0.00 CHECK (error_rate_7d BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_recovery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_cooldown_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pipeline_enabled BOOLEAN NOT NULL DEFAULT true;

-- 2️⃣ ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_city_configs_health 
  ON public.city_configs(health_score DESC, state)
  WHERE pipeline_enabled = true;

CREATE INDEX IF NOT EXISTS idx_city_configs_state 
  ON public.city_configs(state)
  WHERE pipeline_enabled = true;

CREATE INDEX IF NOT EXISTS idx_city_configs_recovery 
  ON public.city_configs(recovery_attempts, last_recovery_at);

-- 3️⃣ ADD EVENT SOURCES STATE TRACKING
ALTER TABLE public.event_sources
  ADD COLUMN IF NOT EXISTS source_state TEXT NOT NULL DEFAULT 'active'
    CHECK (source_state IN ('active', 'degraded', 'quarantined', 'dead')),
  ADD COLUMN IF NOT EXISTS success_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_events_yield INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplication_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discovered_by TEXT DEFAULT 'manual' CHECK (discovered_by IN ('manual', 'bootstrap', 'ai')),
  ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_event_sources_state
  ON public.event_sources(source_state, city_id)
  WHERE active = true;

-- 4️⃣ CREATE CITY HEALTH SCORE VIEW (SIMPLIFIED)
-- Weights: source yield (40%), source stability (30%), source score (30%)
CREATE OR REPLACE VIEW public.city_health_view AS
SELECT
  c.city_id,
  c.city_name,
  c.country,
  c.state,
  c.last_bootstrap_at,
  
  -- Source metrics
  COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead') AS active_sources,
  COUNT(DISTINCT es.id) FILTER (WHERE es.active) AS total_sources,
  ROUND(COALESCE(AVG(es.source_score), 0.0)::NUMERIC, 2) AS avg_source_score,
  ROUND(
    (
      COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
      / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC * 100
    )::NUMERIC,
    2
  ) AS source_stability_pct,
  
  -- Dummy event counts (will be populated later)
  0 AS events_7d,
  0 AS events_30d,
  0 AS hours_since_last_event,
  0 AS avg_confidence_score,
  
  -- HEALTH SCORE CALCULATION (0-100)
  -- 40% source yield, 30% source stability, 30% avg source score
  ROUND(
    COALESCE(
      (
        -- Source yield (0-40): min(active_sources / 5, 1) * 40
        LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 40.0
        +
        -- Source stability (0-30)
        ROUND(
          (
            COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
            / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC
          ) * 30.0,
          2
        )
        +
        -- Average source score (0-30): avg_source_score * 30
        COALESCE(AVG(es.source_score), 0.0) * 30.0
      ),
      0.0
    )::NUMERIC,
    2
  ) AS health_score,
  
  -- Health status
  CASE 
    WHEN ROUND(
      COALESCE(
        (
          LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 40.0
          +
          ROUND(
            (
              COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
              / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC
            ) * 30.0,
            2
          )
          +
          COALESCE(AVG(es.source_score), 0.0) * 30.0
        ),
        0.0
      )::NUMERIC,
      2
    ) >= 80 THEN '🟢 ACTIVE'
    WHEN ROUND(
      COALESCE(
        (
          LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 40.0
          +
          ROUND(
            (
              COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
              / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC
            ) * 30.0,
            2
          )
          +
          COALESCE(AVG(es.source_score), 0.0) * 30.0
        ),
        0.0
      )::NUMERIC,
      2
    ) >= 50 THEN '🟡 DEGRADED'
    WHEN COUNT(DISTINCT es.id) FILTER (WHERE es.active) = 0 THEN '🟠 STARVED'
    ELSE '🔴 RECOVERING'
  END AS health_status

FROM public.city_configs c
LEFT JOIN public.event_sources es ON es.city_id = c.city_id
WHERE c.pipeline_enabled = true
GROUP BY c.city_id, c.city_name, c.country, c.state;

-- 5️⃣ CREATE MATERIALIZED VIEW FOR PERFORMANCE (update every 1 hour via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.city_health_snapshot AS
SELECT * FROM public.city_health_view;

CREATE INDEX IF NOT EXISTS idx_city_health_snapshot_health
  ON public.city_health_snapshot(health_score DESC);

-- 6️⃣ SOURCE QUALITY DECAY LOGIC
-- Automatically downgrade sources that aren't yielding events
CREATE OR REPLACE FUNCTION decay_source_quality()
RETURNS void AS $$
BEGIN
  -- Penalize sources with no recent events
  UPDATE public.event_sources
  SET
    source_score = GREATEST(
      0.10,
      source_score
      - (COALESCE(failure_count, 0) * 0.05)  -- Each failure: -5%
      - (EXTRACT(DAY FROM (NOW() - COALESCE(last_success_at, created_at))) * 0.01)  -- Age penalty: -1% per day
    ),
    source_state = CASE 
      WHEN source_score < 0.30 AND success_count = 0 THEN 'dead'
      WHEN source_score < 0.50 THEN 'degraded'
      ELSE 'active'
    END
  WHERE active = true;
  
  -- Notify city guardian
  RAISE NOTICE 'Source quality decay completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7️⃣ CITY STATE TRANSITION LOGIC
-- Automatically updates city state based on health
CREATE OR REPLACE FUNCTION update_city_state_based_on_health()
RETURNS void AS $$
DECLARE
  v_city RECORD;
  v_next_state TEXT;
BEGIN
  -- Iterate through all pipeline-enabled cities
  FOR v_city IN
    SELECT c.city_id, c.state, h.health_score, h.active_sources, h.events_30d
    FROM public.city_configs c
    LEFT JOIN public.city_health_view h ON h.city_id = c.city_id
    WHERE c.pipeline_enabled = true
  LOOP
    -- Determine next state
    v_next_state := v_city.state;
    
    IF v_city.active_sources = 0 AND v_city.state != 'BOOTSTRAPPING' THEN
      v_next_state := 'BOOTSTRAPPING';
    ELSIF v_city.health_score < 50 AND v_city.state NOT IN ('RECOVERING', 'BOOTSTRAPPING') THEN
      v_next_state := 'DEGRADED';
    ELSIF v_city.events_30d = 0 AND v_city.state NOT IN ('RECOVERING', 'BOOTSTRAPPING') THEN
      v_next_state := 'STARVED';
    ELSIF v_city.health_score >= 80 AND v_city.state IN ('DEGRADED', 'RECOVERING') THEN
      v_next_state := 'ACTIVE';
    END IF;
    
    -- Update if state changed
    IF v_next_state != v_city.state THEN
      UPDATE public.city_configs
      SET
        state = v_next_state,
        updated_at = NOW()
      WHERE city_id = v_city.city_id;
      
      RAISE NOTICE 'City % transitioned: % -> %', v_city.city_id, v_city.state, v_next_state;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8️⃣ AUDIT LOGGING FOR SELF-HEALING ACTIONS
CREATE TABLE IF NOT EXISTS public.city_recovery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.city_configs(city_id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('BOOTSTRAP', 'DISCOVER', 'REPARSE', 'STATE_CHANGE', 'QUARANTINE')),
  reason TEXT NOT NULL,
  old_state TEXT,
  new_state TEXT,
  old_health_score NUMERIC(5,2),
  new_health_score NUMERIC(5,2),
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'city-guardian' CHECK (triggered_by IN ('city-guardian', 'manual', 'trigger')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_recovery_log_city_date
  ON public.city_recovery_log(city_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_city_recovery_log_action
  ON public.city_recovery_log(action, success);

-- 9️⃣ HELPER: Log recovery action
CREATE OR REPLACE FUNCTION log_city_recovery(
  p_city_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_old_state TEXT DEFAULT NULL,
  p_new_state TEXT DEFAULT NULL,
  p_old_health NUMERIC DEFAULT NULL,
  p_new_health NUMERIC DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.city_recovery_log (
    city_id, action, reason, old_state, new_state,
    old_health_score, new_health_score, success, error_message
  ) VALUES (
    p_city_id, p_action, p_reason, p_old_state, p_new_state,
    p_old_health, p_new_health, p_success, p_error
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔟 GRANT PERMISSIONS FOR EDGE FUNCTIONS
GRANT EXECUTE ON FUNCTION decay_source_quality() TO service_role;
GRANT EXECUTE ON FUNCTION update_city_state_based_on_health() TO service_role;
GRANT EXECUTE ON FUNCTION log_city_recovery(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT) TO service_role;

GRANT SELECT ON public.city_health_view TO service_role, authenticated;
GRANT SELECT ON public.city_health_snapshot TO service_role, authenticated;
GRANT SELECT, INSERT ON public.city_recovery_log TO service_role;

-- Update permissions for city_configs
GRANT SELECT, UPDATE ON public.city_configs TO service_role;

-- Enable RLS on recovery log
ALTER TABLE public.city_recovery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage recovery log" ON public.city_recovery_log;
CREATE POLICY "Service role can manage recovery log"
  ON public.city_recovery_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can view recovery log" ON public.city_recovery_log;
CREATE POLICY "Admins can view recovery log"
  ON public.city_recovery_log FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.city_recovery_log IS 'Audit trail for all city self-healing actions';
COMMENT ON VIEW public.city_health_view IS 'Real-time city health score with component breakdown';
COMMENT ON MATERIALIZED VIEW public.city_health_snapshot IS 'Cached city health for dashboard performance';
