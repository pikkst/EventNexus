# 📊 EventNexus Pipeline - Põhjalik Analüüs ja Täiustusplaanid

**Analüüsi Kuupäev:** 10.01.2026  
**Eesmärk:** Tagada, et iga linn saab vähemalt 5 tasuta üritust avalikest allikatest

---

## 📋 Praeguse Pipeline'i Ülevaade

### 🔄 4-sammuline Pipeline

```
1️⃣ FETCH-SOURCES → 2️⃣ PARSE-EVENT-AI → 3️⃣ VALIDATE-EVENT → 4️⃣ PUBLISH-EVENT
     (Deno)              (Gemini AI)          (Rules)           (Geocoding)
```

#### 1. fetch-sources
- **Roll:** Laeb toorsisu allikatest (HTML, RSS, API, iCal)
- **Sisend:** `city_id` (optional)
- **Väljund:** `raw_events` tabelisse
- **Deduplitseerimine:** SHA-256 hash kontrollib, kas sisu muutunud
- **Rate Limit:** User-Agent header Nominatimile

#### 2. parse-event-ai
- **Roll:** Ekstraktib struktureeritud eventide andmeid AI'ga
- **Model:** `gemini-2.0-flash-exp`
- **Sisend:** `city_id` + `raw_events` (pending)
- **Väljund:** `parsed_events` tabelisse
- **✅ Olemas:** Timezone-aware parsing, 30-päeva aken, is_free default=true
- **❌ Puudub:** Tasuta eventide prioritiseerimine

#### 3. validate-event  
- **Roll:** Arvutab confidence score'id (0-100)
- **Komponendid:** 
  - source_score (25%)
  - data_completeness (25%)
  - time_validity (20%) - ✅ city timezone
  - geo_accuracy (15%)
  - semantic_validity (15%)
- **✅ Parandatud:** City_id filtering, city-specific timezone
- **Tegevused:** auto_publish (≥85), review (70-84), reject (<70)

#### 4. publish-event
- **Roll:** Publishib valideeritud eventeid live mapile
- **Geocoding:** Nominatim OSM API (country-specific)
- **✅ Parandatud:** City_id filtering, city-specific country codes
- **Pildid:** Gemini Imagen-3 genereerib ad image'id
- **Fallback:** Geocoding retry ainult venue nimega

---

## 🎯 Eesmärk: 5+ Tasuta Üritust Linna Kohta

### 🔍 Praegused Kitsaskohad

#### 1. **Source Discovery - Puudulik**
- `bootstrap-city` kasutab Gemini AI allikate leidmiseks
- **Probleem:** Üldised allikad (nt turistiinfod) ei pruugi tasuta evente listida
- **Lahendus:** Vaja spetsiifilisemaid allikaid

#### 2. **Free Event Filtering - Nõrk**
```typescript
// parse-event-ai prompts:
"CRITICAL - PAID vs FREE (Default to FREE):"
"Set is_free=true (default) unless you see clear evidence of paid admission"
```
- **Hea:** Default on `is_free=true`
- **Probleem:** Ei prioritiseeri aktiivselt tasuta evente
- **Lahendus:** Vaja targeted free event sources

#### 3. **Event Quantity - Ei Kontrollita**
- Pipeline töötleb, mis leiab, aga ei garanteeri miinimumi
- `bootstrap-city` kontrollib `eventsSeeded >= 5`, aga see on üldine (mitte tasuta)
- **Lahendus:** Vaja free event counter ja retry logic

#### 4. **Cleanup - Olemas, aga Passiivne**
- `archive-expired-events` function eksisteerib
- **Probleem:** Ei ole automaatselt schedulitud (pg_cron commented out)
- **Lahendus:** Aktiveerida cron job

#### 5. **Source Quality - Ei Hinda Tasuta Evente**
- `event_sources.source_score` on üldine
- Ei eralda "tasuta event allikaid" paremate score'idega
- **Lahendus:** Free event source tracking

---

## 🚀 Täiustusplaanid

### 📌 **PRIORITEET 1: Targeted Free Event Sources**

