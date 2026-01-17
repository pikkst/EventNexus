-- AI-Powered CRM: Client Relationship Memory & Management
-- This migration adds comprehensive CRM functionality with AI memory

-- 1. CRM Interactions Timeline (every touchpoint with client)
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.marketing_prospects(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'email_sent', 'email_received', 'email_opened', 'email_replied',
    'phone_call', 'meeting', 'demo', 'proposal_sent', 'contract_sent',
    'note', 'follow_up', 'linkedin_message', 'other'
  )),
  subject TEXT,
  content TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'unknown')),
  ai_summary TEXT, -- AI-generated summary of interaction
  metadata JSONB DEFAULT '{}'::jsonb, -- Extra data (duration, attendees, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. AI Memory Context (persistent memory about each client)
CREATE TABLE IF NOT EXISTS public.crm_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.marketing_prospects(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'preference', 'pain_point', 'goal', 'objection', 'interest',
    'decision_maker', 'timeline', 'budget', 'competitor', 'personal'
  )),
  key TEXT NOT NULL, -- e.g., "prefers_communication", "budget_range"
  value TEXT NOT NULL, -- e.g., "email", "10k-50k EUR"
  confidence FLOAT DEFAULT 1.0, -- AI confidence in this fact (0.0 - 1.0)
  source TEXT, -- Where this was learned (email, call, meeting)
  learned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiry for time-sensitive facts
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(prospect_id, memory_type, key)
);

-- 3. Email Thread Tracking (conversation continuity)
CREATE TABLE IF NOT EXISTS public.crm_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.marketing_prospects(id) ON DELETE CASCADE,
  thread_subject TEXT NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'waiting')),
  sentiment_trend TEXT, -- overall sentiment: improving, declining, stable
  ai_next_action TEXT, -- AI suggestion for next step
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Enhanced Marketing Templates with Variables
ALTER TABLE public.marketing_templates 
ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT 'EventNexus Team',
ADD COLUMN IF NOT EXISTS from_name TEXT DEFAULT 'EventNexus',
ADD COLUMN IF NOT EXISTS from_email TEXT DEFAULT 'partnerships@mail.eventnexus.eu',
ADD COLUMN IF NOT EXISTS reply_to TEXT,
ADD COLUMN IF NOT EXISTS cc TEXT,
ADD COLUMN IF NOT EXISTS bcc TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- 5. Template Variables Registry (admin can edit)
CREATE TABLE IF NOT EXISTS public.template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name TEXT NOT NULL UNIQUE, -- e.g., "admin_name", "admin_phone"
  variable_value TEXT NOT NULL,
  variable_type TEXT CHECK (variable_type IN ('text', 'email', 'phone', 'url', 'number')),
  description TEXT,
  category TEXT, -- 'company', 'personal', 'contact', 'legal'
  is_editable BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6. Insert default template variables
INSERT INTO public.template_variables (variable_name, variable_value, variable_type, description, category) VALUES
('admin_name', 'Hunter', 'text', 'Administrator name', 'personal'),
('admin_title', 'Partnership Manager', 'text', 'Administrator job title', 'personal'),
('admin_email', 'partnerships@eventnexus.eu', 'email', 'Admin email address', 'contact'),
('admin_phone', '+372 XXXX XXXX', 'phone', 'Admin phone number', 'contact'),
('company_name', 'EventNexus', 'text', 'Company name', 'company'),
('company_website', 'https://www.eventnexus.eu', 'url', 'Company website', 'company'),
('platform_description', 'AI-powered event discovery and ticketing platform', 'text', 'Short platform description', 'company'),
('support_email', 'support@eventnexus.eu', 'email', 'Support email', 'contact'),
('linkedin_url', 'https://linkedin.com/company/eventnexus', 'url', 'Company LinkedIn', 'company')
ON CONFLICT (variable_name) DO NOTHING;

