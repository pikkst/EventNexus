# Mobile Apps Website Integration

## Overview
Both EventNexus mobile apps (Scanner and Live Map) are now integrated into the website's mobile download page with automated build and deployment pipeline.

## Apps Integrated

### 1. EventNexus Scanner
**Target Users:** Event staff and organizers  
**Purpose:** Scan tickets at event entrances  
**Key Features:**
- QR code scanning with camera
- Real-time ticket validation
- Scanner code authentication
- Live scan statistics
- Session tracking

### 2. EventNexus Live Map
**Target Users:** Event attendees  
**Purpose:** Discover and attend events  
**Key Features:**
- Interactive map with event markers
- Location-based search (1-200km radius)
- Category filtering
- In-app ticket viewing with QR codes
- Secure ticket purchases
- Real-time event updates

## Website Integration

### Page Location
**URL:** `https://eventnexus.eu/mobile`  
**Component:** `/components/MobileAppsPage.tsx`

### User Experience
1. **App Switcher:** Toggle between Scanner and Live Map apps
2. **Dynamic Content:** All sections update based on selected app:
   - Hero section (title, description, badge)
   - Features grid (6 features per app)
   - "How It Works" steps (4 steps per app)
   - FAQ section (5 questions per app)
3. **Download Buttons:** 
   - Android: Direct APK download from `/downloads/`
   - iOS: Alert with TestFlight information

### UI Components
```tsx
// App state management
const [selectedApp, setSelectedApp] = useState<'scanner' | 'livemap'>('scanner');

// Feature sets
const features = {
  scanner: [...], // 6 features
  livemap: [...]  // 6 features
};

// Download handler
const handleDownload = (platform: 'ios' | 'android') => {
  const appName = selectedApp === 'scanner' 
    ? 'EventNexusScanner' 
    : 'EventNexusLiveMap';
  
  if (platform === 'android') {
    window.location.href = `/downloads/${appName}.apk`;
  }
};
```

## Automated Build & Deployment

### GitHub Actions Workflows

#### Scanner App Build
**File:** `.github/workflows/build-android.yml`  
**Triggers:**
- Push to `main` branch
- Changes in `mobile/android/` directory
- Manual workflow dispatch

**Process:**
1. Checkout code
2. Set up JDK 17 & Android SDK
3. Build debug APK
4. Copy APK to `public/downloads/EventNexusScanner.apk`
5. Commit and push to repository (with `[skip ci]` to prevent loops)

**Output:** `public/downloads/EventNexusScanner.apk`

#### Live Map Apps Build
**File:** `.github/workflows/build-livemap-apps.yml`  
**Triggers:**
- Push to `main` branch
- Changes in `mobile/android/EventNexusLiveMap/` or `mobile/ios/EventNexusLiveMap/`
- Manual workflow dispatch

**Process:**

**Android Job:**
1. Checkout code
2. Set up JDK 17 & Android SDK
3. Build debug & release APKs
4. Upload artifacts

**iOS Job:**
1. Checkout code
2. Set up Xcode 15.2
3. Build iOS app for simulator
4. Archive release build
5. Upload artifacts

**Release Job:**
1. Download Android artifacts
2. Rename release APK to `EventNexusLiveMap.apk`
3. Copy to `public/downloads/EventNexusLiveMap.apk`
4. Commit and push to repository (with `[skip ci]`)
5. Create GitHub Release with APKs and iOS archives

**Outputs:**
- `public/downloads/EventNexusLiveMap.apk`
- GitHub Release with all build artifacts

### Download Directory Structure
```
public/downloads/
├── README.md                    # Documentation for both apps
├── EventNexusScanner.apk       # Scanner app (auto-updated)
└── EventNexusLiveMap.apk       # Live Map app (auto-updated)
```

### Git Automation
Both workflows use `[skip ci]` in commit messages to prevent infinite build loops when pushing APKs back to the repository.

```yaml
git commit -m "🤖 Auto-deploy: Update EventNexusLiveMap.apk [skip ci]"
```

## Downloads README

**File:** `public/downloads/README.md`  
**Contents:**
- EventNexus Scanner section
  - Android installation instructions
  - iOS TestFlight information
  - Permissions and features
- EventNexus Live Map section
  - Android installation instructions
  - iOS TestFlight information
  - Permissions and features
- Support contact information

## Mobile Apps Documentation

### Core Documentation
1. **`/mobile/LIVE_MAP_APPS.md`** - Complete guide for both Android and iOS Live Map apps
2. **`/mobile/README.md`** - Overview of all mobile apps in the project
3. **`/mobile/android/EventNexusLiveMap/README.md`** - Android-specific Live Map instructions
4. **`/mobile/ios/EventNexusLiveMap/README.md`** - iOS-specific Live Map instructions
5. **`/mobile/MOBILE_SCANNER_APPS_DELIVERY.md`** - Scanner app delivery documentation

