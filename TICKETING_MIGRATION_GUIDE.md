# Enhanced Ticketing System Migration

## Overview
This migration adds comprehensive ticketing functionality to EventNexus, including:
- Event end times and duration tracking
- Multiple ticket types (VIP, Early Bird, Day Pass, Multi-Day, etc.)
- QR code-based ticket verification
- Organizer statistics and analytics
- Complete ticket lifecycle management

## Migration File
**File:** `supabase/migrations/20250128_enhanced_ticketing.sql`

## What's Included

### 1. Event Table Updates
- `end_date`: Optional end date for multi-day events
- `end_time`: Event end time
- `duration_hours`: Automatically calculated event duration

### 2. New Tables

#### ticket_templates
Defines different types of tickets available for each event:
- Multiple ticket types (general, VIP, early_bird, day_pass, multi_day, backstage, student, group)
- Customizable pricing per ticket type
- Quantity management (total, available, sold)
- Sale period controls (sale_start, sale_end)
- Multi-day event support (valid_days array)
- Benefits/includes list

#### tickets
Individual ticket purchases:
- Unique QR codes for each ticket
- Status tracking (valid, used, cancelled, refunded, expired)
- Purchase and verification timestamps
- Holder information
- Verification location tracking
- Metadata support for custom fields

#### ticket_verifications
Audit trail for ticket verifications:
- Who verified the ticket
- When and where it was verified
- Device information
- Optional notes

### 3. Automated Functions

#### update_ticket_template_quantities()
Automatically maintains ticket inventory:
- Decrements available quantity when tickets are sold
- Increments when tickets are refunded

#### calculate_event_duration()
Automatically calculates event duration in hours based on start/end times

#### expire_old_tickets()
Marks tickets as expired after their event date has passed

### 4. Database Views

#### ticket_stats
Aggregated statistics view showing:
- Total tickets sold per event
- Check-in counts
- Revenue totals
- Capacity utilization

### 5. RLS Policies
Secure row-level security policies for:
- Public viewing of active ticket templates
- Organizers managing their ticket templates
- Users viewing their own tickets
- Organizers verifying tickets for their events

## Installation Instructions

### Step 1: Run the SQL Migration
```sql
-- In Supabase SQL Editor, run the entire contents of:
-- supabase/migrations/20250128_enhanced_ticketing.sql
```

**OR** use the Supabase CLI:
```bash
cd /workspaces/EventNexus
npx supabase db push
```

### Step 2: Verify Tables Were Created
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ticket_templates', 'tickets', 'ticket_verifications');
```

### Step 3: Verify Functions Were Created
```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'update_ticket_template_quantities',
  'calculate_event_duration',
  'expire_old_tickets'
);
```

### Step 4: Test Sample Ticket Creation
```sql
-- Create a sample ticket template
INSERT INTO ticket_templates (
  event_id,
  name,
  type,
  price,
  quantity_total,
  quantity_available,
  description
) VALUES (
  'your-event-id-here',
  'General Admission',
  'general',
  25.00,
  100,
  100,
  'Standard entry ticket'
);
```

## Edge Functions Deployed

The following Edge Functions have been deployed to Supabase:

1. **verify-ticket** - Verifies QR codes and marks tickets as used
2. **get-user-tickets** - Retrieves all tickets for a user
3. **organizer-stats** - Calculates comprehensive organizer statistics
4. **purchase-ticket** - Handles ticket purchases with inventory management

## API Usage Examples

### Purchase a Ticket
```typescript
import { purchaseTicket } from './services/dbService';

const result = await purchaseTicket(
  ticketTemplateId,
  userId,
  'John Doe',
  'john@example.com',
  1 // quantity
);
```

### Verify a Ticket
```typescript
import { verifyTicket } from './services/dbService';

const result = await verifyTicket(
  qrCode,
  eventId,
  verifierId
);
```

### Get Organizer Statistics
```typescript
import { getOrganizerStats } from './services/dbService';

const stats = await getOrganizerStats(
  organizerId,
  'month' // or 'week', 'year'
);
```

## Frontend Components

New components created:

1. **TicketBuilder** - Event creation ticket configuration
2. **TicketQRDisplay** - Display ticket QR codes
3. **TicketVerificationScanner** - Scan and verify tickets
4. **MyTickets** - User ticket management
5. **OrganizerStats** - Organizer analytics dashboard

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Create a test event with multiple ticket types
- [ ] Purchase tickets as a user
- [ ] View tickets in MyTickets component
- [ ] Scan and verify tickets at event entrance
- [ ] View organizer statistics
- [ ] Test ticket refund functionality
- [ ] Verify expired tickets are marked correctly

## Rollback (if needed)

```sql
-- Drop new tables
DROP TABLE IF EXISTS ticket_verifications CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS ticket_templates CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS update_ticket_template_quantities CASCADE;
DROP FUNCTION IF EXISTS calculate_event_duration CASCADE;
DROP FUNCTION IF EXISTS expire_old_tickets CASCADE;

-- Drop views
DROP VIEW IF EXISTS ticket_stats CASCADE;

-- Remove new columns from events table
ALTER TABLE events 
DROP COLUMN IF EXISTS end_date,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS duration_hours;
```

## Support

For issues or questions:
- Email: huntersest@gmail.com
- Check Edge Function logs in Supabase Dashboard
- Review database logs in Supabase SQL Editor

## Version
Migration Version: 20250128
Created: December 28, 2025
