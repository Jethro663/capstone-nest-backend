# Safe Admin Demo Mode Design

## Outcome

Nexora gains an administrator-only Demo mode that can be activated from System Settings for a short, explicit time window. While active, administrators can exercise the system quickly for demonstrations by relaxing a documented set of business-workflow locks. Turning the mode off, or allowing it to expire, immediately restores the normal policy behavior because no client can choose the mode and no normal safeguard is deleted.

Demo mode is not a database-integrity bypass. Authentication, role boundaries, input validation, unique identities, audit history, transaction locks, finalized academic evidence, grade-score invariants, evidence-aware permanent deletion, and self-account protection always remain enforced.

## Authority and scope

- Phase 1 is planning and solution creation. This document and the companion implementation plan are review artifacts, not production implementation.
- Phase 2 is already authorized by the user: implementation, tests, affected Android packaging, commit, push, configured deployment, and live verification may proceed in the current `developement` checkout after the plan is self-reviewed.
- Web and the shared Expo mobile application are included for the administrator role.
- Teacher and student behavior is unchanged. Demo mode never grants a non-admin an admin capability.
- AI-service behavior, public authentication, learner scoring math, iOS build numbering, and unrelated visual redesigns are excluded.

## Current-state findings

### Confirmed

- The backend has no durable general-purpose System Settings table. Academic state is stored separately, while governed lifecycle execution is controlled by the deployment variable `ADMIN_LIFECYCLE_ENABLED`.
- Admin CRUD is distributed across Users, Classes, Sections, Roster Import, Assessments, Academic State, Announcements, Class Templates, and the governed Admin Lifecycle module.
- Many apparent safeguards protect different concerns and cannot safely be represented by one unconditional `if (demo) return` statement.
- Users already carry actor identity into admin mutations. Class and section mutations carry actor ID and roles. Assessment mutations carry the current user. This permits a server-owned admin-only policy decision without accepting a client-provided `demo=true` flag.
- `@AcademicMutation()` serializes sensitive academic writes. This is a concurrency and integrity mechanism and must remain active in Demo mode.
- Class creation generates a draft class record immediately. Consequently, the current class identity guard normally prevents later year, section, subject, or grade reassignment even when the workbook has no results.
- Class and section archival already contain safe cascading status updates after their guards: class archival completes the target class memberships, and section archival completes section memberships and archives linked classes.
- Governed Admin Lifecycle already provides preview, manifest freshness, step-up password, atomic execution, audit, notifications, idempotency, and evidence-aware purge. Demo mode should compose with this system, not replace it.
- Web System Settings is route-backed. Mobile System Settings is a stack flow entered from the admin drawer destination and uses shared admin primitives.
- Web class creation locks the school year to current state and disables conflicting teacher, subject, room, and schedule options. Mobile forms expose more values directly but rely on backend validation.

### Reported

- Presentation preparation is slowed by the number of admin workflow safeguards.
- The desired experience is one activation in System Settings, followed by broad administrator control until the mode is disabled.

### Inferred and resolved

- “All safeguards disabled” means presentation-blocking business/workflow restrictions, not authentication, referential integrity, audit, evidence preservation, or validation. Removing those permanent protections would contradict the requirement that the mode turn off cleanly without leaving the system broken.
- The mode is global to the Nexora installation, but its relaxed behavior is available only when the acting request is authenticated as an administrator.
- Because the user explicitly delegated judgments while away and authorized Phase 2, the recommended direction is treated as selected after inline self-review; no additional approval pause is required.

## Conflict ledger

| Conflict | Why a literal bypass fails | Resolution |
|---|---|---|
| Reversibility versus corrupted data | Turning a flag off cannot repair orphaned rows, overwritten scores, or deleted evidence. | Relax only catalogued business rules; keep structural and historical invariants permanent. |
| Global switch versus actor scope | A global boolean checked without the actor could accidentally relax teacher, student, worker, or scheduled-job behavior. | Every policy decision requires both an effective active state and an authenticated admin actor. |
| Client convenience versus authority | A request field or header such as `demo=true` can be forged or drift across clients. | The backend reads one durable state row; clients only display and activate/deactivate it. |
| “One click” versus activation safety | A casual toggle can leave production in an unsafe state. | Use password step-up, exact typed phrase, reason, acknowledgements, optimistic version, bounded duration, and deployment availability gate. |
| Time limit versus stale UI | A client countdown can be wrong or paused. | The backend calculates effectiveness from server time and `expiresAt`; clients render the server state and refetch on focus. |
| Broad control versus auditability | Silent bypasses are impossible to explain during a defense or incident. | Activation, deactivation, and each relaxed mutation record mode version and bypassed rule codes in audit metadata. |
| Existing lifecycle engine versus bypass | Skipping manifest and atomic lifecycle code would recreate bugs already solved by the governed lifecycle feature. | Demo mode may allow lifecycle execution when the operational flag is unavailable, but it does not remove evidence-aware purge or atomic application. |
| Web/mobile parity versus duplicated policy | Reimplementing rules in two clients will drift. | Clients consume one status contract and use UI hints only; backend policy remains authoritative. |

