-- Add FCM token support for admin mobile app push notifications
-- This migration adds FCM token column and creates notification trigger

-- Add FCM token column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;

-- Create function to notify admins of new support messages via FCM
CREATE OR REPLACE FUNCTION notify_admin_new_support_message()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  chat_user_name TEXT;
  chat_user_email TEXT;
BEGIN
  -- Only notify on new visitor messages (not admin or AI replies)
  IF NEW.author_type != 'visitor' THEN
    RETURN NEW;
  END IF;

  -- Get user info from the thread
  SELECT 
    COALESCE(u.full_name, u.email, st.guest_email, 'Anonymous User') as user_name,
    COALESCE(u.email, st.guest_email) as user_email
  INTO chat_user_name, chat_user_email
  FROM support_threads st
  LEFT JOIN users u ON st.user_id = u.id
  WHERE st.id = NEW.thread_id;

  -- Notify all admins with FCM tokens
  FOR admin_record IN 
    SELECT id, fcm_token, email
    FROM users
    WHERE role = 'admin' 
      AND fcm_token IS NOT NULL 
      AND fcm_token != ''
  LOOP
    -- Call Edge Function to send FCM notification
    -- This uses pg_net extension (needs to be enabled)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-support-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'threadId', NEW.thread_id,
        'adminId', admin_record.id,
        'message', NEW.content_original,
        'userName', chat_user_name,
        'userEmail', chat_user_email
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_support_message_fcm ON support_messages;
CREATE TRIGGER on_new_support_message_fcm
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_support_message();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;

-- Add comment
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for admin mobile app push notifications';
COMMENT ON FUNCTION notify_admin_new_support_message() IS 'Sends FCM push notification to admin mobile apps when new user message arrives';
