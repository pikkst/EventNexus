# EventNexus Scanner APK

The Android APK file will be automatically built by GitHub Actions.

**Download:** [EventNexusScanner.apk](/downloads/EventNexusScanner.apk)

## Automatic Build Process

When code is pushed to the `mobile/android/` directory:
1. GitHub Actions automatically builds the APK
2. The APK is uploaded as an artifact
3. The APK is committed to `public/downloads/EventNexusScanner.apk`
4. Users can download directly from the website

## Manual Build

To build manually:
```bash
cd mobile/android/EventNexusScanner
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk \
   ../../../public/downloads/EventNexusScanner.apk
```

## Installation

1. Download APK from https://eventnexus.eu/mobile
2. Enable "Install from Unknown Sources" on Android
3. Open the APK file
4. Install the app
5. Launch EventNexus Scanner
6. Enter your scanner code from event organizer

---

**First build in progress... Check back soon!**
