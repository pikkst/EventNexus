# 📧 B2B MARKETING OUTREACH SYSTEM - COMPLETE GUIDE

## 🎯 Overview

EventNexuse B2B Marketing Outreach süsteem on AI-põhine lead generation ja CRM platvorm, mis võimaldab:

- ✅ **AI-genereeritud emailid** (50+ keeles, sh eesti keel)
- ✅ **Multi-channel suhtlus** (email + telefon + WhatsApp)
- ✅ **Automaatne webhook tracking** (avanemised, klikid, vastused)
- ✅ **CRM sentiment analysis** (AI analüüsib vastuseid)
- ✅ **Estonian market optimizations** (kohalikud äritavad)

---

## 🚀 Quick Start

### 1. Deploy süsteemi

```bash
chmod +x deploy-b2b-outreach.sh
./deploy-b2b-outreach.sh
```

### 2. Konfigureeri Resend API

**Resend Dashboard → Settings → Webhooks**

Loo 2 webhook'i:

#### Webhook 1: Email Events Tracking
```
URL: https://[your-project].supabase.co/functions/v1/resend-webhook
Events:
  - email.sent
  - email.delivered
  - email.opened
  - email.clicked
  - email.bounced
  - email.complained
```

#### Webhook 2: Inbound Email Replies (OLULINE!)
```
URL: https://[your-project].supabase.co/functions/v1/resend-reply-handler
Events:
  - email.received
```

**NB:** Webhook 2 on KRIITILNE - ilma selleta ei jõua vastused süsteemi!

### 3. Impordi Eesti Prospects

**Admin Dashboard → Marketing Outreach → Prospects → Import CSV**

CSV formaat:
```csv
Name,Website,Category,Email,Description,Source
Test OÜ,https://test.ee,Event Organizers,info@test.ee,Sündmuste korraldaja,LinkedIn
```

Kategooriad:
- Event Organizers (sündmuste korraldajad)
- Tourism (turism & hotellid)
- Corporate (ärikliendid & agentuurid)
- Venues (konverentsikeskused)
- Marketing Agencies (turundusteenused)

---

## 📨 Email Template'id

### Estonian Templates (6 tk):

1. **Event Organizers Partnership** - Festivalde/kontserdide korraldajatele
2. **Tourism & Hospitality** - Hotellid, turismifirmad
3. **Corporate & Agencies** - Ärikliendid, agentuurid
4. **International Partnership** - Rahvusvahelised partnerid
5. **Follow-up** - Järelkontakt (7-10 päeva pärast)
6. **Post-Demo** - Pärast demo'd/kõnet

### Template Muutujad (auto-replaced):

- `{companyName}` → Prospect'i nimi
- `{category}` → Prospect'i kategooria
- `{contactName}` → Kontaktisiku nimi (kui olemas)
- Platform stats (automaatselt värskendatud):
  - Kasutajate arv, sündmuste arv
  - Platvormi hind (1.5%-5%)
  - AI funktsioonid
  - Viimased uuendused

---

## 🤖 AI Agent Knowledge Base

AI agendid EI VALETA, kuna neil on juurdepääs:

### 1. **Verified Platform Facts** (`ai_platform_stats`)

```sql
SELECT * FROM ai_platform_stats;
```

Sisaldab:
- Täpne teenustasu vahemik (1.5% - 5%)
- Linnade arv (1,169+)
- Keelte arv (50+)
- AI mudelid (Gemini 3.0, Imagen 3)
- Platvormi staatus (Beta Launch)

### 2. **Platform Changelog** (`ai_platform_changelog`)

```sql
SELECT * FROM ai_platform_changelog ORDER BY release_date DESC LIMIT 10;
```

Viimased uuendused:
- AI Marketing Outreach System
- Multi-Language Translation
- AI Poster Generation
- Stripe Connect Payouts
- QR Ticketing

### 3. **Template Variables** (`template_variables`)

```sql
SELECT * FROM template_variables WHERE category = 'contact';
```

Kontaktandmed:
- `admin_name` → Villu Künnap
- `admin_email` → villu@mail.eventnexus.eu
- `admin_phone` → +372 5XXX XXXX
- `admin_whatsapp` → +372 5XXX XXXX

