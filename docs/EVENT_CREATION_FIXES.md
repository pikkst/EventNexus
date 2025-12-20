# Event Creation and Display Fixes

## Issues Fixed

1. **Missing Max Capacity Field**: Added `max_capacity` field to event creation form
2. **Event Creation Not Working**: Fixed event creation to properly map fields to database schema
3. **Organized Events Not Showing**: Added "My Organized Events" section to user profile
4. **Events Not Appearing on Map**: Fixed data transformation between database and TypeScript interfaces

## Changes Made

### 1. EventCreationFlow.tsx
- Added `max_capacity` field to form data state (default: 100)
- Added max capacity input field in step 3 (Privacy & Visibility)
- Properly bound date, time, and location fields to form state
- Implemented `handlePublish` function to create events in database
- Added loading state for event creation with proper error handling

### 2. services/dbService.ts
- Added `transformEventFromDB` helper function to convert snake_case database fields to camelCase TypeScript
- Created `getOrganizerEvents` function to fetch events by organizer_id
- Updated `createEvent` to properly map TypeScript fields to database schema:
  - `organizerId` → `organizer_id`
  - `imageUrl` → `image`
  - `attendeesCount` → `attendees_count`
  - `maxAttendees` → `max_capacity`
  - Combined `date` and `time` into timestamp
- Updated `getEvents` to filter by status='active' and transform results
- All event queries now use the transformer for consistent data format

### 3. UserProfile.tsx
- Imported `getOrganizerEvents` and `EventNexusEvent` type
- Added `organizedEvents` state to store user's created events
- Added useEffect to load organized events on component mount
- Created "My Organized Events" section (only visible for paid users)
- Shows event cards with category, date, location, and attendee count
- Clicking an event navigates to event detail page
- Shows "Create Event" button when no events exist

### 4. Database Migration
- Created migration file `20250120000001_add_visibility_field.sql`
- Adds `visibility` column to events table (public/private/semi-private)
- Adds database indexes for better query performance:
  - `idx_events_visibility` on visibility field
  - `idx_events_status` on status field
  - `idx_events_organizer_id` on organizer_id field

## Deployment Steps

### 1. Apply Database Migration
Run this migration in Supabase SQL Editor:
```bash
# Navigate to Supabase dashboard → SQL Editor
# Run the migration file: supabase/migrations/20250120000001_add_visibility_field.sql
```

Or use Supabase CLI:
```bash
cd supabase
supabase migration up
```

### 2. Verify Database Schema
Check that the events table has these columns:
- `id` (UUID)
- `name` (TEXT)
- `description` (TEXT)
- `category` (TEXT)
- `date` (TIMESTAMP WITH TIME ZONE)
- `location` (JSONB)
- `price` (NUMERIC)
- `organizer_id` (UUID)
- `image` (TEXT)
- `attendees_count` (INTEGER)
- `max_capacity` (INTEGER)
- `status` (TEXT) - should be 'active', 'cancelled', 'completed', or 'draft'
- `visibility` (TEXT) - should be 'public', 'private', or 'semi-private'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3. Test Event Creation
1. Log in with a paid account (Pro, Premium, or Enterprise tier)
2. Navigate to `/create-event`
3. Fill out the 4-step form:
   - Step 1: Name, Category, Tagline (AI-generated)
   - Step 2: Date, Time, Location
   - Step 3: Visibility, Price, **Max Capacity**
   - Step 4: Review and Publish
4. Click "Publish Event"
5. Verify event is created in database with status='active'

### 4. Verify Profile Display
1. Navigate to user profile page
2. Verify "My Organized Events" section appears (for paid users only)
3. Check that the newly created event appears in this section
4. Click on event to verify navigation to event detail page

### 5. Verify Map Display
1. Navigate to `/map`
2. Verify newly created events appear as markers on the map
3. Check that events are filterable by category
4. Click on event marker to see event details popup

## Technical Notes

### Database Field Mapping
The database uses snake_case while TypeScript uses camelCase:
- `organizer_id` ↔ `organizerId`
- `attendees_count` ↔ `attendeesCount`
- `max_capacity` ↔ `maxAttendees`

The `transformEventFromDB` function handles this conversion automatically.

### Event Status Flow
- New events are created with `status='active'`
- Only active events appear on the public map
- Organizers see all their events regardless of status

### RLS Policies
Events table should have these policies:
- **SELECT**: Public can view active events, organizers can view all their events
- **INSERT**: Authenticated users with paid subscriptions can create events
- **UPDATE**: Only event organizer can update
- **DELETE**: Only event organizer can delete

## Troubleshooting

### Issue: Events not appearing on map
**Solution**: Check that:
1. Event status is 'active' in database
2. Event has valid location JSONB with lat/lng
3. RLS policies allow SELECT on events table

### Issue: Cannot create events
**Solution**: Verify:
1. User has paid subscription (Pro, Premium, or Enterprise)
2. All required fields are filled (name, category, date, time)
3. User is authenticated (has valid session)
4. RLS policies allow INSERT for the user

### Issue: Organized events not showing on profile
**Solution**: Check:
1. User has paid subscription (section only shows for paid users)
2. Events exist with matching `organizer_id`
3. `getOrganizerEvents` function is working correctly

### Issue: Database errors on event creation
**Solution**: 
1. Run the visibility migration if not already applied
2. Check that all required columns exist in events table
3. Verify user has valid UUID in database
4. Check Supabase logs for detailed error messages

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Max capacity field appears in event creation form
- [ ] Events can be created with all fields populated
- [ ] Created events appear in database with correct fields
- [ ] Organized events section appears on paid user profiles
- [ ] Events display correctly on the map
- [ ] Event markers are clickable and show details
- [ ] Category filtering works on map
- [ ] Event detail page loads correctly when clicked

## Next Steps

Consider implementing:
1. Event editing functionality
2. Event cancellation/deletion
3. Event duplication feature
4. Bulk event management
5. Event analytics dashboard
6. Attendee management interface
7. Ticket sales tracking
