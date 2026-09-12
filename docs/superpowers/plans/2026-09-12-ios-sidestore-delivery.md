# iOS SideStore Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, and publish a standalone unsigned Nexora iPhone IPA that a Windows/iPhone tester can install through SideStore using one stable download link and one exhaustive handoff guide.

**Architecture:** GitHub Actions generates the uncommitted iOS native project on a macOS 26 runner, compiles a Release application for `iphoneos` with project signing disabled, packages and verifies the IPA, and optionally publishes stable-named files to the `ios-sidestore-latest` prerelease. SideStore applies the tester's seven-day personal-development signature on the iPhone; the repository never receives Apple credentials or pairing material.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, Node.js 20.19.4, npm, Expo Prebuild, CocoaPods, Xcode 26.5, Bash, Node test runner, GitHub Actions, GitHub CLI, SideStore/iLoader/LocalDevVPN.

## Global Constraints

- Build only from `mobile/`; do not modify backend, frontend, AI service, database, Android signing, APK updater, Railway deployment, App Store, or TestFlight behavior.
- Use `com.nexora.lms.mobile` as `expo.ios.bundleIdentifier`.
- Inject exactly `https://capstone-backend-v2-production.up.railway.app/api` as `EXPO_PUBLIC_API_URL` for the Release build.
- Keep `mobile/ios/` ephemeral and uncommitted.
- Never store or publish an Apple Account password, two-factor code, pairing file, UDID, provisioning profile, certificate, Nexora test credential, or privileged backend secret.
- Build on `macos-26` with `/Applications/Xcode_26.5.app` and require an ARM64 `iphoneos` Release executable.
- Publish only after typecheck, delivery-contract tests, native compilation, archive checks, metadata checks, and checksum generation pass.
- Preserve an immutable, versioned Actions artifact while exposing stable convenience filenames on `ios-sidestore-latest`.
- Treat SideStore installation and physical-device testing as separate evidence from App Store/TestFlight/APNs validation.

---

### Task 1: Lock the iOS delivery contract

**Files:**
- Create: `mobile/scripts/ios-sidestore-delivery.test.cjs`
- Modify: `mobile/package.json`
- Modify: `mobile/app.json`

**Interfaces:**
- Consumes: existing Expo configuration and Node's built-in test runner.
- Produces: `npm run test:ios-sidestore`; configured bundle identifier `com.nexora.lms.mobile`; static contract coverage used by CI and the build workflow.

- [ ] **Step 1: Write the failing delivery-contract tests**

Create `mobile/scripts/ios-sidestore-delivery.test.cjs` with tests that read paths relative to `mobile/` and assert the exact delivery contract:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "..");

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("Expo config defines the stable iOS SideStore identity", async () => {
  const appJson = JSON.parse(await read("mobile/app.json"));
  assert.equal(appJson.expo.ios.bundleIdentifier, "com.nexora.lms.mobile");
  assert.match(appJson.expo.ios.buildNumber, /^\d+$/);
  assert.match(appJson.expo.version, /^\d+\.\d+\.\d+$/);
});

test("the iOS workflow is manual, unsigned, verified, and publish-gated", async () => {
  const workflow = await read(".github/workflows/build-mobile-ios-sidestore.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
  assert.match(workflow, /runs-on: macos-26/);
  assert.match(workflow, /Xcode_26\.5\.app/);
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/);
  assert.match(workflow, /verify-ios-sidestore-ipa\.sh/);
  assert.match(workflow, /ios-sidestore-latest/);
  assert.match(workflow, /inputs\.publish == true/);
  assert.match(
    workflow,
    /https:\/\/capstone-backend-v2-production\.up\.railway\.app\/api/,
  );
});

test("the verifier enforces identity, ARM64, embedded JS, and no profile", async () => {
  const verifier = await read("mobile/scripts/verify-ios-sidestore-ipa.sh");
  for (const required of [
    "set -euo pipefail",
    "CFBundleIdentifier",
    "CFBundleShortVersionString",
    "CFBundleVersion",
    "arm64",
    "main.jsbundle",
    "embedded.mobileprovision",
    "codesign -dv",
    "Nexora-iOS-latest-unsigned.ipa.sha256",
  ]) {
    assert.ok(verifier.includes(required), `missing verifier gate: ${required}`);
  }
});