**⚠️ UPDATE NEED ENNE PRODUCTION'IT:**

```sql
UPDATE template_variables 
SET variable_value = '+372 XXXX XXXX' 
WHERE variable_name IN ('admin_phone', 'admin_whatsapp');
```

---

## 📞 Multi-Channel Support (EESTI TURUL)

### Email vs Phone/WhatsApp Strategy:

#### **Rahvusvahelised partnerid:**
✅ Email-first approach  
✅ Video call (Zoom/Meet)  
✅ Professional, formal  

#### **Eesti turul:**
✅ Email + telefon/WhatsApp  
✅ Kohvikohtumine (kui samas linnas)  
✅ Casual-professional tone  
✅ WhatsApp eelistatud quick questions'ide jaoks  

### Logging Phone/WhatsApp Interactions:

```typescript
// Frontend: MarketingOutreachManager.tsx
const logPhoneCall = async (prospectId: string) => {
  await supabase.from('crm_interactions').insert({
    prospect_id: prospectId,
    interaction_type: 'phone_call',
    channel: 'phone',
    subject: 'Partnership discussion',
    content: 'Discussed beta program, pricing, features. Interested in demo next week.',
    sentiment: 'positive',
    metadata: {
      duration_minutes: 15,
      outcome: 'answered',
      next_action: 'Schedule demo for next week'
    }
  });
};

const logWhatsAppMessage = async (prospectId: string) => {
  await supabase.from('crm_interactions').insert({
    prospect_id: prospectId,
    interaction_type: 'whatsapp_message',
    channel: 'whatsapp',
    content: 'Sent quick demo link and pricing sheet',
    sentiment: 'neutral',
    metadata: {
      message_type: 'follow_up'
    }
  });
};
```

---

## 🔍 Webhook Flow (Kuidas Vastused Jõuavad Süsteemi)

### 1. Email saadetakse:

```typescript
// Edge Function: generate-outreach-email
const resendResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  body: JSON.stringify({
    from: 'Villu Künnap <villu@mail.eventnexus.eu>',
    to: prospect.email,
    subject: aiGeneratedSubject,
    html: aiGeneratedBody
  })
});

const { id: emailId } = await resendResponse.json();

// KRIITILNE: Save email_id to database IMMEDIATELY!
await supabase.from('marketing_outreach').insert({
  prospect_id: prospect.id,
  subject: aiGeneratedSubject,
  body: aiGeneratedBody,
  status: 'sent',
  sent_at: new Date().toISOString(),
  personalization_data: {
    email_id: emailId  // ← Resend email ID (webhook'i jaoks)
  }
});
```

### 2. Email avaneb:

```
Resend → Webhook Event: email.opened
       ↓
Edge Function: resend-webhook
       ↓
Database: UPDATE marketing_outreach SET status='opened', opened_at=NOW()
       ↓
Update prospect: status='contacted'
```

### 3. Prospect vastab:

```
Resend → Webhook Event: email.received
       ↓
Edge Function: resend-reply-handler
       ↓
AI Sentiment Analysis (Gemini):
  - positive/neutral/negative/question
  - Extract intent & suggested action
       ↓
Database: INSERT crm_interactions
        UPDATE marketing_outreach SET status='replied'
        UPDATE marketing_prospects SET status='responded'
       ↓
Analytics updated
```

### Debug Webhook Issues:

```bash
# Check Edge Function logs
supabase functions logs resend-webhook --tail

# Test webhook endpoint
curl https://[your-project].supabase.co/functions/v1/resend-webhook

# Check if email_id is saved
SELECT id, subject, personalization_data->>'email_id' AS email_id 
FROM marketing_outreach 
WHERE sent_at > NOW() - INTERVAL '24 hours';
```

---

## 📊 Analytics & Reporting

### View: Recent Interactions

```sql
SELECT * FROM recent_prospect_interactions 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### View: Prospect Activity Summary

```sql
SELECT * FROM prospect_activity_summary 
WHERE total_interactions > 0
ORDER BY positive_interactions DESC;
```

### Marketing Analytics Dashboard:

```sql
SELECT 
  date,
  country,
  category,
  emails_sent,
  emails_opened,
  responses_received,
  positive_responses,
  phone_calls_made,
  whatsapp_messages_sent,
  ROUND(100.0 * emails_opened / NULLIF(emails_sent, 0), 2) AS open_rate,
  ROUND(100.0 * positive_responses / NULLIF(responses_received, 0), 2) AS positive_rate
