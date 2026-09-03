# Mobile APK Update Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the current Android update, prevent invalid installation retries, and make APK publication metadata reproducible and verifiable.

**Architecture:** Repair the live app-version row first so the already-published `0.1.13` APK is installable. Then enforce a mobile invariant in which only a successfully size-verified APK receives an installable URI, refresh policy before download retries, validate full-APK registration data, and generate a checked release manifest from the actual binary. Keep Android compilation local; ordinary CI validates the committed APK and manifest but never builds the APK.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, Jest/react-test-renderer, NestJS 11, class-validator, Node.js 20, Android `aapt`, GitHub Actions, Railway-hosted backend/frontend.

## Global Constraints

- Preserve fail-closed APK size verification; never install a size-mismatched file.
- `verifiedApkUri` must be non-null only after package verification succeeds.
- `Retry Installation` must appear only for an installation-stage failure involving a verified file.
- A download retry must fetch a fresh `/api/app-version/check` decision before using URL, version code, or expected size.
- Do not calculate SHA-256 on-device by loading the complete APK into JavaScript memory; compute and validate SHA-256 during release preparation.
- Preserve the existing `{ success, message, data }` app-version API response.
- Preserve `minSupportedVersionCode: 1` for the current optional update unless the user explicitly changes the support floor.
- Do not restore GitHub-hosted Gradle/APK compilation.
- Build Android releases locally with Java 17 and explicit `EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api`.
- Do not push, deploy, register production metadata, or publish a new APK without explicit release authorization.

## File Structure

- Modify `backend/src/modules/app-version/dto/create-app-version.dto.ts`: require usable integrity metadata for full-APK registrations.
- Create `backend/src/modules/app-version/dto/create-app-version.dto.spec.ts`: regression coverage for registration validation.
- Modify `mobile/src/services/update/update.types.ts`: represent verified files and failure stages explicitly.
- Modify `mobile/src/services/update/update.service.ts`: provide typed package-verification failures and guard installer launch against missing files.
- Create `mobile/src/services/update/__tests__/update.service.test.ts`: service-level verification and installer guards.
- Modify `mobile/src/providers/UpdateProvider.tsx`: refresh policy on retry and enforce valid state transitions/actions.
- Create `mobile/src/providers/__tests__/UpdateProvider.test.tsx`: provider/UI state-machine regression coverage.
- Create `mobile/scripts/app-version-release.cjs`: prepare and verify the APK registration manifest.
- Create `mobile/scripts/app-version-release.test.cjs`: Node tests for release metadata derivation.
- Modify `mobile/package.json`: expose release preparation, verification, and release-tool test commands.
- Create `next-frontend/public/downloads/nexora-student-mobile-release.json`: generated backend registration payload paired with the APK.
- Modify `.github/workflows/ci.yml`: validate the release tool and committed APK/manifest without building Android.
- Create `docs/mobile-apk-release-runbook.md`: authoritative local build, deploy, verification, and registration sequence.
- Modify `docs/blueprints/mobile-update-arch.md`: record the verified-URI and failure-action invariants.
- Modify `mobile/app.json` and `mobile/android/app/build.gradle`: publish the hardening as `0.1.14` / version-code `15`.
- Replace `next-frontend/public/downloads/nexora-student-mobile-release.apk`: locally built hardening release.

---

### Task 1: Recover the Current `0.1.13` Production Update

**Files:**
- Inspect: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- No source files are modified by this task.

**Interfaces:**
- Consumes: `POST /api/app-version/register`, guarded by `X-CI-Secret`.
- Produces: current Android policy for version `0.1.13`, version code `14`, size `40174571`, and SHA-256 `a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf`.

- [ ] **Step 1: Reconfirm the local published artifact before mutating production**

Run from the repository root:

```bash
stat --printf='%s\n' next-frontend/public/downloads/nexora-student-mobile-release.apk
sha256sum next-frontend/public/downloads/nexora-student-mobile-release.apk
/home/jethro/Android/Sdk/build-tools/36.0.0/aapt dump badging next-frontend/public/downloads/nexora-student-mobile-release.apk | rg '^package:'
```

Expected:

```text
40174571
a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf  next-frontend/public/downloads/nexora-student-mobile-release.apk
package: name='com.nexora.lms.mobile' versionCode='14' versionName='0.1.13'
```

- [ ] **Step 2: Reconfirm the deployed artifact**

Run:

```bash
curl --location --head --fail-with-body --silent --show-error \
  https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk
curl --location --fail-with-body --silent --show-error \
  https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk \
  | sha256sum
```

Expected: `Content-Length: 40174571` and SHA-256 `a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf`.

- [ ] **Step 3: Require the operator-provided registration secret**

Run in a shell where the secret has been supplied securely:

```bash
test -n "${NEXORA_CI_ADMIN_SECRET:-}" || {
  echo 'NEXORA_CI_ADMIN_SECRET is required' >&2
  exit 1
}
```

