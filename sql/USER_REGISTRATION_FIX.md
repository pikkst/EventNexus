# User Registration Fix

## Problem
New users can register and confirm their email, but cannot log in. Error shows:
- "Error in getUser: Error: Query timeout"
- "User profile result: ❌ null"

## Root Cause
The `handle_new_user()` trigger function was using outdated column names:
- Old: `subscription` 
- New: `subscription_tier` and `subscription_status`

This caused the trigger to fail silently when creating user profiles.

## Solution

### Quick Fix (Run in Supabase SQL Editor)

Run the complete fix script:
```bash
sql/COMPLETE_USER_REGISTRATION_FIX.sql
```

This script will:
1. ✅ Update the trigger function with correct column names
2. ✅ Recreate the trigger to ensure it's enabled
3. ✅ Create missing profiles for all confirmed users without profiles
4. ✅ Verify everything is working

### Manual Steps (if needed)

1. **Fix the trigger** - Run `sql/fix-trigger-columns.sql`
2. **Create missing profile** - Run `sql/fix-missing-profile.sql` (update email if needed)
3. **Verify** - Run `sql/check-trigger-status.sql`

## Testing

After running the fix:

1. Try logging in with the existing account (3dcutandengrave@gmail.com)
2. Create a new test account to verify the trigger works
3. Check that profile appears immediately after email confirmation

## Prevention

The updated trigger now:
- Uses correct column names (`subscription_tier`, `subscription_status`)
- Has better error handling with warnings
- Logs errors instead of failing silently

## Files Created

- `COMPLETE_USER_REGISTRATION_FIX.sql` - Main fix script (run this)
- `fix-trigger-columns.sql` - Just the trigger fix
- `fix-missing-profile.sql` - Create profile for specific user
- `check-trigger-status.sql` - Diagnostic queries
