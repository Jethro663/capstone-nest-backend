## 1. Regression Proof

- [ ] 1.1 Add backend tests proving same-or-newer version codes never receive an APK even with runtime mismatch, while an older version can still receive a newer APK.
- [ ] 1.2 Add mobile service tests using the real runtime-policy object shape and proving disabled OTA omits runtime while enabled OTA sends the native runtime string.
- [ ] 1.3 Add provider and version-indicator tests for latest-client suppression, installed/available copy, and student/teacher/admin Profile coverage.
- [ ] 1.4 Run the focused suites and record expected red failures before production edits.

## 2. Policy and Runtime Repair

- [ ] 2.1 Enforce backend APK monotonicity without changing the DTO or response envelope.
- [ ] 2.2 Derive mobile OTA runtime from `expo-updates` only when enabled and valid, omitting it otherwise.
- [ ] 2.3 Run the focused backend and mobile service tests to green.

## 3. Version Diagnostics

- [ ] 3.1 Add the shared subdued `AppVersionInfo` component using installed native version and build metadata.
- [ ] 3.2 Render installed and available version/build identities in the update dialog.
- [ ] 3.3 Add the shared indicator to student, teacher, and administrator Profile surfaces and run focused UI tests to green.

## 4. Release Artifact

- [ ] 4.1 Bump Expo and native Android metadata to `0.1.16` / version code `17` and update release notes.
- [ ] 4.2 Run targeted tests, mobile typechecking/full tests, backend tests/build/lint, frontend tests/typecheck/build/lint, release tests/verifier, and OpenSpec validation.
- [ ] 4.3 Build the ARM64 release APK with Java 17 and the explicit production API URL.
- [ ] 4.4 Verify package/version, installer permission, certificate continuity, v2 signature, ARM64 ABI, ZIP integrity, 16 KB alignment, source-map consistency, and embedded production endpoint.
- [ ] 4.5 Embed the APK in the frontend download path and generate an exact size/SHA-256 release manifest.

## 5. Delivery and Production Proof

- [ ] 5.1 Review the complete diff, confirm a clean scoped worktree, commit, and push `developement`.
- [ ] 5.2 Watch exact-commit GitHub CI and Railway deployment workflows to terminal success and verify deployed provenance.
- [ ] 5.3 Compare the public APK and manifest byte-for-byte with the committed artifacts before registering version 17.
- [ ] 5.4 Register the exact version-17 manifest and prove build 16 receives `apk_optional` while build 17 receives `none`.
