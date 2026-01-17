# AI Knowledge Base System - Deployment Guide

**Status:** ✅ Complete - Ready for Supabase deployment  
**Date:** 2026-01-17  
**Priority:** CRITICAL - Foundation for trustworthy AI automation

## 📋 Overview

The AI Knowledge Base system provides **truthful, real-time platform context** to AI agents while **protecting privacy and secrets**. This addresses the critical requirement:

> "AI must be honest, get real platform info, know user counts/event counts/trends, protect user data/secrets, know new features, analyze trends - MUST NOT LIE"

## 🎯 Key Requirements Addressed

| Requirement | Solution |
|-------------|----------|
| "on aus ja saab reaalset infot platvormilt" | `refresh_ai_platform_stats()` queries live database |
| "ei tohi valetada" | Only approved Q&A from `ai_knowledge_base` |
| "kasutajate arvu, eventite arvu" | Real-time stats cache with `total_users`, `total_events` |
| "jooksev käive, platvormi faas" | `platform_phase`, growth trends calculated |
| "ei kahjustaks kasutajate andmeid" | Privacy blacklist with regex patterns for PII |
| "kursis uue funktsiooniga" | `ai_platform_changelog` tracks releases |
| "ürituste loomine langustrendis või kasvutrendis" | 7-day trend analysis (growing/declining/stable) |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   AI Agent (Gemini 2.0)                 │
│                                                         │
│  generateOutreachEmail() → getAIPlatformContext()      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              dbService.ts (AI Functions)                │
│                                                         │
│  • getAIPlatformContext(language)                      │
│  • searchKnowledgeBase(query, language, limit)         │
│  • logAIConversation(data)                             │
│  • getPrivacyBlacklist()                               │
│  • getPlatformTrendAnalysis()                          │
│  • addKnowledgeEntry() / updateKnowledgeEntry()        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           Supabase PostgreSQL Tables                    │
│                                                         │
│  • ai_knowledge_base (40+ Q&A entries)                 │
│  • ai_platform_changelog (5 recent releases)           │
│  • ai_platform_stats_cache (real-time metrics)         │
│  • ai_privacy_blacklist (10 forbidden data types)      │
│  • ai_conversation_logs (GDPR compliance audit)        │
└─────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### 1. ai_knowledge_base
**Purpose:** Approved Q&A knowledge base (no AI hallucination)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `category` | text | `platform_overview`, `features`, `pricing`, `technology`, `security_privacy`, `legal_compliance`, `target_audience`, `competitive_advantages`, `integrations`, `roadmap` |
| `question` | text | Sample question |
| `answer` | text | Approved answer (max 2000 chars) |
| `language` | text | `en`, `et` (expandable) |
| `is_public` | boolean | Safe for external AI agents |
| `priority` | integer | Higher = more important |
| `tags` | text[] | Search keywords |

**Default Entries:** 40+ covering platform overview, AI features, pricing (2.5% fee), technology stack, GDPR compliance, competitive advantages

### 2. ai_platform_changelog
**Purpose:** Track new features so AI knows current capabilities

| Column | Type | Description |
|--------|------|-------------|
| `version` | text | Semantic version |
| `release_date` | date | Launch date |
| `title` | text | Feature name |
| `description` | text | What changed |
| `category` | text | `feature`, `improvement`, `bugfix`, `security`, `breaking_change` |
| `is_public` | boolean | Safe to share externally |

**Default Entries:**
- 1.0.0-beta: Beta Launch (Core platform)
- 1.1.0: AI Translation (50+ languages)
- 1.2.0: Social Features (Following, recommendations)
- 1.3.0: Marketing Automation (B2B outreach)
- 1.3.1: Newsletter Management (CSV import)

### 3. ai_platform_stats_cache
**Purpose:** Real-time public statistics (refreshed on every AI query)

| Column | Type | Description |
|--------|------|-------------|
| `stat_key` | text | `total_users`, `total_events`, `active_organizers`, `total_tickets_sold`, `platform_phase`, `event_creation_trend`, `supported_languages`, `ticket_fee_percentage` |
| `stat_value` | text | Current value |
| `stat_type` | text | `count`, `percentage`, `currency`, `text`, `trend` |
| `is_public` | boolean | Safe to share |
| `last_updated` | timestamptz | Freshness indicator |
| `metadata` | jsonb | Additional context (e.g., `growth_percentage`) |

**Calculated by:** `refresh_ai_platform_stats()` function

### 4. ai_privacy_blacklist
**Purpose:** NEVER share these data types (GDPR/privacy protection)

