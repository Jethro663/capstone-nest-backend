# iOS SideStore Delivery Design

## Goal

Produce a verified, unsigned iPhone-device IPA for Nexora on GitHub's macOS infrastructure and publish it through a stable public GitHub prerelease so a designated Windows/iPhone tester can install it through SideStore without cloning the repository, installing Node.js, running Metro, or owning a Mac.

## Confirmed constraints

- The project is Expo SDK 54 with React Native 0.81.5.
- The tester owns and controls an iPhone 11 running iOS 26.5 and a Windows computer. The guide must verify that Windows is 64-bit because current iLoader builds do not support 32-bit Windows.
- Neither the project team nor the tester has a paid Apple Developer Program membership.
- The GitHub repository is public, so standard GitHub-hosted macOS runners are available without billed Actions minutes.
- `mobile/ios/` is not committed. The workflow must generate native iOS files ephemerally through Expo Prebuild.
- `mobile/app.json` has `ios.buildNumber` but no explicit `ios.bundleIdentifier`.
- SideStore, not GitHub, will apply the tester's free seven-day personal-development signature.
- The IPA must use the production API endpoint and must not contain test-account credentials or Apple Account credentials.

## Approaches considered

### 1. Workflow artifact only

GitHub Actions could upload the IPA as a run artifact. This is technically sufficient, but the tester would need to find the correct workflow run, sign in to GitHub, download a ZIP, extract it in Files, and locate the IPA. That friction makes troubleshooting and repeated testing harder.

### 2. Verified rolling GitHub prerelease

GitHub Actions builds and verifies the IPA, retains the workflow artifact for diagnosis, and publishes the verified files to a stable prerelease tag. The prerelease page exposes a direct public IPA download and concise installation notes. This is the selected approach because it creates a one-link handoff without introducing a separate hosting service.

### 3. SideStore Connect or custom AltSource

Publishing an update feed could surface Nexora directly inside SideStore. It adds feed metadata, hosting, version ordering, and another beta service to the critical path. That complexity is not justified for one capstone tester and can be added later without changing the IPA build.

## Selected architecture

The release path has four bounded stages:

```text
mobile source
    -> GitHub macOS 26 / Xcode 26.5
    -> unsigned ARM64 Release IPA + checksum + metadata
    -> stable GitHub prerelease
    -> Safari download -> SideStore signing -> iPhone installation
```

### Native identity

Set `ios.bundleIdentifier` to `com.nexora.lms.mobile`, matching the existing Android application identity where platform rules permit. Preserve the existing human-readable app name, semantic version, iOS build number, icon, orientation, scheme, runtime policy, and EAS project identity.

The bundle identifier identifies the generated application before SideStore re-signs it. The tester's free Apple Account owns the temporary personal-development registration created by SideStore.

### GitHub build workflow

Add a manually triggered workflow dedicated to iOS sideload builds. It must not run on every push and must not alter Android release behavior.

The job will:

1. Check out the selected commit on a standard `macos-26` runner and explicitly select Xcode 26.5.
2. Install the repository's declared Node.js/npm dependencies from `mobile/package-lock.json`.
3. Validate Expo dependency alignment, run the mobile typecheck and focused release tests, and generate a clean ephemeral iOS project with Expo Prebuild.
4. Install CocoaPods dependencies and compile a Release application for the physical-device `iphoneos` SDK with code signing disabled.
5. Package the resulting `.app` under `Payload/` as an unsigned `.ipa` suitable for SideStore re-signing.
6. Generate build metadata and a SHA-256 checksum.
7. Run structural verification before uploading or publishing anything.

`EXPO_PUBLIC_API_URL` is fixed to `https://capstone-backend-v2-production.up.railway.app/api` for this workflow. The app must include its JavaScript bundle and assets so it starts without Metro or a development computer.

### Artifact verification

Publication is allowed only when all checks succeed:

- The archive is a valid ZIP containing exactly one application beneath `Payload/`.
- The application identifier is `com.nexora.lms.mobile` before SideStore re-signing.
- The Info.plist version and build number equal `mobile/app.json`.
- The main executable contains the ARM64 device architecture.
- The Release application contains its bundled JavaScript and required Expo assets.
- The embedded public API URL is the production HTTPS endpoint.
- The archive contains no provisioning profile and no project-owned signing certificate.
- The checksum file matches the final uploaded IPA bytes.

The workflow always uploads a diagnostic Actions artifact after successful verification. Publication occurs only when the operator explicitly selects the publish input.

### Release delivery

Use a stable prerelease tag named `ios-sidestore-latest`. A successful published build replaces the assets on that prerelease only after verification. The release uses stable convenience names so the tester can reuse the same direct download link:

