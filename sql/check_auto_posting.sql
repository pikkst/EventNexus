-- Check campaign schedules (auto-posting status)
SELECT 
  cs.id,
  cs.campaign_id,
  c.title as campaign_title,
  cs.scheduled_for,
  cs.status,
  cs.platforms,
  cs.post_ids,
  cs.created_at
FROM campaign_schedules cs
LEFT JOIN campaigns c ON c.id = cs.campaign_id
ORDER BY cs.created_at DESC
LIMIT 10;

-- Check autonomous_logs for posting attempts
SELECT 
  id,
  timestamp,
  action_type,
  campaign_title,
  message,
  status
FROM autonomous_logs
WHERE action_type LIKE '%post%'
  OR message LIKE '%post%'
ORDER BY timestamp DESC
LIMIT 20;
