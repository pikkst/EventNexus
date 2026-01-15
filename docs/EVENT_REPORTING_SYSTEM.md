# Event Reporting System - Implementation Guide

## Overview

The Event Reporting System allows users to report events with inaccurate information, wrong locations, spam, or other issues. Event organizers can see reports in their Organizer Hub and respond to them, while admins have a complete management interface to moderate reports and delete problematic events from the database.

---

## System Architecture

### 1. **Database Schema**
- **Table:** `event_reports`
- **Fields:**
  - `id` - UUID (primary key)
  - `event_id` - FK to events table
  - `reporter_id` - FK to users table (nullable for anonymous reports)
  - `reporter_email` - Email of reporter (nullable)
  - `report_type` - Enum: `wrong_location`, `wrong_info`, `duplicate`, `spam`, `inappropriate`, `other`
  - `reason` - Text describing the issue
  - `description` - Optional detailed description
  - `status` - Enum: `open`, `acknowledged`, `resolved`, `dismissed`
  - `resolution_notes` - Notes from organizer/admin
  - `resolved_by` - FK to users table (admin who resolved)
  - `resolved_at` - Timestamp
  - `created_at`, `updated_at` - Timestamps

### 2. **RLS Policies**
- Users can view their own reports
- Organizers and admins can update reports for their events
- Admins can delete reports
- Anyone can create reports (anonymous submission supported)

### 3. **Indexes**
- `event_id` - Fast event lookup
- `reporter_id` - Find user's reports
- `status` - Filter by status
- `created_at` - Sort by recency

### 4. **Event Tracking**
- Added `report_count` column to `events` table
- Auto-updated via trigger function

---

## Frontend Components

### 1. **ReportEventModal** (`src/components/ReportEventModal.tsx`)
**Purpose:** Modal for users to submit event reports

**Features:**
- Report type selection (6 categories with icons)
- Reason field (required)
- Detailed description (optional)
- Contact email (optional)
- Success/error feedback
- Accessible form design

**Usage in EventDetail:**
```tsx
<ReportEventModal 
  eventId={event.id}
  eventName={event.name}
  isOpen={isReportModalOpen}
  onClose={() => setIsReportModalOpen(false)}
  onReportSubmitted={handleReportSubmitted}
/>
```

### 2. **UserProfile - Report Badge** (`src/components/UserProfile.tsx`)
**Purpose:** Organizer hub shows events with pending reports

**Features:**
- Red warning banner for events with open reports
- Report count badge on event name
- Expandable report details view
- Shows:
  - Report type
  - Reason
  - Description
  - Reporter email (or "Anonymous")
  - Report date

**Visual Indicator:**
- Warning banner: `bg-red-500/10 border-red-500/30`
- Count badge: Shows number of open reports
- Expandable for review

### 3. **AdminEventReports** (`src/components/AdminEventReports.tsx`)
**Purpose:** Complete admin dashboard for managing all event reports

**Features:**
- Global stats (Total, Open, Acknowledged, Resolved, Dismissed)
- Search functionality
- Status filtering
- Expandable report details
- Resolution notes field
- Action buttons:
  - Acknowledge
  - Mark as Resolved
  - Dismiss
- Delete event from database (with confirmation)

**Navigation:**
- Access via Admin Command Center → "Event Reports" tab
- Icon: Flag

---

## Database Functions

### 1. **createEventReport**
```typescript
export const createEventReport = async (
  eventId: string,
  reportType: string,
  reason: string,
  description?: string,
  reporterEmail?: string
): Promise<EventReport | null>
```
- Creates report and sends notifications to organizer + admins
- Anonymous reports supported

### 2. **getEventReports**
```typescript
export const getEventReports = async (eventId: string): Promise<EventReport[]>
```
- Fetches all reports for an event (organizer/admin access)

### 3. **getEventOpenReportsCount**
```typescript
export const getEventOpenReportsCount = async (eventId: string): Promise<number>
```
- Counts open reports for an event
- Used for badge display

### 4. **updateReportStatus**
```typescript
export const updateReportStatus = async (
  reportId: string,
  status: 'acknowledged' | 'resolved' | 'dismissed',
  resolutionNotes?: string
): Promise<boolean>
```
- Updates report status and sends notification to reporter

### 5. **getAllEventReports**
```typescript
export const getAllEventReports = async (
  status?: string,
  limit: number = 50
): Promise<EventReport[]>
```
- Fetches all reports (admin only)

### 6. **getOrganizerEventsWithReportCounts**
```typescript
export const getOrganizerEventsWithReportCounts = async (
  organizerId: string
): Promise<Array<EventNexusEvent & { report_count: number }>>
```
- Get organizer's events with report counts

---

## Notification System

### Notifications Sent

#### 1. **When Report is Created**
- **To:** Event Organizer
- **Type:** `event_report`
- **Message:** `"⚠️ Event Report: "[Event Name]" has been reported: [reason]`
- **Metadata:** `{ reportType, reportId, reporterEmail }`

- **To:** All Admins
- **Type:** `event_report`
- **Message:** `"🚨 New Event Report: Report received for "[Event Name]": [reason]`
- **Metadata:** `{ reportType, reportId, reporterEmail, eventName }`

#### 2. **When Report Status Updated**
- **To:** Reporter (if they have an account)
- **Type:** `report_response`
- **Messages:**
  - Acknowledged: `"📧 Report Acknowledged: Your report has been acknowledged and is being reviewed."`
  - Resolved: `"📧 Report Resolved: Your report has been resolved. Thank you for helping us improve EventNexus!"`
  - Dismissed: `"📧 Report Dismissed: Your report has been reviewed and dismissed."`

