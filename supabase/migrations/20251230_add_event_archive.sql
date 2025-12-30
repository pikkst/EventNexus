-- Migration: Add event archive functionality
-- Description: Allows organizers to archive completed events
-- Date: 2025-12-30

-- Add archived columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

-- Create index for archived events
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at) WHERE archived_at IS NOT NULL;

-- Function to archive an event
CREATE OR REPLACE FUNCTION archive_event(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event events;
  v_event_end_date DATE;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;
  
  -- Verify the event belongs to the user (organizer)
  IF v_event.organizer_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to archive this event'
    );
  END IF;
  
  -- Determine event end date
  v_event_end_date := COALESCE(v_event.end_date::DATE, v_event.date::DATE);
  
  -- Check if event is completed (ended at least 1 day ago)
  IF v_event_end_date >= CURRENT_DATE - INTERVAL '1 day' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event has not ended yet. Events can only be archived after completion.'
    );
  END IF;
  
  -- Archive the event
  UPDATE events
  SET 
    archived_at = NOW(),
    archived_by = p_user_id
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Event archived successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore an archived event
CREATE OR REPLACE FUNCTION restore_event(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event events;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found'
    );
  END IF;
  
  -- Verify the event belongs to the user (organizer)
  IF v_event.organizer_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to restore this event'
    );
  END IF;
  
  -- Restore the event
  UPDATE events
  SET 
    archived_at = NULL,
    archived_by = NULL
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Event restored successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Organizers can view their archived events
CREATE POLICY "Organizers can view their own archived events"
  ON events FOR SELECT
  USING (
    organizer_id = auth.uid() AND archived_at IS NOT NULL
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_event(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_event(UUID, UUID) TO authenticated;

-- Comment on columns
COMMENT ON COLUMN events.archived_at IS 'When the event was archived by the organizer';
COMMENT ON COLUMN events.archived_by IS 'User who archived the event';
