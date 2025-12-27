-- Contact Inquiries Table
-- Stores contact form and partnership inquiry submissions from public agency pages

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contact', 'partnership')),
  email_id TEXT, -- Resend email ID for tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_contact_inquiries_organizer ON public.contact_inquiries(organizer_id);
CREATE INDEX idx_contact_inquiries_status ON public.contact_inquiries(status);
CREATE INDEX idx_contact_inquiries_created ON public.contact_inquiries(created_at DESC);
CREATE INDEX idx_contact_inquiries_type ON public.contact_inquiries(type);

-- RLS Policies
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Organizers can view their own inquiries
CREATE POLICY "Organizers can view their inquiries"
  ON public.contact_inquiries
  FOR SELECT
  USING (organizer_id = auth.uid());

-- Organizers can update status of their inquiries
CREATE POLICY "Organizers can update their inquiry status"
  ON public.contact_inquiries
  FOR UPDATE
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- Anyone can insert (public forms)
CREATE POLICY "Anyone can submit inquiries"
  ON public.contact_inquiries
  FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.contact_inquiries TO anon;
GRANT SELECT, INSERT, UPDATE ON public.contact_inquiries TO authenticated;

COMMENT ON TABLE public.contact_inquiries IS 'Contact form and partnership inquiries from public agency pages';
COMMENT ON COLUMN public.contact_inquiries.type IS 'Type of inquiry: contact (general) or partnership (business)';
COMMENT ON COLUMN public.contact_inquiries.email_id IS 'Resend email ID for delivery tracking';
COMMENT ON COLUMN public.contact_inquiries.status IS 'Inquiry status: new, read, replied, archived';

-- Add metadata column to notifications table to support contact inquiries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN public.notifications.metadata IS 'Additional notification metadata (e.g., inquiry details)';
  END IF;
END $$;
