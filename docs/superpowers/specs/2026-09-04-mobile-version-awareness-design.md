# Mobile Version Awareness Design

## Confirmed problem

The served Android APK is native version `0.1.15`, version code `16`, and has Expo Updates disabled. Its embedded Expo configuration stores `runtimeVersion` as `{ "policy": "appVersion" }`. The mobile updater stringifies that object to `"[object Object]"`; production compares it with registered runtime `"0.1.15"` and returns `apk_optional` even though the installed and latest version codes both equal 16. The same production request returns `none` when the runtime is `"0.1.15"`.

This is a deterministic cross-boundary defect. Existing tests missed it because the mobile test replaces the policy object with a resolved string, while the backend test explicitly expects a runtime mismatch to offer an APK at the same version code.

## Selected design

Use defense in depth:

1. The backend enforces APK monotonicity. Forced updates still apply below the support floor, but an optional APK can only be returned when `currentVersionCode < latestVersionCode`.
2. The mobile client reads runtime identity from `expo-updates` only when that subsystem is enabled and its runtime is a non-empty string. Disabled OTA produces no `currentOtaVersion` query field.
3. The update dialog displays installed and available native version/build values.
4. Student, teacher, and administrator Profile screens reuse a subdued information-icon row showing the installed version and build.
5. The repair ships as `0.1.16` / code `17` using the existing internal signing certificate and ARM64 sideload distribution.

This is better than a client-only fix because it stops the currently installed build-16 popup as soon as the backend deploys. It is better than a backend-only fix because future builds stop emitting malformed runtime data. It is better than changing production metadata because the registered runtime remains truthful.

## UI decision

Do not place a floating exclamation icon at the global top-left. Nexora's headers are screen-owned, and that position is already used by role icons and back navigation. Exclamation also communicates a warning rather than neutral information.

Instead, place `information-outline` beside `Nexora Mobile · v0.1.16 (build 17)` near the bottom of every role's Profile surface. In the update dialog, show:

```text
Installed  v0.1.15 (build 16)
Available  v0.1.16 (build 17)
```

These surfaces are quiet during normal work and immediately useful for screenshots or support diagnostics.

## Behavioral boundaries

- Same or newer installed version code always yields `none`, regardless of runtime text.
- Positive version code below `minSupportedVersionCode` remains forced.
- A supported older build remains optional when a newer release requires a full APK or when an authoritative OTA runtime mismatch requires moving to that newer binary.
- Disabled OTA never supplies runtime metadata.
- Public API shapes remain unchanged.
- The installer permission and recovery behavior from the preceding release remain unchanged.

## Verification

- TDD red/green tests for backend monotonicity, real Expo config shape, enabled/disabled runtime reporting, latest-client modal suppression, installed/available dialog copy, and role-complete Profile placement.
- Full mobile typecheck/tests, backend app-version tests/build/lint, frontend tests/typecheck/build/lint, release tests/verifier, and OpenSpec validation.
- Java 17/Gradle ARM64 build with the production API URL.
- `aapt`, `apksigner`, `unzip`, `zipalign`, bundle/source-map, checksum, and byte-equality checks.
- Android emulator launch and version-surface evidence when a compatible emulator is available; physical-device coverage reported separately.
- Exact-commit GitHub CI and Railway terminal success, public APK comparison, production registration, and old/new policy readback.
