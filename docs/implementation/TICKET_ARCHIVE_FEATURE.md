# Ticket Archive Feature

## Overview
Users can now archive their tickets from completed events. Archived tickets remain in the database but are hidden from the active tickets view, providing a cleaner profile page while preserving ticket history.

## Features

### For Users
- **Archive Tickets**: After an event is completed (ended at least 1 day ago), users can archive their tickets
- **View Toggle**: Switch between active and archived tickets view
- **Restore Tickets**: Unarchive tickets to bring them back to the active view
- **Event Completion Check**: Archive button only appears for tickets from completed events

### Technical Implementation

#### Database Schema
New columns added to `tickets` table:
- `archived_at`: TIMESTAMPTZ - When the ticket was archived
- `archived_by`: UUID - User who archived the ticket

#### Database Functions
- `archive_ticket(ticket_id, user_id)`: Archives a ticket with validation
  - Verifies ticket ownership
  - Checks if event has ended (at least 1 day ago)
  - Sets archived_at timestamp
- `restore_ticket(ticket_id, user_id)`: Restores an archived ticket
  - Verifies ticket ownership
  - Clears archived_at timestamp

#### API Functions (dbService.ts)
- `archiveTicket(ticketId, userId)`: Archives a ticket
- `restoreTicket(ticketId, userId)`: Restores an archived ticket
- `getArchivedTickets(userId)`: Retrieves user's archived tickets
- `getUserTickets(userId)`: Updated to exclude archived tickets

#### UI Components (UserProfile.tsx)
- Toggle button to switch between active and archived views
- Archive button (appears only for completed events)
- Restore button in archived view
- Badge showing archived ticket count

## User Flow

### Archiving a Ticket
1. Navigate to Profile page
2. Find a ticket from a completed event
3. Click the archive icon (folder icon) on the ticket card
4. Confirm the action
5. Ticket moves to archived view

### Restoring a Ticket
1. Navigate to Profile page
2. Click "Show Archived" button
3. Find the ticket to restore
4. Click the restore icon (folder with arrow)
5. Confirm the action
6. Ticket moves back to active view

## Business Rules
- Tickets can only be archived after the event has ended (at least 1 day ago)
- Only ticket owners can archive/restore their tickets
- Archived tickets are not deleted, just hidden from default view
- All ticket data (QR codes, purchase info, etc.) is preserved

## Migration File
`/workspaces/EventNexus/supabase/migrations/20251230_add_ticket_archive.sql`

## Security
- RLS policies ensure users can only view/modify their own tickets
- Database functions use `SECURITY DEFINER` with proper validation
- All archive operations are logged with user ID and timestamp

## Future Enhancements
- Bulk archive/restore operations
- Auto-archive tickets after X days
- Archive analytics and statistics
- Export archived tickets to PDF/CSV
