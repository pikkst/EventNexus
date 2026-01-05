# EventNexus Mobile Scanner Apps

Complete native mobile applications for iOS and Android to scan event tickets using QR codes.

## Overview

The EventNexus Scanner mobile apps allow event organizers to scan and validate tickets in real-time using their mobile devices. Each organizer receives a unique scanner code when creating an event, which syncs the mobile app to that specific event.

## Features

- **Scanner Code Authentication**: Secure 8-character alphanumeric codes
- **Real-time QR Code Scanning**: Fast camera-based ticket validation
- **Offline-Ready**: Validation queue when connection is lost
- **Live Statistics**: Real-time scan counts and session duration
- **Ticket Information Display**: View attendee details instantly
- **Multi-Scanner Support**: Multiple devices can scan for same event
- **Session Management**: Track scanner usage and history

## Architecture

### Backend (Supabase)

**Database Tables:**
- `scanner_codes`: Stores scanner authentication codes
- `scanner_sessions`: Tracks active mobile app sessions

**Database Functions:**
- `create_scanner_code()`: Generates unique 8-char codes
- `verify_scanner_code()`: Validates scanner code and returns event details
- `record_scanner_usage()`: Logs scanner activity

**Edge Functions:**
- `validate-ticket`: Validates QR codes and updates ticket status

### Web Platform Integration

Scanner codes are automatically generated when an organizer creates an event in [EventCreationFlow.tsx](/workspaces/EventNexus/components/EventCreationFlow.tsx).

**Service Layer:**
- [scannerCodeService.ts](/workspaces/EventNexus/services/scannerCodeService.ts): Web platform scanner code management

## iOS App (Swift + SwiftUI)

**Location:** `/mobile/ios/EventNexusScanner/`

**Key Components:**
- `EventNexusScannerApp.swift`: App entry point
- `ContentView.swift`: Main view router
- `LoginView.swift`: Scanner code authentication
- `ScannerView.swift`: QR scanning interface
- `CameraPreview.swift`: Camera with QR detection (AVFoundation)
- `ScannerViewModel.swift`: Business logic and API communication

**Requirements:**
- iOS 15.0+
- Xcode 14.0+
- Swift 5.7+

**Build:**
```bash
cd mobile/ios/EventNexusScanner
open EventNexusScanner.xcodeproj
# Build in Xcode (Cmd+B)
```

**Key Libraries:**
- SwiftUI for UI
- AVFoundation for camera
- URLSession for networking

## Android App (Kotlin + Jetpack Compose)

**Location:** `/mobile/android/EventNexusScanner/`

**Key Components:**
- `MainActivity.kt`: App entry point
- `EventNexusScannerApp.kt`: Main app composable
- `LoginScreen.kt`: Scanner code authentication
- `ScannerScreen.kt`: QR scanning interface
- `QrCodeAnalyzer.kt`: ML Kit QR detection
- `ScannerViewModel.kt`: Business logic and state management
- `SupabaseApi.kt`: API interface
- `SupabaseClient.kt`: Retrofit client configuration

**Requirements:**
- Android 8.0 (API 26)+
- Android Studio Hedgehog+
- Kotlin 1.9+

**Build:**
```bash
cd mobile/android/EventNexusScanner
./gradlew assembleDebug
# Or open in Android Studio
```

**Key Libraries:**
- Jetpack Compose for UI
- CameraX for camera
- ML Kit for QR scanning
- Retrofit for networking
- Coroutines for async

## Scanner Code System

### Code Generation

When an organizer creates an event:
1. Platform generates unique 8-character code (e.g., `K7Y3NP2X`)
2. Code is linked to event ID and organizer ID
3. Code displayed to organizer in success message
4. Code can be viewed/managed in organizer dashboard

### Code Validation Flow

```
1. User enters code in mobile app
2. App calls verify_scanner_code(code)
3. Backend validates:
   - Code exists
   - Code is active
   - Code not expired
   - Event is active
4. Returns event details (name, ID, organizer)
5. App stores session and starts scanning
```

### Security

- Codes are random and unique
- Codes can be disabled/revoked by organizer
- Optional expiration dates
- Rate limiting on validation attempts
- Scanner sessions tracked with device info

## Ticket Validation Flow

```
1. Camera detects QR code
2. Throttle: Skip if same code scanned within 3s
3. Extract ticket data from QR
4. Call validate-ticket Edge Function
5. Edge Function:
   - Verifies ticket exists
   - Checks ticket not used
   - Validates event match
   - Marks ticket as used
   - Records verification
6. Display result (success/error)
7. Record scanner usage statistics
```

## Database Schema

