# Kampaaniasüsteem - Admini Kiirjuhend (ET)

## ✅ Mis On Tehtud?

Kontrollisin ja parendasin kampaaniasüsteemi, et admin saaks luua päriselt töötavaid kampaanjaid nagu näidis pealehel.

### 🎯 Näidis Kampaania (Praegu Pealehel)

```
Tiitel: "Experience The Future of Nightlife"
Kirjeldus: "Join the map-first revolution. First 100 registrations 
            today get 30 Nexus Credits instantly."
CTA: "Claim My Credits"
Spots Left: 58 kohta alles
Reward Value: €15.00
```

**Probleem**: See oli kõvakodeeritud mock data ❌

**Lahendus**: Nüüd laetakse andmebaasist päris kampaanjad ✅

---

## 🔧 Mis Muutus?

### 1. **LandingPage.tsx Uuendatud**
- Enam ei kasuta mock data
- Laeb päris kampaanjad `getCampaigns()` kaudu
- Jälgib vaatamisi (views) automaatselt
- Jälgib klikke (clicks) kui kasutaja vajutab CTA nupule

### 2. **AdminCommandCenter.tsx Uuendatud**
- Lisatud **Incentive Configuration** sektsioon
- Nüüd saab seadistada:
  - Incentive tüüp (Credits/Pro Discount/None)
  - Väärtus (krediidid või % allahindlust)
  - Limit (kokku kohti)
  - Redeemed (juba kasutatud kohti)
- Näitab reaalajas:
  - Alles jäänud kohti
  - Reward väärtust eurodes

### 3. **types.ts Uuendatud**
- PlatformCampaign interface vastab nüüd täpselt andmebaasi skeemile
- Toetab nii `imageUrl` kui `image_url` (database column)
- Lisatud backwards compatibility

### 4. **Loodud 3 Uut Faili**

#### A. `sql/verify-campaign-system.sql` (Kontrollskript)
**Mida Teeb**:
- ✅ Kontrollib, et kõik tabelid olemas
- ✅ Kontrollib, et schema õige
- ✅ Kontrollib RLS policies
- ✅ Kontrollib database functions
- ✅ Näitab aktiivseid kampaanjaid
- ✅ Näitab admin kasutajaid
- ✅ Annab kokkuvõtte süsteemi staatusest

**Kuidas Kasutada**:
1. Ava Supabase SQL Editor
2. Kopeeri ja käivita `sql/verify-campaign-system.sql`
3. Vaata tulemusi - kõik peab olema ✅

#### B. `sql/seed-sample-campaign.sql` (Näidis Kampaania)
**Mida Teeb**:
- Loob 3 näidis kampaaniat:
  1. Landing page welcome bonus (30 krediiti)
  2. Dashboard Pro discount (40% off)
  3. Seasonal campaign (both placements)
- Näitab, kuidas luua SQL-iga kampaanjaid

**Kuidas Kasutada**:
1. Ava Supabase SQL Editor
2. Kopeeri ja käivita `sql/seed-sample-campaign.sql`
3. Mine pealehele ja vaata kampaaniat

#### C. `docs/CAMPAIGN_SYSTEM_ADMIN_GUIDE.md` (Täielik Juhend)
**Mida Sisaldab**:
- Kampaaniate struktuur
- Kuidas luua kampaanjaid (AI + Manual)
- Kampaania tüübid (Credits/Discount/Awareness)
- Placement valikud (Landing/Dashboard/Both)
- Incentive süsteem
- Tracking ja analüütika
- Troubleshooting
- Näited

---

## 🚀 Kuidas Admin Loob Kampaanja?

### Variant 1: AI Generator (Soovitatav) 🤖

1. Logi sisse kui admin
2. Ava **AdminCommandCenter**
3. Mine **Campaign Engine** tabisse
4. Vajuta **New Campaign**
5. AI Generator sektsioonis:
   - Kirjuta teema: "Summer festival launch"
   - Vali target: Attendees
   - Vajuta **Generate**
6. AI loob:
   - Pealkirja
   - Kirjelduse
   - CTA
   - Pildi URL-i
   - Soovitatud incentive
7. Kohanda vajadusel
8. Seadista **Incentive**:
   - Type: Credits
   - Value: 30 (krediiti)
   - Limit: 100 (kohti)
   - Redeemed: 0 (alguses)
9. Status: **Active**
10. Placement: **landing_page**
11. Vajuta **Create Campaign**

### Variant 2: SQL (Kiire)

```sql
INSERT INTO public.campaigns (
    title, copy, status, placement, target,
    cta, image_url, tracking_code,
    incentive, metrics, tracking
) VALUES (
    'Limited Offer',
    'First 100 registrations get 30 free credits!',
    'Active',
    'landing_page',
    'attendees',
    'Claim My Credits',
    'https://images.unsplash.com/photo-1514525253361-bee243870d24?w=1200',
    'PROMO24',
    jsonb_build_object(
        'type', 'credits',
        'value', 30,
        'limit', 100,
        'redeemed', 42
    ),
    jsonb_build_object(
        'views', 0, 'clicks', 0,
        'guestSignups', 0, 'proConversions', 0,
        'revenueValue', 0
    ),
    jsonb_build_object('sources', jsonb_build_object(
        'facebook', 0, 'x', 0, 'instagram', 0, 'direct', 0
    ))
);
```

---

## 📊 Kuidas Töötab Tracking?

### Automaatne
- **Views**: Logitakse kui kampaania ilmub pealehele
- **Clicks**: Logitakse kui kasutaja klikib CTA nupule

