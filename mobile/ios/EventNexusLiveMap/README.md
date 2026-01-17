# EventNexus Live Map - iOS App

Native iOS application for EventNexus platform with interactive map, ticket management, and seamless event discovery.

## Quick Start

### Prerequisites
- macOS 13.0+
- Xcode 15.0+
- iOS 16.0+ SDK
- CocoaPods (optional)

### Setup
1. Clone repository
2. Open Xcode: `mobile/ios/EventNexusLiveMap/EventNexusLiveMap.xcodeproj`
3. Wait for Swift Package Manager to resolve dependencies
4. Select target device/simulator
5. Build and Run (⌘R)

## Build Commands

```bash
# Build for simulator
xcodebuild -project EventNexusLiveMap.xcodeproj \
  -scheme EventNexusLiveMap \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build

# Archive for distribution
xcodebuild -project EventNexusLiveMap.xcodeproj \
  -scheme EventNexusLiveMap \
  -configuration Release \
  -archivePath ./build/EventNexusLiveMap.xcarchive \
  archive

# Run tests
xcodebuild test -project EventNexusLiveMap.xcodeproj \
  -scheme EventNexusLiveMap \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Project Structure

```
EventNexusLiveMap/
├── Models/
│   ├── Event.swift
│   ├── Ticket.swift
│   └── User.swift
├── Services/
│   ├── SupabaseManager.swift
│   ├── EventRepository.swift
│   ├── TicketRepository.swift
│   └── AuthRepository.swift
├── Views/
│   ├── MapView.swift
│   ├── EventDetailView.swift
│   ├── MyTicketsView.swift
│   ├── TicketDetailView.swift
│   └── ProfileView.swift
├── ContentView.swift
├── EventNexusLiveMapApp.swift
└── Info.plist
```

## Features

✅ Interactive MapKit with event annotations  
✅ Location-based event discovery  
✅ Radius filtering (1-200km)  
✅ Category filtering  
✅ Event search  
✅ Ticket management with QR codes  
✅ Supabase authentication  
✅ Universal Links  
✅ Native SwiftUI design  

## Configuration

### Supabase
Configured in `SupabaseManager.swift`:
- URL: `https://anlivujgkjmajkcgbaxw.supabase.co`
- Uses Supabase Swift SDK v2.0.0+

### Location Services
Required entries in `Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>EventNexus needs your location to show nearby events</string>
```

### Deep Links
```
eventnexus://event/{eventId}
https://www.eventnexus.eu/events/{eventId}
```

## Dependencies (Swift Package Manager)

- Supabase Swift (2.0.0+)
  - GoTrue (authentication)
  - PostgREST (database)
  - Storage
  - Realtime

## Building for Distribution

### TestFlight
1. Archive: Product → Archive
2. Distribute: Window → Organizer → Distribute App
3. Select "App Store Connect"
4. Upload to TestFlight

### App Store
1. Follow TestFlight steps
2. Submit for review in App Store Connect

### Ad Hoc Distribution
1. Archive the app
2. Export with Ad Hoc provisioning profile
3. Distribute IPA file

## Code Signing

1. Select project in Xcode
2. Go to "Signing & Capabilities"
3. Select your Team
4. Xcode will automatically manage provisioning profiles

## Testing

```bash
# Run all tests
xcodebuild test -project EventNexusLiveMap.xcodeproj \
  -scheme EventNexusLiveMap \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# Run specific test
xcodebuild test -project EventNexusLiveMap.xcodeproj \
  -scheme EventNexusLiveMap \
  -only-testing:EventNexusLiveMapTests/AuthRepositoryTests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Troubleshooting

**Build fails - "Package resolution failed"**
- Reset package caches: File → Packages → Reset Package Caches
- Update packages: File → Packages → Update to Latest Package Versions

**Map not showing**
- Check Info.plist for location usage descriptions
- Grant location permissions in Settings app
- Verify MapKit framework is linked

**QR code not generating**
- Ensure ticket has valid `qr_code` field
- Check console for CoreImage filter errors
- Verify iOS version is 16.0+

**Supabase connection fails**
- Check internet connection
- Verify Supabase URL and key in `SupabaseManager.swift`
- Check App Transport Security settings

## Performance Optimization

- QR codes are cached after generation
- Images loaded asynchronously with AsyncImage
- Map annotations lazy-loaded
- Database queries use proper indexing

## Accessibility

- VoiceOver support for all interactive elements
- Dynamic Type for text scaling
- High contrast colors
- Haptic feedback for important actions

## License

Fully protected. EventNexus © 2026

## Contact

huntersest@gmail.com