Expected: exit code `0` with no secret printed.

- [ ] **Step 4: Register the exact deployed version**

Run:

```bash
curl --fail-with-body --silent --show-error \
  -X POST https://capstone-backend-v2-production.up.railway.app/api/app-version/register \
  -H "X-CI-Secret: ${NEXORA_CI_ADMIN_SECRET}" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<'JSON'
{
  "platform": "android",
  "versionCode": 14,
  "minSupportedVersionCode": 1,
  "nativeVersion": "0.1.13",
  "otaRuntimeVersion": "0.1.13",
  "apkDownloadUrl": "https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk",
  "requiresFullApk": true,
  "releaseNotes": "Navigation stability and JAHUB mobile updates.",
  "apkSha256": "a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf",
  "apkSizeBytes": 40174571
}
JSON
```

Expected: HTTP `200` with `success: true` and returned `versionCode: 14`.

- [ ] **Step 5: Verify both outdated and current-client decisions**

Run:

```bash
curl --fail-with-body --silent --show-error \
  'https://capstone-backend-v2-production.up.railway.app/api/app-version/check?platform=android&currentVersionCode=13&currentNativeVersion=0.1.12&currentOtaVersion=0.1.12'
curl --fail-with-body --silent --show-error \
  'https://capstone-backend-v2-production.up.railway.app/api/app-version/check?platform=android&currentVersionCode=14&currentNativeVersion=0.1.13&currentOtaVersion=0.1.13'
```

Expected: the first response is `apk_optional` with version code `14` and size `40174571`; the second response is `none`.

- [ ] **Step 6: Confirm recovery on the reported device**

Fully close and reopen Nexora so the existing client discards its stale in-memory policy. Download again, tap `Install Now`, and complete Android's installer dialog.

If ADB is connected, run:

```bash
adb shell dumpsys package com.nexora.lms.mobile | rg 'versionCode|versionName'
```

Expected: `versionCode=14` and `versionName=0.1.13`.

---

### Task 2: Require Complete Full-APK Registration Metadata

**Files:**
- Create: `backend/src/modules/app-version/dto/create-app-version.dto.spec.ts`
- Modify: `backend/src/modules/app-version/dto/create-app-version.dto.ts:3-12,91-107`

**Interfaces:**
- Consumes: `CreateAppVersionDto.requiresFullApk`, `apkSha256`, and `apkSizeBytes`.
- Produces: validation that requires a 64-character hexadecimal SHA-256 and a positive byte count whenever `requiresFullApk` is true.

- [ ] **Step 1: Write failing DTO validation tests**

Create `backend/src/modules/app-version/dto/create-app-version.dto.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppVersionDto } from './create-app-version.dto';

const validFullApk = {
  platform: 'android',
  versionCode: 15,
  minSupportedVersionCode: 1,
  nativeVersion: '0.1.14',
  otaRuntimeVersion: '0.1.14',
  apkDownloadUrl:
    'https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk',
  requiresFullApk: true,
  releaseNotes: 'Updater reliability hardening.',
  apkSha256: 'a'.repeat(64),
  apkSizeBytes: 40174571,
};

async function propertiesWithErrors(value: Record<string, unknown>) {
  const errors = await validate(plainToInstance(CreateAppVersionDto, value));
  return errors.map((error) => error.property);
}

describe('CreateAppVersionDto', () => {
  it('accepts complete full-APK metadata', async () => {
    await expect(propertiesWithErrors(validFullApk)).resolves.toEqual([]);
  });

  it('requires size and SHA-256 for a full APK', async () => {
    const { apkSha256: _sha, apkSizeBytes: _size, ...payload } = validFullApk;
    const properties = await propertiesWithErrors(payload);
    expect(properties).toEqual(expect.arrayContaining(['apkSha256', 'apkSizeBytes']));
  });

  it('rejects malformed SHA-256 and a zero byte size', async () => {
    const properties = await propertiesWithErrors({
      ...validFullApk,
      apkSha256: 'not-a-sha256',
      apkSizeBytes: 0,
    });
    expect(properties).toEqual(expect.arrayContaining(['apkSha256', 'apkSizeBytes']));
  });

  it('allows a non-APK policy to omit package metadata', async () => {
    const { apkSha256: _sha, apkSizeBytes: _size, ...payload } = validFullApk;
    await expect(
      propertiesWithErrors({ ...payload, requiresFullApk: false }),
    ).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```bash
