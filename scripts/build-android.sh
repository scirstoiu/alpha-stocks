#!/bin/bash
set -e

# Use JDK 17+ for Gradle
if [ -d "/opt/homebrew/opt/openjdk@17" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# Android SDK
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"

echo "==> Building Android APK locally (Java: $(java -version 2>&1 | head -1))..."

cd "$(dirname "$0")/../apps/mobile"

# Generate native android project if needed
if [ ! -d "android" ]; then
  echo "==> Running expo prebuild..."
  npx expo prebuild --platform android --clean
fi

# Build APK
echo "==> Building APK with Gradle..."
cd android
./gradlew assembleRelease --warning-mode=none -q

APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_PATH" ]; then
  echo "ERROR: APK not found at $APK_PATH"
  exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "==> APK built: $APK_SIZE"

# Install on connected device (USB or WiFi)
if adb devices | grep -q "device$"; then
  echo "==> Installing on device..."
  adb install -r "$APK_PATH"
  echo "==> Done! App installed."
else
  echo "==> No device connected. APK is at:"
  echo "    apps/mobile/android/$APK_PATH"
fi
