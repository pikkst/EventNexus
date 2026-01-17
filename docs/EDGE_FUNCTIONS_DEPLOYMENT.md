# Edge Functions Documentation - Event Reporting System

## Overview

Two Edge Functions handle scheduled report processing and email notifications:

### 1. **process-event-reports** ⏰ (Scheduled Task)
Runs every hour to automatically process event reports and take actions.

**What it does:**
- 🔍 Finds events with open reports >= 5 reports (threshold)
- 🚫 Auto-hides events that exceed the threshold
- 📧 Sends email to organizer about auto-hiding
- ⚠️ Monitors organizers with >= 10 total reports across all events
- 🔔 Notifies admins about organizers needing review

**Configuration:**
```json
{
  "REPORT_THRESHOLD": 5,        // Auto-hide after N open reports
  "SUSPEND_THRESHOLD": 10       // Flag organizer after N total reports
}
```

**Environment Variables Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access
- `RESEND_API_KEY` - Email service API key

**Cron Schedule (supabase/config.toml):**
```toml
[functions."process-event-reports"]
schedule = "0 * * * *"  # Every hour at minute 0
```

---

### 2. **send-report-notifications** 📧 (On-Demand)
Sends email notifications when reports are created or status changes.

**What it does:**
- 📧 Sends detailed email to organizer when report is created
- 📋 Sends status update email to reporter (if not anonymous)
- 🎨 Beautiful HTML email templates
- 🔗 Direct links to organizer hub

**Triggers:**
Called from `dbService.ts` functions:
```typescript
// When report is created
await supabase.functions.invoke('send-report-notifications', {
  body: { reportId, action: 'created' }
})

// When report status changes
await supabase.functions.invoke('send-report-notifications', {
  body: { reportId, action: 'status_updated' }
})
```

**Environment Variables Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `RESEND_API_KEY` - Email service API key

---

## Deployment Steps

### 1. Set Environment Variables

In your Supabase project dashboard, add these secrets:

```bash
RESEND_API_KEY=your_resend_api_key_here
```

The other variables are usually auto-configured by Supabase CLI.

### 2. Deploy Edge Functions

```bash
# Deploy both functions
npx supabase functions deploy process-event-reports
npx supabase functions deploy send-report-notifications

# Or deploy all at once
npx supabase functions deploy
```

### 3. Configure Cron Schedule

Add to `supabase/config.toml`:

```toml
[functions."process-event-reports"]
schedule = "0 * * * *"  # Every hour
```

Then push config:
```bash
npx supabase push
```

### 4. Update dbService.ts to Call Edge Functions

Add these calls in `/src/services/dbService.ts`:

```typescript
// In createEventReport() function, after inserting report
export async function createEventReport(...) {
  // ... existing code ...
  
  // Trigger email notification
  try {
    await supabase.functions.invoke('send-report-notifications', {
      body: { 
        reportId: result.data[0].id, 
        action: 'created' 
      }
    })
  } catch (error) {
    console.error('Error sending notification:', error)
  }
  
  return result.data[0]
}

// In updateReportStatus() function, after updating status
export async function updateReportStatus(...) {
  // ... existing code ...
  
  // Trigger status update email
  try {
    await supabase.functions.invoke('send-report-notifications', {
      body: { 
        reportId, 
        action: 'status_updated' 
      }
    })
  } catch (error) {
    console.error('Error sending notification:', error)
  }
  
  return true
}
```

---

## Testing

### Test process-event-reports locally:
```bash
npx supabase functions serve
# In another terminal:
curl -X POST http://localhost:54321/functions/v1/process-event-reports \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Test send-report-notifications:
```bash
curl -X POST http://localhost:54321/functions/v1/send-report-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reportId": "YOUR_REPORT_ID", "action": "created"}'
```

---

## Monitoring

### Check logs in Supabase Dashboard:
1. Go to your project → Edge Functions
2. Click on the function name
3. View "Execution logs" and "Errors"

### Key log patterns to look for:
- `✅ Auto-hidden event:` - Successful auto-hiding
- `✉️ Email sent to` - Successful email delivery
- `⚠️ Organizer` - Flagged for suspension review
- `Error in` - Function errors (check why)

---

## Email Templates

### Report Created Email
Sent to organizer when a user reports their event:
- Event name
- Report type (wrong location, spam, etc.)
- Report reason and description
- Reporter email or "Anonymous"
- Link to organizer hub

### Report Status Email
Sent to reporter when status changes:
- Acknowledgment email
- Resolution email with notes
- Dismissal email
- Status badge

---

## Thresholds & Configuration

To adjust thresholds, edit the constants in `process-event-reports/index.ts`:

```typescript
const REPORT_THRESHOLD = 5;      // Change this to auto-hide at different level
const SUSPEND_THRESHOLD = 10;    // Change this for organizer suspension flag
```

Then redeploy:
```bash
npx supabase functions deploy process-event-reports
```

---

## Future Enhancements

Potential improvements:
1. ✉️ Weekly digest emails for admins with report summaries
2. 🔄 Automatic report cleanup (archive old resolved reports)
3. 📊 Report analytics and trends
4. 🤖 AI-powered spam detection for report filtering
5. 🔔 Slack/Discord notifications for admins
6. 📱 Push notifications via mobile app

---

## Troubleshooting

### Emails not sending?
- Check `RESEND_API_KEY` is set correctly in Supabase secrets
- Verify email address in database is correct
- Check Resend dashboard for delivery status

### Cron not running?
- Ensure `supabase/config.toml` has correct schedule
- Check logs in Supabase dashboard
- Verify function deployed successfully

### Function deployment fails?
```bash
# Check what's wrong
npx supabase functions deploy process-event-reports --debug

# Try from clean state
rm -rf .supabase
npx supabase start
npx supabase functions deploy
```

---

## Security Considerations

✅ **What's protected:**
- Service role key only used in Edge Functions (server-side)
- RLS policies ensure users only see their own reports
- Rate limiting via Supabase auth
- Anonymous reports don't expose reporter identity

⚠️ **What to monitor:**
- Spam reports (implement cooldown if needed)
- Organizers disputing too many reports
- Admins overriding suspensions

