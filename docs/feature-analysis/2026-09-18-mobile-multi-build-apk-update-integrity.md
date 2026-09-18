# Mobile multi-build APK update and integrity analysis

Date: 2026-09-18 (Asia/Manila)  
Scope assumption: Android installations that already contain Nexora's in-app APK updater. iOS, Expo OTA-only updates, and Android builds predating the updater contract are outside the confirmed scope.

## 1. Executive verdict

**Verdict: Confirmed implemented and currently deployed.** An Android app that is more than one build behind does not need to install every intermediate build. It sends its installed `versionCode`, the backend selects the highest registered Android release, and the app downloads that latest full APK directly.

The build gap itself does **not** cause an APK size mismatch. Size and SHA-256 are properties of the one target APK, not of the number of skipped builds. The client verifies both before exposing installation.

Current production evidence:

- Build 40 -> latest build 46: `apk_forced`.
- Build 45 -> latest build 46: `apk_forced`.
- Build 46 -> `none`.
- Live policy, live manifest, committed manifest, and live/committed APK all agree on build `46`, version `0.1.45`, size `41,119,367` bytes, and SHA-256 `72bde7c7ed2c0cb1efeaa1905f89f4c069d994ddedb3ad8433197aa2cc8f2c08`.

Qualification: “no APK size mismatches ever” is too strong. The stable deployed state is consistent, the release workflow refuses to register metadata for unmatched live bytes, and the client safely rejects mismatches. A short rollout window can still exist because the public APK URL is mutable: the frontend deploy publishes new bytes before the backend registers their metadata. A client that checks/downloads inside that window can see an integrity error and must retry after registration. The wrong APK is not offered for installation.

Owner/coupling: mobile updater UI and verification are owned by `mobile/`; decision policy and persisted release metadata are owned by `backend/`; artifact publication and release registration are owned by the frontend deployment workflow. Coupling is intentional but medium-high because correctness depends on an exact three-way policy/manifest/APK match.

Recommendation: treat the feature as implemented. If the desired guarantee is literally zero rollout-time mismatches, publish APKs at immutable version/hash-specific URLs and switch the backend policy only after those bytes are live.

## 2. Feature anatomy

### Normal flow

1. `checkUpdatePolicy()` sends the installed Android native version, build code, and runtime to `GET /api/app-version/check` (`mobile/src/services/update/update.service.ts:57-95`).
2. `AppVersionService.checkVersion()` reads the highest Android `versionCode`, not the next sequential build (`backend/src/modules/app-version/app-version.service.ts:151-180`).
3. Any client below the supported floor receives `apk_forced`; a supported but older client receives `apk_optional` when a full APK/runtime transition is required (`backend/src/modules/app-version/app-version.service.ts:182-204`).
4. The response carries the latest APK URL, exact size, and SHA-256 (`backend/src/modules/app-version/app-version.service.ts:206-218`). The mobile client rejects an update action without valid HTTPS/size/hash metadata (`mobile/src/services/update/update.service.ts:97-130`).
5. The provider downloads one file named for the target latest build, checks size and SHA-256, and exposes it to the installer only after verification (`mobile/src/providers/UpdateProvider.tsx:222-323`; `mobile/src/services/update/update.service.ts:220-259`).

### Mismatch/retry flow

- A size or checksum mismatch deletes/rejects the downloaded APK and clears the verified URI.
- The provider refreshes policy once. It redownloads automatically only if version, SHA-256, size, or URL identifies a different package (`mobile/src/providers/UpdateProvider.tsx:275-313`).
- It does not loop forever and does not show “Retry Installation” for a deleted/unverified file (`mobile/src/providers/__tests__/UpdateProvider.test.tsx:424-479`).
- A later manual “Retry Download” first refreshes policy, allowing a rollout that has finished registering to recover (`mobile/src/providers/__tests__/UpdateProvider.test.tsx:482-505`).

### Release-state flow

- The manifest generator derives size and SHA-256 from the actual APK and checks Expo/Gradle/APK package/version agreement (`mobile/scripts/app-version-release.cjs:123-226`).
- CI runs release tests and `release:verify` before deployment (`.github/workflows/ci.yml:202-209`).
- Deployment waits for the frontend, compares the live manifest and downloaded live APK bytes with the tested manifest, then registers the exact policy and verifies old/current build decisions (`.github/workflows/railway-deploy.yml:57-100`; `.github/scripts/register-mobile-release.cjs:68-150`).
- The registration verifier explicitly checks build `1`, `latest - 2`, and `latest`, so a gap greater than one is part of release proof (`.github/scripts/register-mobile-release.cjs:141-150`).

## 3. Cascade map