## Decision ledger

### Keep

- Existing red/white GABHS identity, admin route hierarchy, focused System Settings pages, and mobile grouped drawer.
- Existing API response envelope, JWT/RBAC behavior, password storage, secure mobile token storage, audit service, academic transaction lock, and React Query invalidation patterns.
- Existing class/section/user lifecycle actions and governed lifecycle review for permanent or evidence-bearing operations.
- Existing form validation for required fields and backend-provided academic periods.

### Change

- Add a durable, versioned, auto-expiring Demo mode state and admin-only activation API.
- Add a System Settings destination on web and mobile with deliberate activation and immediate deactivation.
- Add a compact active-mode banner to all admin web/mobile workspaces.
- Relax only the rules in the first-release capability catalog when the current actor is an administrator.
- Let affected admin forms expose options that the backend now permits instead of continuing to disable them locally.
- Mark mutation audit entries with the active mode version and bypassed rule codes.

### Frozen

- Non-admin permissions and route gates.
- Email, LRN, and domain-identity uniqueness.
- Referential integrity, required foreign keys, server DTO validation, rich-text sanitization, file limits, and malware/content boundaries already present.
- Self-suspend, self-delete, and self-purge restrictions.
- Finalized/locked class records, assessment attempts, returned grades, append-only lifecycle events, and evidence-aware purge blockers.
- Grade score and percentage caps.
- `@AcademicMutation()` locking and transaction boundaries.
- AI remains assistive and cannot write official records.
- Android and iOS version paths remain isolated.

### Resolved unknowns

- Activation durations are 15, 30, 60, or 120 minutes; default is 30 minutes.
- Availability requires `ADMIN_DEMO_MODE_AVAILABLE=true`; it defaults to false.
- Activation requires current password, exact phrase `ENABLE DEMO MODE`, a 10-240 character reason, all three acknowledgements, and the latest state version.
- Deactivation is admin-only and requires the exact phrase `DISABLE DEMO MODE` plus the latest state version, but no password. Removing risk must remain easier than creating it.
- Expiry is authoritative on the server. No scheduler is required for correctness.
- There is one global mode state for the installation, not one state per administrator.

## Directions considered

### Direction A: Raw global bypass

Add one boolean and skip every guard whenever it is true. This is the smallest code diff but conflates permission checks, business policy, consistency, history, and security. It can create records that normal code cannot read or repair and can let background work bypass rules without an admin actor. Rejected.

### Direction B: Bounded capability window — selected

Add one durable mode state plus an explicit server-owned rule catalog. Each affected service asks whether a named rule is relaxed for the acting administrator. Business locks that only constrain presentation setup may be skipped, while permanent invariants remain. This is more implementation work than Direction A but is reversible, testable, auditable, and compatible with the current architecture.

### Direction C: Isolated demo installation/database

Create a separate deployment and database seeded specifically for demonstrations. This gives the strongest isolation and may be a valuable later phase, but it changes deployment topology, authentication, secrets, data refresh, uploads, and release operations. It does not satisfy the requested in-product System Settings activation in one release. Deferred.

## Architecture

### 1. Durable state and availability

Create a singleton `admin_demo_mode_states` row with a fixed UUID and these fields:

- `enabled`
- `expires_at`
- `reason`
- `activated_by`
- `activated_at`
- `deactivated_by`
- `deactivated_at`
- `version`
- `updated_at`

The effective state is active only when all of these are true:

1. `ADMIN_DEMO_MODE_AVAILABLE` is exactly `true`.
2. The persisted row is enabled.
3. `expires_at` is later than backend server time.
4. The current mutation actor holds the administrator role.

The persisted `enabled` field may remain true after expiry. Every read and policy decision derives `state: expired` and `active: false` from server time, so safety never depends on a cleanup job. A later deactivate or activate action advances the optimistic version.

