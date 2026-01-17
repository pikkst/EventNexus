# EventNexus Scanner for iOS

Native iOS app for scanning and validating event tickets.

## Requirements

- iOS 15.0+
- Xcode 14.0+
- Swift 5.7+

## Setup

1. Open the project in Xcode:
   ```bash
   open EventNexusScanner.xcodeproj
   ```

2. Select your development team in Signing & Capabilities

3. Build and run (⌘R)

## Features

- Scanner code authentication
- Real-time QR code scanning
- Instant ticket validation
- Session statistics
- Offline support (coming soon)

## Architecture

- **SwiftUI**: Modern declarative UI
- **AVFoundation**: Camera and QR detection
- **Combine**: Reactive state management
- **URLSession**: Networking with Supabase

## Configuration

Update Supabase credentials in `ScannerViewModel.swift`:
```swift
private var supabaseUrl = "YOUR_SUPABASE_URL"
private var supabaseAnonKey = "YOUR_ANON_KEY"
```

## Camera Permissions

The app requires camera access. Permission is requested automatically on first launch. Description in `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan QR codes on event tickets.</string>
```

## Building for Release

1. Set build configuration to Release
2. Archive: Product → Archive
3. Upload to App Store Connect
4. Submit for TestFlight or App Store review

## Testing

1. Get scanner code from EventNexus organizer dashboard
2. Enter code in login screen
3. Scan test ticket QR code
4. Verify validation success

## Support

Contact: huntersest@gmail.com
