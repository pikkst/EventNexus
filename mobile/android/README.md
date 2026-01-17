# EventNexus Scanner for Android

Native Android app for scanning and validating event tickets.

## Requirements

- Android 8.0 (API 26)+
- Android Studio Hedgehog+
- Kotlin 1.9+

## Setup

1. Open the project in Android Studio:
   ```bash
   cd EventNexusScanner
   # Open in Android Studio or:
   ./gradlew assembleDebug
   ```

2. Sync Gradle dependencies

3. Select device/emulator and run

## Features

- Scanner code authentication
- Real-time QR code scanning with ML Kit
- Instant ticket validation
- Session statistics
- Material Design 3 UI

## Architecture

- **Jetpack Compose**: Modern declarative UI
- **CameraX**: Camera2 API wrapper
- **ML Kit**: Google's ML Kit for QR detection
- **Retrofit**: Type-safe HTTP client
- **Coroutines + Flow**: Async and reactive programming

## Configuration

Supabase credentials are configured in `app/build.gradle`:
```gradle
buildConfigField "String", "SUPABASE_URL", "\"YOUR_URL\""
buildConfigField "String", "SUPABASE_ANON_KEY", "\"YOUR_KEY\""
```

## Permissions

Required permissions in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Building for Release

1. Create signing key:
   ```bash
   keytool -genkey -v -keystore eventnexus_scanner.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias eventnexus_scanner
   ```

2. Configure signing in `app/build.gradle`:
   ```gradle
   signingConfigs {
       release {
           storeFile file("path/to/eventnexus_scanner.jks")
           storePassword "your_password"
           keyAlias "eventnexus_scanner"
           keyPassword "your_password"
       }
   }
   ```

3. Build release:
   ```bash
   ./gradlew bundleRelease
   ```

4. Upload AAB to Google Play Console

## Testing

1. Get scanner code from EventNexus organizer dashboard
2. Enter code in login screen
3. Grant camera permission when prompted
4. Scan test ticket QR code
5. Verify validation success

## Troubleshooting

**Build errors:**
- Clean: Build → Clean Project
- Invalidate caches: File → Invalidate Caches / Restart

**Camera not working:**
- Check permission granted
- Verify camera hardware available
- Test on physical device (emulator cameras are limited)

**QR detection failing:**
- Ensure adequate lighting
- Hold QR code steady and centered
- Check ML Kit dependency in build.gradle

## Support

Contact: huntersest@gmail.com
