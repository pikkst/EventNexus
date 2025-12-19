-- ============================================
-- Real-time Subscriptions Setup
-- ============================================
-- This migration enables real-time subscriptions
-- for notifications and events
-- ============================================

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Create function to broadcast event updates
CREATE OR REPLACE FUNCTION broadcast_event_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'event_update',
        json_build_object(
            'event_id', NEW.id,
            'action', TG_OP,
            'data', row_to_json(NEW)
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event broadcasts
CREATE TRIGGER event_update_broadcast
    AFTER INSERT OR UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_event_update();

COMMENT ON FUNCTION broadcast_event_update IS 'Broadcasts event changes via PostgreSQL NOTIFY';
