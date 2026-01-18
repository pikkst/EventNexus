-- Add tracking columns to marketing_outreach table
-- These columns track email engagement events from Resend webhooks

-- Add clicked_at column to track when links are clicked
ALTER TABLE public.marketing_outreach
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Add bounce_reason column for failed deliveries
ALTER TABLE public.marketing_outreach
ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Add failed_reason column for other failures (spam complaints, etc.)
ALTER TABLE public.marketing_outreach
ADD COLUMN IF NOT EXISTS failed_reason TEXT;

-- Add replied_count to track number of replies (if tracked via CRM)
ALTER TABLE public.marketing_outreach
ADD COLUMN IF NOT EXISTS replied_count INTEGER DEFAULT 0;

-- Update the status CHECK constraint to be more comprehensive
ALTER TABLE public.marketing_outreach
DROP CONSTRAINT IF EXISTS marketing_outreach_status_check;

ALTER TABLE public.marketing_outreach
ADD CONSTRAINT marketing_outreach_status_check 
CHECK (status IN ('draft', 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'));

-- Create index on clicked_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_outreach_clicked_at ON public.marketing_outreach(clicked_at) WHERE clicked_at IS NOT NULL;

-- Create index on opened_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_outreach_opened_at ON public.marketing_outreach(opened_at) WHERE opened_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.marketing_outreach.clicked_at IS 'Timestamp when recipient clicked a link in the email (from Resend webhook)';
COMMENT ON COLUMN public.marketing_outreach.bounce_reason IS 'Reason for email bounce (hard/soft bounce type)';
COMMENT ON COLUMN public.marketing_outreach.failed_reason IS 'Reason for email failure (spam complaint, etc.)';
COMMENT ON COLUMN public.marketing_outreach.replied_count IS 'Number of replies received from this email';

-- Update marketing_analytics to track clicks
ALTER TABLE public.marketing_analytics
ADD COLUMN IF NOT EXISTS emails_clicked INTEGER DEFAULT 0;

COMMENT ON COLUMN public.marketing_analytics.emails_clicked IS 'Number of emails where recipient clicked a link';
