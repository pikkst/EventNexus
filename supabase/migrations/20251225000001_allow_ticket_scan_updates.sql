-- Allow ticket owners and organizers to mark tickets as scanned
-- Fixes ticket scanning/self-scan failing due to missing UPDATE policies

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'tickets' AND policyname = 'Ticket owners can update tickets'
        ) THEN
            EXECUTE 'DROP POLICY "Ticket owners can update tickets" ON public.tickets';
        END IF;

        EXECUTE 'CREATE POLICY "Ticket owners can update tickets"
            ON public.tickets FOR UPDATE
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid())';
    ELSE
        RAISE NOTICE 'Skipping ticket owner policy creation because public.tickets does not exist.';
    END IF;
END $$;

-- Event organizers can update tickets for their events (entry scanning)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tickets'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'tickets' AND policyname = 'Organizers can update event tickets'
        ) THEN
            EXECUTE 'DROP POLICY "Organizers can update event tickets" ON public.tickets';
        END IF;

        EXECUTE 'CREATE POLICY "Organizers can update event tickets"
            ON public.tickets FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.events
                    WHERE id = tickets.event_id
                      AND organizer_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.events
                    WHERE id = tickets.event_id
                      AND organizer_id = auth.uid()
                )
            )';
    ELSE
        RAISE NOTICE 'Skipping organizer ticket policy creation because public.tickets does not exist.';
    END IF;
END $$;
