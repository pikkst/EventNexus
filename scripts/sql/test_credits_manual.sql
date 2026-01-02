-- TEST 1: Check user's current credits directly from database
SELECT id, email, name, credits, role 
FROM public.users 
WHERE email = 'huntersest@gmail.com';

-- TEST 2: Check all credit transactions for this user
SELECT 
  ct.created_at,
  ct.transaction_type,
  ct.amount,
  ct.balance_after,
  ct.reason,
  u.email as user_email
FROM public.credit_transactions ct
JOIN public.users u ON ct.user_id = u.id
WHERE u.email = 'huntersest@gmail.com'
ORDER BY ct.created_at DESC;

-- TEST 3: Manually grant 1000 credits to test user (replace USER_ID and ADMIN_ID)
-- First, get the IDs:
SELECT 
  id as user_id,
  email,
  credits as current_credits
FROM public.users 
WHERE email = 'huntersest@gmail.com';

SELECT 
  id as admin_id,
  email
FROM public.users 
WHERE role = 'admin'
LIMIT 1;

-- TEST 4: After getting IDs above, run this function:
-- SELECT public.admin_grant_credits(
--   'USER_ID_HERE'::uuid,
--   1000,
--   'Manual test credit grant',
--   'ADMIN_ID_HERE'::uuid
-- );

-- TEST 5: Verify the update
SELECT id, email, name, credits 
FROM public.users 
WHERE email = 'huntersest@gmail.com';
