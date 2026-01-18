# AI Email Reply System - Setup Guide

## 🎯 Overview

Automated email reply system that:
1. **Receives** prospect replies to marketing emails
2. **Analyzes** sentiment and intent with Gemini AI
3. **Generates** contextual replies automatically
4. **Sends** or saves as draft based on sentiment

## 🏗️ Architecture

```
1. Prospect replies → villu@mail.eventnexus.eu
2. Resend Inbound Webhook → receive-email-reply Edge Function
3. AI Analysis (Gemini 2.5 Flash):
   - Sentiment: positive, neutral, negative, interested, not_interested
   - Intent: wants_demo, wants_call, wants_pricing, has_questions, polite_decline, spam
4. AI Reply Generation (Gemini 2.5 Flash)
5. Decision Logic:
   ✅ AUTO-SEND if: positive, interested, wants_demo, wants_call, wants_pricing
   💾 SAVE AS DRAFT if: negative, not_interested, polite_decline, spam, unclear
```

## 📋 Setup Steps

### Step 1: Configure Resend Inbound Domain

1. **Navigate to Resend Dashboard:**
   https://resend.com/domains

2. **Add Inbound Route:**
   - Domain: `mail.eventnexus.eu`
   - Catch-all or specific: `villu@mail.eventnexus.eu`
   - Forward to webhook: `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/receive-email-reply`

3. **Configure DNS Records:**
   Add MX records to your domain DNS:
   ```
   Type: MX
   Name: mail.eventnexus.eu (or @)
   Value: mx1.resend.com
   Priority: 10
   
   Type: MX
   Name: mail.eventnexus.eu (or @)
   Value: mx2.resend.com
   Priority: 20
   ```

4. **Verify Domain:**
   - Add TXT record for verification (provided by Resend)
   - Wait for verification (usually 1-5 minutes)

### Step 2: Test Inbound Email

1. **Send test email to:** `villu@mail.eventnexus.eu`
2. **Check Supabase Logs:**
   https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions/receive-email-reply/logs

Expected logs:
```
📬 Inbound email webhook received: POST
📧 Inbound email from: test@example.com
📧 Subject: Test Reply
👤 Sender email: test@example.com
✅ Found prospect: Test Company
🤖 Analyzing email with Gemini AI...
📊 AI Analysis: { sentiment: 'positive', intent: 'wants_demo' }
✍️ Generating AI reply...
✅ AI reply generated
📤 Auto-sending reply...
✅ Reply sent automatically
```

### Step 3: Admin Dashboard Integration

The system automatically updates:

**Prospect Status:**
- `new` → `responded` when first reply received
- `last_contacted_at` timestamp updated

**Outreach Status:**
- `sent` → `replied` when reply received
- `replied_at` timestamp set
- `replied_count` incremented

**Analytics:**
- Reply rate calculated automatically
- Engagement funnel updated
- Sentiment tracking in CRM

### Step 4: Monitor Auto-Replies

**View in Admin Dashboard:**
1. Navigate to: **Admin Command Center → B2B Outreach → Email Campaigns**
2. Filter by status: `sent` (auto-sent) or `draft` (needs review)
3. Check `personalization_data` for:
   - `auto_reply: true` = automatically sent
   - `auto_reply_draft: true` = saved for admin review
   - `analysis: {...}` = AI sentiment/intent analysis

**Review Drafts:**
Drafts requiring admin review appear when:
- Sentiment: negative, not_interested
- Intent: polite_decline, spam
- Unclear/ambiguous response
- Complex questions requiring human judgment

## 🤖 AI Decision Logic

### AUTO-SEND Conditions:
```typescript
sentiment === 'positive' || 
sentiment === 'interested' ||
intent === 'wants_demo' ||
intent === 'wants_call' ||
intent === 'wants_pricing'
```

**Examples:**
- ✅ "Yes, I'd love to see a demo!" → AUTO-SEND
- ✅ "What are your pricing options?" → AUTO-SEND
- ✅ "Can we schedule a call?" → AUTO-SEND
- ✅ "This looks interesting, tell me more" → AUTO-SEND

### SAVE AS DRAFT Conditions:
```typescript
sentiment === 'negative' ||
sentiment === 'not_interested' ||
intent === 'polite_decline' ||
intent === 'spam' ||
intent === 'unknown'
```

**Examples:**
- 💾 "Not interested" → DRAFT (admin reviews)
- 💾 "Please remove me from your list" → DRAFT (admin unsubscribes)
- 💾 Spam/unclear message → DRAFT (admin decides)
- 💾 Complex technical questions → DRAFT (admin answers)

## 📊 Analytics & Tracking

**New Metrics:**
- **Reply Rate:** % of emails that received replies
- **Auto-Reply Rate:** % of replies handled automatically
- **Draft Rate:** % of replies requiring admin review
- **Response Time:** Average time from send to reply
- **Sentiment Distribution:** positive vs negative replies

**Query Example:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'replied') as total_replies,
  COUNT(*) FILTER (WHERE personalization_data->>'auto_reply' = 'true') as auto_sent,
  COUNT(*) FILTER (WHERE personalization_data->>'auto_reply_draft' = 'true') as needs_review,
  AVG(EXTRACT(EPOCH FROM (replied_at - sent_at))/3600) as avg_response_hours
