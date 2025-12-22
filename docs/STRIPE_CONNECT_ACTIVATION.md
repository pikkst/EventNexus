# Stripe Connect Automaatsete Payoutide Aktiveerimine

## Hetkeolukord

✅ **Olemas:**
- Edge Function: `process-scheduled-payouts` (deployed)
- Edge Function: `verify-connect-onboarding` (deployed)
- Migration fail: `20250120000002_setup_payout_cron.sql`
- Payouts tabel andmebaasis

❌ **Puudub/Ei tööta:**
- Cron job ei ole aktiveeritud Supabase'is
- Test mode'is Stripe ei tee automaatseid transfere
- Service role key ei ole cron job'is seadistatud

---

## Samm-sammult Aktiveerimine

### 1️⃣ Aktiveeri Cron Job Supabase'is

**Ava Supabase Dashboard:**
1. Mine: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw
2. Vali: **SQL Editor**
3. Käivita järgmine SQL:

```sql
-- Kontrolli kas pg_cron on installitud
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Kui pole, installi (võib anda errori kui juba installitud - see on OK):
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Käivita cron job
-- OLULINE: Asenda 'SINU_SERVICE_ROLE_KEY' oma tegeliku võtmega!
-- Leia see: Supabase Dashboard → Settings → API → "service_role" "secret" key
SELECT cron.schedule(
  'process-scheduled-payouts-daily',
  '0 2 * * *', -- Iga päev kell 2:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NjQ5NCwiZXhwIjoyMDgxNTcyNDk0fQ.ASENDA_SIIA_OMA_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $$
);

-- Kontrolli kas töötab
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'process-scheduled-payouts%';
```

### 2️⃣ Test Manuaalselt (Stripe Test Mode)

Kuna Stripe test mode'is automaatsed transferid ei tööta, testi manuaalselt:

```bash
# Käivita Edge Function otse
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts' \
  -H "Authorization: Bearer SINU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Või Supabase SQL Editor'is:**

```sql
-- Asenda 'eyJhbGci...' oma service_role key'ga
SELECT net.http_post(
  url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTk5NjQ5NCwiZXhwIjoyMDgxNTcyNDk0fQ.ASENDA_OMA_SERVICE_ROLE_KEY',
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
) AS request_id;

-- OLULINE: Võti peab olema 'service_role', MITTE 'anon'!
-- Leia õige võti: Dashboard → Settings → API → "service_role" "secret"
```

### 3️⃣ Kontrolli Tulemusi

**Vaata Edge Function logi:**
```bash
npx supabase functions logs process-scheduled-payouts --limit 50
```

**Kontrolli payouts tabelit:**
```sql
SELECT 
  id,
  user_id,
  event_id,
  gross_amount / 100.0 as gross_eur,
  platform_fee / 100.0 as fee_eur,
  net_amount / 100.0 as net_eur,
  status,
  processed_at,
  stripe_transfer_id
FROM payouts
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Stripe Test Mode Piirangud

### Mis EI tööta test mode'is:
- ❌ Automaatsed Stripe transferid ei pruugi näidata Connected accountis
- ❌ Test rahad on virtuaalsed
- ❌ Payout timing võib erineda live mode'ist

### Mis töötab test mode'is:
- ✅ Edge Function töötab ja logib
- ✅ Andmebaasi kirjed luuakse
- ✅ Stripe API kutsed õnnestuvad
- ✅ `stripe_transfer_id` genereeritakse

---

## 🧪 Testimise Stsenaarium

### Test 1: Loo Testpileti Ost

1. **Loo test event** (hind €10)
2. **Osta test pilet** Stripe test kaardiga: `4242 4242 4242 4242`
3. **Muuda event kuupäev** möödunud ajale:
   ```sql
   UPDATE events 
   SET date = NOW() - INTERVAL '3 days'
   WHERE id = 'SINU_EVENT_ID';
   ```

4. **Käivita payout käsitsi:**
   ```sql
   SELECT net.http_post(
     url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/process-scheduled-payouts',
     headers := jsonb_build_object(
       'Authorization', 'Bearer SERVICE_ROLE_KEY',
       'Content-Type', 'application/json'
     ),
     body := '{}'::jsonb
   );
   ```

5. **Kontrolli tulemust:**
   ```sql
   -- Vaata kas payout loodi
   SELECT * FROM payouts ORDER BY created_at DESC LIMIT 1;
   
   -- Vaata Stripe transfer ID't
   SELECT stripe_transfer_id, status, net_amount FROM payouts 
   WHERE event_id = 'SINU_EVENT_ID';
   ```

6. **Kontrolli Stripe Dashboard'is:**
   - Mine: https://dashboard.stripe.com/test/connect/transfers
   - Otsi `stripe_transfer_id` järgi

---

## 🚀 Live Mode Aktiveerimine

Kui oled testinud ja kõik töötab:

### 1. Vaheta Stripe võtmed live'iks
```bash
# Supabase Dashboard → Project Settings → Edge Functions
STRIPE_SECRET_KEY=sk_live_...  # (mitte sk_test_...)
```

### 2. Uuesti deploy Edge Functions
```bash
npx supabase functions deploy process-scheduled-payouts --no-verify-jwt
npx supabase functions deploy create-connect-account --no-verify-jwt
```

### 3. Cron job töötab automaatselt

Live mode'is:
- ✅ Iga päev kell 2:00 UTC käivitatakse automaatselt
- ✅ Stripe teeb reaalsed transferid
- ✅ Raha liigub organisaatorite arveldusele

---

## 📊 Refund Loogika

Hetkel refundid **PEAVAD olema käsitsi tehtud**:

### Käsitsi Refund Test Mode'is:

1. **Kontrolli eligibility:**
   ```sql
   SELECT * FROM get_refund_eligibility('2025-01-15 19:00:00'::timestamptz);
   ```

2. **Tee Stripe refund:**
   ```bash
   # Stripe CLI või API
   stripe refunds create --payment-intent=pi_xxx --amount=1000
   ```

3. **Salvesta meie andmebaasi:**
   ```sql
   INSERT INTO refunds (
     ticket_id, user_id, event_id,
     original_amount, refund_amount, refund_percent,
     platform_fee_refunded, organizer_amount_reversed,
     status, reason
   ) VALUES (...);
   ```

### ⚠️ TODO: Automaatne Refund Edge Function
Praegu puudub. Peaks looma: `process-refund-request`

---

## ✅ Kontrolli Nimekiri

- [ ] Cron job aktiveeritud Supabase'is
- [ ] Service role key seadistatud
- [ ] Test payout käsitsi tehtud
- [ ] Payouts tabelis kirjed nähtavad
- [ ] Stripe transferid loodud (test/live)
- [ ] Notification kasutajale saadetud
- [ ] Events tabel: `payout_processed = TRUE`
- [ ] Live mode võtmed vahetatud

---

## 🆘 Troubleshooting

### Cron job ei käivitu
```sql
-- Kontrolli vigu
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC LIMIT 10;
```

### Edge Function error
```bash
# Vaata logi
npx supabase functions logs process-scheduled-payouts --limit 100
```

### Transfer ei ilmu Stripe'is
- Kontrolli kas test mode või live mode
- Kontrolli Stripe Connect accounti staatus
- Vaata Stripe Dashboard → Connect → Transfers

---

**Kokkuvõte:** 
Automaatne payout süsteem on koodis valmis, aga vajab:
1. Cron job'i aktiveerimist Supabase'is
2. Test mode'is manuaalset testimist
3. Live mode'i aktiveerimist tootmises
