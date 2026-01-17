-- 🔧 AUTOMAATNE CITY BOOTSTRAP TRIGGER
-- Kui uus linn lisatakse või bootstrap_status = 'pending', siis käivita bootstrap automaatselt

-- 1. Create function to trigger bootstrap via HTTP
create or replace function trigger_city_bootstrap()
returns trigger as $$
declare
  function_url text;
  service_key text;
begin
  -- Only trigger if bootstrap_status is pending
  if new.bootstrap_status = 'pending' then
    
    -- Get Supabase project URL from environment
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/bootstrap-city';
    service_key := current_setting('app.settings.service_role_key', true);
    
    -- Log the bootstrap trigger
    raise notice 'Triggering auto-bootstrap for city: % (%)', new.city_name, new.city_id;
    
    -- Schedule bootstrap via pg_cron or immediate call
    -- For immediate execution, we'll use a deferred trigger approach
    -- Insert into a bootstrap_queue table that will be processed
    -- 🔧 CRITICAL: Store city_name and country to avoid race condition
    insert into bootstrap_queue (city_id, city_name, country, status, created_at)
    values (new.city_id, new.city_name, new.country, 'queued', now())
    on conflict (city_id) do nothing;
    
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create bootstrap queue table
create table if not exists bootstrap_queue (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references city_configs(city_id) on delete cascade unique,
  city_name text not null,
  country text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts int not null default 0,
  last_attempt timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns if they don't exist (for existing tables)
do $$ 
begin
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'bootstrap_queue' and column_name = 'city_name') then
    alter table bootstrap_queue add column city_name text not null default '';
  end if;
  
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'bootstrap_queue' and column_name = 'country') then
    alter table bootstrap_queue add column country text not null default '';
  end if;
end $$;

-- Index for efficient queue processing
create index if not exists idx_bootstrap_queue_status on bootstrap_queue(status, created_at);

-- 3. Create trigger on city_configs table
drop trigger if exists on_city_created on city_configs;
create trigger on_city_created
  after insert or update of bootstrap_status on city_configs
  for each row
  when (new.bootstrap_status = 'pending')
  execute function trigger_city_bootstrap();

-- 4. Add RLS policies for bootstrap_queue
alter table bootstrap_queue enable row level security;

drop policy if exists "Service role can manage bootstrap queue" on bootstrap_queue;
create policy "Service role can manage bootstrap queue"
  on bootstrap_queue for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 5. Add helper function to get next bootstrap job
drop function if exists get_next_bootstrap_job();
create or replace function get_next_bootstrap_job()
returns table (city_id uuid, city_name text, country text) as $$
  update bootstrap_queue
  set 
    status = 'processing',
    attempts = attempts + 1,
    last_attempt = now(),
    updated_at = now()
  where id = (
    select id
    from bootstrap_queue
    where status = 'queued'
      and attempts < 3 -- Max 3 retry attempts
    order by created_at
    limit 1
    for update skip locked
  )
  returning 
    bootstrap_queue.city_id,
    bootstrap_queue.city_name,
    bootstrap_queue.country;
$$ language sql security definer;

-- 6. Add function to mark bootstrap complete
create or replace function mark_bootstrap_complete(p_city_id uuid, p_sources_found int)
returns void as $$
begin
  -- Update bootstrap queue
  update bootstrap_queue
  set 
    status = 'completed',
    updated_at = now()
  where city_id = p_city_id;
  
  -- Update city status
  update city_configs
  set 
    bootstrap_status = 'completed',
    updated_at = now()
  where city_id = p_city_id;
  
  -- Log success
  raise notice 'Bootstrap completed for city: % (% sources found)', p_city_id, p_sources_found;
end;
$$ language plpgsql security definer;

-- 7. Add function to mark bootstrap failed
create or replace function mark_bootstrap_failed(p_city_id uuid, p_error text)
returns void as $$
begin
  update bootstrap_queue
  set 
    status = 'failed',
    error_message = p_error,
    updated_at = now()
  where city_id = p_city_id;
  
  raise notice 'Bootstrap failed for city: % - %', p_city_id, p_error;
end;
$$ language plpgsql security definer;

-- 8. Queue existing pending cities for bootstrap
insert into bootstrap_queue (city_id, city_name, country, status)
select city_id, city_name, country, 'queued'
from city_configs
where bootstrap_status = 'pending'
on conflict (city_id) do nothing;

comment on table bootstrap_queue is 'Queue for automatic city bootstrap jobs. Processed by bootstrap-city Edge Function.';
comment on function trigger_city_bootstrap() is 'Auto-trigger bootstrap when city is created or status changes to pending';
comment on function get_next_bootstrap_job() is 'Get next queued bootstrap job with pessimistic locking';
comment on function mark_bootstrap_complete(uuid, int) is 'Mark city bootstrap as completed';
comment on function mark_bootstrap_failed(uuid, text) is 'Mark city bootstrap as failed';
