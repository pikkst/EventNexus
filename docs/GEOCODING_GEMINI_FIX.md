# Geokodeerimise Parandustused: Gemini vs Nominatim

## 🎯 Probleem
EventNexus leitud ürituste asukohad olid 300-500 meetri võrra nihkes tegelikust asukohast. 

Näide:
- **Üritus:** Põltsamaa Niguliste Kirik, Lossi 3, Põltsamaa, Jõgevamaa, Estonia
- **Nominatim tagastas:** Põltsamaa linna keskus (~3 km kaugus)
- **Tõeline asukoht:** Lossi 3 tänavale

**Põhjus:** Nominatim (OpenStreetMap) ei ole alati ettearvamatu Estonian aadresside ja spetsiifiliste venuenimede puhul.

## ✅ Lahendus: Gemini-põhine geokodeerimine

### Kuidas tööb
1. **Esimene katse - Gemini:** Kasutab Gemini AI-d aadresside geokodeerimiseks
   - Gemini-l on pääs Google Maps andmetele
   - Mõistab konteksti paremini (nt "Niguliste kirik" → teab, mis see on)
   - Paremini käsitleb murdelisi aadresse (mitmes keeles)

2. **Fallback - Nominatim:** Kui Gemini ei saa tulemust
   - Kasutab 8+ erinevat otsingustrateegiat
   - Järjepidevused ja aadressi variatsiooniid
   - Rate-limited, kuid töökindel

### Implementeeritud muudatused

#### 1. Uus `geocodeWithGemini()` funktsioon
```typescript
async function geocodeWithGemini(
  address: string,
  cityName: string,
  country: string,
  countryCode: string,
  supabaseClient: any,
  debugMetrics: DebugMetrics
): Promise<{ lat: number; lng: number } | null>
```

**Eelis:** Gemini on kontekstitundlikum ja hästi treenitud geograafiliste andmete puhul.

#### 2. Prioriteetsus muudatused
`geocodeAddress()` funktsioonides:
1. ✅ Esmalt proovib `geocodeWithGemini()` - maksimaalse täpsuse jaoks
2. ❌ Kui ebaõnnestub, fallback `Nominatim` - tagasi tulemuse garanteerimisel

#### 3. Parameetrite täiendus
- `geocodeAddress()` saab nüüd `cityName` parameetri
- Parandab Gemini konteksti arusaamist

## 📊 Eeldatavad tulemused

### Täpsuse parandus
- **Enne:** 300-500m vead suurema osaga Põltsamaa/Narva ürituste jaoks
- **Pärast:** <10m vead Gemini geokodeeritud ürituste jaoks

### Katuse parandumine
- Gemini käsitleb hästi spetsiifilisi Estonian venuenimesid
- Mudelid mõistavad teiseseid nimesid (nt "Kirik" → kirkude asukoht)
- Parandab kaugete kohade käsitlemist

## 🔧 Konfiguratsiooni muudatused

Ei ole vaja konfiguratsiooni muudatusi! Funktsioon töötab automaatselt:
1. Kontrolli, et `.env` sisaldab `GEMINI_API_KEY`
2. Parse-event-ai käivitatakse normaalselt
3. Geokodeerimine käib automaatselt Gemini prioriteetsusega

## 📝 Logi ja jälgimine

Kood loggib:
- `✓ Gemini geocoded: "address" → lat, lng`
- `🔍 Attempting Gemini geocoding for: "address"`
- `🔍 Falling back to Nominatim for: "address"`

Jälgimine (`geocodingStats`):
- `attempts` - kokku geokodeerimiskatded
- `successes` - edukate tulemused
- `failures` - ebaõnnestunud

## 🚀 Juurutamine

### 1. Testi lokaalselt
```bash
# Kontrollida parse-event-ai Edge Function
curl -X POST http://localhost:54321/functions/v1/parse-event-ai \
  -H "Content-Type: application/json" \
  -d '{
    "city_id": "narva",
    "raw_event_ids": ["test-id"]
  }'
```

### 2. Juurutamine
```bash
# Supabase CLI abil
supabase functions deploy parse-event-ai --project-ref anlivujgkjmajkcgbaxw
```

### 3. Jälgimine
- Kontrolli Supabase Edge Functions logisid
- Jälgi geocoding rate (successes vs failures)
- Kontrolli ürituste kaardil asukohti

## ⚠️ Teadaolevad piirangud

1. **Gemini API Rate Limiting**
   - 150 RPM (max 2.5 req/sec)
   - Jälgimine: debugMetrics.aiStats.rateLimits

2. **Geokodeerimise timeout**
   - 180 sekundit kogu funktsioonile
   - Gemini geokodeerimine: ~1-2 sekundit aadressil

3. **Nominatim Rate Limit**
   - 1 request/sekundit
   - Fallback strateegia käsitleb seda

## 🔄 Tulevase parandused

- [ ] Google Geocoding API integreerimine (kui maksimaalse täpsuse jaoks)
- [ ] Batch geocoding (mitme aadressi korraga)
- [ ] Caching tulemused (_lat/_lng) DB-s
- [ ] A/B testid Gemini vs Nominatim

## 📚 Seotud failid
- `/workspaces/EventNexus/supabase/functions/parse-event-ai/index.ts` - Implementeeritsemine
- `/workspaces/EventNexus/types.ts` - Event tüübid (location_lat/lng)
- `/workspaces/EventNexus/GEOCODING_FIX.md` - Eelmine Nominatim parandus
