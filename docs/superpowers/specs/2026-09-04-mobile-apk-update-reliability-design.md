# Mobile APK Update Reliability Design

## Problem

The Android updater currently combines three independently mutable values: a backend app-version row, a stable public download URL, and the APK stored at that URL. The public APK was replaced by releases `0.1.12` and `0.1.13`, while the backend continued returning the `0.1.11` byte count and checksum. A correct download therefore failed the client's size check every time.

The failure state also retained the downloaded URI even though size verification had deleted the file. That made the UI offer `Retry Installation` for a package that no longer existed. Installer launch then left the provider in `installing` without a recovery transition.

## Goals

- Restore the current `0.1.13` / version-code `14` APK update immediately by registering metadata that matches the already deployed artifact.
- Keep APK size validation fail-closed; never install a package whose published size does not match.
- Make a verified APK URI an explicit state invariant.
- Refresh the backend policy before retrying a failed download so an open app can recover after metadata is corrected.
- Make error copy and actions reflect the stage that actually failed.
- Generate release metadata from the built APK and validate it in CI without restoring GitHub-hosted APK compilation.
- Publish the mobile hardening in the next native release, `0.1.14` / version-code `15`.

## Non-goals

- Reintroducing the deleted GitHub Actions Android build workflow.
- Allowing the client to bypass size validation.
- Loading a 40 MB APK into JavaScript memory for on-device SHA-256 calculation. SHA-256 remains a release-side verification in this change.
- Changing the public app-version response envelope or update-decision rules.
- Changing web, AI, authentication, or role-navigation behavior.

## Considered Approaches

### 1. Correct production metadata only

This immediately restores downloads, but another APK replacement can recreate the same outage. It also leaves the deleted-file retry and stuck installer state untouched.

### 2. Accept size mismatches in the mobile client

This would hide metadata drift by installing an unverified artifact. It weakens the updater's safety boundary and is rejected.

### 3. Coordinated metadata repair, mobile state hardening, and release validation

This is the selected approach. It fixes the current record, preserves fail-closed validation, makes invalid state transitions impossible, and adds a local/CI check that ties the app configuration, embedded APK metadata, byte count, checksum, and registration payload together.

## Architecture

### Production recovery

Register an Android app-version row for the artifact already served at `/downloads/nexora-student-mobile-release.apk`:

- native version: `0.1.13`
- version code: `14`
- OTA runtime version: `0.1.13`
- minimum supported version code: `1`
- APK size: `40174571`
- SHA-256: `a9c490a0beb497aa127a06299a133a7b1322a335efb2b018307aea615e9c57bf`
- full APK required: `true`

The currently open app must re-check policy before another download. Until the client hardening is released, restarting the app supplies that fresh policy.

### Mobile state invariant

`verifiedApkUri` replaces `localApkUri`. It is `null` during download and verification and becomes non-null only after size verification succeeds.

```text
apk_required
    |
    v
downloading_apk --network failure--> error(download)
    |
    v
verifying_apk --missing/size failure--> error(verification)
    |
    v
ready_to_install --launch failure--> error(installation)
    |
    v
installing --intent launched--> ready_to_install
```

`Retry Installation` is available only for an installation-stage failure with a non-null `verifiedApkUri`. Download and verification failures expose only `Retry Download`. That retry fetches the app-version policy again before selecting the URL, version code, and expected size.

### Package verification

The mobile service verifies file existence and exact byte size, deletes a mismatched file, and returns a typed verification failure. `installApk` checks that the file still exists immediately before creating the Android content URI.

The client does not compute SHA-256 in this change. Expo's available digest path requires loading the complete APK into JavaScript memory, conflicting with the existing low-memory-device constraint. The release preparation tool computes SHA-256 on the development/CI host instead.

### Release metadata

`mobile/scripts/app-version-release.cjs` owns two commands:

- `prepare`: derive version information, byte count, and SHA-256 from `mobile/app.json`, Gradle, and the published APK; then write the backend registration payload to `next-frontend/public/downloads/nexora-student-mobile-release.json`.
- `verify`: recompute the same values and fail if the committed manifest or APK differs.

The tool also checks the APK's embedded `versionCode` and `versionName` through Android `aapt`. The ordinary CI mobile job runs tests and `verify`; it does not compile an APK.

Release order remains explicit:

1. Build locally with Java 17 and the production API URL.
2. Copy the built APK into the web download path.
3. Generate and verify the registration manifest.
4. Commit and deploy the APK plus manifest.
5. Verify the deployed APK's byte count and SHA-256.
6. POST that exact manifest to `/api/app-version/register`.
7. Verify `/api/app-version/check` returns the deployed values.

## Backend validation

When `requiresFullApk` is true, registration requires a positive `apkSizeBytes` and a 64-character hexadecimal `apkSha256`. Optional non-APK policy rows may omit both fields. This preserves the existing response contract while preventing incomplete full-APK registrations.

## Error handling

- Check/download failures retain connection-oriented guidance.
- Verification failures state that the package did not match published release information and must not offer installation.
- Installation failures retain the verified file and may offer installation retry.
- Unknown-source restrictions remain a dedicated permission state.
- A successful Android intent launch returns the app UI to `ready_to_install`; Android remains authoritative for whether installation completes.

## Verification

- Backend DTO tests cover required full-APK size/checksum metadata and checksum format.
- Mobile service tests cover missing files, mismatched sizes, deletion, and the pre-install existence guard.
- Provider tests cover policy refresh on download retry, absence of invalid installation retry, successful verification, permission recovery, and installer-state recovery.
- Release-tool tests cover derived payloads and mismatches between app config, Gradle, APK badging, and the manifest.
- CI runs backend targeted tests, mobile typecheck/tests, release-tool tests, and committed APK/manifest verification.
- Android device validation confirms download, Android installer handoff, cancellation recovery, unknown-source recovery, and installed version `0.1.14` / code `15`.
