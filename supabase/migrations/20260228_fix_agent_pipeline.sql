-- Fix AI Agent Pipeline: CHECK constraints + health score formula
-- Date: 2026-02-28
-- Fixes:
--   1. city_recovery_log CHECK constraint missing DISCOVER_AI and REVALIDATE actions
--   2. Health score formula ignores actual event counts (0 events can show 70+ health)

-- ============================================================================
-- FIX 1: city_recovery_log CHECK constraint
-- The city-guardian Edge Function inserts 'DISCOVER_AI' and 'REVALIDATE' actions
-- but the original CHECK constraint only allowed: BOOTSTRAP, DISCOVER, REPARSE, STATE_CHANGE, QUARANTINE
-- ============================================================================

DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%city_recovery_log_action_check%'
  ) THEN
    ALTER TABLE public.city_recovery_log DROP CONSTRAINT city_recovery_log_action_check;
  END IF;
END $$;

-- Add updated CHECK constraint with all valid actions
ALTER TABLE public.city_recovery_log 
  ADD CONSTRAINT city_recovery_log_action_check 
  CHECK (action IN (
    'BOOTSTRAP', 'DISCOVER', 'DISCOVER_AI', 'REPARSE', 
    'REVALIDATE', 'STATE_CHANGE', 'QUARANTINE'
  ));

-- ============================================================================
-- FIX 2: Health score formula - include actual event counts
-- Current formula only uses source metrics (count, stability, avg score)
-- New formula: 30% sources + 20% stability + 20% source quality + 30% event activity
-- A city with 0 events should NEVER show high health
-- ============================================================================

DROP VIEW IF EXISTS public.city_health_view CASCADE;

CREATE VIEW public.city_health_view AS
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
  ROUND((
    COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
    / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC * 100
  )::NUMERIC, 2) AS source_stability_pct,
  
  -- Real event counts
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status = 'active' 
    AND e.start_time >= NOW() - INTERVAL '7 days'
  ) AS events_7d,
  
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status = 'active' 
    AND e.start_time >= NOW() - INTERVAL '30 days'
  ) AS events_30d,
  
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS total_events,
  
  -- Free events count
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status = 'active' 
    AND e.price = 0
    AND e.start_time >= NOW()
  ) AS free_events_count,
  
  -- Hours since last event ingestion
  EXTRACT(EPOCH FROM (NOW() - MAX(e.created_at))) / 3600.0 AS hours_since_last_event,
  
  -- Average confidence
  ROUND(COALESCE(AVG(ec.final_score), 0.0)::NUMERIC, 2) AS avg_confidence_score,
  
  -- IMPROVED HEALTH SCORE (0-100)
  -- 30% source availability + 20% source stability + 20% source quality + 30% event activity
  -- Event activity: min(active_events / 10, 1.0) — 10+ events = full 30 points
  ROUND(COALESCE((
    -- Source availability (30 pts): min(active_sources / 5, 1.0) * 30
    LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 30.0
    +
    -- Source stability (20 pts): active_healthy / total * 20
    ROUND((
      COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
      / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC
    ) * 20.0, 2)
    +
    -- Source quality (20 pts): avg_score / 100 * 20
    COALESCE(AVG(es.source_score), 0.0) / 100.0 * 20.0
    +
    -- Event activity (30 pts): min(active_events / 10, 1.0) * 30
    LEAST(
      COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active' AND e.start_time >= NOW())::NUMERIC / 10.0, 
      1.0
    ) * 30.0
  ), 0.0)::NUMERIC, 2) AS health_score,
  
  -- Health status labels
  CASE 
    WHEN COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active' AND e.start_time >= NOW()) = 0 
      AND COUNT(DISTINCT es.id) FILTER (WHERE es.active) = 0 
      THEN '🟠 STARVED'
    WHEN COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active' AND e.start_time >= NOW()) = 0 
      THEN '🔴 NO EVENTS'
    WHEN ROUND(COALESCE((
      LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 30.0
      + ROUND((COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC) * 20.0, 2)
      + COALESCE(AVG(es.source_score), 0.0) / 100.0 * 20.0
      + LEAST(COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active' AND e.start_time >= NOW())::NUMERIC / 10.0, 1.0) * 30.0
    ), 0.0)::NUMERIC, 2) >= 70 THEN '🟢 ACTIVE'
    WHEN ROUND(COALESCE((
      LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 30.0
      + ROUND((COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC) * 20.0, 2)
      + COALESCE(AVG(es.source_score), 0.0) / 100.0 * 20.0
      + LEAST(COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active' AND e.start_time >= NOW())::NUMERIC / 10.0, 1.0) * 30.0
    ), 0.0)::NUMERIC, 2) >= 40 THEN '🟡 DEGRADED'
    ELSE '🔴 RECOVERING'
  END AS health_status

FROM public.city_configs c
LEFT JOIN public.event_sources es ON es.city_id = c.city_id
LEFT JOIN public.events e ON e.city_id = c.city_id
LEFT JOIN public.event_confidence ec ON ec.event_id = e.id
WHERE c.pipeline_enabled = true
GROUP BY c.city_id, c.city_name, c.country, c.state, c.last_bootstrap_at;

-- Recreate materialized view
DROP MATERIALIZED VIEW IF EXISTS public.city_health_snapshot;
CREATE MATERIALIZED VIEW public.city_health_snapshot AS
SELECT * FROM public.city_health_view;

CREATE INDEX IF NOT EXISTS idx_city_health_snapshot_health
  ON public.city_health_snapshot(health_score DESC);

-- Grant access
GRANT SELECT ON public.city_health_view TO authenticated, service_role;
GRANT SELECT ON public.city_health_snapshot TO authenticated, service_role;
