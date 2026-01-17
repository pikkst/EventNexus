-- ============================================================================
-- AI MODEL USAGE TRACKING & COST ANALYSIS
-- ============================================================================
-- Purpose: Track every Gemini/OpenAI API call, cost, and performance
-- Usage: Insert records from Edge Functions, query via views

-- ============================================================================
-- 1. TABLE: ai_model_usage
-- ============================================================================

create table if not exists public.ai_model_usage (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.city_configs(city_id) on delete cascade,
  source_id uuid references public.event_sources(id) on delete set null,
  model_selected text not null,
  task text not null, -- 'extract_events', 'validate_event', 'translate', etc
  content_size_bytes int,
  input_tokens int,
  output_tokens int,
  estimated_cost_usd numeric(10, 6),
  actual_latency_ms int,
  success boolean default false,
  error_message text,
  retry_count int default 0,
  created_at timestamp default now()
);

-- ============================================================================
-- 2. INDEXES for Performance
-- ============================================================================

create index if not exists idx_ai_model_usage_model 
  on public.ai_model_usage(model_selected);

create index if not exists idx_ai_model_usage_city_created 
  on public.ai_model_usage(city_id, created_at desc);

create index if not exists idx_ai_model_usage_created 
  on public.ai_model_usage(created_at desc);

create index if not exists idx_ai_model_usage_task_success 
  on public.ai_model_usage(task, success);

-- ============================================================================
-- 3. VIEW: v_model_cost_breakdown
-- Shows cost per model (daily)
-- ============================================================================

create or replace view public.v_model_cost_breakdown as
select
  model_selected,
  count(*) as usage_count,
  sum(estimated_cost_usd)::numeric(10, 4) as total_cost_usd,
  round(avg(actual_latency_ms::numeric), 0)::integer as avg_latency_ms,
  round((sum(input_tokens)::numeric + sum(output_tokens)::numeric) / 1000000.0, 2) as total_tokens_m,
  round(sum(estimated_cost_usd)::numeric / count(*)::numeric, 6) as avg_cost_per_call,
  round(100.0 * sum(case when success then 1 else 0 end)::numeric / count(*)::numeric, 1) as success_rate_pct,
  date_trunc('day', created_at)::date as date
from public.ai_model_usage
group by model_selected, date_trunc('day', created_at)
order by date desc, total_cost_usd desc;

-- ============================================================================
-- 4. VIEW: v_pipeline_cost_summary
-- Daily pipeline cost overview
-- ============================================================================

create or replace view public.v_pipeline_cost_summary as
select
  date_trunc('day', created_at)::date as date,
  count(*) as total_calls,
  sum(estimated_cost_usd)::numeric(10, 4) as total_cost_usd,
  round(avg(actual_latency_ms::numeric), 0)::integer as avg_latency_ms,
  round(100.0 * sum(case when success then 1 else 0 end)::numeric / count(*)::numeric, 1) as success_rate_pct,
  sum(case when model_selected like '%flash-exp' then 1 else 0 end) as flash_exp_usage,
  sum(case when model_selected = 'gemini-2.0-flash' then 1 else 0 end) as flash_usage,
  sum(case when model_selected = 'gemini-1.5-flash' then 1 else 0 end) as pro_flash_usage,
  sum(case when model_selected = 'gemini-1.5-pro' then 1 else 0 end) as pro_usage
from public.ai_model_usage
group by date_trunc('day', created_at)
order by date desc;

-- ============================================================================
-- 5. VIEW: v_cost_savings
-- Compare actual cost vs if all calls used gemini-1.5-pro
-- ============================================================================

create or replace view public.v_cost_savings as
select
  date_trunc('day', created_at)::date as date,
  sum(estimated_cost_usd)::numeric(10, 4) as actual_cost,
  round(
    (count(*) * (50000 + 5000)::numeric / 1000000.0 * 1.25)::numeric,
    4
  ) as cost_if_all_pro,
  round(
    (count(*) * (50000 + 5000)::numeric / 1000000.0 * 1.25 - sum(estimated_cost_usd))::numeric,
    4
  ) as cost_saved,
  round(
    (1.0 - sum(estimated_cost_usd) / (count(*) * (50000 + 5000)::numeric / 1000000.0 * 1.25)) * 100,
    1
  ) as savings_percentage
from public.ai_model_usage
group by date_trunc('day', created_at)
order by date desc;

-- ============================================================================
-- 6. VIEW: v_city_ai_costs
-- Cost breakdown by city
-- ============================================================================

