# Organizer Payment Setup Flow

## Overview
EventNexus requires event organizers to complete Stripe Connect onboarding before they can sell tickets. This ensures all payment processing is secure and compliant with financial regulations.

## User Experience Flow

### 1. Event Creation
- ✅ Organizers can create events even without payment setup
- ✅ Events are visible to all users
- ❌ Ticket sales are blocked until payment setup is complete

### 2. Organizer Dashboard
When organizer views their event in **Organizer Studio**:
```
Set Up Payouts
Complete your Stripe Connect onboarding to receive payouts from ticket sales. 
This takes about 5 minutes.

✓ Verify your identity (required by financial regulations)
✓ Add your bank account for payouts  
✓ Start receiving earnings automatically
```

### 3. Ticket Purchase Attempt (Before Setup)
When users try to buy tickets before organizer completes setup:

**Warning Banner Displayed:**
```
⚠️ Ticket Sales Not Available Yet
The event organizer is still completing their payment setup. 
Tickets will be available for purchase once the setup is complete. 
Please check back later or contact the organizer for updates.
```

**Buy Buttons:**
- Status: Disabled
- Text: "Not Available"
- Cannot be clicked

**Alert on Click Attempt:**
```
⚠️ Ticket sales are not yet available for this event.

The event organizer needs to complete their payment setup first. 
Please check back later or contact the organizer.
```

### 4. After Payment Setup Complete
- ✅ Warning banner disappears
- ✅ Buy buttons become active
- ✅ Users can purchase tickets normally
- ✅ Payments flow to organizer's connected Stripe account

## Technical Implementation

### Frontend Check (EventDetail.tsx)
```typescript
const [organizerPaymentReady, setOrganizerPaymentReady] = useState(false);
const [checkingOrganizerStatus, setCheckingOrganizerStatus] = useState(true);

// Load organizer Stripe Connect status
const connectStatus = await checkConnectStatus(foundEvent.organizerId);
const isReady = connectStatus?.onboardingComplete && connectStatus?.chargesEnabled;
setOrganizerPaymentReady(isReady || false);

// Block purchase if not ready
if (!organizerPaymentReady) {
  alert('⚠️ Ticket sales are not yet available...');
  return;
}
```

### Backend Validation (create-checkout Edge Function)
Already implemented at `/supabase/functions/create-checkout/index.ts`:

```typescript
// Check if organizer has completed Stripe Connect onboarding
if (!event.organizer.stripe_connect_account_id) {
  throw new Error('Event organizer has not set up payment receiving.');
}

if (!event.organizer.stripe_connect_charges_enabled && !isTestMode) {
  throw new Error('Event organizer payment account is not fully activated yet.');
}
```

### Database Fields Used
From `users` table:
- `stripe_connect_account_id` - Stripe Connect account ID
- `stripe_connect_onboarding_complete` - Boolean flag
- `stripe_connect_charges_enabled` - Can accept payments
- `stripe_connect_payouts_enabled` - Can receive payouts

## Benefits

### For Organizers
✅ Clear guidance on what needs to be done  
✅ Professional payment processing  
✅ Automated payouts to bank account  
✅ Platform handles all payment compliance

### For Ticket Buyers
✅ Protected from purchasing from unverified organizers  
✅ Clear messaging when tickets aren't available  
✅ Secure payment processing when available  
✅ Professional checkout experience

### For Platform
✅ Regulatory compliance ensured  
✅ Reduced fraud risk  
✅ Better user trust  
✅ Clean payment audit trail

## Organizer Setup Steps

1. **Create Event** - Event is published but tickets locked
2. **Go to Organizer Studio** - See "Set Up Payouts" prompt
3. **Click Setup Button** - Redirected to Stripe Connect onboarding
4. **Complete Verification:**
   - Business/personal information
   - Identity verification (passport/ID)
   - Bank account details
   - Tax information
5. **Return to Platform** - Status automatically synced
6. **Tickets Unlocked** - Users can now purchase

## Testing

### Test Mode Behavior
In Stripe test mode (`sk_test_...`):
- Onboarding can be completed with test data
- Some verification requirements are relaxed
- Test purchases work with test cards
- Real money is never processed

### Production Mode
In Stripe live mode (`sk_live_...`):
- Full identity verification required
- Real bank account needed
- Real payments processed
- Full regulatory compliance enforced

## Related Files
- `/components/EventDetail.tsx` - Purchase blocking logic
- `/services/dbService.ts` - `checkConnectStatus()` function
- `/supabase/functions/create-checkout/index.ts` - Backend validation
- `/components/UserProfile.tsx` - Organizer Studio setup prompts

## Future Enhancements
- [ ] Email notification to organizer when setup incomplete
- [ ] Progress indicator showing setup completion %
- [ ] Reminder banner on organizer dashboard
- [ ] Auto-send setup link to new organizers
