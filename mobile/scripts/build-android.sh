#!/bin/bash

# EventNexus Scanner - Android Build Script
# This script builds the Android app for distribution

set -e

echo "🤖 Building EventNexus Scanner for Android..."

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android/EventNexusScanner"
BUILD_DIR="$PROJECT_DIR/builds/android"
APP_NAME="EventNexusScanner"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Project directory: $PROJECT_DIR${NC}"

# Create builds directory
mkdir -p "$BUILD_DIR"

# Navigate to Android project
cd "$ANDROID_DIR"

# Check if Gradle wrapper exists
if [ ! -f "./gradlew" ]; then
    echo -e "${RED}❌ Gradle wrapper not found. Creating...${NC}"
    gradle wrapper
fi

# Make gradlew executable
chmod +x ./gradlew

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
./gradlew clean

# Build debug APK (for testing)
echo -e "${BLUE}🔨 Building debug APK...${NC}"
./gradlew assembleDebug || {
    echo -e "${RED}❌ Debug build failed.${NC}"
    exit 1
}

# Copy debug APK
DEBUG_APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$DEBUG_APK" ]; then
    cp "$DEBUG_APK" "$BUILD_DIR/EventNexusScanner-debug.apk"
    echo -e "${GREEN}✅ Debug APK: $BUILD_DIR/EventNexusScanner-debug.apk${NC}"
fi

# Build release APK (unsigned - for direct distribution)
echo -e "${BLUE}🔨 Building release APK...${NC}"
./gradlew assembleRelease || {
    echo -e "${RED}❌ Release build failed.${NC}"
    exit 1
}

# Copy release APK
RELEASE_APK="app/build/outputs/apk/release/app-release-unsigned.apk"
if [ -f "$RELEASE_APK" ]; then
    cp "$RELEASE_APK" "$BUILD_DIR/EventNexusScanner-release-unsigned.apk"
    echo -e "${GREEN}✅ Release APK (unsigned): $BUILD_DIR/EventNexusScanner-release-unsigned.apk${NC}"
fi

# Build AAB for Play Store
echo -e "${BLUE}📦 Building Android App Bundle (AAB) for Play Store...${NC}"
./gradlew bundleRelease || {
    echo -e "${RED}❌ AAB build failed.${NC}"
    exit 1
}

# Copy AAB
AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_FILE" ]; then
    cp "$AAB_FILE" "$BUILD_DIR/EventNexusScanner-release.aab"
    echo -e "${GREEN}✅ AAB for Play Store: $BUILD_DIR/EventNexusScanner-release.aab${NC}"
fi

# Generate build info
BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
BUILD_NUMBER=$(date +"%Y%m%d%H%M")

# Get APK size
DEBUG_SIZE="0"
RELEASE_SIZE="0"
if [ -f "$BUILD_DIR/EventNexusScanner-debug.apk" ]; then
    DEBUG_SIZE=$(du -h "$BUILD_DIR/EventNexusScanner-debug.apk" | cut -f1)
fi
if [ -f "$BUILD_DIR/EventNexusScanner-release-unsigned.apk" ]; then
    RELEASE_SIZE=$(du -h "$BUILD_DIR/EventNexusScanner-release-unsigned.apk" | cut -f1)
fi

cat > "$BUILD_DIR/build-info.json" <<EOF
{
  "platform": "android",
  "app_name": "EventNexus Scanner",
  "version": "1.0.0",
  "version_code": "$BUILD_NUMBER",
  "build_date": "$BUILD_DATE",
  "min_sdk": 26,
  "target_sdk": 34,
  "files": {
    "debug_apk": "EventNexusScanner-debug.apk",
    "debug_size": "$DEBUG_SIZE",
    "release_apk": "EventNexusScanner-release-unsigned.apk",
    "release_size": "$RELEASE_SIZE",
    "release_aab": "EventNexusScanner-release.aab"
  }
}
EOF

echo -e "${GREEN}✅ Android builds complete!${NC}"
echo -e "${BLUE}📱 Debug APK: $BUILD_DIR/EventNexusScanner-debug.apk ($DEBUG_SIZE)${NC}"
echo -e "${BLUE}📱 Release APK: $BUILD_DIR/EventNexusScanner-release-unsigned.apk ($RELEASE_SIZE)${NC}"
echo -e "${BLUE}📦 AAB: $BUILD_DIR/EventNexusScanner-release.aab${NC}"
echo -e "${BLUE}📄 Build info: $BUILD_DIR/build-info.json${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Debug APK: Ready for direct installation and testing"
echo "2. Release APK: Sign with your keystore for production distribution"
echo "3. AAB: Upload to Google Play Console"
echo ""
echo -e "${BLUE}💡 To sign the release APK:${NC}"
echo "jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\"
echo "  -keystore your-keystore.jks \\"
echo "  EventNexusScanner-release-unsigned.apk your-key-alias"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
