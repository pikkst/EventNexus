-- Migration: Add ticket archive functionality
-- Description: Allows users to archive tickets from completed events
-- Date: 2025-12-30

-- Add archived_at column to tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

-- Create index for archived tickets
CREATE INDEX IF NOT EXISTS idx_tickets_archived ON tickets(archived_at) WHERE archived_at IS NOT NULL;

-- Function to archive a ticket (soft delete)
CREATE OR REPLACE FUNCTION archive_ticket(
  p_ticket_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_ticket tickets;
  v_event events;
  v_event_end_date DATE;
BEGIN
  -- Get ticket details
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket not found'
    );
  END IF;
  
  -- Verify the ticket belongs to the user
  IF v_ticket.user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to archive this ticket'
    );
  END IF;
  
  -- Get event details
  SELECT * INTO v_event FROM events WHERE id = v_ticket.event_id;
  
  -- Determine event end date
  v_event_end_date := COALESCE(v_event.end_date::DATE, v_event.date::DATE);
  
  -- Check if event is completed (ended at least 1 day ago)
  IF v_event_end_date >= CURRENT_DATE - INTERVAL '1 day' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event has not ended yet. Tickets can only be archived after the event is completed.'
    );
  END IF;
  
  -- Archive the ticket
  UPDATE tickets
  SET 
    archived_at = NOW(),
    archived_by = p_user_id
  WHERE id = p_ticket_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ticket archived successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore an archived ticket
CREATE OR REPLACE FUNCTION restore_ticket(
  p_ticket_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_ticket tickets;
BEGIN
  -- Get ticket details
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket not found'
    );
  END IF;
  
  -- Verify the ticket belongs to the user
  IF v_ticket.user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized to restore this ticket'
    );
  END IF;
  
  -- Restore the ticket
  UPDATE tickets
  SET 
    archived_at = NULL,
    archived_by = NULL
  WHERE id = p_ticket_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ticket restored successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Users can view their archived tickets
CREATE POLICY "Users can view their own archived tickets"
  ON tickets FOR SELECT
  USING (
    user_id = auth.uid() AND archived_at IS NOT NULL
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_ticket(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_ticket(UUID, UUID) TO authenticated;

-- Comment on columns
COMMENT ON COLUMN tickets.archived_at IS 'When the ticket was archived by the user';
COMMENT ON COLUMN tickets.archived_by IS 'User who archived the ticket';
