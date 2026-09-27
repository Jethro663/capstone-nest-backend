# Nexora TestFlight Delivery Design

**Date:** 2026-09-27

**Status:** Approved

## Goal

Prepare the existing Expo mobile application for a signed App Store distribution build that can be submitted to the existing Nexora App Store Connect record and installed through TestFlight.

## Confirmed Apple Identity

- App Store Connect Apple ID: `6816592125`
- App Store Connect bundle ID: `com.nexora.lms.mobile.7A4H2D888M`
- Apple Developer membership type: Individual
- Nexora Expo project ID: `440f3e6f-ae69-495d-b391-4f4eab9d465e`

## Selected Architecture

The production iOS build will use the exact bundle ID already attached to the App Store Connect record. A dynamic Expo configuration reads the production EAS profile's non-secret bundle-ID override, while the default configuration retains `com.nexora.lms.mobile` for the established SideStore workflow. Android also keeps `com.nexora.lms.mobile`. EAS Build will create the signed store-distribution archive on a remote macOS builder, and EAS Submit will upload it to Apple using the existing App Store Connect Apple ID.

The repository remains the authority for the shared marketing version and platform build numbers. The current release identity, `0.1.52` build `53`, remains unchanged and the existing release tooling continues to keep `expo.ios.buildNumber` equal to `expo.android.versionCode`.

## Required Repository Changes

1. Add a guarded dynamic Expo configuration that resolves `com.nexora.lms.mobile.7A4H2D888M` only for the EAS production profile and retains `com.nexora.lms.mobile` by default.
2. Add an iOS-specific 1024 by 1024 opaque PNG app icon using the existing Nexora artwork and navy brand background.
3. Declare iOS 15.1 as the minimum deployment target.
4. Add camera and photo-library permission descriptions for the installed image picker.
5. Declare that the app does not use non-exempt encryption. The inspected mobile source uses operating-system HTTPS and secure storage plus UUID and SHA-256 utilities, not custom encryption.
6. Add an EAS `production` store build profile with the production API URL.
7. Add an EAS `production` submit profile targeting App Store Connect Apple ID `6816592125`.
8. Add static contract tests for the Apple identity, EAS profile, version parity, permission declarations, and iOS icon format.
9. Add a handoff guide that separates repository work from the one-time Account Holder credential bootstrap.

## Preserved Behavior

- Android package ID, adaptive icon, APK updater, and Android release workflow do not change.
- The unsigned SideStore workflow retains bundle ID `com.nexora.lms.mobile` and remains clearly separate from the signed TestFlight path.
- The production backend remains `https://capstone-backend-v2-production.up.railway.app/api`.
- The unrelated existing documentation modification is not included in this change.

## Credential Boundary

No Apple password, two-factor code, certificate private key, App Store Connect API private key, or Expo access token is stored in Git. Because the Apple membership is Individual, the Account Holder must complete the first interactive Apple credential setup. After EAS stores valid signing credentials, authorized Expo users can start later builds without receiving the Account Holder's Apple password.

## Acceptance Criteria

- Expo resolves the iOS configuration with the exact App Store Connect bundle ID.
- The production EAS build profile is store-distributed and points to the production backend.
- The submit profile resolves to Apple ID `6816592125`.
- The iOS icon is 1024 by 1024, RGB, and has no transparency.
- Existing release and SideStore tests continue to pass.
- A precise Windows/Linux handoff identifies the only steps that require the Account Holder.