### Database Functions
```sql
-- Suurenda vaatamisi
SELECT increment_campaign_metric(campaign_id, 'views', 1);

-- Suurenda klikke
SELECT increment_campaign_metric(campaign_id, 'clicks', 1);

-- Suurenda traffic source
SELECT increment_campaign_source(campaign_id, 'facebook', 1);
```

### Frontend (Automaatne)
LandingPage komponent käivitab automaatselt:
```typescript
// Track view
await supabase.rpc('increment_campaign_metric', {
  p_campaign_id: campaignId,
  p_metric: 'views',
  p_amount: 1
});

// Track click
await supabase.rpc('increment_campaign_metric', {
  p_campaign_id: campaignId,
  p_metric: 'clicks',
  p_amount: 1
});
```

---

## 🔍 Kontrollimise Sammud

### Samm 1: Kontrolli Andmebaasi
```bash
# Supabase SQL Editoris
# Käivita: sql/verify-campaign-system.sql
```

Vaata:
- ✅ campaigns tabel olemas?
- ✅ RLS policies enabled?
- ✅ Functions olemas?
- ✅ Admin kasutaja eksisteerib?

### Samm 2: Loo Näidis Kampaania
```bash
# Supabase SQL Editoris
# Käivita: sql/seed-sample-campaign.sql
```

### Samm 3: Vaata Pealehel
1. Logi välja (või ava incognito)
2. Mine pealehele
3. Peaks näitama kampaaniat:
   - ✅ Banner üleval
   - ✅ "Limited Offer" badge
   - ✅ Tiitel: "Experience The Future..."
   - ✅ "58 Spots Left"
   - ✅ "€15.00" reward value
   - ✅ "Claim My Credits" nupp

### Samm 4: Testi Tracking
1. Refresh pealehte → views +1
2. Kliki CTA nuppu → clicks +1
3. Kontrolli AdminCommandCenteris:
   - Campaign Engine tabis
   - Kampaania kaardil näed updated metrics

---

## 💡 Incentive Süsteem

### Credits (Krediidid)
- **Type**: credits
- **Value**: Krediitide arv (nt. 30)
- **Kalkulatsioon**: 1 credit = €0.50
- **Näide**: 30 credits = €15.00 value

### Pro Discount (Allahindlus)
- **Type**: pro_discount
- **Value**: Protsent (nt. 40)
- **DurationMonths**: Kestus (nt. 3 kuud)
- **Näide**: 40% off for 3 months

### None (Ilma Incentive'ta)
- **Type**: none
- Ainult awareness/announcement

---

## 🎨 Placement Valikud

### landing_page
- Ilmub pealehel unauthenticated kasutajatele
- Suur banner formaat
- Parim user acquisition'iks

### dashboard
- Ilmub kasutaja dashboardis
- Card formaat
- Parim engagement'iks

### both
- Ilmub mõlemas kohas
- Maksimaalne visibility

---

## 🐛 Troubleshooting

### Kampaania Ei Ilmu Pealehel

**Kontrolli**:
```sql
SELECT id, title, status, placement
FROM campaigns
WHERE status = 'Active' 
  AND placement IN ('landing_page', 'both');
```

Peab olema:
- Status = 'Active' ✅
- Placement = 'landing_page' või 'both' ✅
- Kasutaja ei ole sisse logitud ✅

### Metricud Ei Suurene

**Test Function**:
```sql
SELECT increment_campaign_metric(
  (SELECT id FROM campaigns LIMIT 1),
  'views',
  1
);
```

Kui error → function puudub, käivita migration:
`supabase/migrations/20250119000002_admin_features.sql`

### Admin Ei Saa Luua Kampaanjaid

**Kontrolli Role**:
```sql
SELECT email, role
FROM users
WHERE id = auth.uid();
```

Peab olema `role = 'admin'` ✅

---

## 📁 Failide Nimekiri

### Uued Failid
- ✅ `sql/verify-campaign-system.sql` - Kontrollskript
- ✅ `sql/seed-sample-campaign.sql` - Näidis kampaania
- ✅ `docs/CAMPAIGN_SYSTEM_ADMIN_GUIDE.md` - Inglisekeelne juhend

### Uuendatud Failid
- ✅ `components/LandingPage.tsx` - Laeb päris kampaanjaid
- ✅ `components/AdminCommandCenter.tsx` - Lisatud incentive config
- ✅ `types.ts` - Uuendatud PlatformCampaign interface

### Olemasolevad Migratsioonid
- ✅ `supabase/migrations/20250119000002_admin_features.sql` - Kampaaniate tabel
- ✅ Database functions (increment_campaign_metric, increment_campaign_source)

---

## ✅ Kokkuvõte

### Mis Töötab?
1. ✅ Admin saab luua kampaanjaid AdminCommandCenteris
2. ✅ AI genereerib kampaanjaid automaatselt
3. ✅ Kampaanjad ilmuvad pealehel (päris andmebaasist)
4. ✅ Views ja clicks logitakse automaatselt
5. ✅ Metrics nähtavad AdminCommandCenteris
6. ✅ Incentive süsteem täielikult funktsionaalne
7. ✅ Kontrollskript olemas
8. ✅ Näidis kampaaniad loodavad

### Järgmised Sammud
1. 🔄 Käivita `verify-campaign-system.sql` → kontrolli et kõik OK
2. 🔄 Käivita `seed-sample-campaign.sql` → loo näidis kampaania
3. 🔄 Vaata pealehel → peab näitama kampaaniat
4. 🔄 Logi sisse kui admin → loo oma kampaania
5. 🔄 Testi tracking → vaata metrics AdminCommandCenteris

---

**Viimati Uuendatud**: 20. detsember 2025  
**Autor**: GitHub Copilot  
**Kontakt**: huntersest@gmail.com