### 2. Backend module boundary

A global `AdminDemoModeModule` owns:

- `AdminDemoModeController`: admin-only status, activation, and deactivation endpoints.
- `AdminDemoModeService`: state reads, password verification, optimistic activation/deactivation, audit, and actor-scoped policy resolution.
- `AdminDemoModePolicy`: immutable relaxed/protected rule summaries and the typed internal rule codes.

Feature services inject this global service and evaluate named rules. They never read environment variables or the state table directly.

### 3. HTTP contract

All responses retain the existing `{ success, message, data }` envelope.

#### `GET /api/admin/demo-mode`

Returns:

```ts
type AdminDemoModeStatus = {
  available: boolean;
  active: boolean;
  state: 'unavailable' | 'disabled' | 'active' | 'expired';
  version: number;
  serverTime: string;
  activatedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
  activatedBy: { id: string; displayName: string } | null;
  relaxedRules: DemoModeRuleSummary[];
  protectedRules: DemoModeRuleSummary[];
};
```

#### `POST /api/admin/demo-mode/activate`

Consumes:

```ts
type ActivateAdminDemoMode = {
  currentPassword: string;
  confirmation: 'ENABLE DEMO MODE';
  reason: string;
  durationMinutes: 15 | 30 | 60 | 120;
  expectedVersion: number;
  acknowledgements: [
    'SHARED_DATA_CAN_CHANGE',
    'ACTIONS_REMAIN_AUDITED',
    'HARD_SAFEGUARDS_REMAIN',
  ];
};
```

It returns the updated status. Wrong password is `403`; unavailable mode is `503`; stale version is `409`; malformed acknowledgement, reason, duration, or phrase is `400`.

#### `POST /api/admin/demo-mode/deactivate`

Consumes:

```ts
type DeactivateAdminDemoMode = {
  confirmation: 'DISABLE DEMO MODE';
  expectedVersion: number;
};
```

It is allowed even when the deployment availability gate has been switched off. It returns the updated disabled status.

### 4. First-release relaxed-rule catalog

| Rule code | Normal behavior | Demo-mode behavior for an admin | Permanent boundary |
|---|---|---|---|
| `user_lifecycle_sequence` | Account must be suspended before archive; only suspended accounts reactivate. | A non-self account may be archived directly from pending/active/suspended and may be restored from suspended/deleted. | Self-action protection, role validity, archive/audit, and purge prerequisites remain. |
| `class_membership_window` | Enrollment changes require an active class in the active school year. | Admin may add/remove membership on an inactive or historical class. | Student identity, section membership, grade compatibility, duplicates, and class-record capture remain. |
| `section_membership_window` | Roster changes require an active section in the active school year. | Admin may add/remove on an inactive or historical section. | Student role, grade compatibility, graduation, duplicate membership, and cross-section reconciliation remain. |
| `section_capacity` | Adds and capacity reductions cannot exceed headcount. | Admin may overbook or set a lower display capacity. | Capacity remains a positive integer and the overbooked state is visible. |
| `schedule_collision` | Teacher, room, or section schedule overlap blocks save. | Admin may save an overlap after Demo mode is active. | Time shape, start-before-end, required schedule, and audit remain. |
| `room_adviser_exclusivity` | An active room or adviser can belong to one section. | Admin may reuse them for presentation data. | Referenced room/adviser must remain valid and teacher role remains required. |
| `archive_active_memberships` | Active class/section memberships block archival. | Existing transactional archival closes affected active memberships and archives the target. | Prior results, events, teacher/adviser identity, audit, and referential integrity remain. |
| `restore_archived_class` | Archived classes are terminal. | Admin may restore the class shell without restoring completed memberships. | Re-enrollment remains explicit; deleted evidence is not recreated. |
| `admin_academic_window` | Admin assessment preparation, release, or grading follows active year/period. | Admin-only writes may cross the active academic window. | Period must exist in policy; student start/view/complete rules, workbook status, attempts, score invariants, and publication readiness remain. |
| `governed_execution_availability` | Lifecycle execution requires `ADMIN_LIFECYCLE_ENABLED=true`. | An active Demo mode satisfies the execution-availability gate. | Preview hash, expiry, password, confirmations, atomicity, idempotency, blockers, audit, and evidence-aware purge remain. |

### 5. Explicitly protected-rule catalog

