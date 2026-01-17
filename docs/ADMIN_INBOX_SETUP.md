# Admin Inbox System - Setup Guide

## Overview
Complete email management system built into Admin Dashboard. Receive, read, and reply to support emails directly from the platform without external email clients.

## Features
- 📬 **Inbox Management** - Gmail-style interface in Admin Dashboard
- 📧 **Receive Emails** - All emails to support@, info@, admin@ addresses
- 📨 **Reply Functionality** - Send replies directly from dashboard
- 🏷️ **Status Tracking** - Unread, Read, Replied, Archived, Spam
- ⚡ **Priority Detection** - Auto-detects urgent keywords
- 🔍 **Search & Filter** - Find messages quickly
- 📊 **Statistics** - Unread count, response metrics
- 🔗 **Email Threading** - Replies preserve conversation context

## Architecture

```
User sends email to support@mail.eventnexus.eu
           ↓
    Resend receives email
           ↓
    Webhook triggers → receive-email Edge Function
           ↓
    Stored in admin_inbox table
           ↓
    Admin sees in Dashboard Inbox tab
           ↓
    Admin clicks Reply → Compose message
           ↓
    send-email-reply Edge Function → Resend API
           ↓
    Email sent to user with proper threading
```

## Setup Steps

### 1. Database Migration

Execute the SQL migration to create the `admin_inbox` table:

```bash
# Connect to Supabase SQL Editor
# Copy contents of sql/create-admin-inbox.sql
# Execute in SQL Editor
```

Or run directly:

```bash
cd /workspaces/EventNexus
npx supabase db push
```

**What it creates:**
- `admin_inbox` table with all necessary columns
- Indexes for performance (status, email, date, priority)
- RLS policies (admin-only access)
- `get_inbox_stats()` function for statistics
- Automatic `updated_at` trigger

### 2. Configure Resend Inbound Webhook

**Step 1: Get Webhook URL**

Your webhook endpoint:
```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email
```

**Step 2: Configure in Resend**

1. Go to Resend Dashboard → **Domains** → `mail.eventnexus.eu`
2. Click **Webhooks** tab
3. Click **Add Webhook Endpoint**
4. Enter:
   - **URL:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email`
   - **Events:** Select `email.received`
   - **Status:** Active
5. Click **Create Webhook**

**Step 3: Configure Inbound Route**

1. Still in Resend → Domains → `mail.eventnexus.eu`
2. Click **Inbound** tab
3. Click **Add Inbound Route**
4. Configure:
   - **Match:** `*@mail.eventnexus.eu` (catch-all)
   - **Forward to:** Your webhook URL
   - **Status:** Enabled
5. Save

**Step 4: Add MX Record (if not already added)**

Add this DNS record to receive emails:

```
Type: MX
Host: mail
Value: inbound-smtp.eu-west-1.amazonaws.com
Priority: 10
```

Result: `mail.eventnexus.eu.` → AWS SES for receiving

### 3. Test Email Reception

Send a test email:

```bash
# From your personal email, send to:
support@mail.eventnexus.eu
Subject: Test Inbox Integration
Body: Testing if emails reach the Admin Dashboard inbox.
```

**Verify:**
1. Go to Admin Dashboard → **Email Inbox** tab
2. Should see the test email within 30 seconds
3. Status: `unread`
4. Click to view full content

**Check logs if not appearing:**
```bash
npx supabase functions logs receive-email --tail
```

Look for:
- `Received inbound email: ...` (success)
- `Error storing email: ...` (failure - check RLS policies)

### 4. Test Reply Functionality

1. Open the test message in Admin Inbox
2. Click **Reply** button
3. Type a response
4. Click **Send Reply**
5. Check logs:
   ```bash
   npx supabase functions logs send-email-reply --tail
   ```
6. Verify email received at sender's address

### 5. DNS Configuration Summary

For full inbox functionality, ensure these DNS records exist:

```
# DKIM (already configured for sending)
Type: TXT
Host: resend._domainkey.mail
Value: [YOUR_DKIM_KEY_FROM_RESEND]

# SPF (already configured for sending)
Type: TXT
Host: send.mail
Value: v=spf1 include:amazonses.com ~all

# MX for SENDING (already configured)
Type: MX
Host: send.mail
Value: feedback-smtp.eu-west-1.amazonses.com
Priority: 10

# MX for RECEIVING (NEW - for inbox)
Type: MX
Host: mail
Value: inbound-smtp.eu-west-1.amazonaws.com
Priority: 10