cd backend
npm test -- src/modules/app-version/dto/create-app-version.dto.spec.ts --runInBand
```

Expected: the missing metadata, malformed checksum, and zero-size cases fail because the current DTO treats both fields as optional and permits zero.

- [ ] **Step 3: Implement conditional full-APK validation**

In `create-app-version.dto.ts`, import `Matches` and `ValidateIf`, remove `IsOptional` from the two integrity fields, and define them as:

```ts
  @ApiPropertyOptional({
    example: null,
    description: 'SHA-256 hash of the APK file for integrity verification',
  })
  @ValidateIf(
    (dto: CreateAppVersionDto, value: unknown) =>
      dto.requiresFullApk === true || value !== undefined,
  )
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, {
    message: 'apkSha256 must be a 64-character hexadecimal SHA-256 digest',
  })
  apkSha256?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Size of the APK file in bytes for integrity verification',
  })
  @ValidateIf(
    (dto: CreateAppVersionDto, value: unknown) =>
      dto.requiresFullApk === true || value !== undefined,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  apkSizeBytes?: number;
```

- [ ] **Step 4: Run targeted and structural backend verification**

Run:

```bash
cd backend
npm test -- src/modules/app-version/dto/create-app-version.dto.spec.ts src/modules/app-version/app-version.service.spec.ts --runInBand
npm run lint
npm run build
```

Expected: targeted tests pass, lint exits `0`, and the Nest build succeeds.

- [ ] **Step 5: Commit the backend validation**

```bash
git add backend/src/modules/app-version/dto/create-app-version.dto.ts \
  backend/src/modules/app-version/dto/create-app-version.dto.spec.ts
git commit -m "fix(app-version): require full APK integrity metadata"
```

---

### Task 3: Guard Package Verification and Installer Launch

**Files:**
- Create: `mobile/src/services/update/__tests__/update.service.test.ts`
- Modify: `mobile/src/services/update/update.service.ts:115-145`

**Interfaces:**
- Consumes: downloaded file URI and `apkSizeBytes`.
- Produces: `ApkVerificationError` with reason `missing_file` or `size_mismatch`; `verifyApkIntegrity(fileUri, expectedSizeBytes): Promise<void>`; a pre-install file-existence guard.

- [ ] **Step 1: Write failing service tests**

Create `mobile/src/services/update/__tests__/update.service.test.ts` with module mocks for `react-native`, `expo-file-system/legacy`, `expo-intent-launcher`, `expo-updates`, `expo-application`, `expo-constants`, and `../../api/client`. Cover these exact assertions:

```ts
it('deletes and rejects a size-mismatched APK', async () => {
  mockedGetInfoAsync.mockResolvedValue({ exists: true, size: 40174571 });

  await expect(verifyApkIntegrity('file:///cache/update.apk', 40050811))
    .rejects.toMatchObject({ reason: 'size_mismatch' });
  expect(mockedDeleteAsync).toHaveBeenCalledWith(
    'file:///cache/update.apk',
    { idempotent: true },
  );
});

it('does not delete a correctly sized APK', async () => {
  mockedGetInfoAsync.mockResolvedValue({ exists: true, size: 40174571 });

  await expect(verifyApkIntegrity('file:///cache/update.apk', 40174571))
    .resolves.toBeUndefined();
  expect(mockedDeleteAsync).not.toHaveBeenCalled();
});

it('rejects a missing APK before Android installer launch', async () => {
  mockedGetInfoAsync.mockResolvedValue({ exists: false });

  await expect(installApk('file:///cache/deleted.apk'))
    .rejects.toMatchObject({ reason: 'missing_file' });
  expect(mockedGetContentUriAsync).not.toHaveBeenCalled();
  expect(mockedStartActivityAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the targeted service test and verify it fails**

Run:

```bash
cd mobile
npx jest src/services/update/__tests__/update.service.test.ts --runInBand
```

Expected: failure because verification currently returns `true`, exposes only generic errors, and installer launch does not check whether the file exists.

- [ ] **Step 3: Add typed verification failures and the installer guard**

Add the following runtime type near `UPDATE_DIR` and use it in verification:

```ts
export type ApkVerificationFailureReason = 'missing_file' | 'size_mismatch';

export class ApkVerificationError extends Error {
  constructor(
    readonly reason: ApkVerificationFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'ApkVerificationError';
  }
}

export async function verifyApkIntegrity(
  fileUri: string,
  expectedSizeBytes: number | null,
): Promise<void> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new ApkVerificationError(
      'missing_file',
      'Downloaded APK file does not exist.',
    );
  }

  if (
    expectedSizeBytes !== null &&
    fileInfo.size !== expectedSizeBytes
  ) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    throw new ApkVerificationError(
      'size_mismatch',
      `APK size mismatch. Expected ${expectedSizeBytes} bytes but downloaded ${fileInfo.size} bytes.`,
    );
  }
}
```

At the start of `installApk`, after the Android platform guard, add:

```ts
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new ApkVerificationError(
      'missing_file',
      'The verified APK file is no longer available. Download it again.',
    );
  }
```

Remove the unused `_expectedSha256` parameter. SHA-256 remains in the backend contract and release manifest but is not presented as on-device verification.

- [ ] **Step 4: Run service tests and mobile typecheck**

Run:

```bash
cd mobile
npx jest src/services/update/__tests__/update.service.test.ts --runInBand
npm run typecheck
```

Expected: service tests and typecheck pass.

- [ ] **Step 5: Commit the service guard**

```bash
git add mobile/src/services/update/update.service.ts \
  mobile/src/services/update/__tests__/update.service.test.ts
git commit -m "fix(mobile): guard APK verification and installer launch"
```

---

### Task 4: Enforce the Verified-APK Provider State Machine

**Files:**
- Modify: `mobile/src/services/update/update.types.ts:18-38`
- Modify: `mobile/src/providers/UpdateProvider.tsx:16-483`
- Create: `mobile/src/providers/__tests__/UpdateProvider.test.tsx`

**Interfaces:**
- Consumes: `checkUpdatePolicy`, `downloadApk`, `verifyApkIntegrity`, and `installApk`.
- Produces: `UpdateFailureStage = 'check' | 'download' | 'verification' | 'installation'`; `verifiedApkUri`; fresh-policy retry; stage-specific actions and copy.

- [ ] **Step 1: Write failing provider tests**

Mock the update service and React Native primitives following the existing provider-test pattern. Add these cases to `UpdateProvider.test.tsx`:

```ts
it('does not offer installation after verification deletes the APK', async () => {
  mockedCheckUpdatePolicy.mockResolvedValue(policy14);
  mockedDownloadApk.mockResolvedValue('file:///cache/update-14.apk');
  mockedVerifyApkIntegrity.mockRejectedValue(
    new ApkVerificationError('size_mismatch', 'APK size mismatch.'),
  );

  const renderer = renderProvider();
  await flushPromises();
  await press(renderer, 'Download & Install Update');

  const text = flattenText(renderer.toJSON());
  expect(text).toContain('Retry Download');
  expect(text).not.toContain('Retry Installation');
  expect(text).not.toContain('Please check your connection');
});

it('refreshes policy before retrying a failed download', async () => {
  mockedCheckUpdatePolicy
    .mockResolvedValueOnce(policy12)
    .mockResolvedValueOnce(policy14);
  mockedDownloadApk
    .mockResolvedValueOnce('file:///cache/update-12.apk')
    .mockResolvedValueOnce('file:///cache/update-14.apk');
  mockedVerifyApkIntegrity
    .mockRejectedValueOnce(
      new ApkVerificationError('size_mismatch', 'APK size mismatch.'),
    )
    .mockResolvedValueOnce(undefined);

  const renderer = renderProvider();
  await flushPromises();
  await press(renderer, 'Download & Install Update');
  await press(renderer, 'Retry Download');

  expect(mockedCheckUpdatePolicy).toHaveBeenCalledTimes(2);
  expect(mockedDownloadApk).toHaveBeenLastCalledWith(
    policy14.apkDownloadUrl,
    policy14.latestVersionCode,
    expect.any(Function),
  );
  expect(flattenText(renderer.toJSON())).toContain('Ready to Install');
});

it('hides duplicate install actions while the Android intent is pending', async () => {
  const installer = deferred<void>();
  mockedInstallApk.mockReturnValue(installer.promise);

  const renderer = await renderReadyToInstallProvider();
  void press(renderer, 'Install Now');

  expect(flattenText(renderer.toJSON())).toContain('Installing Update');
  expect(flattenText(renderer.toJSON())).not.toContain('Install Now');
  installer.resolve();
  await flushPromises();
  expect(flattenText(renderer.toJSON())).toContain('Ready to Install');
});
```

Also test that an installation-stage error retains `Retry Installation`, while a permission error retains `Open Settings (Unknown Apps)`.

- [ ] **Step 2: Run the provider test and verify it fails**

Run:

```bash
cd mobile
npx jest src/providers/__tests__/UpdateProvider.test.tsx --runInBand
```

Expected: failures show the stale policy reuse, invalid installation retry, generic connection copy, and persistent `installing` state.

- [ ] **Step 3: Replace ambiguous state fields**

In `update.types.ts`, add:

```ts
export type UpdateFailureStage =
  | 'check'
  | 'download'
  | 'verification'
  | 'installation';
```

Replace `localApkUri` with these fields in `UpdateState`:

```ts
  failureStage: UpdateFailureStage | null;
  verifiedApkUri: string | null;
```

Initialize both fields to `null`.

- [ ] **Step 4: Isolate download and verification transitions**

Create an internal `downloadDecision(decision: AppVersionDecision)` callback. Its required transition order is:

```ts
setState((prev) => ({
  ...prev,
  status: 'downloading_apk',
  decision,
  failureStage: null,
  verifiedApkUri: null,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: decision.apkSizeBytes ?? 0,
  errorMessage: null,
}));

let downloadedUri: string;
try {
  downloadedUri = await downloadApk(
    decision.apkDownloadUrl,
    decision.latestVersionCode,
    onDownloadProgress,
  );
} catch (error) {
  setFailure('download', error, null);
  return;
}

setState((prev) => ({ ...prev, status: 'verifying_apk' }));
try {
  await verifyApkIntegrity(downloadedUri, decision.apkSizeBytes);
} catch (error) {
  setFailure('verification', error, null);
  return;
}

setState((prev) => ({
  ...prev,
  status: 'ready_to_install',
  failureStage: null,
  verifiedApkUri: downloadedUri,
  errorMessage: null,
}));
```

`setFailure` must set `status: 'error'`, set the supplied stage/message, and accept the verified URI explicitly. Download and verification calls pass `null`; installation errors pass the existing verified URI.

- [ ] **Step 5: Refresh policy on retry**

Keep the first `Download & Install Update` action on the current decision. Add an internal retry callback that fetches policy before downloading:

```ts
const retryApkDownload = useCallback(async () => {
  try {
    setState((prev) => ({
      ...prev,
      status: 'checking',
      failureStage: null,
      verifiedApkUri: null,
      errorMessage: null,
    }));
    const decision = await checkUpdatePolicy();
    if (decision.updateType === 'none') {
      setState((prev) => ({ ...prev, status: 'idle', decision }));
      return;
    }
    await downloadDecision(decision);
  } catch (error) {
    setFailure('check', error, null);
  }
}, [downloadDecision, setFailure]);
```

Wire the error-state `Retry Download` button to `retryApkDownload`.

- [ ] **Step 6: Make installer launch recoverable**

Guard on `verifiedApkUri`, render `Install Now` only in `ready_to_install`, and return to that state after the Android intent resolves:

```ts
const installDownloadedApk = useCallback(async () => {
  const verifiedApkUri = state.verifiedApkUri;
  if (!verifiedApkUri) return;

  try {
    setState((prev) => ({
      ...prev,
      status: 'installing',
      failureStage: null,
      errorMessage: null,
    }));
    await installApk(verifiedApkUri);
    setState((prev) => ({
      ...prev,
      status: 'ready_to_install',
    }));
  } catch (error) {
    if (isUnknownSourcesFailure(error)) {
      setState((prev) => ({
        ...prev,
        status: 'permission_denied',
        failureStage: 'installation',
        verifiedApkUri,
        errorMessage: UNKNOWN_SOURCES_MESSAGE,
      }));
      return;
    }
    setFailure('installation', error, verifiedApkUri);
  }
}, [setFailure, state.verifiedApkUri]);
```

Show `Retry Installation` only when `failureStage === 'installation' && verifiedApkUri`. Show connection guidance only for `check` and `download`; show release-package guidance for `verification`.

- [ ] **Step 7: Run provider and mobile regression gates**

Run:

```bash
cd mobile
npx jest src/providers/__tests__/UpdateProvider.test.tsx src/services/update/__tests__/update.service.test.ts --runInBand
npm run typecheck
npm run test
```

Expected: targeted and full mobile tests pass; typecheck exits `0`.

- [ ] **Step 8: Commit the state-machine fix**

```bash
git add mobile/src/services/update/update.types.ts \
  mobile/src/providers/UpdateProvider.tsx \
  mobile/src/providers/__tests__/UpdateProvider.test.tsx
git commit -m "fix(mobile): recover APK update retries safely"
```

---

### Task 5: Generate and Verify Release Metadata From the APK

**Files:**
- Create: `mobile/scripts/app-version-release.cjs`
- Create: `mobile/scripts/app-version-release.test.cjs`
- Modify: `mobile/package.json`
- Create: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Modify: `.github/workflows/ci.yml:141-161`

**Interfaces:**
- Consumes: `mobile/app.json`, `mobile/android/app/build.gradle`, the published APK, Android `aapt`, release notes, and minimum supported version code.
- Produces: `prepare` and `verify` CLI commands plus a JSON payload accepted unchanged by `POST /api/app-version/register`.

- [ ] **Step 1: Write failing release-tool tests**

Use Node's built-in test runner. Start the test module with these fixtures, then cover the four derivation and drift cases:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { appendFile, mkdtemp, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  buildReleasePayload,
  verifyManifest,
} = require('./app-version-release.cjs');

const fixtureApk = Buffer.from('fixture-apk-bytes');
let fixtureRoot;
let fixtureApkPath;
let fixtureAppJsonPath;
let fixtureBuildGradlePath;

test.beforeEach(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'nexora-release-test-'));
  fixtureApkPath = path.join(fixtureRoot, 'release.apk');
  fixtureAppJsonPath = path.join(fixtureRoot, 'app.json');
  fixtureBuildGradlePath = path.join(fixtureRoot, 'build.gradle');
  await writeFile(fixtureApkPath, fixtureApk);
});

