# Quick Fix: Admin Inbox Not Receiving Emails

## Problem
Emails sent through Resend API reach Resend successfully, but don't appear in the EventNexus Admin Dashboard inbox.

## Root Cause
The `admin_inbox` table doesn't exist in the production database yet.

## Solution

### Step 1: Create the Database Table

1. Open **Supabase Dashboard**: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `/workspaces/EventNexus/sql/setup_admin_inbox_manual.sql`
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "Setup complete! test_messages: 1"

### Step 2: Verify in Admin Dashboard

1. Open EventNexus: https://www.eventnexus.eu
2. Log in as admin
3. Go to **Admin Dashboard** → **Email Inbox** tab
4. You should see the test message: "Test Message - Admin Inbox Setup"

### Step 3: Configure Resend Webhook

**Important:** The webhook must be configured in Resend to forward emails to our Edge Function.

1. Go to **Resend Dashboard**: https://resend.com/domains
2. Select domain: `mail.eventnexus.eu`
3. Click **Webhooks** tab
4. Add webhook:
   - **URL**: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email`
   - **Events**: Select `email.received`
   - **Status**: Active
5. Click **Inbound** tab
6. Add inbound route:
   - **Match**: `*@mail.eventnexus.eu` (or specific addresses like `support@mail.eventnexus.eu`)
   - **Forward to**: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email`
   - **Status**: Enabled

### Step 4: Test Email Flow

Send a test email:
```
To: support@mail.eventnexus.eu
Subject: Testing Admin Inbox
Body: This is a test to verify emails are working.
```

**Check results:**
1. Wait 10-30 seconds
2. Refresh Admin Dashboard inbox
3. Email should appear with status "unread"

### Step 5: Troubleshooting

If emails still don't appear:

**Check Resend webhook logs:**
1. Resend Dashboard → Webhooks → View logs
2. Look for webhook deliveries to your Edge Function
3. Status should be `200 OK`

**Check Edge Function logs:**
```bash
cd /workspaces/EventNexus
npx supabase functions logs receive-email --tail
```

Look for:
- ✅ "Received inbound email: ..." (success)
- ❌ "Error storing email: ..." (database/permission issue)

**Check database directly:**
```bash
# Run in Supabase SQL Editor
SELECT id, from_email, subject, status, created_at 
FROM admin_inbox 
ORDER BY created_at DESC 
LIMIT 10;
```

**Common issues:**
- Webhook not configured → emails don't reach Edge Function
- RLS policy blocking service role → emails received but not stored
- Table doesn't exist → fixed by Step 1 above

## Expected Flow

```
User sends email
    ↓
Resend receives (MX record)
    ↓
Resend forwards to webhook (inbound route)
    ↓
Edge Function: receive-email
    ↓
Inserts into admin_inbox table
    ↓
Admin sees in dashboard (real-time)
```

## Verification Checklist

- [ ] `admin_inbox` table exists in database
- [ ] Test message appears in SQL query
- [ ] Test message appears in Admin Dashboard
- [ ] Resend webhook configured with correct URL
- [ ] Resend inbound route configured
- [ ] Send real test email → appears in inbox
- [ ] Reply works from dashboard

## Next Steps After Fix

1. Monitor webhook delivery success rate in Resend
2. Check for any bounced/failed emails
3. Test reply functionality
4. Configure email alerts for high-priority messages
5. Set up real-time notifications for new inbox messages

## Files Modified/Created

- `/workspaces/EventNexus/sql/setup_admin_inbox_manual.sql` - Manual setup SQL
- `/workspaces/EventNexus/supabase/migrations/20251226000002_create_admin_inbox.sql` - Migration (fixed)
- `/workspaces/EventNexus/scripts/test_admin_inbox.sh` - Diagnostic script

## Contact

If issues persist, check:
- Edge Function deployment status: `npx supabase functions list`
- Database connection: Supabase Dashboard → Database → Tables
- Webhook delivery: Resend Dashboard → Webhooks → Logs
