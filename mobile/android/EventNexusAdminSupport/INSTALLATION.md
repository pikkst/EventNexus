# EventNexus Admin Support - Paigaldusjuhend

## 1. Firebase Setup

### Firebase projekti loomine

1. Mine [Firebase Console](https://console.firebase.google.com/)
2. Loo uus projekt või vali olemasolev "EventNexus"
3. Lisa Android rakendus:
   - Package name: `eu.eventnexus.adminsupport`
   - App nickname: `EventNexus Admin Support`
4. Lae alla `google-services.json`
5. Kopeeri see faili: `mobile/android/EventNexusAdminSupport/app/google-services.json`

### Firebase Cloud Messaging setup

1. Firebase Console → Project Settings → Cloud Messaging
2. Genereeri "Server key" (kui puudub)
3. Salvesta see Supabase'i:

```bash
npx supabase secrets set FIREBASE_SERVER_KEY="your_server_key_here"
```

## 2. Supabase Setup

### Edge Function push-teavituste jaoks

Loo fail: `supabase/functions/send-support-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { chatId, adminId, message, userName } = await req.json()

    // Get admin FCM token
    const { data: admin } = await supabaseClient
      .from('users')
      .select('fcm_token')
      .eq('id', adminId)
      .single()

    if (!admin?.fcm_token) {
      return new Response(JSON.stringify({ error: 'No FCM token' }), {
        status: 400
      })
    }

    // Send FCM notification
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${Deno.env.get('FIREBASE_SERVER_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: admin.fcm_token,
        notification: {
          title: 'New Support Message',
          body: `${userName}: ${message}`,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        data: {
          chat_id: chatId,
          user_name: userName,
          message: message
        }
      })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    })
  }
})
```

Deploy:

```bash
npx supabase functions deploy send-support-notification
```

### Database trigger

Lisa `users` tabelisse FCM token väli ja loo trigger:

```sql
-- Add FCM token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create trigger function to notify admins
CREATE OR REPLACE FUNCTION notify_admin_new_message()
RETURNS TRIGGER AS $$
DECLARE
  admin_ids UUID[];
  admin_id UUID;
  chat_user_name TEXT;
BEGIN
  -- Only notify on new user messages
  IF NEW.sender_type != 'user' THEN
    RETURN NEW;
  END IF;

  -- Get user name
  SELECT COALESCE(u.full_name, u.email, 'Anonymous')
  INTO chat_user_name
  FROM support_chats sc
  LEFT JOIN users u ON sc.user_id = u.id
  WHERE sc.id = NEW.chat_id;

  -- Get all admin users with FCM tokens
  SELECT ARRAY_AGG(id)
  INTO admin_ids
  FROM users
  WHERE role = 'admin' AND fcm_token IS NOT NULL;

  -- Send notification to each admin
  FOREACH admin_id IN ARRAY admin_ids
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-support-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'chatId', NEW.chat_id,
        'adminId', admin_id,
        'message', NEW.message,
        'userName', chat_user_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_new_support_message ON support_chat_messages;
CREATE TRIGGER on_new_support_message
  AFTER INSERT ON support_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_message();
```

## 3. App ehitamine

### Development build

```bash
cd mobile/android/EventNexusAdminSupport
chmod +x build-apk.sh
./build-apk.sh
```

APK asukoht: `app/build/outputs/apk/debug/app-debug.apk`

### Production build

1. Genereeri keystore:

```bash
keytool -genkey -v -keystore eventnexus-admin.keystore \
  -alias eventnexus -keyalg RSA -keysize 2048 -validity 10000
```

2. Lisa `app/build.gradle.kts` faili:

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("../eventnexus-admin.keystore")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = "eventnexus"
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            // ... existing config
        }
    }
}
```

3. Ehita:

```bash
export KEYSTORE_PASSWORD="your_password"
export KEY_PASSWORD="your_password"
./gradlew assembleRelease
```

## 4. Levitamine

### Variant 1: Direct Download (otse veebilehelt)

1. Lae APK üles veebiserverisse või Supabase Storage'sse:

```bash
npx supabase storage cp app/build/outputs/apk/release/app-release.apk \
  supabase://apks/eventnexus-admin-support.apk --project-ref anlivujgkjmajkcgbaxw
```

2. Lisa download link EventNexus veebilehele:

```tsx
// src/components/AdminCommandCenter.tsx
<Button
  onClick={() => {
    window.open('https://anlivujgkjmajkcgbaxw.supabase.co/storage/v1/object/public/apks/eventnexus-admin-support.apk')
  }}
>
  📱 Download Admin App
</Button>
```

### Variant 2: Google Play Store (Internal Testing)

1. Mine [Google Play Console](https://play.google.com/console)
2. Loo uus rakendus
3. Seadista Internal Testing
4. Lae üles APK või AAB bundle:

```bash
./gradlew bundleRelease
# Upload app/build/outputs/bundle/release/app-release.aab
```

## 5. Kasutajate jaoks

### Android seadistus

1. Lae alla APK
2. Kui "Unknown sources" error:
   - Settings → Security → Install unknown apps
   - Luba veebilehitseja/Downloadide jaoks
3. Installi APK
4. Ava rakendus
5. Logi sisse admin kontoga
6. Luba push-teavitused

### Troubleshooting

**Push-teavitused ei tööta:**
- Kontrolli, et Firebase on õigesti seadistatud
- Veendu, et `google-services.json` on õige
- Kontrolli, et teavituste luba on antud
- Vaata logisid: `adb logcat | grep FCM`

**Login ei tööta:**
- Veendu, et Supabase URL ja anon key on õiged
- Kontrolli internetiühendust
- Vaata, et admin konto on "admin" rolliga

**Vestlused ei laadi:**
- Veendu, et RLS policies lubavad adminitel lugeda `support_chats`
- Kontrolli reaalajas sünkroniseerimist Supabase'is

## 6. Maintenance

### Uuenduste publishimine

1. Muuda `versionCode` ja `versionName` failis `app/build.gradle.kts`
2. Ehita uus APK
3. Lae üles samasse asukohta
4. Kasutajad saavad notification app'is (optional feature)

### Monitoring

- Firebase Console → Analytics → saad näha kasutajate arvu
- Supabase → Logs → näed API calls
- Edge Function logs: `npx supabase functions logs send-support-notification`
