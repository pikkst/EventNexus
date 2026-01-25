-- Recreate blog tables with correct foreign keys to public.users
-- This fixes PGRST200 and 42703 errors

-- Drop all existing blog tables (CASCADE will drop dependent objects)
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
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Post type (admin updates vs user posts)
  post_type TEXT NOT NULL DEFAULT 'user_post', -- admin_update, user_post, announcement
  
  -- Content (multilingual)
  title JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  slug TEXT NOT NULL UNIQUE, -- SEO-friendly URL slug
  content JSONB NOT NULL DEFAULT '{"en": "", "et": "", "ru": ""}',
  excerpt JSONB DEFAULT '{"en": "", "et": "", "ru": ""}',
  
  -- SEO metadata
  meta_title JSONB DEFAULT '{"en": "", "et": "", "ru": ""}',
  meta_description JSONB DEFAULT '{"en": "", "et": "", "ru": ""}',
  meta_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  
  -- Media
  cover_image_url TEXT,
  featured_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  
  -- Categorization
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Publishing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  avg_read_time_seconds INTEGER DEFAULT 0,
  
  -- Settings
  allow_comments BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category) WHERE category IS NOT NULL;
CREATE INDEX idx_blog_posts_tags ON public.blog_posts USING GIN(tags);
CREATE INDEX idx_blog_posts_type ON public.blog_posts(post_type);

-- =============================================================================
-- BLOG FOLLOWS TABLE (follow authors)
-- =============================================================================
CREATE TABLE public.blog_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- nullable for anonymous shares
  
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
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_follows ENABLE ROW LEVEL SECURITY;

-- Blog posts policies
CREATE POLICY "anyone_can_read_published_posts" 
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

CREATE POLICY "authors_can_read_own_drafts" 
  ON public.blog_posts FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "admins_can_read_all_posts" 
  ON public.blog_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "authenticated_can_insert_posts" 
  ON public.blog_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "authors_can_update_own_posts" 
  ON public.blog_posts FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "authors_can_delete_own_posts" 
  ON public.blog_posts FOR DELETE
  USING (author_id = auth.uid());

-- Blog comments policies
CREATE POLICY "anyone_can_read_comments" 
  ON public.blog_comments FOR SELECT
  USING (NOT is_deleted);

CREATE POLICY "authors_can_update_comments" 
  ON public.blog_comments FOR UPDATE
  USING (auth.uid() = author_id AND NOT is_deleted);

CREATE POLICY "authors_can_delete_comments" 
  ON public.blog_comments FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "authenticated_can_insert_comments" 
  ON public.blog_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Blog likes policies
CREATE POLICY "anyone_can_read_likes" 
  ON public.blog_post_likes FOR SELECT
  USING (TRUE);

CREATE POLICY "authenticated_can_insert_likes" 
  ON public.blog_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_likes" 
  ON public.blog_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Blog shares policies
CREATE POLICY "anyone_can_read_shares" 
  ON public.blog_post_shares FOR SELECT
  USING (TRUE);

CREATE POLICY "anyone_can_insert_shares" 
  ON public.blog_post_shares FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Blog follows policies
CREATE POLICY "anyone_can_read_follows" 
  ON public.blog_follows FOR SELECT
  USING (TRUE);

CREATE POLICY "authenticated_can_insert_follows" 
  ON public.blog_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "users_can_delete_own_follows" 
  ON public.blog_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update like_count on blog_posts when likes change
CREATE OR REPLACE FUNCTION update_blog_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts 
    SET like_count = like_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.blog_posts 
    SET like_count = GREATEST(like_count - 1, 0),
        last_activity_at = NOW()
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_like_count ON public.blog_post_likes;
CREATE TRIGGER update_like_count
AFTER INSERT OR DELETE ON public.blog_post_likes
FOR EACH ROW EXECUTE FUNCTION update_blog_post_like_count();

-- Update comment_count on blog_posts when comments change
CREATE OR REPLACE FUNCTION update_blog_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts 
    SET comment_count = comment_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = TRUE) THEN
    UPDATE public.blog_posts 
    SET comment_count = GREATEST(comment_count - 1, 0),
        last_activity_at = NOW()
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_comment_count ON public.blog_comments;
CREATE TRIGGER update_comment_count
AFTER INSERT OR UPDATE OR DELETE ON public.blog_comments
FOR EACH ROW EXECUTE FUNCTION update_blog_post_comment_count();

-- Update share_count on blog_posts when shares change
CREATE OR REPLACE FUNCTION update_blog_post_share_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.blog_posts 
    SET share_count = share_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_share_count ON public.blog_post_shares;
CREATE TRIGGER update_share_count
AFTER INSERT ON public.blog_post_shares
FOR EACH ROW EXECUTE FUNCTION update_blog_post_share_count();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON public.blog_comments;
CREATE TRIGGER update_blog_comments_updated_at
BEFORE UPDATE ON public.blog_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
