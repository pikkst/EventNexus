-- Migration: Success Stories and Press Mentions
-- Description: Create tables for admin-managed landing page content
-- Date: 2025-12-27

-- Success Stories Table
CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_role TEXT, -- e.g., "Festival Director", "Event Manager"
  event_type TEXT, -- e.g., "Music Festival", "Tech Conference"
  avatar_url TEXT,
  metrics JSONB, -- e.g., {"tickets_sold": 5000, "revenue": "€50,000", "attendee_growth": "300%"}
  quote TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Press Mentions Table
CREATE TABLE IF NOT EXISTS public.press_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_name TEXT NOT NULL,
  publication_logo_url TEXT,
  article_title TEXT NOT NULL,
  article_url TEXT NOT NULL,
  excerpt TEXT,
  published_date DATE NOT NULL,
  author_name TEXT,
  category TEXT, -- e.g., "Tech News", "Business", "Local Press"
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_success_stories_active ON public.success_stories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON public.success_stories(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_press_mentions_active ON public.press_mentions(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_press_mentions_featured ON public.press_mentions(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_press_mentions_date ON public.press_mentions(published_date DESC);

-- Enable RLS
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.press_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Success Stories
CREATE POLICY "Public can view active success stories"
  ON public.success_stories
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage success stories"
  ON public.success_stories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for Press Mentions
CREATE POLICY "Public can view active press mentions"
  ON public.press_mentions
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage press mentions"
  ON public.press_mentions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function: Get active success stories
CREATE OR REPLACE FUNCTION get_success_stories(
  p_limit INTEGER DEFAULT 6,
  p_featured_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  organizer_name TEXT,
  organizer_role TEXT,
  event_type TEXT,
  avatar_url TEXT,
  metrics JSONB,
  quote TEXT,
  is_featured BOOLEAN,
  display_order INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.organizer_name,
    s.organizer_role,
    s.event_type,
    s.avatar_url,
    s.metrics,
    s.quote,
    s.is_featured,
    s.display_order
  FROM public.success_stories s
  WHERE s.is_active = true
    AND (p_featured_only = false OR s.is_featured = true)
  ORDER BY s.display_order ASC, s.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: Get active press mentions
CREATE OR REPLACE FUNCTION get_press_mentions(
  p_limit INTEGER DEFAULT 10,
  p_featured_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  publication_name TEXT,
  publication_logo_url TEXT,
  article_title TEXT,
  article_url TEXT,
  excerpt TEXT,
  published_date DATE,
  author_name TEXT,
  category TEXT,
  is_featured BOOLEAN,
  display_order INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.publication_name,
    p.publication_logo_url,
    p.article_title,
    p.article_url,
    p.excerpt,
    p.published_date,
    p.author_name,
    p.category,
    p.is_featured,
    p.display_order
  FROM public.press_mentions p
  WHERE p.is_active = true
    AND (p_featured_only = false OR p.is_featured = true)
  ORDER BY p.display_order ASC, p.published_date DESC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.success_stories TO anon, authenticated;
GRANT SELECT ON public.press_mentions TO anon, authenticated;
GRANT ALL ON public.success_stories TO authenticated;
GRANT ALL ON public.press_mentions TO authenticated;
GRANT EXECUTE ON FUNCTION get_success_stories TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_press_mentions TO anon, authenticated;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_success_stories_updated_at
  BEFORE UPDATE ON public.success_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_press_mentions_updated_at
  BEFORE UPDATE ON public.press_mentions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