test("the tester guide covers install, refresh, evidence, privacy, and recovery", async () => {
  const guide = await read("docs/mobile-ios-sidestore-windows-guide.md");
  for (const required of [
    "Verify 64-bit Windows",
    "Install LocalDevVPN",
    "Install iLoader",
    "Install SideStore Stable",
    "Enable Developer Mode",
    "First SideStore refresh",
    "Install Nexora",
    "Refresh before seven days",
    "Physical-device test checklist",
    "Do not send anyone",
    "Troubleshooting",
    "Remove SideStore and Nexora",
  ]) {
    assert.ok(guide.includes(required), `guide is missing: ${required}`);
  }
});
```

- [ ] **Step 2: Add the test command and prove it fails for the missing delivery files**

Add this script to `mobile/package.json`:

```json
"test:ios-sidestore": "node --test scripts/ios-sidestore-delivery.test.cjs"
```

Run:

```bash
npm --prefix mobile run test:ios-sidestore
```

Expected: FAIL because `expo.ios.bundleIdentifier`, the workflow, verifier, and guide do not exist yet.

- [ ] **Step 3: Add the iOS bundle identifier**

Change the iOS block in `mobile/app.json` to preserve the current build number and add the stable identity:

```json
"ios": {
  "bundleIdentifier": "com.nexora.lms.mobile",
  "buildNumber": "3"
}
```

- [ ] **Step 4: Run the focused test and confirm only later-task fixtures remain red**

Run:

```bash
npm --prefix mobile run test:ios-sidestore
```

Expected: the Expo identity test passes; workflow, verifier, and guide tests fail with missing-file errors.

- [ ] **Step 5: Commit the identity and contract tests**

```bash
git add mobile/app.json mobile/package.json mobile/scripts/ios-sidestore-delivery.test.cjs
git commit -m "test(mobile): lock iOS SideStore delivery contract"
```

---

### Task 2: Build and verify the unsigned IPA

**Files:**
- Create: `mobile/scripts/verify-ios-sidestore-ipa.sh`
- Create: `.github/workflows/build-mobile-ios-sidestore.yml`
- Test: `mobile/scripts/ios-sidestore-delivery.test.cjs`

**Interfaces:**
- Consumes: `mobile/app.json`, an unsigned `Release-iphoneos/*.app`, `EXPO_PUBLIC_API_URL`, GitHub workflow inputs `publish` and `release_notes`.
- Produces: `mobile/dist/ios/Nexora-iOS-latest-unsigned.ipa`, `.sha256`, metadata, an immutable Actions artifact, and optional `ios-sidestore-latest` prerelease assets.

- [ ] **Step 1: Implement the fail-closed IPA verifier**

Create executable `mobile/scripts/verify-ios-sidestore-ipa.sh`. It must accept exactly four arguments—IPA, app.json, metadata output, and source SHA—and perform these concrete checks:

```bash
#!/usr/bin/env bash
set -euo pipefail

IPA_PATH=${1:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
APP_JSON=${2:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
METADATA_PATH=${3:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
SOURCE_SHA=${4:?Usage: verify-ios-sidestore-ipa.sh IPA APP_JSON METADATA SOURCE_SHA}
EXPECTED_BUNDLE_ID=com.nexora.lms.mobile
EXPECTED_API_URL=https://capstone-backend-v2-production.up.railway.app/api
STABLE_IPA_NAME=Nexora-iOS-latest-unsigned.ipa
CHECKSUM_PATH="${IPA_PATH}.sha256"
TEMP_ROOT=$(mktemp -d)
trap 'rm -rf "$TEMP_ROOT"' EXIT

test "$(basename "$IPA_PATH")" = "$STABLE_IPA_NAME"
unzip -tq "$IPA_PATH"
unzip -q "$IPA_PATH" -d "$TEMP_ROOT"
mapfile -t APPS < <(find "$TEMP_ROOT/Payload" -mindepth 1 -maxdepth 1 -type d -name '*.app' -print)
test "${#APPS[@]}" -eq 1
APP_PATH=${APPS[0]}
INFO_PLIST="$APP_PATH/Info.plist"

EXPECTED_VERSION=$(node -p "require(process.argv[1]).expo.version" "$APP_JSON")
EXPECTED_BUILD=$(node -p "require(process.argv[1]).expo.ios.buildNumber" "$APP_JSON")
BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw "$INFO_PLIST")
VERSION=$(plutil -extract CFBundleShortVersionString raw "$INFO_PLIST")
BUILD=$(plutil -extract CFBundleVersion raw "$INFO_PLIST")
EXECUTABLE=$(plutil -extract CFBundleExecutable raw "$INFO_PLIST")

test "$BUNDLE_ID" = "$EXPECTED_BUNDLE_ID"
test "$VERSION" = "$EXPECTED_VERSION"
test "$BUILD" = "$EXPECTED_BUILD"
lipo -archs "$APP_PATH/$EXECUTABLE" | tr ' ' '\n' | grep -Fxq arm64
test -s "$APP_PATH/main.jsbundle"
LC_ALL=C grep -aFq "$EXPECTED_API_URL" "$APP_PATH/main.jsbundle"
test -d "$APP_PATH/assets"
test -n "$(find "$APP_PATH/assets" -type f -print -quit)"
! find "$APP_PATH" -name embedded.mobileprovision -print -quit | grep -q .
if codesign -dv "$APP_PATH" >/dev/null 2>&1; then
  printf 'Expected an unsigned application, but codesign found a signature.\n' >&2
  exit 1
fi

shasum -a 256 "$IPA_PATH" | sed "s#  .*#  $STABLE_IPA_NAME#" > "$CHECKSUM_PATH"
(
  cd "$(dirname "$IPA_PATH")"
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
```

Make it executable:

```bash
chmod +x mobile/scripts/verify-ios-sidestore-ipa.sh
```

- [ ] **Step 2: Implement the manual GitHub workflow**

Create `.github/workflows/build-mobile-ios-sidestore.yml` with:

- `workflow_dispatch` only.
- Boolean input `publish`, default `false`.
- String input `release_notes`, default `Physical iPhone acceptance build for Nexora Capstone 2.`.
- Job-level `contents: write`, `macos-26`, Xcode 26.5, Node 20.19.4, npm caching, and a 60-minute timeout.
- `npm ci`, `npm run test:ios-sidestore`, `npm run test:release`, `npm run release:verify`, and `npm run typecheck` in `mobile/`.
- `npx expo install --check`, clean iOS Prebuild, and `npx pod-install ios`.
- Workspace/scheme discovery followed by an unsigned generic-device Release build:

```bash
xcodebuild \
  -workspace "$IOS_WORKSPACE" \
  -scheme "$IOS_SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$RUNNER_TEMP/nexora-ios-derived" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  build
```

- `.app` discovery, `Payload/` packaging with `ditto`, and ZIP creation at `mobile/dist/ios/Nexora-iOS-latest-unsigned.ipa`.
- Invocation of the verifier with `${{ github.sha }}`.
- `actions/upload-artifact@v4` using `Nexora-iOS-<version>-build<build>-<shortsha>` as the immutable artifact name.
- A publish step guarded by exactly `if: ${{ inputs.publish == true }}` that creates or edits `ios-sidestore-latest`, writes current metadata into the release body, and uploads the stable IPA/checksum/metadata filenames with `gh release upload --clobber`.

The workflow must pass `EXPO_PUBLIC_API_URL` as a job environment variable and must never reference Apple secrets.

- [ ] **Step 3: Run the static contract test**

```bash
npm --prefix mobile run test:ios-sidestore
```

Expected: identity, workflow, and verifier tests pass; only the missing-guide test fails.

- [ ] **Step 4: Validate shell and YAML syntax locally**

```bash
bash -n mobile/scripts/verify-ios-sidestore-ipa.sh
python3 -c 'import sys, yaml; yaml.safe_load(open(sys.argv[1], encoding="utf-8"))' .github/workflows/build-mobile-ios-sidestore.yml
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the builder and verifier**

```bash
git add .github/workflows/build-mobile-ios-sidestore.yml mobile/scripts/verify-ios-sidestore-ipa.sh
git commit -m "ci(mobile): build verified iOS SideStore IPA"
```

---

### Task 3: Write the tester-proof Windows/iPhone guide

**Files:**
- Create: `docs/mobile-ios-sidestore-windows-guide.md`
- Test: `mobile/scripts/ios-sidestore-delivery.test.cjs`

**Interfaces:**
- Consumes: stable GitHub prerelease URL, official SideStore installation flow, iPhone 11/iOS 26.5, 64-bit Windows, a data cable, Wi-Fi, and tester-owned Apple/Nexora accounts.
- Produces: one self-contained guide covering preparation, SideStore installation, Nexora installation, seven-day refresh, physical-device acceptance, evidence capture, recovery, privacy, and cleanup.

- [ ] **Step 1: Write the complete handoff guide**

Create `docs/mobile-ios-sidestore-windows-guide.md` with these exact top-level sections and bounded instructions:

```markdown
# Install and Test Nexora on iPhone with SideStore

## What this installs
Explain unsigned GitHub build -> personal seven-day SideStore signature -> physical iPhone, plus the non-TestFlight/APNs boundary.

## Before starting
List iPhone 11/iOS 26.5, passcode and owner Face ID, 64-bit Windows, data cable, Wi-Fi, 2 GB free phone storage, browser, dedicated Apple Account, and role-specific Nexora accounts. Warn never to send passwords, 2FA codes, pairing files, or private student evidence.

## Part 1 — Verify 64-bit Windows
Give Settings > System > About > System type instructions and stop on 32-bit Windows.

## Part 2 — Install LocalDevVPN
Give App Store search/publisher verification, installation, Add VPN Configuration, Allow, passcode, and disconnected-until-needed behavior.

## Part 3 — Install iTunes and iLoader
Use the official SideStore prerequisite links, prefer Apple-hosted iTunes, install iLoader Stable MSI, restart Windows, and prohibit unofficial mirrors.

## Part 4 — Install SideStore Stable
Unlock the phone, connect cable, tap Trust, enter passcode, open iLoader, enter the dedicated Apple Account locally, select the iPhone, install stable, and describe success/error states.

## Part 5 — Trust SideStore and Enable Developer Mode
Give Settings > General > VPN & Device Management > Developer App > Trust; Settings > Privacy & Security > Developer Mode > restart > Turn On; owner Face ID/passcode requirements.

## Part 6 — First SideStore refresh
Connect Wi-Fi and LocalDevVPN, open SideStore, sign in with the same Apple Account, My Apps, tap the SideStore seven-day counter, approve certificate creation/revocation, and require seven days remaining before continuing.

## Part 7 — Install Nexora
Open the stable GitHub release URL in Safari, download `Nexora-iOS-latest-unsigned.ipa`, find it in Files > Downloads, open SideStore > My Apps > plus, select the IPA, wait without closing apps, and confirm Nexora appears on the Home Screen and in My Apps with seven days.

## Part 8 — First launch checks
Disconnect the cable, keep internet on, launch Nexora without Metro, verify production campus health/login, deny optional permissions until their feature is tested, and record app/device identity.

## Part 9 — Physical-device test checklist
Provide checkboxes for cold launch, production API, each role, login/session/logout, tabs/routes, forms/keyboard, safe areas/orientation/font scaling, pickers, sharing, WebView/rich text, network loss/recovery, foreground/background, local notifications, update-gate iOS exemption, and assessment screen-capture protection. Mark remote APNs/TestFlight/App Store as not testable.

## Part 10 — Record capstone evidence
Give Control Center screen recording steps, microphone choice, second-camera requirement for protected assessments, privacy redaction, filenames, and an evidence table with timestamp/device/iOS/app version/build/source SHA/role/result.

## Part 11 — Refresh before seven days
Require Wi-Fi, LocalDevVPN, SideStore > My Apps > Refresh All at least once every six days, verify counters return to seven, and explain recovery before deleting apps.

## Troubleshooting
Cover no Trust prompt, iPhone absent in iLoader, SideStore absent after install, Untrusted Developer, Developer Mode absent, anisette login failure, 3-app/10-App-ID limit, LocalDevVPN failure, pairing-file expiry, IPA download becoming ZIP, integrity mismatch, install failure, app crash, production API failure, and certificate expiry.

## Update to a newer Nexora build
Refresh SideStore, download the same stable IPA name again, import it without deleting the old app, confirm version/build, and repeat the smoke checklist.

## Remove SideStore and Nexora
Give app deletion, Settings > General > VPN & Device Management profile removal, LocalDevVPN deletion, pairing-file deletion from Windows, and optional dedicated Apple Account review. Warn that deleting Nexora removes local app data.
```

Every instruction must include the expected visible result and the exact next recovery action when that result does not appear.

- [ ] **Step 2: Run the complete contract test**

```bash
npm --prefix mobile run test:ios-sidestore
```

Expected: PASS, all four tests.

- [ ] **Step 3: Review the guide as a first-time tester**

Verify manually that the guide never assumes Git, GitHub Actions, Node.js, Expo, Xcode, command-line knowledge, project source access, or access to the development computer. Verify every credential remains on the tester's own devices.

- [ ] **Step 4: Commit the guide**

```bash
git add docs/mobile-ios-sidestore-windows-guide.md
git commit -m "docs(mobile): add exhaustive SideStore tester guide"
```

---

### Task 4: Run local pre-publication verification

**Files:**
- Verify: all files from Tasks 1–3
- Modify only if a failing check identifies a scoped defect.

**Interfaces:**
- Consumes: completed delivery implementation.
- Produces: local static/test evidence proving the workflow is safe to dispatch.

- [ ] **Step 1: Run focused delivery checks**

```bash
npm --prefix mobile run test:ios-sidestore
bash -n mobile/scripts/verify-ios-sidestore-ipa.sh
python3 -c 'import sys, yaml; yaml.safe_load(open(sys.argv[1], encoding="utf-8"))' .github/workflows/build-mobile-ios-sidestore.yml
```

Expected: all exit 0.

- [ ] **Step 2: Run mobile release and source checks**

```bash
npm --prefix mobile run test:release
npm --prefix mobile run release:verify
npm --prefix mobile run typecheck
npm --prefix mobile run test
npm --prefix mobile run build:rich-text
git diff --exit-code -- mobile/src/generated/assessment-rich-text.ts
```

Expected: all pass and the generated rich-text bundle is unchanged.

- [ ] **Step 3: Audit the scope and secrets**

```bash
git diff --check
git status --short
git diff --stat origin/developement...HEAD
git diff --name-only origin/developement...HEAD
rg -n -i 'apple.?id.?password|two.?factor|pairing.?file.?data|BEGIN (RSA |EC )?PRIVATE KEY|\.mobileprovision' .github/workflows/build-mobile-ios-sidestore.yml mobile/scripts docs/mobile-ios-sidestore-windows-guide.md
```

Expected: only the approved design, plan, mobile iOS identity/test/verifier, workflow, and guide differ; the secret scan finds warnings/documentation only, never credential values or encoded material.

- [ ] **Step 4: Commit any verification-only corrections**

If and only if checks required scoped corrections:

```bash
git add .github/workflows/build-mobile-ios-sidestore.yml mobile/app.json mobile/package.json mobile/scripts docs/mobile-ios-sidestore-windows-guide.md docs/superpowers
git commit -m "fix(mobile): harden iOS SideStore delivery"
```

---

### Task 5: Publish and verify the exact iOS artifact

**Files:**
- External state: `origin/developement`, GitHub Actions run, `ios-sidestore-latest` GitHub prerelease and assets.

**Interfaces:**
- Consumes: reviewed local commits and authenticated GitHub CLI with `workflow` and `repo` scopes.
- Produces: exact-SHA CI evidence, a successful native macOS build, immutable workflow artifact, public stable IPA/checksum/metadata links, and downloaded-byte verification.

- [ ] **Step 1: Push the reviewed commits**

```bash
git rev-list --left-right --count origin/developement...HEAD
git push origin developement
git rev-parse HEAD
```

Expected: divergence becomes `0 0`; record the full source SHA.

- [ ] **Step 2: Wait for ordinary CI on the exact SHA**

```bash
gh run list --workflow CI --commit "$(git rev-parse HEAD)" --limit 1
gh run watch <CI_RUN_ID> --exit-status
```

Expected: the exact-SHA CI run reaches terminal success.

- [ ] **Step 3: Dispatch the publish build**

```bash
gh workflow run build-mobile-ios-sidestore.yml \
  --ref developement \
  -f publish=true \
  -f release_notes='Physical iPhone acceptance build for Nexora Capstone 2.'
```

Resolve the new run ID and wait:

```bash
gh run list --workflow build-mobile-ios-sidestore.yml --branch developement --limit 1
gh run watch <IOS_RUN_ID> --exit-status
```

Expected: terminal success on the recorded source SHA.

- [ ] **Step 4: Verify release metadata and public bytes**

```bash
gh release view ios-sidestore-latest --json tagName,isPrerelease,assets,url
release_tmp=$(mktemp -d)
gh release download ios-sidestore-latest --dir "$release_tmp"
(
  cd "$release_tmp"
  sha256sum -c Nexora-iOS-latest-unsigned.ipa.sha256
  unzip -tq Nexora-iOS-latest-unsigned.ipa
)
```

Expected: prerelease is true; all three stable assets exist; checksum and ZIP verification pass. Remove only the specific temporary directory after recording evidence.

- [ ] **Step 5: Record the handoff links**

Record:

```text
Release page: https://github.com/Jethro663/capstone-nest-backend/releases/tag/ios-sidestore-latest
Direct IPA: https://github.com/Jethro663/capstone-nest-backend/releases/download/ios-sidestore-latest/Nexora-iOS-latest-unsigned.ipa
Guide: https://github.com/Jethro663/capstone-nest-backend/blob/developement/docs/mobile-ios-sidestore-windows-guide.md
```

---

### Task 6: Complete friend-side physical acceptance

**Files:**
- Evidence produced by tester: screenshots/video/checklist; do not commit private student data.

**Interfaces:**
- Consumes: verified release and `docs/mobile-ios-sidestore-windows-guide.md`.
- Produces: SideStore install/refresh evidence and physical iPhone functional evidence for the capstone.

- [ ] **Step 1: Tester completes Parts 1–7 of the guide**

Expected: SideStore and Nexora both show seven days remaining, and Nexora appears on the iPhone Home Screen.

- [ ] **Step 2: Tester completes first-launch and role smoke checks**

Expected: Nexora launches with the Windows computer disconnected, reaches the production API, and completes one real data-backed workflow for student, teacher, and administrator.

- [ ] **Step 3: Tester captures the required evidence**

Expected: evidence identifies iPhone 11, iOS 26.5, Nexora version/build, source SHA, timestamp, tested role, and pass/fail result. Protected assessment recording uses a second camera and contains no private student data.

- [ ] **Step 4: Tester proves renewal**

Expected: LocalDevVPN connects over Wi-Fi and SideStore refresh returns both SideStore and Nexora to seven days without reinstalling or losing local data.

- [ ] **Step 5: Audit completion boundaries**

Report separately:

```text
Source/static checks: PASS or exact failure
Unsigned native iPhone build: PASS or exact failure
Public artifact integrity: PASS or exact failure
SideStore sign/install/refresh: PASS or exact failure
Physical iPhone role flows: PASS or exact failure
App Store/TestFlight/APNs: NOT CLAIMED
```

Do not mark the delivery complete until all first five evidence lines have terminal results and every failed line has either been corrected and re-run or explicitly accepted by the user as a capstone limitation.
