-- AI Knowledge Base System for Marketing Agent
-- Provides real-time, accurate, GDPR-compliant platform data to AI agents

-- Platform knowledge base (public facts about EventNexus)
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'platform_overview', 
    'features', 
    'pricing', 
    'technology', 
    'security_privacy', 
    'legal_compliance', 
    'target_audience',
    'competitive_advantages',
    'integrations',
    'roadmap'
  )),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  is_public BOOLEAN DEFAULT true, -- Can be shared with prospects
  priority INTEGER DEFAULT 0, -- Higher priority = more relevant
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform changelog (feature updates, releases)
CREATE TABLE IF NOT EXISTS public.ai_platform_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  release_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('feature', 'improvement', 'bugfix', 'security', 'breaking_change')),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time platform statistics (for AI context)
CREATE TABLE IF NOT EXISTS public.ai_platform_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key TEXT UNIQUE NOT NULL,
  stat_value TEXT NOT NULL,
  stat_type TEXT CHECK (stat_type IN ('count', 'percentage', 'currency', 'text', 'trend')),
  is_public BOOLEAN DEFAULT true, -- Can be shared externally
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Privacy-protected data (NEVER share with AI/prospects)
CREATE TABLE IF NOT EXISTS public.ai_privacy_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  regex_pattern TEXT, -- Regex to detect and block
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI conversation context logs (for improvement)
CREATE TABLE IF NOT EXISTS public.ai_conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.marketing_prospects(id),
  conversation_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used JSONB DEFAULT '{}'::jsonb, -- What data was provided to AI
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON public.ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_language ON public.ai_knowledge_base(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_public ON public.ai_knowledge_base(is_public);
CREATE INDEX IF NOT EXISTS idx_changelog_date ON public.ai_platform_changelog(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_stats_key ON public.ai_platform_stats_cache(stat_key);
CREATE INDEX IF NOT EXISTS idx_conversation_prospect ON public.ai_conversation_logs(prospect_id);

-- RLS Policies
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_platform_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_platform_stats_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_privacy_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "Admin full access to knowledge base" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "Admin full access to changelog" ON public.ai_platform_changelog;
DROP POLICY IF EXISTS "Admin full access to stats cache" ON public.ai_platform_stats_cache;
DROP POLICY IF EXISTS "Admin full access to privacy blacklist" ON public.ai_privacy_blacklist;
DROP POLICY IF EXISTS "Admin full access to conversation logs" ON public.ai_conversation_logs;

-- Admin full access
CREATE POLICY "Admin full access to knowledge base" ON public.ai_knowledge_base FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin full access to changelog" ON public.ai_platform_changelog FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin full access to stats cache" ON public.ai_platform_stats_cache FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin full access to privacy blacklist" ON public.ai_privacy_blacklist FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin full access to conversation logs" ON public.ai_conversation_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Function to refresh platform stats cache
CREATE OR REPLACE FUNCTION refresh_ai_platform_stats()
RETURNS void AS $$
BEGIN
  -- Total users (public count only)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'total_users', COUNT(*)::TEXT, 'count', true FROM public.users
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Total events (active events, matching landing page)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'total_events', COUNT(*)::TEXT, 'count', true FROM public.events WHERE status = 'active'
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Events discovered in last 24 hours (matching landing page "This 24h" metric)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'events_last_24h', COUNT(*)::TEXT, 'count', true 
  FROM public.events 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Active organizers (from active events)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'active_organizers', COUNT(DISTINCT organizer_id)::TEXT, 'count', true FROM public.events WHERE status = 'active'
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Active cities (from city_configs, matching landing page)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'active_cities', COUNT(*)::TEXT, 'count', true FROM public.city_configs WHERE active = true
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Free events count (matching landing page "Zero Cost" metric)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'free_events_active', COUNT(*)::TEXT, 'count', true 
  FROM public.events 
  WHERE price = 0 AND status = 'active'
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Total tickets sold (public aggregate, not individual)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'total_tickets_sold', COUNT(*)::TEXT, 'count', true FROM public.tickets WHERE status = 'valid'
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Platform phase
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  VALUES ('platform_phase', 'Beta Launch', 'text', true)
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Growth trend (last 7 days vs previous 7 days, using active events)
  WITH recent_week AS (
    SELECT COUNT(*) as recent_count FROM public.events 
    WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'active'
  ),
  previous_week AS (
    SELECT COUNT(*) as prev_count FROM public.events 
    WHERE created_at >= NOW() - INTERVAL '14 days' 
      AND created_at < NOW() - INTERVAL '7 days' 
      AND status = 'active'
  )
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public, metadata)
  SELECT 
    'event_creation_trend',
    CASE 
      WHEN prev_count = 0 AND recent_count = 0 THEN 'new_platform'
      WHEN recent_count > prev_count THEN 'growing'
      WHEN recent_count < prev_count THEN 'declining'
      ELSE 'stable'
    END,
    'trend',
    true,
    jsonb_build_object(
      'recent_week', recent_count,
      'previous_week', prev_count,
      'growth_percentage', 
      CASE 
        WHEN prev_count > 0 THEN ROUND(((recent_count::numeric - prev_count::numeric) / prev_count::numeric * 100)::numeric, 1)
        ELSE 0
      END
    )
  FROM recent_week, previous_week
  ON CONFLICT (stat_key) DO UPDATE 
  SET stat_value = EXCLUDED.stat_value, metadata = EXCLUDED.metadata, last_updated = NOW();

  -- Supported languages count
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  VALUES ('supported_languages', '50+', 'text', true)
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();

  -- Ticket fee percentage (extract text from jsonb and append %)
  INSERT INTO public.ai_platform_stats_cache (stat_key, stat_value, stat_type, is_public)
  SELECT 'ticket_fee_percentage', (value#>>'{}') || '%', 'percentage', true 
  FROM public.system_config WHERE key = 'global_ticket_fee'
  ON CONFLICT (stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value, last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert privacy blacklist (data types NEVER to share)
INSERT INTO public.ai_privacy_blacklist (data_type, description, regex_pattern) VALUES
('user_email', 'Individual user email addresses', '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
('user_phone', 'Phone numbers', '\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}'),
('user_address', 'Physical addresses of users', NULL),
('payment_info', 'Credit card, bank account details', NULL),
('user_id', 'Internal user IDs (UUIDs)', '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'),
('session_token', 'Authentication tokens', NULL),
('api_keys', 'Secret API keys', NULL),
('database_credentials', 'Database connection strings', NULL),
('internal_revenue', 'Exact revenue numbers (use ranges only)', NULL),
('user_passwords', 'Password hashes or plaintext', NULL)
ON CONFLICT (data_type) DO NOTHING;

-- Insert initial knowledge base (public facts about EventNexus)
INSERT INTO public.ai_knowledge_base (category, question, answer, language, is_public, priority) VALUES
-- Platform Overview
('platform_overview', 'What is EventNexus?', 'EventNexus is Estonia''s fastest-growing event discovery and ticketing platform. We use AI-powered technology to help event organizers reach audiences in 50+ languages while providing attendees with a seamless experience to discover and book events across the Baltics and beyond. The platform currently serves over 1,100 active cities worldwide with 700+ new events discovered daily.', 'en', true, 10),
('platform_overview', 'When was EventNexus founded?', 'EventNexus is currently in Beta Launch phase (2025-2026), rapidly growing our user base and feature set based on real feedback from event organizers. The platform is experiencing strong growth with hundreds of events added daily.', 'en', true, 5),
('platform_overview', 'Where is EventNexus based?', 'EventNexus is based in Estonia, serving the Baltic region (Estonia, Latvia, Lithuania) and expanding across Northern Europe. The platform has grown to serve over 1,100 active cities worldwide.', 'en', true, 5),
('platform_overview', 'How many events are on EventNexus?', 'EventNexus currently features hundreds of active events across 1,100+ cities worldwide, with 700+ new events discovered every 24 hours. The platform includes a mix of paid and free events, with over 1,600 free events available at any time.', 'en', true, 9),

-- Features
('features', 'What are the main features?', 'EventNexus offers: 1) AI-powered multilingual promotion (50+ languages), 2) Smart QR code ticketing with fraud prevention, 3) Real-time analytics and audience insights, 4) Zero upfront costs (only 2.5% per ticket sold), 5) Integrated payment processing, 6) Social features (communities, achievements, gamification), 7) Mobile apps (iOS & Android), 8) Marketing automation tools.', 'en', true, 10),
('features', 'Do you support multiple languages?', 'Yes! EventNexus automatically translates event descriptions into 50+ languages using advanced AI, making events accessible to international audiences without manual translation work.', 'en', true, 9),
('features', 'What ticketing features do you offer?', 'Our smart ticketing system includes: QR code tickets, automatic validation, fraud detection, ticket transfers, refund management, capacity tracking, and real-time attendance monitoring.', 'en', true, 8),

-- Pricing
('pricing', 'How much does EventNexus cost?', 'EventNexus operates on a success-based model with ZERO upfront costs. We charge only 2.5% per ticket sold. For example, on a €50 ticket, our fee is just €1.25. Organizers keep 97.5% of ticket revenue.', 'en', true, 10),
('pricing', 'Are there setup fees or monthly costs?', 'No! EventNexus has zero setup fees, zero monthly subscriptions, and zero hidden costs. You only pay when you successfully sell tickets (2.5% per ticket).', 'en', true, 9),
('pricing', 'What subscription tiers do you offer?', 'We offer three tiers: Free (basic features), Pro (€29/month with advanced analytics and priority support), and Enterprise (custom pricing for large organizations with dedicated account management).', 'en', true, 7),

-- Technology
('technology', 'What technology does EventNexus use?', 'EventNexus is built with cutting-edge technology: React 19 frontend, Supabase (PostgreSQL with PostGIS) for real-time data, Google Gemini AI for content generation, Stripe for payments, and serverless Edge Functions for scalability.', 'en', true, 6),
('technology', 'Is EventNexus secure?', 'Absolutely. We use bank-level encryption (TLS/SSL), PCI-DSS compliant payment processing via Stripe, QR code fraud prevention, and regular security audits. All data is stored in EU-based servers complying with GDPR.', 'en', true, 9),

-- Legal & Compliance
('legal_compliance', 'Is EventNexus GDPR compliant?', 'Yes, EventNexus is fully GDPR compliant. We store data in EU servers, provide data portability, honor deletion requests, obtain explicit consent, and maintain transparent privacy policies. We never share personal data with third parties without consent.', 'en', true, 10),
('legal_compliance', 'What payment methods do you support?', 'We support all major payment methods via Stripe: credit/debit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and SEPA bank transfers for EU customers.', 'en', true, 7),

-- Target Audience
('target_audience', 'Who uses EventNexus?', 'EventNexus serves three main audiences: 1) Event Organizers (concerts, conferences, corporate events, festivals), 2) Attendees (discovering and booking events), 3) Venues (managing their event calendar and capacity).', 'en', true, 8),
('target_audience', 'What types of events work best on EventNexus?', 'EventNexus works for all event types: music concerts, conferences, corporate events, theater performances, festivals, workshops, sports events, cultural exhibitions, and community gatherings.', 'en', true, 7),

-- Competitive Advantages
('competitive_advantages', 'How is EventNexus different from Eventbrite?', 'EventNexus offers: 1) Lower fees (2.5% vs 3.5-5%), 2) AI-powered multilingual promotion (50+ languages), 3) Focus on Baltic/Nordic markets, 4) Better mobile experience, 5) Gamification & social features, 6) Real-time analytics included free.', 'en', true, 9),
('competitive_advantages', 'Why choose EventNexus over competitors?', 'EventNexus combines the best of modern technology with local market expertise. We offer lower fees, AI-powered tools, multilingual support, and personalized customer service - all designed specifically for the Baltic and Northern European markets.', 'en', true, 8)

ON CONFLICT DO NOTHING;

-- Insert recent changelog entries
INSERT INTO public.ai_platform_changelog (version, release_date, title, description, category, is_public) VALUES
('1.0.0-beta', '2025-12-15', 'Beta Launch', 'EventNexus platform launched in public beta with core ticketing, discovery, and payment features.', 'feature', true),
('1.1.0', '2026-01-05', 'AI Translation System', 'Added automatic event translation to 50+ languages using Google Gemini AI.', 'feature', true),
('1.2.0', '2026-01-10', 'Social Features', 'Launched Communities, Achievements, and Gamification system to increase user engagement.', 'feature', true),
('1.3.0', '2026-01-15', 'Marketing Automation', 'Added AI-powered email campaign generation and B2B outreach tools for organizers.', 'feature', true),
('1.3.1', '2026-01-17', 'Newsletter Management', 'Added CSV import/export for newsletter subscribers in Admin panel.', 'improvement', true)
ON CONFLICT DO NOTHING;

-- Refresh stats on insert (initial data)
SELECT refresh_ai_platform_stats();

COMMENT ON TABLE public.ai_knowledge_base IS 'Structured knowledge base for AI marketing agent - only accurate, approved information';
COMMENT ON TABLE public.ai_platform_changelog IS 'Platform feature updates and releases - keeps AI aware of new capabilities';
COMMENT ON TABLE public.ai_platform_stats_cache IS 'Real-time anonymized platform statistics safe to share externally';
COMMENT ON TABLE public.ai_privacy_blacklist IS 'Data types that must NEVER be shared by AI agent - GDPR protection';
COMMENT ON TABLE public.ai_conversation_logs IS 'AI conversation history for improvement and compliance auditing';
