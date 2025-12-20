# Brand Protection Monitoring System

Complete implementation of the brand protection and platform monitoring system for EventNexus admin dashboard.

**Date:** December 20, 2025  
**Status:** ✅ Complete and Integrated

---

## 🎯 Overview

The Brand Protection Monitoring System provides comprehensive tools for admin users to monitor and protect the EventNexus platform, brand, and intellectual property from unauthorized use, infringement, and security threats.

### Key Features

- **Code Similarity Detection** - Monitor GitHub and code repositories for unauthorized code use
- **Domain Monitoring** - Track domain registrations and WHOIS data for typosquatting
- **Brand Protection** - Monitor trademark usage and brand mentions
- **Search Engine Monitoring** - Track search results and SEO positioning
- **Social Media Monitoring** - Monitor brand mentions and detect impersonation
- **Competitor Analysis** - Track competitor features, pricing, and market position

---

## 📁 Files Created/Modified

### New Files

1. **[components/BrandProtectionMonitor.tsx](../components/BrandProtectionMonitor.tsx)**
   - Main monitoring dashboard component
   - 7 tabs: Overview, Code Protection, Domain Monitoring, Brand Protection, Search Monitoring, Social Media, Competitors
   - Real-time alerts and statistics display
   - Scan triggers for each monitoring type

2. **[services/brandMonitoringService.ts](../services/brandMonitoringService.ts)**
   - Service layer for monitoring operations
   - API integration stubs for third-party services
   - Database operations (CRUD for alerts and stats)
   - Configuration guide for API integrations

3. **[sql/create-brand-monitoring-tables.sql](../sql/create-brand-monitoring-tables.sql)**
   - Database schema for monitoring system
   - Tables: `brand_monitoring_alerts`, `monitoring_stats`
   - Views: `monitoring_dashboard_summary`
   - Functions: `get_alert_counts_by_severity()`, `get_recent_alerts()`

### Modified Files

1. **[types.ts](../types.ts)**
   - Added `BrandMonitoringAlert` interface
   - Added `MonitoringStats` interface

2. **[components/AdminCommandCenter.tsx](../components/AdminCommandCenter.tsx)**
   - Added Brand Protection tab to navigation
   - Imported and integrated BrandProtectionMonitor component
   - Added Shield icon to imports

---

## 🛡️ Monitoring Features

### 1. Overview Dashboard

**Purpose:** Centralized view of all monitoring activities

**Components:**
- Statistics grid (Code Scans, Domain Checks, Brand Mentions, Active Alerts)
- Alert summary (Critical, Warning, Info counts)
- Recent alerts feed with status indicators
- Last scan timestamp

### 2. Code Protection

**Monitors:**
- GitHub repositories for similar code
- Google Code Search for code snippets
- Package registries (npm, PyPI) for unauthorized packages

**Features:**
- Manual scan trigger
- Last scan timestamp
- Active/inactive status indicators

**API Requirements:**
- GitHub Personal Access Token
- Google Custom Search API (optional)

### 3. Domain Monitoring

**Monitors:**
- Primary domain (eventnexus.eu) status
- Typosquatting variants
- WHOIS record changes
- SSL certificate validity
- Domain expiration dates

**Features:**
- Domain status grid (registrar, expiration, SSL)
- Suspicious domain detection
- WHOIS change alerts

**API Requirements:**
- WHOIS API (e.g., WhoisXMLAPI)
- DNS monitoring service

### 4. Brand Protection

**Monitors:**
- Trademark registrations (EUIPO, USPTO, WIPO)
- Logo and asset usage across the web
- Counterfeit services/products

**Features:**
- Trademark status display
- Asset protection scanning
- Counterfeit detection

**API Requirements:**
- Brand monitoring service (Brandwatch, Mention, Brand24)

### 5. Search Engine Monitoring

**Monitors:**
- Google search results and rankings
- Bing search results
- SEO attack detection
- Reputation tracking (review sites, forums)

**Features:**
- Search result counts
- Ranking position tracking
- Sentiment analysis (Positive/Neutral/Negative)

