-- Quick fix for pending Demo Party tickets
-- Copy this SQL and run it in Supabase SQL Editor
-- https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

-- Update pending tickets to paid
UPDATE tickets
SET 
  payment_status = 'paid',
  qr_code = 'ENX-' || id::text || '-' || SUBSTRING(MD5(id::text || 'secret')::text, 1, 12)
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'pending';

-- Check results
SELECT 
  COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_tickets,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_tickets,
  SUM(price_paid) as total_revenue
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
