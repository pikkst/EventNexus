# Self-Healing City System – Deployment Checklist

## Pre-Deployment

- [ ] **Backup Supabase database**
  ```bash
  # In Supabase dashboard: Database → Backups → Create backup
  ```

- [ ] **Review migration files**
  - [ ] `20260110_self_healing_city_system.sql` – adds columns, views, functions
  - [ ] `20260110_auto_bootstrap_refined.sql` – adds triggers, queue logic

- [ ] **Check environment variables**
  ```bash
  echo $SUPABASE_URL
  echo $SUPABASE_SERVICE_ROLE_KEY
  echo $GEMINI_API_KEY  # Required for discover-sources
  ```

- [ ] **Verify Edge Function code**
  - [ ] `supabase/functions/city-guardian/index.ts` – exists and valid
  - [ ] `supabase/functions/discover-sources/index.ts` – exists and valid

---

## Phase 1: Database Migration (5 min)

- [ ] **Run first migration**
  ```bash
  supabase db push  # or manually in SQL Editor
  ```

- [ ] **Verify schema created**
  ```sql
  -- In Supabase SQL Editor:
  
  -- Check columns added
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'city_configs' 
  AND column_name IN ('state', 'health_score', 'recovery_attempts');
  
  -- Check views created
  SELECT viewname FROM pg_views 
  WHERE viewname IN ('city_health_view', 'city_health_snapshot');
  
  -- Check tables created
  SELECT tablename FROM pg_tables 
  WHERE tablename IN ('bootstrap_queue', 'city_recovery_log');
  ```

- [ ] **Run second migration**
  ```bash
  supabase db push  # Apply auto_bootstrap_refined
  ```

- [ ] **Verify functions created**
  ```sql
  SELECT proname FROM pg_proc 
  WHERE proname IN (
    'trigger_city_auto_bootstrap',
    'enqueue_bootstrap_job',
    'get_next_bootstrap_job',
    'decay_source_quality',
    'update_city_state_based_on_health'
  );
  ```

---

## Phase 2: Deploy Edge Functions (3 min)

- [ ] **Deploy cityGuardian**
  ```bash
  supabase functions deploy city-guardian
  ```
  - [ ] Check for errors in terminal
  - [ ] Verify in Supabase Dashboard → Functions → city-guardian

- [ ] **Deploy discover-sources**
  ```bash
  supabase functions deploy discover-sources
  ```
  - [ ] Check for errors
  - [ ] Verify in Supabase Dashboard

- [ ] **Test functions manually**
  ```bash
  # Get auth token (use service role key or anon key)
  TOKEN="your-anon-key"
  
  # Test city-guardian (should return 0 evaluated if all healthy)
  curl -X POST https://PROJECT.supabase.co/functions/v1/city-guardian \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}'
  
  # Should respond with 200 and JSON like:
  # {"status":"ok","timestamp":"...","evaluated":0,"healed":0}
  ```

---

## Phase 3: Configure Scheduled Functions (5 min)

In **Supabase Dashboard → Database → Scheduled Functions**:

### Schedule 1: cityGuardian – Every 6 hours

- [ ] **Create new scheduled function**
  - Name: `city-guardian-cron`
  - Function: `city-guardian`
  - Cron expression: `0 */6 * * *` (or pick specific hours: `0 0,6,12,18 * * *`)
  - Enabled: ☑️

- [ ] **Verify it's active**
  - [ ] Show "Schedule enabled"
  - [ ] Next run time displayed

### Schedule 2: Refresh health snapshot – Every 1 hour

- [ ] **Create new scheduled SQL function**
  - Name: `refresh-city-health-snapshot`
  - SQL:
    ```sql
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.city_health_snapshot;
    ```
  - Cron: `0 * * * *` (every hour)
  - Enabled: ☑️

### Schedule 3: Source quality decay – Every 24 hours

- [ ] **Create new scheduled SQL function**
  - Name: `city-source-decay`
  - SQL:
    ```sql
    SELECT decay_source_quality();
    SELECT update_city_state_based_on_health();
    ```
  - Cron: `0 2 * * *` (2 AM UTC daily)
  - Enabled: ☑️

- [ ] **Verify all 3 schedules active**
  ```
  Expected: 3 scheduled functions running
  ```

---

## Phase 4: Initial Data Check (5 min)

- [ ] **Initialize city states**
  ```sql
  -- Set all pipeline-enabled cities to NEW if not already set
  UPDATE city_configs 
  SET state = 'NEW' 
  WHERE state IS NULL AND pipeline_enabled = true;
  ```

- [ ] **Check existing cities**
  ```sql
  SELECT city_name, state, health_score 
  FROM city_configs 
  WHERE pipeline_enabled = true 
  LIMIT 10;
  ```
  
  Expected: Cities show NEW or BOOTSTRAPPING state

- [ ] **Queue existing cities for bootstrap**
  ```sql
  INSERT INTO bootstrap_queue (city_id, city_name, country, status)
  SELECT city_id, city_name, country, 'pending'
  FROM city_configs
  WHERE pipeline_enabled = true 
    AND state IN ('NEW', 'BOOTSTRAPPING')
  ON CONFLICT (city_id) DO NOTHING;
  
  SELECT COUNT(*) FROM bootstrap_queue WHERE status = 'pending';
  ```

---

## Phase 5: Smoke Test (10 min)

