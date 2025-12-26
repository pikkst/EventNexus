# Production Transition Feature

## Overview

This feature provides a one-click button for admin users to transition the EventNexus platform from development/sandbox mode to production mode. The transition is irreversible and performs multiple critical changes across the entire system.

## Components

### 1. **SQL Migration** (`sql/production_transition.sql`)

Creates the database schema for production transitions:

- **`environment_config` table**: Stores environment-specific configurations (development, staging, production)
- **`production_transition_log` table**: Audit log of all transitions
- **Functions**:
  - `transition_to_production()`: Main orchestrator function
  - `get_current_environment()`: Returns active environment config
  - `get_production_transition_history()`: Audit history

### 2. **Edge Function** (`supabase/functions/production-transition/index.ts`)

Serverless function that:
- Verifies admin user authentication
- Validates JWT token
- Calls `transition_to_production()` SQL function
- Logs results
- Returns status to client

**Deployment**: Run `supabase functions deploy production-transition`

### 3. **DB Service** (`services/dbService.ts`)

Three new exported functions:

```typescript
// Trigger production transition
transitionToproduction(
  stripePublicKey?: string,
  apiBaseUrl?: string,
  notes?: string
): Promise<any>

// Get current environment config
getCurrentEnvironment(): Promise<Record<string, any>>

// Get transition audit history
getProductionTransitionHistory(): Promise<any[]>
```

### 4. **Admin UI** (`components/AdminCommandCenter.tsx`)

#### New State:
```typescript
const [showProductionModal, setShowProductionModal] = useState(false);
const [isTransitioningToProduction, setIsTransitioningToProduction] = useState(false);
const [transitionConfirmation, setTransitionConfirmation] = useState('');
const [currentEnvironment, setCurrentEnvironment] = useState<any>(null);
const [transitionHistory, setTransitionHistory] = useState<any[]>([]);
```

#### Button Location:
- **Tab**: Infrastructure > System Health
- **Section**: System Integrity panel
- **Button**: "Go Live Production" (red, rocket icon)

#### Flow:
1. Admin clicks "Go Live Production" button
2. Master Security unlock required (existing security pattern)
3. ProductionTransitionModal appears with:
   - Warning boxes explaining changes
   - Configuration summary
   - Exact confirmation text requirement: `TRANSITION_TO_PRODUCTION`
   - Cancel/Proceed buttons
4. On confirmation:
   - `handleTransitionToProduction()` is called
   - Edge Function triggered
   - Platform transitions to production
   - Success/error notification displayed

## Changes Applied During Transition

### 1. **Environment Configuration**
- Development environment → DISABLED
- Production environment → ACTIVATED
- API base URL → Updated to production
- Stripe mode → `test` → `live`

### 2. **Sandbox & Beta Features**
- All beta tester accounts → DISABLED (`beta_testers.is_active = false`)
- All beta invitations → ARCHIVED (status = 'archived')
- Platform config → `beta_features_enabled = false`
- Platform config → `sandbox_enabled = false`

### 3. **Stripe Configuration**
- Stripe mode → `live` (was `test`)
- Test mode disabled timestamp → Recorded
- Payment processing → Uses live API keys

### 4. **Production Safeguards Enabled**
- Require 2FA for admin access
- Enable audit logging
- Enable DDoS protection
- Enable rate limiting
- Auto backups enabled (hourly)

### 5. **Notifications**
- All admin users receive notification
- Transition ID and changes recorded
- Audit trail preserved

## Security Measures

1. **Master Lock Required**: Must authenticate with Master Security first
2. **Exact Confirmation Text**: `TRANSITION_TO_PRODUCTION` (case-sensitive)
3. **Admin-Only**: Restricted to users with `role = 'admin'`
4. **JWT Verification**: Edge Function validates authentication token
5. **Audit Logging**: All transitions logged with admin ID, timestamp, changes
6. **No Automatic Rollback**: One-way transition (must be manually reversed if needed)

## Deployment Steps

### 1. Run SQL Migration
```sql
-- Execute the entire sql/production_transition.sql file
-- In Supabase SQL Editor: Copy & paste file contents → Run
```

### 2. Deploy Edge Function
```bash
cd /workspaces/EventNexus/supabase/functions/production-transition
supabase functions deploy production-transition
```

Or use Supabase CLI:
```bash
supabase functions deploy
```

### 3. Update Supabase Configuration
```bash
# In supabase/config.toml, add:
[functions.production-transition]
verify_jwt = true
```

### 4. Test Transition
```typescript
// In admin console, click "Go Live Production" button
// Follow the multi-step confirmation process
```

## Rollback (If Needed)

Production transitions are **NOT easily reversed**. If you need to revert:

1. Manually re-enable development environment:
```sql
UPDATE environment_config 
SET is_active = true 
WHERE environment = 'development';

UPDATE environment_config 
SET is_active = false 
WHERE environment = 'production';
```

2. Re-enable beta features:
```sql
UPDATE system_config
SET value = jsonb_build_object('beta_features_enabled', true, 'sandbox_enabled', true)
WHERE key = 'platform_mode';
```

3. Switch Stripe back to test mode (manually in Stripe Dashboard)

4. Create new beta invitations

## Monitoring

Check transition history:
```sql
SELECT * FROM production_transition_log 
ORDER BY transition_date DESC;
```

Check current environment:
```sql
SELECT * FROM get_current_environment();
```

## Testing in Development

To test without affecting live data:

1. Duplicate the transition modal and remove Master Auth requirement
2. Use a test admin account
3. Verify all changes in the database
4. Rollback manually if needed

## Important Notes

- ⚠️ **One-Way Operation**: Once transitioned, reverting requires manual database changes
- ⚠️ **No Data Loss**: Transition modifies configuration, not data
- ⚠️ **Stripe Integration**: Ensure Stripe live keys are pre-configured before transition
- ⚠️ **User Communication**: Notify users before transition (especially beta testers)
- ⚠️ **Backup First**: Always backup database before attempting transition
- ⚠️ **Test Thoroughly**: Test all critical paths after transition

## Audit Trail

All transitions are recorded in `production_transition_log`:
- `transitioned_by`: Admin user email
- `transition_date`: Exact timestamp
- `environment_from` / `environment_to`: Source and target environments
- `changes_applied`: JSON object of all changes made
- `status`: 'completed', 'pending', 'in_progress', or 'rolled_back'
- `notes`: Admin notes about the transition

## Future Enhancements

- [ ] Automatic backup before transition
- [ ] Email notifications to stakeholders
- [ ] Staged rollout (beta features stay enabled for selected users)
- [ ] Health checks before/after transition
- [ ] Automatic CDN cache invalidation
- [ ] Scheduled transitions (transition at specific date/time)
