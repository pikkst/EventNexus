# Mobile Apps Build & Distribution Guide

Complete guide for building and distributing EventNexus Scanner mobile apps.

## 📋 Prerequisites

### For Android
- **Android Studio** Hedgehog or later
- **Java JDK** 17 or later
- **Gradle** 8.0+ (included via wrapper)
- **Android SDK** API 26-34

### For iOS
- **macOS** required
- **Xcode** 14.0 or later
- **iOS SDK** 15.0 or later
- **Apple Developer Account** (for distribution)

## 🔨 Building the Apps

### Quick Build (All Platforms)

```bash
cd /workspaces/EventNexus/mobile/scripts
./build-all.sh
```

This will:
1. Build Android APK and AAB
2. Build iOS IPA (if on macOS)
3. Create build artifacts in `mobile/builds/`

### Android Only

```bash
cd /workspaces/EventNexus/mobile/scripts
./build-android.sh
```

**Outputs:**
- `mobile/builds/android/EventNexusScanner-debug.apk` - Ready for testing
- `mobile/builds/android/EventNexusScanner-release-unsigned.apk` - Needs signing
- `mobile/builds/android/EventNexusScanner-release.aab` - For Play Store
- `mobile/builds/android/build-info.json` - Build metadata

### iOS Only

```bash
cd /workspaces/EventNexus/mobile/scripts
./build-ios.sh
```

**Note:** Set `DEVELOPMENT_TEAM` environment variable:
```bash
export DEVELOPMENT_TEAM="YOUR_TEAM_ID"
./build-ios.sh
```

**Outputs:**
- `mobile/builds/ios/EventNexusScanner.ipa` - For distribution
- `mobile/builds/ios/EventNexusScanner.xcarchive` - Archive for App Store
- `mobile/builds/ios/build-info.json` - Build metadata

## 🔐 Code Signing

### Android

#### Generate Keystore (First Time Only)

```bash
keytool -genkey -v -keystore eventnexus-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias eventnexus-key
```

**Save these details securely:**
- Keystore password
- Key alias: `eventnexus-key`
- Key password

#### Sign Release APK

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore eventnexus-release.jks \
  mobile/builds/android/EventNexusScanner-release-unsigned.apk \
  eventnexus-key
```

#### Optimize Signed APK

```bash
zipalign -v 4 \
  EventNexusScanner-release-unsigned.apk \
  EventNexusScanner-release-signed.apk
```

### iOS

iOS signing is handled automatically by Xcode if you have:
1. Valid Apple Developer account
2. Provisioning profiles configured
3. Development team set in Xcode

## 📦 Distribution Methods

### Android

#### 1. Direct APK Distribution (Website Download)

**Steps:**
1. Build and sign release APK
2. Upload to `public/downloads/` directory:
   ```bash
   cp mobile/builds/android/EventNexusScanner-release-signed.apk \
      public/downloads/EventNexusScanner.apk
   ```
3. Users download from `/mobile` page on website
4. Users enable "Install from Unknown Sources" in Android settings
5. Install APK

**Pros:** Instant availability, no approval process
**Cons:** Users must enable unknown sources, no auto-updates

#### 2. Google Play Store (Internal Testing)

**Steps:**
1. Create app listing in Google Play Console
2. Upload `EventNexusScanner-release.aab`
3. Create internal testing track
4. Add testers via email
5. Share Play Store link

**Pros:** Professional distribution, auto-updates
**Cons:** Initial approval required (24-48 hours)

#### 3. Google Play Store (Production)

**Steps:**
1. Complete Play Console listing (descriptions, screenshots, etc.)
2. Submit for review
3. Wait for approval (1-7 days typically)
4. Publish to production

### iOS

#### 1. TestFlight (Recommended for Testing)

**Steps:**
1. Archive app in Xcode (`Product > Archive`)
2. Upload to App Store Connect
3. Submit for TestFlight review (1-2 days)
4. Add internal/external testers
5. Share TestFlight link or invitation code

**Pros:** Professional beta distribution, up to 10,000 testers
**Cons:** Requires Apple Developer account ($99/year)

#### 2. Enterprise Distribution (Ad-Hoc)

**Steps:**
1. Enroll in Apple Developer Enterprise Program
2. Create enterprise distribution certificate
3. Build with enterprise profile
4. Distribute IPA via website/MDM

**Pros:** No App Store approval needed
**Cons:** Expensive ($299/year), stricter requirements

#### 3. App Store (Production)

**Steps:**
1. Complete App Store listing
2. Submit for review
3. Wait for approval (1-7 days typically)
4. Publish to App Store

## 🌐 Website Integration

### Add Download Links

The `/mobile` page is already configured with download buttons.

**For Android:** Direct APK download
```tsx
window.location.href = '/downloads/EventNexusScanner.apk';
```

**For iOS:** TestFlight or App Store link
```tsx
window.location.href = 'https://testflight.apple.com/join/YOUR_CODE';
```

### Update Download URLs

Edit `/components/MobileAppsPage.tsx`:

```tsx
const handleDownload = (platform: 'ios' | 'android') => {
  if (platform === 'android') {
    // Direct APK download
    window.location.href = '/downloads/EventNexusScanner.apk';
  } else {
    // TestFlight or App Store
    window.location.href = 'https://testflight.apple.com/join/YOUR_CODE';
    // Or for App Store:
    // window.location.href = 'https://apps.apple.com/app/idYOUR_APP_ID';
  }
};
```

## 📱 QR Codes for Distribution

### Generate QR Codes

```bash
# Android APK
qrencode -o android-download-qr.png "https://eventnexus.eu/downloads/EventNexusScanner.apk"

