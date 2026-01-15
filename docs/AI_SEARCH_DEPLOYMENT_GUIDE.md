# AI Search Deployment Guide

## Overview
This guide explains how to deploy public events for AI search engines (ChatGPT, Claude, Perplexity) and enhanced analytics tracking.

## Prerequisites
- Supabase project access (https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw)
- Admin credentials for SQL Editor
- Supabase CLI (optional, for Edge Functions)

## Step 1: Deploy Analytics Enhancement Migration

### Via Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new
2. Copy the entire content from: `supabase/migrations/20260115_enhance_analytics_tracking.sql`
3. Click **"Run"**
4. Verify success (should see "Success. No rows returned")

### What This Does
- Adds columns to `analytics_events` table:
  - `user_country` (TEXT)
  - `user_city` (TEXT)
  - `device_type` (TEXT with CHECK constraint)
  - `browser` (TEXT)
  - `os` (TEXT)
  - `referrer` (TEXT)
  - `search_engine` (TEXT with CHECK constraint)
- Creates `analytics_events_public` view (excludes admin users)
- Adds RPC functions:
  - `get_traffic_by_country(days_back)`
  - `get_traffic_by_device(days_back)`
  - `get_traffic_by_browser(days_back)`
  - `get_traffic_by_search_engine(days_back)`
  - `get_top_referrers(days_back, limit_count)`
- Creates performance indexes

## Step 2: Deploy Public Events Migration

### Via Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new
2. Copy the entire content from: `supabase/migrations/20260115_public_events_for_ai_search.sql`
3. Click **"Run"**
4. Verify success

### What This Does
- Creates `public_events` view (bypasses RLS for AI crawlers)
- Adds RPC functions:
  - `get_public_event(event_id)` - Single event with organizer details
  - `get_all_public_events(limit_count, offset_count)` - Paginated event list
- Grants public access to `anon` and `authenticated` roles

## Step 3: Deploy Public Events Sitemap Edge Function

### Option A: Via Supabase CLI (Recommended)

```bash
cd /workspaces/EventNexus
npx supabase functions deploy public-events-sitemap
```

### Option B: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions
2. Click **"Create a new function"**
3. Function name: `public-events-sitemap`
4. Copy code from: `supabase/functions/public-events-sitemap/index.ts`
5. Click **"Deploy function"**

### What This Does
Creates public endpoint accessible at:
```
https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap
```

Supports three formats:
- **JSON** (default): `?format=json` - For AI agents
- **XML**: `?format=xml` - For search engines
- **HTML**: `?format=html` - Human-readable listing

## Step 4: Test the Deployment

### Test Analytics Functions

```sql
-- Test country traffic
SELECT * FROM get_traffic_by_country(30);

-- Test device traffic
SELECT * FROM get_traffic_by_device(30);

-- Test browser traffic
SELECT * FROM get_traffic_by_browser(30);

-- Test search engine traffic
SELECT * FROM get_traffic_by_search_engine(30);

-- Test referrers
SELECT * FROM get_top_referrers(30, 10);
```

### Test Public Events

```sql
-- Test public events view
SELECT * FROM public_events LIMIT 10;

-- Test single event function
SELECT * FROM get_public_event('your-event-uuid-here');

-- Test all events function
SELECT * FROM get_all_public_events(10, 0);
```

### Test Sitemap Endpoint

```bash
# Test JSON format (AI agents)
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap?format=json

# Test XML format (search engines)
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap?format=xml

# Test HTML format (human readable)
curl https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap?format=html
```

## Step 5: Update robots.txt (Already Done)

The following entries are already in `/public/robots.txt`:

```txt
User-agent: GPTBot
User-agent: Claude-Web
User-agent: PerplexityBot
Allow: /
Sitemap: https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/public-events-sitemap?format=xml
```

## Step 6: Verify AI Discoverability