test.afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

async function fixtureOptions({
  gradleVersionCode = 14,
  gradleVersionName = '0.1.13',
  apkBadging = "package: name='com.nexora.lms.mobile' versionCode='14' versionName='0.1.13'",
} = {}) {
  await writeFile(
    fixtureAppJsonPath,
    JSON.stringify({
      expo: {
        version: '0.1.13',
        android: { package: 'com.nexora.lms.mobile', versionCode: 14 },
        runtimeVersion: { policy: 'appVersion' },
      },
    }),
  );
  await writeFile(
    fixtureBuildGradlePath,
    `android { defaultConfig { versionCode ${gradleVersionCode}\nversionName "${gradleVersionName}" } }`,
  );
  return {
    apkPath: fixtureApkPath,
    appJsonPath: fixtureAppJsonPath,
    buildGradlePath: fixtureBuildGradlePath,
    apkBadging,
    apkDownloadUrl:
      'https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk',
    minSupportedVersionCode: 1,
    releaseNotes: 'Navigation stability and JAHUB mobile updates.',
  };
}

test('buildReleasePayload derives exact APK size and SHA-256', async () => {
  const payload = await buildReleasePayload(await fixtureOptions());

  assert.equal(payload.platform, 'android');
  assert.equal(payload.versionCode, 14);
  assert.equal(payload.nativeVersion, '0.1.13');
  assert.equal(payload.otaRuntimeVersion, '0.1.13');
  assert.equal(payload.apkSizeBytes, Buffer.byteLength(fixtureApk));
  assert.equal(payload.apkSha256, createHash('sha256').update(fixtureApk).digest('hex'));
});

