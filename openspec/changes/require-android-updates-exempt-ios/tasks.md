## 1. Backend policy and API enforcement
- [x] 1.1 Add failing regressions for iOS exemption, unknown Android version/policy, invalid release floors, API outdated/current/platform/recovery decisions.
- [x] 1.2 Implement policy validation and global Android guard in `backend/src/modules/app-version/`, preserving response envelopes and auth/RBAC.
- [x] 1.3 Verify focused app-version tests and HTTP integration coverage including global exception serialization.

## 2. Mobile admission and recovery
- [x] 2.1 Add failing provider/service/client tests for initial gating, failed checks, iOS bypass, installer revalidation, lifecycle/deduplication and API errors.
- [x] 2.2 Implement independent admission state, root provider composition, platform-specific APK operations and metadata/error signals in `mobile/src/providers/`, `mobile/src/services/update/` and `mobile/src/api/client.ts`.
- [x] 2.3 Verify focused tests, all mobile tests, types and iOS bundle export; preserve existing permission/integrity/download recovery coverage.

## 3. Release preparation and validation
- [x] 3.1 Add release-script regressions and default Android floor to the exact released version; require explicit recovery override for lower floors.
- [x] 3.2 Run backend lint, build, full tests, e2e and smoke; run applicable frontend artifact checks/build/lint; validate OpenSpec and review the scoped diff.
- [x] 3.3 Bump the next native Android version, build with Java 17 and the intended API, verify identity/signature/ABIs/alignment/size/hash, and embed APK plus manifest through existing scripts.
- [ ] 3.4 Verify Android old-to-new upgrade, checking/offline/cancel/permission/restart/current-version flows on emulator/device and record evidence.
- [ ] 3.5 Configure an installable iOS test build as needed and obtain real iPhone login/core role-flow evidence with Android enforcement active.

## 4. Release and observe
- [ ] 4.1 Fetch and inspect outgoing history/divergence, commit and push scoped changes to `developement`, record the full SHA.
- [ ] 4.2 Observe exact-revision CI and configured deployments to terminal success and verify live health.
- [ ] 4.3 Verify public APK/manifest bytes before registering strict Android policy; verify old/current/newer Android and exempt iOS API decisions.
- [ ] 4.4 Audit every requirement against evidence, record release links/limitations and clean repository state, then complete the goal only if all gates are proven.
