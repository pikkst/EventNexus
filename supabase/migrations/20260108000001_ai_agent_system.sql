-- AI Agent System Database Schema
-- EventNexus Autonomous Event Discovery & Validation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- City configurations for multi-city scaling
CREATE TABLE IF NOT EXISTS public.city_configs (
  city_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT '{}',
  check_interval INTERVAL NOT NULL DEFAULT '24 hours',
  active BOOLEAN NOT NULL DEFAULT true,
  bootstrap_status TEXT NOT NULL DEFAULT 'pending' CHECK (bootstrap_status IN ('pending', 'discovering_sources', 'seeding_events', 'active', 'failed')),
  bootstrap_error TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  geo_bounds GEOMETRY(POLYGON, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_name, country)
);

-- Event sources per city (API, RSS, HTML, iCal)
CREATE TABLE IF NOT EXISTS public.event_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.city_configs(city_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api', 'rss', 'html', 'ical')),
  url TEXT NOT NULL,
  source_score NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (source_score BETWEEN 0 AND 1),
  active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  headers JSONB DEFAULT '{}',
  auth_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, url)
);

-- Raw fetched content (before AI parsing)
CREATE TABLE IF NOT EXISTS public.raw_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES public.event_sources(id) ON DELETE CASCADE,
  raw_content TEXT,
  raw_content_json JSONB,
  content_type TEXT CHECK (content_type IN ('html', 'json', 'xml', 'text', 'ical')),
  content_hash TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'parsed', 'failed')),
  error_message TEXT,
  UNIQUE(source_id, content_hash),
  CHECK (raw_content IS NOT NULL OR raw_content_json IS NOT NULL)
);

-- AI-parsed structured events
CREATE TABLE IF NOT EXISTS public.parsed_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_event_id UUID NOT NULL REFERENCES public.raw_events(id) ON DELETE CASCADE,
  structured_json JSONB NOT NULL,
  original_language TEXT NOT NULL,
  translations JSONB DEFAULT '{}',
  confidence_partial NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ai_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash-exp',
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validating', 'validated', 'rejected')),
  UNIQUE(raw_event_id)
);

-- Event confidence scoring breakdown
-- Note: All component scores are 0.00-1.00, final_score is 0.00-100.00 for UI presentation
CREATE TABLE IF NOT EXISTS public.event_confidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  parsed_event_id UUID REFERENCES public.parsed_events(id) ON DELETE CASCADE,
  source_score NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (source_score BETWEEN 0 AND 1),
  data_completeness NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (data_completeness BETWEEN 0 AND 1),
  time_validity NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (time_validity BETWEEN 0 AND 1),
  geo_accuracy NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (geo_accuracy BETWEEN 0 AND 1),
  semantic_validity NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (semantic_validity BETWEEN 0 AND 1),
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (final_score BETWEEN 0 AND 100),
  calculation_metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_id IS NOT NULL OR parsed_event_id IS NOT NULL)
);

-- Event versioning for change tracking
CREATE TABLE IF NOT EXISTS public.event_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  changes_json JSONB NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  change_type TEXT NOT NULL DEFAULT 'ai_update' CHECK (change_type IN ('ai_update', 'manual_edit', 'claim', 'promotion', 'cancellation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, version_number)
);

-- Human review queue for low-confidence events
CREATE TABLE IF NOT EXISTS public.review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  parsed_event_id UUID REFERENCES public.parsed_events(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  confidence_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info')),
  reviewer_id UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (event_id IS NOT NULL OR parsed_event_id IS NOT NULL)
);

-- AI Agents Registry for multi-model orchestration (must be before ai_decision_log)
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  ai_provider TEXT NOT NULL CHECK (ai_provider IN ('gemini', 'openai', 'local', 'anthropic')),
  model TEXT NOT NULL,
  temperature NUMERIC(3,2) DEFAULT 0.30 CHECK (temperature BETWEEN 0 AND 2),
  max_tokens INTEGER,
  active BOOLEAN DEFAULT true,
  cost_per_1k_tokens NUMERIC(10,6),
  description TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI decision audit log
CREATE TABLE IF NOT EXISTS public.ai_decision_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  parsed_event_id UUID REFERENCES public.parsed_events(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL,
  decision_result TEXT NOT NULL,
  reasoning JSONB NOT NULL,
  confidence_score NUMERIC(5,2),
  ai_model TEXT NOT NULL,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplication match records
CREATE TABLE IF NOT EXISTS public.event_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_a_id UUID NOT NULL,
  event_b_id UUID NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'fuzzy', 'geo_time', 'organizer')),
  similarity_score NUMERIC(3,2) NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  match_metadata JSONB DEFAULT '{}',
  resolution TEXT CHECK (resolution IN ('merged', 'kept_both', 'rejected')),
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_a_id, event_b_id)
);

