# Mobile Version Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop latest-build APK update prompts, report authoritative runtime identity, expose installed-version diagnostics across mobile roles, and publish a verified `0.1.16` / code-17 APK.

**Architecture:** `AppVersionService` owns a monotonic binary-version invariant; the mobile update service reports OTA runtime only from an enabled native Expo Updates module. A small `AppVersionInfo` component owns profile-level version presentation, while `UpdateProvider` owns installed-versus-available decision presentation. The API contract remains unchanged.

**Tech Stack:** NestJS 11, Jest, Expo 54, React Native 0.81, expo-application, expo-updates, React Test Renderer, Android Gradle/Java 17, aapt, apksigner, zipalign.

## Global Constraints

- Preserve the public `success/message/data` app-version response envelope and existing DTO fields.
- Never offer an APK when `currentVersionCode >= latestVersionCode`.
- Preserve forced updates below `minSupportedVersionCode` and optional updates for genuinely older clients.
- OTA-disabled clients must omit `currentOtaVersion`; never serialize `{ policy: "appVersion" }`.
- Use `information-outline`, not a global exclamation overlay; show version diagnostics only in the update dialog and Profile surfaces.
- Publish Android native version `0.1.16`, version code `17`, ARM64-only, using the existing internal signing certificate and production API URL.
- Do not register version 17 until the matching APK and JSON manifest are live and byte-identical.

---

### Task 1: Prove the backend monotonicity regression

**Files:**
- Modify: `backend/src/modules/app-version/app-version.service.spec.ts`
- Modify: `backend/src/modules/app-version/app-version.service.ts`

**Interfaces:**
- Consumes: `AppVersionService.checkVersion(query: CheckAppVersionDto): Promise<AppVersionDecision>`
- Produces: unchanged `AppVersionDecision`; `apk_optional` requires a strictly newer registered `versionCode`.

- [ ] **Step 1: Replace the same-build mismatch expectation with a failing monotonicity test**

Use a policy at code 10 and query code 10 with a mismatched runtime:

```ts
it('returns none when the client already has the latest version code despite runtime mismatch', async () => {
  mockDb.query.appVersions.findFirst.mockResolvedValue({
    platform: 'android',
    versionCode: 10,
    minSupportedVersionCode: 5,
    nativeVersion: '1.2.0',
    otaRuntimeVersion: 'exposdk:54.0.0',
    apkDownloadUrl: 'https://example.com/app.apk',
    apkSha256: null,
    apkSizeBytes: null,
    isForceUpdate: false,
    requiresFullApk: false,
  });

  const result = await service.checkVersion({
    platform: 'android',
    currentVersionCode: 10,
    currentOtaVersion: '[object Object]',
  });

  expect(result.updateType).toBe('none');
  expect(result.isForceUpdate).toBe(false);
});
```

Add a second case with policy code 11, client code 10, `requiresFullApk: false`, and mismatched runtime expecting `apk_optional`.

- [ ] **Step 2: Run the backend spec and verify RED**

Run: `cd backend && npm run test -- --runInBand src/modules/app-version/app-version.service.spec.ts`

Expected: the same-build case fails because current logic returns `apk_optional`.

- [ ] **Step 3: Implement the monotonic optional-update guard**

In `checkVersion`, derive `isBehindLatestVersion` and require it around both optional reasons:

```ts
const isBehindLatestVersion = clientVersionCode < policy.versionCode;

else if (
  isBehindLatestVersion && (policy.requiresFullApk || hasRuntimeMismatch)
) {
  updateType = 'apk_optional';
  isForceUpdate = false;
}
```

Keep the forced branch first and unchanged.

- [ ] **Step 4: Run the backend spec and verify GREEN**

Run: `cd backend && npm run test -- --runInBand src/modules/app-version/app-version.service.spec.ts`

Expected: all app-version service tests pass, including same-build `none`, older-build optional, and below-floor forced.

### Task 2: Prove and repair mobile runtime reporting

**Files:**
- Modify: `mobile/src/services/update/__tests__/update.service.test.ts`
- Modify: `mobile/src/services/update/update.service.ts`

**Interfaces:**
- Consumes: `Updates.isEnabled`, `Updates.runtimeVersion`, `Application.nativeApplicationVersion`, `Application.nativeBuildVersion`.
- Produces: `getClientVersionInfo().currentRuntimeVersion: string | undefined`; `checkUpdatePolicy` keeps the same endpoint and query names.

