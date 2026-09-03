# Mobile APK Release Runbook

This runbook publishes the sideloaded Nexora Android APK and its backend update
policy as one verified release. Registration must happen only after the new APK
is live and has been proven byte-for-byte identical to the reviewed manifest.

## 1. Confirm the release scope

Start from `developement`, fetch the remote, and inspect the working tree. Every
changed path must belong to the intended release before continuing.

```bash
git status --short
git diff --check
git rev-list --left-right --count origin/developement...HEAD
```

## 2. Increment both Android version sources

Increase the version name and monotonically increasing version code in both:

- `mobile/app.json`: `expo.version` and `expo.android.versionCode`
- `mobile/android/app/build.gradle`: `versionName` and `versionCode`

The release metadata tool rejects any difference between these sources or the
version embedded in the APK.

## 3. Build locally with the production API URL

Use Java 17 and explicitly inject the production backend URL. GitHub Actions
does not build or replace this APK.

```bash
cd mobile/android
export JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7
export EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
cd ../..
```

## 4. Inspect the release artifact

Use the installed Android build-tools version in place of `36.0.0` if needed.

```bash
ANDROID_BUILD_TOOLS=/home/jethro/Android/Sdk/build-tools/36.0.0
APK=mobile/android/app/build/outputs/apk/release/app-release.apk
"$ANDROID_BUILD_TOOLS/aapt" dump badging "$APK" | rg '^package:'
"$ANDROID_BUILD_TOOLS/apksigner" verify --verbose --print-certs "$APK"
"$ANDROID_BUILD_TOOLS/zipalign" -c -P 16 -v 4 "$APK"
unzip -t "$APK"
unzip -l "$APK" | rg 'lib/arm64-v8a/.+\.so$'
```

Record the package, version name/code, signing certificate SHA-256, ZIP result,
ABI, and 16 KB alignment result in the release evidence.

## 5. Copy and verify the web artifact

```bash
cp mobile/android/app/build/outputs/apk/release/app-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.apk
cmp mobile/android/app/build/outputs/apk/release/app-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.apk
```

## 6. Generate the registration manifest

The tool derives version metadata from source plus `aapt`, and derives size and
SHA-256 from the APK itself.

```bash
cd mobile
npm run test:release
npm run release:prepare -- \
  --min-supported-version-code 1 \
  --release-notes "Describe this release."
npm run release:verify
cd ..
```

## 7. Verify and commit only reviewed paths

Run the backend, mobile, and frontend gates documented for the change. Then
inspect the diff again and commit only the release's reviewed paths. Never fold
unrelated working-tree changes into the APK release.

```bash
git diff --check
git status --short
git diff --stat
```

## 8. Deploy the exact commit

Push the reviewed commit to `developement`. Record its SHA and wait until the
GitHub workflow and the Railway backend and frontend deployments for that exact
SHA reach terminal success.

```bash
git rev-list --left-right --count origin/developement...HEAD
git rev-parse HEAD
git push origin developement
```

## 9. Compare the live APK with the manifest

Do not register policy yet. First download the deployed artifact to a temporary
file and compare both its byte count and SHA-256 with the committed manifest.

```bash
LIVE_APK="$(mktemp)"
curl -fsSL \
  https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk \
  -o "$LIVE_APK"
wc -c "$LIVE_APK"
sha256sum "$LIVE_APK"
jq '{apkSizeBytes, apkSha256}' \
  next-frontend/public/downloads/nexora-student-mobile-release.json
rm -f "$LIVE_APK"
```

The values must match exactly. Registration happens only after this comparison
passes, so the backend can never intentionally advertise bytes that are not live.

## 10. Register the exact manifest

Supply the CI secret through the environment or secret manager; never write it
to source or terminal history. Send the manifest unchanged.

```bash
curl --fail-with-body \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "X-CI-Secret: $APP_VERSION_CI_SECRET" \
  --data-binary @next-frontend/public/downloads/nexora-student-mobile-release.json \
  https://capstone-backend-v2-production.up.railway.app/api/app-version/register
```

## 11. Read back both policy branches

Query once as the immediately previous build and once as the newly released
build. The previous build must receive the new APK metadata; the new build must
receive `updateType: "none"`.

```bash
curl -fsS 'https://capstone-backend-v2-production.up.railway.app/api/app-version/check?platform=android&currentNativeVersion=PREVIOUS_VERSION&currentVersionCode=PREVIOUS_CODE&currentOtaVersion=PREVIOUS_VERSION'
curl -fsS 'https://capstone-backend-v2-production.up.railway.app/api/app-version/check?platform=android&currentNativeVersion=NEW_VERSION&currentVersionCode=NEW_CODE&currentOtaVersion=NEW_VERSION'
```

Confirm the outdated-client response repeats the manifest's URL, exact byte
size, SHA-256, native version, and version code.

## 12. Complete physical-device acceptance

On an Android device with the previous Nexora build installed:

1. Trigger the update and confirm download plus exact-size verification.
2. Tap Install Now and complete the Android installer dialog.
3. If unknown-app permission is disabled, confirm Open Settings reaches the
   Nexora-specific permission page, then retry installation.
4. Confirm the installed version name/code and signing certificate match the
   inspected APK.
5. Cancel the installer once and confirm Nexora returns to Ready to Install,
   without a duplicate Install Now action or a stuck Installing state.

Record device model, Android version, old/new Nexora versions, timestamp, and
the signing certificate SHA-256 with the release evidence.