-- Add AI agent columns to existing events table
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.city_configs(city_id),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'promoted', 'archived', 'cancelled')),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2) DEFAULT 0.00 CHECK (confidence_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS freshness_score NUMERIC(3,2) DEFAULT 1.00 CHECK (freshness_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'ai_agent',
  ADD COLUMN IF NOT EXISTS last_ai_update TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_language TEXT,
  ADD COLUMN IF NOT EXISTS canonical_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- Add generated geospatial column for performance optimization
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_geom geography
  GENERATED ALWAYS AS (
    CASE 
      WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL 
      THEN ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)::geography
      ELSE NULL
    END
  ) STORED;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_city_configs_active ON public.city_configs(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_event_sources_city ON public.event_sources(city_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_raw_events_status ON public.raw_events(processing_status) WHERE processing_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_parses_freshness ON public.events(freshness_score DESC) WHERE status = 'unclaimed';
CREATE INDEX IF NOT EXISTS idx_events_canonical ON public.events(canonical_event_id) WHERE canonical_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_versions_event ON public.event_versions(event_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decision_log_created ON public.ai_decision_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_decision_log_agent ON public.ai_decision_log(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agents_active ON public.ai_agents(active, ai_provider) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_parsed_events_validation ON public.parsed_events(validation_status) WHERE validation_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON public.review_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_events_city_status ON public.events(city_id, status);
CREATE INDEX IF NOT EXISTS idx_events_confidence ON public.events(confidence_score) WHERE confidence_score < 80;
CREATE INDEX IF NOT EXISTS idx_events_freshness ON public.events(freshness_score DESC) WHERE status = 'unclaimed';
CREATE INDEX IF NOT EXISTS idx_events_canonical ON public.events(canonical_event_id) WHERE canonical_event_id IS NOT NULL;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_events_fulltext ON public.events USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_parsed_events_json ON public.parsed_events USING gin(structured_json);

-- Geospatial indexes
CREATE INDEX IF NOT EXISTS idx_city_configs_geo ON public.city_configs USING gist(geo_bounds);
CREATE INDEX IF NOT EXISTS idx_events_location_geom ON public.events USING gist(location_geom) WHERE location_geom IS NOT NULL;

-- Unique constraint indexes for event_confidence to prevent duplicate calculations
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_confidence_unique_event 
  ON public.event_confidence (event_id) 
  WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_confidence_unique_parsed 
  ON public.event_confidence (parsed_event_id) 
  WHERE parsed_event_id IS NOT NULL;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-increment event version numbers
-- Auto-increment event version numbers
CREATE OR REPLACE FUNCTION increment_event_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version_number := COALESCE(
    (SELECT MAX(version_number) FROM public.event_versions WHERE event_id = NEW.event_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calculate event freshness based on discovery time and updates
CREATE OR REPLACE FUNCTION calculate_event_freshness()
RETURNS TRIGGER AS $$
BEGIN
  -- Freshness decreases over time since last update
  -- 1.0 = brand new (within 24h), decays to 0.5 after 30 days
  NEW.freshness_score := GREATEST(
    0.5,
    1.0 - (EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.last_ai_update, NEW.created_at))) / (30 * 24 * 60 * 60) * 0.5)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger city bootstrap when new city is created
CREATE OR REPLACE FUNCTION trigger_city_bootstrap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on new active city in pending status
  IF NEW.active = true AND NEW.bootstrap_status = 'pending' THEN
    -- Notify Edge Function via pg_notify channel
    PERFORM pg_notify(
      'city_bootstrap',
      json_build_object(
        'city_id', NEW.city_id,
        'city_name', NEW.city_name,
        'country', NEW.country,
        'languages', NEW.languages,
        'timezone', NEW.timezone
      )::text
    );
    
    -- Log the bootstrap initiation
    INSERT INTO public.ai_decision_log (
      decision_type,
      decision_result,
      reasoning,
      ai_model,
      created_at
    ) VALUES (
      'city_bootstrap_initiated',
      'pending',
      json_build_object(
        'city_id', NEW.city_id,
        'city_name', NEW.city_name,
        'country', NEW.country,
        'auto_triggered', true
      ),
      'bootstrap_system',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER city_configs_updated_at BEFORE UPDATE ON public.city_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER event_sources_updated_at BEFORE UPDATE ON public.event_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER review_queue_updated_at BEFORE UPDATE ON public.review_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER event_versions_increment BEFORE INSERT ON public.event_versions FOR EACH ROW EXECUTE FUNCTION increment_event_version();
CREATE TRIGGER events_freshness_update BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION calculate_event_freshness();
CREATE TRIGGER city_bootstrap_trigger AFTER INSERT ON public.city_configs FOR EACH ROW EXECUTE FUNCTION trigger_city_bootstrap();

-- RLS policies (admin only for AI system tables)
ALTER TABLE public.city_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_matches ENABLE ROW LEVEL SECURITY;

-- Admin read access
CREATE POLICY "Admins can read city configs" ON public.city_configs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read event sources" ON public.event_sources FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read raw events" ON public.raw_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read parsed events" ON public.parsed_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read AI agents" ON public.ai_agents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read event confidence" ON public.event_confidence FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read event versions" ON public.event_versions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage review queue" ON public.review_queue FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read AI decision log" ON public.ai_decision_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read event matches" ON public.event_matches FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Public can read high-quality unclaimed future events for organizer claiming
CREATE POLICY "Public can read unclaimed events" ON public.events FOR SELECT USING (
  status = 'unclaimed' 
  AND start_time > NOW() 
  AND confidence_score >= 60
  AND canonical_event_id IS NULL
);

-- Service role policies for Edge Functions
CREATE POLICY "Service role can manage all city configs" ON public.city_configs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all event sources" ON public.event_sources FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all raw events" ON public.raw_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all AI agents" ON public.ai_agents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all parsed events" ON public.parsed_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all event confidence" ON public.event_confidence FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all event versions" ON public.event_versions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all review queue" ON public.review_queue FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all AI decision log" ON public.ai_decision_log FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all event matches" ON public.event_matches FOR ALL TO service_role USING (true);

-- ========================================
-- STRATEGIC ENHANCEMENTS
-- ========================================

-- AI Cost Control & Token Economy
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  tokens_used INTEGER,
  cost_estimate NUMERIC(10,6),
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  related_parsed_event_id UUID REFERENCES public.parsed_events(id) ON DELETE SET NULL,
  operation_type TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON public.ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_agent ON public.ai_usage_log(agent_name, created_at DESC);

-- City Health Metrics for B2G & SLA monitoring
CREATE TABLE IF NOT EXISTS public.city_health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.city_configs(city_id) ON DELETE CASCADE,
  events_last_7d INTEGER DEFAULT 0,
  events_last_24h INTEGER DEFAULT 0,
  avg_confidence NUMERIC(5,2) DEFAULT 0.00,
  failed_sources INTEGER DEFAULT 0,
  active_sources INTEGER DEFAULT 0,
  freshness_score NUMERIC(5,2) DEFAULT 0.00,
  unclaimed_events INTEGER DEFAULT 0,
  claimed_events INTEGER DEFAULT 0,
  calculation_metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_health_city ON public.city_health_metrics(city_id, calculated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_city_health_latest ON public.city_health_metrics(city_id, calculated_at DESC);

-- Legal Opt-Out & Takedown Tracking for GDPR compliance
CREATE TABLE IF NOT EXISTS public.event_opt_outs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_url TEXT NOT NULL,
  event_title TEXT,
  requested_by TEXT NOT NULL,
  contact_email TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_opt_outs_status ON public.event_opt_outs(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_event_opt_outs_source ON public.event_opt_outs(source_url);
CREATE TRIGGER event_opt_outs_updated_at BEFORE UPDATE ON public.event_opt_outs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS for strategic tables
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read AI usage log" ON public.ai_usage_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read city health metrics" ON public.city_health_metrics FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can manage opt-outs" ON public.event_opt_outs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Service role can manage AI usage log" ON public.ai_usage_log FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage city health metrics" ON public.city_health_metrics FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage opt-outs" ON public.event_opt_outs FOR ALL TO service_role USING (true);

-- Initial seed data for testing
INSERT INTO public.city_configs (city_name, country, languages, timezone, geo_bounds, bootstrap_status) VALUES
  ('Tallinn', 'Estonia', ARRAY['et', 'en'], 'Europe/Tallinn', 
   ST_GeomFromText('POLYGON((24.5 59.3, 25.0 59.3, 25.0 59.5, 24.5 59.5, 24.5 59.3))', 4326), 'active'),
  ('Berlin', 'Germany', ARRAY['de', 'en'], 'Europe/Berlin',
   ST_GeomFromText('POLYGON((13.0 52.3, 13.8 52.3, 13.8 52.7, 13.0 52.7, 13.0 52.3))', 4326), 'active')
ON CONFLICT (city_name, country) DO NOTHING;

-- AI Agent Registry (multi-model orchestration strategy)
INSERT INTO public.ai_agents (name, role, ai_provider, model, temperature, max_tokens, cost_per_1k_tokens, description) VALUES
  ('city_initializer', 'City bootstrap & source discovery', 'gemini', 'gemini-2.0-flash-exp', 0.2, 2048, 0.000075, 'Discovers official event sources for new cities using web search and structured data'),
  ('parser_primary', 'HTML/RSS event extraction', 'gemini', 'gemini-2.0-flash-exp', 0.1, 4096, 0.000075, 'Primary event parser using Gemini Flash for speed and cost efficiency'),
  ('translator', 'Multi-language translation', 'gemini', 'gemini-2.0-flash-exp', 0.2, 2048, 0.000075, 'Translates events to city languages'),
  ('semantic_validator', 'Content quality validation', 'gemini', 'gemini-2.0-flash-exp', 0.3, 1024, 0.000075, 'Validates event semantics and detects spam'),
  ('deduplicator', 'Fuzzy event matching', 'local', 'llama-3.1-8b', 0.2, 512, 0.000000, 'Local LLM for cost-effective deduplication using embeddings'),
  ('review_explainer', 'Human review assistance', 'gemini', 'gemini-2.0-flash-thinking-exp', 0.4, 2048, 0.000150, 'Explains AI decisions to human reviewers')
ON CONFLICT (name) DO NOTHING;

-- City-Agent associations for city-specific AI behavior
CREATE TABLE IF NOT EXISTS public.city_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES public.city_configs(city_id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  config_override JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, agent_id, role)
);

CREATE INDEX IF NOT EXISTS idx_city_agents_city ON public.city_agents(city_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_city_agents_agent ON public.city_agents(agent_id) WHERE active = true;

-- Enable RLS for city_agents
ALTER TABLE public.city_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read city agents" ON public.city_agents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Service role can manage city agents" ON public.city_agents FOR ALL TO service_role USING (true);

-- Table comments
COMMENT ON TABLE public.city_configs IS 'City-level configuration for autonomous event discovery with bootstrap state machine';
COMMENT ON TABLE public.event_sources IS 'Public event data sources per city (APIs, RSS, HTML, iCal)';
COMMENT ON TABLE public.raw_events IS 'Raw fetched content before AI parsing. Supports HTML/JSON/XML/iCal via content_type discrimination';
COMMENT ON TABLE public.parsed_events IS 'AI-extracted structured event data';
COMMENT ON TABLE public.event_confidence IS 'Multi-factor confidence scoring (0-1 scale components, 0-100 final score for UI)';
COMMENT ON TABLE public.event_versions IS 'Event change history and versioning (auto-incremented)';
COMMENT ON TABLE public.review_queue IS 'Human review queue for low-confidence events';
COMMENT ON TABLE public.ai_decision_log IS 'Audit log of AI agent decisions with agent traceability';
COMMENT ON TABLE public.event_matches IS 'Deduplication match records (similarity 0-1 scale)';
COMMENT ON TABLE public.ai_usage_log IS 'AI token usage tracking for cost control and B2G reporting';
COMMENT ON TABLE public.city_health_metrics IS 'City-level SLA metrics and health monitoring (B2G pitch tool)';
COMMENT ON TABLE public.event_opt_outs IS 'Legal takedown requests and GDPR opt-out tracking';
COMMENT ON TABLE public.ai_agents IS 'AI agent registry for multi-model orchestration (Gemini + Local LLM strategy)';
COMMENT ON TABLE public.city_agents IS 'City-specific AI agent assignments for customized behavior (e.g., aggressive vs conservative crawling)';

-- Column comments
COMMENT ON COLUMN public.city_configs.bootstrap_status IS 'City initialization state: pending → discovering_sources → seeding_events → active';
COMMENT ON COLUMN public.events.canonical_event_id IS 'Points to the canonical version if this is a duplicate. NULL = this IS the canonical event';
COMMENT ON COLUMN public.events.freshness_score IS 'Event freshness (1.0 = new, decays over 30 days to 0.5). Auto-calculated by trigger';
COMMENT ON COLUMN public.events.confidence_score IS 'Final confidence score 0-100 for UI display';
COMMENT ON COLUMN public.event_confidence.source_score IS 'Component score 0.00-1.00 scale';
COMMENT ON COLUMN public.event_confidence.final_score IS 'Weighted final score 0.00-100.00 for UI presentation';
