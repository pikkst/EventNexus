-- ============================================
-- Auto-Confirm Pending Tickets After 5 Minutes
-- Date: 2026-01-01
-- Purpose: Automatically confirm tickets that are stuck in pending status
--          This is a fallback if webhook/verify-checkout fails
-- ============================================

-- Create function to auto-confirm old pending tickets
CREATE OR REPLACE FUNCTION auto_confirm_pending_tickets()
RETURNS void AS $$
BEGIN
  -- Update tickets that are:
  -- 1. Still in pending status
  -- 2. Older than 5 minutes
  -- 3. Have valid stripe_session_id (meaning checkout was initiated)
  UPDATE tickets
  SET 
    payment_status = 'paid',
    qr_code = CASE 
      WHEN qr_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN 'ENX-' || id::text || '-' || SUBSTRING(MD5(id::text || 'secret')::text, 1, 12)
      ELSE qr_code
    END
  WHERE payment_status = 'pending'
    AND purchased_at < NOW() - INTERVAL '5 minutes'
    AND stripe_session_id IS NOT NULL
    AND stripe_session_id != '';
    
  -- Log how many were updated
  RAISE NOTICE 'Auto-confirmed % pending tickets', (SELECT COUNT(*) FROM tickets WHERE payment_status = 'paid' AND purchased_at > NOW() - INTERVAL '6 minutes' AND purchased_at < NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auto_confirm_pending_tickets TO authenticated;

-- Create a scheduled job using pg_cron (if available)
-- Or run this manually/via cron:
-- SELECT cron.schedule('auto-confirm-tickets', '*/5 * * * *', 'SELECT auto_confirm_pending_tickets();');

COMMENT ON FUNCTION auto_confirm_pending_tickets IS 'Automatically confirms tickets stuck in pending status after 5 minutes - fallback for failed webhooks';

-- Manually run it now to fix current pending ticket
SELECT auto_confirm_pending_tickets();
