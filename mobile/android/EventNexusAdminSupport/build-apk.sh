#!/bin/bash

# Build EventNexus Admin Support APK
# This script builds the Android app for admin support chat

set -e

echo "🏗️  Building EventNexus Admin Support Android App..."

cd "$(dirname "$0")"

# Check if Firebase config exists
if [ ! -f "app/google-services.json" ]; then
    echo "❌ google-services.json not found!"
    echo "📋 Please copy google-services.json.example to google-services.json"
    echo "   and add your Firebase configuration."
    exit 1
fi

# Clean build
echo "🧹 Cleaning previous build..."
./gradlew clean

# Build debug APK
echo "📦 Building debug APK..."
./gradlew assembleDebug

# Build release APK (if signing config exists)
if grep -q "signingConfigs.release" app/build.gradle.kts; then
    echo "📦 Building release APK..."
    ./gradlew assembleRelease
    echo ""
    echo "✅ Release APK built successfully!"
    echo "📂 Location: app/build/outputs/apk/release/app-release.apk"
else
    echo ""
    echo "✅ Debug APK built successfully!"
    echo "📂 Location: app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "⚠️  Note: Release signing not configured. For production:"
    echo "   1. Generate a keystore: keytool -genkey -v -keystore eventnexus.keystore ..."
    echo "   2. Add signing config to app/build.gradle.kts"
    echo "   3. Run: ./gradlew assembleRelease"
fi

echo ""
echo "📱 Install on device:"
echo "   adb install app/build/outputs/apk/debug/app-debug.apk"
