-- Blogging System for EventNexus
-- Admins can post updates, users can create posts, comment, like, share, follow
-- SEO-optimized for Google and AI search engines

-- =============================================================================
-- DROP EXISTING TABLES (clean slate)
-- =============================================================================
DROP TABLE IF EXISTS public.blog_post_shares CASCADE;
DROP TABLE IF EXISTS public.blog_post_likes CASCADE;
DROP TABLE IF EXISTS public.blog_comments CASCADE;
DROP TABLE IF EXISTS public.blog_follows CASCADE;
DROP TABLE IF EXISTS public.blog_posts CASCADE;

-- =============================================================================
-- BLOG POSTS TABLE
-- =============================================================================
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Post type (admin updates vs user posts)
  post_type TEXT NOT NULL DEFAULT 'user_post', -- admin_update, user_post, announcement
  
  -- Content (multilingual)
  title JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  slug TEXT NOT NULL UNIQUE, -- SEO-friendly URL slug
  content JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}', -- Rich text/markdown
  excerpt JSONB DEFAULT '{"en": "", "et": "", "ru": ""}', -- Short description for previews
  
  -- SEO metadata
  meta_title JSONB DEFAULT '{"en": "", "et": "", "ru": ""}',
  meta_description JSONB DEFAULT '{"en": "", "et": "", "ru": ""}',
  meta_keywords TEXT[], -- keywords for SEO
  canonical_url TEXT,
  
  -- Media
  cover_image_url TEXT,
  featured_image_url TEXT,
  gallery_images TEXT[], -- array of image URLs
  
  -- Categorization
  category TEXT, -- updates, tutorials, news, community, events
  tags TEXT[], -- array of tags
  
  -- Publishing
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ, -- for scheduled posts
  
  -- Engagement metrics (denormalized for performance)
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- SEO metrics
  avg_read_time_seconds INTEGER, -- estimated reading time
  
  -- Settings
  allow_comments BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE, -- pinned posts appear at top
  is_featured BOOLEAN DEFAULT FALSE, -- featured in highlights
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and SEO
CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status) WHERE status = 'published';
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category) WHERE status = 'published';
CREATE INDEX idx_blog_posts_tags ON public.blog_posts USING GIN(tags);
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(is_featured) WHERE is_featured = TRUE AND status = 'published';
CREATE INDEX idx_blog_posts_pinned ON public.blog_posts(is_pinned) WHERE is_pinned = TRUE AND status = 'published';
CREATE INDEX idx_blog_posts_type ON public.blog_posts(post_type) WHERE status = 'published';
CREATE INDEX idx_blog_posts_search ON public.blog_posts USING GIN(to_tsvector('english', COALESCE(title->>'en', '') || ' ' || COALESCE(content->>'en', '')));

-- =============================================================================
-- BLOG FOLLOWS TABLE (follow authors)
-- =============================================================================
CREATE TABLE public.blog_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(follower_id, following_user_id),
  CHECK (follower_id != following_user_id) -- can't follow yourself
);

CREATE INDEX idx_blog_follows_follower ON public.blog_follows(follower_id);
CREATE INDEX idx_blog_follows_following ON public.blog_follows(following_user_id);

