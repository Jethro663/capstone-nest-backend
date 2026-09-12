#!/usr/bin/env bash
set -euo pipefail

IPA_PATH=${1:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
APP_JSON=${2:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
METADATA_PATH=${3:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
SOURCE_SHA=${4:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}

EXPECTED_BUNDLE_ID=com.nexora.lms.mobile
EXPECTED_API_URL=https://capstone-backend-v2-production.up.railway.app/api
STABLE_IPA_NAME=Nexora-iOS-latest-unsigned.ipa
STABLE_CHECKSUM_NAME=Nexora-iOS-latest-unsigned.ipa.sha256
CHECKSUM_PATH="$(dirname "$IPA_PATH")/$STABLE_CHECKSUM_NAME"
TEMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TEMP_ROOT"' EXIT

if [ "$(basename "$IPA_PATH")" != "$STABLE_IPA_NAME" ]; then
  printf 'IPA must be named %s.\n' "$STABLE_IPA_NAME" >&2
  exit 1
fi

unzip -tq "$IPA_PATH"
unzip -q "$IPA_PATH" -d "$TEMP_ROOT"

APP_LIST=$(find "$TEMP_ROOT/Payload" -mindepth 1 -maxdepth 1 -type d -name '*.app' -print)
APP_COUNT=$(printf '%s\n' "$APP_LIST" | sed '/^$/d' | wc -l | tr -d ' ')
if [ "$APP_COUNT" != "1" ]; then
  printf 'Expected exactly one application in Payload; found %s.\n' "$APP_COUNT" >&2
  exit 1
fi

APP_PATH=$APP_LIST
INFO_PLIST="$APP_PATH/Info.plist"
if [ ! -f "$INFO_PLIST" ]; then
  printf 'The application does not contain Info.plist.\n' >&2
  exit 1
fi

EXPECTED_VERSION=$(node -p "require(process.argv[1]).expo.version" "$APP_JSON")
EXPECTED_BUILD=$(node -p "require(process.argv[1]).expo.ios.buildNumber" "$APP_JSON")
BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw "$INFO_PLIST")
VERSION=$(plutil -extract CFBundleShortVersionString raw "$INFO_PLIST")
BUILD=$(plutil -extract CFBundleVersion raw "$INFO_PLIST")
EXECUTABLE=$(plutil -extract CFBundleExecutable raw "$INFO_PLIST")

if [ "$BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" ]; then
  printf 'Bundle identifier %s does not match %s.\n' "$BUNDLE_ID" "$EXPECTED_BUNDLE_ID" >&2
  exit 1
fi
if [ "$VERSION" != "$EXPECTED_VERSION" ]; then
  printf 'App version %s does not match app.json version %s.\n' "$VERSION" "$EXPECTED_VERSION" >&2
  exit 1
fi
if [ "$BUILD" != "$EXPECTED_BUILD" ]; then
  printf 'Build number %s does not match app.json build number %s.\n' "$BUILD" "$EXPECTED_BUILD" >&2
  exit 1
fi

lipo -archs "$APP_PATH/$EXECUTABLE" | tr ' ' '\n' | grep -Fxq arm64
if [ ! -s "$APP_PATH/main.jsbundle" ]; then
  printf 'The Release application is missing main.jsbundle.\n' >&2
  exit 1
fi
if ! LC_ALL=C grep -aFq "$EXPECTED_API_URL" "$APP_PATH/main.jsbundle"; then
  printf 'The Release JavaScript bundle does not contain the production API URL.\n' >&2
  exit 1
fi
if [ ! -d "$APP_PATH/assets" ] || [ -z "$(find "$APP_PATH/assets" -type f -print -quit)" ]; then
  printf 'The Release application is missing bundled Expo assets.\n' >&2
  exit 1
fi
if find "$APP_PATH" -name embedded.mobileprovision -print -quit | grep -q .; then
  printf 'The unsigned application must not contain a provisioning profile.\n' >&2
  exit 1
fi
if codesign -dv "$APP_PATH" >/dev/null 2>&1; then
  printf 'Expected an unsigned application, but codesign found a signature.\n' >&2
  exit 1
fi

(
  cd "$(dirname "$IPA_PATH")"
  shasum -a 256 "$STABLE_IPA_NAME" > "$(basename "$CHECKSUM_PATH")"
  shasum -a 256 -c "$(basename "$CHECKSUM_PATH")"
)

IPA_SIZE=$(stat -f %z "$IPA_PATH")
XCODE_VERSION=$(xcodebuild -version | paste -sd ' ' -)
EXPO_VERSION=$(node -p "require(process.argv[1]).dependencies.expo" "$(dirname "$APP_JSON")/package.json")
{
  printf 'sourceSha=%s\n' "$SOURCE_SHA"
  printf 'expoVersion=%s\n' "$EXPO_VERSION"
  printf 'xcode=%s\n' "$XCODE_VERSION"
  printf 'appVersion=%s\n' "$VERSION"
  printf 'buildNumber=%s\n' "$BUILD"
  printf 'bundleIdentifier=%s\n' "$BUNDLE_ID"
  printf 'apiUrl=%s\n' "$EXPECTED_API_URL"
  printf 'ipaBytes=%s\n' "$IPA_SIZE"
  printf 'builtAtUtc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$METADATA_PATH"

printf 'Verified %s (%s bytes, %s build %s, arm64).\n' \
  "$STABLE_IPA_NAME" "$IPA_SIZE" "$VERSION" "$BUILD"
