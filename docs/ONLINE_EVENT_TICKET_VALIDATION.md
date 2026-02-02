# Online Event Ticket Validation - Complete Guide

## 🎫 Kuidas Töötab Online Ürituste Piletite Valideerimine?

### Erinevus Füüsiliste Ürituste Vahel

| Aspekt | Füüsiline Üritus | Online Üritus |
|--------|------------------|---------------|
| **Valideerimise Aeg** | Sissepääsul (üks kord) | Streami liitumisel |
| **Valideerimise Meetod** | QR koodi skaneerimine | JWT token + database check |
| **Korraldaja Roll** | Skanneerib QR koode | Süsteem valideerib automaatselt |
| **Piletite Kasutamine** | `status = 'used'` kui skanneeritud | `status = 'used'` kui stream liitutud |
| **Korduvkasutus** | EI (1x skaneerimine) | EI (1x liitumine per pilet) |
| **Mahupiirang** | `maxAttendees` (füüsiline ruum) | `max_online_attendees` (concurrent viewers) |

---

## 🔐 Access Control Süsteem

### 1. Andmebaasi Funktsioonid

Loodud 3 uut PostgreSQL funktsiooni:

#### `has_online_event_access(event_id, user_id)`
Kontrollib, kas kasutajal on õigus üritusel osaleda.

**Kontrollid:**
1. ✅ Kas üritus on online/hybrid tüüpi?
2. ✅ Kas kasutaja on korraldaja? → Alati lubatud
3. ✅ Kas üritus on tasuta JA ei nõua registreerimist? → Lubatud
4. ✅ Kas kasutajal on kehtiv pilet (`status='paid' või 'valid'`)? → Lubatud

```sql
SELECT has_online_event_access('event-uuid', 'user-uuid');
-- Returns: true/false
```

#### `use_online_event_ticket(event_id, user_id)`
Märgib pileti "kasutatuks" kui kasutaja liitub streamiga.

**Toimingud:**
1. Leiab kasutaja kõige uuema kehtiva pileti
2. Kontrollib, kas pilet pole juba kasutatud
3. Uuendab: `status='used'`, `used_at=NOW()`, `scanned_by=user_id`
4. Tagastab tulemuse (success, message, ticket_id)

```sql
SELECT * FROM use_online_event_ticket('event-uuid', 'user-uuid');
```

#### `check_online_event_capacity(event_id)`
Kontrollib, kas üritusele saab veel liituda (vaatajate limiit).

**Tagastab:**
- `can_join` (boolean) - kas võib liituda
- `current_viewers` (integer) - praegused vaatajad
- `max_viewers` (integer või null) - maksimum (null = unlimited)
- `message` (text) - selgitav sõnum

```sql
SELECT * FROM check_online_event_capacity('event-uuid');
```

---

## 🚀 Edge Function: `check-online-event-access`

### Kasutus

**Endpoint:**
```
POST /functions/v1/check-online-event-access
```

**Request:**
```json
{
  "eventId": "uuid-here",
  "markTicketUsed": false // true = mark ticket as used
}
```

**Response (Access Granted):**
```json
{
  "hasAccess": true,
  "canJoin": true,
  "reason": "ACCESS_GRANTED",
  "message": "Welcome to the stream!",
  "currentViewers": 42,
  "maxViewers": 500,
  "ticketInfo": {
    "id": "ticket-uuid",
    "type": "online",
    "used": true
  }
}
```

**Response (No Ticket):**
```json
{
  "hasAccess": false,
  "canJoin": false,
  "reason": "NO_TICKET",
  "message": "You need a valid ticket to access this event"
}
```

**Response (Capacity Reached):**
```json
{
  "hasAccess": true,
  "canJoin": false,
  "reason": "CAPACITY_REACHED",
  "message": "Event is at maximum capacity (500/500 viewers)",
  "currentViewers": 500,
  "maxViewers": 500
}
```

---

## 💻 Frontend Integratsioon

### Service: `onlineEventAccessService.ts`

#### 1. Check Access (Before Showing Player)
```typescript
import { checkOnlineEventAccess } from '@/services/onlineEventAccessService';

const accessResponse = await checkOnlineEventAccess(eventId, false);

if (!accessResponse.hasAccess) {
  // Show "Purchase Ticket" button
  showPurchaseModal();
}

if (!accessResponse.canJoin) {
  // Show "Event Full" message
  alert(accessResponse.message);
}
```

#### 2. Join Stream (Mark Ticket as Used)
```typescript
import { joinOnlineEvent } from '@/services/onlineEventAccessService';

const joinResponse = await joinOnlineEvent(eventId);

if (joinResponse.canJoin) {
  // Show stream player
  showStreamPlayer();
} else {
  // Show error message
  alert(joinResponse.message);
}
```

