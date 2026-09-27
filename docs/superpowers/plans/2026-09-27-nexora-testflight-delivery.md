# Nexora TestFlight Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Nexora Mobile for a signed EAS production build and submission to its existing TestFlight record.

**Architecture:** Keep shared release versions repository-managed and resolve Apple's suffixed bundle identity only in the production EAS profile through a guarded dynamic Expo config. Preserve the default SideStore identity, and use a dedicated EAS store profile and submission profile backed by a focused contract test and a one-time Account Holder handoff.

**Tech Stack:** Expo SDK 54, EAS Build, EAS Submit, Node.js test runner, App Store Connect, TestFlight.

## Global Constraints

- App Store Connect Apple ID is exactly `6816592125`.
- iOS bundle ID is exactly `com.nexora.lms.mobile.7A4H2D888M`.
- Android package remains exactly `com.nexora.lms.mobile`.
- Production API URL remains exactly `https://capstone-backend-v2-production.up.railway.app/api`.
- Keep `cli.appVersionSource` set to `local`; do not enable independent iOS auto-increment.
- Do not store Apple or Expo secrets in Git.
- Do not modify the existing unrelated documentation change.

---

### Task 1: Add TestFlight Configuration Contract

**Files:**
- Create: `mobile/scripts/ios-testflight-delivery.test.cjs`
- Modify: `mobile/package.json`

**Interfaces:**
- Consumes: `mobile/app.json`, `mobile/eas.json`, and `mobile/assets/ios/icon.png`.
- Produces: `npm run test:ios-testflight`, the focused readiness gate used by later tasks.

- [ ] **Step 1: Write the failing configuration test**

Create Node tests that require the exact Apple ID and bundle ID, local version ownership, iOS/Android build-number parity, store distribution, production API URL, encryption declaration, permission copy, iOS 15.1 deployment target, and a 1024 by 1024 RGB PNG without a transparency chunk.

- [ ] **Step 2: Register the focused test command**

Add `"test:ios-testflight": "node --test scripts/ios-testflight-delivery.test.cjs"` to `mobile/package.json`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:ios-testflight`

Expected: FAIL because the TestFlight configuration and dedicated icon do not exist yet.

### Task 2: Configure the Store Build and Apple Record

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/eas.json`
- Create: `mobile/app.config.js`
- Create: `mobile/assets/ios/icon.png`
- Test: `mobile/scripts/ios-testflight-delivery.test.cjs`

**Interfaces:**
- Consumes: Apple ID `6816592125`, bundle ID `com.nexora.lms.mobile.7A4H2D888M`, and the current Nexora icon artwork.
- Produces: an Expo iOS configuration and EAS production profile suitable for App Store signing and TestFlight submission.

- [ ] **Step 1: Create the iOS icon**

Use the existing Nexora icon as the visual source, place it on the established `#0C1D3A` navy background, preserve safe edge padding, and export an opaque 1024 by 1024 RGB PNG at `mobile/assets/ios/icon.png`.

- [ ] **Step 2: Update Expo iOS configuration**

Keep the default iOS bundle ID for SideStore and add a guarded dynamic override for the exact Apple bundle ID. Set the dedicated icon and `ios.config.usesNonExemptEncryption` to `false`, configure explicit camera and photo-library descriptions through `expo-image-picker`, and add iOS deployment target `15.1` through `expo-build-properties`.

- [ ] **Step 3: Add production EAS profiles**

Add a `production` build with `distribution: "store"`, the production API URL, and `NEXORA_IOS_BUNDLE_IDENTIFIER: "com.nexora.lms.mobile.7A4H2D888M"`. Add `submit.production.ios.ascAppId: "6816592125"`. Preserve the preview profile and local version source.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test:ios-testflight`

Expected: all TestFlight delivery contract tests pass.

### Task 3: Document the Account Holder Handoff

**Files:**
- Create: `docs/mobile-ios-testflight-handoff.md`

**Interfaces:**
- Consumes: the production EAS profile from Task 2.
- Produces: a friend-facing setup, build, submission, installation, testing, and evidence guide.

- [ ] **Step 1: Document prerequisites and privacy boundaries**

List the Windows/Linux prerequisites, Expo project access, Individual Account Holder requirement, and the credentials that must never be sent through chat or committed.

- [ ] **Step 2: Document the first signed build**

Provide exact commands from `mobile/`, expected prompts and outcomes, the Account Holder-only credential bootstrap, and stop conditions for bundle-ID or agreement errors.

- [ ] **Step 3: Document TestFlight installation and evidence capture**

Provide the App Store Connect processing path, internal tester invitation path, TestFlight installation steps, required Nexora smoke checks, and screenshots/video needed for capstone evidence.

### Task 4: Verify the Integrated Change

**Files:**
- Test: `mobile/scripts/ios-testflight-delivery.test.cjs`
- Test: `mobile/scripts/ios-sidestore-delivery.test.cjs`
- Test: `mobile/scripts/app-version-release.test.cjs`

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: repository evidence that the new store path is valid without regressing release identity or SideStore delivery.

- [ ] **Step 1: Resolve the Expo production configuration**

Run: `NEXORA_IOS_BUNDLE_IDENTIFIER=com.nexora.lms.mobile.7A4H2D888M npx expo config --type public`

Expected: the resolved iOS bundle ID, icon, deployment target, and permission configuration are present without configuration errors.

- [ ] **Step 2: Validate the EAS production profile**

Run: `npx eas-cli@latest config --platform ios --profile production`

Expected: EAS resolves a store build for the existing Expo project and production API URL.

- [ ] **Step 3: Run focused release tests**

Run: `npm run test:ios-testflight && npm run test:ios-sidestore && npm run test:release`

Expected: all tests pass.

- [ ] **Step 4: Run mobile typechecking and unit tests**

Run: `npm run typecheck && npm test -- --runInBand`

Expected: typechecking and the mobile Jest suite pass.

- [ ] **Step 5: Review the final diff**

Confirm only the approved TestFlight files and plan/design documents are included. Keep `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` excluded.

- [ ] **Step 6: Commit the verified change**

Stage only the approved files and commit with `feat(mobile): configure TestFlight delivery`.
