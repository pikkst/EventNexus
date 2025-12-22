-- Debug Social Media Posting Issues
-- Run this to check why posts aren't reaching Facebook/Instagram

-- 1. Check if social_media_accounts table exists and has data
SELECT 
  'Social Media Accounts' AS check_type,
  platform,
  account_id,
  account_name,
  is_connected,
  LENGTH(access_token) AS token_length,
  expires_at,
  created_at,
  updated_at
FROM social_media_accounts
WHERE is_connected = true
ORDER BY platform;

-- 2. Check if user_campaigns have been attempted to post
SELECT 
  'User Campaigns Posting Status' AS check_type,
  id,
  user_id,
  title,
  status,
  facebook_posted,
  instagram_posted,
  twitter_posted,
  linkedin_posted,
  facebook_post_id,
  instagram_post_id,
  created_at,
  updated_at
FROM user_campaigns
WHERE facebook_posted = true OR instagram_posted = true OR twitter_posted = true OR linkedin_posted = true
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check admin campaigns table
SELECT 
  'Admin Campaigns' AS check_type,
  id,
  title,
  status,
  created_at
FROM campaigns
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if there are any errors in campaign_analytics
SELECT 
  'Campaign Analytics' AS check_type,
  campaign_id,
  impressions,
  clicks,
  source,
  medium,
  recorded_at
FROM campaign_analytics
ORDER BY recorded_at DESC
LIMIT 10;

-- 5. Verify RLS policies on social_media_accounts
SELECT 
  'RLS Policies' AS check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'social_media_accounts'
ORDER BY policyname;
