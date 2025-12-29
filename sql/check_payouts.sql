-- Check payouts table structure and test data
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payouts'
ORDER BY ordinal_position;

-- Check if any payouts exist
SELECT 
  id,
  user_id,
  event_id,
  gross_amount,
  platform_fee,
  net_amount,
  status,
  processed_at,
  stripe_transfer_id
FROM payouts
ORDER BY created_at DESC
LIMIT 10;

-- Test the paid_amount calculation for Demo Party organizer
SELECT 
  u.id as organizer_id,
  u.name as organizer_name,
  COUNT(p.id) as payout_count,
  COALESCE(SUM(p.net_amount), 0) as total_paid_net,
  COALESCE(SUM(p.gross_amount), 0) as total_paid_gross
FROM users u
LEFT JOIN events e ON e.organizer_id = u.id
LEFT JOIN payouts p ON p.event_id = e.id AND p.status = 'paid'
WHERE u.email = 'llmatic.oy@gmail.com'
GROUP BY u.id, u.name;