```sql
CREATE TABLE scanner_codes (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  organizer_id UUID REFERENCES users(id),
  code TEXT UNIQUE, -- 8-char code
  name TEXT, -- Scanner device name
  is_active BOOLEAN,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  scan_count INTEGER,
  last_scan_location GEOGRAPHY(Point)
);

CREATE TABLE scanner_sessions (
  id UUID PRIMARY KEY,
  scanner_code_id UUID REFERENCES scanner_codes(id),
  event_id UUID REFERENCES events(id),
  device_token TEXT,
  device_info JSONB,
  started_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN
);
```

## API Endpoints

### Verify Scanner Code
```http
POST /rest/v1/rpc/verify_scanner_code
Content-Type: application/json

{
  "p_code": "K7Y3NP2X"
}

Response:
{
  "valid": true,
  "event_id": "uuid",
  "event_name": "Summer Festival",
  "scanner_code_id": "uuid",
  "organizer_id": "uuid",
  "expires_at": null
}
```

### Validate Ticket
```http
POST /functions/v1/validate-ticket
Content-Type: application/json

{
  "qrCode": "ticket-data-string"
}

Response:
{
  "valid": true,
  "message": "Ticket validated successfully",
  "ticket": {
    "holder_name": "John Doe",
    "holder_email": "john@example.com",
    "ticket_type": "VIP"
  }
}
```

### Record Usage
```http
POST /rest/v1/rpc/record_scanner_usage
Content-Type: application/json

{
  "p_scanner_code_id": "uuid",
  "p_location": null
}
```

## Deployment

### iOS Deployment

1. **Development:**
   - Open in Xcode
   - Select development team
   - Choose device/simulator
   - Run (Cmd+R)

2. **TestFlight:**
   - Archive build (Product → Archive)
   - Upload to App Store Connect
   - Submit for TestFlight review
   - Distribute to testers

3. **App Store:**
   - Create app listing in App Store Connect
   - Prepare screenshots and metadata
   - Submit for review
   - Release when approved

### Android Deployment

1. **Development:**
   - Open in Android Studio
   - Sync Gradle
   - Select device/emulator
   - Run (Shift+F10)

2. **Internal Testing:**
   ```bash
   ./gradlew bundleRelease
   # Upload AAB to Google Play Console
   ```

3. **Production:**
   - Create release in Play Console
   - Upload signed AAB
   - Complete store listing
   - Roll out to production

### Signing (Android)

Create `keystore.properties`:
```properties
storePassword=your_password
keyPassword=your_password
keyAlias=eventnexus_scanner
storeFile=path/to/keystore.jks
```

Generate keystore:
```bash
keytool -genkey -v -keystore eventnexus_scanner.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias eventnexus_scanner
```

## Configuration

### iOS Info.plist

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan QR codes on event tickets.</string>
```

### Android AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Testing

### Test Scanner Code

Use SQL to create test code:
```sql
SELECT * FROM create_scanner_code(
  'your-event-id',
  'your-organizer-id',
  'Test Scanner',
  NULL
);
-- Returns code like 'K7Y3NP2X'
```

### Test Ticket Validation

1. Create event on web platform
2. Purchase/generate test ticket
3. Display ticket QR code
4. Scan with mobile app
5. Verify validation success

## Troubleshooting

### iOS

**Camera not working:**
- Check Info.plist has `NSCameraUsageDescription`
- Verify permission granted in Settings
- Check device camera is functioning

**Authentication fails:**
- Verify Supabase URL and anon key in ScannerViewModel.swift
- Check network connectivity
- Verify scanner code is active in database

### Android

**QR scanner not detecting:**
- Ensure ML Kit dependency is added
- Check camera permission granted
- Verify adequate lighting

**Build errors:**
- Clean project: Build → Clean Project
- Invalidate caches: File → Invalidate Caches / Restart
- Update Gradle and dependencies

**Network errors:**
- Check BuildConfig values in build.gradle
- Verify internet permission in manifest
- Test API endpoints in Postman

## Future Enhancements

- **Offline Mode**: Queue scans when offline, sync when connected
- **Bulk Check-in**: Scan multiple tickets rapidly
- **Analytics Dashboard**: In-app scan statistics and charts
- **Multi-Event Support**: Switch between events without re-auth
- **Badge Printing**: Print attendee badges after check-in
- **Photo Capture**: Take attendee photos during check-in
- **Custom Branding**: White-label for enterprise clients
- **Biometric Auth**: FaceID/TouchID or fingerprint security
- **Geofencing**: Validate scanner location matches event venue

## Support

- **Documentation**: See [DEPLOYMENT.md](/workspaces/EventNexus/DEPLOYMENT.md)
- **Backend Setup**: See [supabase/README.md](/workspaces/EventNexus/supabase/README.md)
- **Issues**: Contact huntersest@gmail.com
- **Production**: https://www.eventnexus.eu

## License

Fully protected. Do not use project code/data for any third-party or private purposes. See [LICENSE.md](/workspaces/EventNexus/LICENSE.md).
