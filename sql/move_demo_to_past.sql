-- Move Demo Party to past (26 Dec 2025 = 3 days ago)
UPDATE events
SET 
  date = '2025-12-26',
  end_date = '2025-12-26'
WHERE name = 'Demo Party';

-- Verify change
SELECT 
  name,
  date,
  end_date,
  NOW() - date::timestamp as days_ago,
  CASE 
    WHEN date::timestamp < NOW() - INTERVAL '2 days' THEN '✓ ELIGIBLE for payout'
    ELSE '✗ Not eligible yet'
  END as eligibility
FROM events
WHERE name = 'Demo Party';