# iOS TestFlight
qrencode -o ios-testflight-qr.png "https://testflight.apple.com/join/YOUR_CODE"
```

Display QR codes on:
- Event posters
- Website `/mobile` page
- Organizer dashboard
- Email instructions

## 🔄 Update Process

### Version Bumping

**Android** (`mobile/android/EventNexusScanner/app/build.gradle.kts`):
```kotlin
versionCode = 2  // Increment for each release
versionName = "1.0.1"
```

**iOS** (`mobile/ios/EventNexusScanner/EventNexusScanner/Info.plist`):
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.1</string>
<key>CFBundleVersion</key>
<string>2</string>
```

### Release Checklist

- [ ] Update version numbers
- [ ] Test on physical devices (both platforms)
- [ ] Build signed releases
- [ ] Upload to distribution channels
- [ ] Update download links on website
- [ ] Update QR codes
- [ ] Notify existing users
- [ ] Monitor crash reports

## 📊 Analytics & Monitoring

### Track Downloads

Add analytics to download button:
```tsx
const handleDownload = (platform: 'ios' | 'android') => {
  // Track download
  gtag('event', 'download_app', {
    platform: platform,
    version: '1.0.0'
  });
  
  // Proceed with download
  window.location.href = platform === 'android' 
    ? '/downloads/EventNexusScanner.apk'
    : 'https://testflight.apple.com/join/YOUR_CODE';
};
```

### Monitor Issues

- **Android:** Google Play Console > Quality
- **iOS:** App Store Connect > TestFlight Feedback
- **Crashes:** Integrate Sentry or Firebase Crashlytics
- **Usage:** Supabase Edge Function analytics

## 🚀 Deployment Workflow

### Recommended Timeline

**Week 1: Internal Testing**
- Build debug versions
- Test internally with team
- Fix critical bugs

**Week 2: Beta Testing**
- Build signed releases
- Distribute via TestFlight (iOS) and APK (Android)
- Collect feedback from 10-20 beta users

**Week 3: Store Submission**
- Finalize store listings
- Submit to Google Play and App Store
- Wait for approval

**Week 4: Public Launch**
- Publish to stores
- Update website with store links
- Announce via social media
- Monitor reviews and downloads

## 📞 Support Resources

**Android Developer Console:**
https://play.google.com/console

**Apple Developer:**
https://developer.apple.com

**TestFlight:**
https://testflight.apple.com

**EventNexus Support:**
huntersest@gmail.com

---

**Ready to build?** Start with:
```bash
cd /workspaces/EventNexus/mobile/scripts
./build-all.sh
```
