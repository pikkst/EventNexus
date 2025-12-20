# Brand Monitoring - Production Ready! ✅

## Mis muutus?

**ENNE:** API võtmed `.env.local` failis kliendipoolses koodis ❌  
**PÄRAST:** API võtmed Supabase Secrets'ides, API kutsed serveripoolselt ✅

## Arhitektuur

```
Admin Dashboard (brauser)
         ↓
brandMonitoringService.ts (klient)
         ↓
Edge Function (server - Supabase)
         ↓
Välised API'd (GitHub, WHOIS, jne)
         ↓
Andmebaas (brand_monitoring_alerts)
```

## Failid

### 1. Edge Function
**Fail:** `supabase/functions/brand-monitoring/index.ts`
- Teeb API kutseid turvaliselt serveripoolselt
- Verifitseerib admin kasutaja
- Salvestab hoiatused andmebaasi

### 2. Kliendi Service
**Fail:** `services/brandMonitoringService.ts`
- Kutsub Edge Function'i
- Töötab ilma API võtmeteta kliendis
- Tagastab tulemused dashboardi

### 3. Deployment Juhend
**Fail:** `docs/BRAND_MONITORING_DEPLOYMENT.md`
- Samm-sammult deployment
- API võtmete seadistamine
- Automatiseeritud skannid

## Deployment Sammud

### 1. Deploy Edge Function

```bash
# Logi sisse
supabase login

# Lingi projektiga
supabase link --project-ref anlivujgkjmajkcgbaxw

# Deploy function
supabase functions deploy brand-monitoring
```

### 2. Lisa API Võtmed

```bash
# GitHub (kohustuslik koodi monitooringus)
supabase secrets set GITHUB_TOKEN=ghp_your_token

# WHOIS (kohustuslik domeeni monitooringus)
supabase secrets set WHOIS_API_KEY=your_key

# Google Search (valikuline)
supabase secrets set GOOGLE_SEARCH_KEY=your_key
supabase secrets set GOOGLE_SEARCH_ENGINE=your_engine_id

# Twitter (valikuline)
supabase secrets set TWITTER_BEARER_TOKEN=your_token
```

### 3. Käivita Andmebaasi Migratsioon

Supabase SQL Editoris:
```sql
-- Kopeeri ja käivita fail: sql/create-brand-monitoring-tables.sql
```

### 4. Testi

1. Logi sisse admin kasutajana
2. Mine Admin Command Center → Brand Protection
3. Klõpsa "Scan Now"
4. Vaata tulemusi

## API Võtmete Hankimine

### GitHub (TASUTA)
1. Mine: https://github.com/settings/tokens
2. Loo uus token
3. Vali scope: `repo`
4. Kopeeri token

### WHOIS API (TASUTA 1000/kuu)
1. Registreeru: https://whoisxmlapi.com/
2. Võta API key
3. Kasuta tasuta plaani

### Google Search (TASUTA 100/päev)
1. Loo projekt: https://console.cloud.google.com/
2. Aktiveeri "Custom Search API"
3. Loo credentials
4. Loo Search Engine: https://cse.google.com/

### Twitter (TASUTA Basic)
1. Registreeru: https://developer.twitter.com/
2. Loo app
3. Võta Bearer Token

## Automatiseerimine (Valikuline)

Seadista automaatsed skannid Supabase Cron'iga:

```sql
-- Igal 6 tunni järel
SELECT cron.schedule(
  'brand-monitoring',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/brand-monitoring',
    headers:='{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"action": "comprehensive"}'::jsonb
  );
  $$
);
```

## Kuidas Töötab?

### 1. Admin Klikib "Scan Now"
```typescript
// components/BrandProtectionMonitor.tsx
<button onClick={() => runScan('code')}>Scan Now</button>
```

### 2. Kliendi Service Kutsub Edge Function'i
```typescript
// services/brandMonitoringService.ts
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/brand-monitoring`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action: 'scan-code' })
  }
);
```

### 3. Edge Function Teeb API Kutse
```typescript
// supabase/functions/brand-monitoring/index.ts
const response = await fetch(
  'https://api.github.com/search/code?q=EventNexus',
  {
    headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
  }
);
```

### 4. Tulemused Salvestatakse Andmebaasi
```typescript
await supabase
  .from('brand_monitoring_alerts')
  .insert(alerts);
```

### 5. Dashboard Näitab Hoiatusi
```typescript
// Komponendis
const alerts = await getMonitoringAlerts();
```

## Turvalisus ✅

- ✅ API võtmed ei ole kunagi kliendipoolses koodis
- ✅ Kõik API kutsed serveripoolselt
- ✅ Admin roll verifitseeritud enne skannimist
- ✅ RLS policies andmebaasis
- ✅ Rate limiting kontrolli all

## Kulud

### Tasuta Variantidega (0€/kuu)
- GitHub API: Tasuta 5000 req/h
- WHOIS: Tasuta 1000/kuu
- Google Search: Tasuta 100/päev
- Twitter Basic: Tasuta
- Supabase Functions: Tasuta 500K req/kuu

### Täis Funktsiooniga (~50€/kuu)
- GitHub API: Tasuta
- WHOIS Premium: ~20€/kuu
- Google Search Premium: ~10€/kuu  
- Twitter Professional: ~100€/kuu (kõrge limit)
- Brand24: ~20€/kuu

**Soovitus:** Alusta TASUTA variantidega!

## Kontroll

### Vaata Edge Function Logisid
```bash
supabase functions logs brand-monitoring --tail
```

### Vaata Hoiatusi Andmebaasis
```sql
SELECT * FROM brand_monitoring_alerts 
ORDER BY timestamp DESC LIMIT 10;
```

### Kontrolli Secrets'e
```bash
supabase secrets list
```

## Probleemid?

### "Unauthorized" viga
- Kontrolli, et kasutajal on `role = 'admin'`
- Verifitseeri RLS policies

### "API key not configured"
- Lisa secret: `supabase secrets set SECRET_NAME=value`
- Redeploy function: `supabase functions deploy brand-monitoring`

### Rate limit ületatud
- Vähenda skannimise sagedust
- Implementeeri caching
- Kontrolli API plaani limiite

## Järgmised Sammud

1. ✅ Deploy Edge Function
2. ✅ Lisa vähemalt GitHub API võti
3. ✅ Käivita andmebaasi migratsioon
4. ✅ Testi dashboard'is
5. 📧 Seadista email'i hoiatused (valikuline)
6. ⏰ Seadista cron jobid (valikuline)
7. 📊 Jälgi API kasutust

## Tugi

**Email:** huntersest@gmail.com  
**Teema:** "Brand Monitoring Setup"

---

**Status:** ✅ VALMIS PRODUCTION'ISki!  
**Deployment aeg:** ~15 minutit  
**Viimati uuendatud:** 20. detsember 2025
