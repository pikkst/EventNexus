-- Lock down public ticket mutation access and ensure only least-privilege policies remain.
-- This migration is designed to be run on existing deployments.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Service role can create pending tickets') THEN
        DROP POLICY "Service role can create pending tickets" ON public.tickets;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Service role can update tickets') THEN
        DROP POLICY "Service role can update tickets" ON public.tickets;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Authenticated users can purchase tickets') THEN
        DROP POLICY "Authenticated users can purchase tickets" ON public.tickets;
    END IF;
END $$;

REVOKE INSERT, UPDATE ON public.tickets FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can view tickets for their events" ON public.tickets;
CREATE POLICY "Organizers can view tickets for their events"
    ON public.tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = tickets.event_id
              AND events.organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Ticket owners can update tickets" ON public.tickets;
CREATE POLICY "Ticket owners can update tickets"
    ON public.tickets FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can update event tickets" ON public.tickets;
CREATE POLICY "Organizers can update event tickets"
    ON public.tickets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = tickets.event_id
              AND events.organizer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = tickets.event_id
              AND events.organizer_id = auth.uid()
        )
    );
