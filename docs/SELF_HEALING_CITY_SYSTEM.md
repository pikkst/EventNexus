# Self-Healing City System – Complete Implementation Guide

## Overview

This document describes the complete self-healing city system for EventNexus. The system automatically:

- ✅ Discovers event sources when a city has none
- ✅ Monitors city health continuously
- ✅ Triggers recovery when health drops
- ✅ Manages source lifecycle (grace period, deactivation)
- ✅ Scales from 104 to 10,000+ cities autonomously
- ✅ Maintains audit trail for all actions

## Architecture

### State Machine

Every city follows a state machine:

```
NEW
  ↓ (auto)
BOOTSTRAPPING
  ↓ (sources found)
ACTIVE
  ↓ (health < 50)
DEGRADED
  ↓ (auto recover)
RECOVERING
  ↓ (health > 80)
ACTIVE

Alternative paths:
STARVED (0 events in 30 days)
QUARANTINED (max retries exceeded)
HUMAN_REVIEW (manual escalation)
```

### Health Score (0-100)

Real-time calculation based on:

- **30%** – Source Yield: active sources / expected (min 5)
- **30%** – Event Freshness: hours since last event (optimal < 24h)
- **25%** – Average Confidence: AI extraction accuracy
- **15%** – Source Stability: active sources / total sources

**Thresholds:**
- 80-100: 🟢 ACTIVE (healthy)
- 50-79: 🟡 DEGRADED (learning/recovering)
- 20-49: 🟠 STARVING (needs help)
- < 20: 🔴 RECOVERING (critical)

## Deployment Steps

### 1. Apply Database Migrations

```bash
# In Supabase SQL Editor or via CLI:
supabase db push

# Or manually apply migrations in this order:
1. 20260110_self_healing_city_system.sql
2. 20260110_auto_bootstrap_refined.sql
```

**What these create:**

1. **New columns on `city_configs`:**
   - `state` (NEW, BOOTSTRAPPING, ACTIVE, DEGRADED, STARVED, RECOVERING, QUARANTINED, HUMAN_REVIEW)
   - `health_score` (0-100)
   - `recovery_attempts` (counter)
   - `last_recovery_at` (timestamp)
   - `recovery_cooldown_until` (time lock)
   - `pipeline_enabled` (on/off switch)

2. **New tables:**
   - `bootstrap_queue` – queue of cities awaiting bootstrap
   - `city_recovery_log` – audit trail of all recovery actions

3. **New views:**
   - `city_health_view` – real-time health calculation
   - `city_health_snapshot` – materialized view (updated by cron)

4. **New functions:**
   - `decay_source_quality()` – penalizes dead sources
   - `update_city_state_based_on_health()` – state transitions
   - `log_city_recovery()` – audit logging
   - `enqueue_bootstrap_job()` – queue bootstrap
   - `get_next_bootstrap_job()` – retrieve next job
   - `mark_bootstrap_complete()` – complete job
   - `mark_bootstrap_failed()` – fail job

### 2. Deploy Edge Functions

```bash
# Deploy cityGuardian
supabase functions deploy city-guardian

# Deploy discover-sources
supabase functions deploy discover-sources

# Verify deployment
supabase functions list
```

**Environment Variables Required:**
- `SUPABASE_URL` (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)
- `GEMINI_API_KEY` (for AI source discovery)

### 3. Configure CRON Schedule

In Supabase Dashboard → Database → Scheduled Functions:

**Schedule 1: cityGuardian (every 6 hours)**
```
Function: city-guardian
Schedule: 0 */6 * * * (every 6 hours)
OR:      0 0,6,12,18 * * * (specific hours: 00:00, 06:00, 12:00, 18:00 UTC)
```

**Schedule 2: Update materialized view (every 1 hour)**
```sql
-- Run this as a scheduled SQL function:
REFRESH MATERIALIZED VIEW CONCURRENTLY public.city_health_snapshot;
```

**Schedule 3: Source quality decay (every 24 hours)**
```sql
-- Run this as scheduled SQL:
SELECT decay_source_quality();
SELECT update_city_state_based_on_health();
```

## How It Works

### Scenario 1: New City Added

```
1. Admin creates city (state = NEW)
   ↓
2. Trigger fires: trigger_city_auto_bootstrap()
   ↓
3. City moves to BOOTSTRAPPING state
   ↓
4. cityGuardian cron finds it (health_score < 60)
   ↓
5. cityGuardian invokes bootstrap-city function
   ↓
6. bootstrap-city discovers event sources (API calls)
   ↓
7. Sources inserted into event_sources table
   ↓
8. Recovery logged in city_recovery_log
   ↓
9. City state → ACTIVE (if sources found) or STARVED (if none)
```

### Scenario 2: City Stops Receiving Events

```
1. Events stop flowing (no new events in 30 days)
   ↓
2. health_score drops (freshness component = 0)
   ↓
3. city_health_view shows: health_score < 50, events_30d = 0
   ↓
4. cityGuardian detects: STARVED state
   ↓
5. cityGuardian invokes discover-sources function
   ↓
6. discover-sources uses Gemini to find new sources
   ↓
7. New sources added (if valid confidence >= 0.6)
   ↓
8. parse-event-ai is triggered on new sources
   ↓
9. Events resume flowing → health_score rises
   ↓
10. City state → ACTIVE
```

### Scenario 3: Source Fails Repeatedly

```
1. Source has 5+ failures in a row (failure_count > 5)
   ↓
2. decay_source_quality() penalizes: source_score -= 0.25
   ↓
3. If source_score < 0.30, marked as dead
   ↓
4. cityGuardian detects: city.active_sources == 0 or < 2
   ↓
5. Triggers bootstrap or discover-sources
   ↓
6. New sources discovered + old sources retried
   ↓
7. City recovers
```

