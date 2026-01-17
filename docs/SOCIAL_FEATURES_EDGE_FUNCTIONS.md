# Social Features Edge Functions Deployment Guide

## New Edge Functions

Three new Edge Functions have been created to support the Phase 2 social features (buddy matching, friend requests, and event reviews):

### 1. buddy-matching
**Purpose:** AI-powered friend matching algorithm that analyzes user interests, events attended, and activity patterns to suggest compatible friends.

**Algorithm:**
- Calculates category overlap (50% weight)
- Matches time preferences (20% weight)
- Matches day preferences (20% weight)
- Considers shared events (10% weight)
- Returns similarity score (0-1)

**Endpoint:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/buddy-matching`

**Request:**
```json
{
  "limit": 15  // Optional, default 15
}
```

**Response:**
```json
{
  "matches": [
    {
      "user_id": "uuid",
      "name": "User Name",
      "avatar": "https://...",
      "bio": "User bio",
      "common_categories": ["music", "sports"],
      "common_event_count": 3,
      "similarity_score": 0.75
    }
  ],
  "total": 10,
  "algorithm": "weighted_interest_similarity",
  "timestamp": "2026-01-17T..."
}
```

### 2. send-friend-request-notification
**Purpose:** Sends email and in-app notifications when a user sends or accepts a friend request.

**Endpoint:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-friend-request-notification`

**Request:**
```json
{
  "buddyId": "uuid",
  "action": "created" | "accepted"
}
```

**Actions:**
- `created`: Sends notification to recipient of friend request
- `accepted`: Sends notification to original requester

**Features:**
- Professional HTML email templates
- In-app notification creation
- Shows shared interests in email
- User avatars in emails

### 3. send-review-notification
**Purpose:** Sends email and in-app notifications when an event receives a new review.

**Endpoint:** `https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-review-notification`

**Request:**
```json
{
  "reviewId": "uuid"
}
```

**Features:**
- Notifies event organizer
- Shows star rating and detailed breakdown
- Includes verified attendee badge
- Shows atmosphere/value/organization sub-ratings
- Professional HTML email template
- In-app notification

## Database Triggers Setup

To automatically trigger these functions, add database triggers:

```sql
-- Trigger for friend request notifications
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via pg_net (requires pg_net extension)
  PERFORM net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-friend-request-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'buddyId', NEW.id,
      'action', CASE 
        WHEN TG_OP = 'INSERT' THEN 'created'
        WHEN NEW.status = 'accepted' AND OLD.status = 'pending' THEN 'accepted'
        ELSE NULL
      END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_request_notification_trigger
AFTER INSERT OR UPDATE ON user_buddies
FOR EACH ROW
WHEN (
  TG_OP = 'INSERT' OR 
  (NEW.status = 'accepted' AND OLD.status = 'pending')
)
EXECUTE FUNCTION notify_friend_request();

-- Trigger for review notifications
CREATE OR REPLACE FUNCTION notify_event_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-review-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('reviewId', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_notification_trigger
AFTER INSERT ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION notify_event_review();
```

## Deployment Commands

### Deploy All Three Functions

```bash
# Navigate to project root
cd /workspaces/EventNexus

# Deploy buddy-matching
npx supabase functions deploy buddy-matching --project-ref anlivujgkjmajkcgbaxw

# Deploy send-friend-request-notification
npx supabase functions deploy send-friend-request-notification --project-ref anlivujgkjmajkcgbaxw

# Deploy send-review-notification
npx supabase functions deploy send-review-notification --project-ref anlivujgkjmajkcgbaxw
```

### Deploy with Environment Variables

These functions require the following environment variables (set in Supabase Dashboard > Edge Functions):

```bash
SUPABASE_URL=https://anlivujgkjmajkcgbaxw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
RESEND_API_KEY=<your-resend-api-key>  # For email notifications
```

### Test Functions

```bash
# Test buddy-matching
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/buddy-matching \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Test friend request notification
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-friend-request-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"buddyId": "uuid", "action": "created"}'

# Test review notification
curl -X POST https://anlivujgkjmajkcgbaxw.supabase.co/functions/v1/send-review-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reviewId": "uuid"}'
```

## Integration with Frontend

### Call buddy-matching from dbService.ts

```typescript
export const getBuddyMatches = async (userId: string, limit: number = 10): Promise<any[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('buddy-matching', {
      body: { limit }
    });

    if (error) throw error;
    return data?.matches || [];
  } catch (error) {
    console.error('Error fetching buddy matches:', error);
    return [];
  }
};
```

### Trigger notifications from dbService.ts

```typescript
export const sendBuddyRequest = async (userId1: string, userId2: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('user_buddies')
      .insert([{
        user_id_1: userId1,
        user_id_2: userId2,
        status: 'pending',
        initiated_by: userId1
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Trigger notification Edge Function
    await supabase.functions.invoke('send-friend-request-notification', {
      body: { buddyId: data.id, action: 'created' }
    });

    return data;
  } catch (error) {
    console.error('Error sending buddy request:', error);
    return null;
  }
};
```

## Monitoring

Check Edge Function logs in Supabase Dashboard:
1. Go to Edge Functions section
2. Select function
3. View Logs tab
4. Monitor requests, errors, and execution time

## Troubleshooting

### Function not found error
- Ensure functions are deployed: `npx supabase functions list --project-ref anlivujgkjmajkcgbaxw`
- Check deployment logs for errors

### Email not sending
- Verify `RESEND_API_KEY` is set correctly in Edge Function settings
- Check Resend dashboard for email delivery status
- Verify sender domain is verified in Resend

### Authorization errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set for notification functions
- Use user token for buddy-matching function
- Check RLS policies on tables

### No matches returned
- Ensure user has interests set in `user_interests` table
- Check that other users have `is_public = true` for their interests
- Verify user is not already friends with potential matches

## Next Steps

1. Deploy functions to Supabase
2. Set up environment variables in Supabase Dashboard
3. Create database triggers (optional, for automatic notifications)
4. Update dbService.ts to use Edge Functions
5. Test in development environment
6. Monitor logs and adjust as needed
7. Deploy to production

## Related Documentation

- [Phase 2 Social Features Migration](../supabase/migrations/20260117000002_phase2_buddy_communities_reviews.sql)
- [BuddyMatching Component](../src/components/BuddyMatching.tsx)
- [EventReviews Component](../src/components/EventReviews.tsx)
- [Database Service](../src/services/dbService.ts)
