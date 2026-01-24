-- Add blog posts to SEO indexing and sitemap generation

-- Add blog_posts to AI search indexing
CREATE OR REPLACE FUNCTION public.get_searchable_blog_posts()
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  slug TEXT,
  category TEXT,
  tags TEXT[],
  author_name TEXT,
  published_at TIMESTAMPTZ,
  url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title->>'en' AS title,
    bp.content->>'en' AS content,
    bp.excerpt->>'en' AS excerpt,
    bp.slug,
    bp.category,
    bp.tags,
    u.name AS author_name,
    bp.published_at,
    'https://www.eventnexus.eu/blog/' || bp.slug AS url
  FROM public.blog_posts bp
  JOIN public.users u ON u.id = bp.author_id
  WHERE bp.status = 'published'
    AND bp.published_at <= NOW()
  ORDER BY bp.published_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Full-text search index for blog posts
CREATE INDEX idx_blog_posts_fts_en ON public.blog_posts 
  USING GIN(to_tsvector('english', 
    COALESCE(title->>'en', '') || ' ' || 
    COALESCE(content->>'en', '') || ' ' || 
    COALESCE(excerpt->>'en', '')
  ));

CREATE INDEX idx_blog_posts_fts_et ON public.blog_posts 
  USING GIN(to_tsvector('simple', 
    COALESCE(title->>'et', '') || ' ' || 
    COALESCE(content->>'et', '') || ' ' || 
    COALESCE(excerpt->>'et', '')
  ));

CREATE INDEX idx_blog_posts_fts_ru ON public.blog_posts 
  USING GIN(to_tsvector('russian', 
    COALESCE(title->>'ru', '') || ' ' || 
    COALESCE(content->>'ru', '') || ' ' || 
    COALESCE(excerpt->>'ru', '')
  ));

-- Search blog posts by query
CREATE OR REPLACE FUNCTION public.search_blog_posts(
  p_query TEXT,
  p_language TEXT DEFAULT 'en',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title JSONB,
  slug TEXT,
  excerpt JSONB,
  cover_image_url TEXT,
  author_id UUID,
  author_name TEXT,
  category TEXT,
  tags TEXT[],
  published_at TIMESTAMPTZ,
  rank REAL
) AS $$
DECLARE
  v_tsconfig REGCONFIG;
BEGIN
  -- Select text search config based on language
  v_tsconfig := CASE p_language
    WHEN 'et' THEN 'simple'
    WHEN 'ru' THEN 'russian'
    ELSE 'english'
  END;

  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.cover_image_url,
    bp.author_id,
    u.name AS author_name,
    bp.category,
    bp.tags,
    bp.published_at,
    ts_rank(
      to_tsvector(v_tsconfig, 
        COALESCE(bp.title->>p_language, '') || ' ' || 
        COALESCE(bp.content->>p_language, '') || ' ' || 
        COALESCE(bp.excerpt->>p_language, '')
      ),
      plainto_tsquery(v_tsconfig, p_query)
    ) AS rank
  FROM public.blog_posts bp
  JOIN public.users u ON u.id = bp.author_id
  WHERE bp.status = 'published'
    AND bp.published_at <= NOW()
    AND to_tsvector(v_tsconfig, 
      COALESCE(bp.title->>p_language, '') || ' ' || 
      COALESCE(bp.content->>p_language, '') || ' ' || 
      COALESCE(bp.excerpt->>p_language, '')
    ) @@ plainto_tsquery(v_tsconfig, p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_searchable_blog_posts IS 'Returns all published blog posts for SEO indexing and sitemap generation';
COMMENT ON FUNCTION public.search_blog_posts IS 'Full-text search across blog posts with multilingual support';
