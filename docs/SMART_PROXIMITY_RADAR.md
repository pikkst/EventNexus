# Smart Proximity Radar System

## Overview

Enhanced event discovery system with intelligent notifications for both upcoming and active events.

## Features

### 1. **Active Event Notifications** 🎉
- Notifies users about events **happening RIGHT NOW**
- Only notifies if tickets are still available
- Priority notifications for events ending soon (within 2 hours)
- Smart filtering to avoid duplicate notifications

### 2. **Upcoming Event Notifications** 📅
- Configurable time window (1-72 hours)
- Alerts users about events starting soon in their area
- Respects user's interested categories

### 3. **User-Friendly Settings**
- Toggle active/upcoming event notifications independently
- Set minimum available tickets threshold (1-20)
- Configure upcoming event window (1-72 hours)
- Visual feedback with emoji indicators

## Architecture

### Database Function
**`get_nearby_events_with_tickets`** - SQL function in `/supabase/migrations/20250128000001_smart_proximity_radar.sql`

```sql
get_nearby_events_with_tickets(
  user_lat: DOUBLE PRECISION,
  user_lon: DOUBLE PRECISION,
  radius_km: DOUBLE PRECISION DEFAULT 10,
  min_tickets: INTEGER DEFAULT 1,
  upcoming_window_hours: INTEGER DEFAULT 24
)
```

Returns events with:
- Distance from user
- Available ticket count
- Event status (active/upcoming/ending_soon)
- Full event data

### Edge Function
**`smart-proximity-radar`** - Serverless function in `/supabase/functions/smart-proximity-radar/`

Handles:
- User preference checking
- Event categorization (active vs upcoming)
- Notification creation
- Duplicate prevention (24h window)

### Frontend Components

#### NotificationSettings.tsx
New settings added:
- **Active Events Toggle**: Enable/disable active event notifications
- **Upcoming Events Toggle**: Enable/disable upcoming event notifications  
- **Upcoming Window Slider**: Set how far ahead to look (1-72h)
- **Min Tickets Slider**: Set minimum available tickets (1-20)

#### Types
Extended `NotificationPreferences`:
```typescript
{
  notifyActiveEvents: boolean;
  notifyUpcomingEvents: boolean;
  upcomingEventWindow: number; // hours
  minAvailableTickets: number;
}
```

Extended `Notification`:
```typescript
{
  type: 'active_event' | 'proximity_radar' | ...;
  metadata: {
    availableTickets?: number;
    distance?: number;
    eventStatus?: 'upcoming' | 'active' | 'ending_soon';
  };
}
```

## User Experience

### Notification Priority
1. **🔥 Ending Soon** - Events ending within 2 hours (highest priority)
2. **🎉 Active Now** - Events currently happening  
3. **📍 Starting Soon** - Upcoming events within user's window

### Smart Filtering
- Only notify once per event per 24 hours
- Filter by user's interested categories
- Respect minimum ticket threshold
- Events must be public and active

### Example Notifications

**Active Event:**
> 🎉 Event Happening NOW!  
> "Summer Beach Party" is currently happening just 2.3km away! 15 tickets still available. Don't miss out!

**Ending Soon:**
> 🔥 Event Ending Soon!  
> "Tech Conference 2025" is ending soon just 1.5km away! 5 tickets still available. Don't miss out!

**Upcoming:**
> 📍 Event Starting Soon!  
> "Jazz Night" starts in 6h, only 3.2km away! 20 tickets available.

## Default Settings

New users get:
```typescript
{
  notifyActiveEvents: true,       // Enabled by default
  notifyUpcomingEvents: true,     // Enabled by default
  upcomingEventWindow: 24,        // 24 hours ahead
  minAvailableTickets: 1          // Any availability
}
```

## Deployment

### 1. Deploy SQL Migration
Run in Supabase SQL Editor:
```bash
supabase/migrations/20250128000001_smart_proximity_radar.sql
```

This creates:
- `get_nearby_events_with_tickets()` function
- Performance indexes
- Proper permissions

### 2. Deploy Edge Function
```bash
npx supabase functions deploy smart-proximity-radar --project-ref anlivujgkjmajkcgbaxw
```

### 3. Test
The frontend automatically uses the new system through `checkProximityRadar()` in `dbService.ts`.

## Testing

### Manual Test
```bash
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/smart-proximity-radar' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

Expected response:
```json
{
  "success": true,
  "summary": {
    "totalNearby": 5,
    "activeEvents": 2,
    "upcomingEvents": 3,
    "endingSoonEvents": 1,
    "notificationsSent": 3
  },
  "nearbyEvents": [...],
  "activeEvents": [...],
  "upcomingEvents": [...],
  "newNotifications": [...]
}
```

## Performance Optimizations

### Database Indexes
```sql
-- Status and date filtering
idx_events_status_date

-- Location and visibility
idx_events_location_visibility

-- Ticket availability
idx_events_ticket_availability

-- Notification deduplication
idx_notifications_user_type_date
```

### Query Optimization
- Uses PostGIS spatial indexes
- Single query retrieves all needed data
- Efficient status calculation in SQL
- Minimizes round trips to database

## Future Enhancements

Potential additions:
1. Push notifications (web/mobile)
2. Email digest of nearby events
3. Smart ML-based recommendations
4. Event trending score
5. Social proof (friends attending)
6. Weather-aware notifications

## Backwards Compatibility

The old `proximity-radar` function remains available for backwards compatibility. New implementations should use `smart-proximity-radar`.

## Documentation

- Implementation: This file
- SQL Schema: `supabase/migrations/20250128000001_smart_proximity_radar.sql`
- Edge Function: `supabase/functions/smart-proximity-radar/index.ts`
- Frontend: `components/NotificationSettings.tsx`
- Types: `types.ts`
- Service: `services/dbService.ts`