# DMARC (already configured)
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none
```

## Usage Guide

### Admin Dashboard Interface

**Inbox Tab Location:**
```
Admin Dashboard → Email Inbox (3rd tab)
```

**Layout:**
- **Left Panel:** Message list (scrollable)
- **Right Panel:** Selected message details
- **Top Stats:** Total, Unread, Replied, High Priority counts

**Features:**

1. **Search Messages:**
   - Type in search box
   - Searches: Subject, From email, Body text

2. **Filter by Status:**
   - Dropdown: All Messages, Unread, Read, Replied, Archived

3. **Message Actions:**
   - **Click message** → Mark as read automatically
   - **Reply button** → Compose reply
   - **Delete button** (trash icon) → Permanently delete

4. **Priority Indicators:**
   - 🔴 High/Urgent (detected from keywords)
   - 🔵 Normal (default)

5. **Status Badges:**
   - Blue: Unread
   - Gray: Read
   - Green: Replied
   - Red: Spam

### Replying to Emails

1. Select message from list
2. Click **Reply** button
3. Type your response in textarea
4. Click **Send Reply**
5. Status automatically updates to "Replied"
6. User receives email with:
   - Subject: `Re: [Original Subject]`
   - From: `support@mail.eventnexus.eu`
   - Proper email threading (In-Reply-To header)

### Email Template (Replies)

Replies use professional HTML template:

```
┌─────────────────────────────────┐
│ EventNexus Support Header       │ ← Gradient purple/indigo
├─────────────────────────────────┤
│                                 │
│  [Your reply text here]         │ ← White background
│                                 │
├─────────────────────────────────┤
│ Best regards,                   │
│ EventNexus Support Team         │
│ www.eventnexus.eu              │
└─────────────────────────────────┘
```

## Troubleshooting

### Emails not appearing in inbox

**Check 1: Webhook configured?**
```bash
# Resend Dashboard → Webhooks
# Should see: email.received → active
```

**Check 2: Inbound route active?**
```bash
# Resend Dashboard → Inbound
# Should see: *@mail.eventnexus.eu → enabled
```

**Check 3: MX record exists?**
```bash
# Check DNS
dig MX mail.eventnexus.eu

# Should return:
# mail.eventnexus.eu. 300 IN MX 10 inbound-smtp.eu-west-1.amazonaws.com.
```

**Check 4: Edge Function logs**
```bash
npx supabase functions logs receive-email --tail

# Send test email and watch for:
# "Received inbound email: ..."
# "Email stored successfully: [UUID]"
```

**Check 5: Database permissions**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM admin_inbox ORDER BY created_at DESC LIMIT 5;

-- If error: Check RLS policies allow admin user
```

### Reply not sending

**Check 1: RESEND_API_KEY set?**
```bash
npx supabase secrets list | grep RESEND_API_KEY
# Should show RESEND_API_KEY with hash
```

**Check 2: Edge Function logs**
```bash
npx supabase functions logs send-email-reply --tail

# Should see:
# "Reply sent successfully: [message_id]"
```

**Check 3: Resend Dashboard**
```
Resend → Emails → Recent sends
# Check if reply appears in sent list
```

### Spam detection false positives

The system auto-detects spam using basic keywords. If legitimate emails marked as spam:

**Adjust spam keywords in:**
```typescript
// supabase/functions/receive-email/index.ts
// Line ~55
const spamKeywords = ['viagra', 'casino', 'lottery', 'prince', 'inheritance'];
// Remove or modify keywords as needed
```

Redeploy:
```bash
npx supabase functions deploy receive-email --no-verify-jwt
```

## Advanced Configuration

### Custom Priority Rules

Edit priority detection logic:

```typescript
// supabase/functions/receive-email/index.ts
// Line ~48-54

let priority = 'normal';
const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'important'];
const subjectLower = payload.subject.toLowerCase();
if (urgentKeywords.some(keyword => subjectLower.includes(keyword))) {
  priority = 'high';
}
```

Add more sophisticated rules:
- Check sender domain
- Parse email headers
- Integrate with ticket system priority
- Use AI to detect urgency

### Email Attachments

Currently stored as base64 in database. For production:

**Upload to Supabase Storage:**

```typescript
// In receive-email Edge Function
const attachments = await Promise.all(
  (payload.attachments || []).map(async (att) => {
    // Upload to storage
    const { data, error } = await supabase.storage
      .from('inbox-attachments')
      .upload(`${messageId}/${att.filename}`, 
        Buffer.from(att.content, 'base64'),
        { contentType: att.contentType }
      );
    
    return {
      name: att.filename,
      size: att.size,
      type: att.contentType,
      url: data?.path ? `${supabaseUrl}/storage/v1/object/public/inbox-attachments/${data.path}` : null
    };
  })
);
```

