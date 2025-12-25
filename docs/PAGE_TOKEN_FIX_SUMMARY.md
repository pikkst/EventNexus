# Facebook Page Token Automatic Acquisition - Fix Summary

## Problem Solved
OAuth flow was obtaining USER access tokens instead of PAGE access tokens. Facebook requires PAGE tokens to post to Pages. When admin selected pages during authorization, the application wasn't capturing the Page IDs and tokens.

## Root Cause
1. Missing `pages_show_list` scope in OAuth request
2. `/me/accounts` API returning empty array
3. Short-lived tokens expiring quickly (24 hours instead of 60 days)
4. No automatic long-lived token exchange

## Solution Implemented

### 1. Added `pages_show_list` Scope
**File:** `services/socialAuthHelper.ts`

Updated Facebook OAuth scope:
```typescript
facebook: 'pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish'
```

This ensures `/me/accounts` returns the list of managed Pages.

### 2. Implemented Long-Lived Token Exchange
**New 3-step process for both Facebook and Instagram:**

#### Facebook Flow:
```
Step 1: Short-lived USER token → Long-lived USER token (60 days)
        GET /oauth/access_token?grant_type=fb_exchange_token

Step 2: Long-lived USER token → Fetch Page tokens
        GET /me/accounts?fields=id,name,access_token,category

Step 3: Use Page token (Page tokens never expire)
        Save to database
```

#### Instagram Flow:
```
Step 1: Short-lived USER token → Long-lived USER token (60 days)

Step 2: Long-lived USER token → Fetch Pages with Instagram Business Accounts
        GET /me/accounts?fields=id,name,access_token,instagram_business_account

Step 3: Find Page with Instagram Business Account

Step 4: Use Page token for Instagram API calls
```

### 3. Enhanced Error Handling

**When `/me/accounts` returns empty:**
```
Error: No Facebook Pages found. To post to Facebook, you need:
1. A Facebook Page (not just personal profile)
2. Admin access to that Page
3. Select the Page during authorization
4. Grant all requested permissions

Create a Page at: https://www.facebook.com/pages/create
```

**When Pages don't have Instagram Business Account:**
```
Error: None of your Facebook Pages have an Instagram Business Account connected.
Connect your Instagram at: https://www.facebook.com/settings?tab=business_tools
```

### 4. Detailed Console Logging

Every step is logged for debugging:
```javascript
🔄 Step 1: Exchanging for long-lived user token...
✅ Got long-lived user token (expires in 5183999 seconds)
🔄 Step 2: Fetching Facebook Pages...
📄 Facebook Pages response: { hasData: true, pageCount: 1 }
✅ Using Facebook Page: { id: '864504226754704', name: 'EventNexus' }
🔄 Step 3: Verifying Page token...
✅ Page token verified successfully
```

## Testing Instructions

### 1. Update OAuth Scope in Database
Run this SQL in Supabase SQL Editor:
```sql
UPDATE system_config
SET config_value = '"pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"'
WHERE config_key = 'facebook_oauth_scope';

UPDATE system_config
SET config_value = '"pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish"'
WHERE config_key = 'instagram_oauth_scope';
```

Or use the file:
```bash
# Copy content from sql/tokens/update_oauth_scope_with_pages_list.sql
# Paste into Supabase SQL Editor
# Run the query
```

### 2. Disconnect and Reconnect Facebook
1. Go to Admin Panel → Social Media Manager
2. Disconnect existing Facebook connection
3. Click "Connect Facebook"
4. **IMPORTANT:** In OAuth dialog, **select specific Facebook Pages** you want to use
5. Grant all requested permissions

### 3. Check Console Logs
You should see:
```
🔄 Step 1: Exchanging for long-lived user token...
✅ Got long-lived user token (expires in 5183999 seconds)
🔄 Step 2: Fetching Facebook Pages...
📄 Facebook Pages response: { hasData: true, pageCount: 1, error: undefined }
✅ Using Facebook Page: { id: '864504226754704', name: 'EventNexus', category: 'Event' }
🔄 Step 3: Verifying Page token...
✅ Page token verified successfully
```

### 4. Test Posting
1. Create or select a campaign
2. Click "Post to Facebook"
3. Should see:
```
📘 Starting Facebook post...
✅ Posted to Facebook: 123456789_987654321
✅ Database updated successfully
```

## Technical Details

### Token Types Explained
- **USER Token:** Personal access, CANNOT post to Pages
- **PAGE Token:** Page-specific, CAN post to Pages
- **Short-lived:** 1-2 hours
- **Long-lived:** 60 days (USER tokens) or never expires (PAGE tokens)

### Why Was `/me/accounts` Returning Empty?
Possible reasons:
1. ❌ Missing `pages_show_list` scope
2. ❌ Admin didn't select page in OAuth dialog
3. ❌ Admin is not page admin
4. ❌ Short-lived token expired before `/me/accounts` call

### Fix Applied
✅ Added `pages_show_list` scope  
✅ Exchange for long-lived token immediately  
✅ Clear instructions when no pages found  
✅ Log each step for debugging  

## User Requirements

### For Facebook Posting:
- Facebook Page (not just personal profile)
- Admin access to the Page
- Page selected during OAuth

### For Instagram Posting:
- Instagram Business Account
- Connected to a Facebook Page
- Admin access to that Page

## Files Modified
- `services/socialAuthHelper.ts` - OAuth flow and token exchange
- `sql/tokens/update_oauth_scope_with_pages_list.sql` - Database scope update
- `docs/PAGE_TOKEN_AUTOMAATNE_FIX_ET.md` - Estonian documentation

## Next Steps
1. Run SQL update in Supabase
2. Disconnect existing connections
3. Reconnect all accounts with new flow
4. Test posting functionality
5. Verify `user_campaigns` and `social_media_posts` tables

## Troubleshooting
If `/me/accounts` still returns empty:
1. Verify Facebook Page exists
2. Confirm admin role on Page
3. Check OAuth permission grants
4. Review console logs for detailed errors
5. Try creating a new Page if none exist

## Expected Behavior After Fix
✅ OAuth automatically fetches Page tokens  
✅ Tokens are long-lived (60 days for user, never expire for pages)  
✅ Facebook posting works with proper permissions  
✅ Instagram posting works with proper permissions  
✅ Database logging works correctly  
✅ Clear error messages guide users  

## Commit
```
fix: Automate Facebook Page token acquisition in OAuth flow

Key improvements:
1. Added pages_show_list scope to Facebook/Instagram OAuth
2. Implemented automatic long-lived token exchange (60 days)
3. Proper Page token fetching from /me/accounts API
4. Better error messages when pages not found
5. Detailed step-by-step console logging
6. Page tokens never expire vs user tokens (24h)
```

Commit hash: f117fbf
Deployed to: main branch