- `authentication_and_rbac`
- `self_account_protection`
- `dto_and_content_validation`
- `unique_user_and_academic_identity`
- `referential_integrity`
- `academic_transaction_lock`
- `finalized_and_locked_workbooks`
- `attempt_and_returned_grade_history`
- `score_and_percentage_invariants`
- `append_only_lifecycle_and_audit`
- `evidence_aware_permanent_deletion`
- `ai_non_authority`

These codes and plain-language descriptions are returned to the clients so the UI never claims “everything is unrestricted.”

### 6. Audit behavior

Activation records `admin.demo_mode.activated` with duration, expiry, reason, prior version, and new version. Deactivation records `admin.demo_mode.deactivated` with whether the prior state was active or expired.

Every mutation that actually skips a rule adds:

```json
{
  "demoMode": {
    "version": 4,
    "expiresAt": "2026-09-12T12:30:00.000Z",
    "bypassedRules": ["section_capacity"]
  }
}
```

No password, token, or full student dataset is stored in audit metadata.

## Web experience

### Entry and hierarchy

Add `Demo mode` under the System Settings `Advanced` group at `/dashboard/admin/system-settings/demo-mode`. Keep System Settings as the only sidebar destination. The page title asks one question: “Should this installation temporarily relax admin workflow restrictions?”

When inactive, the page shows:

1. A plain-language explanation.
2. “Relaxed while active” and “Always protected” lists.
3. Duration, reason, three acknowledgements, password, and exact phrase.
4. One primary `Activate Demo mode` action.

When active, it shows the backend-derived expiry/countdown, activating administrator and reason, relaxed/protected lists, and one `Disable now` action. It does not repeat activation fields.

A compact amber strip appears above every admin page while active: `Demo mode active · <time remaining> · Admin workflow restrictions are relaxed`, with a `Manage` link. It is not shown to teachers or students and does not replace mutation-specific confirmation copy.

### Web form behavior

- Class and section forms read the shared status.
- Conflicting schedule, room, adviser, and assigned-option indicators remain visible but become selectable when the matching rule is relaxed.
- Current-year locking is removed only where the backend permits historical admin operations; the selected class year must still match its section year.
- A short field-level note says the conflict is allowed because Demo mode is active.
- Permanent constraints remain disabled with their existing reason.

## Mobile experience

Add `AdminSettingsDemoMode` to the native admin stack and a `Demo mode` row to the System Settings overview. The route is pushed from the overview; header Back and Android Back pop to the actual source. A direct stack entry falls back to the existing System Settings root behavior.

Use the same state hierarchy as web, adapted to `AdminScreen`, `AdminSection`, `AdminNotice`, `AdminField`, `AdminChip`, and `AdminButton`. Keyboard avoidance, safe areas, pull-to-refresh, and offline handling follow the existing admin primitives.

A compact amber notice appears in both `AdminScreen` and `AdminPaginatedList` when active, covering the complete mobile admin workspace without editing every screen. The status query is shared through React Query.

Offline clients may display a cached active state labeled `Cached`; activation, deactivation, and all normal admin writes remain disabled offline and are never queued.

## Navigation contract

| Surface | Entry | Forward exit | Back behavior | State retained | Guard/fallback |
|---|---|---|---|---|---|
| Web settings overview | Admin sidebar, direct URL | Demo mode route | Browser history/previous route | Existing page state only | Dashboard admin role gate |
| Web Demo mode | Settings navigation, active banner, direct URL | No child route | Browser Back to actual source; direct entry remains inside settings shell | Form state until navigation/refresh | Admin role; API unavailable/error states inline |
| Mobile settings overview | Admin drawer | Demo mode stack screen | Drawer-root behavior | Query cache | Admin navigator only |
| Mobile Demo mode | Settings row | No child route | Header/hardware Back pops to settings overview or actual source | Form state while mounted | Admin stack; offline writes disabled |
| Active banner/notice | Any admin workspace | Manage Demo mode | Normal route push; returning restores source list/filter/scroll behavior | Existing navigator behavior | Hidden for non-admin and inactive/expired mode |

## State matrix

| State | Web/mobile behavior |
|---|---|
| Loading | Small skeleton/status text; activation controls are not rendered prematurely. |
| Disabled and available | Full activation explanation and validated form. |
| Disabled and unavailable | Read-only explanation that deployment configuration must enable the feature; no activation button. |
| Active | Countdown/status, actor/reason, capability lists, immediate deactivation. |
| Expired | Explicit expiry notice and fresh activation form using the returned current version. |
| Stale optimistic version | Keep entered form values, refetch status, and require review against the new state. |
| Wrong password | Clear field-level step-up error; never log or retain the password. |
| Network/server error | Retry status action; no assumption that the mode is inactive. |
| Offline mobile | Cached label when available; activation/deactivation and mutations disabled. |
| Long reason/content | Wrap text without horizontal scroll; cap inputs through DTO and client counter. |
| Reduced motion | No countdown animation or pulsing banner; text updates only. |

