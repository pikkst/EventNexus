# Payout Processing Setup Guide

## Overview

EventNexus automatically processes payouts to event organizers 2 days after their events conclude. This document explains how the payout system works and how to set up automatic processing.

## How Payouts Work

### Timeline
1. **Event Ends** - Event date passes
2. **2-Day Waiting Period** - Allows time for refund requests and verification
3. **Payout Eligibility** - Event becomes eligible for payout processing
4. **Processing** - Funds are transferred to organizer's Stripe Connect account
5. **Completion** - Payout marked as "Paid" in database

### Payout Status Indicators

In the Dashboard revenue table, you'll see:

- **🟢 Ready** - Event ended 2+ days ago and has paid tickets. Ready to process.
- **🟡 Waiting** - Event has tickets but 2-day period hasn't passed yet. Shows eligible date.
- **🔵 Processing** - Payout is currently being processed by Stripe.
- **✅ Paid** - Payout completed and funds transferred.
- **⚪ No Sales** - Event has no paid tickets, nothing to process.

### Event Management After Payout

Once a payout is completed (**✅ Paid** status), organizers can:

- **🗄️ Archive** - Hide the event from active revenue view while keeping all data. Can be restored later.
- **🗑️ Delete** - Permanently remove the event and all associated data (cannot be undone).
- **🔒 Locked** - Events with pending payouts are locked and cannot be archived or deleted until payout is processed.

### Requirements for Payout

For a payout to be processed, the organizer must have:
1. ✅ Completed Stripe Connect onboarding
2. ✅ Charges enabled on their Connect account
3. ✅ At least one paid, non-refunded ticket
4. ✅ Event date was 2+ days ago
5. ✅ Payout not already processed

## Manual Processing

### Organizer Dashboard

Organizers can manually trigger payout processing using the **"Process Payouts"** button in their Dashboard:

1. Navigate to **Dashboard → Insights tab**
2. Scroll to the **"Revenue Breakdown"** section
3. Click the **"Process Payouts"** button
4. System will process all eligible events for that organizer

### Admin/System Trigger

To manually trigger payouts for all organizers:

```bash
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Response example:
```json
{
  "timestamp": "2026-01-05T10:30:00Z",
  "total_processed": 5,
  "successful": 3,
  "skipped": 2,
  "failed": 0,
  "results": [
    {
      "event_id": "uuid",
      "event_name": "Demo Party",
      "status": "success",
      "amount_eur": "205.62",
      "platform_fee_eur": "5.50",
      "ticket_count": 10
    }
  ]
}
```

## Automatic Processing (Recommended)

For production environments, set up automatic payout processing using one of these methods:

### Option 1: Supabase Cron Job (pg_cron)

Enable `pg_cron` extension and create a scheduled job:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily payout processing at 2 AM UTC
SELECT cron.schedule(
  'process-daily-payouts',
  '0 2 * * *',  -- Every day at 2:00 AM
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('process-daily-payouts');
```

### Option 2: External Cron (crontab)

Set up a cron job on your server:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts -H "Authorization: Bearer YOUR_ANON_KEY" -H "Content-Type: application/json"
```

### Option 3: GitHub Actions Workflow

Create `.github/workflows/process-payouts.yml`:

```yaml
name: Process Scheduled Payouts

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  process-payouts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Payout Processing
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/process-scheduled-payouts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

Add these secrets to your GitHub repository:
- `SUPABASE_URL`: `https://anlivujgkjmajkcgbaxw.supabase.co`
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Option 4: Cloud Scheduler (GCP/AWS)

**Google Cloud Scheduler:**
```bash
gcloud scheduler jobs create http process-payouts \
  --schedule="0 2 * * *" \
  --uri="https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_ANON_KEY,Content-Type=application/json"
```

**AWS EventBridge:**
Create a rule with target pointing to API Gateway/Lambda that calls the Edge Function.

## Monitoring

### Check Payout Status

Query the `payouts` table:

```sql
SELECT 
  e.name as event_name,
  p.status,
  p.net_amount / 100.0 as net_amount_eur,
  p.processed_at,
  p.error_message
FROM payouts p
JOIN events e ON e.id = p.event_id
ORDER BY p.created_at DESC
LIMIT 20;
```

### Check Events Pending Payout

```sql
SELECT 
  e.id,
  e.name,
  e.date,
  e.payout_processed,
  COUNT(t.id) as tickets_sold,
  SUM(t.price_paid) as revenue
FROM events e
LEFT JOIN tickets t ON t.event_id = e.id 
  AND t.payment_status = 'paid' 
  AND t.status = 'valid'
WHERE 
  e.date < NOW() - INTERVAL '2 days'
  AND e.payout_processed = false
GROUP BY e.id
ORDER BY e.date DESC;
```

### Logs

Edge Function logs are available in Supabase Dashboard:
1. Go to **Edge Functions** section
2. Select `process-scheduled-payouts`
3. View **Logs** tab

## Troubleshooting

### Payout Stuck at "Pending"

**Possible causes:**
1. Organizer hasn't completed Stripe Connect onboarding
2. Event is less than 2 days old
3. No paid tickets exist
4. Automatic processing not set up
5. Stripe Connect account not fully verified

**Solution:** Click "Process Payouts" button or check Stripe Connect status.

### Payout Failed

Check the `payouts` table `error_message` column:

```sql
SELECT 
  event_id,
  status,
  error_message,
  created_at
FROM payouts
WHERE status = 'failed'
ORDER BY created_at DESC;
```

Common errors:
- `No Connect account`: Organizer needs to complete onboarding
- `Invalid bank account`: Organizer needs to update banking info in Stripe Dashboard
- `Insufficient balance`: Should not happen with application fee collection

### Manual Retry

After fixing the issue, process again using the button or trigger the Edge Function.

## Commission Rates

Platform fees vary by subscription tier:

| Tier | Rate | Example on €100 |
|------|------|-----------------|
| Free | 5% | €5.00 |
| Pro | 3% | €3.00 |
| Premium | 2.5% | €2.50 |
| Enterprise | 1.5% | €1.50 |

Plus Stripe fees: **2.9% + €0.25 per transaction**

## Security

- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` for elevated privileges
- Only authenticated organizers can view their own payout data (RLS policies)
- Stripe transfers are server-side only (no client secrets exposed)
- All transactions logged in `payouts` table with metadata

## Support

For payout issues, contact:
- **Email:** huntersest@gmail.com
- **Production:** https://www.eventnexus.eu
- **Stripe Dashboard:** Organizers can access via "Open Stripe Dashboard" button

## Related Documentation

- [Stripe Connect Setup](./STRIPE_CONNECT_SETUP.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Edge Functions](../supabase/functions/README.md)
