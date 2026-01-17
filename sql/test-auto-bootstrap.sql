-- ✅ TEST AUTO-BOOTSTRAP SYSTEM
-- Run after migration to verify everything works

-- 1. Check if bootstrap_queue table exists
select exists (
  select from information_schema.tables 
  where table_name = 'bootstrap_queue'
) as queue_table_exists;

-- 2. Check pending cities in queue
select 
  city_id,
  city_name,
  country,
  status,
  attempts,
  created_at
from bootstrap_queue
order by created_at desc
limit 10;

-- 3. Check all pending cities that need bootstrap
select 
  city_id,
  city_name,
  country,
  bootstrap_status,
  is_active,
  created_at
from city_configs
where bootstrap_status = 'pending'
  and is_active = true
order by created_at desc
limit 20;

-- 4. Count by status
select 
  'Total cities' as metric,
  count(*) as count
from city_configs
union all
select 
  'Pending bootstrap',
  count(*)
from city_configs
where bootstrap_status = 'pending'
union all
select 
  'Completed bootstrap',
  count(*)
from city_configs
where bootstrap_status = 'completed'
union all
select 
  'In queue',
  count(*)
from bootstrap_queue
where status in ('queued', 'processing');

-- 5. Manual queue insertion for pending cities (if trigger didn't fire)
-- This will populate the queue for existing pending cities
insert into bootstrap_queue (city_id, city_name, country, status)
select city_id, city_name, country, 'queued'
from city_configs
where bootstrap_status = 'pending'
  and is_active = true
  and city_id not in (select city_id from bootstrap_queue)
on conflict (city_id) do nothing;

-- 6. Check queue after insertion
select count(*) as queued_jobs
from bootstrap_queue
where status = 'queued';

-- 7. Get next job (simulating cron job pickup)
select * from get_next_bootstrap_job();
