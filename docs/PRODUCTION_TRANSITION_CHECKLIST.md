# Production Transition - Deployment Checklist

## Pre-Deployment Verification

- [x] TypeScript builds without errors
- [x] All components compile correctly
- [x] Edge Function is valid Deno code
- [x] SQL migration syntax is correct
- [x] All imports are in place
- [x] Security policies are implemented

---

## Deployment Steps

### ⚠️ IMPORTANT: Deploy in This Order

#### Phase 1: Database (Supabase Dashboard)

- [ ] Log in to Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Open file: `sql/production_transition.sql`
- [ ] Copy entire file contents
- [ ] Paste into SQL Editor
- [ ] Review for any obvious issues
- [ ] Click **RUN** button
- [ ] Wait for ✅ success confirmation
- [ ] Note: Should complete in 5-10 seconds

**Verification:**
```sql
-- Run this to verify tables exist:
SELECT * FROM environment_config LIMIT 1;
SELECT * FROM production_transition_log LIMIT 1;
-- Should not error
```

#### Phase 2: Edge Function (Terminal)

- [ ] Open terminal
- [ ] Navigate to project root: `cd /workspaces/EventNexus`
- [ ] Deploy function:
  ```bash
  supabase functions deploy production-transition
  ```
- [ ] Wait for ✅ deployment confirmation
- [ ] Should complete in 30-60 seconds

**Verification:**
```bash
# Check function exists in Supabase Dashboard:
# Functions > production-transition > Should show "Deployed"

# Check logs:
supabase functions logs production-transition
```

#### Phase 3: Configuration (Supabase Dashboard)

- [ ] In Supabase Dashboard, go to Functions
- [ ] Click on `production-transition`
- [ ] Verify `verify_jwt = true` in settings
- [ ] Should already be set in `config.toml`

#### Phase 4: Frontend (Already Done)

- [x] Code is already deployed in `components/AdminCommandCenter.tsx`
- [x] Functions imported in `services/dbService.ts`
- [x] No additional frontend deployment needed

#### Phase 5: Build & Test

- [ ] Run build to verify everything compiles:
  ```bash
  npm run build
  ```
- [ ] Should complete with ✅ success (ignore chunk size warnings)

---

## Post-Deployment Testing

### 1. Verify Database

```sql
-- In Supabase SQL Editor, run:

-- Check environment_config table
SELECT environment, is_active, stripe_mode FROM environment_config;
-- Expected: One row with environment='development', is_active=true, stripe_mode='test'

-- Check current environment function
SELECT * FROM get_current_environment();
-- Expected: environment='development', stripe_mode='test'

-- Check log table structure
SELECT COUNT(*) FROM production_transition_log;
-- Expected: 0 (no transitions yet)
```

### 2. Verify Edge Function

```bash
# Check function deployment
supabase functions list
# Should show: production-transition ✓ Deployed

# Check function logs (no errors expected)
supabase functions logs production-transition
# Should show function is ready
```

### 3. Verify UI Integration

1. [ ] Start dev server: `npm run dev`
2. [ ] Navigate to `http://localhost:3000`
3. [ ] Log in as admin user
4. [ ] Go to **Infrastructure** tab
5. [ ] Look for **System Health** section
6. [ ] Find **"Go Live Production"** button (red button with rocket icon)
7. [ ] Button should be visible in the System Integrity panel

### 4. Test Modal (Don't Confirm!)

1. [ ] Click **"Go Live Production"** button
2. [ ] Should prompt for Master Security authentication
3. [ ] Authenticate (use existing Master Auth flow)
4. [ ] Modal should appear with:
   - Warning box (red)
   - Configuration summary (current settings)
   - Confirmation text input field
   - Cancel & "Go Live Now" buttons
5. [ ] Try typing wrong confirmation text - button should remain disabled
6. [ ] Type exactly: `TRANSITION_TO_PRODUCTION` (case-sensitive)
7. [ ] Button should become enabled
8. [ ] **DO NOT CLICK** "Go Live Now" unless you're ready to transition!
9. [ ] Click Cancel to close modal

---

## Actual Transition (When Ready)

### Pre-Transition Checklist

- [ ] All team members notified
- [ ] Backup created (recommended: take Supabase backup)
- [ ] All critical services verified as working
- [ ] Admin has verified Stripe live keys are configured
- [ ] Rollback plan documented (saved in team docs)
- [ ] Message prepared for users about beta feature deprecation

### Execute Transition

1. [ ] Log in as admin
2. [ ] Go to Infrastructure > System Health
3. [ ] Click **"Go Live Production"**
4. [ ] Authenticate with Master Security
5. [ ] Review warnings one final time
6. [ ] Type: `TRANSITION_TO_PRODUCTION`
7. [ ] Click **"Go Live Now"**
8. [ ] Wait for success notification
9. [ ] Note the transition ID shown in success message

### Verify Transition Completed

```sql
-- Run in Supabase SQL Editor:

-- Check current environment
SELECT * FROM get_current_environment();
-- Should show: environment='production', stripe_mode='live'

-- Check transition log
SELECT * FROM production_transition_log ORDER BY transition_date DESC LIMIT 1;
-- Should show status='completed', environment_to='production'

-- Verify system config was updated
SELECT key, value FROM system_config WHERE key IN ('stripe_config', 'platform_mode');
```

### Post-Transition Checks

