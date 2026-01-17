# Web Download Setup Instructions

Quick guide to set up APK downloads on the EventNexus website.

## 📦 Step 1: Build Android APK

```bash
cd /workspaces/EventNexus/mobile/scripts
./build-android.sh
```

This creates: `mobile/builds/android/EventNexusScanner-debug.apk`

## 📂 Step 2: Copy to Public Directory

```bash
# Create downloads directory
mkdir -p /workspaces/EventNexus/public/downloads

# Copy APK
cp mobile/builds/android/EventNexusScanner-debug.apk \
   public/downloads/EventNexusScanner.apk
```

**For production:** Sign the release APK first (see BUILD_DISTRIBUTION_GUIDE.md)

## 🌐 Step 3: Test Download

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/mobile`

3. Click "Download for Android"

4. APK should download automatically

## 📱 Step 4: Test Installation

On Android device:
1. Download APK from website
2. Go to Settings > Security
3. Enable "Install from Unknown Sources"
4. Open Downloads folder
5. Tap APK to install
6. Launch EventNexus Scanner

## 🍎 iOS Setup (TestFlight)

For iOS, you'll need to use TestFlight:

1. Build iOS app in Xcode
2. Archive and upload to App Store Connect
3. Wait for TestFlight approval (1-2 days)
4. Get TestFlight public link
5. Update `MobileAppsPage.tsx`:

```tsx
const handleDownload = (platform: 'ios' | 'android') => {
  if (platform === 'android') {
    window.location.href = '/downloads/EventNexusScanner.apk';
  } else {
    // Replace with your actual TestFlight link
    window.location.href = 'https://testflight.apple.com/join/YOURCODE';
  }
};
```

## ✅ Verification Checklist

- [ ] APK builds successfully
- [ ] APK copied to `public/downloads/`
- [ ] `/mobile` page loads correctly
- [ ] Android download button works
- [ ] APK downloads successfully
- [ ] APK installs on Android device
- [ ] App launches and scanner code works

## 🚀 Production Deployment

When deploying to production (eventnexus.eu):

1. **Build signed release APK:**
   ```bash
   ./build-android.sh
   # Then sign the release APK (see BUILD_DISTRIBUTION_GUIDE.md)
   ```

2. **Upload to production server:**
   ```bash
   # Copy signed APK to public/downloads/
   cp EventNexusScanner-release-signed.apk public/downloads/EventNexusScanner.apk
   ```

3. **Deploy website:**
   ```bash
   npm run build
   # Deploy dist/ to your hosting (GitHub Pages, Netlify, etc.)
   ```

4. **Test on production:**
   - Visit https://eventnexus.eu/mobile
   - Test both Android and iOS buttons
   - Verify downloads work

## 📊 Optional: Track Downloads

Add download tracking in `MobileAppsPage.tsx`:

```tsx
const handleDownload = (platform: 'ios' | 'android') => {
  // Track with Google Analytics
  if (window.gtag) {
    window.gtag('event', 'download_app', {
      event_category: 'mobile_apps',
      event_label: platform,
      value: 1
    });
  }
  
  // Proceed with download
  if (platform === 'android') {
    window.location.href = '/downloads/EventNexusScanner.apk';
  } else {
    window.location.href = 'https://testflight.apple.com/join/YOURCODE';
  }
};
```

## 🐛 Troubleshooting

**APK won't download:**
- Check file exists: `ls -lh public/downloads/EventNexusScanner.apk`
- Check file size is reasonable (>5MB)
- Clear browser cache and retry

**APK won't install:**
- Ensure "Unknown Sources" enabled on Android
- Check Android version (need 8.0+)
- Try different browser for download

**404 error on download:**
- Verify APK in public/downloads/ directory
- Ensure Vite serves files from public/
- Check browser console for errors

## 📞 Need Help?

Contact: huntersest@gmail.com

---

**Quick Start:**
```bash
cd /workspaces/EventNexus
mobile/scripts/build-android.sh
mkdir -p public/downloads
cp mobile/builds/android/EventNexusScanner-debug.apk public/downloads/EventNexusScanner.apk
npm run dev
# Visit http://localhost:3000/mobile
```