test('rejects app.json and Gradle version drift', async () => {
  await assert.rejects(
    buildReleasePayload(await fixtureOptions({ gradleVersionCode: 13 })),
    /app.json versionCode 14 does not match Gradle versionCode 13/,
  );
});

test('rejects APK badging that differs from source configuration', async () => {
  await assert.rejects(
    buildReleasePayload(await fixtureOptions({
      apkBadging: "package: name='com.nexora.lms.mobile' versionCode='13' versionName='0.1.12'",
    })),
    /APK versionCode 13 does not match configured versionCode 14/,
  );
});

test('verifyManifest rejects a changed APK', async () => {
  const options = await fixtureOptions();
  const payload = await buildReleasePayload(options);
  await appendFile(fixtureApkPath, Buffer.from('changed'));
  await assert.rejects(
    verifyManifest(payload, options),
    /apkSizeBytes|apkSha256/,
  );
});
```

- [ ] **Step 2: Run the Node test and verify it fails**

Run:

```bash
cd mobile
node --test scripts/app-version-release.test.cjs
```

Expected: failure because the release module does not exist.

- [ ] **Step 3: Implement the release module's pure functions**

Export these exact interfaces from `app-version-release.cjs`:

- `sha256File(apkPath: string): Promise<string>`
- `parseGradleVersions(source: string): { versionCode: number; versionName: string }`
- `parseAaptBadging(output: string): { packageName: string; versionCode: number; versionName: string }`
- `buildReleasePayload(options: ReleaseOptions): Promise<CreateAppVersionPayload>`
- `verifyManifest(manifest: CreateAppVersionPayload, options: ReleaseOptions): Promise<void>`

End the module with these CommonJS exports:

```js
module.exports = {
  buildReleasePayload,
  parseAaptBadging,
  parseGradleVersions,
  sha256File,
  verifyManifest,
};
```

Implement `sha256File` with `createReadStream` and `createHash('sha256')`, not `readFile`, so host memory use is bounded. `buildReleasePayload` must:

1. Read `expo.version`, `expo.android.versionCode`, and the app-version runtime policy from `app.json`.
2. Parse Gradle `versionName` and `versionCode` and require equality with `app.json`.
3. Run `aapt dump badging <apk>` unless a test supplies `options.apkBadging`.
4. Require package `com.nexora.lms.mobile` and matching embedded version name/code.
5. Compute `apkSizeBytes` using `stat.size` and `apkSha256` using the streaming helper.
6. Return only fields accepted by `CreateAppVersionDto`.

The returned payload shape is:

```js
{
  platform: 'android',
  versionCode,
  minSupportedVersionCode,
  nativeVersion,
  otaRuntimeVersion: nativeVersion,
  apkDownloadUrl,
  requiresFullApk: true,
  releaseNotes,
  apkSha256,
  apkSizeBytes,
}
```

Resolve `aapt` from `AAPT_PATH`, then from the newest directory under `ANDROID_HOME/build-tools` or `ANDROID_SDK_ROOT/build-tools`. Fail with an actionable message if none exists.

- [ ] **Step 4: Implement `prepare` and `verify` CLI modes**

Use these defaults relative to the repository root:

```text
APK: next-frontend/public/downloads/nexora-student-mobile-release.apk
Manifest: next-frontend/public/downloads/nexora-student-mobile-release.json
App config: mobile/app.json
Gradle config: mobile/android/app/build.gradle
Download URL: https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk
```

`prepare` must require `--release-notes` and `--min-supported-version-code`, write formatted JSON with a trailing newline, and then call `verifyManifest`. `verify` must read the committed manifest and compare every derived field.

- [ ] **Step 5: Add package commands and create the current manifest**

Add to `mobile/package.json`:

```json
"test:release": "node --test scripts/app-version-release.test.cjs",
"release:prepare": "node scripts/app-version-release.cjs prepare",
"release:verify": "node scripts/app-version-release.cjs verify"
```

Generate the current manifest:

```bash
cd mobile
npm run release:prepare -- \
  --min-supported-version-code 1 \
  --release-notes "Navigation stability and JAHUB mobile updates."
