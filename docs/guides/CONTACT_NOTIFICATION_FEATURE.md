# Contact Inquiry Dashboard Notifications

## ✅ IMPLEMENTED

Kui keegi saadab contact formi või partnership inquiry läbi avaliku agency page, siis:

### 1. **Email saadetakse** ✉️
- Korraldaja saab emaili huntersest@gmail.com
- Email sisaldab saatja nime, emaili ja sõnumi
- Email on ilusti formeeritud HTML vormingus

### 2. **Notification kuvatakse Dashboard'is** 🔔
- Korraldaja näeb kohe punast punkti notification ikooni kõrval
- Notification sisaldab:
  - 📧 **Mail ikoon** (purple värv)
  - **Pealkiri**: "✉️ New Contact Message" või "🤝 New Partnership Inquiry"
  - **Saatja nimi** ja **email**
  - **Sõnumi tekst**
  - **"Reply via Email" nupp** - avaneb email client vastamiseks

### 3. **Database salvestamine** ��
- Kõik inquiryd salvestatakse `contact_inquiries` tabelisse
- Status tracking: new → read → replied → archived
- Võimalik hiljem lisada Dashboard'i eraldi Inquiries tab

## 📋 REQUIREMENTS

### ⚠️ SQL Migratsioon (KOHUSTUSLIK!)

Käivita Supabase SQL Editor'is:
```sql
https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new
```

Kopeeri kogu sisu failist:
```
supabase/migrations/20251227_contact_inquiries.sql
```

See lisab:
- ✅ `contact_inquiries` tabel
- ✅ `notifications.metadata` JSONB väli
- ✅ RLS policies
- ✅ Indexes

## 🔧 TECHNICAL DETAILS

### Files Modified:
1. `/types.ts` - Added `contact_inquiry` notification type + metadata field
2. `/services/dbService.ts` - Support for metadata in notifications
3. `/supabase/functions/send-contact-email/index.ts` - Creates notification after sending email
4. `/App.tsx` - Display contact notifications with Mail icon and Reply button
5. `/supabase/migrations/20251227_contact_inquiries.sql` - Database schema

### Notification Structure:
```typescript
{
  type: 'contact_inquiry',
  title: '✉️ New Contact Message' | '🤝 New Partnership Inquiry',
  message: 'John Doe (john@example.com) sent you a message: Subject here',
  senderName: 'John Doe',
  metadata: {
    inquiryId: 'uuid',
    fromEmail: 'john@example.com',
    inquiryType: 'contact' | 'partnership'
  }
}
```

## 🎨 UI DESIGN

**Notification Badge:**
- Purple Mail icon 📧
- Contact inquiry shows purple highlight
- Unread notification has brighter background

**Action Button:**
- Purple "Reply via Email" button
- Opens mailto: link with sender's email
- Stops notification click propagation

## 🧪 TESTING

1. Ava production agency page: https://eventnexus.eu/#/agency/hunteset
2. Kliki "Get In Touch" või "Inquire for Partnership"
3. Täida vorm ja saada
4. Kontrolli:
   - ✅ Email jõuab huntersest@gmail.com
   - ✅ Notification ilmub dashboard'i (punane punkt bell ikooni kõrval)
   - ✅ Kliki notification - saad klikida "Reply via Email"

## 📈 FUTURE ENHANCEMENTS

- [ ] Inquiries management tab in Dashboard
- [ ] Filter by type (contact vs partnership)
- [ ] Bulk actions (mark all as read, archive)
- [ ] Response templates
- [ ] Statistics (response rate, average response time)

## 🔗 RELATED LINKS

- Edge Function logs: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/functions/send-contact-email/logs
- SQL Editor: https://supabase.com/dashboard/project/anlivujgkjmajkcgbaxw/sql/new
- Resend Dashboard: https://resend.com/emails

## 📞 SUPPORT

Email: huntersest@gmail.com
Production: https://www.eventnexus.eu

---

**Status:** ✅ Deployed & Ready (after SQL migration)
**Deployment Date:** December 27, 2025
**Version:** 1.0.0