- `Nexora-iOS-latest-unsigned.ipa`
- `Nexora-iOS-latest-unsigned.ipa.sha256`
- `Nexora-iOS-latest-metadata.txt`, containing the source commit, Expo version, Xcode version, application version/build, bundle identifier, API origin, build timestamp, and IPA size
- a release body explaining that SideStore will apply the installer's personal signature and that the installation expires after seven days unless refreshed

The GitHub Actions artifact uses a versioned name and remains immutable per workflow run even though the convenience prerelease points to the newest verified build. This preserves traceability when the rolling release is updated.

## Tester handoff

The repository will include one detailed Windows/iPhone guide. The release body will link to it and also repeat the shortest installation path.

The tester will:

1. Create or use a dedicated Apple Account for sideload testing and keep its password private.
2. Install iTunes and iLoader on 64-bit Windows, install LocalDevVPN on the iPhone, connect the phone by data cable, and approve the trust prompt.
3. Use iLoader to install SideStore Stable, trust the developer profile, enable Developer Mode, connect LocalDevVPN, sign into SideStore with the same Apple Account, and refresh SideStore once.
4. Open the stable GitHub prerelease on the iPhone, download the IPA, import it into SideStore, install Nexora, and grant only the permissions required by each tested feature.
5. Before each seven-day expiry, connect LocalDevVPN over Wi-Fi and refresh both SideStore and Nexora.

The guide must include exact menu paths, expected success indicators, common errors, recovery steps, privacy warnings, and instructions to preserve screenshots/video plus device, iOS, app version, build number, role, timestamp, and pass/fail results.

## Testing scope and evidence boundaries

The SideStore-installed build is valid evidence for a real unsigned Release binary re-signed with a free personal certificate and executed on a physical iPhone. Test coverage must include application startup without Metro, production API connectivity, authentication/session restoration, logout, navigation, forms and keyboard behavior, safe areas, scrolling, document/image pickers, sharing, WebView/rich text, foreground/background recovery, local notifications, screen-capture protection, and one data-backed flow for student, teacher, and administrator roles.

The evidence must not be described as App Store, TestFlight, production-signing, or public-distribution validation. Remote APNs delivery and entitlements unavailable to free personal signing remain explicitly out of scope. Assessment screen recording may be blocked intentionally; that flow should be recorded with a second camera and the block itself documented as expected security behavior.

## Security and privacy

- Never request, store, transmit, or commit the tester's Apple Account password, two-factor code, pairing file, device UDID, or Nexora test credentials.
- The tester enters Apple credentials only into the official iLoader/SideStore flow and should prefer a dedicated sideload-testing Apple Account.
- Do not publish provisioning profiles, certificates, pairing files, logs containing credentials, or screenshots containing private student data.
- The public IPA contains the production API origin and application code but no privileged server secret.
- Use only the stable SideStore release and official documentation; do not enable exploit-based app-limit bypasses.

## Failure handling

- Dependency, Prebuild, CocoaPods, compilation, packaging, or verification failure stops before release publication.
- A broken rolling prerelease must not replace the last verified assets.
- If SideStore cannot import the IPA, compare the downloaded file's SHA-256 checksum, verify the archive was not automatically renamed or extracted, and retry from the immutable Actions artifact when necessary.
- If the personal certificate expires, refresh through SideStore before deleting Nexora so application data has the best chance of remaining intact.
- If the pairing file expires after an iOS update, reset, or unexpected invalidation, repeat the iLoader pairing flow on Windows.
- If SideStore infrastructure is unavailable, use Expo Go as a temporary functional-test fallback while preserving the distinction from standalone native-build evidence.

## Repository changes

- Modify `mobile/app.json` to add the iOS bundle identifier.
- Add a manually triggered GitHub workflow for unsigned physical-device IPA creation and optional rolling-prerelease publication.
- Add a focused verification script used by the workflow.
- Add the detailed Windows/iPhone SideStore tester guide.
- Add tests that enforce the iOS identity, workflow safety gates, release naming, production API configuration, and required guide content.

No backend, frontend, AI service, database, Android signing, APK updater, Railway deployment, or App Store/TestFlight behavior is changed.

## Acceptance criteria

1. A manually dispatched GitHub run on the exact source commit completes on macOS/Xcode and publishes a verified unsigned ARM64 IPA plus checksum and metadata.
2. The public prerelease provides a direct IPA download without requiring the tester to clone the repository or install development tools.
3. SideStore accepts, signs, installs, refreshes, and launches Nexora on the iPhone 11 running iOS 26.5.
4. Nexora starts without Metro and reaches the production API over HTTPS.
5. The tester guide is executable by a Windows/iPhone owner with no project knowledge and includes installation, refresh, test evidence, privacy, troubleshooting, and cleanup instructions.
6. Repository checks prove that no Apple credentials, provisioning profiles, test-user passwords, or privileged backend secrets are embedded or published.
7. Final reporting clearly separates source/static checks, unsigned native build evidence, SideStore installation evidence, physical-device functional evidence, and unsupported App Store/APNs claims.
