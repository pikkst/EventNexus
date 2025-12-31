-- Check if campaign schedule was created
SELECT 
  cs.id,
  cs.campaign_id,
  c.title,
  cs.scheduled_for,
  cs.status,
  cs.platforms,
  cs.created_at,
  (cs.scheduled_for - NOW()) as time_until_post
FROM campaign_schedules cs
JOIN campaigns c ON c.id = cs.campaign_id
WHERE cs.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY cs.created_at DESC;
