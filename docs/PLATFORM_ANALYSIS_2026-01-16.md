# EventNexus Platform - Põhjalik Analüüs ja Parandusettepanekud
**Kuupäev:** 16. jaanuar 2026  
**Autor:** AI Assistant  
**Versioon:** 1.0

## Sisukord
1. [Ülevaade](#ülevaade)
2. [Kasutaja Teed (User Journeys)](#kasutaja-teed)
3. [Funktsioonide Analüüs](#funktsioonide-analüüs)
4. [Pudelikaelad ja Probleemid](#pudelikaelad-ja-probleemid)
5. [Parandusettepanekud](#parandusettepanekud)
6. [Prioriteetsus ja Rakendusplaan](#prioriteetsus)

---

## 1. Ülevaade

### Praegune Seisukord
EventNexus on funktsionaalne event management platvorm järgmiste põhikomponentidega:
- **Frontend:** React 19 + TypeScript + Vite 6
- **Backend:** Supabase (PostgreSQL + Edge Functions + Realtime)
- **AI:** Google Gemini (Flash + Pro)
- **Map:** Leaflet + PostGIS
- **Makse:** Stripe Connect
- **Deployment:** GitHub Pages + Supabase Cloud

### Põhifunktsioonid
✅ Event discovery (map + browse)  
✅ Event creation (AI-powered)  
✅ Ticketing system  
✅ Admin dashboard  
✅ AI event discovery pipeline  
✅ Quality prediction (pgvector + SQL)  
✅ Real-time updates  
✅ Multi-language support  

---

## 2. Kasutaja Teed (User Journeys)

### 2.1 **Külastaja Teekond** (Guest User)

#### ✅ Praegune Voog
1. **Landing page** → selge CTA, ilusad animatsioonid
2. **Browse events** → map või list view
3. **Event detail** → info + buy tickets
4. **Auth required** → signup/login modal
5. **Checkout** → Stripe payment
6. **Ticket** → PDF + QR code

#### ⚠️ Probleemid
- **Probleemkohad:**
  - Landing page loading 2-3s (lazy loading komponentide pärast)
  - Map laeb kõik 700+ eventid korraga (batch loading aitab, kuid endiselt aeglane)
  - Auth modal avaneb alles checkout'is - kasutaja võib juba olla eelarvamusega
  - Tagasi nupud puuduvad paljudel lehekülgedel

#### 🎯 Soovitused
1. **Landing page:**
   - Eelaada kriitilised komponendid (Hero, CTA)
   - Lazy load ainult footer, testimonials
   - Add skeleton screens
2. **Map:**
   - Cluster markers zoomi tasemel < 12 (vältida pinnide merd)
   - Load events progressively (visible bounds ainult)
   - Cache eventi andmed localStorage'is (5 min TTL)
3. **Auth:**
   - Paku signup'i juba browse faasis ("Save favorites" CTA)
   - Social login (Google, Facebook) kõrval email/password
4. **Navigation:**
   - Lisa breadcrumbs
   - Back button kõigil sub-lehekülgedel

---

### 2.2 **Korraldaja Teekond** (Organizer)

#### ✅ Praegune Voog
1. **Signup** → role selection (auto-assign `organizer`)
2. **Dashboard** → overview stats
3. **Create event** → multi-step form (4 steps)
   - Step 1: Basic info
   - Step 2: Details + AI tagline generation
   - Step 3: Location (geocoding)
   - Step 4: Tickets + publish
4. **Manage events** → edit, archive, delete
5. **Scanner codes** → generate QR for verification
6. **Payouts** → Stripe Connect setup

#### ⚠️ Probleemid
- **Free tier lock-in:** 15 krediiti per event unlock - kasutaja ei tea kuidas krediite saada
- **AI feature confusion:** Tagline, Image gen, Translation - kõik nõuavad unlock'i, kuid pole selge
- **Geocoding aeglane:** Nominatim API aeglane (3-5s), vahel fail
- **Map picker puudu:** Kasutaja ei saa drag & drop pinni
- **Ticketing complexity:** Template system liiga keeruline (7 ticket type)
- **No preview:** Kasutaja ei näe kuidas event välja näeb enne publish'i
- **Scanner setup:** Pole selge kuidas scanneri setup käib (QR gen on eraldi tab'is)

#### 🎯 Soovitused
1. **Credits system:**
   - Show clear pricing modal at event creation start
   - "Watch ad to earn 5 credits" alternative (like mobile games)
   - Free events = free creation (no credit cost)
   - Referral program: 50 credits per signup via link
2. **Event creation:**
   - **Step 1:** Add live preview sidebar (like Canva)
   - **Step 2:** Pre-fill AI tagline automatically (no button click needed)
   - **Step 3:** Add interactive map with drag-drop pin
   - **Step 4:** Simplify tickets - default to "General Admission" only, advanced in settings
3. **Geocoding:**
   - Add fallback: Gemini → Nominatim → City center
   - Cache common locations
   - Show map immediately with city center, refine async
4. **Scanner integration:**
   - Auto-generate scanner code on event publish
   - Show QR in success modal
   - "Download Scanner App" CTA right after creation

---

### 2.3 **Admin Teekond** (Platform Admin)

#### ✅ Praegune Voog
1. **Admin Command Center** → master hub
2. **AI Agents** → discover-events-ai, publish-event status
3. **City management** → bulk import Estonian cities
4. **Brand monitoring** → SEO tracker
5. **Content management** → moderate events
6. **Credit manager** → gift credits, generate codes

#### ⚠️ Probleemid
- **Session timeout:** Long-running pipeline batch jobs (15+ cities) cause auth timeout
- **No rollback:** Pipeline batch fails at city #8, no way to retry from there
- **Logs overwhelming:** Console spammed with 1000+ lines, hard to debug
- **Master auth security:** Passkey hardcoded in env (VITE_MASTER_PASSKEY)
- **No bulk actions:** Can't bulk approve/reject events
- **UI freezes:** Running pipeline freezes UI (no loading states)

#### 🎯 Soovitused
1. **Session management:**
   - Extend session TTL to 2 hours for admin
   - Add "Keep Alive" ping every 30s during batch ops
   - Save progress checkpoint every 5 cities
2. **Pipeline improvements:**
   - Add "Resume from checkpoint" button
   - Show progress bar per city (not just global)
   - Separate logs to dedicated viewer (not console)
3. **Batch actions:**
   - Select multiple events → bulk approve/reject/delete
   - Keyboard shortcuts (Ctrl+A select all, Del = delete)
4. **Security:**
   - Move master passkey to Supabase Vault (not env)
   - Add 2FA requirement for admin operations
   - Log all admin actions to audit table

---

## 3. Funktsioonide Analüüs

### 3.1 Autentimine (Authentication)

#### ✅ Mis Töötab
- Supabase Auth integration
- Email + password login
- OAuth (Google, GitHub, Facebook) - configured but not tested / google töötab  ja läbi meili registeerimine töötab. / hetkel muud  -  ei           lisa
- Session persistence
- Automatic token refresh

#### ⚠️ Probleemid Leitud
1. **Multiple auth modals:** `AuthModal.tsx` + `MasterAuthModal.tsx` - confusing
2. **No password reset flow:** Forgot password link puudu
3. **Email confirmation:** Users must confirm email, kuid pole selge kus confirmation link on
4. **Session race condition:** `App.tsx` line 333-337 - double getSession call
5. **No rate limiting:** Unlimited login attempts

#### 📊 Kood Audit
```typescript
// App.tsx line 333 - ISSUE: Double session fetch
const { data: { session } } = await supabase.auth.getSession();
// ...
await supabase.auth.refreshSession(); // Why refresh immediately?
```

#### 🎯 Parandused
1. **Consolidate auth:**
   - Keep only `MasterAuthModal` for admin ops
   - Use Supabase UI components for regular auth (less code)
2. **Password reset:**
   - Add "Forgot password?" link in AuthModal
   - Use `supabase.auth.resetPasswordForEmail()`
3. **Email confirmation:**
   - Add resend confirmation button
   - Show clear message "Check your email for confirmation link"
4. **Fix race condition:**
   - Remove redundant refreshSession call
   - Only refresh if session expires < 5min
5. **Rate limiting:**
   - Add Supabase Edge Function middleware
   - Block IP after 5 failed attempts for 15min

---

### 3.2 Event Discovery (Map + Browse)

#### ✅ Mis Töötab
- Real-time event updates (Supabase realtime)
- Interactive Leaflet map
- Category filtering
- Search by name/location
- Proximity notifications (1km radius)
- Dynamic marker scaling (just added! 🎉)

#### ⚠️ Probleemid Leitud
1. **Performance bottleneck:** Loading 700+ events on map at once
2. **No clustering:** Zoomed out (< 10) näitab kõik markerid - confusing
3. **Search inefficient:** Linear search through all events (no index)
4. **No saved searches:** User can't save favorite locations/categories
5. **Mobile UX:** Map controls too small on phone

#### 📊 Kood Audit
```typescript
// HomeMap.tsx line 220-260 - ISSUE: Load all events at once
const loadEvents = async () => {
  const eventsData = await getEvents(); // Fetches ALL events!
  setEvents(eventsData); // Re-renders entire map
};
```

#### 🎯 Parandused
1. **Lazy loading:**
   ```typescript
   // Load only events in visible map bounds
   const loadVisibleEvents = async (bounds) => {
     const { data } = await supabase
       .from('events')
       .select('*')
       .filter('location_point', 'geobox', bounds)
       .limit(100);
   };
   ```
2. **Clustering:**
   - Use `react-leaflet-cluster` plugin
   - Show event count badge on cluster marker
3. **Search optimization:**
   - Add PostgreSQL full-text search (GIN index)
   - Use `ts_vector` for event name/description
4. **Saved searches:**
   - Add "Save this search" button
   - Store in `user_preferences` table
5. **Mobile improvements:**
   - Larger tap targets (44x44px minimum)
   - Bottom sheet for event details
   - Swipe gestures for filter panel

---

### 3.3 Event Creation Flow

#### ✅ Mis Töötab
- Multi-step wizard (good UX)
- AI tagline generation (Gemini)
- AI image generation (Imagen 3)
- Geocoding (Nominatim + Gemini fallback)
- Ticket templates
- Real-time preview

#### ⚠️ Probleemid Leitud
1. **No draft saving:** User loses progress if tab closes
2. **Image upload slow:** 10MB limit + compression takes 5-10s
3. **Geocoding unreliable:** Nominatim fails 20% of time
4. **No validation:** Can create event with past date
5. **AI costs hidden:** User doesn't know credits deducted per AI call
6. **No duplicate detection:** Can create duplicate events

#### 📊 Kood Audit
```typescript
// EventCreationFlow.tsx line 280-320 - ISSUE: No draft save
const handleSubmit = async () => {
  // If this fails, user loses ALL data
  await createEvent(formData);
};
```

#### 🎯 Parandused
1. **Auto-save drafts:**
   ```typescript
   // Save to localStorage every 30s
   useEffect(() => {
     const timer = setInterval(() => {
       localStorage.setItem('event_draft', JSON.stringify(formData));
     }, 30000);
     return () => clearInterval(timer);
   }, [formData]);
   ```
2. **Image optimization:**
   - Compress on upload (already done, but can optimize further)
   - Use WebP format instead of JPEG (50% smaller)
   - Show progress bar
3. **Geocoding improvements:**
   - Try Gemini first (more reliable with AI)
   - Cache common locations (e.g., "Tallinn Town Hall")
   - Allow manual lat/lng entry
4. **Validation:**
   - Disable past dates in date picker
   - Show error: "Event date must be in future"
5. **Credit transparency:**
   - Show: "AI Tagline: 2 credits" before generation
   - Add confirmation modal
6. **Duplicate detection:**
   - Check pgvector embeddings before publish
   - Show: "Similar event exists: [name]"

---

### 3.4 AI Pipeline (Event Discovery)

#### ✅ Mis Töötab
- Google Search integration
- Gemini Flash structuring
- Quality prediction (pgvector + SQL)
- Geocoding fallback chain
- Duplicate detection
- Auto-publishing

#### ⚠️ Probleemid Leitud
1. **No error recovery:** Pipeline fails on one bad event, stops entire batch
2. **Rate limit handling:** Gemini 429 errors cause crash
3. **No human review:** Events auto-publish without moderation
4. **Country validation weak:** Still finds USA events sometimes
5. **No scheduling:** Runs manually via Admin panel
6. **Logs not persistent:** Console logs lost after browser refresh

#### 📊 Kood Audit
```typescript
// discover-events-ai/index.ts line 1050-1080 - ISSUE: No error recovery
for (const event of events) {
  try {
    await insertEvent(event);
  } catch (error) {
    console.error('Failed:', error);
    // PROBLEM: Continues loop, but no retry mechanism
  }
}
```

#### 🎯 Parandused
1. **Error recovery:**
   ```typescript
   // Add retry with exponential backoff
   const insertWithRetry = async (event, retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         return await insertEvent(event);
       } catch (error) {
         if (i === retries - 1) throw error;
         await sleep(1000 * Math.pow(2, i));
       }
     }
   };
   ```
2. **Rate limiting:**
   - Add queue system (BullMQ or pg_cron)
   - Respect Gemini rate limits (1000 RPM)
   - Add jitter to requests
3. **Human review:**
   - Add `pending_review` status
   - Admin approves before publish
   - Show confidence score in review UI
4. **Country validation:**
   - Add stricter regex for USA states
   - Check coordinates against country borders (PostGIS)
5. **Scheduling:**
   - Use Supabase cron jobs (pg_cron)
   - Run every 6 hours: `0 */6 * * *`
6. **Persistent logs:**
   - Save to `ai_pipeline_logs` table
   - Include: city, status, errors, duration
   - Show in Admin dashboard

---

### 3.5 Dashboard & Analytics

#### ✅ Mis Töötab
- Revenue summary (Stripe integration)
- Attendance stats
- Event list with filters
- Scanner code generation
- Branding customization

#### ⚠️ Probleemid Leitud
1. **Slow loading:** Dashboard takes 5-8s to load (multiple DB queries)
2. **No caching:** Same data fetched on every tab switch
3. **Charts heavy:** Recharts bundle 80KB
4. **Mobile broken:** Tables don't fit on phone
5. **No exports:** Can't download revenue report CSV
6. **Scanner integration unclear:** Users don't know how to use scanner codes

#### 📊 Kood Audit
```typescript
// Dashboard.tsx line 480-550 - ISSUE: Sequential queries
const loadDashboard = async () => {
  const events = await getOrganizerEvents(user.id); // 2s
  const revenue = await getOrganizerRevenue(user.id); // 3s
  const attendance = await getOrganizerAttendance(user.id); // 2s
  // Total: 7s loading time!
};
```

#### 🎯 Parandused
1. **Parallel queries:**
   ```typescript
   const [events, revenue, attendance] = await Promise.all([
     getOrganizerEvents(user.id),
     getOrganizerRevenue(user.id),
     getOrganizerAttendance(user.id)
   ]);
   // Total: 3s (fastest query wins)
   ```
2. **Caching:**
   - Cache dashboard data in React Query (5min TTL)
   - Invalidate on event create/update
3. **Code splitting:**
   - Lazy load Recharts only when Analytics tab opened
   - Use lightweight chart lib (Chart.js or visx)
4. **Responsive tables:**
   - Use card view on mobile
   - Horizontal scroll with sticky columns
5. **Exports:**
   - Add "Download CSV" button
   - Generate server-side to avoid browser memory issues
6. **Scanner onboarding:**
   - Add "How to use Scanner" tutorial video
   - Show QR code immediately after event creation
   - Link to mobile app download

---

## 4. Pudelikaelad ja Probleemid

### 4.1 Performance Bottlenecks

#### 🔴 **CRITICAL**
1. **Map loads 700+ events at once** → 5-8s load time
   - **Impact:** High bounce rate on map page
   - **Solution:** Lazy load within bounds + clustering
2. **Dashboard sequential queries** → 7s load time
   - **Impact:** Poor organizer experience
   - **Solution:** Parallel queries + caching
3. **Event creation no draft save** → Data loss on crash
   - **Impact:** User frustration, abandoned events
   - **Solution:** Auto-save to localStorage

#### 🟡 **MEDIUM**
4. **Image upload slow** → 5-10s compression
   - **Solution:** Web Workers for compression
5. **Geocoding slow** → 3-5s Nominatim API
   - **Solution:** Gemini first, cache common locations
6. **No search index** → Linear O(n) search
   - **Solution:** PostgreSQL full-text search

#### 🟢 **LOW**
7. **Recharts bundle size** → 80KB
   - **Solution:** Lazy load or switch to visx
8. **Landing page load** → 2-3s
   - **Solution:** Preload critical components

---

### 4.2 UX Problems

#### 🔴 **CRITICAL**
1. **Credits system confusing** → Users don't know how to get credits
   - **Solution:** Clear pricing modal + referral program
2. **Auth required late** → User invests time, then blocked at checkout
   - **Solution:** Prompt signup earlier ("Save favorites")
3. **No mobile map controls** → Can't pan/zoom easily
   - **Solution:** Larger buttons, bottom sheet

#### 🟡 **MEDIUM**
4. **No back buttons** → User stuck on sub-pages
   - **Solution:** Breadcrumbs + back arrow
5. **AI features hidden** → Users don't discover AI capabilities
   - **Solution:** Highlight AI features with badges
6. **Scanner setup unclear** → Organizers confused
   - **Solution:** Onboarding wizard

#### 🟢 **LOW**
7. **No saved searches** → User re-enters filters every time
   - **Solution:** Save to user_preferences
8. **No event preview** → Can't see before publish
   - **Solution:** Live preview sidebar

---

### 4.3 Security Issues

#### 🔴 **CRITICAL**
1. **Master passkey in env** → Leaked if .env committed
   - **Solution:** Supabase Vault + 2FA
2. **No rate limiting** → Brute force attacks possible
   - **Solution:** Edge Function middleware

#### 🟡 **MEDIUM**
3. **No audit logs** → Can't trace admin actions
   - **Solution:** admin_actions table
4. **Session timeout on long ops** → Admin locked out
   - **Solution:** Keep-alive pings

---

### 4.4 Error Handling

#### 🔴 **CRITICAL**
1. **Pipeline no retry** → Fails on first error
   - **Solution:** Exponential backoff retry
2. **No error boundaries** → White screen on crash
   - **Solution:** React Error Boundaries

#### 🟡 **MEDIUM**
3. **Geocoding silent fail** → Event created with wrong coords
   - **Solution:** Show error, allow manual entry
4. **Image gen fails silently** → No feedback
   - **Solution:** Show error message, retry button

---

## 5. Parandusettepanekud

### 5.1 Kiired Võidud (Quick Wins) - 1-2 päeva

#### 1. **Parallel Dashboard Queries** (2h)
- Muuda järjestikused query'd paralleelseteks
- Vähenda load time 7s → 3s
- Impact: 🔥🔥🔥 High

#### 2. **Auto-Save Event Drafts** (3h)
- Lisa localStorage auto-save
- Vältida data loss
- Impact: 🔥🔥🔥 High

#### 3. **Add Back Buttons** (2h)
- Lisa breadcrumbs kõigile sub-lehekülgedele
- Paranda navigatsiooni
- Impact: 🔥🔥 Medium

#### 4. **Credits Transparency** (4h)
- Lisa pricing modal event creation alguses
- Näita credit cost iga AI feature kõrval
- Impact: 🔥🔥🔥 High

#### 5. **Search Index** (4h)
- Lisa PostgreSQL full-text search
- Kiirem event search
- Impact: 🔥🔥 Medium

#### 6. **Error Boundaries** (3h)
- Lisa React Error Boundaries
- Vältida white screen crashes
- Impact: 🔥🔥🔥 High

**Total: 18h = 2-3 päeva**

---

### 5.2 Keskmine Prioriteet - 1 nädal

#### 7. **Map Bounds Loading** (8h)
- Load only visible events
- Add clustering for zoomed out view
- Impact: 🔥🔥🔥 High

#### 8. **Geocoding Improvements** (6h)
- Try Gemini first
- Cache common locations
- Allow manual entry
- Impact: 🔥🔥 Medium

#### 9. **Pipeline Retry Logic** (8h)
- Add exponential backoff
- Save checkpoint progress
- Impact: 🔥🔥🔥 High

#### 10. **Mobile UX Fixes** (12h)
- Responsive tables → card view
- Larger tap targets
- Bottom sheet for event details
- Impact: 🔥🔥 Medium

#### 11. **Rate Limiting** (6h)
- Add Edge Function middleware
- Block after 5 failed attempts
- Impact: 🔥🔥 Medium (security)

#### 12. **Audit Logs** (6h)
- Create admin_actions table
- Log all critical operations
- Impact: 🔥 Low (compliance)

**Total: 46h = 5-6 päeva**

---

### 5.3 Suur Refaktoreerimine - 2-3 nädalat

#### 13. **React Query Integration** (16h)
- Replace manual caching with React Query
- Auto-invalidation
- Optimistic updates
- Impact: 🔥🔥🔥 High

#### 14. **Web Workers for Image Compression** (8h)
- Move compression off main thread
- Vältida UI freeze
- Impact: 🔥 Low (nice-to-have)

#### 15. **Supabase Vault Migration** (8h)
- Move secrets to Vault
- Add 2FA for admin
- Impact: 🔥🔉 Medium (security)

#### 16. **Pipeline Scheduling (pg_cron)** (12h)
- Automatic runs every 6h
- No manual trigger needed
- Impact: 🔥🔥 Medium

#### 17. **CSV Export Feature** (8h)
- Download revenue reports
- Event attendance lists
- Impact: 🔥 Low (organizers want this)

#### 18. **Live Preview Sidebar** (20h)
- Show event as user edits
- Like Canva/Figma
- Impact: 🔥🔥 Medium (UX)

#### 19. **Saved Searches** (8h)
- User can save favorite filters
- Quick access
- Impact: 🔥 Low (power users)

#### 20. **Scanner Onboarding Wizard** (12h)
- Step-by-step setup
- Video tutorial
- Impact: 🔥🔥 Medium (reduce support)

**Total: 92h = 11-12 päeva**

---

## 6. Prioriteetsus ja Rakendusplaan

### 📅 **Faas 1: Kiired Võidud** (Week 1)
**Fookus:** Kõige suurema impact'iga lihtsad muudatused

| # | Ülesanne | Aeg | Impact | Blocker? |
|---|----------|-----|--------|----------|
| 1 | Parallel Dashboard Queries | 2h | 🔥🔥🔥 | ❌ |
| 2 | Auto-Save Event Drafts | 3h | 🔥🔥🔥 | ❌ |
| 3 | Add Back Buttons | 2h | 🔥🔥 | ❌ |
| 4 | Credits Transparency | 4h | 🔥🔥🔥 | ❌ |
| 5 | Search Index | 4h | 🔥🔥 | ❌ |
| 6 | Error Boundaries | 3h | 🔥🔥🔥 | ❌ |

**Total:** 18h → Deploy Reede õhtul

---

### 📅 **Faas 2: Performance & UX** (Week 2)
**Fookus:** Map ja mobile kogemuse parandamine

| # | Ülesanne | Aeg | Impact | Blocker? |
|---|----------|-----|--------|----------|
| 7 | Map Bounds Loading | 8h | 🔥🔥🔥 | ❌ |
| 8 | Geocoding Improvements | 6h | 🔥🔥 | ❌ |
| 9 | Pipeline Retry Logic | 8h | 🔥🔥🔥 | ❌ |
| 10 | Mobile UX Fixes | 12h | 🔥🔥 | ❌ |
| 11 | Rate Limiting | 6h | 🔥🔥 | ❌ |
| 12 | Audit Logs | 6h | 🔥 | ❌ |

**Total:** 46h → Deploy järgmine Reede

---

### 📅 **Faas 3: Suur Refaktoreerimine** (Week 3-4)
**Fookus:** Arhitektuuri parandamine ja uued features

| # | Ülesanne | Aeg | Impact | Blocker? |
|---|----------|-----|--------|----------|
| 13 | React Query Integration | 16h | 🔥🔥🔥 | ❌ |
| 14 | Web Workers | 8h | 🔥 | ❌ |
| 15 | Supabase Vault | 8h | 🔥🔥 | ❌ |
| 16 | Pipeline Scheduling | 12h | 🔥🔥 | ❌ |
| 17 | CSV Export | 8h | 🔥 | ❌ |
| 18 | Live Preview Sidebar | 20h | 🔥🔥 | ❌ |
| 19 | Saved Searches | 8h | 🔥 | ❌ |
| 20 | Scanner Onboarding | 12h | 🔥🔥 | ❌ |

**Total:** 92h → Deploy 2 nädala pärast

---

## 7. Kokkuvõte

### ✅ **Tugevused**
- Tugev AI integratsioon (Gemini)
- Real-time updates (Supabase)
- Hea admin tooling
- Quality prediction süsteem (pgvector)
- Dynamic marker scaling (just added!)

### ⚠️ **Peamised Probleemid**
1. **Performance:** Map ja Dashboard aeglased
2. **UX:** Credits system confusing, no draft save
3. **Security:** Passkey in env, no rate limiting
4. **Error Handling:** No retry logic, silent failures
5. **Mobile:** Tables broken, small buttons

### 🎯 **Top 5 Prioriteeti**
1. **Parallel Dashboard Queries** - 2h, 🔥🔥🔥
2. **Auto-Save Drafts** - 3h, 🔥🔥🔥
3. **Map Bounds Loading** - 8h, 🔥🔥🔥
4. **Credits Transparency** - 4h, 🔥🔥🔥
5. **Pipeline Retry Logic** - 8h, 🔥🔥🔥

### 📊 **Numbrid**
- **Total parandusi:** 20
- **Kiired võidud:** 6 (18h)
- **Keskmine prioriteet:** 6 (46h)
- **Suur refaktoreerimine:** 8 (92h)
- **Kogu aeg:** 156h = ~20 tööpäeva

---

## 8. Järgmised Sammud

### ✅ **Loe läbi see dokument**
- Vaatle iga sektsioon
- Kinnita prioriteedid
- Lisa kommentaarid

### ✅ **Vali alustamise punkt**
Soovitan alustada **Faas 1: Kiired Võidud** - suur impact, väike effort.

### ✅ **Loo implementation plan**
Kui olete analüüsiga nõus, loon detailse koodi muudatuste plaani esimese faasi jaoks.

---

**Küsimused?** Räägi mulle mis on kõige prioriteetsem Sinu jaoks! 🚀
