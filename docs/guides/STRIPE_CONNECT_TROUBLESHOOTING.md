# Stripe Connect Onboarding Troubleshooting

## Issue Fixed: Return URL Mismatch
**Problem:** After completing Stripe Connect onboarding, users were redirected to `/#/dashboard?connect=success` but the verification logic was on the `/profile` page, causing the verification to never trigger.

**Solution:** Updated return URLs in `create-connect-account` Edge Function to point to `/profile` instead of `/dashboard`.

## Current Flow

### 1. User Clicks "Set Up Payouts"
Location: `UserProfile.tsx` → Organizer Studio section

```typescript
// Calls createConnectAccount(userId, email)
// Creates or retrieves Stripe Connect account
// Returns onboarding URL
```

### 2. Redirect to Stripe
```
https://connect.stripe.com/setup/...
```
User completes:
- Business/personal information
- Identity verification
- Bank account details
- Tax information (if required)

### 3. Return to Platform
**Success:** `https://www.eventnexus.eu/#/profile?connect=success`  
**Refresh:** `https://www.eventnexus.eu/#/profile?connect=refresh`

### 4. Verification Triggered
`UserProfile.tsx` `useEffect` detects `?connect=success` parameter:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  const connectParam = params.get('connect');
  
  if (connectParam === 'success' || connectParam === 'refresh') {
    // Call verifyConnectOnboarding(userId)
  }
}, [user.id]);
```

### 5. Edge Function Verification
`verify-connect-onboarding/index.ts`:

```typescript
// 1. Get user's stripe_connect_account_id from database
// 2. Fetch account status from Stripe API
// 3. Update database with current status:
//    - stripe_connect_onboarding_complete
//    - stripe_connect_charges_enabled
//    - stripe_connect_payouts_enabled
// 4. Send notification if newly completed
// 5. Return status to frontend
```

### 6. Frontend Updates
- Updates `connectStatus` state
- Removes `?connect=success` from URL
- Shows success alert if onboarding complete
- Updates UI to show "Manage Payouts" button

## Logging Added for Debugging

### Edge Function Logs (`verify-connect-onboarding`)
```
🔄 verify-connect-onboarding called for user: [userId]
📋 Fetching Stripe account: [accountId]
✅ Stripe account retrieved: {details}
✅ Database updated with Connect status
🎉 Onboarding just completed! Sending notification...
✅ Notification sent
✅ Verification complete, returning response
```

### Error Logs
```
❌ Missing userId in request
❌ Database error fetching user: [details]
⚠️ User does not have a Connect account ID
❌ Failed to update user Connect status: [error]
❌ Failed to send notification: [error]
❌ verify-connect-onboarding error: [details]
```

### Frontend Console Logs (`UserProfile.tsx`)
```
🔄 UserProfile: Returned from Stripe Connect, param: success
📍 Current URL: [url]
📞 Calling verifyConnectOnboarding for user: [userId]
📥 verifyConnectOnboarding response: [result]
✅ Connect verification successful: {status}
⚠️ Connect verification returned no success flag
❌ Error verifying Connect status: [error]
🧹 Cleaning up URL query params
```

## Checking Logs in Supabase

### 1. Go to Supabase Dashboard
```
https://supabase.com/dashboard/project/[PROJECT_ID]
```

### 2. Navigate to Edge Functions
```
Left sidebar → Edge Functions → verify-connect-onboarding
```

### 3. View Logs
```
Logs tab → Real-time or Historical
```

Look for:
- 🔄 Call initiation
- ✅ Success indicators
- ❌ Error messages
- Response payloads

### 4. Check Browser Console
```
F12 → Console tab
```

Look for:
- 🔄 Return detection
- 📞 API calls
- 📥 Responses
- ❌ Errors

## Common Issues & Solutions

### Issue 1: No logs appear
**Cause:** Function not being called  
**Check:**
- Is URL `/#/profile?connect=success`?
- Open browser console - any errors?
- Is `useEffect` triggering? (check console for 🔄 log)

### Issue 2: "User does not have a Connect account"
**Cause:** Account creation failed  
**Solution:**
- Check `create-connect-account` function logs
- Verify STRIPE_SECRET_KEY is set
- Check `users` table - is `stripe_connect_account_id` NULL?

### Issue 3: "Failed to update user Connect status"
**Cause:** Database permission issue  
**Solution:**
- Check RLS policies on `users` table
- Verify SUPABASE_SERVICE_ROLE_KEY has full access
- Check database logs in Supabase Dashboard

### Issue 4: Onboarding shows as incomplete despite finishing
**Cause:** Stripe account not fully verified  
**Check:**
```sql
SELECT 
  stripe_connect_account_id,
  stripe_connect_onboarding_complete,
  stripe_connect_charges_enabled,
  stripe_connect_payouts_enabled
FROM users
WHERE id = '[USER_ID]';
```

**Stripe Dashboard:**
- Go to Connect → Accounts
- Find account by ID
- Check "Requirements" section
- See what's missing (usually identity verification)

### Issue 5: URL doesn't have `?connect=success`
**Cause:** Return URL misconfigured  
**Check:**
- `create-connect-account/index.ts` has correct URLs
- PLATFORM_URL environment variable is correct
- Stripe accountLinks.create uses proper URLs

## Testing in Development

### Test Mode
1. Use Stripe test keys (`sk_test_...`)
2. Complete onboarding with test data:
   - Business name: "Test Business"
   - Test SSN: `000-00-0000` (US) or skip for other countries
   - Test bank: Test routing/account numbers
3. Identity verification: Skip or use test documents

### Expected Behavior
✅ Redirect to `/#/profile?connect=success`  
✅ See 🔄 logs in console  
✅ Alert: "Payment setup complete!"  
✅ Button changes to "Manage Payouts"  
✅ Ticket purchase buttons become active  

## Manual Database Fix

If verification fails but Stripe account is actually complete:

```sql
-- Check Stripe account status first in Stripe Dashboard
-- Then manually update if confirmed:

UPDATE users 
SET 
  stripe_connect_onboarding_complete = true,
  stripe_connect_details_submitted = true,
  stripe_connect_charges_enabled = true,
  stripe_connect_payouts_enabled = true
WHERE id = '[USER_ID]';
```

## Environment Variables Required

### Edge Functions Need:
```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PLATFORM_URL=https://www.eventnexus.eu (production)
```

### Verify in Supabase:
```
Dashboard → Settings → Edge Functions → Secrets
```

## Related Files
- `/supabase/functions/create-connect-account/index.ts` - Creates account & onboarding link
- `/supabase/functions/verify-connect-onboarding/index.ts` - Verifies completion
- `/components/UserProfile.tsx` - Frontend logic
- `/services/dbService.ts` - API wrappers

## Next Steps After Fix
1. ✅ Deploy updated Edge Functions to Supabase
2. ✅ Test complete flow in browser
3. ✅ Check Supabase logs for emoji indicators
4. ✅ Verify database updates correctly
5. ✅ Test ticket purchase enablement
