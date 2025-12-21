-- Ticket System Enhancement Migration
-- Adds proper QR code support and validation fields
-- Run this migration to upgrade existing ticket system

-- Add missing columns if they don't exist
ALTER TABLE IF EXISTS public.tickets 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scanned_by UUID REFERENCES public.users(id);

-- Update existing tickets to have valid status if payment_status is paid
UPDATE public.tickets 
SET status = 'valid' 
WHERE payment_status = 'paid' AND status IS NULL;

-- Create ticket_scans table for audit trail
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  scanned_by UUID NOT NULL REFERENCES public.users(id),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scan_result TEXT NOT NULL DEFAULT 'valid',
  scan_location JSONB,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON public.tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON public.ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_event_id ON public.ticket_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON public.ticket_scans(scanned_by);

-- Enable RLS on ticket_scans
ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;

-- Ticket scans policies
CREATE POLICY "Users can view scans for their events" ON public.ticket_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = ticket_scans.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Event organizers can create scans" ON public.ticket_scans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = ticket_scans.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.ticket_scans IS 'Audit trail for ticket scanning operations';
COMMENT ON COLUMN public.tickets.qr_code IS 'Secure QR code in format: ENX-{ticketId}-{hash}';
COMMENT ON COLUMN public.tickets.payment_status IS 'Stripe payment status: pending, paid, failed';
COMMENT ON COLUMN public.tickets.status IS 'Ticket validity: valid, used, cancelled, expired';

-- Function to automatically mark old tickets as expired
CREATE OR REPLACE FUNCTION expire_old_tickets()
RETURNS void AS $$
BEGIN
  UPDATE public.tickets t
  SET status = 'expired'
  FROM public.events e
  WHERE t.event_id = e.id
    AND t.status = 'valid'
    AND (e.date::timestamp + INTERVAL '1 day') < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_old_tickets() TO authenticated;

COMMENT ON FUNCTION expire_old_tickets() IS 'Marks tickets as expired for events that ended more than 24 hours ago';