#### 3. Leave Stream (Mark Session Inactive)
```typescript
import { leaveOnlineEvent } from '@/services/onlineEventAccessService';

// When user closes tab or navigates away
window.addEventListener('beforeunload', () => {
  leaveOnlineEvent(eventId);
});
```

#### 4. Get Current Viewers
```typescript
import { getCurrentViewers } from '@/services/onlineEventAccessService';

const viewerCount = await getCurrentViewers(eventId);
console.log(`Current viewers: ${viewerCount}`);
```

---

## 🎬 LiveStreamPlayer Komponent

### Integreeritud Access Control

```tsx
import LiveStreamPlayer from '@/components/LiveStreamPlayer';

<LiveStreamPlayer
  event={event}
  showChat={true}
  showAnalytics={true}
  autoplay={false}
  onPurchaseClick={() => setShowPurchaseModal(true)}
/>
```

**Player automaatselt:**
1. ✅ Kontrollib kasutaja õigusi (`checkOnlineEventAccess`)
2. ✅ Näitab "Loading..." kui kontrollitakse
3. ✅ Näitab "Purchase Ticket" kui pole piletit
4. ✅ Näitab "Event Full" kui mahupiirang täis
5. ✅ Liitub streamiga automaatselt kui kõik OK
6. ✅ Märgib pileti kasutatuks (`use_online_event_ticket`)
7. ✅ Loob viewer sessioni (`live_stream_sessions`)
8. ✅ Uuendab vaatajate arvu real-time
9. ✅ Puhastab sessiooni lahkumisel

---

## 🔄 Täielik Töövoog

### Stsenaarium 1: Kasutaja Ostab Pileti ja Liitub Streamiga

```
1. USER: Navigeerib event detail lehele
   ↓
2. FRONTEND: Kutsub checkOnlineEventAccess(eventId, false)
   ↓
3. EDGE FUNCTION: Kontrollib has_online_event_access()
   ↓
4. DATABASE: SELECT * FROM tickets WHERE user_id=X AND event_id=Y
   ↓
5. RESULT: hasAccess=false (no ticket)
   ↓
6. FRONTEND: Näitab "Purchase Ticket" nuppu
   ↓
7. USER: Ostab pileti Stripe'i kaudu
   ↓
8. STRIPE WEBHOOK: Loob ticket entry (status='paid')
   ↓
9. USER: Refreshib lehte
   ↓
10. FRONTEND: Kutsub checkOnlineEventAccess(eventId, false) uuesti
    ↓
11. EDGE FUNCTION: has_online_event_access() → TRUE
    ↓
12. FRONTEND: Kutsub joinOnlineEvent(eventId) → markTicketUsed=true
    ↓
13. EDGE FUNCTION: Kutsub use_online_event_ticket()
    ↓
14. DATABASE: UPDATE tickets SET status='used', used_at=NOW()
    ↓
15. EDGE FUNCTION: INSERT INTO live_stream_sessions
    ↓
16. FRONTEND: Näitab stream playerit
    ↓
17. USER: Vaatab stream'i
    ↓
18. USER: Suleb lehe
    ↓
19. FRONTEND: Kutsub leaveOnlineEvent(eventId)
    ↓
20. DATABASE: UPDATE live_stream_sessions SET is_active=false
```

### Stsenaarium 2: Mahupiirang Täis

```
1. EVENT: max_online_attendees = 100
2. CURRENT: 100 active sessions
3. USER: Proovib liituda
4. EDGE FUNCTION: check_online_event_capacity() → can_join=false
5. RESPONSE: "Event at maximum capacity (100/100 viewers)"
6. FRONTEND: Näitab oodake-sõnumit
```

### Stsenaarium 3: Tasuta Üritus Ilma Registreerimiseta

```
1. EVENT: price=0, requires_registration=false
2. USER: Proovib vaadata (pole piletit)
3. EDGE FUNCTION: has_online_event_access() → TRUE (free + no reg)
4. FRONTEND: Näitab streami kohe
```

---

## 📊 Analytics ja Tracking

### Viewer Sessions (`live_stream_sessions`)

Iga vaataja kohta luuakse session:

```sql
{
  id: uuid,
  event_id: uuid,
  user_id: uuid,
  session_token: "session_1738526400_abc123",
  is_active: true,
  joined_at: "2026-02-02T19:00:00Z",
  left_at: null,
  watch_duration_seconds: 0,
  ip_address: "185.123.45.67",
  country: "Estonia",
  city: "Tallinn"
}
```

### Real-time Viewer Count

```sql
-- Get current active viewers
SELECT get_concurrent_viewers('event-uuid');

-- Sessions are active if:
-- 1. is_active = TRUE
-- 2. joined_at >= NOW() - INTERVAL '5 minutes'
```

