## Why

The current mobile build still exposes an invisible white-on-white drawer control, a Student Home follow-up layout that renders unlike its intended row contract, and widespread palette/action drift after a partial redesign migration. These failures need a single enforced design-system completion pass now because isolated patches would leave the shared causes and updater-delivery risk intact.

## What Changes

- Introduce an enforced semantic mobile presentation contract covering navy structure, red intent, neutral reading surfaces, state tones, overlays, and inverse app-bar controls.
- Fix shared menu, Back, close, and app-bar actions so every role has visible, accessible controls on navy.
- Replace the fragile Student Home follow-up tile with a rendered/tested horizontal row for interactive and informational states.
- Converge active student, teacher, admin, auth, notification, dialog, and generated presentation on shared color and action owners while preserving functional behavior.
- Align Android launcher, splash, status bar, navigation bar, and generated rich-text presentation with the same system.
- Add automated design-drift checks and rendered regression coverage.
- Package and publish a new production-signed Android release after complete verification.
- No breaking API, route, schema, role, academic-policy, or update-policy change is introduced.

## Capabilities

### New Capabilities

- `mobile-design-system-compliance`: Defines semantic color ownership, shared action/header behavior, active-source drift prevention, and native/generated presentation alignment.
- `mobile-student-next-move-rendering`: Defines stable and accessible rendering for the Student Home follow-up records across interactive, informational, narrow-width, and larger-text states.
- `mobile-release-integrity`: Defines the verified source-to-signed-APK-to-public-updater evidence required for this hotfix release.

### Modified Capabilities

None. The repository has no existing OpenSpec capability specs, and functional mobile contracts remain unchanged.

## Impact

- Affects `mobile/` theme, shared navigation/UI, role adapters, active student/teacher/admin/auth/provider presentation, Android resources, and the rich-text generator.
- Affects mobile tests, static design auditing, Expo/Gradle packaging, frontend download metadata, CI, Railway delivery, and backend update-policy registration.
- Does not affect backend APIs, database schema, DTOs, query/mutation behavior, routes, permissions, assessment/grading semantics, or notification delivery.