npm run release:verify
```

Expected: the manifest contains version code `14`, version `0.1.13`, size `40174571`, and SHA-256 `a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf`.

- [ ] **Step 6: Add non-building CI validation**

In the existing `mobile` job after `npm ci`, add:

```yaml
      - run: npm run test:release
      - run: npm run release:verify
```

This job validates a committed APK; it must not invoke Gradle or restore `build-mobile-apk.yml`.

- [ ] **Step 7: Run release-tool and CI-equivalent checks**

Run:

```bash
cd mobile
npm run test:release
npm run release:verify
npm run typecheck
npm run test
```

Expected: all commands pass.

- [ ] **Step 8: Commit release metadata tooling**

```bash
git add mobile/scripts/app-version-release.cjs \
  mobile/scripts/app-version-release.test.cjs \
  mobile/package.json \
  next-frontend/public/downloads/nexora-student-mobile-release.json \
  .github/workflows/ci.yml
git commit -m "build(mobile): verify APK release metadata"
```

---

### Task 6: Document the Release Contract

**Files:**
- Create: `docs/mobile-apk-release-runbook.md`
- Modify: `docs/blueprints/mobile-update-arch.md:120-196`

**Interfaces:**
- Consumes: the release-tool commands and app-version endpoints from earlier tasks.
- Produces: one operator sequence that builds locally, verifies the deployed artifact, and registers the exact manifest.

- [ ] **Step 1: Write the release runbook**

The runbook must include these ordered gates:

1. Confirm clean/deliberately scoped Git state.
2. Increment both `mobile/app.json` and `mobile/android/app/build.gradle` to the same version name/code.
3. Build from `mobile/android` with Java 17 and the explicit production API URL.
4. Inspect APK badging, signing certificate, ZIP integrity, ABI, and 16 KB alignment.
5. Copy the build output to the web download path.
6. Run `npm run release:prepare` and `npm run release:verify`.
7. Commit only the reviewed release paths.
8. Deploy and wait for the exact commit to become healthy.
9. Compare live `Content-Length` and downloaded SHA-256 with the manifest.
10. POST the manifest using `X-CI-Secret`.
11. Query both an outdated client and the current client through `/api/app-version/check`.
12. Install on a physical Android device and record version/signature evidence.

State explicitly that registration happens after the new APK is live and byte-for-byte verified.

- [ ] **Step 2: Update the architecture blueprint**

Replace the prior ambiguous error-action requirement with these invariants:

```text
- A package URI becomes installable only after file existence and exact byte-size checks pass.
- Download or verification failure clears the installable URI.
- Retry Download refreshes backend policy before downloading.
- Retry Installation is restricted to installation-stage failures with a verified file.
- Android installer launch is not installation completion; returning from the launch restores a retryable ready state.
- SHA-256 is generated and verified by release tooling; the client retains low-memory size verification.
```

- [ ] **Step 3: Verify documentation consistency**

Run:

```bash
rg -n "Retry Installation|verifiedApkUri|release:prepare|release:verify|SHA-256" \
  docs/mobile-apk-release-runbook.md \
  docs/blueprints/mobile-update-arch.md