create or replace view public.v_city_ai_costs as
select
  c.city_id as id,
  c.city_name as name,
  c.country,
  count(amu.*) as total_calls,
  sum(amu.estimated_cost_usd)::numeric(10, 4) as total_cost_usd,
  round(avg(amu.actual_latency_ms::numeric), 0)::integer as avg_latency_ms,
  round(
    100.0 * sum(case when amu.success then 1 else 0 end)::numeric / count(*)::numeric,
    1
  ) as success_rate_pct,
  string_agg(distinct amu.model_selected, ', ' order by amu.model_selected) as models_used
from public.city_configs c
left join public.ai_model_usage amu on amu.city_id = c.city_id
group by c.city_id, c.city_name, c.country
order by total_cost_usd desc nulls last;

-- ============================================================================
-- 7. VIEW: v_timeout_analysis
-- Identify which models have timeout issues
-- ============================================================================

create or replace view public.v_timeout_analysis as
select
  model_selected,
  count(*) filter (where error_message like '%timeout%') as timeout_count,
  count(*) as total_attempts,
  round(
    100.0 * count(*) filter (where error_message like '%timeout%')::numeric / count(*)::numeric,
    2
  ) as timeout_rate_pct,
  round(avg(actual_latency_ms::numeric), 0)::integer as avg_latency_ms,
  round(avg(actual_latency_ms::numeric) filter (where error_message like '%timeout%'), 0)::integer as avg_timeout_latency_ms
from public.ai_model_usage
where created_at >= now() - interval '7 days'
group by model_selected
order by timeout_rate_pct desc;

-- ============================================================================
-- 8. VIEW: v_task_efficiency
-- Which tasks are most cost-effective
-- ============================================================================

create or replace view public.v_task_efficiency as
select
  task,
  count(*) as calls,
  round(
    avg(estimated_cost_usd)::numeric,
    6
  ) as avg_cost_per_call,
  round(avg(actual_latency_ms::numeric), 0)::integer as avg_latency_ms,
  round(
    100.0 * sum(case when success then 1 else 0 end)::numeric / count(*)::numeric,
    1
  ) as success_rate_pct,
  round((sum(input_tokens)::numeric / count(*)::numeric), 0)::integer as avg_input_tokens
from public.ai_model_usage
where created_at >= now() - interval '30 days'
group by task
order by avg_cost_per_call desc;

-- ============================================================================
-- 9. STORED FUNCTION: record_ai_call
-- Call this from Edge Functions to log LLM usage
-- ============================================================================

create or replace function public.record_ai_call(
  p_city_id uuid,
  p_source_id uuid,
  p_model_selected text,
  p_task text,
  p_content_size_bytes int,
  p_input_tokens int,
  p_output_tokens int,
  p_estimated_cost numeric,
  p_actual_latency_ms int,
  p_success boolean,
  p_error_message text default null,
  p_retry_count int default 0
)
returns uuid as $$
declare
  v_id uuid;
begin
  insert into public.ai_model_usage (
    city_id, source_id, model_selected, task,
    content_size_bytes, input_tokens, output_tokens,
    estimated_cost_usd, actual_latency_ms,
    success, error_message, retry_count
  ) values (
    p_city_id, p_source_id, p_model_selected, p_task,
    p_content_size_bytes, p_input_tokens, p_output_tokens,
    p_estimated_cost, p_actual_latency_ms,
    p_success, p_error_message, p_retry_count
  )
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql;

-- ============================================================================
-- 10. QUERY EXAMPLES
-- ============================================================================

/*
-- Daily cost summary
SELECT * FROM public.v_pipeline_cost_summary ORDER BY date DESC LIMIT 7;

-- Cost savings from smart routing
SELECT * FROM public.v_cost_savings ORDER BY date DESC LIMIT 30;

-- Which cities cost the most?
SELECT * FROM public.v_city_ai_costs LIMIT 20;

-- Model performance comparison
SELECT * FROM public.v_model_cost_breakdown WHERE date = CURRENT_DATE ORDER BY total_cost_usd DESC;

-- Timeout issues
SELECT * FROM public.v_timeout_analysis;

-- Task-based cost efficiency
SELECT * FROM public.v_task_efficiency ORDER BY avg_cost_per_call DESC;

-- This month's total spending
SELECT 
  SUM(estimated_cost_usd) as total_cost,
  COUNT(*) as total_calls,
  ROUND(AVG(estimated_cost_usd)::numeric, 6) as avg_cost_per_call
FROM public.ai_model_usage
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
*/
