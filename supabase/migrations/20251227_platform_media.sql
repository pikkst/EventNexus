-- Migration: Platform Media
-- Description: Create table for managing platform media (videos, demos, etc.)
-- Date: 2025-12-27

-- Platform Media Table
CREATE TABLE IF NOT EXISTS public.platform_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type TEXT NOT NULL, -- 'walkthrough_video', 'demo_video', 'tutorial', etc.
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT, -- YouTube, Vimeo, or direct video URL
  thumbnail_url TEXT,
  duration TEXT, -- e.g., "3:45"
  is_active BOOLEAN DEFAULT false, -- Show on landing page or not
  display_location TEXT DEFAULT 'landing_demo', -- where to display: 'landing_demo', 'help_center', etc.
  display_order INTEGER DEFAULT 0,
  metadata JSONB, -- Additional info like resolution, format, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_media_active ON public.platform_media(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_platform_media_type ON public.platform_media(media_type, is_active);
CREATE INDEX IF NOT EXISTS idx_platform_media_location ON public.platform_media(display_location, is_active);

-- Enable RLS
ALTER TABLE public.platform_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view active platform media"
  ON public.platform_media
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage platform media"
  ON public.platform_media
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

-- Function: Get active platform media by location
CREATE OR REPLACE FUNCTION get_platform_media(
  p_location TEXT DEFAULT 'landing_demo',
  p_media_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  media_type TEXT,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  is_active BOOLEAN,
  display_location TEXT,
  display_order INTEGER,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.media_type,
    m.title,
    m.description,
    m.video_url,
    m.thumbnail_url,
    m.duration,
    m.is_active,
    m.display_location,
    m.display_order,
    m.metadata
  FROM public.platform_media m
  WHERE m.is_active = true
    AND m.display_location = p_location
    AND (p_media_type IS NULL OR m.media_type = p_media_type)
  ORDER BY m.display_order ASC, m.created_at DESC;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.platform_media TO anon, authenticated;
GRANT ALL ON public.platform_media TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_media TO anon, authenticated;

-- Trigger for updated_at
CREATE TRIGGER update_platform_media_updated_at
  BEFORE UPDATE ON public.platform_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
