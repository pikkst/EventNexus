# Event Archival System Documentation

## Overview

EventNexus automatically archives past events to keep listings relevant and performant. Archived events are excluded from:
- Public event listings (`/browse`, `/map`, `/events`)
- Google/AI crawler sitemaps
- Platform statistics and counts
- Search results

## Archival Rules

### Automatic Archival
**Trigger:** Daily CRON job at 2:00 AM UTC  
**Edge Function:** `archive-expired-events`  
**Criteria:** Events where `date + time` has passed

```typescript
// Event is archived if:
const eventDateTime = new Date(`${event.date}T${event.time || '23:59:59'}`);
const hasEnded = eventDateTime < new Date();
```

### What Gets Archived
- ✅ Events with past dates
- ✅ Events where end_time < current time
- ✅ Both free and paid events
- ✅ Events with active status

### What Stays Active
- ❌ Events in the future
- ❌ Events happening today (until time passes)
- ❌ Already archived events (no re-archiving)
- ❌ Draft events (remain drafts until published or deleted)

## Database Schema

```sql
-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  status TEXT CHECK (status IN ('draft', 'active', 'cancelled', 'archived')),
  archived_at TIMESTAMPTZ,
  date DATE NOT NULL,
  time TIME,
  end_time TIME,
  -- ... other fields
);

-- Index for performance
CREATE INDEX idx_events_archived ON events(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_events_active_date ON events(status, date) WHERE status = 'active';
```

## Filtering Logic

### Public Views
All public queries exclude archived events:

```typescript
// dbService.ts - getEvents()
const { data } = await supabase
  .from('events')
  .select('*')
  .is('archived_at', null)  // Exclude archived
  .order('date', { ascending: true });
```

### API Endpoints

#### public-events-sitemap
```typescript
// Only future events
.gte('date', new Date().toISOString())
.is('archived_at', null)
```

#### Google Search Console Result
- **999 events detected** = Current active/future events
- **~1000 archived** = Past events (not shown to Google)

## Statistics

### Platform Stats (Exclude Archived)
```sql
-- Active events count
SELECT COUNT(*) FROM events 
WHERE status = 'active' 
  AND archived_at IS NULL;

-- Future events (shown to users/AI)
SELECT COUNT(*) FROM events 
WHERE status = 'active' 
  AND archived_at IS NULL
  AND date >= CURRENT_DATE;
```

### Archive Stats (Separate Count)
```sql
-- Archived events count
SELECT COUNT(*) FROM events 
WHERE archived_at IS NOT NULL;

-- Recently archived (last 7 days)
SELECT COUNT(*) FROM events 
WHERE archived_at >= NOW() - INTERVAL '7 days';
```

## User Experience

### Organizers
- Can view their archived events in dashboard
- Can see archive date and reason
- Cannot unarchive events (permanent)
- Archive doesn't affect historical analytics

### Attendees
- Cannot see archived events in browse/search
- Can still access ticket history for archived events
- Past check-ins remain visible

### Admins
- See total events: active + archived
- Separate counters for each status
- Can force-archive events manually
- Archive logs in `ai_decision_log`

## Implementation Status

### ✅ Completed
- [x] CRON job runs daily at 2 AM UTC
- [x] Edge Function archives expired events
- [x] Database triggers update source stats
- [x] Public queries filter archived events
- [x] AI sitemap excludes archived events
- [x] Decision logging for each archival

### 🔄 Current Behavior (Jan 19, 2026)
- Total events: ~2000
- Active/Future: 999 (shown to Google/AI)
- Archived/Past: ~1000 (hidden from public)

### 📋 Todo: Enhanced Archive UI
- [ ] Add "Archived Events" section in organizer dashboard
- [ ] Show archive statistics in admin panel
- [ ] Display "X events in archive" badge
- [ ] Add archive filter toggle for organizers
- [ ] Export archived events data

## Manual Archival

### Via SQL
```sql
-- Archive specific event
UPDATE events 
SET status = 'archived', 
    archived_at = NOW()
WHERE id = '<event-id>';

-- Archive all events before specific date
UPDATE events 
SET status = 'archived', 
    archived_at = NOW()
WHERE date < '2026-01-01' 
  AND status = 'active';
```

### Via Edge Function (Trigger manually)
```sql
-- Trigger archive job immediately
SELECT trigger_archive_expired_events();
```

## Troubleshooting

### "Why does Google only see 999 events?"
**Answer:** Google only crawls active future events. Past events are archived and excluded from sitemap.

### "Where did my old events go?"
**Answer:** Events are archived after their date passes. Check `archived_at IS NOT NULL` in database.

### "Can I unarchive an event?"
**Answer:** No. Archival is permanent. Create a new event instead.

### "Do archived events affect my stats?"
**Answer:** No. Only active events count toward platform statistics and organizer metrics.

## Performance Benefits

### Before Archival System
- 2000+ events in queries
- Slow browse/search performance
- AI crawlers index irrelevant past events
- Confusing user experience (mixed past/future)

### After Archival System
- 999 active events in queries (50% reduction)
- Fast browse/search performance
- AI crawlers only index relevant events
- Clean UX (only future events shown)

## Best Practices

### For Organizers
1. **Set accurate dates/times** - Ensures correct archival
2. **Review past events** - Check dashboard for archived list
3. **Plan recurring events** - Create new event instead of editing archived
4. **Export data before archive** - Download attendee lists proactively

### For Admins
1. **Monitor archive rates** - Should align with event dates
2. **Check CRON logs** - Verify daily job runs successfully
3. **Review edge cases** - Multi-day events, timezone issues
4. **Archive statistics** - Track growth and cleanup

## Related Files

- `/supabase/functions/archive-expired-events/index.ts` - Archival logic
- `/supabase/migrations/20260110_enable_archive_cron.sql` - CRON setup
- `/supabase/migrations/20260110_source_stats_functions.sql` - Stats triggers
- `/src/services/dbService.ts` - Query filters
- `/supabase/functions/public-events-sitemap/index.ts` - Public API

## Monitoring

### Daily Checks
- CRON job execution logs
- Archive count trends
- Performance metrics

### Weekly Reviews
- Archive rate vs event creation rate
- User feedback on missing events
- AI crawler access patterns

---

**Status:** Active | CRON runs daily at 2 AM UTC  
**Last updated:** 2026-01-19  
**Next review:** 2026-02-01  
**Contact:** huntersest@gmail.com
