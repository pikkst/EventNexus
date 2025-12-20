# AI Promotsioonitööriistad ja Krediidisüsteem - Kiirjuhend

## 📋 Mis on Tehtud?

### 1. **Sotsiaalmeedia Postitamise Teenus**
- Uus fail: `services/socialMediaService.ts`
- Toetab: Facebook, Instagram, Twitter/X, LinkedIn
- Võimaldab:
  - Genereerida platvormi-spetsiifilist sisu
  - Postitada kõigile ühendatud platvormidele korraga
  - Ajastada postitusi tulevikuks
  - Jälgida engagement metriikaid

### 2. **AI Teenused Krediidisüsteemiga**
- Uuendatud fail: `services/geminiService.ts`
- Kõik AI funktsioonid kasutavad nüüd krediite:
  - **Kampaania genereerimine**: 50 krediiti
  - **AI pilt**: 30 krediiti
  - **Sotsiaalmeedia postitused**: 25 krediiti
  - **Reklaamkampaania**: 40 krediiti
  - **Pealkiri/tagline**: 10 krediiti
  - **Tõlge**: 5 krediiti

### 3. **Krediidihaldus**
- Uuendatud fail: `services/dbService.ts`
- Uued funktsioonid:
  - `addUserCredits()` - lisa krediite
  - `deductUserCredits()` - võta krediite maha
  - `checkUserCredits()` - kontrolli kas piisab
  - `getUserCredits()` - hangi jääk

### 4. **Andmebaasi Skeem**
- Uus migratsioon: `supabase/migrations/20250120000001_social_media_integration.sql`
- Uued tabelid:
  - `social_media_accounts` - ühendatud sotsiaalmeedia kontod
  - `social_media_posts` - ajastatud ja postitatud sisu
  - `campaign_social_content` - AI genereeritud sotsiaalmeedia sisu

### 5. **Dokumentatsioon**
- Täielik juhend: `docs/AI_PROMOTION_TOOLS_IMPLEMENTATION.md` (inglise keeles)

## 🚀 Kuidas Kasutada?

### Adminnina (AdminCommandCenter):

1. **Uue Kampaania Loomine**:
   ```
   AdminCommandCenter → Marketing tab → "New Campaign"
   → Sisesta teema → "Generate with AI"
   → AI genereerib kampaania + pildi + sotsiaalmeedia sisu
   → Salvesta
   ```

2. **Kasutajate Krediidihaldus**:
   ```
   AdminCommandCenter → User Governance
   → Vali kasutaja → Muuda krediite
   ```

### Kasutajana:

1. **AI Pilt Eventile** (30 krediiti):
   ```
   Dashboard → Create Event → "Generate Image with AI"
   ```

2. **Marketing Tagline** (10 krediiti):
   ```
   Event Creation → "Generate Tagline"
   ```

3. **Sotsiaalmeedia Postitused** (25 krediiti):
   ```
   Dashboard → My Events → Select Event → "Generate Social Posts"
   ```

## 💰 Krediidisüsteem

### Igakuised Krediidid Plaanide järgi:
- **Free**: 0 krediiti
- **Pro**: 100 krediiti/kuu
- **Premium**: 500 krediiti/kuu
- **Enterprise**: 2000 krediiti/kuu

### Krediitide Ostmine (Stripe kaudu):
- 100 krediiti = $5
- 500 krediiti = $20 (20% allahindlust)
- 1000 krediiti = $35 (30% allahindlust)
- 5000 krediiti = $150 (40% allahindlust)

## 📥 Paigaldamine

### Samm 1: Käivita Andmebaasi Migratsioon

Supabase SQL Editoris:
```bash
# Ava fail ja käivita:
supabase/migrations/20250120000001_social_media_integration.sql
```

### Samm 2: Seadista Sotsiaalmeedia API Võtmed

#### Facebook/Instagram:
1. Mine developers.facebook.com
2. Loo uus app
3. Lisa võtmed:
```sql
INSERT INTO system_config (key, value) VALUES
  ('facebook_app_id', '"SINU_APP_ID"'::jsonb),
  ('facebook_app_secret', '"SINU_APP_SECRET"'::jsonb);
```

#### Twitter/X:
1. Mine developer.twitter.com
2. Loo uus app
3. Lisa võtmed:
```sql
INSERT INTO system_config (key, value) VALUES
  ('twitter_api_key', '"SINU_API_KEY"'::jsonb),
  ('twitter_api_secret', '"SINU_API_SECRET"'::jsonb);
```

#### LinkedIn:
1. Mine developers.linkedin.com
2. Loo uus app
3. Lisa võtmed:
```sql
INSERT INTO system_config (key, value) VALUES
  ('linkedin_client_id', '"SINU_CLIENT_ID"'::jsonb),
  ('linkedin_client_secret', '"SINU_CLIENT_SECRET"'::jsonb);
```

### Samm 3: Lisa Stripe'i Krediitide Tooted