#### A. Laienda Bootstrap Discovery
```typescript
// Uus funktsioon: discoverFreeEventSources()
const FREE_EVENT_KEYWORDS = [
  'free events', 'tasuta üritused', 'kostenlose veranstaltungen',
  'événements gratuits', 'eventos gratuitos', 'eventi gratuiti',
  'public events', 'community events', 'library events',
  'free admission', 'free entry', 'open to public'
];

// Targeted queries:
- "{cityName} free events calendar"
- "{cityName} public library events"  
- "{cityName} community center schedule"
- "{cityName} free concerts parks"
- "{cityName} free museum days"
- "{cityName} city events calendar"
```

#### B. Common Free Event Sources Per City Type
```typescript
const STANDARD_FREE_SOURCES = {
  library: [
    '/library/events',
    '/raamatukogu/uritused',
    '/bibliothek/veranstaltungen'
  ],
  municipality: [
    '/events',
    '/calendar',
    '/whats-on',
    '/kultuurikalender'
  ],
  tourism: [
    '/free-things-to-do',
    '/events-calendar'
  ],
  cultural_centers: [
    '/events',
    '/programme'
  ]
};
```

#### C. Eventbrite/Meetup Public Free Events
- Eventbrite: `?price=free&location={city}`
- Meetup: `/api/events?location={city}&no_fee=true`
- Facebook Events: Graph API (public free events)

---

### 📌 **PRIORITEET 2: Free Event Pipeline Step**

#### Uus Funktsioon: `ensure-free-events`

```typescript
// Run AFTER publish-event in pipeline
interface FreEventEnsurance {
  city_id: string;
  target_free_events: number; // Default: 5
  current_free_count: number;
  actions_taken: string[];
}

async function ensureFreeEvents(cityId: string, target = 5) {
  // 1. Count current free events for city
  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('city_id', cityId)
    .eq('status', 'active')
    .eq('is_free', true);
  
  if (count >= target) {
    return { success: true, message: `${count} free events already active` };
  }
  
  const needed = target - count;
  console.log(`🎯 Need ${needed} more free events for city`);
  
  // 2. Check parsed_events for unpublished free events
  const { data: unpublished } = await supabase
    .from('parsed_events')
    .select('*, raw_events!inner(event_sources!inner(city_id))')
    .eq('raw_events.event_sources.city_id', cityId)
    .eq('validation_status', 'validated')
    .eq('structured_json->is_free', true)
    .is('event_confidence.event_id', null)
    .limit(needed);
  
  if (unpublished.length > 0) {
    // Publish them immediately
    for (const event of unpublished) {
      await invokeEdgeFunction('publish-event', { parsed_event_id: event.id });
    }
    return { success: true, message: `Published ${unpublished.length} free events` };
  }
  
  // 3. If still insufficient, trigger targeted fetch for free sources
  const { data: freeSources } = await supabase
    .from('event_sources')
    .select('*')
    .eq('city_id', cityId)
    .eq('active', true)
    .ilike('url', '%free%'); // Heuristic: URLs containing "free"
  
  if (freeSources.length > 0) {
    // Re-fetch and re-parse free sources
    for (const source of freeSources) {
      await invokeEdgeFunction('fetch-sources', { source_id: source.id });
    }
    await invokeEdgeFunction('parse-event-ai', { city_id: cityId });
    await invokeEdgeFunction('validate-event', { city_id: cityId });
    await invokeEdgeFunction('publish-event', { city_id: cityId });
  }
  
  // 4. Final check
  const { count: finalCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('city_id', cityId)
    .eq('status', 'active')
    .eq('is_free', true);
  
  return {
    success: finalCount >= target,
    free_events: finalCount,
    target: target,
    message: finalCount >= target 
      ? `✅ ${finalCount} free events active` 
      : `⚠️ Only ${finalCount}/${target} free events found`
  };
}
```

---

### 📌 **PRIORITEET 3: Automaatne Cleanup**

#### Aktiveerida Cron Job

```sql
-- supabase/migrations/20260110_enable_archive_cron.sql

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule archive job (daily at 2 AM UTC)
SELECT cron.schedule(
  'archive-expired-events',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
      url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/archive-expired-events',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Automated event archival runs daily at 2 AM UTC';
```