-- =============================================================================
-- BLOG COMMENTS TABLE
-- =============================================================================
CREATE TABLE public.blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE, -- for nested replies
  
  -- Content
  content TEXT NOT NULL,
  
  -- Engagement
  like_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_comments_post ON public.blog_comments(post_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_blog_comments_author ON public.blog_comments(author_id);
CREATE INDEX idx_blog_comments_parent ON public.blog_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_blog_comments_created ON public.blog_comments(created_at DESC);

-- =============================================================================
-- BLOG LIKES TABLE
-- =============================================================================
CREATE TABLE public.blog_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_blog_post_likes_post ON public.blog_post_likes(post_id);
CREATE INDEX idx_blog_post_likes_user ON public.blog_post_likes(user_id);

-- =============================================================================
-- BLOG SHARES TABLE
-- =============================================================================
CREATE TABLE public.blog_post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for anonymous shares
  
  -- Share tracking
  share_platform TEXT, -- twitter, facebook, linkedin, email, copy_link
  share_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_post_shares_post ON public.blog_post_shares(post_id);
CREATE INDEX idx_blog_post_shares_user ON public.blog_post_shares(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_shares ENABLE ROW LEVEL SECURITY;

-- Blog Posts Policies
CREATE POLICY "Anyone can view published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

CREATE POLICY "Authors can view their own posts"
  ON public.blog_posts FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all posts"
  ON public.blog_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND (
      post_type = 'user_post'
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );

CREATE POLICY "Authors can update their own posts"
  ON public.blog_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can update any post"
  ON public.blog_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Authors can delete their own posts"
  ON public.blog_posts FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any post"
  ON public.blog_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Blog Follows Policies
CREATE POLICY "Anyone can view follows"
  ON public.blog_follows FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can follow others"
  ON public.blog_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.blog_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Blog Comments Policies
CREATE POLICY "Anyone can view non-deleted comments"
  ON public.blog_comments FOR SELECT
  USING (is_deleted = FALSE);

CREATE POLICY "Authors can view their deleted comments"
  ON public.blog_comments FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Users can create comments on posts that allow comments"
  ON public.blog_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE blog_posts.id = post_id
      AND blog_posts.allow_comments = TRUE
      AND blog_posts.status = 'published'
    )
  );

CREATE POLICY "Authors can update their own comments"
  ON public.blog_comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own comments"
  ON public.blog_comments FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete any comment"
  ON public.blog_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Blog Likes Policies
CREATE POLICY "Anyone can view likes"
  ON public.blog_post_likes FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can like posts"
  ON public.blog_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.blog_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Blog Shares Policies
CREATE POLICY "Anyone can view share counts"
  ON public.blog_post_shares FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can record shares"
  ON public.blog_post_shares FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- =============================================================================
-- TRIGGERS FOR DENORMALIZED COUNTS
-- =============================================================================

-- Update like_count on blog_posts
CREATE OR REPLACE FUNCTION update_blog_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts
    SET like_count = like_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_posts
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_blog_post_like_count
AFTER INSERT OR DELETE ON public.blog_post_likes
FOR EACH ROW EXECUTE FUNCTION update_blog_post_like_count();

-- Update comment_count on blog_posts
CREATE OR REPLACE FUNCTION update_blog_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts
    SET comment_count = comment_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_blog_post_comment_count
AFTER INSERT OR DELETE ON public.blog_comments
FOR EACH ROW EXECUTE FUNCTION update_blog_post_comment_count();

-- Update share_count on blog_posts
CREATE OR REPLACE FUNCTION update_blog_post_share_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.blog_posts
  SET share_count = share_count + 1,
      last_activity_at = NOW()
  WHERE id = NEW.post_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_blog_post_share_count
AFTER INSERT ON public.blog_post_shares
FOR EACH ROW EXECUTE FUNCTION update_blog_post_share_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION update_blog_updated_at();

CREATE TRIGGER trigger_blog_comments_updated_at
BEFORE UPDATE ON public.blog_comments
FOR EACH ROW EXECUTE FUNCTION update_blog_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Generate unique slug from title
CREATE OR REPLACE FUNCTION public.generate_blog_slug(p_title TEXT)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_counter INTEGER := 0;
  v_final_slug TEXT;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  v_final_slug := v_slug;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_slug || '-' || v_counter;
  END LOOP;
  
  RETURN v_final_slug;
END;
$$ LANGUAGE plpgsql;

