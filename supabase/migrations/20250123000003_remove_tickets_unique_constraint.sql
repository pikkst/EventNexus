-- Remove unique constraint that prevents users from buying multiple tickets
-- The constraint tickets_event_id_user_id_key blocks users from purchasing
-- multiple tickets for the same event, which is needed for group bookings

-- Drop the constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'tickets_event_id_user_id_key'
    ) THEN
        ALTER TABLE public.tickets 
        DROP CONSTRAINT tickets_event_id_user_id_key;
        
        RAISE NOTICE 'Dropped unique constraint: tickets_event_id_user_id_key';
    ELSE
        RAISE NOTICE 'Constraint tickets_event_id_user_id_key does not exist, skipping';
    END IF;
END $$;
