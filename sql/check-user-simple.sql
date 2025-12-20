-- Simple query to check user subscription without missing column
SELECT 
  id,
  email,
  name,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  updated_at
FROM public.users
WHERE email = '3dcutandengrave@gmail.com';