## Contract-impact map

### New public admin contract

- Backend DTOs and controller for status/activate/deactivate.
- Web type/service/context consumer.
- Mobile type/service/query consumer.

### Existing HTTP contracts preserved

- User, class, section, roster, assessment, academic-state, and lifecycle request/response shapes stay unchanged.
- The `{ success, message, data }` envelope stays unchanged.
- Existing clients that do not know Demo mode continue to work; their requests receive normal or relaxed behavior based only on server state and authenticated actor.

### Internal signature changes

- Feature services accept or derive an actor-scoped Demo policy context where actor roles are already available.
- Academic policy checks receive optional actor context for admin write actions.
- Audit calls accept additional metadata only; audit table shape is unchanged.

## Failure handling and rollback

- If the mode-state row is missing, status is disabled version 0.
- If state lookup fails during a mutation, fail closed and enforce normal safeguards.
- If expiry passes between a UI action and the backend mutation, the backend enforces normal behavior and returns the existing business error.
- If activation/deactivation races, the stale `expectedVersion` request receives `409` and cannot overwrite the newer state.
- Deployment rollback first sets `ADMIN_DEMO_MODE_AVAILABLE=false`. Effective policy immediately becomes normal even if the state row says enabled.
- The additive table and audit entries remain after rollback; no destructive down migration is required.

## Verification contract

### Backend

- Unit tests for availability parsing, state derivation, exact validation, password failure, optimistic races, activation, deactivation, expiry, admin-only policy, fail-closed reads, and audit metadata.
- Focused service tests prove every catalogued rule is relaxed only for an active admin and every protected boundary still rejects.
- E2E proves non-admin rejection, response envelope, activation expiry, deactivation, and at least one relaxed class/section mutation.
- Fresh PostgreSQL 16/18 migration/runtime checks must include migration `0021`.

### Web

- Service and provider tests for contract mapping, focus refresh, countdown, active/expired/unavailable states, and mutation refresh.
- Route tests for activation validation, password error, stale refresh, deactivation, responsive settings navigation, and accessibility labels.
- Form tests prove conflict options are enabled only when their named capability is active.
- Browser checks cover desktop and a 390px viewport.

### Mobile

- Typecheck and Jest tests for service contract, settings navigation, offline behavior, activation/deactivation states, Back behavior, and shared active notice in both admin primitives.
- Android release build and release-verification scripts run because mobile source changes.
- If an emulator/device is available, install the exact APK, log in as admin, verify activation/banner/deactivation, and record the boundary separately from build evidence.

### Release and live acceptance

- Clean scoped diff, `git diff --check`, complete repository-required backend/web/mobile gates, and migration rehearsals.
- One reviewed commit series on `developement`; exact local/remote SHA equality and `0 0` divergence.
- Exact-SHA GitHub Actions success and exact-SHA Railway backend/frontend deployment success.
- `ADMIN_DEMO_MODE_AVAILABLE=true` in the backend production environment only after the migration and healthy deployment are confirmed.
- Authenticated production browser verification with the supplied admin account: status load, guarded activation, active banner, one non-destructive relaxed-control observation, immediate deactivation, and final disabled status.
- Live Android manifest/APK size, checksum, version, and update-policy registration agree. Device/emulator evidence is reported separately and never inferred.

## Acceptance criteria

1. A non-admin cannot read, activate, deactivate, or benefit from Demo mode.
2. An admin cannot activate it without every activation validation.
3. The backend automatically treats an expired state as inactive.
4. Normal safeguards immediately apply when disabled/expired without a redeploy.
5. Every relaxed rule has a focused regression test and audit evidence.
6. Every protected rule remains enforced under an active Demo mode test.
7. Web and mobile show the same backend state and a persistent admin-only active notice.
8. Existing mutation envelopes and clients remain compatible.
9. Production acceptance ends with Demo mode disabled.
10. CI, deployment, APK, and live checks are tied to the exact pushed revision.

## Open questions

None. The first-release decisions are fixed above. New source or runtime evidence may narrow a relaxation, but may not add an unreviewed bypass or weaken a protected rule.
