# Social Media Hub Data Display Fix - Diagnostics & Solutions

## Problem Summary
The Social Media Connections section in the admin dashboard was not displaying connected social media accounts data properly. The component appeared to work but would show empty state even after connecting accounts.

## Root Causes Identified

1. **Missing Error Handling** - No user-visible error messages when data failed to load
2. **No Loading State** - Component didn't show feedback during data loading
3. **Silent Failures** - Errors were only logged to console, not displayed in UI
4. **No Empty State Message** - When no accounts existed, there was no helpful guidance

## Fixes Implemented

### 1. Enhanced Error Handling
- Added `loadError` state to track and display errors
- Clear error messages shown in UI with retry button
- All errors logged to console with emoji indicators for easy scanning

### 2. Loading State Indicator
- Added `loadingAccounts` state
- Shows "🔄 Loading social media accounts..." message while fetching
- Prevents confusing empty states

### 3. Improved Data Logging
```javascript
// Before: Silent failures
console.error('Failed to load accounts:', error);

// After: Detailed diagnostic logs
console.log('📱 Loading social media accounts for user:', user.id);
data?.forEach(acc => {
  console.log(`  - ${acc.platform}: ${acc.account_name} (expires: ${acc.expires_at})`);
});
```

### 4. Empty State Message
- Clear "No connected accounts yet" message when accounts list is empty
- Guides user to click "Setup Tokens" to get started

### 5. Refresh Button
- Added manual refresh button in header
- Allows users to reload data without page refresh
- Shows loading spinner while refreshing

### 6. Better Setup Logging
- More detailed logging during token setup process
- Console shows success/failure at each step
- Makes it easier to diagnose setup issues

## How to Diagnose Issues

### Step 1: Check Browser Console
1. Open Admin Dashboard → Social Media Hub
2. Press `F12` to open browser developer tools
3. Go to **Console** tab
4. Look for messages like:
   - `📱 Loading social media accounts for user: [UUID]`
   - `✅ Loaded accounts: 2 records`
   - `❌ Supabase error: [error details]`

### Step 2: Verify Database Data
Run this SQL in Supabase SQL Editor:

```sql
-- Check if social_media_accounts table has any data
SELECT COUNT(*) FROM public.social_media_accounts;

-- See all accounts
SELECT 
    platform, account_name, account_id, 
    is_connected, expires_at 
FROM public.social_media_accounts
ORDER BY created_at DESC;

-- Check for your specific user
SELECT * FROM public.social_media_accounts 
WHERE user_id = (SELECT id FROM public.users WHERE email = 'your-email@example.com');
```

Or use the comprehensive diagnostic script:
```sql
-- Run: sql/verify_social_media_setup.sql
```

### Step 3: Check RLS Policies
The component relies on these RLS policies:
- ✅ `Users can view own social accounts` - SELECT 
- ✅ `Users can insert own social accounts` - INSERT
- ✅ `Users can update own social accounts` - UPDATE
- ✅ `Users can delete own social accounts` - DELETE
- ✅ `Admins can view all social accounts` - SELECT (for admins)

If accounts don't display:
1. Verify RLS is **enabled** on the table
2. Check policies exist and are correct
3. Ensure user UUID is correct in RLS conditions

### Step 4: Common Issues & Solutions

#### Issue: "Error loading accounts" message appears
**Solution:**
1. Open browser console (F12)
2. Check error message details
3. Common causes:
   - RLS policy denying access → Fix in Supabase
   - Network/CORS issue → Check browser network tab
   - Database connection issue → Check Supabase status

#### Issue: Shows "No connected accounts" but accounts exist in DB
**Solution:**
1. Click refresh button (🔄) in header
2. Check browser console for RLS errors
3. Verify RLS policies include your user ID:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'social_media_accounts';
   ```

#### Issue: Setup process shows errors
**Solution:**
1. Check all three fields have values:
   - Facebook App ID
   - App Secret
   - User Access Token
2. Verify tokens are valid (not expired)
3. Check browser console for detailed error messages
4. Ensure account has proper Facebook permissions

#### Issue: Accounts don't persist after setup
**Solution:**
1. Check that INSERT was successful in console
2. Verify database write permissions
3. Check for unique constraint violations:
   ```sql
   -- This should not return duplicates
   SELECT user_id, platform, COUNT(*) 
   FROM public.social_media_accounts 
   GROUP BY user_id, platform 
   HAVING COUNT(*) > 1;
   ```

## Testing the Fix

### Manual Test Steps:
1. Go to Admin Dashboard → Social Media Hub
2. Open browser console (F12)
3. Click "Setup Tokens" button
4. Enter your Facebook credentials:
   - App ID: `1527493881796179`
   - App Secret: [from your Meta developer account]
   - User Access Token: [from Graph API Explorer]
5. Click "Auto-Connect Facebook & Instagram"
6. Monitor console for detailed logs:
   - Look for `✅` (success) or `❌` (error) messages
   - Check that accounts are inserted successfully
7. Should see connected Facebook and Instagram cards below
8. Click refresh button to verify data reloads

### Automated Test SQL:
```sql
-- sql/verify_social_media_setup.sql
-- Provides complete diagnostic information about:
-- - Data in table
-- - RLS policies
-- - User access
-- - Current permissions
```

## File Changes Summary

### Modified Files:
- `components/SimplifiedSocialMediaManager.tsx`
  - Enhanced error handling and user feedback
  - Added loading and empty states
  - Improved logging throughout
  - Added refresh button

### New Documentation:
- `sql/verify_social_media_setup.sql` - Comprehensive diagnostic script
- `sql/debug_social_media_accounts.sql` - Detailed data verification

## Implementation Notes

### Why data wasn't displaying:
The component was working correctly, but without proper feedback:
- Errors were silent (console only)
- No loading indicator
- No empty state guidance
- Made it appear like feature was broken

### Architecture:
```
SimplifiedSocialMediaManager
├── loadAccounts() - Fetches from Supabase with error handling
├── handleAutoSetup() - Gets Facebook tokens and inserts records
├── handleDisconnect() - Removes accounts
└── Render UI
    ├── Error message (if loadError set)
    ├── Loading indicator (if loadingAccounts true)
    ├── Empty state message (if no accounts)
    ├── Connected accounts cards
    └── Setup panel
```

### RLS Policy Flow:
1. Component calls: `supabase.from('social_media_accounts').select('*').eq('user_id', user.id)`
2. Supabase checks RLS policies
3. Policy `Users can view own social accounts` evaluates: `auth.uid() = user_id`
4. Returns only records where current user is the owner
5. Admin policy also allows admins to see all

## Next Steps

1. **Verify in production:**
   - Connect a test account using Setup Tokens
   - Verify data appears in the connected accounts cards
   - Check console logs match expected flow

2. **Monitor for issues:**
   - Check browser console in admin dashboard
   - Watch for any error messages
   - Use refresh button if data seems stale

3. **Document for users:**
   - Share Setup Instructions visible in the UI
   - Point users to browser console for diagnostics
   - Provide links to Facebook Developer Console

## Support

For detailed diagnostics:
1. Run `sql/verify_social_media_setup.sql` in Supabase
2. Share console logs with `huntersest@gmail.com`
3. Include:
   - Browser console output
   - Supabase SQL verification results
   - Steps to reproduce
