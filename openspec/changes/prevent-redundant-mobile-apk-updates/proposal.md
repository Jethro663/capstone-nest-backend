## Why

The latest Android APK can deterministically receive its own update prompt because the mobile client stringifies Expo's runtime-policy object and the backend treats any runtime mismatch as an APK update even when the installed version code already equals the latest release. Users also lack a quiet, authoritative way to report the installed native version and build when diagnosing update behavior.

## What Changes

- Enforce a monotonic APK policy: the backend never offers an APK whose version code is equal to or lower than the installed version code.
- Report OTA runtime only from Expo Updates when OTA is enabled and exposes a non-empty runtime string; otherwise omit it from the version-check request.
- Keep forced updates for clients below the minimum supported version and optional APK updates for clients genuinely behind a newer full-APK release.
- Show installed and available native versions in the update dialog.
- Add a restrained, reusable app-version information control to the student, teacher, and administrator Profile surfaces.
- Add regressions that use the real `runtimeVersion: { policy: "appVersion" }` shape and prove a latest-build client does not render an update prompt.
- Publish the repaired mobile client as Android version `0.1.16` / version code `17` with an exact embedded APK manifest.

## Capabilities

### New Capabilities

- `mobile-version-awareness`: Monotonic APK decisions, valid runtime reporting, and low-distraction installed-version diagnostics across mobile roles.

### Modified Capabilities

None.

## Impact

The change affects backend app-version decision logic and tests, the mobile update service/provider and tests, shared mobile version diagnostics, all three mobile Profile surfaces, Android/Expo version metadata, release tooling outputs, and the frontend-hosted APK plus JSON manifest. The public API envelope and DTO shape remain unchanged, no dependency is added, and non-mobile product areas are unaffected.
