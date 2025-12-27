# FINAL SETUP STEP ⚠️

## Contact Form Email Working! ✅

Edge Function is deployed and working. Test emails sent successfully!

## 📋 You Need to Do ONE Thing

### Create Database Table

**Go here NOW:**
https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

**Copy-paste this SQL and click RUN:**

```sql
-- Contact Inquiries Table
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contact', 'partnership')),
  email_id TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ
);

CREATE INDEX idx_contact_inquiries_organizer ON public.contact_inquiries(organizer_id);
CREATE INDEX idx_contact_inquiries_status ON public.contact_inquiries(status);
CREATE INDEX idx_contact_inquiries_created ON public.contact_inquiries(created_at DESC);
CREATE INDEX idx_contact_inquiries_type ON public.contact_inquiries(type);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their inquiries"
  ON public.contact_inquiries FOR SELECT
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their inquiry status"
  ON public.contact_inquiries FOR UPDATE
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Anyone can submit inquiries"
  ON public.contact_inquiries FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.contact_inquiries TO anon;
GRANT SELECT, INSERT, UPDATE ON public.contact_inquiries TO authenticated;
```

**That's it! After running SQL, go test:**

## ✅ Testing

1. Open: https://eventnexus.eu/#/agency/hunteset
2. Click "Contact Us" or "Inquire for Partnership"
3. Fill in form
4. Check your email: `huntersest@gmail.com`

## 📧 What You'll Receive

Beautiful HTML email with:
- Sender's name and email
- Their message
- "Reply to [Name]" button
- Professional EventNexus branding

---

**Status**: ✅ Edge Function deployed and working  
**Email Service**: Resend API (via server-side Edge Function)  
**Test**: 2 emails already sent to huntersest@gmail.com

**Next**: Just run that SQL once ☝️
