-- Fix Brand Monitoring Alerts Status Constraint
-- Add 'deleted' to allowed status values

-- Drop old constraint
ALTER TABLE brand_monitoring_alerts 
DROP CONSTRAINT IF EXISTS brand_monitoring_alerts_status_check;

-- Add new constraint with 'deleted' status
ALTER TABLE brand_monitoring_alerts 
ADD CONSTRAINT brand_monitoring_alerts_status_check 
CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed', 'deleted'));

-- Update comment
COMMENT ON COLUMN brand_monitoring_alerts.status IS 'Alert status: open, investigating, resolved, dismissed, deleted';

-- Verify constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'brand_monitoring_alerts_status_check';
