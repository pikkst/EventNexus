-- Migration: Auto-archive completed events and prevent ticket sales
-- Description: Automatically archives events 1 day after completion and prevents ticket purchases for ended events
-- Date: 2025-12-30

-- Function to check if event has ended
CREATE OR REPLACE FUNCTION is_event_completed(p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_event events;
  v_event_end_date DATE;
  v_event_end_time TIME;
  v_event_end_timestamp TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Determine event end date and time
  v_event_end_date := COALESCE(v_event.end_date::DATE, v_event.date::DATE);
  v_event_end_time := COALESCE(v_event.end_time::TIME, v_event.time::TIME, '23:59:59'::TIME);
  
  -- Combine date and time
  v_event_end_timestamp := (v_event_end_date || ' ' || v_event_end_time)::TIMESTAMPTZ;
  
  -- Check if event has ended
  RETURN v_event_end_timestamp < NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to auto-archive completed events (runs daily)
CREATE OR REPLACE FUNCTION auto_archive_completed_events()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_event RECORD;
  v_event_end_date DATE;
  v_event_end_time TIME;
  v_event_end_timestamp TIMESTAMPTZ;
BEGIN
  -- Find events that ended more than 1 day ago and are not yet archived
  FOR v_event IN 
    SELECT * FROM events 
    WHERE archived_at IS NULL 
      AND status = 'active'
  LOOP
    -- Determine event end date and time
    v_event_end_date := COALESCE(v_event.end_date::DATE, v_event.date::DATE);
    v_event_end_time := COALESCE(v_event.end_time::TIME, v_event.time::TIME, '23:59:59'::TIME);
    v_event_end_timestamp := (v_event_end_date || ' ' || v_event_end_time)::TIMESTAMPTZ;
    
    -- If event ended more than 1 day ago, archive it
    IF v_event_end_timestamp < NOW() - INTERVAL '1 day' THEN
      UPDATE events
      SET 
        archived_at = NOW(),
        archived_by = organizer_id,
        status = 'archived'
      WHERE id = v_event.id;
      
      v_archived_count := v_archived_count + 1;
      
      -- Create notification for organizer
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        created_at
      ) VALUES (
        v_event.organizer_id,
        'event_archived',
        'Event Archived',
        'Your event "' || v_event.name || '" has been automatically archived after completion.',
        NOW()
      );
    END IF;
  END LOOP;
  
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent ticket purchases for completed events
CREATE OR REPLACE FUNCTION prevent_ticket_purchase_for_completed_events()
RETURNS TRIGGER AS $$
DECLARE
  v_event events;
  v_event_end_date DATE;
  v_event_end_time TIME;
  v_event_end_timestamp TIMESTAMPTZ;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = NEW.event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Check if event is archived
  IF v_event.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot purchase tickets for archived events';
  END IF;
  
  -- Determine event end date and time
  v_event_end_date := COALESCE(v_event.end_date::DATE, v_event.date::DATE);
  v_event_end_time := COALESCE(v_event.end_time::TIME, v_event.time::TIME, '23:59:59'::TIME);
  v_event_end_timestamp := (v_event_end_date || ' ' || v_event_end_time)::TIMESTAMPTZ;
  
  -- Check if event has ended
  IF v_event_end_timestamp < NOW() THEN
    RAISE EXCEPTION 'Cannot purchase tickets for events that have already ended';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS check_event_completion_before_ticket_purchase ON tickets;

-- Create trigger on tickets table
CREATE TRIGGER check_event_completion_before_ticket_purchase
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ticket_purchase_for_completed_events();

-- Add status column if not exists (for tracking archived events)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'archived'));
  END IF;
END $$;

-- Update existing archived events to have 'archived' status
UPDATE events 
SET status = 'archived' 
WHERE archived_at IS NOT NULL AND status != 'archived';

-- Create index for event status
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_event_completed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_archive_completed_events() TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_ticket_purchase_for_completed_events() TO authenticated;

-- Schedule auto-archiving to run daily (requires pg_cron extension)
-- Note: This needs to be set up in Supabase dashboard or via pg_cron
-- For manual execution: SELECT auto_archive_completed_events();

COMMENT ON FUNCTION is_event_completed(UUID) IS 'Checks if an event has ended';
COMMENT ON FUNCTION auto_archive_completed_events() IS 'Automatically archives events that ended more than 1 day ago';
COMMENT ON FUNCTION prevent_ticket_purchase_for_completed_events() IS 'Prevents ticket purchases for completed or archived events';
COMMENT ON COLUMN events.status IS 'Event status: active, cancelled, or archived';