- [ ] All admin users received notification
- [ ] Stripe is confirmed in live mode (check dashboard)
- [ ] No errors in Supabase logs
- [ ] Payments page shows production Stripe integration
- [ ] Critical paths tested (create event, process payment, etc.)
- [ ] Monitor for any user reports of issues

---

## Rollback Procedure (Emergency Only)

**⚠️ WARNING:** Rollback is MANUAL. Only do this if something goes wrong.

```sql
-- Step 1: Disable production environment
UPDATE environment_config 
SET is_active = false 
WHERE environment = 'production';

-- Step 2: Re-enable development environment
UPDATE environment_config 
SET is_active = true 
WHERE environment = 'development';

-- Step 3: Re-enable beta features
UPDATE system_config
SET value = jsonb_build_object(
  'environment', 'development',
  'beta_features_enabled', true,
  'sandbox_enabled', true
)
WHERE key = 'platform_mode';

-- Step 4: Manually disable stripe_mode
UPDATE system_config
SET value = jsonb_build_object('mode', 'test')
WHERE key = 'stripe_config';

-- Step 5: Re-enable beta testers
UPDATE beta_testers SET is_active = true WHERE is_active = false;

-- Step 6: Unarchive beta invitations
UPDATE beta_invitations SET status = 'pending' WHERE status = 'archived';

-- Step 7: Verify
SELECT * FROM get_current_environment();
-- Should show environment='development', stripe_mode='test'
```

**Then:**
1. Manually switch Stripe back to test mode in Stripe Dashboard
2. Notify team of rollback
3. Investigate what caused the issue
4. Re-attempt transition after fixes

---

## Common Issues & Solutions

### Issue: "Admin access required" Error

**Cause:** User doesn't have `role = 'admin'`

**Solution:**
```sql
-- Check user role
SELECT email, role FROM users WHERE email = 'admin@example.com';

-- Update role if needed
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

---

### Issue: Master Security Lock Not Working

**Cause:** Master auth modal not displaying

**Solution:**
- [ ] Verify `MasterAuthModal` component exists
- [ ] Check browser console for errors
- [ ] Clear browser cache
- [ ] Try incognito/private window
- [ ] Check that `isMasterLocked` state is managed correctly

---

### Issue: Edge Function Returns 403 Error

**Cause:** JWT verification failing

**Solution:**
```bash
# Check Edge Function logs
supabase functions logs production-transition

# Look for: "Invalid token" or "Unauthorized"

# Try redeploying:
supabase functions deploy production-transition

# Check config.toml has:
[functions.production-transition]
verify_jwt = true
```

---

### Issue: Confirmation Text Won't Validate

**Cause:** Typo or case mismatch

**Solution:**
- [ ] Must be exactly: `TRANSITION_TO_PRODUCTION` (ALL CAPS)
- [ ] No extra spaces before/after
- [ ] Copy-paste to avoid typos:
  ```
  TRANSITION_TO_PRODUCTION
  ```

---

### Issue: Transition Hangs or Doesn't Complete

**Cause:** Edge Function timeout or database lock

**Solution:**
1. [ ] Check Edge Function logs: `supabase functions logs production-transition`
2. [ ] Check Supabase database activity
3. [ ] Wait 5 minutes - may still be processing
4. [ ] Verify transition actually happened:
   ```sql
   SELECT * FROM get_current_environment();
   ```
5. [ ] If really stuck, check Supabase status page for outages

---

## Success Indicators

✅ **You know it worked when:**

1. Success notification appears in admin UI
2. No errors in browser console
3. No errors in Edge Function logs
4. Database shows: `environment='production'`
5. Database shows: `stripe_mode='live'`
6. All admin users received notification
7. Payment page shows production Stripe

---

## Monitoring After Transition

### Daily Checks (First Week)

```bash
# Check for any errors
supabase functions logs production-transition
supabase functions logs platform-stats

# Monitor database
# Supabase Dashboard > Logs > Postgres

# Check Stripe integration
# Stripe Dashboard > Payments (should show real transactions)
```

### Weekly Checks

```sql
-- Verify system is still in production
SELECT * FROM get_current_environment();

-- Check for any transition issues
SELECT * FROM production_transition_log;

-- Monitor system health
SELECT * FROM infrastructure_stats;
```

---

## Documentation Files

- 📖 [PRODUCTION_TRANSITION.md](./PRODUCTION_TRANSITION.md) - Full technical docs
- 🚀 [PRODUCTION_TRANSITION_SETUP.md](./PRODUCTION_TRANSITION_SETUP.md) - Quick start
- 📋 [PRODUCTION_TRANSITION_IMPLEMENTATION.md](./PRODUCTION_TRANSITION_IMPLEMENTATION.md) - Implementation summary
- ✅ **PRODUCTION_TRANSITION_CHECKLIST.md** (this file) - Deployment steps

---

## Contact & Support

**Primary Contact:** huntersest@gmail.com

**If Issues Occur:**
1. Check this checklist for common issues
2. Review [PRODUCTION_TRANSITION.md](./PRODUCTION_TRANSITION.md) for detailed info
3. Check Edge Function logs
4. Contact maintainer if unresolved

---

## Sign-Off

**Deployed by:** ___________________________
**Date:** ___________________________
**Verified by:** ___________________________
**Date:** ___________________________

---

**Last Updated:** December 26, 2024
**Status:** ✅ Ready for Production
