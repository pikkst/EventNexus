-- Fix source_score field overflow - change from NUMERIC(3,2) to NUMERIC(5,2)
-- This allows scores from 0.00 to 999.99 instead of 0.00 to 9.99

-- Step 1: Drop dependent views
DROP VIEW IF EXISTS public.city_health_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.city_health_snapshot;

-- Step 2: Alter column types
ALTER TABLE public.event_sources 
  ALTER COLUMN source_score TYPE NUMERIC(5,2),
  DROP CONSTRAINT IF EXISTS event_sources_source_score_check,
  ADD CONSTRAINT event_sources_source_score_check CHECK (source_score BETWEEN 0 AND 100);

COMMENT ON COLUMN public.event_sources.source_score IS 'Source quality score 0-100 (higher = better quality)';

-- Step 3: Recreate city_health_view with REAL event metrics
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
  
  -- REAL EVENT COUNTS
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status = 'active' 
    AND e.start_time >= NOW() - INTERVAL '7 days'
  ) AS events_7d,
  
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status = 'active' 
    AND e.start_time >= NOW() - INTERVAL '30 days'
  ) AS events_30d,
  
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'active') AS total_events,
  
  -- FREE EVENTS COUNT
  COUNT(DISTINCT e.id) FILTER (
    WHERE e.status = 'active' 
    AND e.price = 0
    AND e.start_time >= NOW()
  ) AS free_events_count,
  
  -- Hours since last event ingestion
  EXTRACT(EPOCH FROM (NOW() - MAX(e.created_at))) / 3600.0 AS hours_since_last_event,
  
  -- Average confidence
  ROUND(COALESCE(AVG(ec.final_score), 0.0)::NUMERIC, 2) AS avg_confidence_score,
  
  -- HEALTH SCORE (0-100)
  ROUND(COALESCE((
    LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 40.0
    +
    ROUND((
      COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC 
      / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC
    ) * 30.0, 2)
    +
    COALESCE(AVG(es.source_score), 0.0) * 0.3
  ), 0.0)::NUMERIC, 2) AS health_score,
  
  -- Health status
  CASE 
    WHEN ROUND(COALESCE((
      LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 40.0
      + ROUND((COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC) * 30.0, 2)
      + COALESCE(AVG(es.source_score), 0.0) * 0.3
    ), 0.0)::NUMERIC, 2) >= 80 THEN '🟢 ACTIVE'
    WHEN ROUND(COALESCE((
      LEAST(COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state != 'dead')::NUMERIC / 5.0, 1.0) * 40.0
      + ROUND((COUNT(DISTINCT es.id) FILTER (WHERE es.active AND es.source_state = 'active')::NUMERIC / NULLIF(COUNT(DISTINCT es.id), 0)::NUMERIC) * 30.0, 2)
      + COALESCE(AVG(es.source_score), 0.0) * 0.3
    ), 0.0)::NUMERIC, 2) >= 50 THEN '🟡 DEGRADED'
    WHEN COUNT(DISTINCT es.id) FILTER (WHERE es.active) = 0 THEN '🟠 STARVED'
    ELSE '🔴 RECOVERING'
  END AS health_status

FROM public.city_configs c
LEFT JOIN public.event_sources es ON es.city_id = c.city_id
LEFT JOIN public.events e ON e.city_id = c.city_id
LEFT JOIN public.event_confidence ec ON ec.event_id = e.id
WHERE c.pipeline_enabled = true
GROUP BY c.city_id, c.city_name, c.country, c.state, c.last_bootstrap_at;

-- Step 4: Recreate materialized view
CREATE MATERIALIZED VIEW public.city_health_snapshot AS
SELECT * FROM public.city_health_view;

CREATE INDEX IF NOT EXISTS idx_city_health_snapshot_health
  ON public.city_health_snapshot(health_score DESC);

CREATE INDEX IF NOT EXISTS idx_city_health_snapshot_free
  ON public.city_health_snapshot(free_events_count DESC);

-- Step 5: Grant permissions
GRANT SELECT ON public.city_health_view TO service_role, authenticated;
GRANT SELECT ON public.city_health_snapshot TO service_role, authenticated;

COMMENT ON VIEW public.city_health_view IS 'Real-time city health score with complete event metrics and free events count (source_score 0-100)';
COMMENT ON MATERIALIZED VIEW public.city_health_snapshot IS 'Cached city health metrics, refreshed hourly';
