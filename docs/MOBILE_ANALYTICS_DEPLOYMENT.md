# Mobile App Analytics Deployment Guide

## 📊 What This Adds

Complete analytics and logging system for mobile apps to track:
- User authentication (login, signup, logout)
- App usage (opens, screen views)
- Feature usage (map views, event searches, ticket purchases)
- Errors and crashes
- Device information for debugging

## 🗄️ Database Changes

File: `supabase/migrations/20260106000002_mobile_app_analytics.sql`

### New Tables:
- `mobile_app_logs` - Stores all event logs with device info

### New Functions:
- `log_mobile_app_event()` - RPC function mobile apps call to log events

### New Views:
- `mobile_app_analytics` - 30-day event aggregation for admin dashboard
- `mobile_app_recent_activity` - Last 24 hours of activity

## 📱 Mobile App Changes

### New File:
- `AnalyticsRepository.kt` - Centralized analytics service

### Updated Files:
- `AuthRepository.kt` - Logs authentication events
- `MainActivity.kt` - Logs app opens

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

**Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql
2. Open new query
3. Copy entire content from `supabase/migrations/20260106000002_mobile_app_analytics.sql`
4. Run the query
5. Verify success messages

### Step 2: Rebuild Android App

GitHub Actions will automatically build the APK. Check:
https://github.com/pikkst/EventNexus/actions

### Step 3: Test Analytics

After installing the new APK:

1. **Open the app** → Should log `app_open` event
2. **Try to login** → Should log `login_attempt` and `login_success`/`login_failure`
3. **Check logs in Supabase:**

```sql
-- View recent activity (last 24 hours)
SELECT * FROM public.mobile_app_recent_activity
ORDER BY created_at DESC
LIMIT 20;

-- View analytics summary
SELECT * FROM public.mobile_app_analytics
WHERE app_name = 'livemap'
ORDER BY event_date DESC;

-- Raw logs for specific user
SELECT 
    event_type,
    event_data,
    device_info,
    created_at
FROM public.mobile_app_logs
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;
```

## 📈 What You'll See

### Example Log Entry:
```json
{
  "id": "uuid",
  "user_id": "user-uuid-or-null",
  "app_name": "livemap",
  "event_type": "login_success",
  "event_data": {
    "email": "user@example.com",
    "success": true
  },
  "device_info": {
    "device": "OnePlus",
    "model": "SM-G981B",
    "manufacturer": "samsung",
    "android_version": "13",
    "sdk_int": 33,
    "app": "livemap"
  },
  "ip_address": "1.2.3.4",
  "created_at": "2026-01-06T12:34:56.789Z"
}
```

## 🎯 Standard Event Types

### Authentication:
- `app_open` - App launched
- `login_attempt` - User tried to login
- `login_success` - Successful login
- `login_failure` - Failed login
- `signup_attempt` - Registration attempt
- `signup_success` - Successful signup
- `logout` - User signed out

### Live Map (Future):
- `map_view` - Map screen opened
- `event_view` - Event details viewed
- `event_search` - Search performed
- `ticket_purchase` - Ticket bought
- `location_permission_granted` - Location enabled
- `location_permission_denied` - Location denied
- `radar_activated` - Radar feature used
- `filter_changed` - Filter settings changed

### Errors (Future):
- `error_network` - Network failure
- `error_api` - API error
- `error_crash` - App crash

## 🔒 Security & Privacy

- ✅ RLS enabled - users can only see their own logs
- ✅ Admins can see all logs
- ✅ Anonymous events supported (user_id can be null)
- ✅ IP addresses logged for security
- ✅ Device info for debugging only

## 📊 Admin Queries

### Most Popular Events (Last 30 Days):
```sql
SELECT 
    event_type,
    COUNT(*) as total,
    COUNT(DISTINCT user_id) as unique_users
FROM public.mobile_app_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY total DESC;
```

### Daily Active Users:
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as dau
FROM public.mobile_app_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
AND event_type = 'app_open'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Login Success Rate:
```sql
SELECT 
    COUNT(CASE WHEN event_type = 'login_success' THEN 1 END) as successes,
    COUNT(CASE WHEN event_type = 'login_failure' THEN 1 END) as failures,
    ROUND(
        100.0 * COUNT(CASE WHEN event_type = 'login_success' THEN 1 END) / 
        NULLIF(COUNT(*), 0), 
        2
    ) as success_rate_percent
FROM public.mobile_app_logs
WHERE event_type IN ('login_success', 'login_failure')
AND created_at >= NOW() - INTERVAL '7 days';
```

### Most Used Devices:
```sql
SELECT 
    device_info->>'manufacturer' as manufacturer,
    device_info->>'model' as model,
    device_info->>'android_version' as android_version,
    COUNT(DISTINCT user_id) as users,
    COUNT(*) as events
FROM public.mobile_app_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY manufacturer, model, android_version
ORDER BY users DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Logs Not Appearing:
1. Check if migration ran successfully
2. Verify RPC function exists: `SELECT * FROM pg_proc WHERE proname = 'log_mobile_app_event'`
3. Check app permissions: `GRANT EXECUTE ON FUNCTION log_mobile_app_event TO authenticated, anon`
4. Test RPC manually in SQL editor

### Test RPC Function:
```sql
SELECT public.log_mobile_app_event(
    'livemap',
    'test_event',
    '{"test": "data"}'::jsonb,
    '{"device": "test"}'::jsonb
);

-- Then check if it logged
SELECT * FROM public.mobile_app_logs ORDER BY created_at DESC LIMIT 1;
```

## 📝 Next Steps

Once deployed and tested:

1. ✅ Monitor initial logs from test users
2. ✅ Add more event types as needed
3. ✅ Build admin dashboard to visualize analytics
4. ✅ Set up alerts for errors/crashes
5. ✅ Create retention and conversion funnels

## 📧 Support

Issues? Contact: huntersest@gmail.com

---

**Status**: Ready for deployment  
**Risk**: Low (non-breaking changes, analytics only)  
**Testing**: Required on staging/test device first