- [ ] **Step 1: Add failing tests for disabled and enabled OTA**

Mock the real Expo config policy object and expose mutable Expo Updates fields:

```ts
jest.mock('expo-constants', () => ({
  default: { expoConfig: { runtimeVersion: { policy: 'appVersion' } } },
}));

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  isEnabled: false,
  runtimeVersion: null,
  reloadAsync: jest.fn(),
}));
```

Assert disabled OTA returns `currentRuntimeVersion: undefined` and `checkUpdatePolicy` calls the client with `currentOtaVersion: undefined`. In a separate isolated-module case, enable Expo Updates with runtime `0.1.16` and assert that exact value is returned and sent.

- [ ] **Step 2: Run the mobile service test and verify RED**

Run: `cd mobile && npm run test -- --runInBand src/services/update/__tests__/update.service.test.ts`

Expected: disabled OTA returns `"[object Object]"` instead of `undefined`, and enabled OTA does not read `Updates.runtimeVersion`.

- [ ] **Step 3: Implement authoritative runtime selection**

Replace the Expo config conversion with:

```ts
const updatesRuntimeVersion = Updates.runtimeVersion?.trim();
const currentRuntimeVersion =
  Updates.isEnabled && updatesRuntimeVersion
    ? updatesRuntimeVersion
    : undefined;
```

Retain the property in `getClientVersionInfo`; Axios omits its `undefined` value.

- [ ] **Step 4: Run the service test and verify GREEN**

Run the same focused Jest command and confirm both runtime branches pass with the APK integrity/installer tests.

### Task 3: Add contextual version diagnostics

**Files:**
- Create: `mobile/src/components/AppVersionInfo.tsx`
- Create: `mobile/src/components/__tests__/AppVersionInfo.test.tsx`
- Create: `mobile/src/screens/__tests__/profile-version-surface.test.ts`
- Modify: `mobile/src/providers/__tests__/UpdateProvider.test.tsx`
- Modify: `mobile/src/providers/UpdateProvider.tsx`
- Modify: `mobile/src/screens/ProfileScreen.tsx`
- Modify: `mobile/src/screens/TeacherProfileScreen.tsx`
- Modify: `mobile/src/screens/AdminProfileScreen.tsx`

**Interfaces:**
- Consumes: `getClientVersionInfo()` and caller-provided muted `color`/layout style.
- Produces: `AppVersionInfo({ color, style })`, rendering `Nexora Mobile · v<version> (build <code>)` with `information-outline`.

- [ ] **Step 1: Write failing component, provider, and role-coverage tests**

The component test mocks `getClientVersionInfo` as native version `0.1.16`, code 17, renders the component, and expects `Nexora Mobile · v0.1.16 (build 17)` plus accessibility label `Installed Nexora Mobile version 0.1.16 build 17`.

Update the provider fixture to return:

```ts
{
  platform: 'android',
  currentNativeVersion: '0.1.15',
  currentVersionCode: 16,
  currentRuntimeVersion: undefined,
}
```

Add assertions that an optional code-17 policy shows `Installed v0.1.15 (build 16)` and `Available v0.1.16 (build 17)`, while a `none` decision renders neither the modal nor `Update Available`.

The role-coverage test reads `ProfileScreen.tsx`, `TeacherProfileScreen.tsx`, and `AdminProfileScreen.tsx` and asserts each imports and renders `<AppVersionInfo`.

- [ ] **Step 2: Run the three focused UI tests and verify RED**

Run:

```bash
cd mobile
npm run test -- --runInBand \
  src/components/__tests__/AppVersionInfo.test.tsx \
  src/screens/__tests__/profile-version-surface.test.ts \
  src/providers/__tests__/UpdateProvider.test.tsx
```

Expected: missing component/module, absent provider copy, and absent Profile usage failures.

- [ ] **Step 3: Implement the shared indicator**

Create a style-neutral component:

```tsx
export function AppVersionInfo({ color, style }: Props) {
  const { currentNativeVersion, currentVersionCode } = getClientVersionInfo();
  const label = `Nexora Mobile · v${currentNativeVersion} (build ${currentVersionCode})`;

  return (
    <View
      accessible
      accessibilityLabel={`Installed Nexora Mobile version ${currentNativeVersion} build ${currentVersionCode}`}
      style={[{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }, style]}
    >
      <MaterialCommunityIcons name="information-outline" size={14} color={color} />
      <Text style={{ color, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
```

