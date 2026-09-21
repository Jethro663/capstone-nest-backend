## Why

Nexora mobile has the required teacher workflows, but its visual owners are split across role-specific themes, buttons, chips, selectors, and screen-local controls. The resulting white/dusty-red teacher shell, duplicate page labels, horizontal filter rows, text-heavy assessment review, constrained lesson WebView, and ambiguous legacy Android reinstall path make related workflows feel unrelated and can leave legacy users unable to complete build 47 installation.

The approved interactive design establishes a shared red/navy mobile grammar while preserving backend authority, routes, academic procedures, secure preview sessions, and role ownership. The signer investigation also proves that builds 46 and earlier require a one-time external-download/uninstall/reinstall flow rather than the ordinary in-app installer.

## What Changes

- Introduce one role-neutral mobile interface system for navy app bars, red primary intent, shared action variants, accessible overflow actions, segmented content tabs, filter triggers/sheets, score states, and consistent spacing.
- Adapt teacher, student, and admin presentation primitives to the shared system so existing consumers converge without changing their domain behavior.
- Replace record-filter pill rows with the shared compact filter trigger and bottom sheet; retain segmented controls only for persistent content modes.
- Redesign Teacher Home, Notification Center, Module Detail, Lesson Preview, Assessment List, Assessment Detail, and Submission Review to match the approved HTML hierarchy.
- Remove the phone lesson Compare mode, preserve truthful native Mobile and secure Web preview modes, and give the WebView a dedicated scroll owner.
- Add visible assessment search and bounded client-side display pagination while retaining the current complete server-page aggregation and backend contracts.
- Make question analytics rows interactive using the existing correctness, option-distribution, average-points, and text-answer contract; do not expose unsupported learner identities.
- **BREAKING (mobile presentation contract):** replace repeated visible “Manage item/section” text controls with labeled 44 px overflow actions and action sheets.
- **BREAKING (mobile presentation contract):** remove the lesson Compare preview mode on phone.
- Route build 46-or-earlier signer migration through the immutable HTTPS APK in the external browser/download manager, with explicit sync/data-loss/reinstall steps; keep build 47+ on the verified in-app update path.
- Package, sign, publish, and verify the next Android APK using the existing production certificate and release pipeline.

## Capabilities

### New Capabilities

- `mobile-interface-system`: Shared app-bar, action, filter, tab, overflow, score, and semantic color behavior across teacher, student, and admin mobile roles.
- `mobile-teacher-workspace-modernization`: Approved task-first layouts and interactions for the named teacher home, notification, module, lesson, assessment, analytics, and submission-review flows.
- `android-legacy-signer-migration`: Truthful and survivable external-download reinstall guidance for legacy debug-signed builds while preserving normal production-signed updates.

### Modified Capabilities

- None in the archived main specification set. The active `align-mobile-with-web-contracts` change contains two conflicting presentation requirements; its `mobile-teacher-tooling-parity` delta will be reconciled before implementation.

## Impact

- Mobile presentation owners under `mobile/src/theme`, `mobile/src/components/ui`, and role primitive directories.
- Named teacher screens and the shared notification inbox under `mobile/src/screens`.
- Existing mobile Jest presentation, contract, and updater suites plus new shared-component coverage.
- Android update provider behavior and copy; no backend API, database schema, or academic-policy change.
- OpenSpec parity requirement reconciliation for lesson preview modes and module action discoverability.
- Android release metadata, immutable APK artifact, checksums, public manifest, GitHub CI, and Railway-delivered download surface.
