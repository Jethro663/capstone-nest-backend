# Mobile APK Installer Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a verified Nexora APK reliably reach Android Package Installer, recover from cancellation or Unknown Apps blocking without redownloading, and publish an APK whose release gate proves the required permission is embedded.

**Architecture:** Keep the existing Expo FileSystem content-URI and IntentLauncher path. Add the Android manifest prerequisite, convert non-success activity results into a typed installation-stage error, preserve verified bytes for Settings/retry recovery, and extend the release verifier to inspect both source permissions and compiled `aapt` metadata.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, Jest, Node test runner, Android Gradle/Java 17, Android build-tools 36, GitHub Actions, Railway.

## Global Constraints

- Do not add a runtime dependency or custom native module.
- Keep backend API contracts unchanged.
- Keep the verified APK for recoverable installer failures; delete or clear it only when verification proves it missing or invalid.
- Build only `arm64-v8a` for the published internal sideload APK.
- Build with `EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api`.
- Preserve the existing signing identity for upgrade continuity and describe the artifact as internal-only.
- Register production metadata only after the exact committed APK is live.

---

### Task 1: Prove installer-result and permission regressions

**Files:**
- Modify: `mobile/src/services/update/__tests__/update.service.test.ts`
- Modify: `mobile/src/providers/__tests__/UpdateProvider.test.tsx`
- Modify: `mobile/scripts/app-version-release.test.cjs`

**Interfaces:**
- Consumes: `installApk(fileUri: string): Promise<void>` and the mocked update-service provider boundary.
- Produces: failing specifications for success, cancellation/blocking, and required release permissions.

- [ ] **Step 1: Make IntentLauncher mocks return real result objects**

Use `{ resultCode: -1 }` for successful service tests and `{ resultCode: 0 }` for cancellation.

- [ ] **Step 2: Add the service cancellation test**

```ts
it("rejects when Android closes the installer without success", async () => {
  mockGetInfoAsync.mockResolvedValue({ exists: true, size: 40177235 });
  mockStartActivityAsync.mockResolvedValue({ resultCode: 0 });

  await expect(installApk("file:///cache/update.apk")).rejects.toMatchObject({
    reason: "cancelled_or_blocked",
  });
});
```

- [ ] **Step 3: Replace the provider's loop assertion**

Make installer success remove **Ready to Install**, and make a rejected error with `reason: "cancelled_or_blocked"` display **Open Settings (Unknown Apps)** and **Retry Installation** while avoiding connection copy.

- [ ] **Step 4: Add release-verifier permission tests**

Add one fixture option that omits `android.permission.REQUEST_INSTALL_PACKAGES` from `app.json` and one that omits its `uses-permission` line from `apkBadging`; assert both reject with a message naming the permission.

- [ ] **Step 5: Run red tests**

Run:

```bash
cd mobile
npm test -- --runInBand src/services/update/__tests__/update.service.test.ts src/providers/__tests__/UpdateProvider.test.tsx
npm run test:release
```

Expected: failures because cancellation is currently accepted, success loops back to ready, and release verification does not inspect permission.

---

### Task 2: Implement typed installer handoff and Android permission

**Files:**
- Modify: `mobile/src/services/update/update.service.ts`
- Modify: `mobile/src/providers/UpdateProvider.tsx`
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Produces: `ApkInstallationError` with `reason: "cancelled_or_blocked"` and `installApk(fileUri): Promise<void>` that resolves only on `ResultCode.Success`.
- Consumes: `IntentLauncher.startActivityAsync` and the existing provider recovery surface.

- [ ] **Step 1: Add the typed installation error**

```ts
export type ApkInstallationFailureReason = "cancelled_or_blocked";

export class ApkInstallationError extends Error {
  constructor(
    public readonly reason: ApkInstallationFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "ApkInstallationError";
  }
}
```

- [ ] **Step 2: Require an authoritative success result**

```ts
const result = await IntentLauncher.startActivityAsync(
  "android.intent.action.VIEW",
  {
    data: contentUri,
    flags: 1,
    type: "application/vnd.android.package-archive",
  },
);
if (result.resultCode !== IntentLauncher.ResultCode.Success) {
  throw new ApkInstallationError(
    "cancelled_or_blocked",
    "Android closed or blocked the package installer before installation completed.",
  );
}
```

- [ ] **Step 3: Remove the unconditional ready-state reset**

After `installApk` resolves, change the provider to `status: "idle"`, clear the completed URI, and keep `failureStage: null`. Map `reason === "cancelled_or_blocked"` to the existing blocked state before legacy message heuristics.

- [ ] **Step 4: Use accurate recovery copy**

