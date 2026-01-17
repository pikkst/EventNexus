# EventNexus Live Map - Android App

Native Android application for EventNexus platform with interactive map, ticket management, and real-time event discovery.

**Status:** ✅ Production Ready

## Quick Start

### Prerequisites
- Android Studio Hedgehog (2023.1.1+)
- JDK 17
- Android SDK 34

### Setup
1. Clone repository
2. Open in Android Studio: `mobile/android/EventNexusLiveMap`
3. Create `local.properties` (if not created automatically):
   ```properties
   sdk.dir=/path/to/Android/sdk
   ```
4. Sync project with Gradle
5. Run on device/emulator

## Build Commands

```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Run tests
./gradlew test

# Install on connected device
./gradlew installDebug
```

## Project Structure

```
app/
├── src/main/
│   ├── java/eu/eventnexus/livemap/
│   │   ├── data/
│   │   │   ├── model/          # Event, Ticket, User
│   │   │   ├── repository/     # Data access layer
│   │   │   └── SupabaseClient.kt
│   │   ├── ui/
│   │   │   ├── screens/        # Main screens (Map, Radar, Tickets, Profile)
│   │   │   ├── navigation/     # Navigation setup
│   │   │   └── theme/          # Material Design 3
│   │   ├── LiveMapApplication.kt
│   │   └── MainActivity.kt
│   ├── res/                    # Resources
│   └── AndroidManifest.xml
└── build.gradle
```

## Features

✅ Interactive OpenStreetMap with event markers  
✅ **Nexus Radar** - Real-time event detection  
✅ Location-based event discovery  
✅ Radius filtering (1-200km)  
✅ Category filtering  
✅ Event search  
✅ Ticket management with QR codes  
✅ Supabase authentication  
✅ Deep linking  
✅ Material Design 3 Dark Mode  

## Configuration

### Supabase
Configured in `SupabaseClient.kt`:
- URL: `https://anlivujgkjmajkcgbaxw.supabase.co`
- Uses Supabase Kotlin SDK v2.1.3

### Deep Links
```
eventnexus://event/{eventId}
https://www.eventnexus.eu/events/{eventId}
```

## Dependencies

- Jetpack Compose (UI)
- osmdroid (OpenStreetMap)
- Supabase Kotlin (postgrest, auth, storage, realtime)
- ZXing (QR codes)
- Coil (image loading)
- Ktor (networking)

## Building APK

### Debug
```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release
```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Signing (Release)
Add to `gradle.properties`:
```properties
KEYSTORE_FILE=/path/to/keystore.jks
KEYSTORE_PASSWORD=your_password
KEY_ALIAS=your_alias
KEY_PASSWORD=your_key_password
```

## Testing

```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest

# Coverage report
./gradlew jacocoTestReport
```

## Troubleshooting

**Gradle sync fails**
- Verify JDK 17 is selected
- Clear cache: `./gradlew clean`
- Invalidate caches: Android Studio → File → Invalidate Caches

**Map not loading**
- Check internet connection (required for map tiles)
- Check location permissions in Manifest

**Supabase connection fails**
- Check internet connection
- Verify Supabase URL and anon key in `SupabaseClient.kt`

## License

Fully protected. EventNexus © 2026

## Contact

huntersest@gmail.com
