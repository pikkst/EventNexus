# Ticket System Implementation Guide

## Overview

The EventNexus platform now has a complete, production-ready ticket system with:
- **Secure QR code generation** with cryptographic hashing
- **Real-time ticket validation** via phone camera scanning
- **Automated ticket creation** after successful Stripe payment
- **Platform fee calculation** based on organizer subscription tier
- **Ticket status tracking** (valid, used, cancelled, expired)
- **Audit trail** for all ticket scans

## Architecture

### Components

1. **Ticket Service** (`services/ticketService.ts`)
   - QR code generation with SHA-256 hashing
   - Ticket creation and validation
   - Platform fee calculations
   - User ticket retrieval with QR images

2. **Database Service** (`services/dbService.ts`)
   - `getUserTickets()` - Fetch user's tickets with event details
   - `validateTicket()` - Validate ticket via Edge Function

3. **Stripe Webhook** (`supabase/functions/stripe-webhook/index.ts`)
   - Generates secure QR codes after payment
   - Updates ticket status from pending → paid
   - Creates notifications for buyers

4. **Ticket Scanner** (`components/TicketScanner.tsx`)
   - Real-time QR code scanning via camera
   - Validates tickets against backend
   - Shows attendee information
   - Prevents duplicate scans

5. **Ticket Card** (`components/TicketCard.tsx`)
   - Displays ticket with QR code
   - Shows event details and status
   - Renders scannable QR code image

6. **Database Migration** (`supabase/migrations/20250220000000_ticket_system_enhancement.sql`)
   - Adds ticket validation fields
   - Creates ticket_scans audit table
   - Implements RLS policies
   - Adds performance indexes

## QR Code Format

### Structure
```
ENX-{ticketId}-{hash}
```

Example:
```
ENX-a7b3c2d1-e4f5-6789-0123-456789abcdef-3f8a9b2c1d4e
```

### Components
- **Prefix**: `ENX` (EventNexus identifier)
- **Ticket ID**: UUID of the ticket
- **Hash**: First 12 chars of SHA-256 hash of `{ticketId}-{eventId}-{userId}-{secret}`

### Security
- Hash includes server-side secret (`TICKET_HASH_SECRET`)
- Prevents ticket forgery
- Verifies authenticity during scan
- Each ticket has unique QR code

## Flow Diagrams

### Ticket Purchase Flow
```
User selects event → Clicks "Buy Tickets" → Stripe Checkout
                                                    ↓
                                           Payment Success
                                                    ↓
                                         Webhook Triggered
                                                    ↓
                                    Generate Secure QR Codes
                                                    ↓
                                    Update ticket status → paid
                                                    ↓
                                   Send notification to user
                                                    ↓
                               User sees ticket in profile with QR
```

### Ticket Scanning Flow
```
Organizer opens Scanner → Camera activates → Scans QR code
                                                    ↓
                                          Parse QR data (ENX-...)
                                                    ↓
                                       Fetch ticket from database
                                                    ↓
                                      Verify hash authenticity
                                                    ↓
                                    Check organizer authorization
                                                    ↓
                                       Check ticket status
                                                    ↓
                          valid → Mark as 'used', grant entry
                          used → Show "Already scanned" error
                          cancelled → Show "Cancelled" error
                          expired → Show "Event ended" error
```

## Database Schema

### tickets table
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  ticket_type TEXT DEFAULT 'standard',
  price NUMERIC(10, 2),
  status TEXT CHECK (status IN ('valid', 'used', 'cancelled', 'expired')),
  qr_code TEXT UNIQUE,  -- Format: ENX-{id}-{hash}
  purchase_date TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_id TEXT,
  scanned_at TIMESTAMP WITH TIME ZONE,
  scanned_by UUID REFERENCES users(id),
  metadata JSONB
);
```

### ticket_scans table (audit trail)
```sql
CREATE TABLE ticket_scans (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id),
  event_id UUID REFERENCES events(id),
  scanned_by UUID REFERENCES users(id),
  scanned_at TIMESTAMP WITH TIME ZONE,
  scan_result TEXT,
  scan_location JSONB,
  metadata JSONB
);
```

## Platform Fees

Fees are automatically calculated based on organizer's subscription tier:

| Tier       | Commission Rate |
|------------|----------------|
| Free       | 5.0%           |
| Pro        | 3.0%           |
| Premium    | 2.5%           |
| Enterprise | 1.5%           |

### Example Calculation
- **Total ticket revenue**: €100
- **Organizer tier**: Pro (3%)
- **Platform fee**: €3
- **Organizer net**: €97

Fees are deducted automatically during Stripe checkout via `application_fee_amount`.

## API Reference

### ticketService.ts

#### `generateTicketQRImage(ticketId, eventId, userId)`
Generates QR code as base64 data URL.
```typescript
const qrImage = await generateTicketQRImage(
  'ticket-uuid',
  'event-uuid',
  'user-uuid'
);
// Returns: "data:image/png;base64,iVBORw0KG..."
```

#### `validateAndScanTicket(qrCodeData, scannerId)`
Validates and marks ticket as used.
```typescript
const result = await validateAndScanTicket(
  'ENX-ticket-uuid-hash123',
  'scanner-user-uuid'
);
// Returns: { valid: true/false, message: string, ticket?: object }
```

#### `getUserTicketsWithQR(userId)`
Fetches user's tickets with QR images.
```typescript
const tickets = await getUserTicketsWithQR('user-uuid');
// Returns: Array of tickets with qrImage property
```

#### `calculatePlatformFee(totalAmount, organizerTier)`
Calculates fees based on tier.
```typescript
const fees = calculatePlatformFee(100, 'pro');
// Returns: { totalAmount: 100, platformFee: 3, organizerNet: 97 }
```

## Usage Examples

### Display User Tickets (in UserProfile)
```tsx
import TicketCard from './TicketCard';
import { getUserTickets } from '../services/dbService';

