-- Fix blog_comments relationship to users table for PostgREST
-- This allows the API to properly resolve the author relationship

-- Add foreign key to users table if it doesn't exist
ALTER TABLE public.blog_comments
ADD CONSTRAINT fk_blog_comments_author_users FOREIGN KEY (author_id) 
REFERENCES public.users(id) ON DELETE CASCADE;

-- Enable RLS on blog_comments
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- RLS policy: anyone can read published comments
CREATE POLICY "anyone_can_read_comments" ON public.blog_comments
FOR SELECT
USING (NOT is_deleted);

-- RLS policy: authors can update their own comments
CREATE POLICY "authors_can_update_comments" ON public.blog_comments
FOR UPDATE
USING (auth.uid() = author_id AND NOT is_deleted);

-- RLS policy: authors can delete their own comments
CREATE POLICY "authors_can_delete_comments" ON public.blog_comments
FOR DELETE
USING (auth.uid() = author_id);

-- RLS policy: authenticated users can insert comments
CREATE POLICY "authenticated_can_insert_comments" ON public.blog_comments
FOR INSERT
WITH CHECK (auth.uid() = author_id);
