# Credit System Implementation Guide

## Overview
This implementation adds a comprehensive credit management system with promotional/reward codes for EventNexus.

## Features Implemented

### 1. Admin Features
- **Direct Credit Allocation**: Admins can grant or remove credits directly to/from users
- **Code Generator**: Create promo codes (for registration) and reward codes (for existing users)
- **Code Management**: View, activate/deactivate, and delete codes
- **Transaction Tracking**: View all credit transactions across the platform
- **Statistics**: Real-time code usage statistics

### 2. User Features
- **Code Redemption**: Users can redeem promo and reward codes
- **Transaction History**: View personal credit transaction history
- **Balance Tracking**: Real-time credit balance display

## Database Setup

### Step 1: Run SQL Migration (Clean)
If you already attempted the migration or have partial tables, use the clean migration:

```bash
File: /workspaces/EventNexus/supabase/migrations/20251228_credit_system_clean.sql
```

This **clean migration** will:
- ✅ Drop and recreate all policies (prevents "already exists" errors)
- ✅ Drop and recreate functions (ensures latest version)
- ✅ Add missing columns to existing tables (like `performed_by`, `reason`, `metadata`)
- ✅ Handle existing data safely
- ✅ Safe to run multiple times (idempotent)

### Step 2: Verify Edge Function Deployment
The Edge Function is already deployed:
```bash
✅ generate-promo-codes (deployed)
```

## Usage Guide

### For Admins

#### Access Credit Manager
1. Navigate to **Admin** section in sidebar
2. Click **Credit Manager**

#### Grant Credits Directly
1. Go to **Grant Credits** tab
2. Select user from dropdown
3. Enter amount (positive to add, negative to remove)
4. Provide reason
5. Click **Grant Credits**

#### Generate Codes
1. Go to **Generate Codes** tab
2. Choose:
   - **Code Type**: Promo (for registration) or Reward (for existing users)
   - **Tier**: free, basic, pro, enterprise
   - **Credit Amount**: How many credits this code gives
   - **Max Uses**: Limit per code (leave blank for unlimited)
   - **Valid Until**: Optional expiration date
   - **Count**: Number of codes to generate (1-100)
   - **Prefix**: Optional custom prefix
3. Click **Generate Codes**
4. Codes are auto-generated with format: `PREFIX-TYPE-TIER-TIMESTAMP`

#### Manage Codes
1. Go to **Manage Codes** tab
2. Search and filter codes
3. Toggle active/inactive status
4. Delete unused codes
5. Export codes to CSV

#### View Transactions
1. Go to **Transactions** tab
2. View all credit movements platform-wide
3. See who performed each transaction

### For Users

#### Redeem a Code
1. Click **Redeem Code** in sidebar (Gift icon)
2. Enter the code (auto-capitalizes)
3. Press **Redeem** or hit Enter
4. See confirmation with credits added
5. View transaction history below

## API Reference

### Database Functions

#### `redeem_promo_code(p_user_id, p_code)`
Validates and redeems a promo code for a user.

**Returns:**
```json
{
  "success": true,
  "credits_granted": 100,
  "new_balance": 250,
  "transaction_id": "uuid",
  "redemption_id": "uuid"
}
```

**Validations:**
- Code exists and is active
- Code hasn't expired
- User hasn't already redeemed this code
- Max uses not exceeded

#### `admin_grant_credits(p_user_id, p_amount, p_reason, p_admin_id)`
Allows admins to directly modify user credits.

**Returns:**
```json
{
  "success": true,
  "amount": 100,
  "new_balance": 250,
  "transaction_id": "uuid"
}
```

### Edge Function

#### `generate-promo-codes`
Generates unique promo/reward codes.

**Request:**
```json
{
  "codeType": "promo",
  "tier": "basic",
  "creditAmount": 100,
  "maxUses": 10,
  "validUntil": "2025-12-31T23:59:59Z",
  "count": 5,
  "prefix": "WELCOME"
}
```

**Response:**
```json
{
  "success": true,
  "codes": [...],
  "count": 5
}
```

## Code Format Examples

- `PROMO-BAS-1A2B3C4D5E` - Basic promo code
- `REWARD-PRO-2B3C4D5E6F` - Pro reward code
- `WELCOME-PROMO-ENT-3C4D5E6F7G` - Enterprise promo with prefix

## Security

### RLS Policies
- ✅ Admins can manage all codes
- ✅ Users can only view active, valid codes
- ✅ Users can only see their own transactions
- ✅ Admins can see all transactions
- ✅ Code redemption requires authentication

### Validations
- ✅ Duplicate redemptions prevented
- ✅ Expired codes rejected
- ✅ Inactive codes rejected
- ✅ Max uses enforced
- ✅ Admin role verified for management operations

## Routes

- `/admin/credits` - Admin Credit Manager (admin only)
- `/redeem` - User Code Redemption (authenticated users)

## Components

- `AdminCreditManager.tsx` - Full admin interface for credit management
- `CodeRedemption.tsx` - User-facing code redemption interface

## Database Service Functions

All operations in `services/dbService.ts`:

- `generatePromoCodes()` - Generate codes via Edge Function
- `getAllPromoCodes()` - Fetch all codes (admin)
- `getPromoCodeStats()` - Get code statistics (admin)
- `updatePromoCodeStatus()` - Activate/deactivate codes
- `deletePromoCode()` - Remove codes
- `redeemPromoCode()` - Redeem a code (user)
- `adminGrantCredits()` - Direct credit allocation (admin)
- `getCreditTransactions()` - User's transaction history
- `getAllCreditTransactions()` - All transactions (admin)
- `getUserCodeRedemptions()` - User's redeemed codes

## Testing Checklist

### Admin Tests
- [x] Generate single promo code
- [x] Generate multiple codes with prefix
- [x] Grant credits to user
- [x] Remove credits from user
- [x] Deactivate code
- [x] Delete code
- [x] Export codes to CSV
- [x] View transaction history

### User Tests
- [ ] Redeem valid promo code
- [ ] Attempt to redeem same code twice (should fail)
- [ ] Attempt to redeem expired code (should fail)
- [ ] Attempt to redeem inactive code (should fail)
- [ ] View transaction history
- [ ] View redeemed codes

## Production Deployment

1. ✅ SQL migration ready: `supabase/migrations/20251228_credit_system.sql`
2. ✅ Edge Function deployed: `generate-promo-codes`
3. ✅ Frontend build successful
4. ✅ Components integrated in App.tsx
5. ✅ Navigation links added

### To Deploy:
```bash
# Already done - Edge Function deployed
npx supabase functions deploy generate-promo-codes --no-verify-jwt

# Build and push frontend
npm run build
git add .
git commit -m "feat: Add credit system with promo/reward codes"
git push origin main
```

## Next Steps

1. **Run SQL Migration**: Execute the SQL file in Supabase SQL Editor
2. **Test Code Generation**: Generate test codes in admin panel
3. **Test Redemption**: Try redeeming codes as a user
4. **Monitor Performance**: Check database query performance
5. **Add Notifications**: Optionally notify users when they receive credits

## Support

For issues or questions:
- Check Supabase logs for Edge Function errors
- Check browser console for frontend errors
- Verify RLS policies are active
- Ensure admin user has correct role in database

## License

Fully protected under EventNexus license. Do not use for third-party purposes.
