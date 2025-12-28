# Piletisüsteemi Migratsiooni Juhend (Estonian)

## Ülevaade
See migratsioon lisab EventNexusile täiusliku piletisüsteemi koos:
- Ürituse lõpuajad ja kestvuse jälgimine
- Mitmesugused piletitüübid (VIP, Early Bird, päevapäss, mitmepäevane jne)
- QR-koodipõhine pileti kinnitamine
- Korraldaja statistika ja analüütika
- Avalik vaade külalistele

## Sammud

### 1. Kontrolli olemasolevat struktuuri

**Käivita diagnostika skript:**
```sql
-- Supabase SQL Editoris käivita:
-- supabase/migrations/00_check_existing_schema.sql
```

See skript näitab:
- Milliseid veerge events tabelis juba on
- Kas piletitabelid eksisteerivad
- Olemasolevad RLS reeglid
- Olemasolevad funktsioonid

### 2. Käivita peamine migratsioon

**Käivita migratsioonifail:**
```sql
-- Supabase SQL Editoris käivita:
-- supabase/migrations/20250128_enhanced_ticketing.sql
```

### Mis luuakse?

#### Uued veerud `events` tabelis
- `end_date` - Ürituse lõppkuupäev
- `end_time` - Ürituse lõppaeg
- `duration_hours` - Automaatselt arvutatud kestvus

#### Uued tabelid

1. **ticket_templates** - Piletitüübid
   - Erinevad hinnad ja tüübid
   - Koguse haldamine
   - Müügiperioodid

2. **tickets** - Ostetud piletid
   - Unikaalne QR-kood
   - Olek (valid, used, cancelled jne)
   - Omaniku info

3. **ticket_verifications** - Kontrolli ajalugu
   - Kes kontrollis
   - Millal ja kus

## RLS (Row Level Security) Reeglid

### ✅ Külalised (autentimata kasutajad) SAAVAD:
- Vaadata kõiki avalikke piletitüüpe
- Vaadata piletite saadavust
- Näha ürituse detaile

### ❌ Külalised EI SAA:
- Osta pileteid
- Vaadata teiste pileteid
- Kontrollida pileteid

### ✅ Sisselogitud kasutajad SAAVAD:
- Kõik ülaltoodu PLUSS
- **Osta pileteid**
- Vaadata oma pileteid
- Alla laadida QR-koode

### ✅ Korraldajad SAAVAD:
- Hallata oma ürituste piletitüüpe
- Vaadata kõiki müüdud pileteid
- Kontrollida pileteid (QR skanner)
- Vaadata statistikat

## Testimine

### 1. Kontrolli tabelite loomist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ticket_templates', 'tickets', 'ticket_verifications');
```

### 2. Testi avalikku vaadet (külalisena)
Ava brauser inkognito režiimis ja proovi vaadata pileteid - peaksid nägema saadavust, aga "Buy" nupp peaks paluma sisse logida.

### 3. Testi pileti ostmist
Logi sisse ja proovi pilet osta - peaks töötama.

### 4. Testi korraldaja vaadet
Logi sisse korraldajana ja vaata statistikat.

## Probleemide lahendamine

### Viga: "column does not exist"
See tähendab, et vana tabel eksisteerib. Migratsioon kustutab ja loob uuesti.

### Viga: "organizerId does not exist"
Andmebaas kasutab snake_case (`organizer_id`), mitte camelCase. See on nüüd parandatud.

### RLS blokeerib päringu
Kontrolli:
```sql
-- Vaata aktiivseid reegleid
SELECT * FROM pg_policies 
WHERE tablename = 'tickets';
```

## Edge Functionid

Juba deployitud Supabase'i:
1. `verify-ticket` - QR-koodi kontroll
2. `purchase-ticket` - Pileti ostmine
3. `get-user-tickets` - Kasutaja piletid
4. `organizer-stats` - Statistika

## Kokkuvõte

✅ **Avalik ligipääs** - Külalised näevad pileteid  
✅ **Autentimine ostuks** - Osta saab ainult sisseloginult  
✅ **Turvaline** - RLS kaitseb kasutajate andmeid  
✅ **Täielik süsteem** - Ostust kuni kontrollini  

## Abi

Probleemide korral:
- Email: huntersest@gmail.com
- Kontrolli Edge Function loge Supabase Dashboardis
- Vaata SQL loge

## Versioon
Loodud: 28. detsember 2025
Migratsioon: 20250128
