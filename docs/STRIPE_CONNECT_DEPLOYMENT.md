# Stripe Connect Implementation - Deployment Guide

## 🎯 Overview

This implementation adds **Stripe Connect** to EventNexus, enabling:
- ✅ Organizers receive payouts automatically
- ✅ Platform takes commission (1.5-5% based on tier)
- ✅ Post-event payouts (2 days after event)
- ✅ Automated refund handling
- ✅ Complete payout tracking

---

## 📋 Prerequisites

- [x] Supabase project set up
- [x] Stripe account (use test mode for testing)
- [ ] Stripe Connect enabled on your account
- [ ] Supabase CLI installed

---

## 🚀 Step-by-Step Deployment

### 1. Enable Stripe Connect

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/connect/accounts/overview)
2. Click "Get started" on Connect
3. Choose "Platform or marketplace"
4. Complete the onboarding questionnaire

### 2. Get Stripe API Keys

From [Stripe API Keys](https://dashboard.stripe.com/test/apikeys):

- **Secret Key** (starts with `sk_test_...`)
- **Webhook Secret** (we'll create this in step 4)

### 3. Deploy Database Migrations

Run migrations in Supabase SQL Editor in this order:

```bash
# 1. Main Stripe Connect setup
/workspaces/EventNexus/supabase/migrations/20250120000001_stripe_connect_setup.sql

# 2. Cron job setup
/workspaces/EventNexus/supabase/migrations/20250120000002_setup_payout_cron.sql
```

**Or via Supabase CLI:**
```bash
cd /workspaces/EventNexus
supabase db push
```

### 4. Set Edge Function Secrets

```bash
cd /workspaces/EventNexus/supabase

# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Set platform URL
supabase secrets set PLATFORM_URL=https://pikkst.github.io/EventNexus

# Optional: Set Stripe price IDs for subscriptions
supabase secrets set STRIPE_PRICE_PRO=price_YOUR_PRO_ID
supabase secrets set STRIPE_PRICE_PREMIUM=price_YOUR_PREMIUM_ID
supabase secrets set STRIPE_PRICE_ENTERPRISE=price_YOUR_ENTERPRISE_ID
```

### 5. Deploy Edge Functions

```bash
cd /workspaces/EventNexus/supabase

# Deploy all Stripe Connect functions
supabase functions deploy create-connect-account
supabase functions deploy process-scheduled-payouts
supabase functions deploy request-refund

# Redeploy updated functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

### 6. Set Up Stripe Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `account.updated`
   - `transfer.created`
   - `transfer.paid`
   - `transfer.failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.*`

5. Copy the **Signing secret** (starts with `whsec_...`)
6. Set it as environment variable:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

### 7. Update Frontend Environment Variables

Create/update `.env.local`:

```env
# Supabase (already set)
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Gemini AI (already set)
GEMINI_API_KEY=your_gemini_key

# Stripe (add this)
VITE_STRIPE_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY
```

### 8. Build and Deploy Frontend

```bash
cd /workspaces/EventNexus

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Deploy to GitHub Pages
git add .
git commit -m "feat: Add Stripe Connect for automated payouts"
git push origin main
```

---

## 🧪 Testing Flow

### Test 1: Organizer Onboarding

1. **Create account** as organizer
2. **Create a paid event** (e.g., €25 ticket price)
3. **Notice the yellow banner** "Connect Your Bank Account"
4. **Click "Connect Bank Account"**
5. **Fill Stripe Express form**:
   - Use test data from [Stripe Testing](https://stripe.com/docs/connect/testing)
   - Business type: Individual
   - Use valid IBAN test number: `DE89370400440532013000`
6. **Complete onboarding**
7. **Verify in database**:
   ```sql
   SELECT 
     id, name, email,
     stripe_connect_account_id,
     stripe_connect_onboarding_complete,
     stripe_connect_charges_enabled
   FROM users 
   WHERE stripe_connect_account_id IS NOT NULL;
   ```

### Test 2: Ticket Purchase

1. **Open event page** (as different user)
2. **Purchase tickets** using test card: `4242 4242 4242 4242`
3. **Complete checkout**
4. **Verify payment**:
   - Check Stripe Dashboard > Payments
   - Should see payment in platform account
   - NO transfer yet (held for 2 days)

5. **Check database**:
   ```sql
   SELECT * FROM tickets WHERE event_id = 'YOUR_EVENT_ID';
   SELECT * FROM payouts WHERE event_id = 'YOUR_EVENT_ID';
   -- Should be empty (payout not eligible yet)
   ```

### Test 3: Automated Payout

**Option A: Wait 2 days** after event date (real scenario)

**Option B: Manual trigger** (for testing):

1. **Update event date to past**:
   ```sql
   UPDATE events 
   SET date = NOW() - INTERVAL '3 days'
   WHERE id = 'YOUR_EVENT_ID';
   ```

2. **Manually trigger payout function**:
   ```bash
   curl -X POST \
     'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts' \
     -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
     -H 'Content-Type: application/json' \
     -d '{}'
   ```

3. **Verify payout**:
   ```sql
   SELECT * FROM payouts WHERE event_id = 'YOUR_EVENT_ID';
   ```

4. **Check Stripe Dashboard**:
   - Payments > Transfers
   - Should see transfer to Connect account

5. **Check organizer dashboard**:
   - Go to "Payouts" tab
   - Should see processed payout

### Test 4: Refund Request

1. **As ticket buyer**, go to User Profile > My Tickets
2. **Click "Request Refund"** on a ticket
3. **Verify refund eligibility**:
   - 7+ days before: 100% refund
   - 3-7 days before: 50% refund
   - <3 days: No refund

4. **Request refund**
5. **Check**:
   - Stripe Dashboard > Refunds
   - Database: `SELECT * FROM refunds;`
   - Ticket status updated to `refunded`

---

## 📊 Monitoring & Admin

### View Pending Payouts

```sql
SELECT 
  e.name AS event_name,
  e.date AS event_date,
  u.name AS organizer,
  COUNT(t.id) AS tickets_sold,
  SUM(t.price) AS revenue,
  e.date + INTERVAL '2 days' AS payout_eligible_date
FROM events e
JOIN users u ON e.organizer_id = u.id
LEFT JOIN tickets t ON t.event_id = e.id AND t.payment_status = 'paid'
WHERE e.date < NOW() - INTERVAL '2 days'
  AND e.payout_processed = FALSE
  AND u.stripe_connect_charges_enabled = TRUE
GROUP BY e.id, e.name, e.date, u.name;
```

### View Payout History

```sql
SELECT 
  p.id,
  u.name AS organizer,
  e.name AS event,
  p.gross_amount / 100.0 AS gross_eur,
  p.platform_fee / 100.0 AS fee_eur,
  p.net_amount / 100.0 AS net_eur,
  p.status,
  p.processed_at
FROM payouts p
JOIN users u ON p.user_id = u.id
JOIN events e ON p.event_id = e.id
ORDER BY p.created_at DESC
LIMIT 20;
```

### Check Cron Job Status

```sql
-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname LIKE 'process-scheduled-payouts%';

-- View recent job runs
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-payouts-daily')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🔧 Troubleshooting

### Issue: "Event organizer has not set up payment receiving"

**Solution:**
- Organizer needs to complete Stripe Connect onboarding
- Check `stripe_connect_account_id` exists in users table
- Verify `stripe_connect_charges_enabled = TRUE`

### Issue: Payout not processed after 2 days

**Check:**
1. Event date is correct: `SELECT date FROM events WHERE id = 'XXX';`
2. Organizer Connect enabled: `SELECT stripe_connect_charges_enabled FROM users WHERE id = 'XXX';`
3. Cron job running: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`
4. Manual trigger: Use curl command above

### Issue: Transfer failed in Stripe

**Common causes:**
- Invalid bank account details
- Account verification incomplete
- Country restrictions

**Solution:**
- Check `error_message` in payouts table
- Notify organizer to update Stripe account
- Retry after fix

### Issue: Refund fails

**Check:**
- Event payout not already processed
- Original payment_intent still exists
- Refund amount doesn't exceed original

---

## 📈 Commission Rates

| Tier | Subscription | Commission | Organizer Gets |
|------|--------------|------------|----------------|
| Free | €0/month | 5% | 95% |
| Pro | €29/month | 3% | 97% |
| Premium | €99/month | 2.5% | 97.5% |
| Enterprise | €299/month | 1.5% | 98.5% |

---

## 🔐 Security Notes

1. **Service Role Key**: Never commit to git, only in Supabase secrets
2. **Webhook Secret**: Validates requests are from Stripe
3. **RLS Policies**: Users can only see their own payouts
4. **Refund Validation**: Server-side checks prevent abuse

---

## 📚 References

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Testing](https://stripe.com/docs/connect/testing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## ✅ Deployment Checklist

- [ ] Database migrations applied
- [ ] Edge Functions deployed
- [ ] Stripe webhook configured
- [ ] Environment variables set
- [ ] Cron job scheduled
- [ ] Test organizer onboarding
- [ ] Test ticket purchase
- [ ] Test automated payout
- [ ] Test refund flow
- [ ] Monitor first real payout
- [ ] Set up Stripe alerts

---

## 🎉 You're Live!

Once all tests pass, switch to **Live Mode**:

1. Get live Stripe keys (starts with `sk_live_...`)
2. Update secrets: `supabase secrets set STRIPE_SECRET_KEY=sk_live_...`
3. Update webhook to live endpoint
4. Update frontend: `VITE_STRIPE_PUBLIC_KEY=pk_live_...`
5. Rebuild and deploy

**Congratulations!** Your platform now handles real money flows automatically. 💰
