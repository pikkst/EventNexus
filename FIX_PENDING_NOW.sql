-- Quick manual fix for the current pending ticket
UPDATE tickets
SET 
  payment_status = 'paid',
  qr_code = 'ENX-' || id::text || '-' || SUBSTRING(MD5(id::text || 'secret')::text, 1, 12)
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
  AND payment_status = 'pending';

-- Verify
SELECT 
  payment_status,
  COUNT(*) as tickets,
  SUM(price_paid) as revenue
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
GROUP BY payment_status;

-- Should now show:
-- paid | 3 | 60.00