### Mobile App Codebases

#### Android Live Map
**Location:** `/mobile/android/EventNexusLiveMap/`  
**Stack:** Kotlin, Jetpack Compose, Google Maps Compose, Material Design 3  
**Key Files:**
- `app/src/main/java/.../MainActivity.kt`
- `app/src/main/java/.../navigation/AppNavigation.kt`
- `app/src/main/java/.../ui/screens/` (MapScreen, EventDetailScreen, MyTicketsScreen, etc.)
- `app/src/main/java/.../data/` (repositories and Supabase client)
- `app/src/main/java/.../models/` (Event, Ticket, User data classes)

#### iOS Live Map
**Location:** `/mobile/ios/EventNexusLiveMap/`  
**Stack:** Swift, SwiftUI, MapKit, Combine  
**Key Files:**
- `EventNexusLiveMap/EventNexusLiveMapApp.swift`
- `EventNexusLiveMap/ContentView.swift` (TabView navigation)
- `EventNexusLiveMap/Views/` (MapView, EventDetailView, MyTicketsView, etc.)
- `EventNexusLiveMap/Services/` (repositories and Supabase manager)
- `EventNexusLiveMap/Models/` (Event, Ticket, User structs)

#### Android Scanner
**Location:** `/mobile/android/EventNexusScanner/`  
**Stack:** Kotlin, Jetpack Compose, CameraX, Material Design 3

## Testing the Integration

### Local Testing
1. Run dev server: `npm run dev`
2. Navigate to `http://localhost:3000/mobile`
3. Test app switcher between Scanner and Live Map
4. Verify all sections update correctly
5. Test download buttons (may need to build APKs locally first)

### Production Testing
1. Push changes to `main` branch
2. Wait for GitHub Actions to complete:
   - Scanner app build (~5-10 minutes)
   - Live Map apps build (~10-15 minutes)
3. Check `public/downloads/` for updated APKs
4. Visit `https://eventnexus.eu/mobile`
5. Test downloads from website

### Manual Build Testing
```bash
# Build Scanner APK
cd mobile/android/EventNexusScanner
./gradlew assembleDebug

# Build Live Map APK
cd mobile/android/EventNexusLiveMap
./gradlew assembleDebug

# Copy to downloads
cp mobile/android/EventNexusScanner/app/build/outputs/apk/debug/app-debug.apk public/downloads/EventNexusScanner.apk
cp mobile/android/EventNexusLiveMap/app/build/outputs/apk/debug/app-debug.apk public/downloads/EventNexusLiveMap.apk
```

## Deployment Checklist

### Initial Setup ✅
- [x] Create Live Map Android app
- [x] Create Live Map iOS app
- [x] Set up Supabase integration
- [x] Create GitHub Actions workflows
- [x] Update MobileAppsPage.tsx with app switcher
- [x] Update downloads README
- [x] Test local builds

### Production Deployment
- [ ] Push changes to `main` branch
- [ ] Verify GitHub Actions complete successfully
- [ ] Check APKs are copied to `public/downloads/`
- [ ] Test downloads from production website
- [ ] Verify APKs install correctly on Android devices
- [ ] Test both apps connect to Supabase correctly
- [ ] Announce availability to users

### Future Enhancements
- [ ] iOS TestFlight distribution setup
- [ ] App Store deployment (Scanner and Live Map)
- [ ] Google Play Store deployment
- [ ] Automated version numbering
- [ ] Release notes generation
- [ ] Beta testing program
- [ ] Crash reporting integration
- [ ] Analytics integration

## Troubleshooting

### APKs Not Updating
1. Check GitHub Actions logs for errors
2. Verify `[skip ci]` is in commit message
3. Check repository permissions for GitHub Actions
4. Manually trigger workflow with `workflow_dispatch`

### Download Links Not Working
1. Verify APK files exist in `public/downloads/`
2. Check Vite build includes `public/` directory
3. Test with absolute URL: `https://eventnexus.eu/downloads/EventNexusLiveMap.apk`
4. Check browser console for 404 errors

### App Won't Install on Android
1. Enable "Unknown Sources" in device settings
2. Check APK is not corrupted (download again)
3. Verify minimum Android version (8.0+)
4. Check device has enough storage space

### Supabase Connection Errors
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
2. Check Supabase project is active
3. Verify RLS policies allow access
4. Check network connectivity

## Support & Contact

**Developer:** huntersest@gmail.com  
**Website:** https://eventnexus.eu  
**Help Center:** https://eventnexus.eu/help  
**GitHub:** EventNexus repository

---

**Last Updated:** 2024
**Status:** ✅ Production Ready