| Edge | Provider -> interface -> consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|
| E1 | Installed app identity -> query params -> mobile update API call | Reports exact current build; no sequential-upgrade assumption | Medium | Confirmed | `mobile/src/services/update/update.service.ts:57-95` | Keep |
| E2 | `app_versions` -> highest `versionCode` query -> backend decision | Selects the latest registered APK directly | High | Confirmed | `backend/src/modules/app-version/app-version.service.ts:151-180` | Keep |
| E3 | Latest/floor comparison -> `apk_forced` or `apk_optional` -> old client | Works for any numeric gap; tests cover 3 -> 10 and 8 -> 10 | High | Confirmed | `backend/src/modules/app-version/app-version.service.ts:182-204`; spec `:140-185` | Keep |
| E4 | Backend policy -> size/hash/URL -> mobile validator | Fails closed on incomplete or contradictory APK metadata | High | Confirmed | `mobile/src/services/update/update.service.ts:97-130` | Keep |
| E5 | Latest policy -> one full APK download -> update provider | Skips intermediate APKs | High | Confirmed | `mobile/src/providers/UpdateProvider.tsx:222-255` | Keep |
| E6 | Downloaded bytes -> size + SHA-256 -> verified URI | Prevents corrupt/stale bytes from reaching installer | Critical | Confirmed | `mobile/src/services/update/update.service.ts:220-259` | Keep |
| E7 | Integrity error -> one policy refresh -> changed package retry | Recovers when registration changes during download; avoids loops/stale install retry | High | Confirmed | `mobile/src/providers/UpdateProvider.tsx:275-313`; provider tests `:424-505` | Keep |
| E8 | APK -> generated manifest -> CI/release checks | Derives rather than manually guesses size/hash | Critical | Confirmed | `mobile/scripts/app-version-release.cjs:123-255`; release tests | Keep |
| E9 | Frontend deployment -> live byte verification -> backend registration | Refuses to publish new policy until live bytes match | Critical | Confirmed | `.github/workflows/railway-deploy.yml:57-100`; `.github/scripts/register-mobile-release.cjs:68-117` | Keep; improve URL immutability |
| E10 | Registered policy -> old/current live checks -> deployment success | Verifies multi-build-behind clients and current client behavior | High | Confirmed | `.github/scripts/register-mobile-release.cjs:119-150` | Keep |
| E11 | Current live endpoints -> build 40/45/46 and artifact bytes -> this audit | Confirms stable production state matches build-46 source artifact | High | Confirmed | 2026-09-18 live `curl` policy/manifest/header/hash checks | Recheck per release |

No additional dependency was found within the inspected update-policy, mobile updater, release-artifact, and deployment-registration scope.

## 4. Isolation/disassembly and cut simulation

This audit does not recommend removal. The cuts below show which seams are required for the behavior to remain valid.

1. **Cut E2/E3:** clients no longer receive latest/floor decisions. Immediate effect: multi-build jumps become undefined or disappear. Validation: build 40 must resolve to build 46. Rollback: restore highest-version lookup and numeric comparisons.
2. **Cut E4/E6:** a stale or corrupt APK can reach Android installation. Compatibility and security risk are unacceptable. Validation: wrong size and wrong hash must both be deleted/rejected. Rollback: restore fail-closed metadata and byte verification.
3. **Cut E7:** steady-state updates still work, but clients caught during a release need a manual future retry and may retain confusing state. Validation: policy 17 changing to 18 during verification must end ready to install 18. Rollback: restore bounded one-refresh behavior.
4. **Cut E8/E9/E10:** metadata/artifact drift can be published again. Delayed effect: outdated installed apps report deterministic size/checksum failures. Validation: changed manifest or changed live APK must prevent registration. Rollback: redeploy the last matching APK/manifest pair and re-register that exact policy.

Persisted cleanup is unnecessary for ordinary upgrades: historical `app_versions` rows can remain because reads select the highest code. Operational rollback must restore a matching policy and artifact pair; changing only one side is unsafe.

## 5. Improvements

Required for an absolute zero-rollout-mismatch guarantee:

1. Publish each APK at an immutable path such as `/downloads/android/46/<sha256>.apk`; keep old artifacts available, then register the new URL only after live verification. This removes the old-policy/new-file window created by the mutable release URL.

Optional evidence-backed improvements:

2. When a mismatch refresh returns the same package identity, schedule a bounded backoff/recheck instead of requiring immediate manual retry; keep the existing no-loop ceiling.
3. Record privacy-safe integrity telemetry with expected build/size/hash prefix, actual size/hash prefix, and policy timestamp to measure whether rollout races still occur.
4. Add an end-to-end physical-device acceptance case that installs build `latest - 2` (or older updater-capable build), updates directly to latest, relaunches, and confirms the new build reports `none`.

## 6. Uncertainty and coverage boundary

- **Unverified:** an actual physical Android device was not upgraded from build 40/44/45 to 46 during this audit. Static logic, focused tests, release verification, and live API/artifact checks passed, but those are not physical-device installation evidence.
- **Unverified:** binaries predating the in-app updater contract. The backend accepts their build numbers, but a pre-updater binary cannot be proven to self-update merely from current server behavior.
- **Inferred:** a brief rollout mismatch remains possible between frontend artifact publication and backend registration because the URL is mutable. The workflow order and client behavior support this inference; it was not reproduced during the stable-state audit.

Verification executed:

- Mobile updater/provider Jest: 2 suites, 37 tests passed.
- Backend app-version service Jest: 1 suite, 17 tests passed.
- Release script tests: 10 passed.
- `ANDROID_HOME=/home/jethro/Android/Sdk npm run release:verify`: passed.
- Live policy: builds 40 and 45 -> forced build 46; build 46 -> none.
- Live APK: HTTP `Content-Length` 41,119,367 and SHA-256 matched policy/manifest/local artifact.
