## Context

The mobile updater already downloads an APK into app cache, verifies its exact byte count and SHA-256, converts the file to an Expo `FileSystemFileProvider` content URI, and launches Android Package Installer through `expo-intent-launcher`. The current release targets API 36 but neither the Expo config nor the merged APK manifest declares `android.permission.REQUEST_INSTALL_PACKAGES`. In addition, `startActivityAsync` resolves with an activity result when the user returns, while `installApk` discards that result and `UpdateProvider` always returns to `ready_to_install`.

The solution must remain compatible with Expo 54/React Native 0.81, avoid a new dependency, preserve the verified APK across recoverable failures, and produce a locally built ARM64 APK signed by the existing internal-testing certificate.

## Goals / Non-Goals

**Goals:**

- Give Android the manifest declaration required to request package installation.
- Distinguish a successful Package Installer result from cancellation or blocking.
- Keep a verified APK available while the user enables Unknown Apps access and retries.
- Prevent every resolved installer activity from silently returning to **Install Now**.
- Fail release verification when either source configuration or the built APK loses the installer permission.
- Publish a versioned APK whose embedded metadata, downloadable bytes, and backend policy agree exactly.

**Non-Goals:**

- Replacing Android Package Installer with a custom installer or `PackageInstaller.Session` implementation.
- Automatically enabling Unknown Apps access, which Android intentionally requires the user to grant.
- Adding Play Store distribution or replacing the existing internal debug signing identity.
- Changing backend API contracts or non-Android update behavior.

## Decisions

### Declare the permission in source and generated-native inputs

Add `android.permission.REQUEST_INSTALL_PACKAGES` to `mobile/app.json` and `mobile/android/app/src/main/AndroidManifest.xml`. Updating both prevents a future Expo prebuild from removing the permission and guarantees the currently checked-in native project contains it.

Alternative: edit only the native manifest. Rejected because source configuration would drift and a later prebuild could regress the APK.

### Interpret the existing activity result rather than add a native module

`expo-intent-launcher` already returns `IntentLauncherResult` with `ResultCode.Success` and `ResultCode.Canceled`. `installApk` will accept only `Success`; cancellation or other results become a typed `ApkInstallationError` with reason `cancelled_or_blocked`.

Alternative: add a custom Kotlin bridge for `PackageManager.canRequestPackageInstalls()`. Rejected for this repair because it introduces native registration and maintenance burden without eliminating the required system installer interaction. The typed result path correctly covers user cancellation and OEM blocking while retaining the existing Nexora-specific settings recovery.

Alternative: always open Unknown Apps settings before installation. Rejected because it adds unnecessary friction for users who have already granted access.

### Model cancelled or blocked handoff as recoverable installation state

The provider will map the typed cancellation/blocking result to the existing `permission_denied` recovery surface, using copy that accurately allows either cancellation or source restriction. It preserves `verifiedApkUri`, exposes **Open Settings (Unknown Apps)**, and exposes **Retry Installation** without another download. A successful result closes the update modal instead of forcing the state back to `ready_to_install`.

### Extend the release verifier to inspect permission at both boundaries

The release tool will require the fully qualified permission in `app.json` and in `aapt dump badging` output. Unit fixtures will cover missing source permission and missing embedded permission. This makes the CI release gate prove that the downloadable APK contains the capability, rather than only proving version, size, and hash.

## Risks / Trade-offs

- **A user can still deny or cancel installation.** → Preserve the verified file and provide settings plus retry actions with accurate copy.
- **Some OEMs return nonstandard activity results.** → Treat every non-success result as recoverable rather than deleting the APK or misreporting a network failure.
- **The currently installed broken build cannot acquire a new manifest permission in place.** → Publish a new APK at the stable public URL; users may need one browser/file-manager installation if their current build cannot open Package Installer, after which future in-app updates have the declaration.
- **Debug signing is not production-store signing.** → Keep the existing certificate for upgrade continuity and report the APK as internal sideload distribution only.
- **Physical-device behavior varies by OEM.** → Run automated red/green tests, inspect the merged APK, exercise an Android emulator where possible, and report physical-device coverage separately.

## Migration Plan

1. Add failing service/provider/release-verifier tests.
2. Implement typed result handling and dual permission declarations.
3. Bump Android version to `0.1.15` / code `16` and build the production-URL ARM64 APK.
4. Verify package, permission, signature, ABI, ZIP integrity, 16 KB alignment, bundle URL, size, and SHA-256.
5. Embed the APK and generated release manifest under `next-frontend/public/downloads/`.
6. Run mobile, backend, and frontend regression gates; commit and push only reviewed paths.
7. Wait for exact-commit CI/deployment success, compare the live APK byte-for-byte, then register and read back production metadata.

Rollback consists of restoring the preceding commit and APK bytes, then re-registering the previous exact manifest. Do not register a rollback manifest until the matching APK is live.

## Open Questions

None. The user authorized the complete plan, release build, commit, push, and workflow monitoring.
