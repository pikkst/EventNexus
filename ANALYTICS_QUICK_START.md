# Analytics Dashboard Setup Guide

## Quick Start - 15 Minutes

Olete loonud kompleksse analytics dashboardi, mis integreerib Google Analytics, Meta API ja SEO tööriistad. Siin on samm-sammult juhend, kuidas see aktiveerida.

---

## ✅ VALMIS (Already Implemented)

### Frontend
- ✅ AnalyticsDashboard.tsx komponenti
- ✅ analyticsApiService.ts koos kõigi data fetcheritega
- ✅ Integreeritud AdminCommandCenter'isse
- ✅ 5 vahekaart: Overview, Traffic, Conversions, Meta Ads, SEO Tools
- ✅ Recharts visualiseeringud
- ✅ Mock data arenduseks

### Backend Templates
- ✅ 3 Edge Function malli (analytics-bridge, meta-insights-bridge, seo-metrics-bridge)
- ✅ API endpoint spetsifikatsioonid
- ✅ Dokumentatsioon

---

## 🛠️ TEGEMIST VAJAVAD SAMMUD (Your To-Do List)

### 1. Google Analytics Setup (Priority: HIGH)

#### A. Google Cloud Project
```bash
# 1. Minge https://console.cloud.google.com
# 2. Looge uus projekt nimega "EventNexus Analytics"
# 3. Aktiveerige Google Analytics Reporting API v4
# 4. Looge Service Account:
#    - IAM & Admin > Service Accounts
#    - Uus konto: eventnexus-analytics
#    - Lisa roll: Analytics Viewer
#    - Looge JSON võti
```

#### B. Environment Variables
```bash
# Lisage .env.local'i:
VITE_GA_MEASUREMENT_ID=G-JD7P5ZKF4L
GA_PROPERTY_ID=YOUR_PROPERTY_ID_HERE

# Supabase secretid (supabase secrets set):
GA_SERVICE_ACCOUNT_JSON=$(cat ~/Downloads/service-account.json)
GA_VIEW_ID=YOUR_VIEW_ID_HERE
```

#### C. Backend Endpoint Implementation
```typescript
// Asendage supabase/functions/analytics-bridge/index.ts
// Real Google Analytics API kutsega:

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const client = new BetaAnalyticsDataClient({
  credentials: JSON.parse(Deno.env.get("GA_SERVICE_ACCOUNT_JSON") || "{}"),
});

const response = await client.runReport({
  property: `properties/${Deno.env.get("GA_PROPERTY_ID")}`,
  dateRanges: [{ startDate: startDate, endDate: endDate }],
  metrics: [
    { name: "activeUsers" },
    { name: "sessions" },
    { name: "screenPageViews" },
    { name: "bounceRate" }
  ],
  dimensions: [{ name: "date" }]
});
```

---

### 2. Meta Business API Setup (Priority: HIGH)

#### A. Get Meta Access Token
```bash
# 1. Logige sisse https://business.facebook.com
# 2. Business Settings > Accounts > Pages
# 3. Leidke oma lehekülg ja kopeerige Page ID
# 4. Tools > Business Integrations > Apps and Assets
# 5. Looge uus app (Business type)
# 6. Lisage Facebook Marketing API
# 7. Looge long-lived page access token
```

#### B. Environment Variables
```bash
# Lisage .env.local'i:
VITE_META_PIXEL_ID=843922238425309

# Supabase secretid:
META_PAGE_TOKEN=your_long_lived_page_token_here
META_AD_ACCOUNT_ID=act_YOUR_ACCOUNT_ID_HERE
META_BUSINESS_ACCOUNT_ID=YOUR_BUSINESS_ID_HERE
```

#### C. Backend Endpoint Implementation
```typescript
// Asendage supabase/functions/meta-insights-bridge/index.ts

const accessToken = Deno.env.get("META_PAGE_TOKEN");
const pageId = "YOUR_PAGE_ID";

const response = await fetch(
  `https://graph.instagram.com/${pageId}/insights?metric=impressions,engagement_rate,reach&access_token=${accessToken}`
);

const data = await response.json();
```

---

### 3. Google Search Console Setup (Priority: MEDIUM)

#### A. Verify Domain
```bash
# 1. Minge https://search.google.com/search-console
# 2. Lisage omand: https://www.eventnexus.eu
# 3. Verifitseerige DNS-i kaudu
# 4. Oodake 24-48 tundi indexeeringu jaoks
```

#### B. Get Service Account Access
```bash
# Kasutage sama Google Cloud Service Accounti nagu GA:
# - Andke sellele Analytics Admin roll
# - Verifitseerige site delegeeringu kaudu
```

#### C. Backend Endpoint Implementation
```typescript
// Asendage supabase/functions/seo-metrics-bridge/index.ts

import { SearchConsoleClient } from "@google-analytics/search-console";

const client = new SearchConsoleClient({
  credentials: JSON.parse(Deno.env.get("GA_SERVICE_ACCOUNT_JSON") || "{}"),
});

