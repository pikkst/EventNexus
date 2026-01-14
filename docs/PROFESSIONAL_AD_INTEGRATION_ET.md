# Professionaalse Reklaamikampaania Looja Integratsioon

## Ülevaade

Integreerisime edukalt **Professionaalse Reklaamikampaania Looja** EventNexus platvormile. See asendab vana lihtsa pildipõhise reklaamigeneraatori võimsa 60-sekundilise video reklaamide loojaga.

## Mis Muutus?

### ✅ Uus Süsteem - Professionaalsed Videoreklaamid

**Kasutajatele (Pro+ tasemed):**
- **Asukoht**: Dashboard → Marketing Studio → "Professional Video Ads" nupp
- **Hind**: 200 krediiti per videoreklaam
- **Väljund**: 60-sekundiline professionaalne video koos heliriba ja sotsiaalmeedia koopiaga
- **Platvormid**: Facebook, Instagram, LinkedIn, TikTok, YouTube
- **Formaadid**: 16:9 (landscape) ja 9:16 (portrait/Stories)

**Adminnidele (platvorm marketing):**
- **Asukoht**: `/admin/platform-ads` (otsene link)
- **Hind**: TASUTA (adminnitele ei võeta krediite maha)
- **Otstarve**: EventNexus platvormi enda reklaamide loomine
- **Eelnevalt täidetud**: Platvormi URL (www.eventnexus.eu)

### 📸 Vana Süsteem - Lihtne Pildireklaam

**Endiselt saadaval:**
- Dashboard → Marketing Studio → "Generate Ads" nupp (allpool videoreklaamist)
- Hind: 30 krediiti per kampaania
- Väljund: Kiired pildireklaamid mitmele platvormile

## Kasutamine

### Kasutaja Voog (Ürituse Reklaam)

1. **Mine Dashboardile** → vali "Marketing Studio" tab
2. **Vali üritus** rippmenüüst
3. **Kliki "Create Video Ad (200 Credits)"**
4. **Vali platvorm** (Facebook, Instagram, jne)
5. **Vali formaat** (16:9 landscape või 9:16 portrait)
6. **Kliki "Generate Professional Ad Campaign"**
7. **Oota 3-5 minutit** (5 etappi):
   - Analüüsimine (brändi DNA)
   - Stseen 1: Haak (0-12s)
   - Stseen 2: Tee (12-25s)
   - Stseen 3: Avastus (25-40s)
   - Stseen 4: Jõud (40-52s)
   - Stseen 5 + Heli (52-60s)
8. **Lae alla või jaga** valmis videoreklaam

### Admini Voog (Platvormi Reklaam)

1. **Mine otse**: `/#/admin/platform-ads`
2. **Vali platvorm ja formaat**
3. **Genereeri** (TASUTA, krediite ei võeta)
4. **Kasuta** EventNexus turunduskampaaniates

## Tehnilised Detailid

### Uued Failid
- **`/components/ProfessionalAdCampaignCreator.tsx`** - Peamine komponent
- **`/docs/PROFESSIONAL_AD_CAMPAIGN_INTEGRATION.md`** - Täielik dokumentatsioon

### Muudetud Failid
- **`/services/geminiService.ts`** - Lisatud videogenereerimise funktsioonid
- **`/components/Dashboard.tsx`** - Integreeritud Marketing Studio'sse
- **`/App.tsx`** - Lisatud admini route `/admin/platform-ads`

### API'd ja Mudelid
- **Gemini 3 Pro Preview** - Analüüs + Google Search
- **Veo 3.1 Generate Preview** - Video genereerimine
- **Gemini 2.5 Flash TTS** - Hääletöötlus (Charon voice)

## Ligipääsukontroll

