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

# Load env vars for Supabase/API
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# Generate native android project if needed
if [ ! -d "android" ]; then
  echo "==> Running expo prebuild..."
  npx expo prebuild --platform android --clean
fi

cd android

# Ensure signing keystore exists
KEYSTORE="app/alpha-stocks.keystore"
if [ ! -f "$KEYSTORE" ]; then
  echo "==> Generating signing keystore..."
  keytool -genkeypair -v -storetype PKCS12 \
    -keystore "$KEYSTORE" -alias alpha-stocks \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass alphastocks123 -keypass alphastocks123 \
    -dname "CN=Alpha Stocks, O=Personal, L=Bucharest, C=RO"
fi

# Ensure release signing config in build.gradle
if ! grep -q "signingConfigs.release" app/build.gradle; then
  echo "==> Patching build.gradle with release signing config..."
  sed -i '' '/signingConfigs {/,/^    }/{
    /^    }/i\
\        release {\
\            storeFile file("alpha-stocks.keystore")\
\            storePassword "alphastocks123"\
\            keyAlias "alpha-stocks"\
\            keyPassword "alphastocks123"\
\        }
  }' app/build.gradle
  sed -i '' 's/signingConfig signingConfigs.debug$/signingConfig signingConfigs.release/' app/build.gradle
fi

# Build APK
echo "==> Building APK with Gradle..."
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
  adb install -r "$APK_PATH" 2>/dev/null || {
    echo "==> Signature mismatch, uninstalling old version..."
    adb uninstall com.alphastocks.app
    adb install "$APK_PATH"
  }
  echo "==> Done! App installed."
else
  echo "==> No device connected. APK is at:"
  echo "    apps/mobile/android/$APK_PATH"
fi
