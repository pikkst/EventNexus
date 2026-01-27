-- AI Knowledge Base with pgvector for RAG (Retrieval-Augmented Generation)
-- Stores platform documentation, FAQs, and feature descriptions for AI support

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing table if structure doesn't match
DROP TABLE IF EXISTS ai_knowledge_base CASCADE;

-- Knowledge base table
CREATE TABLE ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT, -- e.g., 'README', 'FAQ', 'DEPLOYMENT_READY', 'pricing', 'features'
  category TEXT, -- e.g., 'platform', 'pricing', 'features', 'troubleshooting', 'onboarding'
  priority INTEGER DEFAULT 0, -- Higher priority items surface first in RAG
  embedding vector(768), -- Gemini embedding dimension (adjust if using different model)
  metadata JSONB DEFAULT '{}', -- Flexible metadata storage
  is_active BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_tags ON ai_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_source ON ai_knowledge_base(source);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_active ON ai_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_priority ON ai_knowledge_base(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_embedding ON ai_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS Policies (read-only for most users)
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Public read access to active knowledge base entries
CREATE POLICY "Anyone can read active knowledge"
  ON ai_knowledge_base FOR SELECT
  USING (is_active = TRUE);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage knowledge base"
  ON ai_knowledge_base FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Function for semantic search with cosine similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  body text,
  tags text[],
  source text,
  category text,
  priority integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.body,
    kb.tags,
    kb.source,
    kb.category,
    kb.priority,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM ai_knowledge_base kb
  WHERE kb.is_active = TRUE
    AND (filter_category IS NULL OR kb.category = filter_category)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY 
    kb.priority DESC,
    similarity DESC
  LIMIT match_count;
END;
$$;

-- Seed initial knowledge base entries
INSERT INTO ai_knowledge_base (title, body, tags, source, category, priority) VALUES
  (
    'EventNexus Platform Overview',
    'EventNexus is a web-based event discovery and ticketing platform at www.eventnexus.eu. Key features: map-first discovery with PostGIS geospatial search, Stripe payment processing, instant QR code tickets, multi-language support with AI translation, and zero upfront listing costs for event organizers.',
    ARRAY['platform', 'overview', 'features'],
    'core',
    'platform',
    100
  ),
  (
    'Subscription Tiers',
    'EventNexus offers 4 tiers: FREE (50 AI credits/month, 3 events max), PRO (€10/month, unlimited AI tools, 20 events), PREMIUM (€25/month, custom branding, 100 events, priority support), ENTERPRISE (€100/month, white-label, unlimited events, dedicated account manager).',
    ARRAY['pricing', 'subscription', 'tiers'],
    'pricing',
    'pricing',
    90
  ),
  (
    'AI Tools Available',
    'AI-powered features include: event description generation, marketing tagline creation, multi-language translation (60+ languages), ad campaign generation, poster design, and social media content creation. Free tier users pay with AI credits; paid tiers get unlimited AI usage.',
    ARRAY['ai', 'features', 'credits'],
    'features',
    'features',
    85
  ),
  (
    'How to Create an Event',
    'Navigate to /create when logged in. Fill in event details (name, date, location on map, description, category). Upload cover image. Set ticket types and pricing. Choose visibility (public/private). Publish to go live on the platform.',
    ARRAY['organizer', 'create event', 'guide'],
    'guide',
    'onboarding',
    80
  ),
  (
    'Payment and Payout Information',
    'Organizers receive payouts via Stripe Connect 2 days after event completion. First payout includes mandatory 7-14 day Stripe waiting period. Platform takes no upfront fees; only Stripe processing fees apply. Check payout status in Stripe Dashboard.',
    ARRAY['payments', 'stripe', 'payout'],
    'faq',
    'pricing',
    75
  ),
  (
    'Ticket Types and QR Codes',
    'Events can have multiple ticket types (Standard, VIP, Early Bird) with different pricing. After purchase, buyers receive instant QR code tickets via email and in their profile (/profile). Organizers scan tickets using /scanner endpoint with mobile camera.',
    ARRAY['tickets', 'qr code', 'scanner'],
    'features',
    'features',
    70
  ),
  (
    'Multi-language Support',
    'Platform UI supports 9 languages (EN, ET, FI, SV, DE, FR, ES, RU, PL). Event content can be auto-translated to 60+ languages via Gemini AI. Users see events in their preferred language based on browser settings or manual selection.',
    ARRAY['language', 'translation', 'international'],
    'features',
    'features',
    65
  ),
  (
    'Refund Policy',
    'Refund policies are set by individual organizers. Standard policy allows full refund up to 24 hours before event start. Check event detail page for specific terms. Request refunds via the ticket view page.',
    ARRAY['refund', 'policy', 'tickets'],
    'faq',
    'troubleshooting',
    60
  )
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON ai_knowledge_base TO anon, authenticated;
GRANT ALL ON ai_knowledge_base TO authenticated;

-- Comments
COMMENT ON TABLE ai_knowledge_base IS 'AI knowledge base with embeddings for RAG-powered support';
COMMENT ON COLUMN ai_knowledge_base.embedding IS 'Vector embedding for semantic search (Gemini embeddings, 768 dimensions)';
COMMENT ON FUNCTION search_knowledge_base IS 'Semantic search function using cosine similarity on embeddings';
