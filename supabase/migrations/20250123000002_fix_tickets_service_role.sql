-- Allow service role (Edge Functions) to insert pending tickets
-- This is needed for create-checkout function to create tickets before payment

-- First, check if policy exists and drop if needed (idempotent)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tickets' 
        AND policyname = 'Service role can create pending tickets'
    ) THEN
        DROP POLICY "Service role can create pending tickets" ON public.tickets;
    END IF;
END $$;

-- Create the policy
CREATE POLICY "Service role can create pending tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (true);  -- Service role bypasses this check anyway, but policy must exist

-- Also allow service role to update tickets (for webhook/verify-checkout)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tickets' 
        AND policyname = 'Service role can update tickets'
    ) THEN
        DROP POLICY "Service role can update tickets" ON public.tickets;
    END IF;
END $$;

CREATE POLICY "Service role can update tickets"
    ON public.tickets FOR UPDATE
    USING (true)
    WITH CHECK (true);
