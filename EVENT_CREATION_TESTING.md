# Event Creation Testing Guide

## Fixed Issues
✅ **Bug #1:** Database date/time field mismatch - events failing to save  
✅ **Bug #2:** Ticket templates not persisting after event creation

## What Was Fixed
1. **services/dbService.ts** - `createEvent()` function now properly combines `date` + `time` into ISO timestamp for database
2. **components/EventCreationFlow.tsx** - Added `createTicketTemplates()` call after event creation succeeds
3. **Added debug logging** - Console logs at every step for easier troubleshooting

## Testing Steps

### Test 1: Basic Event Creation (No Tickets)
1. Navigate to `/create-event` or click "Create Event" button
2. **Step 1 - The Basics:**
   - Event Name: "Test Event 1"
   - Category: Select any (e.g., "Music")
   - Tagline: Click "AI Generate" or type manually
3. **Step 2 - When & Where:**
   - Start Date: Select tomorrow's date
   - Start Time: Select "18:00"
   - Location: Type address and click "Search"
4. **Step 3 - Event Image:**
   - Either upload an image OR click "AI Generate Image"
   - Verify preview appears
5. **Step 4 - Tickets & Pricing:**
   - Leave default "General Admission" ticket
   - Set visibility to "Public"
6. **Step 5 - Review & Publish:**
   - Click "Publish Event"
   - **Expected:** "Event created successfully!" alert
   - **Expected:** Redirect to dashboard
   - **Expected:** Event appears in dashboard list

**Console Check:**
```
📤 Calling createEvent()...
📅 Date conversion: { input: "2025-02-01 18:00", output: "2025-02-01T18:00:00.000Z" }
📥 createEvent() response: success
✅ Event created successfully!
🎫 Creating 1 ticket templates...
✅ Ticket templates created successfully!
🎉 Navigating to dashboard...
```

### Test 2: Event with Multiple Ticket Types
1. Navigate to `/create-event`
2. Complete Steps 1-3 same as Test 1
3. **Step 4 - Tickets & Pricing:**
   - Ticket 1: "General Admission" - $10 - 100 quantity
   - Click "+ Add Another Ticket Type"
   - Ticket 2: "VIP Access" - $25 - 50 quantity
   - Click "+ Add Another Ticket Type"
   - Ticket 3: "Early Bird" - $8 - 30 quantity
4. **Step 5:**
   - Review total capacity: Should show 180 tickets
   - Price range: Should show $8 - $25
   - Click "Publish Event"

**Database Verification:**
```sql
-- Check event exists
SELECT id, name, date, end_date FROM events WHERE name = 'Test Event 1';

-- Check ticket templates (use event ID from above)
SELECT * FROM ticket_templates WHERE event_id = 'YOUR_EVENT_ID';

-- Expected: 3 rows (General Admission, VIP Access, Early Bird)
```

### Test 3: Multi-Day Event with End Date
1. Navigate to `/create-event`
2. **Step 2 - When & Where:**
   - Start Date: 2025-02-15
   - Start Time: 10:00
   - End Date: 2025-02-17 ← **Important!**
   - End Time: 22:00
3. Complete other steps and publish

**Console Check:**
```
📅 Date conversion: { input: "2025-02-15 10:00", output: "2025-02-15T10:00:00.000Z" }
📅 End date conversion: { input: "2025-02-17 22:00", output: "2025-02-17T22:00:00.000Z" }
```

**Database Check:**
```sql
SELECT 
  name, 
  date, 
  end_date,
  EXTRACT(EPOCH FROM (end_date - date))/3600 as duration_hours
FROM events 
WHERE name LIKE '%Test%' 
  AND end_date IS NOT NULL;
-- Expected: duration_hours ≈ 60 hours (2.5 days)
```

### Test 4: Free Tier Event Unlock
1. Log in as free tier user
2. Navigate to `/create-event`
3. **Expected:** See "Become a Creator" gate
4. Click "Unlock 1 Event (15 Credits)"
5. Confirm unlock
6. **Expected:** Event creation form unlocks
7. Complete event creation
8. **Expected:** Event saves successfully

### Test 5: Error Handling
Test that events still create even if ticket creation fails:

1. Open DevTools Console
2. Create event with 3 ticket types
3. **Manually simulate ticket creation failure:**
   - In browser DevTools, add breakpoint in EventCreationFlow.tsx at `createTicketTemplates` call
   - Modify `created.id` to invalid UUID
   - Resume execution
4. **Expected:** 
   - ⚠️ Console warning: "Failed to create ticket templates"
   - ✅ Event still created successfully
   - User still navigated to dashboard
   - Event appears in list

## Known Issues to Watch For

### Issue: "Cannot read property 'id' of null"
**Cause:** Event creation failed but code tried to create tickets anyway  
**Fixed:** Added null check: `if (created) { ... }`

### Issue: "Column 'time' does not exist"
**Cause:** Database has `date` as TIMESTAMP, not separate `date` and `time` columns  
**Fixed:** Combine date+time into ISO string before INSERT

### Issue: Events not appearing in dashboard
**Possible Causes:**
1. Event visibility set to "private" - check if viewing as correct user
2. Date parsing failed - check console for date conversion errors
3. Database INSERT failed silently - check Network tab for 400/500 errors
4. RLS policies blocking read - check Supabase logs

## Database Quick Checks

### Count events by organizer
```sql
SELECT 
  u.name as organizer,
  COUNT(e.id) as event_count,
  MAX(e.created_at) as latest_event
FROM events e
JOIN users u ON e.organizer_id = u.id
GROUP BY u.name
ORDER BY event_count DESC;
```

### Check recent events with ticket counts
```sql
SELECT 
  e.id,
  e.name,
  e.date,
  COUNT(DISTINCT tt.id) as ticket_types,
  SUM(tt.quantity_total) as total_capacity,
  SUM(tt.quantity_sold) as tickets_sold
FROM events e
LEFT JOIN ticket_templates tt ON e.id = tt.event_id
WHERE e.created_at > NOW() - INTERVAL '1 hour'
GROUP BY e.id, e.name, e.date
ORDER BY e.created_at DESC;
```

### Find events without tickets
```sql
SELECT 
  e.id,
  e.name,
  e.created_at
FROM events e
LEFT JOIN ticket_templates tt ON e.id = tt.event_id
WHERE tt.id IS NULL
  AND e.created_at > NOW() - INTERVAL '24 hours';
-- If this returns results, ticket creation is failing
```

## Success Criteria
- [ ] Event appears in dashboard immediately after creation
- [ ] Ticket templates saved with correct types, prices, quantities
- [ ] Start date/time stored correctly as TIMESTAMP
- [ ] End date/time stored correctly for multi-day events
- [ ] Public events visible on map
- [ ] Private events hidden from map but accessible via link
- [ ] AI image generation works (if unlocked/Pro+)
- [ ] Auto-translation works for Pro+ users
- [ ] Free tier users can unlock and create 1 event
- [ ] Console logs show successful flow without errors

## Rollback Plan
If issues persist:
```bash
cd /workspaces/EventNexus
git revert HEAD~2  # Reverts last 2 commits
npm run build
git push origin main
```

## Next Steps After Testing
1. ✅ Verify events persist correctly
2. Test ticket purchase flow
3. Test QR code generation and scanning
4. Test organizer statistics dashboard
5. Test refund/cancellation flow
6. Add automated integration tests