#### Täiustatud Archive Logic

```typescript
// archive-expired-events verbeterd
// Praegu: Archiveerib ainult `date` põhjal
// Uus: Kontrollib `end_time` või arvutab event duration

const shouldArchive = (event) => {
  const endTime = event.end_time 
    ? new Date(`${event.date}T${event.end_time}`)
    : new Date(`${event.date}T23:59:59`);
  
  const now = new Date();
  
  // Add 6-hour grace period after end
  const gracePeriod = 6 * 60 * 60 * 1000;
  return (now.getTime() - endTime.getTime()) > gracePeriod;
};
```

---

### 📌 **PRIORITEET 4: Smart Source Scoring**

#### Eralda "Free Event Allikad"

```sql
-- Add to event_sources table
ALTER TABLE event_sources 
ADD COLUMN free_event_ratio DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN free_event_count INT DEFAULT 0,
ADD COLUMN total_event_count INT DEFAULT 0;

COMMENT ON COLUMN event_sources.free_event_ratio IS 'Percentage of free events from this source (0.00-1.00)';
```

#### Update Source Scores Dynaamically

```typescript
// After publish-event, update source stats
async function updateSourceStats(sourceId: string) {
  // Count events from this source
  const { data: stats } = await supabase.rpc('calculate_source_free_ratio', {
    p_source_id: sourceId
  });
  
  await supabase
    .from('event_sources')
    .update({
      free_event_count: stats.free_count,
      total_event_count: stats.total_count,
      free_event_ratio: stats.free_count / stats.total_count,
      // Boost source_score for high free ratio
      source_score: Math.min(100, 50 + (stats.free_ratio * 50))
    })
    .eq('id', sourceId);
}
```

```sql
-- SQL function
CREATE OR REPLACE FUNCTION calculate_source_free_ratio(p_source_id UUID)
RETURNS TABLE(free_count INT, total_count INT, free_ratio DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE is_free = true)::INT AS free_count,
    COUNT(*)::INT AS total_count,
    (COUNT(*) FILTER (WHERE is_free = true)::DECIMAL / NULLIF(COUNT(*), 0)) AS free_ratio
  FROM events e
  JOIN parsed_events pe ON e.parsed_event_id = pe.id
  JOIN raw_events re ON pe.raw_event_id = re.id
  WHERE re.source_id = p_source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 📌 **PRIORITEET 5: Geocoding Accuracy**

#### Probleemid
```typescript
// publish-event praegu:
const coords = await geocodeAddress(
  eventData.location_address,
  cityConfig.country,
  cityConfig.country_code
);

// Probleem: eventData.location_address võib olla ebatäpne
// Nt: "City Hall" ilma linnanimi või "TBD"
```

#### Täiustused

```typescript
// A. Validate address quality BEFORE geocoding
function isGeocodableAddress(address: string, cityName: string): boolean {
  const invalid = [
    'tbd', 'tba', 'to be announced', 'online', 'virtual', 
    'teatatakse hiljem', 'various locations'
  ];
  
  const lower = address.toLowerCase();
  if (invalid.some(i => lower.includes(i))) return false;
  
  // Must contain city name or be a full address
  return lower.includes(cityName.toLowerCase()) || 
         /\d+.*street|road|avenue|boulevard/.test(lower);
}

// B. Enrich address with city context
function enrichAddress(address: string, city: CityConfig): string {
  // Already has city/country → return as-is
  if (address.includes(city.city_name) || address.includes(city.country)) {
    return address;
  }
  
  // Add city context for better geocoding
  return `${address}, ${city.city_name}, ${city.country}`;
}

