-- Update city_health_view to include last_bootstrap_at
-- Must DROP first because we're changing column order
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
GROUP BY c.city_id, c.city_name, c.country, c.state, c.last_bootstrap_at;