-- Get blog post with engagement data
CREATE OR REPLACE FUNCTION public.get_blog_post_with_engagement(p_post_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  post JSONB,
  author JSONB,
  is_liked BOOLEAN,
  is_following_author BOOLEAN,
  follower_count BIGINT,
  author_post_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    row_to_json(bp.*)::JSONB AS post,
    jsonb_build_object(
      'id', u.id,
      'full_name', u.full_name,
      'avatar_url', u.avatar_url,
      'role', u.role
    ) AS author,
    EXISTS (
      SELECT 1 FROM public.blog_post_likes
      WHERE post_id = p_post_id AND user_id = p_user_id
    ) AS is_liked,
    EXISTS (
      SELECT 1 FROM public.blog_follows
      WHERE follower_id = p_user_id AND following_user_id = bp.author_id
    ) AS is_following_author,
    (SELECT COUNT(*) FROM public.blog_follows WHERE following_user_id = bp.author_id) AS follower_count,
    (SELECT COUNT(*) FROM public.blog_posts WHERE author_id = bp.author_id AND status = 'published') AS author_post_count
  FROM public.blog_posts bp
  JOIN public.users u ON u.id = bp.author_id
  WHERE bp.id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get trending posts (based on recent engagement)
CREATE OR REPLACE FUNCTION public.get_trending_blog_posts(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title JSONB,
  slug TEXT,
  excerpt JSONB,
  cover_image_url TEXT,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  category TEXT,
  tags TEXT[],
  published_at TIMESTAMPTZ,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  trending_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.cover_image_url,
    bp.author_id,
    u.full_name AS author_name,
    u.avatar_url AS author_avatar,
    bp.category,
    bp.tags,
    bp.published_at,
    bp.view_count,
    bp.like_count,
    bp.comment_count,
    bp.share_count,
    -- Trending score: weighted by recency and engagement
    (
      bp.like_count * 3 +
      bp.comment_count * 5 +
      bp.share_count * 10 +
      bp.view_count * 0.1 +
      (EXTRACT(EPOCH FROM NOW() - bp.published_at) / 3600)::NUMERIC * -0.5
    ) AS trending_score
  FROM public.blog_posts bp
  JOIN public.users u ON u.id = bp.author_id
  WHERE bp.status = 'published'
    AND bp.published_at <= NOW()
    AND bp.published_at > NOW() - INTERVAL '30 days' -- last 30 days
  ORDER BY trending_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get posts from followed authors (feed)
CREATE OR REPLACE FUNCTION public.get_following_feed(p_user_id UUID, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  title JSONB,
  slug TEXT,
  excerpt JSONB,
  cover_image_url TEXT,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  category TEXT,
  tags TEXT[],
  published_at TIMESTAMPTZ,
  like_count INTEGER,
  comment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.cover_image_url,
    bp.author_id,
    u.full_name AS author_name,
    u.avatar_url AS author_avatar,
    bp.category,
    bp.tags,
    bp.published_at,
    bp.like_count,
    bp.comment_count
  FROM public.blog_posts bp
  JOIN public.users u ON u.id = bp.author_id
  WHERE bp.author_id IN (
    SELECT following_user_id FROM public.blog_follows
    WHERE follower_id = p_user_id
  )
  AND bp.status = 'published'
  AND bp.published_at <= NOW()
  ORDER BY bp.published_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment view count
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin updates (for platform announcements)
CREATE OR REPLACE FUNCTION public.get_admin_updates(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title JSONB,
  slug TEXT,
  excerpt JSONB,
  content JSONB,
  cover_image_url TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  is_pinned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.content,
    bp.cover_image_url,
    bp.category,
    bp.published_at,
    bp.is_pinned
  FROM public.blog_posts bp
  WHERE bp.post_type = 'admin_update'
    AND bp.status = 'published'
    AND bp.published_at <= NOW()
  ORDER BY bp.is_pinned DESC, bp.published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.blog_posts IS 'Blog posts and admin updates with SEO optimization';
COMMENT ON TABLE public.blog_follows IS 'User following relationships for blog authors';
COMMENT ON TABLE public.blog_comments IS 'Comments on blog posts with nested reply support';
COMMENT ON TABLE public.blog_post_likes IS 'User likes on blog posts';
COMMENT ON TABLE public.blog_post_shares IS 'Share tracking for blog posts';