const response = await client.searchanalytics.query({
  siteUrl: "https://www.eventnexus.eu",
  requestBody: {
    startDate: startDate,
    endDate: endDate,
    dimensions: ["query", "page", "country"],
    rowLimit: 50
  }
});
```

---

### 4. Deploy Edge Functions

```bash
# Kontrolli, et funktsioonid on olemas:
ls -la supabase/functions/

# Seadistage .env.local Supabase secrets'ga:
supabase secrets set GA_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/service-account.json)"
supabase secrets set META_PAGE_TOKEN=your_token_here
supabase secrets set META_AD_ACCOUNT_ID=act_xxx_here

# Deploy funktsioonid:
supabase functions deploy analytics-bridge
supabase functions deploy meta-insights-bridge
supabase functions deploy seo-metrics-bridge

# Kontrollige juurutust:
supabase functions list
```

---

### 5. Testing

```typescript
// Test in Browser DevTools:

// 1. Test GA endpoint
fetch('http://localhost:54321/functions/v1/analytics-bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    metricType: 'traffic',
    days: 30,
    timezone: 'UTC'
  })
}).then(r => r.json()).then(console.log);

// 2. Test Meta endpoint
fetch('http://localhost:54321/functions/v1/meta-insights-bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'facebook',
    period: 'day'
  })
}).then(r => r.json()).then(console.log);

// 3. Test SEO endpoint
fetch('http://localhost:54321/functions/v1/seo-metrics-bridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '',
    limit: 50,
    startDate: '2025-11-26',
    endDate: '2025-12-26'
  })
}).then(r => r.json()).then(console.log);
```

---

## 📊 How to Use Analytics Dashboard

1. **Login as Admin**: `https://www.eventnexus.eu/#/admin`
2. **Navigate**: Sidebar → "GA & Meta Analytics"
3. **Select Date Range**: Choose 7, 30, 90 days or 1 year
4. **View Tabs**:
   - **Overview**: High-level metrics and trends
   - **Traffic**: Detailed user and session data
   - **Conversions**: Funnel visualization and conversion rates
   - **Meta Ads**: Facebook and Instagram campaign performance
   - **SEO Tools**: Keyword rankings and optimization tips

---

## 🚀 Production Deployment Checklist

- [ ] Google Analytics API credentials configured
- [ ] Meta Business API access token obtained
- [ ] Google Search Console verified
- [ ] Edge Functions deployed to production
- [ ] Environment variables set in Vercel/Netlify
- [ ] Analytics dashboard tested with real data
- [ ] SEO recommendations reviewed
- [ ] Meta Pixel events firing (20-30 min wait)
- [ ] Data privacy/GDPR compliance reviewed

---

## 📈 Expected Results Timeline

### Week 1
- ✅ Dashboard shows real GA data
- ✅ Meta insights visible
- ✅ SEO keywords tracked

### Week 2-4
- ✅ Trends become visible
- ✅ Patterns emerge
- ✅ Actionable recommendations available

### Month 1+
- ✅ Use insights for optimization
- ✅ A/B test improvements
- ✅ Measure impact on conversions

---

## 🔧 Troubleshooting

### GA Data Not Loading
```
Error: 403 Unauthorized
Solution: Check Service Account has Analytics Viewer role

Error: Property not found
Solution: Verify GA_PROPERTY_ID matches your Google Analytics property

Error: CORS error
Solution: Ensure Edge Function is deployed and CORS headers are set
```

### Meta Insights Empty
```
Error: Invalid access token
Solution: Generate new long-lived page token, max 60 days

Error: No ads running
Solution: Ensure ad account has active campaigns

Error: Missing permissions
Solution: Regenerate token with: 
  - ads_management
  - pages_manage_metadata
  - instagram_basic
```

### SEO Metrics Missing
```
Error: Site not verified in Search Console
Solution: Wait 24-48 hours for verification, then re-check

Error: Insufficient data
Solution: Ensure property has at least 100 search impressions

Error: Invalid date range
Solution: Check dates are in YYYY-MM-DD format
```

---

## 📚 Resources

- [Google Analytics API Docs](https://developers.google.com/analytics/devguides/reporting/core/v4)
- [Meta Business API](https://developers.facebook.com/docs/marketing-api)
- [Search Console API](https://developers.google.com/webmaster-tools)
- [Dashboard Code](components/AnalyticsDashboard.tsx)
- [Full Setup Guide](docs/ANALYTICS_DASHBOARD_SEO_SETUP.md)

---

## 💡 Next Steps (After Integration)

1. **Set Up Alerts**: Notify when metrics drop >10%
2. **Create Reports**: Auto-generate weekly/monthly summaries
3. **Build Automations**: Auto-adjust bids based on ROAS
4. **Expand Events**: Add more Meta Pixel events (Lead, Purchase, AddToCart)
5. **Competitor Analysis**: Monitor competitor keywords and ads

---

**Questions?** Contact: huntersest@gmail.com  
**Docs**: `/workspaces/EventNexus/docs/ANALYTICS_DASHBOARD_SEO_SETUP.md`  
**Status**: ✅ Production Ready (Backend integration pending)

---

**Last Updated**: December 26, 2025  
**Commit**: b59b783