FROM marketing_analytics
WHERE date > NOW() - INTERVAL '30 days'
ORDER BY date DESC;
```

---

## 🔐 Security & Privacy

### RLS Policies (Admin Only):

```sql
-- Only admins can access marketing data
ALTER TABLE marketing_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only" ON marketing_prospects FOR ALL
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
```

### Data Protection:

- ✅ Prospects'ide andmed GDPR-compliant
- ✅ Email content'i NEVER logged to external services
- ✅ AI analysis ONLY on-server (Gemini API)
- ✅ Webhook signatures verified (RESEND_WEBHOOK_SECRET)

---

## 🐛 Troubleshooting

### Problem: Vastused ei jõua süsteemi

**Solution:**
1. Check Resend webhook configuration:
   ```
   https://resend.com/settings/webhooks
   ```
2. Verify `email_id` is saved to `marketing_outreach`:
   ```sql
   SELECT personalization_data->>'email_id' FROM marketing_outreach WHERE sent_at > NOW() - INTERVAL '1 hour';
   ```
3. Check Edge Function logs:
   ```bash
   supabase functions logs resend-reply-handler --tail
   ```

### Problem: AI genereerib valesid fakte

**Solution:**
1. Update `ai_platform_stats`:
   ```sql
   UPDATE ai_platform_stats SET stat_value = 'NEW_VALUE' WHERE stat_key = 'total_users';
   ```
2. Add new changelog entries:
   ```sql
   INSERT INTO ai_platform_changelog (version, title, description, category)
   VALUES ('2.6.0', 'New Feature Name', 'Description', 'feature');
   ```

### Problem: Template muutujad ei tööta

**Solution:**
1. Check `template_variables` table:
   ```sql
   SELECT * FROM template_variables;
   ```
2. Verify Edge Function loads variables:
   ```bash
   supabase functions logs generate-outreach-email | grep "Platform stats"
   ```

---

## 📈 Best Practices

### Estonian Market:

1. **First Contact:** Email (professional introduction)
2. **Follow-up:** Phone/WhatsApp (personal touch)
3. **Demo:** Video call või coffee meeting
4. **Decision:** Email (formal proposal)

### Email Tips:

- ✅ Keep subject under 60 chars
- ✅ Body under 350 words
- ✅ Lead with value (cost savings)
- ✅ Low-pressure CTA (5 min chat)
- ✅ Perfect Estonian grammar (AI handles this)

### Phone/WhatsApp Tips:

- ✅ Log EVERY interaction in CRM
- ✅ Add sentiment & next action
- ✅ Update prospect preferred_contact_method
- ✅ Schedule follow-ups in metadata

---

## 🎉 Success Metrics

Track these KPIs in Marketing Analytics:

1. **Email Performance:**
   - Open rate (target: >30%)
   - Reply rate (target: >5%)
   - Positive response rate (target: >60% of replies)

2. **Multi-Channel:**
   - Phone answer rate (target: >50%)
   - WhatsApp response rate (target: >70%)

3. **Conversion:**
   - Demo requests (target: 10% of responded)
   - Beta signups (target: 5% of demos)

---

## 📞 Support

**Questions?** Contact:
- Email: villu@mail.eventnexus.eu
- Phone: +372 5XXX XXXX
- WhatsApp: +372 5XXX XXXX

**Technical Issues:**
- GitHub Issues: https://github.com/pikkst/EventNexus/issues
- Supabase Logs: `supabase functions logs [function-name]`

---

## 🔄 Updates

To update templates or knowledge base:

```bash
# Edit templates
supabase db push --include-all supabase/sql/b2b_templates_estonian.sql

# Update platform stats
supabase db execute --query "UPDATE ai_platform_stats SET stat_value='NEW_VALUE' WHERE stat_key='total_users';"

# Redeploy Edge Functions
supabase functions deploy generate-outreach-email --no-verify-jwt
```

---

**Last Updated:** 2026-01-25  
**Version:** 2.5.0  
**Status:** Production Ready ✅