### Real-time Notifications

Add browser notifications when new email arrives:

```typescript
// In AdminInbox.tsx
useEffect(() => {
  const subscription = supabase
    .channel('admin-inbox-changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'admin_inbox' },
      (payload) => {
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification('New Email', {
            body: `From: ${payload.new.from_email}\nSubject: ${payload.new.subject}`,
            icon: '/logo.png'
          });
        }
        
        // Refresh inbox
        loadMessages();
        loadStats();
      }
    )
    .subscribe();
  
  return () => subscription.unsubscribe();
}, []);
```

### Email Templates for Replies

Create reusable templates:

```typescript
// Add to AdminInbox.tsx state
const [templates, setTemplates] = useState([
  { id: 1, name: 'Welcome', body: 'Thank you for contacting EventNexus...' },
  { id: 2, name: 'Refund Request', body: 'We have received your refund request...' },
  { id: 3, name: 'Technical Support', body: 'Our team is investigating the issue...' }
]);

// Add template selector in reply UI
<select onChange={(e) => setReplyBody(templates.find(t => t.id == e.target.value)?.body || '')}>
  <option>Select template...</option>
  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
</select>
```

## Security Considerations

### Webhook Verification

Add signature verification to receive-email function:

```typescript
// Resend sends svix-* headers for verification
const signature = req.headers.get('svix-signature');
const timestamp = req.headers.get('svix-timestamp');
const id = req.headers.get('svix-id');

// Verify webhook authenticity
// (Resend uses Svix for webhook signatures)
```

### Rate Limiting

Prevent webhook abuse:

```sql
-- Add to SQL migration
CREATE TABLE webhook_rate_limit (
  ip_address inet PRIMARY KEY,
  request_count int DEFAULT 1,
  window_start timestamptz DEFAULT now()
);

-- Rate limit: 100 requests per hour per IP
```

### Data Retention

Auto-archive old emails:

```sql
-- Run daily via pg_cron or GitHub Actions
DELETE FROM admin_inbox 
WHERE created_at < NOW() - INTERVAL '90 days'
AND status = 'archived';
```

## Monitoring

### Key Metrics to Track

1. **Inbox Response Time**
   ```sql
   SELECT AVG(EXTRACT(EPOCH FROM (replied_at - created_at))) / 60 as avg_response_minutes
   FROM admin_inbox
   WHERE status = 'replied';
   ```

2. **Unread Backlog**
   ```sql
   SELECT COUNT(*) FROM admin_inbox WHERE status = 'unread';
   ```

3. **Daily Email Volume**
   ```sql
   SELECT DATE(created_at) as date, COUNT(*) as emails
   FROM admin_inbox
   WHERE created_at > NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

### Alerting

Set up alerts for:
- Unread count > 50 (backlog building up)
- Response time > 24 hours (SLA breach)
- Spam count spike (potential attack)

## Cost Analysis

### Resend Free Tier (Current)
- **100 emails/day** - Sufficient for initial support volume
- **Email storage:** 7 days (we store in Supabase instead)
- **Webhook deliveries:** Unlimited

### Expected Usage
- **Incoming:** ~10-30 emails/day
- **Outgoing (replies):** ~10-30 emails/day
- **Total:** 20-60/day (well within free tier)

### When to Upgrade
Upgrade to Resend Pro ($20/mo) when:
- Email volume exceeds 80/day consistently
- Need longer email history retention
- Require dedicated IP for better deliverability

## Next Steps

1. ✅ Execute SQL migration
2. ✅ Configure Resend webhook
3. ✅ Add MX record for receiving
4. ✅ Test with real email
5. ✅ Test reply functionality
6. 📋 Train admins on inbox usage
7. 📋 Set up email templates
8. 📋 Configure real-time notifications
9. 📋 Implement attachment storage
10. 📋 Add analytics dashboard

## Support

- **Documentation:** This file
- **Code:** `components/AdminInbox.tsx`, `supabase/functions/receive-email/`, `services/dbService.ts`
- **Database:** `admin_inbox` table
- **API:** Resend Dashboard → Logs

## Changelog

- **2024-12-20:** Initial implementation with full inbox + reply
- Features: Receive, Read, Reply, Search, Filter, Priority detection
- Deployment: Production-ready