Käivita terminalis:
```bash
# 100 krediiti - $5
stripe products create --name="100 Credits" --description="100 EventNexus AI Credits"
stripe prices create --product=prod_xxx --unit-amount=500 --currency=usd

# 500 krediiti - $20
stripe products create --name="500 Credits" --description="500 EventNexus AI Credits"
stripe prices create --product=prod_xxx --unit-amount=2000 --currency=usd
```

### Samm 4: Uuenda Stripe Webhook Handler

Lisa oma Stripe webhook handleris:
```typescript
case 'checkout.session.completed':
  if (session.metadata?.type === 'credits') {
    const userId = session.metadata.userId;
    const credits = parseInt(session.metadata.credits);
    await addUserCredits(userId, credits);
  }
  break;
```

## 🧪 Testimine

### Testi Krediidisüsteemi:
```typescript
import { checkUserCredits, deductUserCredits } from './services/dbService';

// Kontrolli kas piisab
const hasCredits = await checkUserCredits('user-id', 50);
console.log('Has credits:', hasCredits);

// Võta maha
const success = await deductUserCredits('user-id', 50);
console.log('Deduction success:', success);
```

### Testi AI Genereerimist:
```typescript
import { generatePlatformGrowthCampaign, AI_CREDIT_COSTS } from './services/geminiService';

console.log('Cost:', AI_CREDIT_COSTS.CAMPAIGN_GENERATION); // 50

try {
  const campaign = await generatePlatformGrowthCampaign(
    'Summer Music Festival',
    'attendees',
    'user-id' // Kui antud, võtab krediite
  );
  console.log('Generated:', campaign);
} catch (error) {
  console.error('Error:', error.message); // 'Insufficient credits...'
}
```

### Testi Sotsiaalmeedia Sisu:
```typescript
import { generateSocialMediaContent } from './services/socialMediaService';

const content = generateSocialMediaContent(
  'Join EventNexus!',
  'Discover amazing events',
  'Sign Up Now',
  'PROMO-2024'
);

console.log('Facebook:', content.facebook);
console.log('Instagram:', content.instagram);
console.log('Twitter:', content.twitter);
console.log('LinkedIn:', content.linkedin);
```

## ⚠️ Tähtis!

1. **API Võtmed**: Hoia kõik API võtmed turvaliselt
2. **Krediidid**: Kontrolli alati krediite enne AI operatsioone
3. **Rate Limits**: Järgi sotsiaalmeedia platvormide rate limite
4. **Testimine**: Testi kõike development keskkonnas enne production'i

## 📊 Mis Veel Vaja?

### Järgmised Sammud:
1. **OAuth Vood**: Sotsiaalmeedia kontode ühendamiseks
2. **Kasutajaliides**: Krediitide ostmine ja sotsiaalmeedia kontode haldamine
3. **Ajastamise UI**: Postituste ajastamine kalendriga
4. **Metriikad Dashboard**: Reaalajas postituste statistika

### Tulevikuks:
- A/B testimine kampaaniate jaoks
- Automaatne optimeerimine tulemuste põhjal
- ROI tracking per kampaania
- Trend analüüs

## 🆘 Abi Vajad?

1. **Logid**: Supabase Dashboard → Logs
2. **Vead**: Browser Console → F12
3. **SQL**: Supabase SQL Editor
4. **Email**: huntersest@gmail.com

## 📁 Failide Ülevaade

### Uued Failid:
```
services/
  socialMediaService.ts          # Sotsiaalmeedia postitamine

supabase/migrations/
  20250120000001_social_media_integration.sql  # Andmebaasi skeem

docs/
  AI_PROMOTION_TOOLS_IMPLEMENTATION.md  # Täielik dokumentatsioon (EN)
```

### Uuendatud Failid:
```
services/
  geminiService.ts              # AI funktsioonid + krediidid
  dbService.ts                  # Krediidihaldus funktsioonid
```

## ✅ Kontrollnimekiri

Enne production'i:
- [ ] Käivita database migration
- [ ] Seadista sotsiaalmeedia API võtmed
- [ ] Loo Stripe'i krediitide tooted
- [ ] Uuenda Stripe webhook handler
- [ ] Testi krediidisüsteemi
- [ ] Testi AI genereerimist
- [ ] Testi sotsiaalmeedia postitamist
- [ ] Lisa krediitide ostmise UI
- [ ] Lisa sotsiaalmeedia kontode ühendamise UI

## 🎉 Valmis!

Kõik on nüüd seadistatud ja valmis kasutamiseks. Admin dashboard'il on juba olemas kampaaniate haldamine, ja uued funktsioonid on lihtsalt lisatud olemasolevatele võimalustele.

**Küsimused?** Kirjuta: huntersest@gmail.com

---

**Viimati Uuendatud**: 20. detsember 2025  
**Versioon**: 1.0.0  
**Staatus**: Valmis Kasutamiseks
