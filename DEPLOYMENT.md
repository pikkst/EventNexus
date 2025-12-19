# EventNexus Deployment Guide

Complete guide for deploying EventNexus platform without any mock data.

## 🎯 Overview

All mock data has been removed and replaced with a fully functional Supabase backend:
- ✅ SQL schemas with RLS policies
- ✅ Edge Functions for serverless operations
- ✅ Real-time subscriptions
- ✅ Geospatial queries (PostGIS)
- ✅ Analytics and statistics

## 📋 Prerequisites

1. **Supabase project**: `anlivujgkjmajkcgbaxw`
2. **Node.js**: version 18 or newer
3. **npm/npx**: for package management

## 🚀 Deployment Steps

### 1. Apply SQL Migrations

Open Supabase SQL Editor and run the following scripts in order:

#### a) Complete Schema (REQUIRED)
📁 `supabase/migrations/20250101000001_complete_schema.sql`

This creates:
- All tables (users, events, notifications, tickets, analytics)
- Indexes for performance
- RLS policies for security
- Functions (distance calculation, nearby events)
- Triggers for automatic updates

#### b) Realtime Setup
📁 `supabase/migrations/20250101000002_realtime_setup.sql`

Enables real-time subscriptions:
- Notifications live updates
- Events live updates
- PostgreSQL NOTIFY/LISTEN

#### c) Analytics Functions
📁 `supabase/migrations/20250101000003_analytics_functions.sql`

Adds analytics functions:
- `get_revenue_by_tier()`
- `get_platform_statistics()`
- `get_infrastructure_statistics()`
- `get_event_performance(event_id)`
- `get_user_activity_summary(user_id)`

### 2. Edge Functions Deployment

Edge Functions must be deployed separately as they are serverless Deno functions.

#### Login to Supabase:
```bash
npx supabase login
```

#### Deploy all functions:
```bash
cd /workspaces/EventNexus
chmod +x supabase/deploy-functions.sh
./supabase/deploy-functions.sh
```

OR manually one by one:
```bash
npx supabase functions deploy proximity-radar --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy platform-stats --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy infrastructure-stats --project-ref anlivujgkjmajkcgbaxw
npx supabase functions deploy validate-ticket --project-ref anlivujgkjmajkcgbaxw
```

### 3. Verify Environment Variables

Your `.env.local` file must contain:
```env
VITE_SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY
GEMINI_API_KEY=***REMOVED***
```

### 4. Run the Application

```bash
npm install
npm run dev
```

Application will start at: http://localhost:3000

## 🗂️ Created Structure

```
EventNexus/
├── supabase/
│   ├── migrations/                    # SQL schemas (run in SQL Editor)
│   │   ├── 20250101000001_complete_schema.sql
│   │   ├── 20250101000002_realtime_setup.sql
│   │   └── 20250101000003_analytics_functions.sql
│   ├── functions/                     # Edge Functions (deploy with npx)
│   │   ├── proximity-radar/
│   │   │   └── index.ts
│   │   ├── platform-stats/
│   │   │   └── index.ts
│   │   ├── infrastructure-stats/
│   │   │   └── index.ts
│   │   └── validate-ticket/
│   │       └── index.ts
│   ├── deploy-functions.sh            # Deployment script
│   └── README.md                      # Complete documentation
├── services/
│   ├── dbService.ts                   # Updated to use Edge Functions
│   ├── supabase.ts                    # Supabase client
│   └── geminiService.ts               # AI integration
└── constants.tsx                      # Clean, no mock data
```

## 🔧 Edge Functions Description

### 1. proximity-radar
**Purpose**: Checks for nearby events based on user location

**Usage**:
```typescript
import { checkProximityRadar } from './services/dbService';

const result = await checkProximityRadar(
  userId,
  latitude,
  longitude
);
// Returns: { nearbyEvents, newNotifications, totalNearby, notificationsSent }
```

### 2. platform-stats
**Purpose**: Returns platform statistics (admin only)

**Usage**:
```typescript
import { getPlatformStats } from './services/dbService';

const stats = await getPlatformStats();
// Returns: { totalEvents, totalUsers, totalRevenue, revenueByTier, ... }
```

### 3. infrastructure-stats
**Purpose**: Returns infrastructure monitoring data (admin only)

**Usage**:
```typescript
import { getInfrastructureStats } from './services/dbService';

const infra = await getInfrastructureStats();
// Returns: { clusterUptime, apiLatency, dbConnections, systemLogs, ... }
```

### 4. validate-ticket
**Purpose**: Validates and marks ticket as used

**Usage**:
```typescript
import { validateTicket } from './services/dbService';

const result = await validateTicket(ticketId);
// Returns: { valid: true/false, ticket, message }
```

## 🔐 Security

- **RLS (Row Level Security)**: All tables are protected
- **Admin-only**: Stats and infrastructure functions verify role
- **Authentication**: All Edge Functions require JWT token
- **Organizer check**: Ticket validation verifies permissions

## 📊 Database Functions

Functions created in SQL (use directly via RPC):

```typescript
// Find nearby events
const { data } = await supabase.rpc('get_nearby_events', {
  user_lat: 40.7128,
  user_lon: -74.0060,
  radius_km: 10
});

// Calculate distance
const { data } = await supabase.rpc('calculate_distance', {
  lat1: 40.7128,
  lon1: -74.0060,
  lat2: 40.7589,
  lon2: -73.9851
});

// Update analytics
await supabase.rpc('update_event_analytics', {
  p_event_id: eventId,
  p_views: 1,
  p_ticket_sales: 0,
  p_revenue: 0
});
```

## 🧪 Testing

### Test Edge Functions:
```bash
# Proximity radar
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/proximity-radar' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid","latitude":40.7128,"longitude":-74.0060}'

# Platform stats (admin only)
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/platform-stats' \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Database Functions:
Open Supabase SQL Editor and run:
```sql
-- Test nearby events
SELECT * FROM get_nearby_events(40.7128, -74.0060, 10);

-- Test distance calculation
SELECT calculate_distance(40.7128, -74.0060, 40.7589, -73.9851);

-- Test statistics
SELECT get_platform_statistics();
```

## 🐛 Troubleshooting

### Edge Functions not working
- Check if logged in: `npx supabase projects list`
- Check deployment logs: `npx supabase functions logs proximity-radar`

### RLS policies blocking queries
- Ensure user is authenticated
- Check user role (admin, organizer, user)
- Temporarily disable RLS (testing only):
  ```sql
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ```

### PostGIS functions not working
- Ensure extension is enabled:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```

## 📞 Support

For issues or questions:
- Email: huntersest@gmail.com
- See: `supabase/README.md` for detailed documentation

## ✅ Checklist

Before production deployment:

- [ ] All SQL migrations applied
- [ ] All Edge Functions deployed
- [ ] Environment variables configured
- [ ] Admin user created and confirmed
- [ ] RLS policies tested
- [ ] Edge Functions tested
- [ ] Real-time subscriptions working
- [ ] Proximity radar working
- [ ] Ticket validation working
- [ ] Analytics functions working

---

**Note**: This is a fully functional backend with zero mock data. All data comes from Supabase.
