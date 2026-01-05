#!/bin/bash

# EventNexus Scanner - iOS Build Script
# This script builds the iOS app for distribution

set -e

echo "🍎 Building EventNexus Scanner for iOS..."

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$PROJECT_DIR/mobile/ios/EventNexusScanner"
BUILD_DIR="$PROJECT_DIR/mobile/builds/ios"
APP_NAME="EventNexusScanner"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Project directory: $PROJECT_DIR${NC}"

# Create builds directory
mkdir -p "$BUILD_DIR"

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode is not installed. Please install Xcode from the App Store.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Xcode found${NC}"

# Navigate to iOS project
cd "$IOS_DIR"

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
xcodebuild clean -scheme "$APP_NAME" -configuration Release

# Build for testing (ad-hoc distribution)
echo -e "${BLUE}🔨 Building for ad-hoc distribution...${NC}"
xcodebuild archive \
    -scheme "$APP_NAME" \
    -configuration Release \
    -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-}" \
    || {
        echo -e "${RED}❌ Build failed. Make sure you have configured signing in Xcode.${NC}"
        exit 1
    }

# Export IPA
echo -e "${BLUE}📦 Exporting IPA...${NC}"

# Create export options plist
cat > "$BUILD_DIR/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>${DEVELOPMENT_TEAM:-}</string>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
    -archivePath "$BUILD_DIR/$APP_NAME.xcarchive" \
    -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist" \
    -exportPath "$BUILD_DIR" \
    || {
        echo -e "${RED}❌ Export failed.${NC}"
        exit 1
    }

# Generate build info
BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
BUILD_NUMBER=$(date +"%Y%m%d%H%M")

cat > "$BUILD_DIR/build-info.json" <<EOF
{
  "platform": "ios",
  "app_name": "EventNexus Scanner",
  "version": "1.0.0",
  "build_number": "$BUILD_NUMBER",
  "build_date": "$BUILD_DATE",
  "min_ios_version": "15.0",
  "file": "$APP_NAME.ipa"
}
EOF

echo -e "${GREEN}✅ iOS build complete!${NC}"
echo -e "${BLUE}📱 IPA location: $BUILD_DIR/$APP_NAME.ipa${NC}"
echo -e "${BLUE}📄 Build info: $BUILD_DIR/build-info.json${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Upload IPA to TestFlight via App Store Connect"
echo "2. Or distribute via enterprise distribution"
echo "3. Or install directly on registered devices"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