### Test with ChatGPT
Ask ChatGPT:
```
What events can you find on www.eventnexus.eu?
```

### Test with Perplexity
Ask Perplexity:
```
What upcoming events are listed on eventnexus.eu?
```

### Test with Claude
Ask Claude:
```
Can you find any events on www.eventnexus.eu?
```

## Expected Results

### Analytics Dashboard (https://www.eventnexus.eu/admin)
- **Overview Tab**: Should show new cards for:
  - Traffic by Country (with flags)
  - Device Types (pie chart)
  - Browsers (percentage breakdown)
  - Search Engines (with conversion rates)
  - Top Referrers (ranked list)

### AI Search Results
After 24-48 hours, AI search engines should be able to:
- List events from EventNexus
- Provide event details (name, date, location, price)
- Show organizer information
- Display event categories and tags

## Troubleshooting

### Analytics Data Not Showing
- Check if columns were added: `\d analytics_events` in SQL Editor
- Verify functions exist: `\df get_traffic_by_*` in SQL Editor
- Wait 10 seconds for auto-refresh in dashboard

### Public Events Not Visible
- Check RLS is enabled but view grants are applied
- Test directly: `SELECT * FROM public_events;`
- Verify events have `status = 'active'` and future dates

### Sitemap Returns Empty
- Check if events exist: `SELECT COUNT(*) FROM events WHERE status = 'active' AND date >= NOW();`
- Verify Edge Function is deployed and not showing errors
- Check function logs in Supabase Dashboard

### AI Crawlers Not Finding Events
- Wait 24-48 hours for crawlers to index
- Verify sitemap is accessible publicly
- Check robots.txt is deployed correctly
- Submit sitemap to Google Search Console

## Rollback Instructions

### Rollback Analytics Migration
```sql
-- Remove analytics columns
ALTER TABLE analytics_events 
  DROP COLUMN IF EXISTS user_country,
  DROP COLUMN IF EXISTS user_city,
  DROP COLUMN IF EXISTS device_type,
  DROP COLUMN IF EXISTS browser,
  DROP COLUMN IF EXISTS os,
  DROP COLUMN IF EXISTS referrer,
  DROP COLUMN IF EXISTS search_engine;

-- Drop view and functions
DROP VIEW IF EXISTS analytics_events_public;
DROP FUNCTION IF EXISTS get_traffic_by_country;
DROP FUNCTION IF EXISTS get_traffic_by_device;
DROP FUNCTION IF EXISTS get_traffic_by_browser;
DROP FUNCTION IF EXISTS get_traffic_by_search_engine;
DROP FUNCTION IF EXISTS get_top_referrers;
```

### Rollback Public Events
```sql
-- Revoke permissions
REVOKE SELECT ON public_events FROM anon, authenticated;

-- Drop view and functions
DROP VIEW IF EXISTS public_events;
DROP FUNCTION IF EXISTS get_public_event;
DROP FUNCTION IF EXISTS get_all_public_events;
```

### Delete Edge Function
```bash
npx supabase functions delete public-events-sitemap
```

## Security Notes

- ✅ Public events view only exposes `active`/`published` events with future dates
- ✅ No user emails or sensitive data exposed
- ✅ Admin users excluded from analytics tracking
- ✅ RLS policies still protect write operations
- ✅ Edge Function uses `SECURITY DEFINER` for controlled access

## Performance Considerations

- All new columns have indexes for fast queries
- View uses existing RLS-protected table
- Edge Function caches can be added if needed
- Sitemap limited to 100 events by default (configurable)

## Next Steps

1. Monitor analytics dashboard for data population
2. Test AI crawler results after 24-48 hours
3. Add more events to increase discoverability
4. Consider adding more detailed event metadata
5. Monitor Edge Function usage and add caching if needed

## Support

For issues:
- Check Supabase Dashboard logs
- Review SQL Editor error messages
- Test RPC functions directly in SQL Editor
- Contact: huntersest@gmail.com
