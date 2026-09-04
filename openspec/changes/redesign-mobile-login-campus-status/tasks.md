## 1. Diagnostic Model and Service

- [x] 1.1 Add failing tests for API-target labeling and online, limited, unexpected, and offline health classifications.
- [x] 1.2 Implement the bounded public login server-status service until its focused tests pass.
- [x] 1.3 Add failing tests for current, supported, available, required, unverified, checking, and combined status tones.
- [x] 1.4 Implement the pure login status presentation model until its focused tests pass.

## 2. Responsive Campus Login Experience

- [x] 2.1 Copy the existing GABHS seal and Nexora student hero artwork into the mobile auth asset bundle with byte-equality checks.
- [x] 2.2 Add failing layout tests for small portrait, standard portrait, keyboard-compacted, and 768 px-plus split compositions.
- [x] 2.3 Implement the Campus Front Door layout, safe-area status trigger, warm landing palette, bundled artwork, reduced-motion entrance, and scrollable form surface.
- [x] 2.4 Add default-preserving customization points to shared auth fields/buttons/links and prove non-login auth defaults remain unchanged.

## 3. Status Modal and Login Integration

- [x] 3.1 Add failing component tests for modal server/version copy, accessibility labels, refresh, close, and update-review actions.
- [x] 3.2 Implement the compact login status modal and focused rendering helpers until component tests pass.
- [x] 3.3 Add failing login-screen tests for Campus Front Door identity, initial health check, status visibility, refresh behavior, retained auth/recovery behavior, and removal of the raw API label.
- [x] 3.4 Integrate the responsive layout, server diagnostic lifecycle, existing update-provider state/actions, and status modal into `LoginScreen` until focused suites pass.

## 4. Verification and Visual Review

- [x] 4.1 Run focused service/model/component/login suites, mobile typecheck, and all mobile Jest suites; resolve every new failure without masking baseline warnings.
- [x] 4.2 Validate the OpenSpec change and run source/diff/placeholder/whitespace checks.
- [x] 4.3 Render Expo web at 320x568, 390x844, 844x390, and 1024x768; inspect screenshots for clipping, artwork crop, modal layout, touch targets, and form reachability.
- [x] 4.4 Run Android emulator/device login and status checks if a target is connected; otherwise record the runtime-device limitation explicitly.

## 5. Android Release Artifact

- [x] 5.1 Bump Expo and Gradle metadata together to native version `0.1.17` and version code `18` with focused release tests.
- [x] 5.2 Build the production-URL ARM64 APK using Java 17 and inspect package/version, permission, signature continuity, ABI, ZIP integrity, 16 KB alignment, and embedded endpoint.
- [x] 5.3 Copy the Gradle APK byte-for-byte into the frontend download path and generate/verify the exact release manifest with release notes for the Campus Front Door and diagnostics.
- [x] 5.4 Run final mobile, release, affected frontend, OpenSpec, diff, scope, and branch-divergence gates against the exact artifact.

## 6. Exact Delivery and Production Proof

- [ ] 6.1 Review and stage only the approved OpenSpec, plan, mobile source/test/asset/version, and embedded APK/manifest paths; commit on `developement`.
- [ ] 6.2 Push `developement`, record the exact commit SHA, and watch the matching GitHub CI and Railway deployments to terminal success.
- [ ] 6.3 Download the live APK and manifest with cache-busting, prove exact byte size/SHA-256 and APK metadata equality, then register the manifest through the existing secret-backed path if available.
- [ ] 6.4 Read back previous-build and new-build app-version decisions, fetch the remote branch, and require a clean worktree, local/remote SHA equality, divergence `0 0`, and every OpenSpec task checked.
