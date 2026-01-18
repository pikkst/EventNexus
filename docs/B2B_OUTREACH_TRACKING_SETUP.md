# B2B Outreach Email Tracking Setup Guide

This guide explains how to configure Resend webhooks to track email opens, clicks, bounces, and other engagement metrics for the B2B Outreach system.

## Overview

The B2B Outreach system sends partnership emails to prospects via Resend API. To track email engagement (opens, clicks, bounces), we need to configure Resend webhooks that send event notifications back to our Edge Function.

## Architecture

```
1. Email Sent → Resend API (via generate-outreach-email Edge Function)
2. User Opens Email → Resend fires webhook → resend-webhook Edge Function
3. User Clicks Link → Resend fires webhook → resend-webhook Edge Function  
4. Email Bounces → Resend fires webhook → resend-webhook Edge Function
5. Edge Function updates marketing_outreach table with real-time tracking data
6. Admin Dashboard shows live analytics
```

## Setup Instructions

### 1. Deploy the Webhook Edge Function

The webhook handler is located at:
```
/workspaces/EventNexus/supabase/functions/resend-webhook/index.ts
```

Deploy it using:
```bash
cd /workspaces/EventNexus
supabase functions deploy resend-webhook
```

Your webhook URL will be:
```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook
```

### 2. Configure Resend Webhook

1. **Go to Resend Dashboard**:
   - Visit https://resend.com/settings/webhooks
   - Log in to your Resend account

2. **Add New Webhook**:
   - Click "Add Webhook"
   - **Endpoint URL**: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook`
   - **Description**: "EventNexus B2B Outreach Tracking"

3. **Select Events to Track**:
   Enable these webhook events:
   - ✅ `email.sent` - Email successfully accepted by Resend
   - ✅ `email.delivered` - Email delivered to recipient's inbox
   - ✅ `email.delivery_delayed` - Temporary delivery delay
   - ✅ `email.opened` - Recipient opened the email
   - ✅ `email.clicked` - Recipient clicked a link
   - ✅ `email.bounced` - Email bounced (hard or soft)
   - ✅ `email.complained` - Recipient marked as spam

4. **Save Configuration**:
   - Click "Create Webhook"
   - Copy the **Webhook Signing Secret** (you'll need this for verification in production)

### 3. Apply Database Schema Updates

Run the migration to add tracking columns:

```bash
cd /workspaces/EventNexus
supabase db push
```

This applies the migration file:
```
supabase/migrations/20260118_outreach_tracking.sql
```

Which adds:
- `clicked_at` - Timestamp of link clicks
- `bounce_reason` - Reason for bounces
- `failed_reason` - Reason for failures
- `replied_count` - Number of replies
- Updated status constraint to include: 'delivered', 'clicked'

### 4. Test the Webhook

#### Manual Test:
Send a test email from the B2B Outreach dashboard:

1. Go to Admin Dashboard → B2B Outreach
2. Select a prospect
3. Click "Generate & Send Email"
4. Wait 1-2 minutes
5. Check the email in your inbox and open it
6. Return to the "Email Campaigns" tab - status should update to "OPENED"

#### Webhook Test Event:
You can send a test webhook from Resend dashboard:

1. Go to https://resend.com/settings/webhooks
2. Click your webhook
3. Click "Send Test Event"
4. Select event type: `email.opened`
5. Check Supabase logs:

```bash
supabase functions logs resend-webhook --follow
```

### 5. Verify Real-Time Tracking

After setup, you should see:

**Email Campaigns Tab**:
- Real-time status updates (Sent → Opened → Clicked)
- Engagement timeline showing all webhook events
- Timestamp for each interaction
- Bounce/failure reasons if applicable

**Analytics Tab**:
- Live open rate percentage
- Click rate tracking
- Reply rate metrics
- Detailed email performance breakdown

## Tracking Events

| Event | Updates | Description |
|-------|---------|-------------|
| `email.sent` | `sent_at`, status='sent' | Email successfully sent |
| `email.delivered` | `sent_at`, status='sent' | Delivered to inbox |
| `email.opened` | `opened_at`, status='opened' | Recipient opened email |
| `email.clicked` | `clicked_at`, status='opened' | Link clicked |
| `email.bounced` | `bounce_reason`, status='bounced' | Email bounced |
| `email.complained` | `failed_reason`, status='failed' | Marked as spam |

All events are logged in `personalization_data.webhook_events` array for complete tracking history.

## Troubleshooting

### Webhooks Not Received

1. **Check Resend webhook logs**:
   - Go to https://resend.com/settings/webhooks
   - Click your webhook
   - View "Recent Deliveries"
   - Check for errors (401, 500, etc.)

2. **Check Edge Function logs**:
   ```bash
   supabase functions logs resend-webhook --limit 50
   ```

3. **Verify webhook URL**:
   - Must be publicly accessible
   - Should return 200 OK for OPTIONS requests (CORS)
   - Check for typos in URL

### Email ID Not Matching

The Edge Function finds emails by matching `personalization_data.email_id` with Resend's `email_id`. If emails aren't updating:

1. Check that `generate-outreach-email` is storing the Resend `email_id`:
   ```typescript
   personalization_data: {
     email_id: resendData.id,  // This must be set!
     ...
   }
   ```

2. Check database:
   ```sql
   SELECT id, subject, personalization_data->>'email_id' as resend_email_id
   FROM marketing_outreach
   WHERE sent_at IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Status Not Updating in UI

1. **Refresh data**: Click the refresh button in Email Campaigns tab
2. **Check browser console**: Look for React errors
3. **Verify database**: Query `marketing_outreach` directly to see if status changed
4. **Clear filters**: Make sure status filter is set to "All Status"

## Analytics Calculation

Open Rate: `(emails_opened / emails_sent) × 100`
Click Rate: `(emails_clicked / emails_sent) × 100`
Reply Rate: `(emails_replied / emails_sent) × 100`
Conversion Rate: `(prospects_converted / total_prospects) × 100`

## Security Notes

- Webhook endpoint is public (required for Resend)
- In production, implement webhook signature verification using Resend's signing secret
- Edge Function uses service role key to bypass RLS (required for webhook access)
- Only admins can view analytics in UI (RLS enforced)

## Next Steps

After webhook setup is complete:

1. **Monitor performance**: Check analytics dashboard daily
2. **A/B test templates**: Try different email templates and compare open rates
3. **Follow up**: Contact prospects who opened emails but didn't reply
4. **Clean list**: Remove prospects with multiple bounces
5. **Scale up**: Increase outreach volume as conversion rates improve

## Support

For issues with:
- **Resend API**: https://resend.com/docs
- **Supabase Functions**: https://supabase.com/docs/guides/functions
- **EventNexus**: Contact villu@mail.eventnexus.eu

## Files Modified

- `/supabase/functions/resend-webhook/index.ts` - Webhook handler
- `/supabase/migrations/20260118_outreach_tracking.sql` - Schema updates
- `/src/components/MarketingOutreachManager.tsx` - UI improvements
- `/src/services/dbService.ts` - Analytics calculations
- `docs/B2B_OUTREACH_TRACKING_SETUP.md` - This guide