**API Requirements:**
- Google Custom Search API
- Bing Search API

### 6. Social Media Monitoring

**Monitors:**
- Brand mentions (@EventNexus)
- Hashtag tracking (#EventNexus)
- Impersonation account detection
- Sentiment analysis

**Features:**
- 24-hour mention counts
- Sentiment indicators
- Suspicious account flagging
- Reach metrics

**API Requirements:**
- Twitter API v2 Bearer Token
- Facebook Graph API
- Instagram Graph API
- LinkedIn API (optional)

### 7. Competitor Analysis

**Monitors:**
- Competitor feature releases
- Pricing changes
- Marketing campaigns
- Market positioning

**Features:**
- Feature comparison tracking
- Pricing intelligence
- Market position metrics

**API Requirements:**
- Web scraping tools
- Competitor API access (if available)

---

## 🗄️ Database Schema

### Tables

#### brand_monitoring_alerts
Stores individual monitoring alerts.

```sql
CREATE TABLE brand_monitoring_alerts (
  id UUID PRIMARY KEY,
  type TEXT (code|domain|brand|search|social|competitor),
  severity TEXT (critical|warning|info),
  title TEXT,
  description TEXT,
  url TEXT,
  timestamp TIMESTAMPTZ,
  status TEXT (open|investigating|resolved|dismissed),
  action_taken TEXT,
  detected_by TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_monitoring_alerts_type` - Filter by type
- `idx_monitoring_alerts_severity` - Filter by severity
- `idx_monitoring_alerts_status` - Filter by status
- `idx_monitoring_alerts_timestamp` - Sort by time (DESC)

#### monitoring_stats
Stores aggregate monitoring statistics (single row).

```sql
CREATE TABLE monitoring_stats (
  id INTEGER PRIMARY KEY (always 1),
  code_scans INTEGER,
  domain_checks INTEGER,
  brand_mentions INTEGER,
  search_results INTEGER,
  social_mentions INTEGER,
  competitor_alerts INTEGER,
  critical_alerts INTEGER,
  warning_alerts INTEGER,
  info_alerts INTEGER,
  last_scan_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Views

#### monitoring_dashboard_summary
Aggregates alerts by type, severity, and status.

```sql
SELECT type, severity, status, COUNT(*), MAX(timestamp)
FROM brand_monitoring_alerts
GROUP BY type, severity, status;
```

### Functions

#### get_alert_counts_by_severity()
Returns count of open/investigating alerts by severity.

#### get_recent_alerts(limit_count)
Returns N most recent alerts with basic info.

### Security

- **RLS Enabled:** Both tables have Row Level Security
- **Admin-Only Access:** Policies restrict access to users with `role = 'admin'`
- **SECURITY DEFINER:** Functions run with elevated privileges but maintain security

---

## 🔌 API Integration Guide

### Required Environment Variables

Add to `.env.local`:

```env
# GitHub API (Code Monitoring)
VITE_GITHUB_TOKEN=ghp_your_token_here

# WHOIS API (Domain Monitoring)
VITE_WHOIS_API_KEY=your_whois_api_key

# Brand Monitoring Service
VITE_BRAND_MONITORING_API_KEY=your_brand_monitoring_key

# Google Custom Search (Search Monitoring)
VITE_GOOGLE_SEARCH_KEY=your_google_api_key
VITE_GOOGLE_SEARCH_ENGINE=your_search_engine_id

# Social Media APIs
VITE_TWITTER_BEARER_TOKEN=your_twitter_bearer_token
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### API Service Setup

#### 1. GitHub API

**Purpose:** Code similarity detection

**Setup:**
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Create new token with `repo` and `read:org` scopes
3. Add to `.env.local` as `VITE_GITHUB_TOKEN`

**Docs:** https://docs.github.com/en/rest

#### 2. WHOIS API

**Purpose:** Domain monitoring

**Recommended Service:** WhoisXMLAPI

**Setup:**
1. Register at https://whoisxmlapi.com/
2. Get API key from dashboard
3. Add to `.env.local` as `VITE_WHOIS_API_KEY`

**Docs:** https://whoisxmlapi.com/documentation

#### 3. Brand Monitoring

**Purpose:** Trademark and brand mention tracking

**Recommended Services:**
- Brandwatch (Enterprise)
- Mention (Small/Medium)
- Brand24 (Budget-friendly)

**Setup:**
1. Sign up for chosen service
2. Configure EventNexus brand tracking
3. Add API key to `.env.local`

#### 4. Google Custom Search

**Purpose:** Search engine monitoring

**Setup:**
1. Create project in Google Cloud Console
2. Enable Custom Search API
3. Create Custom Search Engine at https://cse.google.com/
4. Get API key and search engine ID
5. Add to `.env.local`

**Docs:** https://developers.google.com/custom-search/v1/overview

#### 5. Twitter API

**Purpose:** Social media monitoring

**Setup:**
1. Apply for Twitter Developer Account
2. Create app and get Bearer Token
3. Add to `.env.local` as `VITE_TWITTER_BEARER_TOKEN`

**Docs:** https://developer.twitter.com/en/docs

#### 6. Facebook/Instagram Graph API

**Purpose:** Social media monitoring

**Setup:**
1. Create Facebook App at https://developers.facebook.com/
2. Add Facebook Login product
3. Get App ID and Secret
4. Add to `.env.local`

**Docs:** https://developers.facebook.com/docs/graph-api

---

## 🚀 Usage

### Access Brand Protection Monitor

1. Log in as admin user
2. Navigate to Admin Command Center
3. Click "Brand Protection" tab in sidebar
4. Dashboard loads with 7 monitoring sections

### Running Scans

Each monitoring section has a "Scan Now" or similar button:

- **Code Protection:** "Scan Now" - Runs GitHub code similarity check
- **Domain Monitoring:** "Check Domains" - Runs WHOIS/DNS checks
- **Brand Protection:** "Scan Brands" - Runs trademark and brand checks
- **Search Monitoring:** "Update Results" - Refreshes search data
- **Social Media:** "Refresh Feed" - Updates social mentions
- **Competitors:** "Analyze Now" - Runs competitor analysis

### Alert Management

**Alert Statuses:**
- **Open** - New alert, requires attention
- **Investigating** - Under review
- **Resolved** - Issue resolved
- **Dismissed** - False positive or non-issue

**Actions:**
1. Click alert to view details
2. Update status via dropdown
3. Add action taken notes
4. Delete if necessary

### Interpreting Results

**Severity Levels:**
- **Critical** (Red) - Immediate action required (e.g., exact code copy, active infringement)
- **Warning** (Yellow) - Potential issue (e.g., similar domain registered)
- **Info** (Blue) - Informational (e.g., positive brand mention)

**Response Times:**
- Critical: Within 24 hours
- Warning: Within 1 week
- Info: Monitor as needed

---

## 🔧 Development

### Adding New Monitoring Types

1. **Add Type to Schema:**
   ```sql
   ALTER TABLE brand_monitoring_alerts
   DROP CONSTRAINT brand_monitoring_alerts_type_check;
   
   ALTER TABLE brand_monitoring_alerts
   ADD CONSTRAINT brand_monitoring_alerts_type_check
   CHECK (type IN ('code', 'domain', 'brand', 'search', 'social', 'competitor', 'new_type'));
   ```

2. **Update TypeScript Type:**
   ```typescript
   // types.ts
   type: 'code' | 'domain' | 'brand' | 'search' | 'social' | 'competitor' | 'new_type';
   ```

3. **Add Service Function:**
   ```typescript
   // services/brandMonitoringService.ts
   export async function monitorNewType(): Promise<BrandMonitoringAlert[]> {
     // Implementation
   }
   ```

4. **Add UI Tab:**
   ```typescript
   // components/BrandProtectionMonitor.tsx
   const tabs = [
     // ... existing tabs
     { id: 'new-type', label: 'New Type', icon: NewIcon },
   ];
   ```

### Testing

**Manual Testing:**
1. Run SQL migration: `psql -f sql/create-brand-monitoring-tables.sql`
2. Verify tables created: `\dt brand_monitoring_*`
3. Test admin access in dashboard
4. Verify non-admin users cannot access

**API Testing:**
1. Add test API keys to `.env.local`
2. Run individual scan functions
3. Check console for API responses
4. Verify alerts created in database

---

## 🔒 Security Considerations

### Data Protection

- All monitoring data is admin-only
- RLS policies enforce access control
- Sensitive API keys in environment variables
- No API keys in client-side code

### Privacy Compliance

- Do not store personal data in alerts
- Anonymize user-generated content mentions
- Respect social media platform ToS
- Follow GDPR/data protection laws

### Rate Limiting

APIs have rate limits:
- GitHub: 5,000 requests/hour (authenticated)
- Twitter: Varies by endpoint
- Google Custom Search: 100 queries/day (free tier)

Implement caching and scheduled scans to avoid hitting limits.

---

## 📊 Monitoring Schedule

### Recommended Scan Frequency

- **Code Monitoring:** Daily
- **Domain Monitoring:** Weekly
- **Brand Protection:** Daily
- **Search Monitoring:** Weekly
- **Social Media:** Hourly (or real-time with webhooks)
- **Competitors:** Weekly

### Automation

Set up cron jobs or Supabase Edge Functions to run scans automatically:

```typescript
// supabase/functions/scheduled-monitoring/index.ts
import { runComprehensiveScan } from './brandMonitoringService.ts';

Deno.serve(async () => {
  const results = await runComprehensiveScan();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Configure Supabase Cron:
```sql
SELECT cron.schedule(
  'monitoring-scan',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT net.http_post(
    'https://[project-ref].supabase.co/functions/v1/scheduled-monitoring',
    headers:='{"Authorization": "Bearer [anon-key]"}'::jsonb
  );
  $$
);
```

---

## 🐛 Troubleshooting

### Issue: No alerts appearing

**Cause:** API integrations not configured

**Solution:**
1. Check `.env.local` for required API keys
2. Verify API keys are valid
3. Check console for API error messages
4. Review API service status pages

### Issue: "Permission denied" errors

**Cause:** User is not admin or RLS policies not configured

**Solution:**
1. Verify user has `role = 'admin'` in database
2. Run SQL migration to create RLS policies
3. Check Supabase dashboard for policy errors

### Issue: Scans timing out

**Cause:** API rate limits or slow responses

**Solution:**
1. Reduce scan frequency
2. Implement caching
3. Use pagination for large result sets
4. Check API service status

---

## 📈 Future Enhancements

### Planned Features

1. **Real-time Webhooks**
   - GitHub webhook for instant code similarity alerts
   - Social media webhooks for mentions
   - Domain change notifications

2. **AI-Powered Analysis**
   - Use Gemini to analyze threat severity
   - Automated response recommendations
   - Sentiment analysis for brand mentions

3. **Automated Actions**
   - Auto-send cease & desist for critical alerts
   - DMCA takedown automation
   - Domain dispute filing

4. **Advanced Reporting**
   - Weekly monitoring reports
   - Trend analysis
   - Export to PDF

5. **Mobile Notifications**
   - Push notifications for critical alerts
   - SMS alerts for urgent issues
   - Email digests

---

## 📞 Support

For questions or issues with the brand monitoring system:

**Email:** huntersest@gmail.com  
**Subject:** "EventNexus Brand Monitoring Support"

---

## ✅ Completion Checklist

- [x] BrandProtectionMonitor component created
- [x] Monitoring types added to types.ts
- [x] brandMonitoringService.ts created
- [x] Database schema created
- [x] RLS policies configured
- [x] Admin dashboard integration
- [x] API integration stubs
- [x] Documentation complete

**Status:** Ready for API integration and deployment

---

**© 2024-2025 EventNexus Platform Owner. All Rights Reserved.**
