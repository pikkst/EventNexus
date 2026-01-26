-- Fix foreign keys to point to public.users instead of auth.users
-- This fixes PostgREST relationship detection for embedded queries

-- Fix user_buddies foreign keys
ALTER TABLE public.user_buddies DROP CONSTRAINT IF EXISTS user_buddies_user_id_1_fkey;
ALTER TABLE public.user_buddies DROP CONSTRAINT IF EXISTS user_buddies_user_id_2_fkey;

ALTER TABLE public.user_buddies
ADD CONSTRAINT user_buddies_user_id_1_fkey 
FOREIGN KEY (user_id_1) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_buddies
ADD CONSTRAINT user_buddies_user_id_2_fkey 
FOREIGN KEY (user_id_2) REFERENCES public.users(id) ON DELETE CASCADE;

-- Fix event_reviews foreign key
ALTER TABLE public.event_reviews DROP CONSTRAINT IF EXISTS event_reviews_user_id_fkey;

ALTER TABLE public.event_reviews
ADD CONSTRAINT event_reviews_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
