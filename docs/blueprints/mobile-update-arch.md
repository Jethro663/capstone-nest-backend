# Implementation Architecture: Option C Hybrid OTA + In-App APK Updates

## Scope
- Create a backend-driven mobile update policy for Android.
- Use `expo-updates` for routine JS and asset OTA updates.
- Use in-app APK download + Android installer handoff when native changes require a new binary.
- Support both forced and optional update states without conflicting with on-device OTA discovery.

## Confirmed Decisions
- `apkDownloadUrl` will be a direct backend URL.
- Expo `runtimeVersion` is treated strictly as a native compatibility identifier and will only change when native/binary boundaries change. It is **not** a rolling OTA bundle version counter.
- The check route is exposed literally at `/api/app-version/check` (matching the NestJS `@Controller('app-version')` with global prefix `/api`).

## Backend Architecture

### 1. Dedicated app-version feature module
Modify:
- `backend/src/app.module.ts`

Create:
- `backend/src/modules/app-version/app-version.module.ts`
- `backend/src/modules/app-version/app-version.controller.ts`
- `backend/src/modules/app-version/app-version.service.ts`
- `backend/src/modules/app-version/dto/check-app-version.dto.ts`

Notes:
- Follow the existing module pattern under `backend/src/modules/*`.
- Make the endpoint public with `@Public()`.
- Keep the controller thin and encapsulate all decision logic inside the service.

### 2. Persistent update policy storage
Table: `app_versions`
- `id`: UUID primary key
- `platform`: text (default `'android'`)
- `versionCode`: integer (authoritative Android build version code)
- `minSupportedVersionCode`: integer (force-update floor)
- `nativeVersion`: text (user-facing metadata string e.g. `'1.2.0'`)
- `otaRuntimeVersion`: text (native compatibility boundary e.g. `'exposdk:54.0.0'`)
- `apkDownloadUrl`: text
- `apkSha256`: text (nullable)
- `apkSizeBytes`: integer (nullable)
- `isForceUpdate`: boolean
- `requiresFullApk`: boolean (release-level flag indicating binary changes)
- `releaseNotes`: text (nullable)
- `createdAt` / `updatedAt`: timestamps

Architecture notes:
- `versionCode` is the primary native comparison field.
- `otaRuntimeVersion` stores the native SDK/runtime compatibility key (`runtimeVersion`), NOT an incremental OTA release number.
- `requiresFullApk` is a release-level flag stored in the database indicating whether changes in this release require a new native APK binary rather than an OTA update.

### 3. Public version-check endpoint
Route:
- `GET /api/app-version/check`

Expected query params:
- `platform=android`
- `currentNativeVersion=0.1.0`
- `currentVersionCode=1`
- `currentOtaVersion=exposdk:54.0.0` (or `currentRuntimeVersion`)

Why include `currentVersionCode`:
- Android native compatibility is reliably evaluated using numeric `versionCode` rather than string comparison on `nativeVersion`.

Response additions:
- Include `minSupportedVersionCode` so the client can distinguish blocking vs optional APK upgrades.
- Include `apkSha256` and `apkSizeBytes` so the client can verify binary integrity before invoking the installer.

### 4. Backend decision logic
Implement in:
- `backend/src/modules/app-version/app-version.service.ts`

Decision rules:
- Load the latest policy row for the requested platform from `app_versions`.
- **Runtime Compatibility Enforcement**: Compare client-provided `currentOtaVersion` (runtime compatibility version) against stored `otaRuntimeVersion`. If there is a mismatch (`hasRuntimeMismatch = true`), any JS/asset OTA bundle from Expo servers will be incompatible with the client's native binary, forcing an APK upgrade **regardless of whether `clientVersionCode` lags behind or equals `versionCode`**.
- If `clientVersionCode < minSupportedVersionCode`, return a forced APK update decision (`updateType: 'apk_forced'`, `isForceUpdate: true`).
- If `(clientVersionCode < policy.versionCode && policy.requiresFullApk) || hasRuntimeMismatch`, return an optional APK update decision (`updateType: 'apk_optional'`, `isForceUpdate: false`). This guarantees that any client with an incompatible native runtime is directed to download a full APK even if their version code does not lag behind.
- Otherwise, return no enforced APK update (`updateType: 'none'`, `isForceUpdate: false`). This allows the mobile app to proceed normally and separately call `expo-updates` on-device to discover whether a routine JS/asset OTA update exists.
- Notice: The backend never returns an `'ota'` update type. Because OTA availability is determined on-device by checking the Expo update servers, the backend only dictates APK policy.

