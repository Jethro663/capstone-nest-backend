## Context

Nexora mobile already exposes the required teacher workflows, but presentation ownership is fragmented across role themes, role primitives, and screen-local controls. The approved interactive HTML preview establishes the desired hierarchy: dark navy structure, red intent, white reading surfaces, compact contextual information, one filter interaction, and a small action hierarchy. The implementation must preserve the existing backend `/api` contracts, RBAC, academic procedures, routes, secure lesson-preview credential, complete assessment pagination, and role-specific domain behavior.

Two active parity requirements conflict with the approved design. The existing lesson preview requires a three-way Mobile/Web/Compare selector even though Compare constrains the WebView and duplicates content. The existing module requirement forbids ellipsis-only discovery and requires visible Manage text, while the approved design uses accessible 44 px overflow controls to reduce visual noise. Those requirements are reconciled as part of this change rather than silently violated.

The Android update incident is independent of the visual redesign but blocks adoption. Builds 46 and earlier use a different signing certificate from build 47. Android therefore rejects an in-place update even though the package name matches. The existing updater identifies this legacy boundary, but its ordinary download service stores the APK in the Expo app-private cache; uninstalling the legacy app can remove that file. The one-time migration must hand the immutable HTTPS artifact to the system browser/download manager before the user uninstalls the old app.

## Goals / Non-Goals

**Goals**

- Establish one semantic mobile interface system shared by teacher, student, and admin presentation wrappers.
- Match the approved HTML preview on the named teacher workflows without changing their routes or backend behavior.
- Use navy for structure and navigation, red for primary intent and urgency, and neutral white/gray surfaces for readable content.
- Replace record-filter chip rows with one reusable filter trigger and bottom-sheet selector while keeping segmented tabs for persistent content modes.
- Make assessment overview, analytics, and submission review scannable and interactive using data the backend already provides.
- Provide a truthful, survivable update path for legacy debug-signed Android builds and preserve the verified in-app path for production-signed builds.
- Ship a production-signed APK with automated verification and explicit physical-device evidence boundaries.

**Non-Goals**

- No backend API, database schema, RBAC, grading, academic-policy, or notification-delivery changes.
- No app-wide dark mode and no navy content canvas; navy is a structural brand color.
- No invented analytics, learner identity disclosure, or client-derived official totals.
- No replacement of every `Pressable`; navigation rows, cards, icon controls, and content tabs retain their appropriate interaction semantics.
- No redesign of unrelated web pages.

## Decisions

### 1. Semantic brand roles replace screen-owned colors

A role-neutral token layer will define structural navy (`#0C1D3A`), action red (`#DC2626`), white surfaces, neutral canvas, borders, text roles, success/warning/danger states, radii, shadows, and spacing. Existing teacher, student, and admin themes will map their public names to these roles so callers converge incrementally without a broad import rewrite.

**Why:** a semantic layer makes the design consistent while preserving stable role-component APIs and minimizing regression risk.

### 2. Shared primitives are adopted through compatibility wrappers

The shared layer will own the app bar, action variants, filter trigger/sheet, segmented tabs, accessible overflow action, and score state. Existing role primitives will delegate to the shared implementation and retain their current domain-facing props where practical.

**Why:** changing every consumer directly would create unnecessary churn. Compatibility wrappers let the app converge centrally and allow focused screen migrations where hierarchy needs to change.

### 3. Filters and content modes remain distinct concepts

Record filters use one compact, labeled trigger showing the active choice and opening a bottom sheet with single-select options, reset behavior where applicable, accessibility state, and a minimum 44 px target. Persistent content modes such as Overview/Submissions/Analytics or Mobile/Web use a segmented control. A horizontal row of filter pills is not an allowed record-filter pattern.

**Why:** the interaction stays predictable and space-efficient without misusing tabs for ephemeral query criteria.

### 4. The app bar becomes the only page-title owner

Named screens use the shared navy app bar with one title, optional back action, and compact right-side actions. Redundant context strips, kicker labels, and duplicate page-name cards immediately beneath the app bar are removed. Context remains in content only when it changes the task decision, such as lock state or assessment status.

**Why:** this restores vertical space and creates a stable visual anchor across roles.

### 5. Teacher workspaces follow task-first hierarchy

