-- Fix: Add UNIQUE constraint to agency_slug column
-- The column exists but UNIQUE constraint is missing

-- First, check for any duplicates before adding constraint
SELECT 
    agency_slug, 
    COUNT(*) as count
FROM public.users
WHERE agency_slug IS NOT NULL
GROUP BY agency_slug
HAVING COUNT(*) > 1;

-- If no duplicates found above, add the UNIQUE constraint
DO $$
BEGIN
    -- Drop constraint if it exists (just in case)
    BEGIN
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_agency_slug_key;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add UNIQUE constraint
    ALTER TABLE public.users 
    ADD CONSTRAINT users_agency_slug_key UNIQUE (agency_slug);
    
    RAISE NOTICE '✅ UNIQUE constraint added successfully';
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION '❌ Cannot add UNIQUE constraint - duplicate values exist';
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error: %', SQLERRM;
END $$;

-- Verify the constraint was added
SELECT 
    'Verification' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
            AND tc.table_name = 'users'
            AND ccu.column_name = 'agency_slug'
            AND tc.constraint_type = 'UNIQUE'
        ) THEN '✅ UNIQUE CONSTRAINT NOW EXISTS'
        ELSE '❌ STILL MISSING'
    END as status;
