# Stripe Subscription Upgrade - Quick Fix

Use this two-minute checklist to clear the 406 error when upgrading subscriptions.

## Steps
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new
2. Run [sql/stripe/FIX_STRIPE_PUBLIC_KEY_RLS.sql](../../sql/stripe/FIX_STRIPE_PUBLIC_KEY_RLS.sql).
3. Update the Stripe public key:

```sql
UPDATE public.system_config
SET value = '"pk_test_YOUR_KEY_HERE"'::jsonb
WHERE key = 'stripe_public_key';
```

Get the key from https://dashboard.stripe.com/test/apikeys.
4. Confirm secrets in Supabase Functions: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM, STRIPE_PRICE_ENTERPRISE.
5. Test at https://www.eventnexus.eu/#/pricing.

## Verification
```sql
SELECT value FROM public.system_config WHERE key = 'stripe_public_key';
```
- Expect a JSON string like "pk_test_...".
- If it errors, re-run the policy script or review pg_policies for system_config.

## Troubleshooting
- 406 error persists: re-run the RLS fix and verify policies on system_config.
- "Stripe public key not configured": update the value with a real key from Stripe Dashboard.
- Checkout fails or price missing: ensure all Stripe secrets are set or run `bash fix-subscription-checkout.sh`.

## References
- [STRIPE_SUBSCRIPTION_ERROR_FIX.md](STRIPE_SUBSCRIPTION_ERROR_FIX.md)
- [../STRIPE_SETUP.md](../STRIPE_SETUP.md)
- [SUBSCRIPTION_CHECKOUT_FIX.md](SUBSCRIPTION_CHECKOUT_FIX.md)

## Support
- Email: huntersest@gmail.com