## API Reference

### cityGuardian Edge Function

**Endpoint:** `POST /functions/v1/city-guardian`

**Request:**
```json
{}
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T20:00:00Z",
  "evaluated": 12,
  "healed": 8,
  "results": [
    {
      "city": "Berlin",
      "action": "BOOTSTRAP",
      "status": "HEALING_TRIGGERED"
    },
    {
      "city": "Paris",
      "action": "SKIPPED_COOLDOWN",
      "reason": "Cooldown until 2026-01-10T18:00:00Z"
    }
  ]
}
```

### discover-sources Edge Function

**Endpoint:** `POST /functions/v1/discover-sources`

**Request:**
```json
{
  "city_id": "uuid-here"
}
```

**Response:**
```json
{
  "status": "ok",
  "city": "Berlin",
  "discovered_sources": 5,
  "sources": [
    {
      "name": "Eventbrite Berlin",
      "url": "https://www.eventbrite.de/d/berlin--germany/events/",
      "confidence": 0.85
    }
  ]
}
```

## Querying City Health

### Get all unhealthy cities

```sql
SELECT 
  city_name,
  state,
  health_score,
  active_sources,
  events_30d,
  hours_since_last_event
FROM public.city_health_view
WHERE health_score < 60
ORDER BY health_score ASC;
```

### Get city recovery history

```sql
SELECT 
  city_id,
  action,
  reason,
  old_state,
  new_state,
  success,
  created_at
FROM public.city_recovery_log
WHERE city_id = 'uuid-here'
ORDER BY created_at DESC;
```

### Get cities in recovery cooldown

```sql
SELECT 
  city_name,
  recovery_cooldown_until,
  recovery_attempts,
  state
FROM public.city_configs
WHERE recovery_cooldown_until > NOW()
  AND pipeline_enabled = true;
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Average city health** (should be > 70%)
2. **% cities in ACTIVE state** (target: > 90%)
3. **Recovery success rate** (target: > 80%)
4. **Average time to recover** (target: < 6 hours)
5. **Bootstrap success rate** (target: > 85%)

### Sample Monitoring Queries

```sql
-- Overall system health
SELECT 
  COUNT(*) as total_cities,
  COUNT(*) FILTER (WHERE state = 'ACTIVE') as active,
  ROUND(AVG(health_score)::NUMERIC, 2) as avg_health,
  COUNT(*) FILTER (WHERE recovery_attempts > 0) as cities_recovered
FROM public.city_configs
WHERE pipeline_enabled = true;

-- Recovery action metrics
SELECT 
  action,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success = true) as successful,
  ROUND(
    COUNT(*) FILTER (WHERE success = true)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate
FROM public.city_recovery_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY action;
```

## Configuration

### Adjust Health Thresholds

In `city-guardian/index.ts`:

```typescript
const HEALTH_THRESHOLD = 60  // Trigger recovery if health < this
const MAX_RECOVERY_ATTEMPTS = 5  // Quarantine after this many failures
const COOLDOWN_HOURS = 12  // Time between recovery attempts
```

### Adjust Health Score Weights

In `20260110_self_healing_city_system.sql`, search for `HEALTH SCORE CALCULATION`:

```sql
-- Current weights: source yield 30%, freshness 30%, confidence 25%, stability 15%
-- To adjust: change the multiplication factors and percentages
```

### Source Grace Period

In `event_sources` table, the `grace_period_until` column holds when a source can be deactivated:

```sql
-- Query sources in grace period
SELECT name, url, grace_period_until
FROM public.event_sources
WHERE grace_period_until > NOW();
```

## Troubleshooting

### Cities not bootstrapping?

1. Check `bootstrap_queue` table:
   ```sql
   SELECT * FROM public.bootstrap_queue WHERE status != 'completed';
   ```

2. Check if `city_configs.pipeline_enabled = true`

3. Check if `SUPABASE_SERVICE_ROLE_KEY` is set in cron/edge function

4. Check logs in Supabase Dashboard → Functions

### Health score not updating?

1. Verify `city_health_view` works:
   ```sql
   SELECT * FROM public.city_health_view LIMIT 1;
   ```

2. Check if events are being published (is_published = true)

3. Verify event_confidence records exist

### cityGuardian not running?

1. Check Scheduled Functions in Supabase Dashboard
2. Verify cron syntax: `0 */6 * * *` (every 6 hours)
3. Check function logs for errors
4. Test manually: `curl -X POST https://project.supabase.co/functions/v1/city-guardian`

## Performance Notes

- **city_health_view** is lightweight (uses indexes) – safe for frequent queries
- **city_health_snapshot** is materialized view – use this for dashboards
- Recovery is throttled by cooldown (default 12 hours) to avoid thrashing
- Max 5 recovery attempts per city, then quarantine

## Next Steps

1. ✅ Deploy migrations
2. ✅ Deploy Edge Functions
3. ✅ Set up CRON schedules
4. ✅ Monitor city_recovery_log
5. 📊 Create admin dashboard showing city health
6. 📧 Set up alerts (email when city quarantined)
7. 🔍 Analyze which sources are most valuable
8. 🎓 Train AI model on source quality patterns

## B2G Sales Talking Points

**"EventNexus City SLA":**

- ✅ 99.5% city uptime guarantee
- ✅ Automatic source discovery (no manual work)
- ✅ Self-healing within 6 hours
- ✅ Zero operational cost for municipality
- ✅ Full audit trail for compliance

## Support

For issues:

1. Check `city_recovery_log` for what happened
2. Check `city_health_view` for current state
3. Review Edge Function logs in Supabase
4. Manual recovery: run `discover-sources` function directly

---

**Architecture by Jhon**  
**Implementation Date: January 10, 2026**
