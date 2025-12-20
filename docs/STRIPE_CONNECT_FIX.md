# Stripe Connect Setup Fix

## Problem
Edge Function `create-connect-account` returns error:
```
"You can only create new accounts if you've signed up for Connect"
```

## Solution

Stripe Connect must be enabled in your Stripe Dashboard:

### 1. Enable Stripe Connect

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Settings** (top right)
3. Navigate to **Connect** → **Overview**
4. Click **Enable Connect** or **Get Started**
5. Complete the onboarding questionnaire:
   - **Platform type**: Marketplace or platform
   - **Business model**: Select your model (EventNexus is a marketplace/platform)
   - **Integration type**: Express (recommended for simpler setup)

### 2. Configure Connect Settings

After enabling Connect:

1. Go to **Connect** → **Settings**
2. Set **Account types**: Enable **Express accounts**
3. Configure **Branding**:
   - Platform name: EventNexus
   - Icon: Upload logo
   - Color: Match your brand
4. Set **Legal entity**: Your business details

### 3. Update Environment Variables (if needed)

Ensure your Supabase Edge Function has the correct Stripe key:

```bash
# In Supabase Dashboard → Project Settings → Edge Functions → Secrets
STRIPE_SECRET_KEY=sk_test_...  # Must be from an account with Connect enabled
```

### 4. Test the Integration

After enabling Connect:

1. Clear browser cache
2. Visit: https://eventnexus.eu/#/dashboard
3. Click "Connect Bank Account"
4. Should redirect to Stripe onboarding

## Important Notes

- **Test Mode**: Enable Connect in both test and live modes
- **Live Mode**: Additional verification required before going live
- **Platform Fee**: Configure application fee structure in Connect settings
- **Payouts**: Set payout schedules (EventNexus uses 2-day post-event payouts)

## Links

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Enable Connect Guide](https://stripe.com/docs/connect/enable-payment-acceptance-guide)
- [Express Accounts](https://stripe.com/docs/connect/express-accounts)

## Current Edge Function Status

✅ Code is correct and ready
❌ Stripe Connect not enabled on account
🔧 Fix: Enable Connect in Stripe Dashboard

Once Connect is enabled, the Edge Function will work without code changes.
