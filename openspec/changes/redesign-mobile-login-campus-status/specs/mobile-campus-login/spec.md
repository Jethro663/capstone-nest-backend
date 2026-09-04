## ADDED Requirements

### Requirement: Mobile login carries the Nexora campus identity
The mobile login SHALL present the GABHS seal, Nexora Portal identity, existing Nexora student hero artwork, warm neutral surfaces, and the campus-red/amber/rose landing-page color direction while preserving readable contrast and a single clear sign-in action.

#### Scenario: User opens the login screen
- **WHEN** an unauthenticated user opens Nexora Mobile
- **THEN** the first rendered screen visibly identifies GABHS Digital Campus and Nexora Portal using bundled school and student artwork
- **AND** the email, password, sign-in, and recovery controls remain immediately discoverable

#### Scenario: Artwork cannot fill its container
- **WHEN** the hero image leaves space because of the current aspect ratio
- **THEN** a deep campus-red background remains visible without exposing an empty or transparent gap

### Requirement: Login composition adapts across supported device sizes
The login SHALL use viewport dimensions and keyboard visibility rather than device names to choose a stacked or split composition, SHALL keep form content scrollable, and SHALL preserve interactive targets of at least 44 by 44 px.

#### Scenario: Small portrait phone
- **WHEN** the viewport height is below 700 px in portrait orientation
- **THEN** the screen uses a shallower stacked hero and a scrollable form without clipping the sign-in or recovery controls

#### Scenario: Keyboard is visible
- **WHEN** the email or password keyboard opens on a stacked phone layout
- **THEN** the hero collapses to a compact branded header and the focused field plus sign-in action remain reachable

#### Scenario: Tablet or wide layout
- **WHEN** viewport width is at least 768 px
- **THEN** the screen uses a split hero/form composition and constrains the form column to a readable maximum width

#### Scenario: Reduced motion is enabled
- **WHEN** the operating system reports reduced-motion preference
- **THEN** the entrance is rendered without animated translation or timed decorative motion

### Requirement: Login exposes an accessible app and server status control
The login SHALL place a literal `!` status control in the top-left safe area with an accessibility label of `App and server status`, a minimum 44 by 44 px hit target, and a separate state dot whose tone is based on checked evidence.

#### Scenario: Status has not finished checking
- **WHEN** health or version evidence is absent or being refreshed
- **THEN** the status dot uses a neutral tone and the control does not claim success or failure

#### Scenario: User opens status
- **WHEN** the user activates the status control
- **THEN** a compact dismissible modal identifies the configured server, server condition, installed app version/build, version-policy condition, and last-check time

#### Scenario: Screen reader focuses the control
- **WHEN** assistive technology focuses the top-left control
- **THEN** it announces `App and server status` rather than only announcing punctuation

### Requirement: Server diagnostics reflect live runtime evidence
The mobile client MUST use the existing public liveness and readiness contracts to classify the configured backend as `online`, `limited`, `unexpected`, `offline`, or `checking`, and MUST NOT infer connectivity only from the configured URL.

#### Scenario: Backend is live and ready
- **WHEN** `/health/live` returns `status: "ok"` with `service.name: "backend"` and `/health/ready` succeeds
- **THEN** the modal reports the configured target as connected and ready

#### Scenario: Backend is live but dependencies are not ready
- **WHEN** liveness returns the expected backend contract but readiness returns 503 or otherwise fails
- **THEN** the modal reports `Connected · limited` rather than `Offline`

#### Scenario: Endpoint returns an unrelated payload
- **WHEN** liveness responds without the expected status and backend metadata
- **THEN** the modal reports an unexpected server response

#### Scenario: Backend cannot be reached
- **WHEN** the liveness request times out or fails before a valid response
- **THEN** the modal reports that the server cannot be reached and exposes `Check again`

#### Scenario: Health check is stale or negative
- **WHEN** the cached diagnostic is limited, unexpected, or offline
- **THEN** the sign-in form remains enabled so the actual authentication request remains authoritative

### Requirement: APK diagnostics reuse authoritative version policy
The status modal MUST derive installed native identity from `expo-application`, MUST derive update requirements from the existing app-version policy and update provider, and MUST delegate update actions to the existing updater.

#### Scenario: Installed build equals or exceeds the latest policy
- **WHEN** the provider returns `updateType: "none"` and the installed version code is at least the latest version code
- **THEN** the modal reports the installed version/build as current

#### Scenario: Installed build is supported but below latest
- **WHEN** the provider returns `updateType: "none"` and the installed version code is below the latest version code
- **THEN** the modal reports the build as supported without falsely claiming it is the latest APK

#### Scenario: Optional APK update exists
- **WHEN** the provider returns `apk_optional`
- **THEN** the modal reports an available update and exposes a review action that uses the existing updater flow

#### Scenario: Forced APK update exists
- **WHEN** the provider returns `apk_forced`
- **THEN** the modal reports that an update is required and delegates to the existing non-dismissible forced-update flow

#### Scenario: Version check fails
- **WHEN** the provider records a policy-check failure without a usable decision
- **THEN** the modal shows the installed version/build but says the latest version could not be verified

### Requirement: Existing authentication behavior remains unchanged
The redesigned login MUST preserve current email normalization, required-field validation, password visibility, seeded development credentials, email-verification routing, login submission, notice/error banners, forgot-password navigation, secure auth provider behavior, and multi-role post-login resolution.

#### Scenario: Valid account signs in
- **WHEN** a student, teacher, or administrator submits valid credentials
- **THEN** the existing auth provider performs login and the existing navigator resolves the user's role without a login-specific role selector

#### Scenario: Unverified credentials are valid
- **WHEN** login reports an unverified account and credential validation succeeds
- **THEN** the user is routed to the existing activation email-verification flow

#### Scenario: User chooses account recovery
- **WHEN** the user activates the forgot-password control
- **THEN** navigation opens the existing `ForgotPassword` screen

#### Scenario: Raw API label is removed
- **WHEN** the redesigned form renders
- **THEN** it does not display the passive `Connected to {API_BASE_URL}` line because diagnostics are owned by the status modal

### Requirement: Diagnostics are bounded and non-polling
The login SHALL perform one server check when mounted, SHALL refresh only through an explicit check or a future stale-cache lifecycle event, and SHALL NOT continuously poll while unauthenticated.

#### Scenario: Login remains open
- **WHEN** the user leaves the login screen idle after the initial check
- **THEN** no repeating health-check interval is created

#### Scenario: User requests a refresh
- **WHEN** the user presses `Check again`
- **THEN** the server diagnostic and existing update-provider check enter a visible checking state and replace the prior result when complete

### Requirement: Android release artifact matches source and public metadata
The implemented mobile change SHALL be released as package `com.nexora.lms.mobile`, native version `0.1.17`, version code `18`, ARM64 APK, with source metadata, compiled metadata, embedded production API URL, frontend-hosted bytes, and JSON manifest in exact agreement.

#### Scenario: Local release verification completes
- **WHEN** the code-18 APK is prepared for publication
- **THEN** package identity, version, installer permission, signature continuity, ARM64 ABI, ZIP integrity, 16 KB alignment, production API URL, byte size, and SHA-256 all pass repository release verification

#### Scenario: Public artifact is deployed
- **WHEN** exact-commit CI and deployment reach terminal success
- **THEN** the public APK byte count and SHA-256 match the committed manifest before the new version policy is registered
