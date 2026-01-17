# Mobile App Login Fix - Deployment Guide

## Problem
Mobile app users cannot login successfully due to:
1. Missing user profile creation after authentication
2. RLS policies blocking profile access
3. OAuth users not getting proper profiles

## Solution Files Created

### 1. Migration File
`/workspaces/EventNexus/supabase/migrations/20260106000001_fix_mobile_login.sql`

This migration:
- ✅ Fixes RLS policies for authenticated users
- ✅ Allows anonymous users to view public organizer profiles
- ✅ Improves `handle_new_user` trigger with better error handling
- ✅ Creates `get_or_create_user_profile()` helper function
- ✅ Handles OAuth metadata properly (Google, Facebook, etc.)

### 2. Android App Update
`mobile/android/EventNexusLiveMap/app/src/main/java/eu/eventnexus/livemap/data/repository/AuthRepository.kt`

Changes:
- ✅ Added `rpc` import for database functions
- ✅ Updated `handleAuthSuccess()` to use `get_or_create_user_profile()`
- ✅ Added fallback logic for profile retrieval
- ✅ Simplified `signUp()` to rely on trigger

## Deployment Steps

### Step 1: Apply Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire content from:
   ```
   /workspaces/EventNexus/supabase/migrations/20260106000001_fix_mobile_login.sql
   ```
5. Paste into SQL Editor
6. Click **Run** (or press `Ctrl+Enter`)
7. Verify success messages appear

**Option B: Supabase CLI**
```bash
cd /workspaces/EventNexus
npx supabase db push
```

### Step 2: Rebuild Android App

```bash
cd /workspaces/EventNexus/mobile/android/EventNexusLiveMap
./gradlew clean assembleDebug
```

### Step 3: Test the Fix

#### Test Email/Password Login
1. Install updated APK on test device
2. Open EventNexus Live Map
3. Try to sign up with new email
4. Should successfully create account and show profile
5. Sign out and sign in again
6. Should work without errors

#### Test Existing Users
1. Sign in with existing credentials
2. Profile should load correctly
3. Check tickets, radar, and map features

### Step 4: Verify Database State

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check RLS policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Check if trigger exists
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check if helper function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_or_create_user_profile';

-- Test the helper function (after logging in)
SELECT * FROM public.get_or_create_user_profile();
```

## Expected Results

### Before Fix
❌ Login succeeds but profile query fails  
❌ "Failed to get user profile" errors  
❌ OAuth users can't access their data  
❌ Tickets page shows "Please Login"  

### After Fix
✅ Login succeeds and profile loads immediately  
✅ New signups automatically create profiles  
✅ OAuth users get proper profiles with name/avatar  
✅ All features accessible after login  

## Rollback Plan

If issues occur, run this SQL to revert:

```sql
-- Revert to previous handle_new_user function
-- (backup the previous version from migration 20260101000002_fix_oauth_user_creation.sql)

-- Remove helper function
DROP FUNCTION IF EXISTS public.get_or_create_user_profile();

-- Android app: revert AuthRepository.kt to previous commit
```

## Testing Checklist

- [ ] New email/password signup works
- [ ] Email/password login works
- [ ] OAuth login works (Google)
- [ ] Profile data displays correctly
- [ ] Tickets page loads for authenticated users
- [ ] Radar works
- [ ] Map loads events
- [ ] Logout and re-login works

## Monitoring

After deployment, monitor:
1. Supabase Logs (for trigger errors)
2. App crash reports (for authentication failures)
3. User support tickets about login issues

## Additional Notes

### Why This Fix Works

1. **Better RLS Policies**: Authenticated users can now properly query their own profile
2. **Robust Trigger**: Handles all OAuth providers and edge cases
3. **Helper Function**: Mobile app can force profile creation if trigger fails
4. **Fallback Logic**: Multiple layers ensure users can always access their data

### Performance Impact

- ✅ No performance degradation
- ✅ Database function cached by PostgreSQL
- ✅ No additional network requests

### Security

- ✅ RLS policies still enforce user isolation
- ✅ Users can only access their own data
- ✅ Anonymous users can only view public profiles
- ✅ SECURITY DEFINER functions validated

## Support

If issues persist after deployment:
1. Check Supabase logs for trigger errors
2. Verify migration applied successfully
3. Check Android app logs for specific error messages
4. Contact: huntersest@gmail.com

---

**Migration Status**: Ready for deployment  
**Risk Level**: Low (has fallbacks)  
**Testing**: Required before production release
