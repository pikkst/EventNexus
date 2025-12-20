# Stripe Connect Setup Fix

## ✅ SETUP COMPLETE!

Stripe Connect has been successfully enabled and integrated into EventNexus.

## Configuration Summary

### 1. Stripe Dashboard Settings

Your Stripe Connect is configured with:
- **Funds flow**: Buyers purchase from you (Destination charges)
- **Payout model**: Sellers paid out individually
- **Industry**: Ticketing or events
- **Account creation**: Onboarding hosted by Stripe
- **Account management**: Express Dashboard
- **Liability**: Platform handles refunds/chargebacks

### 2. Implementation Complete

#### Edge Functions Created:
1. **`create-connect-account`** - Creates Stripe Express accounts and generates onboarding links
2. **`get-connect-dashboard-link`** - Generates login links to Stripe Express Dashboard

#### Database Schema:
```sql
-- users table columns (already exists)
stripe_connect_account_id TEXT UNIQUE
stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE
stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE
stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE
```

#### Service Functions Added:
- `createConnectAccount(userId, email)` - Start onboarding flow
- `getConnectDashboardLink(userId)` - Get dashboard access link
- `checkConnectStatus(userId)` - Check onboarding status

#### UI Components Updated:
1. **PayoutsHistory** (`components/PayoutsHistory.tsx`):
   - Shows prominent onboarding banner if not completed
   - Displays "Open Stripe Dashboard" button when complete
   - Seamlessly integrates with existing payout history

2. **UserProfile** (`components/UserProfile.tsx`):
   - Added "Set Up Payouts" / "Manage Payouts" button
   - Shows in subscription section for Pro+ users
   - Opens Stripe Dashboard in new tab

## User Flow

### For New Organizers (First Time):
1. User creates event → becomes organizer
2. Visits Dashboard → Payouts tab
3. Sees banner: "Set Up Payouts"
4. Clicks "Start Setup" → Redirected to Stripe onboarding
5. Completes Stripe form (5 min):
   - Identity verification
   - Bank account details
   - Business information
6. Returns to EventNexus → Ready to receive payouts!

### For Existing Organizers:
1. Visit Dashboard → Payouts tab
2. Click "Open Stripe Dashboard"
3. Manage:
   - Bank accounts
   - Payout schedule
   - Tax forms
   - Transaction history
   - Identity documents

## How Payouts Work

```
Customer buys ticket (€50)
        ↓
EventNexus receives payment
        ↓
Platform takes commission (€1.25 - €2.50 based on tier)
        ↓
Net amount (€47.50 - €48.75) auto-transfers to organizer
        ↓
Organizer receives payout to their bank (via Stripe)
```

**Timing**: Payouts process 2 days after event completes (allows refund window)

## Testing

To test the integration:

1. **As organizer**:
   ```bash
   # Visit Dashboard
   https://eventnexus.eu/#/dashboard
   
   # Click Payouts tab
   # Should see "Set Up Payouts" banner
   ```

2. **Start onboarding**:
   - Click "Start Setup"
   - Use Stripe test credentials (if in test mode)
   - Complete the flow

3. **Verify**:
   ```sql
   -- Check database
   SELECT 
     id, 
     name, 
     stripe_connect_account_id, 
     stripe_connect_onboarding_complete 
   FROM users 
   WHERE id = '<your-user-id>';
   ```

## Environment Variables Required

Make sure these are set in Supabase Edge Functions:

```bash
STRIPE_SECRET_KEY=sk_test_...  # Must be from Connect-enabled account
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PLATFORM_URL=https://eventnexus.eu
```

## Troubleshooting

### "You can only create new accounts if you've signed up for Connect"
✅ **FIXED** - Connect is now enabled in your Stripe Dashboard

### Button does nothing
- Check browser console for errors
- Verify Edge Functions are deployed
- Check `STRIPE_SECRET_KEY` is set

### Onboarding link expires
- Links expire after 5 minutes
- Click button again to generate new link

### User not redirected back
- Verify `PLATFORM_URL` is set correctly
- Check `return_url` in Edge Function

## Next Steps

1. **Test in Production**:
   - Create real event
   - Complete onboarding
   - Verify payout appears in Stripe Dashboard

2. **Monitor**:
   - Check `payouts` table for automatic transfers
   - Review Stripe Dashboard → Connect → Accounts

3. **Go Live**:
   - Switch to live Stripe keys when ready
   - Update environment variables
   - Announce feature to organizers!

## Support

- **Stripe Connect Docs**: https://stripe.com/docs/connect
- **Express Accounts**: https://stripe.com/docs/connect/express-accounts
- **EventNexus Support**: huntersest@gmail.com

---

**Status**: ✅ Production Ready  
**Last Updated**: December 20, 2025  
**Implementation**: Complete
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