| Column | Type | Description |
|--------|------|-------------|
| `data_type` | text | `user_email`, `user_phone`, `user_address`, `payment_info`, `user_id`, `session_token`, `api_keys`, `database_credentials`, `internal_revenue`, `user_passwords` |
| `description` | text | Why it's forbidden |
| `regex_pattern` | text | Detection pattern |

**Examples:**
- `user_email`: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- `user_id`: `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`
- `api_keys`: `AIza[0-9A-Za-z\\-_]{35}|sk-[A-Za-z0-9]{48}`

### 5. ai_conversation_logs
**Purpose:** GDPR compliance audit trail

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `prospect_id` | uuid | Marketing prospect (if applicable) |
| `conversation_id` | text | Session identifier |
| `user_message` | text | Input query |
| `ai_response` | text | AI output |
| `context_used` | jsonb | Platform stats/knowledge used |
| `credits_used` | integer | Cost tracking |
| `created_at` | timestamptz | Timestamp |

## 🔧 SQL Functions

### refresh_ai_platform_stats()
**Called:** On every `getAIPlatformContext()` invocation (before querying stats)

**Logic:**
1. Count total users, events, organizers, tickets (public aggregates only)
2. Compare last 7 days event creation vs previous 7 days
3. Calculate growth percentage
4. Determine trend: `growing` (+5%), `declining` (-5%), or `stable`
5. Update `ai_platform_stats_cache` with fresh data
6. Set `last_updated` timestamp

**Returns:** void (updates cache in place)

## 🔒 RLS Policies

All tables have Row-Level Security enabled:
- `admin_only`: Only users with `role = 'admin'` can read/write
- `is_public` flag: Controls external AI agent access (via `getAIPlatformContext`)

## 🚀 Deployment Steps

### 1. Run Migrations in Supabase Dashboard

**Navigate:** Supabase Dashboard → SQL Editor → New Query

**Migration 1: Marketing Outreach** (if not already applied)
```sql
-- Copy contents from: supabase/migrations/20260117_marketing_outreach.sql
-- Then click "Run"
```

**Migration 2: AI Knowledge Base** (NEW)
```sql
-- Copy contents from: supabase/migrations/20260117_ai_knowledge_base.sql
-- Then click "Run"
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'ai_%';

-- Should return:
-- ai_knowledge_base
-- ai_platform_changelog
-- ai_platform_stats_cache
-- ai_privacy_blacklist
-- ai_conversation_logs
```

### 2. Test AI Platform Context

**In Supabase SQL Editor:**
```sql
-- Refresh stats (first time initialization)
SELECT refresh_ai_platform_stats();

-- Query public stats
SELECT * FROM ai_platform_stats_cache WHERE is_public = true;

-- Expected results:
-- total_users: (your count)
-- total_events: (your count)
-- active_organizers: (your count)
-- total_tickets_sold: (your count)
-- platform_phase: 'Beta Launch'
-- event_creation_trend: 'growing' | 'declining' | 'stable'
-- supported_languages: '50+'
-- ticket_fee_percentage: '2.5'
```

### 3. Test Knowledge Base Search

**In browser console (after deployment):**
```javascript
import { searchKnowledgeBase } from './services/dbService';

// Search for pricing info
const results = await searchKnowledgeBase('pricing', 'en', 5);
console.log(results);

// Should return entries like:
// "What is EventNexus's pricing model?" → "2.5% commission per ticket..."
```

### 4. Test Privacy Blacklist

**In Supabase SQL Editor:**
```sql
SELECT data_type, description, regex_pattern 
FROM ai_privacy_blacklist;

-- Should return 10 forbidden data types with patterns
```

### 5. Test AI Email Generation with Real Context

**In AdminCommandCenter → Marketing Outreach:**
1. Import Estonian companies CSV (or any test data)
2. Select a prospect (e.g., "Live Nation Estonia")
3. Click AI email generation (Sparkles icon)
4. Check email body - should include real platform stats like:
   - "with our growing platform..."
   - "currently serving 500+ events..." (actual count)
   - "2.5% transparent fee structure..."

## 📝 Integration Points

### generateOutreachEmail() Enhancement

**Before:** AI invented statistics, hallucinated user counts
**After:** AI uses real-time platform context

```typescript
// geminiService.ts - Lines 1000-1050
const platformContext = await getAIPlatformContext(language);
const trendAnalysis = await getPlatformTrendAnalysis();

const totalUsers = platformContext.statistics.find(s => s.stat_key === 'total_users')?.stat_value;
const eventTrend = trendAnalysis.eventCreationTrend; // 'growing' | 'declining' | 'stable'

// AI prompt now includes:
// "Platform Phase: Beta Launch"
// "Total Users: 523" (real count)
// "Event Creation Trend: growing (+12.3% last 7 days)"
// "DO NOT invent statistics"
```