---

## User Flows

### User Reports Event
1. User clicks "Report" button on event detail page
2. ReportEventModal opens
3. User selects report type (6 categories)
4. User enters required "reason"
5. User optionally adds description and email
6. User submits
7. **Result:**
   - Report stored in database
   - Notifications sent to organizer and admins
   - Success message shown
   - Modal closes

### Organizer Reviews Reports
1. Organizer logs into account
2. Goes to Organizer Hub (Dashboard)
3. Sees their events listed
4. Events with open reports show:
   - Red warning banner
   - Red badge with report count
5. Organizer clicks "View Reports" or "Hide Reports"
6. Reports expand showing:
   - Report type
   - Reason
   - Description
   - Reporter contact info
   - Report date
7. Organizer can review and respond as needed

### Admin Manages Reports
1. Admin goes to Admin Command Center
2. Clicks "Event Reports" tab
3. Sees global stats (total, open, acknowledged, etc.)
4. Can filter by status or search
5. Clicks to expand each report
6. For each open report, admin can:
   - Add resolution notes
   - Click "Acknowledge" (yellow status)
   - Click "Resolved" (green status)
   - Click "Dismiss" (gray status)
   - Delete event entirely (with confirmation)
7. Reporter receives notification of status update

---

## Notification Types

Added to `types.ts` Notification interface:
```typescript
type: 'announcement' | 'update' | 'follow_alert' | 'proximity_radar' 
     | 'active_event' | 'contact_inquiry' | 'event_report' | 'report_response'
```

---

## Migration Details

### File: `20260115_event_reporting_system.sql`

**Creates:**
1. `event_reports` table with all fields
2. Indexes on `event_id`, `reporter_id`, `status`, `created_at`
3. RLS policies for access control
4. Function: `count_event_reports(event_id)` - Count open reports
5. Function: `get_event_reports(event_id)` - Get all reports for event
6. Function: `update_report_status(report_id, new_status, notes)` - Update status
7. Trigger: `trigger_update_event_report_count` - Auto-update events.report_count
8. Added `report_count` column to `events` table

---

## TypeScript Types

### EventReport Interface
```typescript
export interface EventReport {
  id: string;
  event_id: string;
  reporter_id?: string;
  reporter_email?: string;
  report_type: 'wrong_location' | 'wrong_info' | 'duplicate' | 'spam' | 'inappropriate' | 'other';
  reason: string;
  description?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}
```

---

## Files Modified/Created

### Created:
1. `/supabase/migrations/20260115_event_reporting_system.sql` - Database schema
2. `/src/components/ReportEventModal.tsx` - Report submission modal
3. `/src/components/AdminEventReports.tsx` - Admin management interface

### Modified:
1. `/src/types.ts` - Added `EventReport` interface, updated `Notification` type
2. `/src/services/dbService.ts` - Added 6 database functions + notification logic
3. `/src/components/EventDetail.tsx` - Added report button and modal integration
4. `/src/components/UserProfile.tsx` - Added report badge display in organizer hub
5. `/src/components/AdminCommandCenter.tsx` - Added event-reports tab

---

## Access Control

### Who Can Report?
- **Anyone** (authenticated or anonymous)
- Anonymous reports: stored with email only

### Who Can View Reports?
- **Organizer:** Can see reports for their own events
- **Admin:** Can see all reports
- **Reporter:** Can see their own reports (if authenticated)

### Who Can Update Report Status?
- **Organizer:** Can update status for their own event's reports
- **Admin:** Can update any report status

### Who Can Delete Events?
- **Admin Only:** Can delete events from database due to reports

---

## Notifications Flow

```
User Reports Event
    ↓
Report Created + Notifications Sent
    ├→ To Organizer: "⚠️ Event Report"
    └→ To All Admins: "🚨 New Event Report"
    ↓
Organizer/Admin Reviews & Updates Status
    ↓
Report Status Changed
    ├→ To Reporter: "📧 Report Acknowledged/Resolved/Dismissed"
```

---

## Testing Checklist

- [ ] User can click Report button on event detail
- [ ] ReportEventModal opens with all report types visible
- [ ] User can submit report (required field validation)
- [ ] Notifications sent to organizer and admins
- [ ] Organizer sees report badge in hub
- [ ] Organizer can expand/collapse report details
- [ ] Admin can access Event Reports tab
- [ ] Admin can filter and search reports
- [ ] Admin can acknowledge/resolve/dismiss reports
- [ ] Admin can delete event with confirmation
- [ ] Reporter receives notification of status update
- [ ] Report count auto-updates in events table

---

## Deployment Steps

1. **Apply Migration:**
   ```bash
   supabase db push 20260115_event_reporting_system.sql
   ```

2. **Deploy Frontend:**
   ```bash
   npm run build
   npm run preview  # Test locally
   # Deploy to production
   ```

3. **Verify:**
   - Check event_reports table exists
   - Test report submission flow
   - Verify notifications sent
   - Check organizer hub displays badges
   - Confirm admin panel accessible

---

## Future Enhancements

1. **Automated Actions:**
   - Auto-hide events after N reports
   - Suspend organizer after threshold

2. **Analytics:**
   - Report trends by category
   - Top reported events
   - Organizer reputation scores

3. **Community:**
   - Report voting/consensus
   - Community moderation helpers

4. **Integration:**
   - Email notifications
   - SMS alerts for admins
   - Slack integration for reports

---

## Support

For issues or questions about the event reporting system:
- Check database logs: `supabase logs table event_reports`
- Review notifications in admin panel
- Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'event_reports';`
