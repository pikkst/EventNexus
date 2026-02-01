-- Enable RLS on ai_agents table
-- CRITICAL: Table has policies defined but RLS is disabled, causing policies to be ignored

-- Enable Row Level Security on ai_agents
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- Policies already exist from previous migrations:
-- 1. "Admins can read AI agents" (SELECT for authenticated with admin role check)
-- 2. "Service role can manage all AI agents" (ALL for service_role)

-- No new policies needed, just enabling RLS to activate existing policies
