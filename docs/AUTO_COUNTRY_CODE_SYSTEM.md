# Auto Country Code Mapping System

## Overview
Automaatne süsteem, mis leiab ja lisab ISO 3166-1 alpha-2 riigi koodid (`country_code`) iga uue linna jaoks `city_configs` tabelis.

## Kuidas See Töötab

### 1. **Country Codes Mapping Tabel**
- Sisaldab ~70 riigi mappinguid (nimi → kood)
- Toetab alternatiivseid nimesid (nt "Deutschland" → "de", "Eesti" → "ee")
- Kerge lisada uusi riike

### 2. **Automaatne Trigger**
Iga kord kui lisatakse uus linn `city_configs` tabelisse:
```sql
INSERT INTO city_configs (city_name, country, ...) 
VALUES ('Paris', 'France', ...);
-- ✅ Automaatselt lisab: country_code = 'fr'
```

**Trigger loogika:**
1. Kontrollib, kas `country_code` on juba seatud → jätab muutmata
2. Otsib täpset vastet riigi nimele
3. Kui ei leia, otsib alternatiivsete nimede seast
4. Kui ikka ei leia, proovib partial match
5. Logib hoiatuse, kui ei leia vastet

### 3. **Kasutusjuhud**

#### ✅ Uue Linna Lisamine UI-s
```typescript
// AIAgentDashboard.tsx - handleSaveCity()
const newCity = {
  city_name: 'Tokyo',
  country: 'Japan',  // ✅ Trigger leiab automaatselt 'jp'
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: 'Asia/Tokyo'
}

await supabase.from('city_configs').insert(newCity)
// Result: country_code = 'jp' automaatselt seatud!
```

#### ✅ Bulk Import
```sql
-- Massiline linnade lisamine
INSERT INTO city_configs (city_name, country, latitude, longitude, timezone)
VALUES 
  ('Sydney', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'),
  ('Toronto', 'Canada', 43.6532, -79.3832, 'America/Toronto'),
  ('Mumbai', 'India', 19.0760, 72.8777, 'Asia/Kolkata');
-- ✅ Kõikidele automaatselt lisatakse country_code
```

#### ✅ Backfill Existing Data
```sql
-- Täida puuduvad country_code'd olemasolevatele linnadele
UPDATE city_configs SET country = country; -- Trigger käivitub
```

## Uue Riigi Lisamine

### Variant 1: SQL Editor (Admin)
```sql
-- Kasuta helper funktsiooni
SELECT add_country_code_mapping(
  'Georgia',  -- Country name
  'ge',       -- ISO 3166-1 alpha-2 code (lowercase)
  ARRAY['საქართველო', 'Sakartvelo']  -- Alternative names (optional)
);
```

### Variant 2: Otse Tabelisse
```sql
INSERT INTO country_codes (country_name, country_code, alternative_names)
VALUES ('Costa Rica', 'cr', ARRAY['República de Costa Rica']);
```

### Variant 3: UI Lahendus (Future Enhancement)
Võiks lisada `/admin/ai-agents` lehele "Manage Countries" tab:
- Näita kõiki country_codes mappinguid
- Luba lisada uusi riike
- Hoiatus, kui mõni linn ei ole country_code'd saanud

## Testimine

### 1. Kontrolli Existing Cities
```sql
-- Vaata, kas kõik linnad said country_code
SELECT city_name, country, country_code
FROM city_configs
WHERE country_code IS NULL;
-- Peaks olema tühi!
```

### 2. Testi Uue Linna Lisamist
```sql
-- Test 1: Standardne riik
INSERT INTO city_configs (city_name, country, latitude, longitude, timezone)
VALUES ('Rome', 'Italy', 41.9028, 12.4964, 'Europe/Rome')
RETURNING *;
-- Expected: country_code = 'it'

-- Test 2: Alternatiivne nimi
INSERT INTO city_configs (city_name, country, latitude, longitude, timezone)
VALUES ('Munich', 'Deutschland', 48.1351, 11.5820, 'Europe/Berlin')
RETURNING *;
-- Expected: country_code = 'de' (sest "Deutschland" on alternative name)

-- Test 3: Tundmatu riik
INSERT INTO city_configs (city_name, country, latitude, longitude, timezone)
VALUES ('TestCity', 'Atlantis', 0, 0, 'UTC')
RETURNING *;
-- Expected: country_code = NULL + warning log
-- ⚠️ WARNING: Could not auto-detect country_code for country: Atlantis
```

### 3. Veendu, et Pipeline Töötab
```sql
-- Vaata, kas parse-event-ai saab õige country_code
SELECT 
  cc.city_name,
  cc.country,
  cc.country_code,
  es.name as source_name
FROM city_configs cc
JOIN event_sources es ON es.city_id = cc.city_id
LIMIT 5;
```

## Pipeline Integration

### Before (Hardcoded Estonia)
```typescript
// ❌ VANA: Kõik aadressid → Estonia
const searchAddress = `${address}, Estonia`;
const response = await fetch(
  `...&countrycodes=ee`
);
```

### After (Dynamic Country Code)
```typescript
// ✅ UUS: Kasutab linna päris riiki
const { data: cityConfig } = await supabase
  .from('city_configs')
  .select('city_name, country, timezone, country_code')
  .eq('city_id', city_id)
  .single();

const searchAddress = `${address}, ${cityConfig.country}`;
const response = await fetch(
  `...&countrycodes=${cityConfig.country_code}`
);
```

## Maintenance

### Lisada Puuduvaid Riike
Kui näed warning log'i:
```
⚠️ WARNING: Could not auto-detect country_code for country: XYZ
```

1. Otsi ISO 3166-1 alpha-2 kood: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
2. Lisa mapping:
```sql
SELECT add_country_code_mapping('XYZ Country', 'xy', ARRAY['Local Name']);
```

### Update Trigger (Future)
Kui vaja muuta trigger loogika:
```sql
-- Edit supabase/migrations/20260110000002_auto_country_code_mapping.sql
-- Then redeploy migration
```

## Benefits

✅ **Automaatne**: Ei pea käsitsi seadistama iga linna jaoks  
✅ **Scalable**: Töötab 100+ linnaga üle maailma  
✅ **Flexible**: Toetab alternatiivseid nimesid  
✅ **Maintainable**: Kerge lisada uusi riike  
✅ **Safe**: Ei kirjuta üle olemasolevaid väärtusi  
✅ **Logged**: Hoiab admini kursis puuduvate mappingutega

## Files
- Migration: `/supabase/migrations/20260110000002_auto_country_code_mapping.sql`
- Helper: `/supabase/migrations/20260110000003_helper_add_country_code.sql`
- Docs: `/docs/AUTO_COUNTRY_CODE_SYSTEM.md` (see fail)

## Next Steps
1. ✅ Deploy migratsioonid Supabase'i
2. ✅ Testi uue linna lisamist
3. 🔄 Jälgi warning log'e uute riikide jaoks
4. 📈 Tulevikus: UI lahendus admini paneelile