### Automatic Analytics Updates

**Trigger:** `update_analytics_on_session_change`

Automaatselt uuendab `live_stream_analytics` tabelit kui:
- Uus session luuakse (INSERT)
- Session uuendatakse (UPDATE)
- Session kustutatakse (DELETE)

---

## 🛡️ Turvalisus

### Row Level Security (RLS)

**tickets tabel:**
```sql
-- Users can view their own tickets
CREATE POLICY ON tickets FOR SELECT
USING (auth.uid() = user_id);

-- Organizers can view all tickets for their events
CREATE POLICY ON tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = tickets.event_id
    AND events.organizer_id = auth.uid()
  )
);
```

### JWT Authentication

Kõik Edge Function kutsed nõuavad:
```
Authorization: Bearer <jwt_token>
```

Edge Function:
1. Ekstraktib tokeni
2. Verifitseerib `supabase.auth.getUser(token)`
3. Kasutab user.id kõikides päringutes

### QR Code Mittevajalik

Online events'idel **EI OLE QR koodi**:
- QR kood kasutatakse ainult füüsiliste ürituste sissepääsul
- Online juurdepääs kontrollitakse JWT tokeni ja andmebaasi päringutega
- Turvalisem ja lihtsam lahendus

---

## ✅ Checklist Korraldajale

### Online Event Setup

- [ ] Vali event_type = 'online' või 'hybrid'
- [ ] Lisa streaming_url (YouTube, Vimeo, etc.)
- [ ] Vali streaming_platform
- [ ] Määra max_online_attendees (või jäta tühjaks = unlimited)
- [ ] Vali requires_registration = true (soovitatud)
- [ ] Määra stream_starts_at ja stream_ends_at
- [ ] Testi streami enne live minekut

### Testing

- [ ] Osta test pilet
- [ ] Kontrolli, et player näitab "Ticket Required" ilma piletita
- [ ] Liitu streamiga ostetud piletiga
- [ ] Kontrolli viewer count'i
- [ ] Testi capacity limit'i (kui seatud)
- [ ] Testi chat'i ja reactions'eid
- [ ] Kontrolli, et lahkumisel session deaktiveerub

---

## 🐛 Troubleshooting

### "No valid ticket found"

**Põhjused:**
1. Kasutaja ei ole ostnud piletit
2. Pilet on juba kasutatud (`status='used'`)
3. Pilet on tühistatud (`status='cancelled'`)

**Lahendus:**
```sql
-- Check user tickets
SELECT * FROM tickets
WHERE event_id = 'event-uuid'
AND user_id = 'user-uuid';

-- Reset ticket if needed (testing only!)
UPDATE tickets
SET status = 'paid', used_at = NULL
WHERE id = 'ticket-uuid';
```

### Viewer Count Incorrect

**Põhjused:**
1. Sessions pole õigesti cleanup'itud
2. Kasutajad ei kutsu `leaveOnlineEvent()`

**Lahendus:**
```sql
-- Manually cleanup old sessions
UPDATE live_stream_sessions
SET is_active = false, left_at = NOW()
WHERE event_id = 'event-uuid'
AND joined_at < NOW() - INTERVAL '10 minutes';

-- Force recalculate
SELECT update_stream_analytics('event-uuid');
```

### Capacity Not Enforced

**Põhjused:**
1. `max_online_attendees` on NULL (unlimited)
2. Check function ei tööta

**Lahendus:**
```sql
-- Set capacity
UPDATE events
SET max_online_attendees = 100
WHERE id = 'event-uuid';

-- Test capacity function
SELECT * FROM check_online_event_capacity('event-uuid');
```

---

## 📈 Järgmised Sammud

### Täiendused

- [ ] Email teavitus kui stream algab
- [ ] "Waiting room" kui stream pole veel alanud
- [ ] Auto-refresh kui capacity vabaneb
- [ ] Multi-device detection (1 ticket = 1 device korraga)
- [ ] "Watch party" mode (grupi pileti jagamine)
- [ ] Post-stream replay access control
- [ ] Advanced geo-blocking
- [ ] DRM protection for premium content

---

## 📞 Support

**Küsimused või probleemid?**
- Email: huntersest@gmail.com
- Docs: `/docs/LIVE_STREAMING_IMPLEMENTATION.md`
- Migration: `/supabase/migrations/20260202_add_live_streaming_support.sql`
- Edge Function: `/supabase/functions/check-online-event-access/index.ts`
- Frontend Service: `/src/services/onlineEventAccessService.ts`

---

**Last Updated:** 2026-02-02  
**Version:** 1.0.0  
**Status:** Production Ready ✅
