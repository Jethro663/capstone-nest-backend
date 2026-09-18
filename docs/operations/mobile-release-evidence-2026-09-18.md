# Mobile release evidence — 0.1.46 build 47

Date: 2026-09-18

Release state: Android artifact verified locally; CI, deployment, public-byte registration, iOS workflow publication, and physical-device acceptance pending.

## Release identity

| Field | Evidence |
|---|---|
| Mobile source revision | `d80aff7a142ebd6c74b33e332ea52afc72549654` |
| Native version | `0.1.46` |
| Android version code | `47` |
| iOS build number | `47` |
| Android minimum supported build | `47` |
| Android distribution | school website, immutable artifact plus rolling alias |
| iOS distribution | SideStore workflow; artifact not yet published from this source revision |

The build number is shared across Android and iOS. Build 47 intentionally forces Android installations below 47 through the full-binary path because builds through 46 used the legacy debug signer and cannot update over the new signing identity in place.

## Android artifact

| Field | Verified value |
|---|---|
| Immutable repository path | `next-frontend/public/downloads/android/47-d80aff7a/nexora-mobile-0.1.46-build47.apk` |
| Rolling repository path | `next-frontend/public/downloads/nexora-student-mobile-release.apk` |
| Immutable public URL | `https://next-frontend-v2-production.up.railway.app/downloads/android/47-d80aff7a/nexora-mobile-0.1.46-build47.apk` |
| Size | `37,628,790` bytes |
| SHA-256 | `6e9542ce56ee2455b0104aad37a5573256799f172a9b62ed8a527f5edb4fe947` |
| Package | `com.nexora.lms.mobile` |
| ABI | `arm64-v8a` |
| Minimum / target SDK | 24 / 36 |
| Signature scheme | APK Signature Scheme v2 |
| Signer SHA-256 | `46cbcee985a7e0ecfda5a8fddfbdd679d9f0312ee07d96a593817302eb7c0a39` |

The production keystore and credentials remain outside the repository with owner-only filesystem permissions. No password, private key, raw push token, or other release secret is present in the committed evidence.

### Packaged policy checks

- `android:allowBackup="false"` in the merged release manifest.
- `android:usesCleartextTraffic="false"` in the merged release manifest.
- `REQUEST_INSTALL_PACKAGES` remains for the internal verified updater.
- `POST_NOTIFICATIONS`, camera/media, biometric, network, wake/boot, push, and vendor badge permissions remain for reachable functionality or dependency-owned notification behavior.
- Legacy `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`, and `SYSTEM_ALERT_WINDOW` are absent from the packaged APK.
- `zipalign -c -v 4` reports `Verification successful`.
- Canonical `release:verify` re-derives package/version/permission/signer/size/hash data and matches the checked-in manifest.

## Automated source evidence

| Gate | Result |
|---|---|
| Mobile Jest | 141 suites, 802 tests passed |
| Backend Jest | 178 suites, 1,797 tests passed |
| Mobile typecheck/admin contract gate | Passed; 19 contracts across 57 layer checks |
| Backend build | Passed; migration integrity reports 37 linear active migrations |
| Backend lint | Passed; 0 errors and 2,297 warnings under the 2,300 ceiling |
| Expo dependency alignment | Passed |
| Release/workflow Node tests | Passed, including signing, immutable Android manifest, iOS manifest/workflow, and rich-text generation contracts |
| Migration forward/rollback | Passed in a disposable PostgreSQL database; platform-neutral backfill and `notification_devices` creation/removal verified |
| System-reset integration | Passed after all 37 migrations; reset coordinator, write barriers, and admin erasure completed across 3 suites / 31 tests |
| Production dependency audit | 24 remaining: 0 critical, 9 high, 15 moderate; breaking React Navigation 7 and Expo 57 paths remain separately documented |

Expected error/warning logs emitted by failure-path unit tests and upstream Android deprecation warnings are not test failures. The build completed successfully.

## Acceptance boundaries

The following claims are deliberately **not accepted yet**:

1. Public APK bytes match the local SHA/size after frontend deployment.
2. Backend release policy returns the intended forced/current Android decisions after registration.
3. Current exact-SHA iOS IPA is published by the SideStore workflow and its archive/hash metadata is verified.
4. Production-signed Android install, one-time legacy reinstall, and a later same-signer upgrade pass on a physical device.
5. Android terminated/background push delivery and notification-tap routing pass on a physical device.
6. SideStore install, login/session, role navigation, authoring/upload, update admission, and notification behavior pass on a physical iPhone.
7. Student and teacher migrated route families pass the visual/accessibility device matrix.

These gates require CI/deployed state, service credentials, or physical hardware. Source and local artifact success must not be used as a substitute.

## Rollback

- Do not register build 47 until the immutable public APK bytes match this file's size and SHA-256.
- Keep the prior artifact and policy record available; do not overwrite an existing build number with different bytes.
- Backend push and offline snapshot behavior have server/client kill switches; durable inbox notifications remain authoritative if push is disabled.
- Aggregate read models can be rolled back by deployment while the existing focused detail/mutation endpoints remain intact. The audited overview clients do not retain a hidden fan-out fallback that could recreate the request-burst problem.
