## Context

`mobile/src/screens/LoginScreen.tsx` owns the unauthenticated multi-role sign-in flow and currently renders generic shared auth primitives plus a passive `Connected to {API_BASE_URL}` label. `mobile/src/components/auth/MobileAuthPrimitives.tsx` uses neutral `skillStream`/`modernAcademic` colors, a generic school icon, and no background artwork. The web landing page already owns the intended Nexora entrance identity: the GABHS seal, `NexoraHome.png` student artwork, a warm cream base, deep campus red, and restrained amber/rose accents.

The backend already exposes public `/api/health/live` and `/api/health/ready` endpoints. The mobile root already mounts `UpdateProvider`, which obtains authoritative APK decisions through `/api/app-version/check`, and native version/build identity already comes from `expo-application`. The login redesign therefore does not need a new backend contract or a second update/install implementation.

## Goals / Non-Goals

**Goals:**

- Make the first mobile screen immediately recognizable as the same GABHS Nexora product as the web landing page.
- Preserve one login for students, teachers, and administrators with the existing authentication and recovery behavior.
- Give users a login-only top-left `!` control that truthfully reports the configured server, server health, installed native version/build, and update policy.
- Adapt the composition for small phones, normal portrait phones, landscape, tablets, keyboard-open conditions, and reduced-motion preferences.
- Reuse the existing updater for update actions and publish a verified Android `0.1.17` / build `18` release artifact.

**Non-Goals:**

- Recoloring the authenticated mobile application or redesigning password recovery, verification, activation, or role dashboards.
- Changing login DTOs, token storage, role routing, health response envelopes, app-version DTOs, or backend policy logic.
- Adding continuous health polling, a global floating status control, a settings subsystem, a new image-generation dependency, or a second APK installer.
- Claiming physical-device acceptance when no Android device or emulator is available.

## Decisions

### Use a login-specific Campus Front Door composition

Create `MobileCampusLogin.tsx` as the layout owner. In stacked mode it renders a campus-red hero with the real GABHS seal and student artwork above a warm form surface that overlaps the hero. At widths of at least 768 px it switches to a split composition with artwork on the left and a centered form column on the right. The existing `LoginScreen` retains authentication state and callbacks and supplies the form as children.

The login-specific theme uses deep crimson `#5B0F12`, campus red `#B91C1C`, action red `#EF4444`, amber `#F59E0B`, rose `#FB7185`, warm base `#FFFAF9`, ink `#0F172A`, and muted ink `#5F6B7C`. Exact web fonts are not added to the mobile bundle; the design matches hierarchy, weight, tracking, imagery, and color using platform fonts.

Alternative: recolor `AuthScreenShell` for every recovery screen. Rejected because the requested scope is the login entrance and broad auth-flow restyling would increase regression risk. Alternative: use a full-screen photo behind the form. Rejected because keyboard and contrast behavior are weaker on small phones.

### Resolve responsiveness through a pure layout model

Export `resolveCampusLoginLayout({ width, height, keyboardVisible })`. It returns `stacked` or `split`, a bounded hero height, and compact-form flags. Stacked screens below 700 px use a shallower hero; keyboard visibility collapses it further. The form remains scrollable, has a 480 px maximum width, and preserves 44 px interactive targets. A short entrance fade/translation runs only when reduced motion is disabled.

Alternative: branch on device names. Rejected because viewport and keyboard conditions are the actual layout inputs and also cover tablets, foldables, and web-based render verification.

### Keep the `!` control neutral until evidence supplies a state

The status trigger stays inside the login safe area and always uses a literal `!` as requested. A small dot carries status semantics: neutral while unchecked/checking, green when server and version are acceptable, amber for limited readiness, optional update, or unverifiable version, and red for offline, unexpected response, or forced update. Its accessibility label is `App and server status` and its hit target is at least 44 by 44 px.

The modal is a compact centered dialog with a clear title, close control, server row, address row, installed-version row, version-policy row, last-checked text, and `Check again` action. An available/required update exposes `Review update`, which delegates to `UpdateProvider.checkForUpdates()` rather than implementing download or installation.

Alternative: show a green `!` only when healthy. Rejected because exclamation color alone would conflate the control's identity with an error state and would be unclear before the first check.

### Treat liveness and readiness as different facts

Create `login-server-status.ts` using `publicClient` and the configured `API_BASE_URL`. First request `/health/live` with a short request timeout. Accept only `status: "ok"` plus `service.name: "backend"`; otherwise report `unexpected`. After valid liveness, request `/health/ready`: success reports `online`; a 503 or other readiness failure reports `limited` while retaining that the backend process is reachable. A liveness failure reports `offline`.

