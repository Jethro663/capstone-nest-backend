## Why

The mobile login works functionally but presents a generic, nearly colorless shell that does not carry the GABHS seal, student hero artwork, or campus-red identity users see on the Nexora web landing page. It also prints the configured API URL as if that proved connectivity and gives unauthenticated users no compact way to verify the server or installed APK before signing in.

## What Changes

- Replace the generic mobile auth composition with a responsive "Campus Front Door" login that reuses the web landing page's GABHS seal, Nexora student artwork, warm background, campus-red palette, and restrained red/amber/rose accents.
- Preserve the current multi-role login, email verification, password recovery, seeded-development-login, and authentication contracts.
- Add a login-only top-left `!` status control that remains inside the safe area and opens an accessible compact modal.
- Verify the configured backend through the existing public liveness and readiness endpoints, distinguishing online, limited, unexpected-response, offline, and unchecked states without blocking sign-in.
- Reuse the existing update provider and native version identity so the modal can show installed version/build and current, supported, optional-update, forced-update, or unverified status without introducing a second APK decision path.
- Remove the passive raw `Connected to {API_BASE_URL}` line from the form and replace it with the truthful status interaction.
- Add responsive and behavioral coverage for small phones, standard portrait phones, landscape/tablet layouts, the keyboard-compacted state, health responses, and APK policy states.

## Capabilities

### New Capabilities

- `mobile-campus-login`: Responsive web-aligned mobile login presentation plus truthful pre-authentication server and APK diagnostics.

### Modified Capabilities

None.

## Impact

The change is primarily mobile-only: shared auth primitives, `LoginScreen`, a focused system-status service/model/component, update-provider consumption, screen and service tests, and bundled copies of existing web-owned image assets. It consumes existing public `/api/health/live`, `/api/health/ready`, and `/api/app-version/check` contracts without changing backend DTOs or envelopes. A successful release also updates the embedded Android APK and its manifest in `next-frontend/public/downloads/`; no unrelated web UI, backend business logic, AI service, authentication contract, or dependency is changed.