rg -n -i "github.*build.*apk|assembleRelease" .github/workflows
```

Expected: the first command finds the new invariants and commands; the second finds no GitHub-hosted APK compilation.

- [ ] **Step 4: Commit the documentation**

```bash
git add docs/mobile-apk-release-runbook.md docs/blueprints/mobile-update-arch.md
git commit -m "docs(mobile): define APK release registration gates"
```

---

### Task 7: Build and Publish the Hardened `0.1.14` APK

**Files:**
- Modify: `mobile/app.json:5,23`
- Modify: `mobile/android/app/build.gradle:95-96`
- Replace: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Consumes: tested updater code and release tooling.
- Produces: Android version `0.1.14`, version code `15`, plus a matching deployed artifact and app-version policy.

- [ ] **Step 1: Bump both Android version sources**

Set:

```text
mobile/app.json expo.version = 0.1.14
mobile/app.json expo.android.versionCode = 15
mobile/android/app/build.gradle versionName = 0.1.14
mobile/android/app/build.gradle versionCode = 15
```

- [ ] **Step 2: Run source-level gates before the expensive build**

Run:

```bash
cd mobile
npm run typecheck
npm run test
npm run test:release
```

Expected: all commands pass.

- [ ] **Step 3: Build the release locally**

Run from `mobile/android`:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
```

