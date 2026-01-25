# Resend Webhook'ide Seadistamine

## 📋 Ülevaade

EventNexus kasutab kahte Resend webhook endpoint'i:
1. **resend-webhook** - Outbound email events (sent, opened, clicked, bounced)
2. **resend-reply-handler** - Inbound email replies (incoming messages)

## 🔗 Webhook URL'id

### 1. Outbound Email Events
```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook
```

**Valib sündmused:**
- ✅ email.sent
- ✅ email.delivered  
- ✅ email.opened
- ✅ email.clicked
- ✅ email.bounced
- ✅ email.complained (spam reports)
- ✅ email.delivery_delayed

### 2. Inbound Email Replies  
```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-reply-handler
```

**Valib sündmused:**
- ✅ email.received (incoming replies)

---

## 🛠️ Seadistamise Sammud

### Samm 1: Resend Dashboard'i Avamine

1. Mine: https://resend.com/settings/webhooks
2. Logi sisse Resend kontoga
3. Kliki **"Add Endpoint"** või **"Create Webhook"**

### Samm 2: Outbound Events Webhook

**Webhook seaded:**
```yaml
Name: EventNexus Outbound Events
Endpoint URL: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook
Events:
  - email.sent
  - email.delivered
  - email.opened
  - email.clicked
  - email.bounced
  - email.complained
  - email.delivery_delayed
Status: Active
```

**Peale salvestamist:**
1. Kopeeri **Signing Secret** (algab `whsec_...`)
2. Salvesta see Supabase secrets'i (vt allpool)

### Samm 3: Inbound Replies Webhook

**Webhook seaded:**
```yaml
Name: EventNexus Inbound Replies
Endpoint URL: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-reply-handler
Events:
  - email.received
Status: Active
```

**Peale salvestamist:**
1. Kopeeri **Signing Secret** (algab `whsec_...`)
2. Salvesta see Supabase secrets'i (vt allpool)

### Samm 4: Signing Secrets Seadistamine

```bash
# Supabase CLI kaudu (SOOVITATAV)
npx supabase secrets set RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx

# Või Supabase Dashboard'is:
# https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/settings/functions
# → Edge Functions → Secrets → Add secret
```

**Vajalikud secrets:**
- `RESEND_WEBHOOK_SECRET` - Signing secret outbound webhook'ist
- `RESEND_API_KEY` - Resend API key (juba seadistatud)
- `GEMINI_API_KEY` - Google Gemini API key (juba seadistatud)

---

## ✅ Testimine

### Test 1: Outbound Webhook (GET request)
```bash
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-webhook
```

**Oodatav vastus:**
```json
{
  "success": true,
  "message": "Resend webhook endpoint is active",
  "events": ["email.sent", "email.delivered", "email.opened", ...]
}
```

### Test 2: Inbound Webhook (GET request)
```bash
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/resend-reply-handler
```

**Oodatav vastus:**
```json
{
  "success": true,
  "message": "Resend reply handler is active"
}
```

### Test 3: Saada Test Email

**Admin dashboard'is:**
1. Mine Marketing Outreach Manager
2. Vali prospect
3. Kliki "Generate Email"
4. Kliki "Send Email"

**Monitoori webhook'e:**
- Supabase Functions Logs: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/edge-functions
- Filter by function: `resend-webhook` või `resend-reply-handler`

### Test 4: Reply Test

1. Saada email ühele testprospectile
2. Vasta sellele emailile oma personaalse emailist
3. Kontrolli `crm_interactions` tabelis kas reply logitakse:

```sql
SELECT * FROM crm_interactions 
WHERE interaction_type = 'email_reply' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔍 Debugging

### Webhook Ei Tööta?

**Kontrolli:**
1. **URL õige?** Vaata Resend dashboard'is kas URL täpselt õige
2. **Events valitud?** Veendu, et kõik vajalikud event types on märgitud
3. **Secret seadistatud?** Kontrolli Supabase secrets: `npx supabase secrets list`
4. **Logs?** Vaata edge function logs'e: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/edge-functions

### Common Errors

**Error: "Missing Svix headers"**
- ✅ Normal kui RESEND_WEBHOOK_SECRET puudub
- ⚠️ Signature verification disabled, aga webhook töötab ikkagi
- 🔒 Lisa secret turvalisuse jaoks

**Error: "Prospect not found"**
- Email address ei ole `marketing_prospects` tabelis
- Lisa prospect esmalt admin paneelis

**Error: "Failed to parse sentiment"**
- Gemini API error või rate limit
- Kontrolli `GEMINI_API_KEY` secret'i
- Vaata Gemini API quota: https://aistudio.google.com/apikey

---

## 📊 Monitooring

### Real-time Webhook Activity

**Supabase Dashboard:**
```
https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs/edge-functions
```

**Filter options:**
- Function: `resend-webhook`, `resend-reply-handler`
- Status: 200 (success), 4xx/5xx (errors)
- Search: "email.sent", "email_reply", "sentiment"

### Database Queries

**Check recent interactions:**
```sql
SELECT 
  interaction_type,
  channel,
  sentiment,
  subject,
  created_at
FROM crm_interactions 
ORDER BY created_at DESC 
LIMIT 50;
```

**Email delivery stats:**
```sql
SELECT 
  interaction_type,
  COUNT(*) as count,
  DATE_TRUNC('day', created_at) as date
FROM crm_interactions
WHERE channel = 'email'
GROUP BY interaction_type, date
ORDER BY date DESC;
```

**Sentiment analysis:**
```sql
SELECT 
  sentiment,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM crm_interactions
WHERE interaction_type = 'email_reply'
GROUP BY sentiment;
```

---

## 🎯 Järgmised Sammud

Peale webhook'ide seadistamist:

1. ✅ **Update kontaktandmed:**
   ```sql
   UPDATE template_variables 
   SET variable_value = '+372 XXXX XXXX' 
   WHERE variable_name IN ('admin_phone', 'admin_whatsapp');
   ```

2. ✅ **Import Estonian prospects:**
   - CSV fail: `estonian-event-organizers.csv`
   - Admin panel: Marketing Outreach Manager → Import CSV

3. ✅ **Generate first outreach emails:**
   - Vali 5-10 test prospects
   - Generate personalized emails
   - Kontrolli AI-generated content (peaks kasutama verified facts)
   - Saada test batch

4. ✅ **Monitor responses:**
   - Vaata `crm_interactions` tabelit
   - Kontrolli sentiment analysis accuracy
   - Veendu et replied prospects updateruvad

---

## 📞 Support

**Resend Support:**
- Dashboard: https://resend.com/settings/webhooks
- Docs: https://resend.com/docs/webhooks
- Support: support@resend.com

**Supabase Support:**
- Edge Functions Logs: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/logs
- Docs: https://supabase.com/docs/guides/functions

**EventNexus:**
- Email: huntersest@gmail.com
- Production: https://www.eventnexus.eu
