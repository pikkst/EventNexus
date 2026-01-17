-- Phase 3: Achievements & Gamification
-- All statements in English only.

-- Enable required extensions (if not already enabled)
create extension if not exists pgcrypto;

-- 1) Achievements catalog
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  tier int not null default 1, -- 1=bronze,2=silver,3=gold,4=platinum
  icon text, -- optional icon URL or key
  points int not null default 50,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) User achievements (earned)
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- 3) User stats (xp, level, streak, aggregates)
create table if not exists public.user_stats (
  user_id uuid primary key references public.users(id) on delete cascade,
  xp int not null default 0,
  level int not null default 1,
  streak_days int not null default 0,
  last_activity_at timestamptz,
  total_events_attended int not null default 0,
  total_checkins int not null default 0,
  total_reviews int not null default 0,
  communities_joined int not null default 0,
  updated_at timestamptz not null default now()
);

-- 4) Points ledger (auditable)
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  points int not null,
  reason text not null,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now()
);

-- Views: monthly leaderboard
create or replace view public.user_leaderboard_monthly as
select
  pl.user_id,
  date_trunc('month', pl.created_at) as month,
  sum(pl.points) as points
from public.points_ledger pl
group by pl.user_id, date_trunc('month', pl.created_at);

-- RLS policies
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_stats enable row level security;
alter table public.points_ledger enable row level security;

-- Achievements: readable to all
create policy achievements_read_all on public.achievements
  for select using (true);

-- User achievements: owner can read, insert via function
create policy user_achievements_read_own on public.user_achievements
  for select using (auth.uid() = user_id);

-- User stats: owner can read
create policy user_stats_read_own on public.user_stats
  for select using (auth.uid() = user_id);

-- Points ledger: owner can read
create policy points_ledger_read_own on public.points_ledger
  for select using (auth.uid() = user_id);

-- Helper function: compute level from xp
create or replace function public.compute_level(p_xp int)
returns int language sql immutable as $$
  -- Simple leveling curve: level grows with sqrt of xp
  select greatest(1, floor(sqrt(greatest(0, p_xp) / 100.0))::int);
$$;

-- Add points and update stats atomically
create or replace function public.add_points(p_user_id uuid, p_points int, p_reason text, p_source_type text default null, p_source_id uuid default null)
returns void language plpgsql security definer as $$
begin
  insert into public.points_ledger (user_id, points, reason, source_type, source_id)
  values (p_user_id, p_points, p_reason, p_source_type, p_source_id);

  update public.user_stats us
  set xp = xp + p_points,
      level = public.compute_level(xp + p_points),
      last_activity_at = now(),
      updated_at = now()
  where us.user_id = p_user_id;

  -- Ensure stats exist
  if not found then
    insert into public.user_stats (user_id, xp, level, last_activity_at)
    values (p_user_id, p_points, public.compute_level(p_points), now())
    on conflict (user_id) do update set xp = user_stats.xp + excluded.xp,
                                      level = public.compute_level(user_stats.xp + excluded.xp),
                                      last_activity_at = now(),
                                      updated_at = now();
  end if;
end;
$$;

-- Award achievement by key
create or replace function public.award_achievement(p_user_id uuid, p_key text)
returns boolean language plpgsql security definer as $$
declare
  v_ach achievements%rowtype;
begin
  select * into v_ach from public.achievements where key = p_key and is_active = true;
  if not found then
    return false;
  end if;

  -- Insert if not already earned
  insert into public.user_achievements (user_id, achievement_id)
  values (p_user_id, v_ach.id)
  on conflict (user_id, achievement_id) do nothing;

  -- Grant points for earning
  perform public.add_points(p_user_id, v_ach.points, 'achievement:' || p_key, 'achievement', v_ach.id);
  return true;
end;
$$;

-- Refresh user stats from existing social data
create or replace function public.refresh_user_stats()
returns void language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_attended int := 0;
  v_checkins int := 0;
  v_reviews int := 0;
  v_communities int := 0;
  v_points int := 0;
begin
  if v_user_id is null then
    -- Not authenticated; do nothing
    return;
  end if;

  select count(*) into v_attended from public.event_attendees ea where ea.user_id = v_user_id;
  select count(*) into v_checkins from public.event_checkins ec where ec.user_id = v_user_id;
  select count(*) into v_reviews from public.event_reviews er where er.user_id = v_user_id;
  select count(*) into v_communities from public.community_members cm where cm.user_id = v_user_id;

  -- Base points model
  v_points := (v_attended * 20) + (v_checkins * 15) + (v_reviews * 10) + (v_communities * 5);

  -- Upsert stats
  insert into public.user_stats (user_id, xp, level, total_events_attended, total_checkins, total_reviews, communities_joined, updated_at)
  values (v_user_id, v_points, public.compute_level(v_points), v_attended, v_checkins, v_reviews, v_communities, now())
  on conflict (user_id) do update set xp = excluded.xp,
                                    level = excluded.level,
                                    total_events_attended = excluded.total_events_attended,
                                    total_checkins = excluded.total_checkins,
                                    total_reviews = excluded.total_reviews,
                                    communities_joined = excluded.communities_joined,
                                    updated_at = now();

  -- Starter achievements
  if v_attended >= 1 then perform public.award_achievement(v_user_id, 'first_event'); end if;
  if v_checkins >= 1 then perform public.award_achievement(v_user_id, 'first_checkin'); end if;
  if v_reviews >= 1 then perform public.award_achievement(v_user_id, 'first_review'); end if;
  if v_communities >= 1 then perform public.award_achievement(v_user_id, 'first_community'); end if;
  if v_attended >= 5  then perform public.award_achievement(v_user_id, 'event_enthusiast'); end if;
  if v_checkins >= 10 then perform public.award_achievement(v_user_id, 'checkin_streak'); end if;
end;
$$;

-- Seed default achievements
insert into public.achievements (key, name, description, tier, points)
values
  ('first_event', 'First Event', 'Attend your first event', 1, 50),
  ('first_checkin', 'First Check-in', 'Check in at your first event', 1, 50),
  ('first_review', 'First Review', 'Write your first event review', 1, 50),
  ('first_community', 'Join a Community', 'Join your first community', 1, 50),
  ('event_enthusiast', 'Event Enthusiast', 'Attend 5 events', 2, 150),
  ('checkin_streak', 'Check-in Streak', 'Check in 10 times', 2, 150)
on conflict (key) do nothing;