- [ ] **Add a test city**
  ```sql
  INSERT INTO city_configs (city_name, country, pipeline_enabled, state)
  VALUES ('TestBootstrapCity', 'Estonia', true, 'NEW')
  RETURNING city_id;
  
  -- Copy the city_id
  ```

- [ ] **Wait for auto-bootstrap (or trigger manually)**
  ```bash
  # Manual trigger:
  curl -X POST https://PROJECT.supabase.co/functions/v1/city-guardian \
    -H "Authorization: Bearer $TOKEN"
  
  # Wait 30 seconds for bootstrap-city to run
  ```

- [ ] **Check if sources were discovered**
  ```sql
  SELECT es.name, es.url, es.source_score 
  FROM event_sources es
  WHERE es.city_id = 'city-uuid-from-above'
  ORDER BY es.source_score DESC;
  
  -- Should see 3-5 sources if successful
  ```

- [ ] **Check city state changed**
  ```sql
  SELECT city_name, state, health_score 
  FROM city_configs 
  WHERE city_id = 'city-uuid-from-above';
  
  -- Should see: state = ACTIVE or DISCOVERING_SOURCES
  ```

- [ ] **Check recovery log**
  ```sql
  SELECT action, reason, success 
  FROM city_recovery_log 
  WHERE city_id = 'city-uuid-from-above'
  ORDER BY created_at DESC;
  
  -- Should see: BOOTSTRAP action with success=true
  ```

- [ ] **Cleanup test city** (optional)
  ```sql
  DELETE FROM city_configs WHERE city_name = 'TestBootstrapCity';
  ```

---

## Phase 6: Monitoring Setup (10 min)

- [ ] **Create admin query for city health dashboard**
  ```sql
  -- Copy to admin dashboard:
  SELECT 
    city_name,
    state,
    health_score,
    active_sources,
    events_30d,
    hours_since_last_event,
    recovery_attempts
  FROM city_health_view
  WHERE health_score < 80
  ORDER BY health_score ASC;
  ```

- [ ] **Set up logging queries**
  - [ ] Save query: "Recent recovery actions"
    ```sql
    SELECT city_id, action, reason, success, created_at 
    FROM city_recovery_log 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC;
    ```

- [ ] **Create alerts (optional)**
  - [ ] Alert if city health < 30 (using your monitoring tool)
  - [ ] Alert if cityGuardian function fails
  - [ ] Alert if source decay fails

---

## Phase 7: Documentation & Communication (5 min)

- [ ] **Copy documentation to team**
  - [ ] `SELF_HEALING_CITY_SYSTEM.md` – full guide
  - [ ] `SELF_HEALING_QUICK_REF.md` – quick reference
  - [ ] This checklist

- [ ] **Inform team**
  - [ ] Slack message: "Self-healing city system live"
  - [ ] Mention: cityGuardian runs every 6 hours
  - [ ] Link to quick ref doc

- [ ] **Add to onboarding docs**
  - [ ] How self-healing works
  - [ ] How to add new cities
  - [ ] How to check city health

---

## Post-Deployment (24-72 hours)

- [ ] **Monitor logs**
  ```sql
  -- Check what cityGuardian did
  SELECT COUNT(*), action, COUNT(*) FILTER (WHERE success = true) as succeeded
  FROM city_recovery_log
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY action;
  ```

- [ ] **Check city health improved**
  ```sql
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE state = 'ACTIVE') as active,
    ROUND(AVG(health_score), 2) as avg_health
  FROM city_health_view
  WHERE health_score IS NOT NULL;
  
  -- Expect: > 80% active, avg health > 70
  ```

- [ ] **Review recovery actions**
  ```sql
  -- Verify bootstrap worked
  SELECT action, success, COUNT(*)
  FROM city_recovery_log
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY action, success;
  ```

- [ ] **Check for errors**
  ```sql
  SELECT city_id, error_message, COUNT(*) as count
  FROM city_recovery_log
  WHERE success = false
  GROUP BY city_id, error_message
  ORDER BY count DESC;
  ```

- [ ] **Performance check**
  ```sql
  -- View refresh time should be < 1 second
  EXPLAIN ANALYZE SELECT * FROM city_health_view LIMIT 1;
  ```

---

## Rollback Plan (if needed)

If system causes problems:

1. **Disable all schedules**
   - Supabase Dashboard → Scheduled Functions → toggle off all 3

2. **Disable pipeline**
   ```sql
   UPDATE city_configs SET pipeline_enabled = false;
   ```

3. **Revert migrations** (if critical)
   ```bash
   # NOT RECOMMENDED unless absolutely necessary
   # Data will be lost; restore from backup instead
   ```

4. **Restore from backup**
   - Supabase Dashboard → Database → Backups → Restore

---

## Verification Checklist (Final)

- [ ] All 3 schedules active and running
- [ ] cityGuardian function deployed and tested
- [ ] discover-sources function deployed and tested
- [ ] Database migrations applied without errors
- [ ] Test city bootstrapped successfully
- [ ] Recovery log shows successful actions
- [ ] Dashboard queries prepared
- [ ] Team notified
- [ ] Documentation in place

---

## 🎉 You're Done!

The self-healing city system is now live:

✅ **104 cities** are protected with automatic recovery
✅ **New cities** auto-bootstrap on creation
✅ **Broken cities** heal themselves every 6 hours
✅ **Full audit trail** of all actions
✅ **Scales** to 10,000+ cities

**Next:** Monitor for 24h, then optimize thresholds based on real data.

---

**Estimated Total Time:** 45 minutes  
**Deployment Date:** January 10, 2026  
**By:** Jhon