// C. Fallback chain
async function geocodeWithFallbacks(event, city) {
  // Try 1: Full address
  let coords = await geocode(enrichAddress(event.location_address, city), city);
  if (coords) return coords;
  
  // Try 2: Venue name only (if different from address)
  if (event.venue_name && event.venue_name !== event.location_address) {
    coords = await geocode(`${event.venue_name}, ${city.city_name}`, city);
    if (coords) return coords;
  }
  
  // Try 3: City center (last resort)
  return { lat: city.latitude, lng: city.longitude };
}
```

---

### 📌 **PRIORITEET 6: Pipeline Orchestration**

#### Laienda triggerAgentPipeline()

```typescript
// AIAgentDashboard.tsx - uus step
async function triggerAgentPipeline() {
  // ... existing 4 steps ...
  
  // Step 5: Ensure minimum free events
  console.log(`  🎯 Step 5/5: Ensuring free events...`);
  const ensureResp = await supabase.functions.invoke('ensure-free-events', {
    body: { 
      city_id: city.city_id,
      target_free_events: 5 
    }
  });
  
  if (ensureResp.error) {
    console.warn(`  ⚠️ Free event check failed: ${ensureResp.error.message}`);
  } else {
    const { free_events, target, success } = ensureResp.data;
    console.log(`  ${success ? '✅' : '⚠️'} Free events: ${free_events}/${target}`);
    setPipelineProgress(prev => ({
      ...prev,
      recentLogs: [
        ...prev.recentLogs.slice(-9), 
        `  ${success ? '✅' : '⚠️'} ${free_events}/${target} free events`
      ]
    }));
  }
}
```

---

### 📌 **PRIORITEET 7: Monitoring & Metrics**

#### Linna Health Metrics

```typescript
interface CityHealthMetrics {
  city_id: string;
  city_name: string;
  
  // Event counts
  total_active_events: number;
  free_events_count: number; // ⭐ NEW
  paid_events_count: number;
  
  // Free event ratio
  free_event_percentage: number; // ⭐ NEW (target: ≥50%)
  
  // Quality
  avg_confidence_score: number;
  events_with_coords: number;
  
  // Freshness
  last_pipeline_run: string;
  hours_since_update: number;
  
  // Status
  health_status: 'healthy' | 'warning' | 'critical';
  warnings: string[];
}

// Calculate health
function calculateCityHealth(metrics: CityHealthMetrics): string {
  const issues = [];
  
  if (metrics.free_events_count < 5) {
    issues.push(`Only ${metrics.free_events_count} free events`);
  }
  
  if (metrics.free_event_percentage < 30) {
    issues.push(`Low free event ratio: ${metrics.free_event_percentage}%`);
  }
  
  if (metrics.hours_since_update > 72) {
    issues.push(`Stale data (${metrics.hours_since_update}h old)`);
  }
  
  if (metrics.events_with_coords < metrics.total_active_events * 0.8) {
    issues.push(`Poor geocoding: ${metrics.events_with_coords}/${metrics.total_active_events}`);
  }
  
  return issues.length === 0 ? 'healthy' 
    : issues.length <= 2 ? 'warning' 
    : 'critical';
}
```

---

## 🎯 Implementatsiooni Järjekord

### 🥇 **PHASE 1: Foundation (Nädal 1)**
1. ✅ Fix city_id filtering (TEHTUD)
2. ✅ Fix city-specific timezone (TEHTUD)
3. ⏳ Create `ensure-free-events` Edge Function
4. ⏳ Add `free_event_ratio` to `event_sources`
5. ⏳ Activate `archive-expired-events` cron

### 🥈 **PHASE 2: Discovery (Nädal 2)**
1. ⏳ Enhance `bootstrap-city` with free event keywords
2. ⏳ Add common free source templates (libraries, municipalities)
3. ⏳ Integrate Eventbrite/Meetup free event APIs
4. ⏳ Test with 5 new cities

### 🥉 **PHASE 3: Quality (Nädal 3)**
1. ⏳ Improve geocoding with address validation
2. ⏳ Implement fallback chain (address → venue → city center)
3. ⏳ Add dynamic source scoring based on free event ratio
4. ⏳ Add free event percentage to city health metrics

### 🏅 **PHASE 4: Orchestration (Nädal 4)**
1. ⏳ Integrate `ensure-free-events` into pipeline (Step 5)
2. ⏳ Add real-time free event counter to UI
3. ⏳ Implement retry logic for cities with <5 free events
4. ⏳ Create admin alert system for failing cities

---

## 📊 Success Metrics

### Linna Taseme KPI-d
- ✅ **Vähemalt 5 tasuta üritust** linna kohta (100% compliance)
- ✅ **Tasuta eventide % ≥ 50%** kõigist aktiivsest eventidest
- ✅ **Geocoding accuracy ≥ 80%** (eventid koordinaatidega)
- ✅ **Pipeline freshness ≤ 24h** (viimane update)

### Platvormi Taseme KPI-d
- ✅ **100+ linnad** aktiivsed (praegu: ~100)
- ✅ **500+ tasuta üritust** aktiivsed globaalselt
- ✅ **Daily cleanup rate ≥ 90%** (expired eventid arhiveeritud)
- ✅ **Average confidence score ≥ 75**

---

## 🔧 Tehnilised Üksikasjad

### Edge Functions to Create
```
supabase/functions/
├── ensure-free-events/       # ⭐ NEW - Guarantees minimum free events
│   └── index.ts
└── archive-expired-events/   # ✅ EXISTS - Needs cron activation
    └── index.ts
