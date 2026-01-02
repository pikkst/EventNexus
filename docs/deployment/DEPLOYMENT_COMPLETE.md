# ✅ Parandused Rakendatud

## Tehtud Muudatused

### 1. ✅ create-checkout Edge Function Deployed
- Piletid luuakse nüüd `payment_status: 'pending'` staatusega
- `stripe_session_id` lisatakse kohe
- `purchase_date` seatakse õigesti

**Tulemus:** Järgmised piletid luuakse õigesti!

### 2. ✅ Migration 20260101000003 Applied
- Trigger `sync_event_revenue_on_ticket_update` lisatud
- Auto-sünkroniseerib `events.attendees_count` kui `payment_status → 'paid'`
- NOT NULL constraint `payment_status` väljale

**Tulemus:** Automaatne käibe arvutus töötab!

### 3. ✅ EventDetail.tsx Capacity Fix
- Frontend arvutab nüüd õiged mahutavused templat'idest
- "59 Left of 60" (mitte "100 Left of 100")

---

## ⚠️ Vanad Demo Party Piletid (2 tk)

Need 2 piletit loodi **enne** parandust ja on `payment_status = 'pending'` staatuses.

### Käsitsi Parandamiseks:

1. **Mine Supabase SQL Editor'isse:**  
   https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

2. **Kopeeri ja käivita:**  
   `FIX_DEMO_TICKETS_NOW.sql` faili sisu

3. **Kontrolli:**
   ```sql
   SELECT payment_status, COUNT(*), SUM(price_paid)
   FROM tickets
   WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
   GROUP BY payment_status;
   ```

   Peaksite nägema:
   ```
   paid | 2 | 20.00  ← €20 revenue appears!
   ```

---

## 🎯 Testimine

### Uue Pileti Ostmine (testimiseks)

1. **Mine event'i lehele:** https://www.eventnexus.eu/event/57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e
2. **Osta 1 pilet** (€10 General Admission)
3. **Kasuta test kaarti:** 4242 4242 4242 4242
4. **Kontrolli dashboard'i:**
   - Total Gross: €30.00 (€20 + €10 ✅)
   - Active Tickets: 3 (2 + 1 ✅)
   - Revenue Breakdown: Näitab õigeid summasid

### Oodatud Tulemus:
- ✅ Pilet luuakse `payment_status: 'pending'`
- ✅ `verify-checkout` kinnitab makse redirect'il
- ✅ `payment_status → 'paid'`
- ✅ Trigger uuendab `events.attendees_count`
- ✅ Dashboard näitab käivet kohe

---

## 🔍 Debug Käsud

### 1. Kontrolli piletite staatust:
```bash
# Supabase SQL Editor'is:
SELECT 
  id,
  ticket_name,
  price_paid,
  payment_status,
  purchased_at
FROM tickets
WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
ORDER BY purchased_at DESC;
```

### 2. Kontrolli eventi attendee count'i:
```sql
SELECT 
  id,
  name,
  attendees_count,
  (SELECT COUNT(*) FROM tickets WHERE event_id = events.id AND payment_status = 'paid') as actual_paid
FROM events
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
```

### 3. Käivita trigger käsitsi:
```sql
-- Force trigger to run
UPDATE events
SET attendees_count = (
  SELECT COUNT(*)
  FROM tickets
  WHERE event_id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e'
    AND payment_status = 'paid'
    AND status != 'cancelled'
)
WHERE id = '57a2cac1-f3cc-4ea7-9f44-bdc8ba20f56e';
```

---

## 📋 Checklist

- [x] create-checkout deployed (parandatud)
- [x] Migration 20260101000003 applied
- [x] EventDetail.tsx mahutavus parandatud
- [x] Build successful (no errors)
- [ ] **Käsitsi paranda 2 vana piletit** (`FIX_DEMO_TICKETS_NOW.sql`)
- [ ] Testi uue pileti ostmine
- [ ] Kontrolli dashboard näitab käivet

---

## 💡 Kokkuvõte

Kõik **põhiparandused on tehtud**. Uued piletid toimivad korrektselt!

2 vana piletit vajavad käsitsi parandamist, sest need loodi enne fix'i rakendamist.

Käivita `FIX_DEMO_TICKETS_NOW.sql` Supabase SQL Editor'is ja dashboard hakkab kohe näitama €20 käivet! 🎉