FROM marketing_outreach
WHERE sent_at > NOW() - INTERVAL '30 days';
```

## 🛡️ Security & Safety

**Built-in Protections:**

1. **Sender Verification:**
   - Only processes emails from known prospects
   - Unknown senders logged for admin review
   - No auto-replies to unknown addresses

2. **Sentiment Analysis:**
   - Negative replies saved as draft (no auto-send)
   - Spam detection via AI intent classification
   - Complex questions routed to admin

3. **Rate Limiting:**
   - Resend API limits apply (100 emails/day free tier)
   - Consider upgrading for high-volume campaigns

4. **Thread Tracking:**
   - Maintains conversation context
   - Links replies to original outreach
   - Prevents duplicate responses

## 🔧 Customization

### Modify AI Prompts:

**Sentiment Analysis** (line ~160):
```typescript
const analysisPrompt = `Analyze this email reply...`
```

**Reply Generation** (line ~230):
```typescript
const replyPrompt = `You are Villu Künnap...`
```

### Adjust Auto-Send Logic:

**Current** (line ~280):
```typescript
const autoSendConditions = 
  analysis.sentiment === 'positive' || 
  analysis.intent === 'wants_demo';
```

**More Conservative:**
```typescript
const autoSendConditions = 
  analysis.sentiment === 'interested' && 
  analysis.urgency === 'high';
```

**More Aggressive:**
```typescript
const autoSendConditions = 
  analysis.sentiment !== 'negative' && 
  analysis.intent !== 'spam';
```

### Add Custom Rules:

```typescript
// Example: Auto-send only during business hours
const estonianTime = new Date().toLocaleString('en-US', { timeZone: 'Europe/Tallinn' });
const hour = new Date(estonianTime).getHours();
const isBusinessHours = hour >= 9 && hour <= 17;

if (autoSendConditions && isBusinessHours) {
  // Auto-send
} else {
  // Save as draft
}
```

## 📈 Performance Optimization

**Expected Latency:**
- Email received → Webhook triggered: 50-200ms
- AI Analysis: 500-1500ms
- Reply Generation: 800-2000ms
- Email sent: 200-500ms
- **Total:** ~2-4 seconds from reply to auto-response

**Optimization Tips:**
1. Use Gemini 2.5 Flash (not Pro) for speed
2. Set lower temperature (0.3) for analysis
3. Limit maxOutputTokens to 1024 for analysis
4. Cache common responses (future enhancement)

## 🐛 Troubleshooting

### No Inbound Emails Received

**Check:**
1. MX records configured correctly
2. Resend domain verified
3. Inbound route points to correct webhook URL
4. Send test email and check Resend logs

### Auto-Replies Not Sending

**Check:**
1. Supabase logs for errors
2. RESEND_API_KEY configured
3. GEMINI_API_KEY configured
4. Sentiment analysis returning expected values

**Debug Query:**
```sql
SELECT 
  prospect_id,
  subject,
  status,
  personalization_data->>'analysis' as analysis,
  personalization_data->>'auto_reply' as auto_reply,
  created_at
FROM marketing_outreach
WHERE ai_generated = true
ORDER BY created_at DESC
LIMIT 20;
```

### Replies Going to Draft Instead of Auto-Send

**Check AI Analysis:**
```javascript
// View logs in Supabase Dashboard
📊 AI Analysis: { 
  sentiment: 'neutral',  // Should be 'positive' or 'interested'
  intent: 'has_questions'  // Should be 'wants_demo' or 'wants_call'
}
```

**Adjust Prompt** if AI is too conservative:
- Add more examples of positive intent
- Lower threshold for "interested" classification
- Specify keywords that indicate positive intent

## 🚀 Advanced Features (Future)

**Planned Enhancements:**

1. **Multi-Turn Conversations:**
   - Track full conversation threads
   - Context-aware replies (remember previous messages)
   - Handoff to human when complex

2. **Calendar Integration:**
   - Automatically book demo calls
   - Sync with Google Calendar
   - Send meeting invites

3. **CRM Enrichment:**
   - Extract company info from email signatures
   - LinkedIn profile lookup
   - Automatic lead scoring

4. **A/B Testing:**
   - Test different reply styles
   - Measure response rates
   - Optimize AI prompts

5. **Smart Routing:**
   - Technical questions → CTO
   - Pricing questions → Sales
   - Partnership inquiries → Founder

## 📞 Support

**Issues?**
- Email: huntersest@gmail.com
- Check logs: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions/receive-email-reply/logs
- View code: `/workspaces/EventNexus/supabase/functions/receive-email-reply/index.ts`

## 📝 Example Conversation Flow

**1. Initial Outreach (Generated):**
```
From: villu@mail.eventnexus.eu
To: prospect@company.com
Subject: Partnership Opportunity for Company XYZ

Hi John,

We've launched EventNexus...
[Generated email content]

Best regards,
Villu Künnap
Founder, EventNexus
```

**2. Prospect Reply:**
```
From: prospect@company.com
To: villu@mail.eventnexus.eu
Subject: Re: Partnership Opportunity for Company XYZ

Hi Villu,

This looks interesting! Could we schedule a quick demo
to see how it works?

Thanks,
John
```

**3. AI Analysis:**
```json
{
  "sentiment": "interested",
  "intent": "wants_demo",
  "questions": ["How does it work?", "Can we schedule a demo?"],
  "urgency": "medium",
  "response_approach": "Offer specific times for demo this week"
}
```

**4. Auto-Generated Reply (Sent Automatically):**
```
From: villu@mail.eventnexus.eu
To: prospect@company.com
Subject: Re: Partnership Opportunity for Company XYZ

Hi John,

Great to hear you're interested! I'd love to show you a demo.

I have availability:
• Tuesday 2pm EET
• Wednesday 10am EET
• Thursday 3pm EET

The demo takes about 15 minutes and I'll show you exactly
how EventNexus can help Company XYZ reduce costs and expand reach.

Which time works best for you?

Best regards,
Villu Künnap
Founder, EventNexus
www.eventnexus.eu
```

**Result:** Response sent in ~3 seconds, prospect engaged, admin notified!