Expected: `BUILD SUCCESSFUL` and `mobile/android/app/build/outputs/apk/release/app-release.apk` exists.

- [ ] **Step 4: Validate and publish the local artifact into the web tree**

Run from the repository root:

```bash
/home/jethro/Android/Sdk/build-tools/36.0.0/aapt dump badging \
  mobile/android/app/build/outputs/apk/release/app-release.apk | rg '^package:'
unzip -t mobile/android/app/build/outputs/apk/release/app-release.apk
cp mobile/android/app/build/outputs/apk/release/app-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.apk
cmp mobile/android/app/build/outputs/apk/release/app-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.apk
```

Expected: embedded version code `15`, version name `0.1.14`, ZIP integrity success, and `cmp` exit code `0`.

- [ ] **Step 5: Generate and verify the version `15` manifest**

Run:

```bash
cd mobile
npm run release:prepare -- \
  --min-supported-version-code 1 \
  --release-notes "Reliable APK verification, retry recovery, and clearer update errors."
npm run release:verify
```

Expected: the manifest version, size, and SHA-256 match the newly built APK.

- [ ] **Step 6: Run all affected local gates**

Run:

```bash
cd backend
npm test -- src/modules/app-version/dto/create-app-version.dto.spec.ts src/modules/app-version/app-version.service.spec.ts --runInBand
npm run lint
npm run build

cd ../mobile
npm run typecheck
npm run test
npm run test:release
npm run release:verify

cd ../next-frontend
npm run typecheck
npm run test -- --ci
npm run build

cd ..
git diff --check
git status --short
git diff --stat
```

Expected: all gates pass; Git status contains only the reviewed backend validation, mobile updater/tests/tooling/version files, CI, documentation, APK, and manifest.

- [ ] **Step 7: Commit the hardening release**

```bash
git add mobile/app.json \
  mobile/android/app/build.gradle \
  next-frontend/public/downloads/nexora-student-mobile-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.json
git commit -m "release(mobile): publish reliable updater APK v0.1.14"
```

- [ ] **Step 8: Push and wait for the exact release commit only after authorization**

Before pushing, run:

```bash
git rev-list --left-right --count origin/developement...HEAD
git rev-parse HEAD
```

Push only the reviewed commits to `developement`, then watch the workflow and Railway deployment associated with that exact SHA to terminal success.

- [ ] **Step 9: Verify the deployed APK before registration**

Run:

```bash
curl --location --head --fail-with-body --silent --show-error \
  https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk
curl --location --fail-with-body --silent --show-error \
  https://next-frontend-v2-production.up.railway.app/downloads/nexora-student-mobile-release.apk \
  | sha256sum
```

Expected: live size and SHA-256 equal `nexora-student-mobile-release.json` exactly.

- [ ] **Step 10: Register the deployed manifest**

Run from the repository root:

```bash
test -n "${NEXORA_CI_ADMIN_SECRET:-}" || {
  echo 'NEXORA_CI_ADMIN_SECRET is required' >&2
  exit 1
}
curl --fail-with-body --silent --show-error \
  -X POST https://capstone-backend-v2-production.up.railway.app/api/app-version/register \
  -H "X-CI-Secret: ${NEXORA_CI_ADMIN_SECRET}" \
  -H 'Content-Type: application/json' \
  --data-binary @next-frontend/public/downloads/nexora-student-mobile-release.json
```

Expected: HTTP `200`, `success: true`, version code `15`, and version `0.1.14`.

- [ ] **Step 11: Complete Android acceptance testing**

Verify on a physical Android device:

1. Version `14` receives an optional update for version `15`.
2. Download reaches the exact server byte count and transitions to `Ready to Install`.
3. `Install Now` opens Android's installer exactly once.
4. Cancelling returns to a usable `Ready to Install` state.
5. Blocking unknown sources shows the settings recovery action and retains a verified installation retry.
6. A simulated verification failure offers only `Retry Download` and refreshes policy.
7. Successful installation reports version code `15` and version name `0.1.14` through `adb shell dumpsys package com.nexora.lms.mobile`.

## Completion Criteria

- Production version `14` is immediately installable before code hardening begins.
- Full-APK registrations cannot omit a positive byte count or valid SHA-256.
- A deleted or unverified file can never reach the installer action.
- Retrying a failed download uses a freshly fetched policy.
- Installer launch cannot strand the provider permanently in `installing`.
- Release tooling proves app config, Gradle config, embedded APK version, byte count, checksum, and manifest agree.
- CI validates the committed artifact without compiling Android.
- Version `15` passes local tests, exact-artifact deployment verification, production registration, and physical-device acceptance.