Recommended response envelope:
- Preserve the repo convention: `{ success, message, data }`.
- `data` structure:
  ```json
  {
    "platform": "android",
    "latestVersionCode": 10,
    "minSupportedVersionCode": 5,
    "latestNativeVersion": "1.2.0",
    "otaRuntimeVersion": "exposdk:54.0.0",
    "apkDownloadUrl": "https://example.com/downloads/nexora-latest.apk",
    "apkSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "apkSizeBytes": 15400960,
    "isForceUpdate": false,
    "requiresFullApk": true,
    "releaseNotes": "Bug fixes and performance improvements.",
    "updateType": "apk_optional"
  }
  ```

## Mobile Architecture

### 5. Update dependencies and Expo config
Modify:
- `mobile/package.json`
- `mobile/app.json`

Dependencies:
- `expo-updates` (for routine JS/asset OTA updates)
- `expo-application` (for reading native version and build codes)
- `expo-intent-launcher` (for launching the Android package installer)
- `expo-file-system` (for downloading and caching APK files)
- `expo-crypto` (for future file signature hashing)

`app.json` Android permissions:
- Add `REQUEST_INSTALL_PACKAGES` to allow initiating APK sideload installation.
- Notice on storage permissions: `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` are **unnecessary and omitted**. APK files are downloaded directly into app-private cache storage (`FileSystem.cacheDirectory`) and securely shared with the Android system package installer via `FileSystem.getContentUriAsync(fileUri)` (`content://` URI). This satisfies Android Scoped Storage requirements on modern Android (API 29+) without requesting broad storage permissions.
- Note that `REQUEST_INSTALL_PACKAGES` is necessary but not sufficient on Android 8+; users must enable "Install unknown apps" for Nexora LMS in system settings if prompted.

### 6. Centralized update service logic
Create:
- `mobile/src/services/update/update.service.ts`
- `mobile/src/services/update/update.types.ts`

Responsibilities:
- Read installed app metadata via Expo APIs:
  - native application version (`Application.nativeApplicationVersion`)
  - native build version code (`Application.nativeBuildVersion`)
  - native runtime compatibility version (`Constants.default.expoConfig.runtimeVersion`)
- Call the backend version-check endpoint (`GET /api/app-version/check`).
- Download APK files with `FileSystem.createDownloadResumable` using deterministic naming:
  - Format: `${FileSystem.cacheDirectory}updates/nexora-update-${targetVersionCode}.apk`
- Verify downloaded APK integrity before installation:
  - confirm actual byte size matches `apkSizeBytes`
  - delete the downloaded file immediately if verification fails
  - **Note on SHA-256 Checksum Verification**: Size-only verification is implemented for now. Full SHA-256 verification via `_expectedSha256` is reserved for when a native streaming file digest API is introduced in Expo to prevent loading 20MB-50MB binaries into JS memory, which causes out-of-memory crashes on low-end Android devices.
- Convert local `file://` URIs into Android-safe `content://` URIs via `FileSystem.getContentUriAsync(fileUri)` before invoking the installer.
- Launch Android installer via `IntentLauncher.startActivityAsync('android.intent.action.VIEW')` with:
  - `data: contentUri`
  - `type: 'application/vnd.android.package-archive'`
  - `flags: 1` (`FLAG_GRANT_READ_URI_PERMISSION`)