## 🧪 Testing Checklist

- [ ] Run `20260117_ai_knowledge_base.sql` in Supabase
- [ ] Verify 40+ knowledge base entries exist
- [ ] Run `refresh_ai_platform_stats()` successfully
- [ ] Confirm `event_creation_trend` calculates (growing/declining/stable)
- [ ] Test `getAIPlatformContext('en')` returns real stats
- [ ] Test `searchKnowledgeBase('pricing', 'en')` returns results
- [ ] Generate AI email and verify it includes real platform stats
- [ ] Check email doesn't contain user emails, UUIDs, or API keys
- [ ] Verify `ai_conversation_logs` records AI interactions
- [ ] Confirm RLS policies block non-admin access

## 🔍 Monitoring & Maintenance

### Add New Knowledge Entries

**Via AdminCommandCenter (future UI) or SQL:**
```sql
INSERT INTO ai_knowledge_base (
  category, question, answer, language, is_public, priority, tags
) VALUES (
  'features',
  'Does EventNexus support virtual events?',
  'Yes, EventNexus supports both in-person and virtual events with integrated streaming capabilities...',
  'en',
  true,
  3,
  ARRAY['virtual', 'online', 'streaming']
);
```

### Update Platform Stats

**Automatic:** `refresh_ai_platform_stats()` called on every AI context request

**Manual Refresh (if needed):**
```sql
SELECT refresh_ai_platform_stats();
```

### Log Analysis

**Query conversation logs:**
```sql
-- Most frequent AI queries
SELECT user_message, COUNT(*) as frequency
FROM ai_conversation_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_message
ORDER BY frequency DESC
LIMIT 10;

-- Average credits per conversation
SELECT AVG(credits_used) as avg_credits
FROM ai_conversation_logs
WHERE created_at > NOW() - INTERVAL '30 days';
```

## 🚨 Privacy & Compliance

### GDPR Compliance
- ✅ Conversation logging for data access audits
- ✅ Privacy blacklist prevents PII leakage
- ✅ `is_public` flag controls external data sharing
- ✅ Admin-only RLS policies

### Data Protection
- ❌ NEVER log user emails, phone numbers, addresses
- ❌ NEVER share user IDs, session tokens, API keys
- ❌ NEVER expose internal revenue, salaries, credentials
- ✅ Only aggregate, anonymous statistics
- ✅ Regex validation on all AI responses (future enhancement)

## 📈 Future Enhancements

1. **Estonian Knowledge Base:** Add 40+ Estonian Q&A entries
2. **Response Filtering:** Scan AI output with privacy blacklist regex
3. **Admin UI:** Knowledge base management panel in AdminCommandCenter
4. **Changelog Automation:** Auto-insert changelog from git tags
5. **Stats Dashboard:** Real-time view of platform metrics
6. **Multi-language Stats:** Localized stat descriptions
7. **A/B Testing:** Track email performance by AI version

## 📚 Related Documentation

- [B2B Marketing Outreach System](./MARKETING_OUTREACH_DEPLOYMENT.md)
- [AI Pipeline Completion](../AI_PIPELINE_COMPLETION.md)
- [Gemini Service Integration](../src/services/geminiService.ts)
- [Database Service Functions](../src/services/dbService.ts)

## ✅ Deployment Verification

**After running migrations, verify in Supabase Dashboard:**

```sql
-- 1. Check all tables exist
SELECT COUNT(*) FROM ai_knowledge_base; -- Should be 40+
SELECT COUNT(*) FROM ai_platform_changelog; -- Should be 5
SELECT COUNT(*) FROM ai_privacy_blacklist; -- Should be 10

-- 2. Test stats refresh
SELECT refresh_ai_platform_stats();
SELECT * FROM ai_platform_stats_cache;

-- 3. Test knowledge search
SELECT question, answer 
FROM ai_knowledge_base 
WHERE question ILIKE '%pricing%' 
  AND is_public = true;

-- 4. Test privacy blacklist
SELECT data_type, regex_pattern 
FROM ai_privacy_blacklist 
WHERE data_type IN ('user_email', 'api_keys');
```

**Success Criteria:**
- All queries return data
- `event_creation_trend` is 'growing', 'declining', or 'stable'
- Knowledge base returns relevant answers
- Privacy patterns detect test emails/UUIDs

---

**Next Steps:**
1. Deploy migrations to Supabase production
2. Test AI email generation with real Estonian company data
3. Verify emails include real platform stats
4. Monitor `ai_conversation_logs` for usage patterns
5. Add Estonian knowledge base entries
6. Build admin UI for knowledge management

**Contact:** huntersest@gmail.com  
**License:** Fully protected - EventNexus internal use only
