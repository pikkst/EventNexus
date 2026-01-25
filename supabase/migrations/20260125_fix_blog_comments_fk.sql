-- Fix blog_comments foreign key to reference public.users instead of auth.users
-- This resolves PGRST200 error when PostgREST tries to join blog_comments with users table

-- Drop existing foreign key to auth.users
ALTER TABLE public.blog_comments
DROP CONSTRAINT IF EXISTS blog_comments_author_id_fkey;

-- Drop existing foreign key to public.users (from previous fix attempt)
ALTER TABLE public.blog_comments
DROP CONSTRAINT IF EXISTS fk_blog_comments_author_users;

-- Add correct foreign key to public.users
ALTER TABLE public.blog_comments
ADD CONSTRAINT blog_comments_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Verify the relationship exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'blog_comments'
          AND kcu.column_name = 'author_id'
          AND ccu.table_name = 'users'
    ) THEN
        RAISE NOTICE 'Foreign key blog_comments.author_id -> public.users.id exists';
    ELSE
        RAISE WARNING 'Foreign key relationship NOT found!';
    END IF;
END $$;