```

### SQL Migrations Needed
```sql
-- 1. Add free event tracking to sources
20260110_add_free_event_tracking.sql

-- 2. Enable archive cron job
20260110_enable_archive_cron.sql

-- 3. Create source stats calculation function
20260110_source_stats_function.sql
```

### UI Enhancements
```tsx
// AIAgentDashboard.tsx
- Add "Free Events: X/5" badge per city
- Add free event percentage bar
- Add "Ensure Free Events" button
- Add free event filter in city health table
```

---

## ⚠️ Riskid ja Mitigatsioonid

### Risk 1: Tasuta Eventide Andmed Puuduvad
**Probleem:** Mõned linnad ei publiku tasuta evente struktureeritult  
**Lahendus:**
- Fallback generic events (library hours, park openings)
- Seasonal events (Christmas markets, summer concerts)
- Wikipedia/Wikidata community events

### Risk 2: Geocoding API Rate Limits
**Probleem:** Nominatim: 1 req/sec  
**Lahendus:**
- Add exponential backoff (already in fetch)
- Batch geocoding (queue events, process 1/sec)
- Cache coordinates per venue name

### Risk 3: AI Parsing Errors
**Probleem:** Gemini võib mitte tuvastada is_free=true õigesti  
**Lahendus:**
- Enhance prompt with free event examples
- Add validation rule: if price=0 → force is_free=true
- Human review queue for low confidence

### Risk 4: Archive Timing
**Probleem:** Event võib olla multi-day, archive'itakse liiga vara  
**Lahendus:**
- Use `end_time` instead of `date`
- Add 6h grace period
- Check `recurring_pattern` (weekly events)

---

## 🎓 Järeldused

### ✅ Praegune Seisund
- Pipeline on funktsionaalne ja city-specific
- Timezone ja country-code handling on korrektne
- Real-time progress tracking toimib

### ⚠️ Puudujäägid
- Ei garanteeri 5+ free events per city
- Allikad ei ole optimeeritud tasuta eventidele
- Cleanup ei ole automaatne
- Geocoding accuracy võib olla madal

### 🚀 Järgmised Sammud
1. **Implementeeri `ensure-free-events`** (kõige kriitilisem)
2. **Aktiveeri archive cron** (lihtne, suur impact)
3. **Laienda bootstrap discovery** (tasuta event allikad)
4. **Lisa free event metrics UI'sse** (nähtavus)

### 💡 Pikaajaline Visioon
- **Self-healing pipeline:** automaatselt retry linnade jaoks, kus free events < 5
- **Community contribution:** kasutajad saavad lisada free event allikaid
- **ML model:** AI õpib linna põhjal, millised allikad annavad parimaid free evente
- **Real-time notifications:** admin saab alert, kui linn alla 5 free event langeb

---

**Koostaja:** GitHub Copilot  
**Heakskiidetud:** Pipeline Architecture Team  
**Viimane uuendus:** 10.01.2026  
**Status:** ⏳ Awaiting Implementation

