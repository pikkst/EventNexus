#!/bin/bash

# Deploy Admin Support Mobile App Infrastructure
# This script deploys all backend components needed for the admin mobile app

set -e

echo "🚀 Deploying Admin Support Mobile App Infrastructure..."

# Check if supabase CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Install Node.js first."
    exit 1
fi

echo ""
echo "📊 Step 1: Running database migrations..."
npx supabase db push

echo ""
echo "⚡ Step 2: Deploying Edge Functions..."

# Deploy send-support-notification function
npx supabase functions deploy send-support-notification --no-verify-jwt

echo ""
echo "🔑 Step 3: Setting environment variables..."

# Check for Firebase Server Key
if [ -z "$FIREBASE_SERVER_KEY" ]; then
    echo "⚠️  FIREBASE_SERVER_KEY not set in environment"
    echo ""
    echo "To enable push notifications, you need to:"
    echo "1. Go to Firebase Console: https://console.firebase.google.com/"
    echo "2. Select your project"
    echo "3. Go to Project Settings → Cloud Messaging"
    echo "4. Copy the 'Server key'"
    echo "5. Run: npx supabase secrets set FIREBASE_SERVER_KEY=your_key_here"
    echo ""
else
    npx supabase secrets set FIREBASE_SERVER_KEY="$FIREBASE_SERVER_KEY" 2>/dev/null || echo "✅ FIREBASE_SERVER_KEY already set"
fi

# Set Supabase URL for Edge Function
SUPABASE_URL="https://anlivujgkjmajkcgbaxw.supabase.co"
npx supabase secrets set SUPABASE_URL="$SUPABASE_URL" 2>/dev/null || echo "✅ SUPABASE_URL already set"

echo ""
echo "✅ Backend deployment complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Setup Firebase Project:"
echo "   - Go to: https://console.firebase.google.com/"
echo "   - Create/select project 'EventNexus'"
echo "   - Add Android app with package: eu.eventnexus.adminsupport"
echo "   - Download google-services.json"
echo "   - Place it in: mobile/android/EventNexusAdminSupport/app/"
echo ""
echo "2. Build the Android App:"
echo "   cd mobile/android/EventNexusAdminSupport"
echo "   chmod +x build-apk.sh"
echo "   ./build-apk.sh"
echo ""
echo "3. Upload APK for distribution:"
echo "   npx supabase storage cp app/build/outputs/apk/release/app-release.apk \\"
echo "     supabase://apks/eventnexus-admin-support.apk"
echo ""
echo "4. Test notifications:"
echo "   - Install app on Android device"
echo "   - Login as admin"
echo "   - Send test message from web chat"
echo "   - Verify push notification arrives"
echo ""
echo "🔗 Useful links:"
echo "   Edge Function logs: npx supabase functions logs send-support-notification"
echo "   Firebase Console: https://console.firebase.google.com/"
echo "   Installation guide: mobile/android/EventNexusAdminSupport/INSTALLATION.md"