- Execute deterministic APK cleanup via `cleanOldApkFiles(currentInstalledVersionCode)`:
  - Scans the `${FileSystem.cacheDirectory}updates/` directory.
  - Matches filenames against `/^nexora-update-(\d+)\.apk$/`.
  - Deletes any file whose extracted version code is less than or equal to `currentInstalledVersionCode`.
- Expose download progress and permission error states for the UI.

### 7. Global update provider & State Machine
Create:
- `mobile/src/providers/UpdateProvider.tsx`

Modify:
- `mobile/src/providers/AppProviders.tsx`

Responsibilities:
- Runs automatically on app startup.
- Invokes `cleanOldApkFiles()` before evaluating policies or initiating downloads.
- Holds centralized update state:
  - `status`: `'idle' | 'checking' | 'ota_updating' | 'apk_required' | 'downloading_apk' | 'verifying_apk' | 'ready_to_install' | 'installing' | 'permission_denied' | 'error'`
  - `decision`: Backend policy response payload
  - `downloadProgress` / `downloadedBytes` / `totalBytes`
- **Single Source of Truth for Installer Launching**: To avoid duplicate installer launch race conditions, `startApkDownload()` halts execution at `ready_to_install` upon completing download and size verification. The installer is only launched when the user explicitly taps the "Install Now" action button, invoking `installDownloadedApk()`.
- **Dedicated Permission-Denied vs. Generic Error States**: Distinctly separates general installation failures (`status: 'error'`) from Android sideload security restrictions (`status: 'permission_denied'`). When `installApk()` throws an exception, the provider checks the error string; only errors clearly indicating unknown sources or security restrictions trigger the `permission_denied` state and its "Open Settings (Unknown Apps)" CTA. Other failures default to `error` with retry options.
- A package URI becomes installable only after file existence and exact byte-size checks pass.
- Download or verification failure clears the installable URI.
- `Retry Download` refreshes backend policy before downloading.
- `Retry Installation` is restricted to installation-stage failures with a `verifiedApkUri`.
- Android installer launch is not installation completion; returning from the launch restores a retryable `ready_to_install` state.
- SHA-256 is generated and verified by release tooling; the client retains low-memory size verification.

### 8. Update UI components
Create:
- Integrated directly within `mobile/src/providers/UpdateProvider.tsx` or as dedicated components under `mobile/src/components/system/`.

UI requirements:
- Premium glassmorphic visual treatment aligned with existing design system tokens (`colors.primary`, `radii.xxl`, `shadow.card`).
- Real-time download progress bar with percentage and byte formatting (`15.4 MB / 24.0 MB`).
- Forced update mode (`updateType === 'apk_forced'` or `isForceUpdate === true`): blocks app interaction with no dismiss path other than updating or retrying.
- Optional update mode (`updateType === 'apk_optional'`): provides a "Not Now" button to dismiss the prompt for the current session.
- Ready to install state (`ready_to_install`): explicitly informs the user that the package is downloaded and verified, prompting them to tap "Install Now" to begin installation.
- Android permission recovery state (`permission_denied`): when installation fails due to unknown sources restrictions, displays clear explanatory copy and an action button calling `openUnknownSourcesSettings()` (`android.settings.MANAGE_UNKNOWN_APP_SOURCES`).
- Download/Verification/Install error state (`error`): displays stage-specific error details. Connection guidance appears only for policy-check and download failures. Verification failures require a fresh download, while installation-stage failures with a verified package may offer `Retry Installation` without unrelated Android settings detours.

### 9. Hybrid decision flow inside mobile
Runtime execution sequence:
1. On startup, execute `cleanOldApkFiles(currentVersionCode)` to clear stale package binaries.
2. Call backend `GET /api/app-version/check`.
3. If backend returns `updateType === 'apk_forced'`, display the mandatory APK update modal immediately.
4. If backend returns `updateType === 'apk_optional'`, display the dismissible APK update modal.
5. If backend returns `updateType === 'none'`, the app is up-to-date with native binaries. Proceed to call `Updates.checkForUpdateAsync()` on-device.
6. If an Expo OTA update is available, execute `Updates.fetchUpdateAsync() -> Updates.reloadAsync()` to seamlessly apply JS/asset changes.
7. If no OTA is available, proceed normally into the application.