-- 7. AI Conversation Context (for generating contextual responses)
CREATE TABLE IF NOT EXISTS public.crm_ai_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.marketing_prospects(id) ON DELETE CASCADE,
  context_snapshot JSONB NOT NULL, -- Full context for AI: memory, interactions, preferences
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_prospect ON public.crm_interactions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON public.crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON public.crm_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_prospect ON public.crm_ai_memory(prospect_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON public.crm_ai_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_key ON public.crm_ai_memory(key);

CREATE INDEX IF NOT EXISTS idx_threads_prospect ON public.crm_email_threads(prospect_id);
CREATE INDEX IF NOT EXISTS idx_threads_status ON public.crm_email_threads(status);

CREATE INDEX IF NOT EXISTS idx_variables_name ON public.template_variables(variable_name);
CREATE INDEX IF NOT EXISTS idx_variables_category ON public.template_variables(category);

-- RLS Policies (admin-only access)
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_context ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
DROP POLICY IF EXISTS admin_crm_interactions ON public.crm_interactions;
CREATE POLICY admin_crm_interactions ON public.crm_interactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS admin_crm_memory ON public.crm_ai_memory;
CREATE POLICY admin_crm_memory ON public.crm_ai_memory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS admin_crm_threads ON public.crm_email_threads;
CREATE POLICY admin_crm_threads ON public.crm_email_threads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS admin_template_variables ON public.template_variables;
CREATE POLICY admin_template_variables ON public.template_variables FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS admin_crm_context ON public.crm_ai_context;
CREATE POLICY admin_crm_context ON public.crm_ai_context FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Function: Get full client context for AI
CREATE OR REPLACE FUNCTION get_client_ai_context(client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Build complete context for AI
  SELECT jsonb_build_object(
    'prospect', (SELECT row_to_json(p.*) FROM marketing_prospects p WHERE p.id = client_id),
    'memory', (SELECT jsonb_agg(row_to_json(m.*)) FROM crm_ai_memory m WHERE m.prospect_id = client_id),
    'recent_interactions', (
      SELECT jsonb_agg(row_to_json(i.*) ORDER BY i.created_at DESC)
      FROM crm_interactions i
      WHERE i.prospect_id = client_id
      LIMIT 10
    ),
    'active_threads', (
      SELECT jsonb_agg(row_to_json(t.*))
      FROM crm_email_threads t
      WHERE t.prospect_id = client_id AND t.status = 'active'
    ),
    'stats', jsonb_build_object(
      'total_interactions', (SELECT COUNT(*) FROM crm_interactions WHERE prospect_id = client_id),
      'last_contact', (SELECT MAX(created_at) FROM crm_interactions WHERE prospect_id = client_id),
      'sentiment_avg', (
        SELECT AVG(CASE 
          WHEN sentiment = 'positive' THEN 1.0
          WHEN sentiment = 'neutral' THEN 0.0
          WHEN sentiment = 'negative' THEN -1.0
          ELSE 0.0
        END)
        FROM crm_interactions
        WHERE prospect_id = client_id AND sentiment IS NOT NULL
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Update AI memory from interaction
CREATE OR REPLACE FUNCTION extract_ai_memory_from_text(
  client_id UUID,
  interaction_text TEXT,
  interaction_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be called by AI to store learned facts
  -- Example: AI extracts "budget: 10k-50k" from email
  -- Implementation done via AI Edge Function
  
  -- Placeholder for future AI extraction
  RAISE NOTICE 'AI memory extraction called for prospect %', client_id;
END;
$$;

COMMENT ON TABLE public.crm_interactions IS 'Timeline of all client touchpoints';
COMMENT ON TABLE public.crm_ai_memory IS 'AI persistent memory about each client';
COMMENT ON TABLE public.crm_email_threads IS 'Email conversation threads';
COMMENT ON TABLE public.template_variables IS 'Admin-editable template variables';
COMMENT ON TABLE public.crm_ai_context IS 'Cached AI context snapshots';