- **Home:** greeting and role context, a navy Next Up card, compact attention items, and today's agenda.
- **Notifications:** compact summary counts in the header region, no descriptive paragraph, search/filter through the shared selector, and readable grouped rows.
- **Module detail:** outline-first layout; lock context and Settings remain visible; per-item management moves to a labeled 44 px overflow action sheet; arrange mode remains explicit.
- **Lesson preview:** Mobile and Web modes only. Mobile uses the shared native renderer; Web uses the secure preview URL in a WebView with one dedicated vertical scroll owner.
- **Assessments:** no duplicate context strip; search, shared filter selector, and visible bounded display pagination over the already complete aggregated result.
- **Assessment detail:** scannable status/metric summary, submissions with shared filters and score states, and tappable analytics rows that open question details based on existing aggregates.
- **Submission review:** sticky score/control region, compact question navigator, prominent learner answer and correct answer, and explicit scoring controls rather than summary-card clutter.

### 6. Analytics drill-down uses the existing contract only

Question detail can show correct/incorrect counts, correctness percentage, average points, option distribution, and text-answer samples already returned by the backend. It will not show learner names for individual choices because that relationship is not in the current contract.

**Why:** the feature becomes actionable without weakening backend authority or fabricating precision.

### 7. Assessment pagination is visible but contract-preserving

The screen continues to aggregate all server pages through the existing query contract. Search and status/type filters apply to that complete client result, and the visible list is sliced into bounded display pages with page position and next/previous controls. Filter or search changes reset the display page to one.

**Why:** users get predictable navigation without accidentally treating one server page as the complete official result.

### 8. Legacy signer migration uses an external durable download

When `currentVersionCode <= 46` and the available release is `>= 47`, the updater will not invoke the normal app-private cache/install flow. It will present an explicit one-time migration and open the immutable HTTPS APK URL in the system browser/download manager. The sequence is: confirm synced work and credentials, download outside the app, uninstall the old build, install the downloaded APK, sign in, and confirm the new version. Builds 47 and later retain the ordinary checksum-verified in-app update path.

**Why:** Android cannot accept the new signer in place, and an APK stored in app-private cache is not a safe uninstall/reinstall handoff.

### 9. Verification follows risk boundaries

Each shared component and workflow change starts with a failing focused Jest test. Verification expands through mobile typecheck, all mobile tests, Expo production export, release preparation/verification, APK signing certificate/hash inspection, exact-SHA CI, deployment/artifact checks, and finally a documented physical-device acceptance boundary.

## Alternatives Considered

- **Full navy dark theme:** rejected because dense academic content needs high-contrast white reading surfaces and the user asked for navy contrast, not a dark-mode conversion.
- **Keep role-specific component systems:** rejected because it preserves the inconsistency that caused the redesign.
- **Replace all pressables automatically:** rejected because it would conflate buttons with rows, tabs, cards, and navigation affordances.
- **Keep Compare preview:** rejected because it duplicates two renderers in constrained phone space and prevents a reliable scroll owner.
- **Download the legacy APK into the app cache:** rejected because uninstalling the legacy app can delete the handoff artifact.
- **Expose per-learner analytics without a contract change:** rejected because the current API does not authorize or provide that mapping.

## Risks / Trade-offs

- Central wrapper changes can affect many screens. Mitigation: preserve public props, add shared primitive tests, and migrate high-risk screens in bounded stages.
- Navy app bars can reduce readability if status-bar and icon colors are not coordinated. Mitigation: centralize safe-area/status-bar behavior and test accessibility labels and contrast roles.
- A bottom sheet adds one tap compared with visible chips. Mitigation: keep the active value visible, use sensible defaults, and make the sheet fast and accessible.
- Client display pagination adds local state. Mitigation: derive it from the complete query result, reset on filters, and test boundary pages.
- External legacy installation is more manual. Mitigation: use numbered steps, an immutable artifact, explicit data warnings, and never claim success until the new build reports its version.
- Physical-device installation cannot be proven by unit tests. Mitigation: separate artifact/signature evidence from device acceptance and document the remaining gate honestly.

## Migration Plan

1. Reconcile the conflicting active parity delta and validate both OpenSpec changes.
2. Add semantic tokens and shared primitives behind tests.
3. Adapt role wrappers, then migrate the named teacher screens in small test-driven slices.
4. Add the external legacy signer-migration path and regression coverage while preserving build 47+ behavior.
5. Run the full mobile verification matrix and production Android export.
6. Bump and prepare the release through the existing scripts, verify certificate/hash/manifest continuity, commit, push, observe exact-SHA CI/deployment, and publish the artifact through the existing release path.
7. Record physical-device update/reinstall acceptance separately; do not present package evidence as device proof.

**Rollback:** revert the mobile presentation commit to restore the previous wrappers and screens. If the release artifact fails verification, do not publish it; retain the last known-good manifest/artifact. The backend requires no rollback because this change does not alter backend contracts or data.

## Open Questions

- No design question blocks implementation. The only unavoidable post-build evidence item is installation and authenticated workflow confirmation on a physical Android device.
