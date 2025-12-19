# EventNexus - Supabase Backend Setup

This directory contains all backend infrastructure for EventNexus:
- SQL database migrations
- Edge Functions (serverless functions)

## 📁 Directory Structure

```
supabase/
├── migrations/          # SQL migration files
│   ├── 20250101000001_complete_schema.sql
│   ├── 20250101000002_realtime_setup.sql
│   └── 20250101000003_analytics_functions.sql
├── functions/           # Edge Functions
│   ├── proximity-radar/
│   ├── platform-stats/
│   ├── infrastructure-stats/
│   └── validate-ticket/
└── deploy-functions.sh  # Deployment script
```

## 🚀 Setup Instructions

### 1. Apply SQL Migrations

Open Supabase SQL Editor and run migrations in order:

1. **Complete Schema** (`20250101000001_complete_schema.sql`)
   - Creates all tables (users, events, notifications, tickets, etc.)
   - Sets up indexes and relationships
   - Implements Row Level Security (RLS) policies
   - Creates utility functions (distance calculation, nearby events, etc.)
   - Sets up triggers for automatic updates

2. **Realtime Setup** (`20250101000002_realtime_setup.sql`)
   - Enables real-time subscriptions for notifications
   - Sets up event broadcasting

3. **Analytics Functions** (`20250101000003_analytics_functions.sql`)
   - Creates analytics and statistics functions
   - Sets up platform metrics calculation

### 2. Deploy Edge Functions

Edge Functions are deployed automatically via the deployment script:

```bash
# Make script executable
chmod +x supabase/deploy-functions.sh

# Run deployment
./supabase/deploy-functions.sh
```

Or manually deploy each function:

```bash
# Login to Supabase
supabase login

# Deploy each function
supabase functions deploy proximity-radar --project-ref anlivujgkjmajkcgbaxw
supabase functions deploy platform-stats --project-ref anlivujgkjmajkcgbaxw
supabase functions deploy infrastructure-stats --project-ref anlivujgkjmajkcgbaxw
supabase functions deploy validate-ticket --project-ref anlivujgkjmajkcgbaxw
```

## 📊 Database Schema

### Tables

- **users** - User accounts with roles and preferences
- **events** - Events with geospatial location support (PostGIS)
- **notifications** - User notifications with types (proximity, updates, etc.)
- **tickets** - Event tickets with QR codes and status tracking
- **event_analytics** - Daily analytics per event
- **platform_metrics** - Platform-wide statistics
- **user_sessions** - Session tracking for monitoring

### Key Features

- **Geospatial Queries**: PostGIS extension for location-based features
- **Row Level Security**: All tables protected with RLS policies
- **Real-time Subscriptions**: Live updates for notifications and events
- **Automatic Triggers**: Updated_at timestamps, location point calculations
- **Analytics Functions**: Pre-built functions for statistics and metrics

## 🔧 Edge Functions

### 1. proximity-radar

**Purpose**: Checks for nearby events based on user location

**Input**:
```json
{
  "userId": "uuid",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Output**:
```json
{
  "success": true,
  "nearbyEvents": [...],
  "newNotifications": [...],
  "totalNearby": 5,
  "notificationsSent": 2
}
```

### 2. platform-stats

**Purpose**: Returns comprehensive platform statistics (admin only)

**Input**: None (uses authentication token)

**Output**:
```json
{
  "totalEvents": 150,
  "totalUsers": 5000,
  "totalRevenue": 125000,
  "revenueByTier": [...],
  ...
}
```

### 3. infrastructure-stats

**Purpose**: Returns infrastructure monitoring data (admin only)

**Output**:
```json
{
  "clusterUptime": 99.97,
  "apiLatency": 12,
  "dbConnections": 245,
  "systemLogs": [...],
  ...
}
```

### 4. validate-ticket

**Purpose**: Validates and marks tickets as used

**Input**:
```json
{
  "ticketId": "uuid",
  // OR
  "qrCode": "EVNX-ABC123"
}
```

**Output**:
```json
{
  "valid": true,
  "message": "Ticket validated successfully",
  "ticket": {...}
}
```

## 🔐 Security

- All Edge Functions require authentication
- RLS policies enforce data access control
- Admin-only functions verify user role
- QR code validation checks organizer permissions
- All sensitive operations are logged

## 📝 Database Functions

### get_nearby_events(lat, lon, radius)
Returns events within specified radius of a location.

### calculate_distance(lat1, lon1, lat2, lon2)
Calculates distance between two geographic points in km.

### update_event_analytics(event_id, views, sales, revenue)
Updates or inserts daily analytics for an event.

### get_platform_statistics()
Returns comprehensive platform statistics.

### get_infrastructure_statistics()
Returns infrastructure monitoring data.

### get_event_performance(event_id)
Returns detailed performance metrics for an event.

### get_user_activity_summary(user_id)
Returns activity summary for a user.

## 🧪 Testing

After deployment, test functions using curl:

```bash
# Test proximity radar
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/proximity-radar' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"uuid","latitude":40.7128,"longitude":-74.0060}'

# Test platform stats
curl -X POST \
  'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/platform-stats' \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🐛 Troubleshooting

### Edge Function Errors

Check function logs:
```bash
supabase functions logs proximity-radar --project-ref anlivujgkjmajkcgbaxw
```

### Database Connection Issues

Verify connection in SQL Editor:
```sql
SELECT current_database(), current_user;
```

### RLS Policy Issues

Temporarily disable for testing (don't use in production):
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [PostGIS Documentation](https://postgis.net/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 📧 Support

For issues or questions, contact: huntersest@gmail.com
