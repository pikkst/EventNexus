# EventNexus Live Map Mobile Apps

Complete mobile applications (Android & iOS) for EventNexus platform featuring interactive maps, ticket management, and seamless platform integration.

## 📱 Applications

### Android App
- **Location**: `/mobile/android/EventNexusLiveMap`
- **Technology**: Kotlin, Jetpack Compose, Google Maps
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)

### iOS App
- **Location**: `/mobile/ios/EventNexusLiveMap`
- **Technology**: Swift, SwiftUI, MapKit
- **Min Version**: iOS 16.0
- **Target**: iOS 17.0+

## 🎯 Features

### Core Features
- **📍 Interactive Map**: View events on an interactive map with custom markers
- **🔍 Location-Based Search**: Find events within a customizable radius (1-200km)
- **🏷️ Category Filtering**: Filter events by category (Music, Sports, Arts, etc.)
- **🔎 Search**: Text search for events by name
- **📱 Event Details**: View comprehensive event information
- **🎫 Ticket Management**: View purchased tickets with QR codes
- **🔐 Authentication**: Secure login/register with Supabase
- **🌐 Web Integration**: Seamless redirect to web platform for ticket purchase

### Platform-Specific Features

#### Android
- Material Design 3
- Google Maps integration
- Location permissions handling
- QR code generation with ZXing
- Deep linking support
- DataStore for session management

#### iOS
- Native SwiftUI design
- MapKit integration
- Core Location framework
- CoreImage QR code generation
- Universal Links support
- UserDefaults for session persistence

## 🔧 Setup Instructions

### Android Development

#### Prerequisites
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34
- Google Maps API Key

#### Steps
1. Open Android Studio
2. Open project: `mobile/android/EventNexusLiveMap`
3. Add Google Maps API Key:
   ```
   Create/edit: local.properties
   Add: MAPS_API_KEY=your_google_maps_api_key_here
   ```
4. Sync Gradle files
5. Run on emulator or device

#### Building APK
```bash
cd mobile/android/EventNexusLiveMap
./gradlew assembleDebug      # Debug APK
./gradlew assembleRelease    # Release APK
```

### iOS Development

#### Prerequisites
- macOS with Xcode 15.0 or later
- iOS 16.0+ SDK
- CocoaPods (optional)

#### Steps
1. Open Xcode
2. Open project: `mobile/ios/EventNexusLiveMap/EventNexusLiveMap.xcodeproj`
3. Wait for Swift Package Manager to resolve dependencies
4. Select target device/simulator
5. Build and run (⌘R)

#### Building for Distribution
1. Product → Archive
2. Export for TestFlight/App Store

## 🏗️ Architecture

### Android Architecture
```
app/
├── data/
│   ├── model/          # Data models (Event, Ticket, User)
│   ├── repository/     # Data repositories (Event, Ticket, Auth)
│   └── SupabaseClient.kt
├── ui/
│   ├── screens/        # Composable screens
│   ├── navigation/     # Navigation setup
│   └── theme/          # Material Design theme
└── MainActivity.kt
```

### iOS Architecture
```
EventNexusLiveMap/
├── Models/             # Swift structs for data
├── Services/           # Service layers (Supabase, Repositories)
├── Views/              # SwiftUI views
├── ContentView.swift   # Main tab navigation
└── EventNexusLiveMapApp.swift
```

## 🔗 Backend Integration

Both apps use the same Supabase backend as the web platform:

- **URL**: `https://anlivujgkjmajkcgbaxw.supabase.co`
- **Tables**: `events`, `tickets`, `users`, `notifications`
- **Auth**: Supabase Auth with email/password
- **Storage**: Supabase Storage for images

### API Endpoints Used
- `GET /events` - Fetch events with filters
- `GET /events/{id}` - Get event details
- `GET /tickets` - Get user tickets (filtered by user_id)
- `POST /auth/sign-in` - User authentication
- `POST /auth/sign-up` - User registration

## 📲 Deep Linking

### Android
```
eventnexus://event/{eventId}
https://www.eventnexus.eu/events/{eventId}
```

### iOS
```
eventnexus://event/{eventId}
https://www.eventnexus.eu/events/{eventId}
```

## 🚀 Deployment

### Automated Builds (GitHub Actions)

The workflow `.github/workflows/build-livemap-apps.yml` automatically:

1. **Builds Android APKs** (debug & release)
2. **Builds iOS app** (for simulator & archive)
3. **Creates GitHub Release** with downloadable APKs
4. **Uploads artifacts** for 90-day retention

#### Triggering Builds
- **Automatic**: Push to `main` branch
- **Manual**: GitHub Actions → "Build Live Map Mobile Apps" → Run workflow

### Manual Distribution

#### Android
1. Build release APK
2. Sign with keystore
3. Distribute via:
   - Google Play Store
   - Direct download (sideload)
   - Firebase App Distribution

#### iOS
1. Archive for distribution
2. Export signed IPA
3. Distribute via:
   - TestFlight (beta testing)
   - App Store
   - Enterprise distribution

## 🔐 Security

- **API Keys**: Stored in `BuildConfig` (Android) / `Info.plist` (iOS)
- **Auth Tokens**: Secure storage with DataStore/UserDefaults
- **HTTPS Only**: All network requests use HTTPS
- **RLS Policies**: Supabase Row Level Security enforced

## 🧪 Testing

### Android
```bash
./gradlew test           # Unit tests
./gradlew connectedAndroidTest  # Instrumented tests
```

### iOS
```bash
xcodebuild test -project EventNexusLiveMap.xcodeproj \
  -scheme EventNexusLiveMap \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

## 📦 Dependencies

### Android
- **Jetpack Compose**: UI framework
- **Google Maps Compose**: Map integration
- **Supabase Kotlin**: Backend client
- **ZXing**: QR code generation
- **Coil**: Image loading
- **Navigation Compose**: Navigation

### iOS
- **SwiftUI**: UI framework
- **MapKit**: Map integration
- **Supabase Swift**: Backend client
- **CoreImage**: QR code generation

## 🐛 Troubleshooting

### Android Issues

**Build fails with "MAPS_API_KEY not found"**
- Add Google Maps API key to `local.properties`

**Gradle sync fails**
- Clear cache: `./gradlew clean`
- Invalidate caches in Android Studio

**App crashes on map load**
- Verify Google Maps API key is valid
- Check location permissions granted

### iOS Issues

**Build fails with missing dependencies**
- Clean build folder (⌘⇧K)
- Reset package cache: File → Packages → Reset Package Caches

**Map not showing**
- Check Info.plist for location usage descriptions
- Verify location permissions in Settings

**QR code not displaying**
- Ensure ticket has valid `qr_code` field
- Check console for CoreImage errors

## 📄 License

Fully protected. Do not use for third-party or private purposes.

## 👤 Contact

- **Email**: huntersest@gmail.com
- **Website**: https://www.eventnexus.eu

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- Interactive event map
- Ticket management with QR codes
- Supabase authentication
- Deep linking to web platform
- Category and radius filtering
- Event search functionality

---

Built with ❤️ for EventNexus Platform