### Tellimus Tierid
- **Free**: ❌ Blokeeritud (nuppküsib upgrade'i)
- **Pro**: ✅ Juurdepääs (200 krediiti per video)
- **Premium**: ✅ Juurdepääs (200 krediiti per video)
- **Enterprise**: ✅ Juurdepääs (200 krediiti per video)
- **Admin**: ✅ Piiramatu TASUTA juurdepääs

### Krediidisüsteem
- **Kontroll**: Enne genereerimist kontrollitakse, kas kasutajal on 200 krediiti
- **Mahaarvamine**: Pärast edukat genereerimist arvatakse 200 krediiti maha
- **Adminn**: Krediite ei kontrollita ega võeta maha

## Väljund

### Video (MP4)
- **Pikkus**: 60 sekundit
- **Kvaliteet**: 720p
- **Stiil**: Kinemaatiline, professionaalne
- **Järjepidevus**: Visuaalselt ühtne läbi kõigi stseenide

### Heli (Base64)
- **Keel**: Inglise keel
- **Hääl**: Charon (autoriteetne, professionaalne)
- **Toon**: Kõrgetasemeline kommerts/reklaam

### Sotsiaalmeedia Koopia
- **Pealkiri**: Haarav headline
- **Keha tekst**: Veenev body copy
- **CTA**: Selge call-to-action
- **Hashtag'd**: 4-6 platvormispetsiifilist hashtagi

### Uurimisallikad
- 3-5 Google Search tulemust
- Lisaväärtus: Näitab turu insight'e
- Klikitavad lingid allikatele

## Testimine

### Kasutaja Test
```bash
# 1. Logi sisse Pro+ kasutajana
# 2. Mine Dashboard → Marketing Studio
# 3. Vali üritus
# 4. Kliki "Create Video Ad"
# 5. Vali platvorm: Facebook
# 6. Vali formaat: 16:9
# 7. Kliki "Generate"
# 8. Oota ~3-5 min
# 9. Kontrolli väljundit
```

### Admini Test
```bash
# 1. Logi sisse admin kasutajana
# 2. Mine /#/admin/platform-ads
# 3. Vali platvorm: Instagram
# 4. Vali formaat: 9:16 (Stories)
# 5. Kliki "Generate"
# 6. Kontrolli, et krediite ei võetud
# 7. Lae alla EventNexus platform ad
```

## Vead ja Veaotsing

### "Insufficient Credits"
- **Põhjus**: Kasutajal pole piisavalt krediite (< 200)
- **Lahendus**: Osta krediite või upgrade Premium'ile

### "API Quota Exceeded"
- **Põhjus**: Gemini API limiit ületatud
- **Lahendus**: Kasuta teist API võtit või oota kvoodireseetti

### "Video Generation Failed"
- **Põhjus**: Veo mudel ei ole saadaval või võrguviga
- **Lahendus**: Proovi uuesti, kontrolli API võtit

### Progress Jääb Kinni
- **Normaalne**: Video genereerimine võib võtta kuni 5 minutit
- **Võrguviga**: Kontrolli internetiühendust
- **API probleem**: Vaata konsooli logisid

## Deployment

### Keskkonna Muutujad
```env
GEMINI_API_KEY=your_gemini_key_here
```

### Build
```bash
npm run build
# ✅ No errors
```

### Production URL
```
https://www.eventnexus.eu/admin/platform-ads (adminn)
https://www.eventnexus.eu/dashboard (kasutaja)
```

## Kokkuvõte

✅ **Valmis Tootmiseks**
- Uus professionaalne videoreklaamide looja
- Täielik integratsioon Dashboard'i
- Adminnide jaoks eraldi marsruut
- Tier-põhine ligipääsukontroll
- Krediidisüsteem toimib
- Ei ole build vigu

🎬 **Mõlemad Süsteemid Saadaval**
- **Uus**: 60s videoreklaamid (200 krediiti)
- **Vana**: Kiired pildireklaamid (30 krediiti)
- Kasutaja saab valida vastavalt vajadusele

📞 **Tugi**
- Email: huntersest@gmail.com
- Help Center: /help
- Pricing: /pricing

---

*Dokumendid kirjutatud: January 2, 2026*
*Integratsioon valmis: EventNexus v1.0*
