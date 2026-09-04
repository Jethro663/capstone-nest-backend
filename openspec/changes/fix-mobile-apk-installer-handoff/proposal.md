## Why

The verified Android APK currently cannot reliably hand off to Package Installer: returning or blocked installer activities are treated as success and the UI silently loops to **Install Now**. The released APK also omits Android's install-package permission declaration, so modern Android devices cannot consistently authorize Nexora as an installation source.

## What Changes

- Declare `android.permission.REQUEST_INSTALL_PACKAGES` in both Expo configuration and the checked-in Android manifest.
- Treat a cancelled or blocked Android installer activity as a typed, recoverable installation failure instead of a successful handoff.
- Preserve the verified APK so users can open the Nexora-specific Unknown Apps settings and retry without downloading again.
- Add regression tests for Android activity results and provider recovery states.
- Make release verification reject source configuration or built APKs that omit the required installer permission.
- Publish and register a new ARM64 Android APK with exact size and SHA-256 metadata.

## Capabilities

### New Capabilities

- `mobile-apk-installation`: Reliable Android package-installer handoff, permission recovery, and release-artifact validation for sideloaded Nexora updates.

### Modified Capabilities

None.

## Impact

The change affects the React Native update service and provider, Android/Expo permission configuration, APK release tooling and tests, release documentation, the embedded web download artifact, and production app-version metadata. It adds no runtime dependency, does not change backend API shapes, and remains limited to Android APK updates.