The target descriptor displays the normalized host and classifies loopback/emulator/private-network targets as local development, Railway hosts as hosted, and other valid hosts as configured. These checks inform the user but never disable the sign-in button; the actual login request remains authoritative.

Alternative: use only readiness. Rejected because an optional dependency outage would incorrectly tell users that the server itself is disconnected. Alternative: infer connectivity from the configured URL. Rejected because configuration is not runtime evidence.

### Derive version copy from the existing updater state

Create `login-status-model.ts` to map `UpdateState` plus `getClientVersionInfo()` into `checking`, `current`, `supported`, `available`, `required`, or `unverified`. `current` requires an installed code at or above the latest policy. `supported` covers `updateType: "none"` while the installed code is below the latest policy. Optional and forced decisions remain distinct. If the provider's policy check failed, the modal says it could not verify instead of claiming currency.

`LoginScreen` consumes `useUpdate()` and does not issue a second initial app-version request because `UpdateProvider` already checks at app start. `Check again` refreshes health and calls the existing provider check. If an update is presented, the official updater modal may supersede the diagnostic dialog; forced updates remain non-dismissible under the existing policy.

### Keep responsibilities isolated

- `MobileCampusLogin.tsx`: responsive artwork/layout and safe-area status-trigger placement.
- `MobileLoginStatusModal.tsx`: accessible diagnostic presentation only.
- `login-status-model.ts`: pure version and combined-tone derivation.
- `login-server-status.ts`: public health requests and configured-target description.
- `LoginScreen.tsx`: auth state, modal visibility, health refresh orchestration, and updater delegation.
- `MobileAuthPrimitives.tsx`: add optional color/gradient customization while preserving existing defaults for all non-login auth screens.

Existing web assets are copied into `mobile/assets/auth/` so the APK is self-contained and does not depend on a network image at login.

### Verify behavior, rendering, and release provenance separately

Jest coverage proves pure status mappings, server response classification, responsive layout thresholds, modal copy/actions, and preservation of login/recovery behavior. Mobile typecheck and the full Jest suite guard integration. Expo web renders at 320x568, 390x844, 844x390, and 1024x768 provide visual evidence for the responsive composition; Android runtime evidence is recorded only if a device/emulator is actually connected.

The Android sources advance from `0.1.16` / build `17` to `0.1.17` / build `18`. The release is built with Java 17, ARM64, production `EXPO_PUBLIC_API_URL`, inspected with `aapt`, `apksigner`, `zipalign`, ZIP/ABI checks, copied byte-for-byte to the frontend download path, and paired with an exact generated JSON manifest before commit.

## Risks / Trade-offs

- **The student artwork can crop differently across aspect ratios.** → Keep the image in a bounded hero with tested stacked/split positioning and a deep-red fallback behind it.
- **Health readiness may fail while login still works.** → Report `Connected · limited`, never `Offline`, when liveness succeeds.
- **A status refresh can surface the official update modal over the diagnostic modal.** → This is intentional for required/available APK action; the diagnostic component owns no installer state.
- **Copying web assets creates two bundled copies.** → Keep filenames/source provenance explicit and compare bytes so the mobile copies remain exact; no new art pipeline is introduced.
- **React Native renderer tests do not prove pixel quality.** → Add multi-viewport Expo web screenshots and, when available, Android emulator/device inspection.
- **The APK is internally signed rather than Play Store signed.** → Preserve certificate continuity and describe the release as internal/sideload distribution.

## Migration Plan

1. Add failing service/model/layout/modal/login tests and confirm each fails for the missing behavior.
2. Implement health classification, version presentation, responsive Campus Front Door layout, modal, and login integration until focused tests pass.
3. Run mobile typecheck, full Jest, OpenSpec validation, and multi-viewport render review; correct any behavior or visual regression.
4. Bump to `0.1.17` / build `18`, build and inspect the ARM64 APK with the production API URL, embed it, and generate/verify the manifest.
5. Run mobile, release, and affected frontend gates; inspect the complete diff and divergence.
6. Commit and push `developement`, watch the exact commit's CI and Railway deployments to terminal success, compare live APK bytes with the manifest, then register and read back the exact policy when the CI secret is available through the existing secret path.

Rollback restores the preceding source and exact `0.1.16`/17 APK bytes, deploys that commit, and registers the preceding manifest only after its public bytes are again live.

## Open Questions

None. The requested end-to-end objective authorizes planning, implementation, verification, APK publication, and exact-commit monitoring; existing contracts and release tooling resolve the remaining technical choices.
