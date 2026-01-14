# Linnade Masslisamine Riigi Kaupa - Kiirjuhend

## Ülevaade
Masslisamine võimaldab administraatoril lisada korraga 15-20 suuremat linna riigist, selle asemel et lisada neid ükshaaval. See kiirendab platvormi laiendamist oluliselt.

## Kuidas Kasutada

### 1. Ava Funktsioon
```
1. Mine lehele: /admin/ai-agents
2. Vali tab: "Manage Cities"
3. Kliki nuppu: "Add Country" (roheline nupp globuuse ikooniga)
```

### 2. Vali Riik
```
1. Sisesta riigi nimi (nt "Germany", "France", "United States")
2. Kliki "Find Cities" või vajuta Enter
3. Oota 5-10 sekundit, kuni AI leiab linnad
```

### 3. Vali Linnad
```
✅ AI näitab ~20 suuremat linna koos:
   - Linna nimi (inglise keeles)
   - Koordinaadid (latitude, longitude)
   - Ajavöönd (IANA formaat)
   - Staatus (Kas juba olemas või uus)

✅ Nupud:
   - "Select All New" - Vali kõik uued linnad
   - "Deselect All" - Tühista valik
   - Või märgi linnad käsitsi
```

### 4. Importi
```
1. Kliki "Import X Cities"
2. Kinnita dialoogis
3. Oota, kuni import lõpeb (progress bar näitab edenemist)
4. Vaata tulemuste kokkuvõtet
```

## Näited

### Saksamaa Linnad
```
Riik: Germany
→ Leiab: Berlin, Munich, Hamburg, Frankfurt, Cologne, jne
→ Tulemus: ~15-20 Saksamaa linna lisatud
→ Aeg: 2-3 minutit (vs 30-40 min käsitsi)
```

### USA Linnad
```
Riik: United States
→ Leiab: New York, Los Angeles, Chicago, Houston, jne
→ Tulemus: ~20 USA linna lisatud
```

### Jaapani Linnad
```
Riik: Japan
→ Leiab: Tokyo, Osaka, Kyoto, Yokohama, jne
→ Tulemus: ~15-20 Jaapani linna lisatud
```

## Importimise Käik

### Käigus
```
Importing Cities... 5/15
Current: Munich, Germany
[████████░░░░░░░] 33%
```

### Pärast Lõppu
```
🌍 Bulk Import Complete!

✅ Successfully imported: 14
❌ Failed: 1

Successful cities:
✓ Berlin, Germany
✓ Munich, Germany
...

Failed cities:
✗ Stuttgart, Germany: Duplicate entry

🤖 Auto-bootstrap starts in 5 minutes
Check Agent Logs for progress
```

## Mis Juhtub Pärast Importi?

### Automaatne Bootstrap (5 min jooksul)
```
1. Linn lisatakse andmebaasi ✓
2. Süsteem leiab sündmusallikaid (event sources) ✓
3. AI agendid hakkavad sündmuseid koguma ✓
4. Linn ilmub "Cities" tab'is ✓
```

### Jälgimine
```
1. Mine "Cities" tab'i → Kontrolli linnade staatust
2. Mine "Agent Logs" → Vaata bootstrap progressi
3. Oota 30-60 min → Kontrolli event sources ja events
```

## Eelised

### Kiirus
- **Enne**: 20 linna lisamine = 30-40 minutit (käsitsi)
- **Pärast**: 20 linna lisamine = 2-3 minutit (mass)
- **Võit**: ~90% aja kokkuhoid

### Täpsus
- AI annab täpsed koordinaadid ja ajavööndid
- Vähem manuaalseid vigu
- Ühtlased ingliskeelsed linnanimed

## Parimad Praktikad

### 1. Alusta Suurtest Turgudest
```
Prioriteet 1: Euroopa pealinnad
Prioriteet 2: Suured USA linnad
Prioriteet 3: Aasia suurlinnad
Prioriteet 4: Muud piirkonnad
```

### 2. Kontrolli Enne Importi
```
✅ Vaata AI soovitused üle
✅ Tühista linnale, mida ei taha
✅ Kontrolli, et koordinaadid on mõistlikud
```

### 3. Importi Targalt
```
✅ 1-2 riiki korraga
✅ Oota bootstrap lõpeb (30 min)
✅ Jälgi Agent Logs'i vigade jaoks
```

## Tõrkeotsing

### "No cities found"
- **Põhjus**: Vale riigi nimi või AI viga
- **Lahendus**: Proovi teist nime varianti (nt "USA" → "United States")

### "City already exists"
- **Põhjus**: Linn on juba andmebaasis
- **Lahendus**: See on normaalne, jäta linn vahele

### Import ebaõnnestus osaliselt
- **Põhjus**: Andmebaasi piirangud või võrgu vead
- **Lahendus**: Kontrolli failure summary, proovi ebaõnnestunud linnu käsitsi

## Tehnilised Detailid

### AI Mudel
- **Mudel**: Gemini 2.0 Flash Exp
- **Temperature**: 0.3 (consistency jaoks)
- **Maksimaalselt linnu**: ~20 (token limiidi tõttu)

### Andmestruktuur
```json
{
  "city_name": "Berlin",
  "country": "Germany",
  "latitude": 52.52,
  "longitude": 13.405,
  "timezone": "Europe/Berlin"
}
```

## Seotud Dokumentatsioon
- [Täielik Juhend (EN)](./BULK_CITY_IMPORT.md)
- [City Management](./ADMIN_IMPLEMENTATION.md)
- [AI Agent System](./AI_AGENT_IMPROVEMENTS_DEPLOYMENT.md)

## Tugi
Probleemide korral:
- Kontrolli Agent Logs'i detailsete vigade jaoks
- Vaata city health metrics'it
- Kontakt: huntersest@gmail.com