Add it after the security/sign-out content in each Profile screen using `theme.dim` for students and `theme.muted` for teacher/admin.

- [ ] **Step 4: Add installed/available copy to the update dialog**

Read `getClientVersionInfo` during provider render and replace the single available-version line with two explicit lines:

```tsx
<Text>Installed v{clientVersion.currentNativeVersion} (build {clientVersion.currentVersionCode})</Text>
<Text>Available v{state.decision.latestNativeVersion} (build {state.decision.latestVersionCode}) · {formatBytes(state.decision.apkSizeBytes)}</Text>
```

- [ ] **Step 5: Run focused UI tests and verify GREEN**

Run the same three-test Jest command and confirm all assertions pass.

### Task 4: Prepare and verify release metadata

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Modify: `docs/mobile-apk-release-runbook.md` only if the current command or verification contract changes.

**Interfaces:**
- Produces: `com.nexora.lms.mobile` version `0.1.16`, code `17`, ARM64 APK and exact JSON manifest.

- [ ] **Step 1: Bump both native version sources**

Set Expo `version` to `0.1.16` and Android `versionCode` to `17`; set Gradle `versionName "0.1.16"` and `versionCode 17`.

- [ ] **Step 2: Run focused and full verification before building**

Run focused Jest suites first, then `mobile/npm run typecheck`, full mobile Jest, targeted backend app-version tests, backend build/lint, frontend typecheck/tests/build/lint, release tests/verifier, `openspec validate prevent-redundant-mobile-apk-updates`, and `git diff --check`.

- [ ] **Step 3: Build with Java 17 and production URL**

Run from `mobile/android`:

```bash
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
NODE_ENV=production \
JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7 \
ANDROID_HOME=/home/jethro/Android/Sdk \
./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  --no-daemon --max-workers=2
```

- [ ] **Step 4: Inspect the compiled APK before embedding**

Use build-tools 36 `aapt`, `apksigner`, and `zipalign`; require package `com.nexora.lms.mobile`, version `0.1.16`/17, `REQUEST_INSTALL_PACKAGES`, `arm64-v8a`, v2 signature, existing certificate digest, ZIP validity, 16 KB alignment, and production API URL in the bundle/source map.

- [ ] **Step 5: Embed and generate exact manifest**

Run the repository's release preparation command so it copies the Gradle APK into `next-frontend/public/downloads/`, computes SHA-256 and byte size, sets release notes to `Prevents duplicate latest-version prompts and adds visible app version details.`, and verifies source/APK/JSON equality.

### Task 5: Deliver and prove production behavior

**Files:**
- Review all files listed by `git status --short` and the complete staged diff.

**Interfaces:**
- Produces: pushed `developement` commit, terminal-success CI/deployment, public byte-identical code-17 APK, and production policy readback.

- [ ] **Step 1: Commit scoped work**

Confirm `origin/developement...HEAD` starts at `0 0`, stage only reviewed change/spec/plan/source/test/release paths, and commit with `fix(mobile): prevent redundant APK update prompts`.

- [ ] **Step 2: Push and watch exact CI**

Push `developement`, identify the workflow whose `headSha` equals the new commit, and wait until every CI job is terminal-success.

- [ ] **Step 3: Watch Railway deployment provenance**

Wait for the workflow-run deployment, confirm its logs check out the exact tested SHA, and verify backend/frontend Railway deployments reach terminal `SUCCESS` plus backend liveness.

- [ ] **Step 4: Verify live bytes before registration**

Download the public APK and JSON with cache-busting query parameters. Require byte-for-byte equality, exact SHA-256/size, version 17, installer permission, ARM64 ABI, v2 signature/certificate continuity, and 16 KB alignment.

- [ ] **Step 5: Register and read back policy**

Use Railway-injected `CI_ADMIN_SECRET` without printing it to POST the exact JSON manifest. Then require:

- code 16 / native `0.1.15` / malformed runtime → `apk_optional` pointing to code 17;
- code 17 / native `0.1.16` / omitted or correct runtime → `none`.

- [ ] **Step 6: Final synchronization audit**

Fetch `origin/developement`, require a clean worktree, local and remote SHA equality, divergence `0 0`, OpenSpec tasks complete, and no unverified requirement remaining.
