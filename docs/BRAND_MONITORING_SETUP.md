# Brand Monitoring System - Quick Setup Guide

This guide will help you set up the brand monitoring system in your EventNexus instance.

## Prerequisites

- Admin access to EventNexus
- Supabase project access
- Database credentials

## Step 1: Run Database Migration

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy contents of `sql/create-brand-monitoring-tables.sql`
5. Paste into SQL editor
6. Click **Run** or press `Ctrl+Enter`

### Option B: Command Line

```bash
# From project root
psql "postgresql://[user]:[password]@[host]:5432/postgres" \
  -f sql/create-brand-monitoring-tables.sql
```

### Option C: Using Supabase CLI

```bash
# Link to your project (if not already)
supabase link --project-ref [your-project-ref]

# Run migration
supabase db push

# Or execute specific file
supabase db execute -f sql/create-brand-monitoring-tables.sql
```

## Step 2: Verify Tables Created

Run this query in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('brand_monitoring_alerts', 'monitoring_stats');

-- Check initial data
SELECT * FROM monitoring_stats;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename IN ('brand_monitoring_alerts', 'monitoring_stats');
```

Expected output:
- 2 tables found
- 1 row in monitoring_stats
- 2 RLS policies created

## Step 3: Configure API Keys (Optional)

For full functionality, add these to `.env.local`:

```env
# Minimum viable setup (GitHub only)
VITE_GITHUB_TOKEN=ghp_your_token_here

# Full setup (all monitoring features)
VITE_GITHUB_TOKEN=ghp_your_token_here
VITE_WHOIS_API_KEY=your_whois_key
VITE_BRAND_MONITORING_API_KEY=your_brand_key
VITE_GOOGLE_SEARCH_KEY=your_google_key
VITE_GOOGLE_SEARCH_ENGINE=your_engine_id
VITE_TWITTER_BEARER_TOKEN=your_twitter_token
VITE_FACEBOOK_APP_ID=your_fb_app_id
VITE_FACEBOOK_APP_SECRET=your_fb_secret
```

**Note:** The dashboard works without API keys, but scans will return empty results until APIs are configured.

## Step 4: Test Admin Access

1. Start development server:
   ```bash
   npm run dev
   ```

2. Log in as admin user

3. Navigate to Admin Command Center

4. Click **Brand Protection** tab in sidebar

5. Verify dashboard loads with:
   - Stats grid
   - Alert summary
   - Monitoring tabs

## Step 5: Test Scanning (Optional)

If you configured API keys:

1. Go to **Code Protection** tab
2. Click **Scan Now**
3. Wait for results (2-5 seconds)
4. Check for any alerts in database:
   ```sql
   SELECT * FROM brand_monitoring_alerts ORDER BY timestamp DESC;
   ```

## Troubleshooting

### Problem: Tables not created

**Solution:**
```sql
-- Check for errors
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Try creating manually
\i sql/create-brand-monitoring-tables.sql
```

### Problem: Permission denied in dashboard

**Solution:**
```sql
-- Verify admin user
SELECT id, email, role FROM users WHERE role = 'admin';

-- Update user to admin if needed
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### Problem: API calls failing

**Solution:**
1. Check console for error messages
2. Verify API keys in `.env.local`
3. Restart dev server after adding keys
4. Test API keys independently

## Next Steps

1. **Configure Automated Scans:** Set up cron jobs for periodic monitoring
2. **Set Up Alerts:** Configure email/push notifications for critical alerts
3. **Customize Thresholds:** Adjust severity levels based on your needs
4. **Add Webhooks:** Connect to external services for real-time monitoring

## API Integration Priority

If you can only set up some APIs, prioritize in this order:

1. **GitHub API** - Most critical for code protection
2. **WHOIS API** - Important for domain monitoring
3. **Google Search API** - Good for general monitoring
4. **Social Media APIs** - Nice to have for brand awareness
5. **Brand Monitoring Services** - Premium feature

## Security Checklist

- [ ] RLS policies enabled on both tables
- [ ] Only admin users can access monitoring dashboard
- [ ] API keys stored in `.env.local` (not committed to git)
- [ ] `.env.local` added to `.gitignore`
- [ ] Database backups configured
- [ ] Alert notification system configured

## Support

For help with setup:

**Email:** huntersest@gmail.com  
**Subject:** "Brand Monitoring Setup Help"

Include:
- Error messages (if any)
- Database version
- Steps you've completed
- What you're trying to accomplish

---

**Setup Time:** ~10 minutes (database only) to ~2 hours (with full API integration)

**Last Updated:** December 20, 2025