### 10. Android APK sideload flow
Step-by-step sequence:
1. Download APK from `apkDownloadUrl` to `${FileSystem.cacheDirectory}updates/nexora-update-${targetVersionCode}.apk`.
2. Stream real-time byte progress into provider state.
3. Verify file existence and confirm file byte size matches `apkSizeBytes`. If verification fails, delete the file and surface an error (`status: 'error'`).
4. Transition state to `ready_to_install` and await user confirmation.
5. Upon user tapping "Install Now", convert local file URI via `FileSystem.getContentUriAsync(fileUri)`.
6. Launch package installer via `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, type: 'application/vnd.android.package-archive', flags: 1 })`.
7. If installer launch is restricted by Android 8+ security settings or throws a security exception, transition the UI modal into `status: 'permission_denied'` with a button to launch `android.settings.MANAGE_UNKNOWN_APP_SOURCES`. Generic launcher failures transition to `status: 'error'` with retry actions.

## Verification Plan

### Backend Verification
- Run build: `cd backend && npm run build`
- Run linter: `cd backend && npm run lint`
- Execute unit tests: `cd backend && npx jest src/modules/app-version/app-version.service.spec.ts`
- Test endpoint `GET /api/app-version/check` across key policy branches:
  - Client version matches latest: returns `updateType: 'none'`
  - Client below `minSupportedVersionCode`: returns `updateType: 'apk_forced'`
  - Client below latest with `requiresFullApk: true`: returns `updateType: 'apk_optional'`
  - Client has mismatched `currentOtaVersion`: returns `updateType: 'apk_optional'` or `'apk_forced'` regardless of version lag

### Mobile Verification
- Targeted TypeScript syntax inspection: `node /home/jethro/.cache/backend_node_modules/typescript/bin/tsc --jsx react-native --target es2020 --lib es2020,dom --noEmit src/services/update/update.types.ts src/services/update/update.service.ts src/providers/UpdateProvider.tsx`
  - *Note*: In environments where local mobile `node_modules` dependencies are not installed, this check confirms that targeted domain files exhibit zero internal syntax, type, or logic defects beyond expected third-party module resolution warnings. Full project compilation should be confirmed during CI/local dev build.
- Test runtime flows on an Android device/emulator:
  - No APK update required -> triggers on-device OTA check
  - Optional APK update -> displays dismissible modal with live progress
  - Forced APK update -> displays non-dismissible blocking modal
  - Android Unknown Sources permission recovery -> launches system settings screen from `permission_denied` state
  - Deterministic cleanup -> confirms `.apk` files older than current version code are deleted from cache

## Risks and Implementation Notes
- `runtimeVersion` is strictly the native compatibility boundary. Incompatible OTA bundles will fail if runtime versions are not properly aligned when native modules change.
- `versionCode` must be strictly monotonically increasing for Android package upgrades to succeed.
- Android 7+ (API 24+) enforces `FileUriExposedException` when sharing raw `file://` paths; `content://` URI conversion via `FileSystem.getContentUriAsync()` is mandatory.
- Sideload installation cannot be programmatically guaranteed to complete because Android requires explicit user confirmation in the system installer dialog.

## Execution Order
1. Implement backend database schema (`app_versions`) and linear Drizzle migration.
2. Implement backend module, DTO, controller, and service with unit tests and runtime compatibility validation.
3. Configure mobile native dependencies (`expo-updates`, `expo-application`, `expo-intent-launcher`, `expo-crypto`) and `app.json` permissions.
4. Implement mobile domain types and update service orchestrator with deterministic cleanup and size verification.
5. Implement global `UpdateProvider` state machine and integrate into `AppProviders.tsx`.
6. Validate backend test suite and confirm clean targeted TypeScript syntax in mobile domain modules.
