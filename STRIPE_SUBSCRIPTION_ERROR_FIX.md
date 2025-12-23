# Stripe Subscription Upgrade Error Fix

## Problem
When users try to upgrade to Premium/Pro/Enterprise subscription, they get this error:
```
GET https://anlivujgkjmajkcgbaxw.supabase.co/rest/v1/system_config?select=value&key=eq.stripe_public_key 406 (Not Acceptable)
Stripe public key not configured
Subscription upgrade failed: Error: Failed to create checkout session
```

## Root Cause
The `system_config` table has **overly restrictive RLS policies** that block non-admin users from reading the `stripe_public_key`. Two conflicting migrations created this issue:

1. Migration `20250119000003_stripe_integration.sql` - Allowed authenticated users to read
2. Migration `20241221000004_system_config_complete.sql` - Restricted to admin-only (applied later, overrode previous)

## Solution

### Step 1: Fix RLS Policies
Run this in **Supabase SQL Editor**: [FIX_STRIPE_PUBLIC_KEY_RLS.sql](FIX_STRIPE_PUBLIC_KEY_RLS.sql)

Or go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

The fix creates these policies:
1. ✅ **Anyone can read stripe_public_key** - Critical for checkout
2. ✅ **Admins can read all config** - For admin panel
3. ✅ **Admins can manage config** - For admin panel
4. ✅ **Service role full access** - For migrations

### Step 2: Verify Configuration
Run [CHECK_STRIPE_CONFIG.sql](CHECK_STRIPE_CONFIG.sql) to see current Stripe setup:

```sql
SELECT key, value, updated_at
FROM public.system_config 
WHERE key LIKE '%stripe%';
```

Expected result:
```
key                  | value                  | updated_at
---------------------|------------------------|-------------------------
stripe_public_key    | "pk_test_..."          | 2025-12-23 10:30:00+00
```

### Step 3: Insert/Update Stripe Public Key

If the key is missing or is placeholder `pk_test_YOUR_KEY_HERE`, update it:

```sql
UPDATE public.system_config 
SET 
  value = '"pk_test_YOUR_ACTUAL_KEY_FROM_STRIPE_DASHBOARD"'::jsonb,
  updated_at = NOW()
WHERE key = 'stripe_public_key';
```

**Where to find your Stripe key:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy **Publishable key** (starts with `pk_test_` for test mode)
3. Paste it into the SQL above

### Step 4: Verify Edge Functions Have Secrets

Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions

Ensure these secrets are set:
- ✅ `STRIPE_SECRET_KEY` (sk_test_...)
- ✅ `STRIPE_WEBHOOK_SECRET` (whsec_...)
- ✅ `STRIPE_PRICE_PRO` (price_1SgXusJ9WsSrj5gMbJdADsvy)
- ✅ `STRIPE_PRICE_PREMIUM` (price_1SgXwZJ9WsSrj5gMehBiDgWp)
- ✅ `STRIPE_PRICE_ENTERPRISE` (price_1SgXxRJ9WsSrj5gMLhDEB26O)

If any are missing, set them:
```bash
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_..." --project-ref anlivujgkjmajkcgbaxw
```

## Testing

1. **Test RLS Policy:**
   ```sql
   -- This should work now (no 406 error)
   SELECT value FROM public.system_config WHERE key = 'stripe_public_key';
   ```

2. **Test Frontend:**
   - Go to https://www.eventnexus.eu/#/pricing
   - Click "Upgrade to Pro"
   - Should redirect to Stripe checkout (no console errors)

3. **Check Browser Console:**
   - Should see successful GET request
   - Should see Stripe checkout URL
   - No "Stripe public key not configured" error

## Common Issues

### Issue: Still getting 406 error
**Fix:** RLS policy didn't apply. Re-run [FIX_STRIPE_PUBLIC_KEY_RLS.sql](FIX_STRIPE_PUBLIC_KEY_RLS.sql)

### Issue: "Stripe public key not configured"
**Fix:** Key is missing or placeholder. Update with real key (Step 3 above)

### Issue: Redirects but checkout fails
**Fix:** Edge Function secrets missing. Check Step 4 above.

### Issue: "Subscription price not configured for tier: premium"
**Fix:** Price IDs not set in Edge Function secrets. Run:
```bash
bash fix-subscription-checkout.sh
```

## Files Created
- ✅ `supabase/migrations/20251223000002_fix_stripe_public_key_access.sql` - Migration file
- ✅ `FIX_STRIPE_PUBLIC_KEY_RLS.sql` - Manual SQL script (use this)
- ✅ `CHECK_STRIPE_CONFIG.sql` - Verification script
- ✅ `STRIPE_SUBSCRIPTION_ERROR_FIX.md` - This file

## Technical Details

### Why RLS Was Blocking Access
```typescript
// Frontend code in services/stripeService.ts
const { data } = await supabase
  .from('system_config')
  .select('value')
  .eq('key', 'stripe_public_key')  // ❌ RLS blocked this
  .single();
```

### Old Policy (Broken)
```sql
-- Only admins could read anything
CREATE POLICY "Admin full access to system_config"
ON public.system_config
FOR ALL
TO authenticated
USING (users.role = 'admin');  -- ❌ Blocked regular users
```

### New Policy (Fixed)
```sql
-- Anyone can read stripe_public_key
CREATE POLICY "Anyone can read stripe_public_key"
ON public.system_config
FOR SELECT
USING (key = 'stripe_public_key');  -- ✅ Public read for this key only
```

## Related Documentation
- [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) - Full Stripe integration guide
- [SUBSCRIPTION_CHECKOUT_FIX.md](SUBSCRIPTION_CHECKOUT_FIX.md) - Previous checkout fix
- [docs/STRIPE_WEBHOOK_SETUP.md](docs/STRIPE_WEBHOOK_SETUP.md) - Webhook configuration

## Status
- ✅ RLS policies fixed
- ✅ Migration created
- ⚠️ **ACTION REQUIRED:** Run SQL script in Supabase SQL Editor
- ⚠️ **ACTION REQUIRED:** Verify/update Stripe public key in database
