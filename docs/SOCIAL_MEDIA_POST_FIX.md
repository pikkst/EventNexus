# Fix: Social Media Posting Not Saving to Database

## Problem
When admin generates a marketing campaign and posts to Instagram/Facebook:
- Frontend shows "success" message
- Post appears to succeed on social media
- **Nothing gets saved to Supabase database**
- No database logs appear

## Root Cause
The `user_campaigns` table was missing columns needed to track social media posts:
- `facebook_posted`, `facebook_post_id`
- `instagram_posted`, `instagram_post_id`
- `twitter_posted`, `twitter_post_id`
- `linkedin_posted`, `linkedin_post_id`
- `last_posted_at`

The code was trying to update these columns, but they didn't exist, causing silent database failures.

## Solution

### 1. Apply Database Migration

The migration file has been created at:
```
supabase/migrations/20250122000000_add_social_tracking_to_user_campaigns.sql
```

**Apply it to your database:**

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

2. Copy and paste the entire migration file content

3. Click "Run" to execute

**What it does:**
- Adds social media tracking columns to `user_campaigns` table
- Creates indexes for efficient queries
- Creates `log_user_campaign_post()` function to handle post logging
- Grants permissions to authenticated users

### 2. Test the Fix

Run the diagnostic script to verify everything is set up correctly:

```bash
cd /workspaces/EventNexus
npx tsx scripts/test-social-post.ts
```

This will check:
- ✅ `user_campaigns` table has all required columns
- ✅ `log_user_campaign_post()` function exists
- ✅ Social media accounts are connected
- ✅ OAuth credentials are configured

### 3. Code Updates

The following code has been updated to properly handle database logging:

**`SocialMediaManager.tsx`:**
- Now uses `supabase.rpc('log_user_campaign_post', {...})` 
- Properly handles and surfaces database errors
- Shows detailed error messages with database error details
- Updates local state after successful database update

**Error handling flow:**
1. Post to social media platform (Facebook/Instagram)
2. If post succeeds, call `log_user_campaign_post()` 
3. If database logging fails, throw error and alert user
4. If everything succeeds, update UI and show success message

### 4. Verification Steps

After applying the migration, test the complete flow:

1. **Login as admin** at https://eventnexus.eu/#/admin

2. **Generate a campaign:**
   - Go to Social Media Manager section
   - Click "Generate Campaign"
   - Fill in event name and audience type
   - AI will generate campaign content

3. **Post to Facebook:**
   - Click the Facebook icon (📘) on the campaign
   - Should see console logs:
     ```
     📘 Starting Facebook post...
     📘 Facebook post result: { success: true, postId: "..." }
     📘 Logging Facebook post to database...
     ✅ Database updated successfully
     ```
   - Alert should show: "✅ Posted to Facebook! Post ID: xxx"

4. **Post to Instagram:**
   - Click the Instagram icon (📸) on the campaign
   - Should see similar console logs
   - Alert should show: "✅ Posted to Instagram! Post ID: xxx"

5. **Verify in database:**
   ```sql
   SELECT 
     id,
     title,
     facebook_posted,
     facebook_post_id,
     instagram_posted,
     instagram_post_id,
     status,
     last_posted_at
   FROM user_campaigns
   WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
   ORDER BY created_at DESC;
   ```

   You should see:
   - `facebook_posted` = true
   - `facebook_post_id` = actual post ID
   - `instagram_posted` = true  
   - `instagram_post_id` = actual post ID
   - `status` = 'published'
   - `last_posted_at` = timestamp

6. **Check social_media_posts table:**
   ```sql
   SELECT * FROM social_media_posts 
   WHERE user_id = 'f2ecf6c6-14c1-4dbd-894b-14ee6493d807'
   ORDER BY posted_at DESC;
   ```

   Should see entries for each post with:
   - platform ('facebook' or 'instagram')
   - content (campaign title + copy)
   - external_post_id
   - status ('posted')

### 5. Troubleshooting

**If posts still don't save:**

1. **Check browser console for errors:**
   - Open DevTools (F12) → Console tab
   - Look for red error messages after clicking post buttons
   - Share the exact error message

2. **Check Supabase logs:**
   - Go to https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/explorer
   - Filter by "Error" severity
   - Look for RPC errors or permission issues

3. **Verify migration was applied:**
   ```sql
   -- Check if columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'user_campaigns' 
   AND column_name LIKE '%posted%';

   -- Check if function exists
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'log_user_campaign_post';
   ```

4. **Check social media connection:**
   - Make sure Facebook/Instagram accounts are actually connected
   - Check `social_media_accounts` table for active accounts
   - Verify access tokens are valid

**Common errors:**

- **"function log_user_campaign_post does not exist"**
  → Migration not applied. Run SQL migration in Supabase.

- **"column 'facebook_posted' does not exist"**
  → Migration not applied. Run SQL migration in Supabase.

- **"Post succeeded but database logging failed: permission denied"**
  → RLS policy issue. Check if user has permission to update their campaigns.

- **"Instagram requires an image"**
  → Instagram posts must have an image. Make sure campaign has image_url set.

## Files Changed

1. **`supabase/migrations/20250122000000_add_social_tracking_to_user_campaigns.sql`** (NEW)
   - Adds social media tracking columns
   - Creates `log_user_campaign_post()` function

2. **`components/SocialMediaManager.tsx`** (UPDATED)
   - Now uses `log_user_campaign_post()` RPC function
   - Better error handling and console logging
   - Shows database errors to user

3. **`scripts/test-social-post.ts`** (NEW)
   - Diagnostic script to test setup
   - Verifies migration, accounts, and configuration

## Next Steps

1. ✅ Apply migration to database (MUST DO)
2. ✅ Run test script to verify setup
3. ✅ Test posting a campaign
4. ✅ Verify data appears in database
5. ✅ Monitor console logs for any errors

## Support

If issues persist after applying the migration:
1. Share browser console logs
2. Share Supabase database logs  
3. Share result of diagnostic script
4. Contact: huntersest@gmail.com
