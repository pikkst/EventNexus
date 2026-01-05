#!/bin/bash

# EventNexus Scanner - Build All Platforms
# Master build script for both iOS and Android

set -e

echo "🚀 Building EventNexus Scanner for all platforms..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Build Android
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                  Building Android                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

bash "$SCRIPT_DIR/build-android.sh"

echo ""
echo -e "${GREEN}✅ Android build complete${NC}"
echo ""

# Build iOS (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                    Building iOS                        ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    bash "$SCRIPT_DIR/build-ios.sh"
    
    echo ""
    echo -e "${GREEN}✅ iOS build complete${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping iOS build (macOS required)${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}              All Builds Complete! 🎉                   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📦 Build artifacts location:${NC}"
echo "   Android: mobile/builds/android/"
echo "   iOS:     mobile/builds/ios/"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Test the builds on physical devices"
echo "2. Upload builds to website for download"
echo "3. Submit to app stores when ready"
echo ""
