-- Create beta_invitations table for tracking beta access codes
create table if not exists public.beta_invitations (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  email text,
  used_by uuid references public.users(id) on delete set null,
  redeemed_at timestamp,
  status text not null default 'active' check (status in ('active', 'used', 'expired')),
  created_at timestamp default now(),
  expires_at timestamp not null,
  
  -- Indexes for common queries
  created_index_code idx on code,
  created_index_status idx on status,
  created_index_used_by idx on used_by
);

-- Enable RLS
alter table public.beta_invitations enable row level security;

-- RLS Policies
-- Allow admins to see all beta invitations
create policy "Admins can view beta_invitations" on public.beta_invitations
  for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Allow anyone to redeem (read-only check)
create policy "Users can check beta codes" on public.beta_invitations
  for select
  using (true);

-- Allow admins to insert
create policy "Admins can create beta_invitations" on public.beta_invitations
  for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Allow admins to update
create policy "Admins can update beta_invitations" on public.beta_invitations
  for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Allow admins to delete
create policy "Admins can delete beta_invitations" on public.beta_invitations
  for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Grant permissions
grant select on public.beta_invitations to anon, authenticated;
grant insert, update, delete on public.beta_invitations to authenticated;
