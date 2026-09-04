## Context

The production Android policy is `0.1.15` / version code `16` / OTA runtime `0.1.15`. The published APK also reports native version `0.1.15` and code `16`, but its embedded Expo config retains `runtimeVersion` as `{ "policy": "appVersion" }` while native Expo Updates is disabled. `getClientVersionInfo` stringifies that object to `"[object Object]"`; the backend then returns `apk_optional` because its runtime-mismatch branch is independent of version-code lag. A live request using build 16 and `"[object Object]"` reproduces the modal, while the same request with runtime `"0.1.15"` returns `none`.

The mobile app has separate student, teacher, and administrator Profile screens. Navigation headers are screen-owned and top-left space already carries role icons or back navigation, so a global floating warning icon would collide with existing controls. The update dialog currently shows only the available version and size, which makes same-version decisions difficult to diagnose.

## Goals / Non-Goals

**Goals:**

- Make APK decisions monotonic: an installed version code at or above the latest policy can never be offered that policy's APK.
- Report OTA runtime only when Expo Updates is enabled and supplies a valid runtime string.
- Preserve forced and optional update behavior for clients that are actually behind.
- Display installed and available version/build identities where update decisions are visible.
- Give every mobile role a quiet Profile-level installed-version indicator.
- Publish and register a verified `0.1.16` / code `17` ARM64 APK.

**Non-Goals:**

- Changing the public app-version DTO or response envelope.
- Enabling Expo OTA updates in the native Android project.
- Adding a global overlay, navigation-header redesign, settings subsystem, or new dependency.
- Treating the client-reported version as an authorization or security boundary.
- Changing the existing installer-handoff and Unknown Apps recovery behavior.

## Decisions

### Enforce monotonicity in the backend before considering runtime

The backend will compute whether the client is behind the latest `versionCode`. Runtime mismatch can contribute to an optional APK decision only while a newer APK exists. Clients below `minSupportedVersionCode` remain forced; clients behind a release with `requiresFullApk` remain optional; clients at or above the latest version return `none` regardless of runtime text.

Alternative: fix only the client runtime value. Rejected because already-installed build 16 cannot receive that source correction without another APK, and any future malformed client could recreate a same-version loop.

Alternative: change the registered runtime to `"[object Object]"` or blank. Rejected because it corrupts release metadata and makes correctly reporting future clients appear mismatched.

The trade-off is that a corrupted same-code binary will not receive a same-version reinstall prompt. This is intentional: every corrective APK must increment Android's version code, and offering a non-newer binary is not a reliable recovery mechanism.

### Derive runtime from `expo-updates`, not Expo config policy

`getClientVersionInfo` will use `Updates.runtimeVersion` only when `Updates.isEnabled` is true and the value is a non-empty string. Otherwise it exposes `currentRuntimeVersion` as `undefined`, and Axios omits `currentOtaVersion` from the public check. Native version and build continue to come from `expo-application`, which reflects the installed package.

Alternative: resolve the `{ policy: "appVersion" }` object manually to the native version. Rejected because it duplicates Expo's policy resolution and incorrectly claims OTA compatibility while OTA is disabled.

### Keep version diagnostics contextual and role-complete

A reusable `AppVersionInfo` component will render an information icon plus `Nexora Mobile · v<version> (build <code>)` in subdued text. It will be placed near the bottom of the student, teacher, and administrator Profile screens. This is discoverable without competing with back buttons, notifications, or primary actions.

The update dialog will show both `Installed v<version> (build <code>)` and `Available v<version> (build <code>)`. A same-build dialog would therefore be obvious during future diagnostics, although the backend invariant should prevent it.

Alternative: a floating top-left exclamation icon on every screen. Rejected because exclamation implies an error, top-left placement conflicts with screen-owned navigation, and a global overlay would add layout and accessibility risk across every route.

### Test the real configuration shape and both decision boundaries

Mobile service tests will mock `runtimeVersion` using the real policy-object shape and prove it is never serialized as a runtime. They will separately prove that an enabled Expo Updates runtime is forwarded. Backend tests will replace the same-code mismatch expectation with `none` and add a behind-code runtime mismatch case. Provider tests will assert installed/available copy and absence of a modal for `none`. Component/source coverage will prove the version indicator is rendered by all three roles.

## Risks / Trade-offs

- **Existing build 16 still reports malformed runtime until replaced.** → The backend monotonic guard fixes its prompt immediately after deployment.
- **A future OTA-enabled build needs runtime comparison.** → Preserve the branch using `Updates.runtimeVersion`; only disabled or invalid values are omitted.
- **Profile screens use different visual systems.** → Keep the shared component style-neutral through explicit color props and use each role's existing muted token.
- **Generated APK metadata can drift from source.** → Reuse the release verifier, require version 17 in both Android sources, and compare the embedded and hosted bytes by size and SHA-256 before registration.
- **Internal signing is not Play Store signing.** → Retain the existing certificate for sideload upgrade continuity and continue labeling the artifact internal-only.

## Migration Plan

1. Add and run failing backend, mobile-service, provider, and version-indicator tests.
2. Implement backend monotonicity, valid runtime reporting, and contextual version UI.
3. Bump to `0.1.16` / code `17`, run targeted and full mobile/backend/frontend verification, and validate OpenSpec.
4. Build the ARM64 release with Java 17 and the explicit production API URL; verify permission, signature, ABI, ZIP integrity, 16 KB alignment, source-map consistency, and embedded endpoint.
5. Copy the APK to the frontend download path and generate exact JSON metadata.
6. Commit and push `developement`; wait for exact-commit CI and Railway deployment success.
7. Compare the public APK and manifest byte-for-byte, then register version 17 and read back build-16 `apk_optional` plus build-17 `none` branches.

Rollback restores the preceding source and APK bytes, deploys that commit, and registers the preceding exact manifest only after its matching public bytes are live.

## Open Questions

None. The user authorized implementation, APK production, embedding, commit, push, and terminal workflow monitoring based on the final evidence-backed judgment.