// Fetch tickets
const tickets = await getUserTickets(user.id);

// Render
{tickets.map(ticket => (
  <TicketCard key={ticket.id} ticket={ticket} />
))}
```

### Scan Tickets (in TicketScanner)
```tsx
import { validateTicket } from '../services/dbService';
import QrScanner from 'qr-scanner';

const scanner = new QrScanner(
  videoElement,
  async (result) => {
    const validation = await validateTicket(result.data);
    if (validation.valid) {
      // Grant entry
    } else {
      // Show error
    }
  }
);
```

### Create Ticket After Payment (in webhook)
```typescript
import { generateSecureQRCode } from './webhook-utils';

// After successful payment
const qrCode = await generateSecureQRCode(
  ticketId,
  eventId,
  userId
);

await supabase
  .from('tickets')
  .update({ 
    qr_code: qrCode,
    status: 'valid',
    payment_status: 'paid'
  })
  .eq('id', ticketId);
```

## Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install qrcode @types/qrcode qr-scanner
   ```

2. **Run Database Migration**
   ```bash
   supabase db push
   ```

3. **Set Environment Variables**
   Add to `.env.local`:
   ```
   VITE_TICKET_HASH_SECRET=your-production-secret-key-here
   ```
   
   Add to Supabase Edge Function secrets:
   ```bash
   supabase secrets set TICKET_HASH_SECRET=your-production-secret-key-here
   ```

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy validate-ticket
   ```

5. **Test End-to-End**
   - Create test event with tickets
   - Purchase ticket via Stripe (test mode)
   - Check ticket appears in user profile with QR
   - Scan QR code using TicketScanner
   - Verify ticket marked as used

## Security Considerations

### QR Code Security
- ✅ Uses SHA-256 cryptographic hashing
- ✅ Includes server-side secret
- ✅ Prevents ticket duplication/forgery
- ✅ Each ticket has unique hash

### Authorization
- ✅ Only event organizer can scan tickets
- ✅ Admin users have scan override
- ✅ RLS policies protect ticket data
- ✅ Audit trail in ticket_scans table

### Payment Protection
- ✅ Tickets created with 'pending' status
- ✅ Only marked 'valid' after payment confirmed
- ✅ Funds held until 2 days after event
- ✅ Automated refund protection

## Troubleshooting

### QR Code Not Generating
- Check `VITE_TICKET_HASH_SECRET` is set in `.env.local`
- Verify qrcode library is installed
- Check browser console for errors

### Scanner Not Working
- Ensure HTTPS connection (required for camera access)
- Check camera permissions in browser
- Verify user is event organizer or admin

### Ticket Validation Failing
- Confirm `validate-ticket` Edge Function is deployed
- Check ticket status is 'valid' not 'used'
- Verify QR code format matches `ENX-{id}-{hash}`

### Platform Fees Not Calculating
- Check organizer's subscription_tier in database
- Verify Stripe Connect account is set up
- Review checkout session metadata

## Future Enhancements

- [ ] Bulk ticket scanning mode
- [ ] Offline ticket validation (PWA)
- [ ] Ticket transfer between users
- [ ] Tiered ticket types (VIP, General, etc.)
- [ ] Real-time scan statistics dashboard
- [ ] Email tickets as PDF attachments
- [ ] SMS ticket delivery
- [ ] Wallet integration (Apple/Google Pay)

## Support

For issues or questions:
- Email: huntersest@gmail.com
- GitHub: https://github.com/pikkst/EventNexus/issues
- Documentation: `/docs/TICKET_SYSTEM.md`

## License

Proprietary - EventNexus Platform
© 2025 All rights reserved