Display: `Android did not complete the installation. The installer may have been cancelled, or installation from Nexora may be blocked.` Keep both settings and retry buttons.

- [ ] **Step 5: Declare the installer permission twice**

Add `android.permission.REQUEST_INSTALL_PACKAGES` to `expo.android.permissions` and:

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>
```

to the checked-in native manifest.

- [ ] **Step 6: Run focused green verification**

Run the two focused Jest files and `npm run typecheck`. Expected: all pass with zero type errors.

---

### Task 3: Make release verification enforce the permission

**Files:**
- Modify: `mobile/scripts/app-version-release.cjs`
- Modify: `mobile/scripts/app-version-release.test.cjs`

**Interfaces:**
- Produces: `parseAaptPermissions(output): string[]` and release failure when source or APK permission is absent.
- Consumes: the existing `aapt dump badging` text already used for version verification.

- [ ] **Step 1: Parse embedded permissions**

```js
const REQUIRED_INSTALL_PERMISSION =
  "android.permission.REQUEST_INSTALL_PACKAGES";

function parseAaptPermissions(output) {
  return [...output.matchAll(/uses-permission(?:-sdk-\d+)?: name='([^']+)'/g)]
    .map((match) => match[1]);
}
```

- [ ] **Step 2: Validate source configuration**

Require `expo.android.permissions` to include either the fully qualified permission or `REQUEST_INSTALL_PACKAGES`; error text must identify the missing permission.

- [ ] **Step 3: Validate compiled APK metadata**

After parsing badging, require `parseAaptPermissions(apkBadging)` to contain the fully qualified permission.

- [ ] **Step 4: Run release tests and verifier**

Run `npm run test:release`; after building the new APK, run `npm run release:verify` and require both to pass.

---

### Task 4: Build, inspect, and embed version 0.1.15

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Replace: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Modify: `docs/mobile-apk-release-runbook.md`

**Interfaces:**
- Produces: package `com.nexora.lms.mobile`, version `0.1.15`, code `16`, ARM64 APK and exact registration manifest.

- [ ] **Step 1: Bump both native version sources**

Set `expo.version`/Gradle `versionName` to `0.1.15` and both version codes to `16`.

- [ ] **Step 2: Build the release**

```bash
cd mobile/android
JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7 \
ANDROID_HOME=/home/jethro/Android/Sdk \
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
NODE_ENV=production \
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --max-workers=2
```

- [ ] **Step 3: Inspect the APK**

Run `aapt dump badging`, `aapt dump permissions`, `apksigner verify --verbose --print-certs`, `zipalign -c -P 16 -v 4`, `unzip -t`, ABI listing, and bundle/source-map checks. Require version `0.1.15`/`16`, the install permission, v2 signature, only `arm64-v8a`, valid ZIP, 16 KB alignment, and the production API URL.

- [ ] **Step 4: Embed and generate metadata**

Copy the Gradle output to `next-frontend/public/downloads/nexora-student-mobile-release.apk`, require `cmp` success, then run:

```bash
cd mobile
npm run release:prepare -- \
  --min-supported-version-code 1 \
  --release-notes "Reliable Android installer handoff and Unknown Apps recovery."
npm run release:verify
```

---

### Task 5: Complete safety gates and exact delivery

**Files:**
- Verify all changed paths from Tasks 1-4 and OpenSpec artifacts.

**Interfaces:**
- Produces: a clean pushed commit, exact-commit green workflows, live byte equality, and production policy registration.

- [ ] **Step 1: Run repeated mobile gates**

Run mobile typecheck once and the complete Jest suite three independent times. Run release tests and release verification again after the final artifact copy.

- [ ] **Step 2: Run cross-surface safety gates**

Run the backend build plus focused app-version tests, frontend typecheck/tests/build, `openspec validate fix-mobile-apk-installer-handoff`, and `git diff --check`.

- [ ] **Step 3: Commit and push reviewed scope**

Inspect `git status`, diff, and `git rev-list --left-right --count origin/developement...HEAD`. Commit with `fix(mobile): complete Android APK installer handoff`, push `developement`, and record the exact SHA.

- [ ] **Step 4: Watch terminal workflow results**

Watch the exact commit's CI and Railway deployment jobs to terminal success. Confirm backend and frontend deployments use the pushed SHA.

- [ ] **Step 5: Verify and register production bytes**

Download the live APK to a temporary file, compare SHA-256, byte count, and `cmp` against the committed artifact. Register the unchanged JSON manifest only after equality, then query version 15 and version 16 clients; version 15 must receive `apk_optional` for version 16 and version 16 must receive `none`.
