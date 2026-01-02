-- Deploy service role policies for autonomous operations

-- Autonomous logs table policies
DROP POLICY IF EXISTS "Service role can insert logs" ON autonomous_logs;
CREATE POLICY "Service role can insert logs" 
  ON autonomous_logs 
  FOR INSERT WITH CHECK (true);

-- Autonomous actions table policies  
DROP POLICY IF EXISTS "Service role can insert actions" ON autonomous_actions;
CREATE POLICY "Service role can insert actions" 
  ON autonomous_actions 
  FOR INSERT WITH CHECK (true);

-- Marketing intelligence log policies (already exists in intelligent_autonomous_marketing.sql but adding here too)
DROP POLICY IF EXISTS "Service role can insert intelligence" ON marketing_intelligence_log;
CREATE POLICY "Service role can insert intelligence" 
  ON marketing_intelligence_log 
  FOR INSERT WITH CHECK (true);
