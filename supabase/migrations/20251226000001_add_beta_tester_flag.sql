-- Add beta_tester flag to users table
alter table public.users
add column if not exists is_beta_tester boolean default false;

-- Create index for beta tester queries
create index if not exists idx_users_beta_tester on public.users(is_beta_tester);

-- Comment for documentation
comment on column public.users.is_beta_tester is 'Marks users who signed up via beta invitation code. Beta testers receive 1000 credits and can submit bug reports directly to Admin Inbox.';

