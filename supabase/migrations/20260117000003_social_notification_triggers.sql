-- Migration: Social Features Notification Triggers
-- Created: 2026-01-17
-- Purpose: Automatically trigger Edge Functions for friend requests and reviews

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to notify friend request events
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    v_action := 'accepted';
  ELSE
    RETURN NEW; -- No notification needed
  END IF;

  -- Call Edge Function asynchronously via pg_net
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-friend-request-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'buddyId', NEW.id,
      'action', v_action
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend request notifications
DROP TRIGGER IF EXISTS friend_request_notification_trigger ON user_buddies;
CREATE TRIGGER friend_request_notification_trigger
AFTER INSERT OR UPDATE OF status ON user_buddies
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();

-- Function to notify new event reviews
CREATE OR REPLACE FUNCTION notify_event_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function asynchronously via pg_net
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-review-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('reviewId', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for review notifications
DROP TRIGGER IF EXISTS review_notification_trigger ON event_reviews;
CREATE TRIGGER review_notification_trigger
AFTER INSERT ON event_reviews
FOR EACH ROW
EXECUTE FUNCTION notify_event_review();

-- Set configuration (run these manually with actual values)
-- ALTER DATABASE postgres SET app.supabase_url = 'https://anlivujgkjmajkcgbaxw.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';

COMMENT ON FUNCTION notify_friend_request IS 'Triggers send-friend-request-notification Edge Function when buddy status changes';
COMMENT ON FUNCTION notify_event_review IS 'Triggers send-review-notification Edge Function when new review is posted';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION notify_friend_request() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_event_review() TO authenticated;
