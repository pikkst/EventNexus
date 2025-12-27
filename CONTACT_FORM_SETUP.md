# Contact Form Email Integration - Setup Guide

## Overview
Sinu avaliku agentuuri lehel on nüüd töötavad kontaktivormid! Külastajad saavad:
- **Contact Form**: Saata sulle üldisi sõnumeid
- **Partnership Inquiry**: Teha koostööpakkumisi

**Kõik päringud saadetakse sulle emaili teel läbi Resend Edge Function!**

## ✅ What's Already Done

- ✅ **Edge Function deployed**: `send-contact-email` is live on Supabase
- ✅ **RESEND_API_KEY**: Already configured in Supabase secrets
- ✅ **Frontend**: AgencyProfile uses Edge Function (no API key in browser)
- ✅ **Email templates**: Beautiful HTML emails ready

## 🚀 Final Setup Step (Required)

### Create Contact Inquiries Table

Go to: **Supabase Dashboard → SQL Editor**  
https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new

**Run this SQL:**

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

**That's it!** No other configuration needed.

## 🔧 How It Works (Technical)

### Architecture Flow
1. **Browser**: User fills contact form on public agency page
2. **Frontend**: AgencyProfile calls `supabase.functions.invoke('send-contact-email')`
3. **Edge Function**: Runs server-side (Deno) with access to RESEND_API_KEY from Supabase secrets
4. **Resend API**: Sends beautiful HTML email to organizer's email
5. **Database**: Stores inquiry in `contact_inquiries` table for tracking

### Security ✅
- API keys never exposed to browser (runs server-side only)
- Edge Function has access to Supabase secrets
- RLS policies protect organizer data
- Public can submit, only organizers view their inquiries

## 📧 User Experience

### Contact Form (Enterprise)
1. Visitor clicks "Contact Us" button on your public page
2. Fills out: Name, Email, Subject, Message
3. Clicks "Send Message"
4. **You receive beautiful HTML email** at your registered email address
5. Email has "Reply to [Name]" button that opens your email client

### Partnership Inquiry (All Tiers)
1. Visitor clicks "Inquire for Partnership"
2. Simple prompts for: Name, Email, Message
3. **You receive email** marked as Partnership type
4. Different styling/emoji to distinguish from general contact

## ✉️ Email Template Features

Your email will include:
- **Sender Avatar** (first letter of name in colored circle)
- **Full Contact Info** (name, email with reply-to link)
- **Subject Line** (if provided)
- **Message** (formatted with line breaks)
- **Quick Reply Button** (opens mailto: with pre-filled subject)
- **Dashboard Link**
- **Professional branding** (EventNexus footer)

## 📊 Inquiry Tracking

All inquiries are stored in database with:
- **Status**: new → read → replied → archived
- **Timestamps**: created_at, read_at, replied_at
- **Email ID**: Resend tracking ID
- **Type**: contact or partnership

## 🎯 Usage Locations

### Your Public Page: `eventnexus.eu/#/agency/hunteset`

**Contact Form Button** (Enterprise only):
- Shows when `pageConfig.enableContactForm !== false`
- Opens modal with full contact form
- Sends email with type='contact'

**Inquire for Partnership Link**:
- Available for all tiers
- In "About" section below bio
- Uses simple prompts for quick inquiry
- Sends email with type='partnership'

## 🔧 Customization Options

### Dashboard → White-Labeling

**Contact Form Toggle**:
```
Interactive Features → Contact Form
✓ Allow visitors to send direct inquiries
```

**Social Sharing Toggle**:
```
Interactive Features → Social Media Sharing
✓ Show share buttons on public page
```

## 📱 Future Features (Optional)

You can later view inquiries in Dashboard by creating an "Inquiries" tab:

```typescript
import { getContactInquiries, markInquiryAsRead } from './services/dbService';

const inquiries = await getContactInquiries(userId);
// Show table with: name, email, subject, type, status, created_at
// Actions: Mark as Read, Reply (opens mailto), Archive, Delete
```

## 🎨 Email Styling

**Contact Form Email:**
- Gradient: Blue (#6366f1) → Indigo
- Emoji: ✉️
- Subject: "New Contact Message for [Your Name]"

**Partnership Inquiry Email:**
- Gradient: Purple (#8b5cf6) → Indigo
- Emoji: 🤝
- Subject: "New Partnership Inquiry for [Your Name]"

## 🛡️ Security

- **RLS enabled**: Only you can view your inquiries
- **Anon can insert**: Allows public form submissions
- **Email validation**: Required fields enforced
- **Reply-to header**: Safe for direct replies

## 📧 Email Sending

**From**: `alerts@mail.eventnexus.eu`  
**Reply-To**: Visitor's email (so you can reply directly)  
**To**: Your registered email in `users.email`

## 🧪 Testing

1. Open your public page in incognito: `https://eventnexus.eu/#/agency/hunteset`
2. Click "Contact Us" (if Enterprise) or "Inquire for Partnership"
3. Fill in test data (use your real email to see the email!)
4. Submit
5. Check your inbox (and spam folder first time)
6. Click "Reply to [Name]" to test mailto: link

## ⚠️ Troubleshooting

**No email received?**
- Check Resend dashboard for delivery status
- Verify RESEND_API_KEY in environment
- Check spam/junk folder
- Ensure your user.email is correct in database

**Form not submitting?**
- Check browser console for errors
- Verify contact_inquiries table exists in Supabase
- Test with simple message first

**Reply button doesn't work?**
- This is browser-dependent (mailto: protocol)
- You can manually copy visitor's email from email body

## 📝 Database Schema

```typescript
interface ContactInquiry {
  id: string;
  organizer_id: string;      // Your user ID
  from_name: string;          // Visitor name
  from_email: string;         // Visitor email
  subject: string | null;     // Optional subject
  message: string;            // Main message
  type: 'contact' | 'partnership';
  email_id: string | null;    // Resend tracking ID
  status: 'new' | 'read' | 'replied' | 'archived';
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
}
```

## 🎉 You're Done!

Kontaktivormi ja partnerluse päringute funktsioonid töötavad nüüd täielikult! 

Külastajad saavad sulle kirjutada ja **sa saad emaili kohe peale saatmist**.

---

**Status**: ✅ Fully Functional  
**Deployment**: Live on production  
**Email Service**: Resend API  
**Database**: Supabase PostgreSQL
