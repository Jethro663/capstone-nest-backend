# Maintenance Access Switch-Mode Isolation Analysis

**Date:** 2026-09-14

**Repository baseline:** `developement` at `15828cdef19c1b9648437be5125e95fd399c3607`, equal to `origin/developement` at inspection time.

**Method:** static adaptive-depth dependency, state, security, client-contract, and test analysis plus targeted read-only tests. No application code, configuration, schema, data, deployment, or Git history was changed.

**Decision being prepared:** replace the fixed 15-minute Maintenance Access window with an administrator-controlled ON/OFF switch without turning Maintenance Access into a global or permanent unrevokable bypass.

**Scope assumption:** “switch mode” means access remains ON for the administrator account until that administrator turns it OFF or a security revocation event occurs. It does **not** mean removing the server-owned rule catalog, irreversible-action previews, stale-manifest checks, authentication, role checks, database integrity, or audit requirements.

## Evidence vocabulary

- **Confirmed** — directly supported by inspected current source, schema, tests, contracts, or repository documentation.
- **Inferred** — a consequence strongly implied by confirmed relationships but not executed against a live deployment or database.
- **Unverified** — requires deployed configuration, runtime state, installed-client inventory, or a product decision outside this analysis.
- Effects are classified as **direct**, **transitive**, **operational**, **stateful**, **security-sensitive**, **dormant**, or **uncertain**.

## 1. Executive verdict

### Verdict

**The change is feasible, but it is not a button-only change. — Confirmed.** The current page already has manual open and close actions. The 15-minute boundary is enforced independently by backend configuration, service policy, a non-null database expiry, client countdown logic, audit metadata, tests, and the web/mobile contract. Changing only the visible control to a switch would still expire after 15 minutes.

**Coupling: Medium-high. — Confirmed.** One small backend module owns the capability, but its decision is consumed by six backend domains, the governed lifecycle and cascade-erasure paths, the entire web admin shell, multiple web forms/pages, and the mobile admin client. System Reset also clears the persisted state.

**Recommended target:** an **account-bound manual switch**, not a school-wide/global switch and not a client-side bypass. Turning ON should retain the current password step-up, reason, acknowledgements, fixed server scopes, audit, and visible warning. Turning OFF should take effect immediately. ON remains effective until explicit OFF or a security revocation event: logout, logout-all, password change/reset, account deactivation, email-verification loss, Admin-role loss, session-version change, or Full Reset.

**Required prerequisite:** add a reliable elevated-access revocation seam before removing the expiry. The current row is keyed to `actorUserId` and a durable `users.sessionVersion`; it is not tied to one browser, refresh token, or mobile login. Ordinary logout only revokes a refresh token, password changes only replace the password hash, and the inspected source increments `session_version` only during Full Reset. Therefore, an expiry-free row would currently survive logout and password changes and would be usable after the same account signs in again. — Confirmed from `AdminMaintenanceService`, `AuthService.logout`, `UsersService.updatePassword`, `TokenService.revokeAllForUser`, and `system-reset.database.ts`.

### Recommendation boundary

| Decision | Verdict | Reason |
|---|---|---|
| Replace the 15-minute expiry with explicit ON/OFF | **Proceed to planning** | Removes the arbitrary work interruption while preserving a visible, deliberate maintenance state. |
| Keep the switch per administrator account | **Required** | Existing policy resolves by actor identity; a global mode would grant relaxed rules to unrelated admins and devices. |
| Make one click silently enable it | **Reject** | ON is a step-up capability used by purge, historical correction, roster, schedule, and lifecycle paths. Keep password, reason, and acknowledgements when switching ON. |
| Make OFF immediate | **Recommended** | Closing access restores stricter behavior and is safe to retry; it does not need destructive-action friction. |
| Keep `ADMIN_MAINTENANCE_ENABLED` | **Required** | This is the deployment kill switch/availability boundary, not the administrator’s ON/OFF state. |
| Remove lifecycle/reset preview expiry too | **Out of scope / reject** | Five-minute manifests prevent executing a stale impact set. They are freshness evidence, not the Maintenance Access authorization timer. |
| Remove protected-rule checks | **Out of scope** | That would be a separate authority-policy change, not a switch-mode conversion. |

### Alternatives considered

1. **Recommended: account-bound manual switch with security-event revocation.** This fits the existing table, endpoints, Admin role model, and same-account semantics with bounded changes. It requires a schema/contract migration and explicit auth revocation hooks.
2. **Stronger but larger: login-instance-bound switch.** Add a stable authentication-session identifier to access tokens and Maintenance rows so one browser/device cannot share another login’s switch. This is cleaner security isolation but expands JWT issuance, refresh, web, mobile, and logout contracts. It is not the smallest change for the current deadline.
3. **Rejected: global school switch or very distant expiry.** A global switch recreates the retired Demo Mode authority problem. A far-future timestamp only disguises an indefinite switch as an expiry and leaves misleading countdown/audit semantics.

### What the switch will and will not solve

The switch will stop Maintenance Access from closing in the middle of a sequence of valid administrator corrections. It will keep approved exceptions available across classes, sections, roster, accounts, academic-window corrections, governed lifecycle, and cascade erasure until OFF.

It will **not** make every admin mutation unrestricted. Maintenance Access currently allows only named rules such as capacity, schedule collision, room/adviser reuse, inactive membership work, historical archive/restore, lifecycle execution, and reviewed cascade erasure. Authentication, self-account protection, validation, referential integrity, transaction locks, finalized workbooks, attempt/grade history, score invariants, audit/lifecycle evidence, and ordinary evidence-aware deletion remain protected. If “freely do things” means removing those boundaries too, that is a separate, materially larger policy decision.

## 2. Feature anatomy

### 2.1 Current control flow

```text
Admin web or mobile
        |
        +-- GET /api/admin/maintenance/session ---- status
        |
        +-- POST /api/admin/maintenance/session
        |       password + reason + exact phrase + acknowledgements
        |                   |
        |                   v
        |       AdminMaintenanceService.open
        |       revoke prior ACTIVE row for actor
        |       insert ACTIVE row with expiresAt = now + 15 minutes
        |       audit ADMIN_MAINTENANCE_OPENED
        |
        +-- DELETE /api/admin/maintenance/session -- close + audit
                            |
                            v
               resolveForActor / requireActiveSession
                            |
           named server-owned rule checks in domain services
                            |
               mutation audit links the session and rule codes
```

The controller is Admin-only through `RolesGuard` and `@Roles(RoleName.Admin)`. GET, POST, and DELETE are independently throttled. POST requires the current password, exact `OPEN MAINTENANCE ACCESS` phrase, a 10–240 character reason, and both required acknowledgements. Clients cannot choose scopes; the backend grants `ACADEMIC_STRUCTURE`, `ROSTER`, and `ACCOUNT_LIFECYCLE`.

### 2.2 Current time enforcement

The 15-minute behavior has five separate owners:

1. `backend/src/config/admin-maintenance.config.ts` reads `ADMIN_MAINTENANCE_DURATION_MINUTES`, defaulting to 15.
2. `AdminMaintenanceService.durationMinutes` permits only 5–30 minutes, and `open` calculates `expiresAt`.
3. `admin_maintenance_sessions.expires_at` is non-null and constrained to be later than `started_at`; the active-row lookup is additionally guarded by `expiresAt > now` during use.
4. `isEffective`, `invalidation`, and `persistInvalidation` fail closed and lazily mark an active row `EXPIRED` when it is read after expiry.
5. Web and mobile compute local effective expiry and render countdown/deadline copy.

There is no dedicated expiry worker or cleanup job in the inspected scope. Expiry is authoritative from backend time and persisted lazily on status/policy reads. — Confirmed.

### 2.3 Persisted state and identity boundary

`admin_maintenance_sessions` stores one active row per `actor_user_id`, including `actor_session_version`, status, fixed scopes, reason, start, expiry, last use, close, create, and update timestamps. The partial unique index allows only one `ACTIVE` row per account. Opening a new row revokes any older active row for that same actor. Full Reset clears this table with account/session state.

The effective policy requires:

- deployment availability;
- an `ACTIVE` Maintenance row;
- the same actor user ID;
- an active and verified user who still has the Admin role;
- matching durable account `sessionVersion`;
- backend time before expiry.

The name `actorSessionVersion` can suggest a browser/login binding, but the inspected value is account-wide. Two different administrators do not share access, while two devices signed in as the same administrator account can resolve the same row. — Confirmed by the row key and policy predicate; the actual school’s account-sharing practice is Unverified.

### 2.4 Backend consumers

The service is globally exported and read by these direct consumers:

- `ClassesService`: schedule-collision handling, inactive/historical membership, archived-class restoration, and archive-with-active-membership reconciliation.
- `SectionsService`: inactive/historical membership, capacity, room/adviser conflicts, and archive-with-active-membership reconciliation.
- `UsersService`: deleted/suspended account lifecycle sequencing and linked audit metadata.
- `RosterImportService`: inactive section membership and capacity exceptions in preview/commit paths.
- `AcademicPolicyService`: administrator corrections outside the active academic window.
- `AdminLifecycleService`: preview capabilities, governed-execution availability, section-capacity handling, reviewed cascade academic/account erasure, and repeated active-session checks at execution boundaries.

`AdminLifecycleService` rechecks the exact Maintenance session before prepare and again inside the serialized transaction before apply. Turning the switch OFF therefore blocks an already-prepared operation at execution time; it does not merely change UI state. Separate lifecycle and erasure manifests expire after five minutes and are compared again before execution.

### 2.5 Web consumers

`AdminMaintenanceProvider` wraps the full admin dashboard. It reads status on load, refreshes on browser focus, polls every 30 seconds, and locally changes an expired status to inactive. `AdminMaintenanceBanner` is globally visible in the admin shell only while status is active **and** `expiresAt` exists.

Direct web consumers include the Maintenance settings page, class and section forms, class creation/detail/list pages, section creation/edit pages, user detail, lifecycle dialogs, and batch-erasure dialog. Some controls use exact rule codes to decide whether a warning can continue; other flows refresh Maintenance state after a backend rejection. Backend policy remains authoritative if UI state is stale.

### 2.6 Mobile consumers

Mobile uses the same GET/POST/DELETE API and contract. `useAdminMaintenance` stores the status in React Query, locally expires it each second, refreshes when the app becomes active, refuses maintenance writes offline, and invalidates admin user/class/section/roster/academic queries after open or close.

The Maintenance screen, global notice, classes workspace, sections screen, roster screen, user detail, and lifecycle review consume this state. An older mobile build receiving `active: true` with `expiresAt: null` would remain functionally active in its hook, but would display “expiry unavailable” or “at an unavailable time.” That is a compatibility/UX risk unless clients are updated before or with the backend contract. — Confirmed from current client branches; installed-version adoption is Unverified.

### 2.7 Audit and failure behavior

Opening, closing, expiry, and revocation are written to the audit log transactionally with the state change. Domain mutations record only the maintenance rules actually used, not every rule available. Current metadata includes `maintenanceSessionId`, `maintenanceExpiresAt`, and unique rule codes. Switch mode must preserve a durable start/end/revocation record even when no expiry exists.

Policy reads fail closed: a database/read error returns an inactive context, so normal safeguards apply. GET status instead returns an unavailable error. Offline mobile state never queues Maintenance writes. These behaviors remain appropriate under switch mode.

### 2.8 System Reset is a different maintenance state

Full Reset owns a separate global `system_reset_state`. Maintenance Access cannot open while Reset maintenance is active, and Reset clears all Maintenance Access rows and increments the retained administrator’s `session_version`. The two concepts should not be merged. The per-admin switch is routine scoped authority; System Reset is a coordinated school-wide destructive operation with separate preview, topology, storage, queue, and recovery checks.

### 2.9 Target semantics for planning

The smallest coherent target contract is:

- `OFF`: no active row; all normal policy applies.
- `TURNING ON`: require the current step-up form; backend grants fixed scopes and audits the start.
- `ON`: active for that administrator account until explicit OFF or a security revocation event; no countdown.
- `TURNING OFF`: idempotently close the actor’s active row and immediately restore normal policy.
- `REVOKED`: close automatically because the account/login security context changed or Full Reset began.
- `UNAVAILABLE`: deployment kill switch is off or state cannot be safely established.

Legacy `EXPIRED` rows/state may remain readable for history and rollback compatibility, but new manual-mode rows should not manufacture a fake distant expiry.

## 3. Cascade map

Risk describes changing or cutting the edge without its stated disposition.

| ID | Provider | Interface | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| E01 | Global auth + controller | JWT, `RolesGuard`, Admin role, endpoint throttles | GET/POST/DELETE Maintenance API | direct, security-sensitive | Critical: unauthorized or brute-force elevation | Confirmed | `admin-maintenance.controller.ts` | **Keep unchanged** |
| E02 | Open DTO + password comparison | password, exact phrase, reason, acknowledgements | `AdminMaintenanceService.open` | direct, security-sensitive | High: silent or accidental elevation | Confirmed | `DTO/admin-maintenance.dto.ts`; `open` | **Keep for ON transition** |
| E03 | Deployment config | `ADMIN_MAINTENANCE_ENABLED`, duration minutes | availability and expiry creation | direct, operational | High if kill switch is confused with user switch | Confirmed | `admin-maintenance.config.ts`; `.env.compose.example`; `backend/.env.example` | **Keep enabled flag; retire duration only after cutover** |
| E04 | PostgreSQL session table | active row, non-null expiry, expiry check, one-active-per-actor index | policy resolver, audit history, reset | direct, stateful | High: schema rejects true no-expiry state; far-future workaround corrupts meaning | Confirmed | `admin-maintenance.schema.ts`; migration `0027` | **Migrate expiry semantics; keep actor uniqueness/history** |
| E05 | Maintenance service | `isEffective`, lazy invalidation, `touchSession`, exact-session recheck | all backend policy consumers | direct, stateful, security-sensitive | Critical: service-only shortcuts can leave persistent authority or fail all actions | Confirmed | `admin-maintenance.service.ts` | **Replace expiry predicate with explicit manual-state semantics** |
| E06 | Audit service | OPENED/CLOSED/EXPIRED/REVOKED and rule-use metadata | audit/recovery operators | transitive, evidence | High: expiry-free access without start/end evidence becomes untraceable | Confirmed | `open`, `close`, `persistInvalidation`, `context.audit` | **Preserve; make expiry nullable or record mode/end cause** |
| E07 | Server policy catalog | fixed scopes, allowed rules, protected rules | domain-service decisions and clients | direct, security-sensitive | Critical: making switch equal unrestricted bypass changes official-record policy | Confirmed | `admin-maintenance.policy.ts` | **Keep unchanged for this feature** |
| E08 | Maintenance resolver | schedule, archive, restore, membership rules | `ClassesService` | direct | High: class schedule/roster/archive behavior changes | Confirmed | `classes.service.ts` policy calls | **Retain consumer; remove only time expiry** |
| E09 | Maintenance resolver | capacity, room/adviser, membership, archive rules | `SectionsService` | direct | High: section capacity/roster/archive behavior changes | Confirmed | `sections.service.ts` policy calls | **Retain consumer; remove only time expiry** |
| E10 | Maintenance resolver | lifecycle sequence | `UsersService` | direct | High: deleted/suspended account corrections change | Confirmed | `users.service.ts` policy calls | **Retain consumer; remove only time expiry** |
| E11 | Maintenance resolver | membership and capacity rules | `RosterImportService` preview/commit | direct | High: preview and commit can disagree if switch changes between them | Confirmed | `roster-import.service.ts` | **Retain revalidation and audit** |
| E12 | Maintenance resolver | admin academic-window rule | `AcademicPolicyService` | direct | High: historical/current-period authority changes | Confirmed | `academic-policy.service.ts` | **Retain consumer and actor checks** |
| E13 | Exact Maintenance session | lifecycle preview/execute and batch cascade erasure | `AdminLifecycleService` | direct, security-sensitive, transactional | Critical: irreversible execution can bypass reviewed authority or fail mid-flow | Confirmed | `admin-lifecycle.service.ts` | **Keep exact-session rechecks; OFF invalidates execution** |
| E14 | Web API types/service/provider | nullable `expiresAt`, `expired` state, 30-second poll, local clock | entire web admin shell | direct, operational | Medium: backend switch works but client hides banner or shows expired state | Confirmed | web types/service/provider/layout | **Update client before or atomically with backend** |
| E15 | Web Maintenance UI/banner | 15-minute copy, deadline rendering, open/close actions | administrator | direct, UX | Medium: misleading countdown or invisible active state | Confirmed | Maintenance page; `AdminMaintenanceBanner` | **Render switch and persistent ON indicator** |
| E16 | Web rule consumers | rule helper and status refresh | class/section/user forms/pages and lifecycle dialogs | transitive, UX | Medium: stale enablement; server still rejects safely | Confirmed | web consumer search | **Keep; test ON/OFF transitions** |
| E17 | Mobile API/types/hook | same contract, local expiry, cache invalidation, offline gate | mobile admin surfaces | direct, operational | High for installed old clients: misleading state and contract drift | Confirmed | mobile API/types/hook | **Ship parity; define compatibility window** |
| E18 | Mobile Maintenance UI/notice | expiry text, ON/OFF actions | administrator | direct, UX | Medium: “expiry unavailable” under nullable active expiry | Confirmed | `AdminMaintenanceSettingsScreen`; `AdminMaintenanceNotice` | **Render manual ON state and direct OFF** |
| E19 | Mobile rule consumers | exact rule checks and refresh | classes, sections, roster, users, lifecycle | transitive, UX | Medium: stale controls; backend remains authoritative | Confirmed | mobile consumer search | **Keep; test parity** |
| E20 | Shared contract fixture + tests | fields, routes, expiry scenarios | backend/web/mobile CI | direct, compatibility | High: drift can ship one client with old assumptions | Confirmed | `admin-client-contracts.v1.json`; targeted test files; `.github/workflows/ci.yml` | **Update as one contract change** |
| E21 | System Reset | reset-active exclusion, session-table clearing, session-version increment | Maintenance open/effective state | transitive, stateful | Critical: switch can survive or conflict with Reset if uncoupled | Confirmed | Maintenance `open`; reset catalog/database | **Keep Reset authority and clearing behavior** |
| E22 | Auth/account lifecycle | logout, logout-all, password update/reset, role/status/verification changes | expiry-free Maintenance row | transitive, security-sensitive | Critical: current logout/password paths do not close or invalidate the row | Confirmed | auth/users/token services; session-version search | **Add required revocation seam before no-expiry activation** |
| E23 | Existing specifications/docs | explicit short-lived/expiry requirements and deployment guidance | future plans, reviewers, operators | dormant, operational | Medium: implementation may satisfy code but contradict source-of-truth docs | Confirmed | OpenSpec Maintenance spec/design; existing feature plan | **Supersede deliberately in the later plan/spec** |

## 4. Isolation and change simulation

### 4.1 Unsafe partial cuts

| Cut | Immediate result | Delayed/persisted result | Verdict |
|---|---|---|---|
| Replace page controls with a visual switch only | POST still creates a 15-minute row | Backend expires it; UI and server diverge | **No functional solution** |
| Remove `ADMIN_MAINTENANCE_DURATION_MINUTES` only | Service falls back to 15 minutes | No behavior change | **No solution** |
| Raise duration above 30 minutes | Service rejects it and falls back to 15 | Operator believes it changed when it did not | **Reject** |
| Use a date decades in the future | Appears persistent without schema change | Misleading UI/audit, forgotten authority, bad expiry semantics | **Reject** |
| Make `expires_at` nullable without service/client changes | Current comparisons and `touchSession` no longer treat the row as effective | Active row can become stranded; banner may disappear | **Reject** |
| Remove expiry checks without auth revocation hooks | Switch remains ON after logout/password change | Same account can regain elevated access indefinitely | **Critical; reject** |
| Make one global active switch | One admin’s action relaxes rules for other admins | Recreates the retired global Demo Mode coupling | **Critical; reject** |
| Remove lifecycle manifest TTL with the switch timer | Old previews remain executable after data changes | Stale or incorrect irreversible impact can be applied | **Critical; out of scope** |

### 4.2 Required isolation seam

The implementation plan should introduce one backend-owned **elevated-access revocation operation** that can idempotently close every active Maintenance row for an actor and record a non-secret cause. Auth and account lifecycle paths call this seam before reporting successful logout/logout-all/password change/reset; account eligibility remains checked on every resolution. Revocation failure must fail the security event instead of being silently swallowed, so a later login does not need to unexpectedly switch off valid account-bound maintenance work from another device. This avoids duplicating raw table updates across modules and makes manual switch lifetime explicit.

A login-instance-bound future can replace the account key with a stable authentication-session identifier, but the switch conversion should not pretend that today’s `sessionVersion` provides that isolation.

### 4.3 Ordered change cuts for the later implementation plan

#### Phase 1 — Characterize current security and compatibility

- Reference edges: E01–E07, E14–E23.
- Lock tests for cross-admin isolation, same-account behavior, fail-closed reads, Reset conflict, wrong password, protected rules, and current expiry.
- Decide and document account-bound versus login-instance-bound semantics. This report recommends account-bound for the bounded release.
- **Validation:** current backend, web, mobile, and contract tests pass; explicitly demonstrate that normal logout/password update do not currently revoke Maintenance.
- **Rollback:** none; tests/docs only.

#### Phase 2 — Add revocation before removing the timer

- Reference edges: E05, E06, E21, E22.
- Add the centralized revocation seam and connect successful auth/account security events while existing 15-minute expiry still provides fallback containment.
- Keep role/status/verification and Reset invalidation fail-closed.
- **Validation:** ON becomes inactive immediately after each security event; another administrator remains unaffected; audit records the cause once.
- **Rollback:** remove callers while keeping the existing expiry behavior; no active authority becomes longer-lived.

#### Phase 3 — Migrate state and contract semantics

- Reference edges: E03–E06, E14, E17, E20, E23.
- Represent manual mode explicitly. Prefer nullable expiry or an explicit mode over a fabricated distant date. Preserve legacy expired rows/state during rollout.
- Keep the deployment enabled flag and one-active-row-per-actor constraint.
- Make audit metadata valid without an expiry and retain start/end/cause evidence.
- **Validation:** migration upgrades existing rows safely; old timed rows still expire; new manual rows remain active; Reset clears both; contract fixtures agree across backend/web/mobile.
- **Rollback:** disable Maintenance Access through the deployment flag, close active manual rows, and run old timed behavior against the additive/compatible schema. Do not restore Demo Mode.

#### Phase 4 — Change policy evaluation

- Reference edges: E05, E07–E13, E21–E22.
- Make effectiveness depend on active manual state plus actor eligibility and revocation state, not wall-clock expiry.
- Preserve exact-session checks at preview/execute/transaction boundaries and every protected rule.
- **Validation:** exercise every named backend rule family with switch OFF and ON; turn OFF between preview and execute and confirm execution is rejected; confirm teachers/background actors receive no authority.
- **Rollback:** feature flag OFF, revoke active rows, restore timed evaluation if required.

#### Phase 5 — Release switch UX across web and mobile

- Reference edges: E14–E20.
- Client-first or atomic deployment: ON opens the existing step-up review, OFF is immediate/idempotent, and persistent banners/notices show actor, start, and reason without a countdown.
- Keep polling/focus refresh, mobile offline refusal, and query invalidation.
- **Validation:** web responsive tests, mobile screen/hook tests, admin class/section/user/roster/lifecycle flows, cross-tab OFF, app background/foreground, and old-client compatibility behavior.
- **Rollback:** clients continue using the same POST/DELETE routes; server availability can be disabled without exposing a bypass.

#### Phase 6 — Remove obsolete timed-only surfaces after adoption

- Reference edges: E03, E04, E14–E20, E23.
- Remove the duration environment setting and countdown-only copy only after deployed backend, web, and supported mobile builds no longer require it. Keep historical `EXPIRED` audit rows if they remain evidence.
- **Validation:** a final repository and deployed-contract search finds no active duration/countdown dependency; dashboards still expose a visible ON state and OFF action.
- **Rollback:** retain compatibility fields/state until the supported-client window closes.

### 4.4 Compatibility notes

- The route shape can stay GET/POST/DELETE, so callers do not need a new authority endpoint.
- `expiresAt` is already nullable in backend, web, and mobile response types, but active status has always returned a value. `active: true` plus `expiresAt: null` is therefore a new semantic contract and must be tested.
- Keeping `expired` in the state union during migration avoids rewriting historical rows and allows rollback.
- The shared contract fixture is an explicit cross-platform gate and must change with both clients.
- Installed mobile clients are the main staged-rollout concern. Current code remains operational with a null expiry but displays incorrect “expiry unavailable” wording.
- Lifecycle and erasure manifest expiries remain independent. A long sequence of work may still require refreshing a specific five-minute preview, but it should not require reopening Maintenance Access.

## 5. Improvements

### Required decoupling

1. **Centralize elevated-access revocation.** Logout, logout-all, password change/reset, Admin-role/account eligibility changes, and Reset need one idempotent policy seam before Maintenance can remain ON indefinitely.
2. **Separate authorization lifetime from evidence freshness.** Manual Maintenance state and short-lived lifecycle/reset manifests must use different names, copy, and tests so “no 15-minute access window” is not misread as “execute any old preview.”

### Optional evidence-backed enhancements

1. Put an immediate **Turn OFF** action in the persistent web banner and mobile notice, not only on the settings page.
2. Show “ON for this administrator account,” start time, and reason so same-account/cross-device scope is visible.
3. Record `mode`, start, end, and revocation cause in audit metadata while preserving historical expiry metadata.
4. Add a status revision/epoch to help clients detect ON/OFF changes across tabs/devices without trusting cached state; backend checks remain authoritative.
5. Add an operator-only stale-active-session report after rollout to detect accounts left ON unusually long without automatically reintroducing a timer.

## 6. Uncertainty and coverage boundary

- **Unverified:** whether school IT shares one Admin credential across multiple people/devices. The recommended account-bound switch would be shared by those sessions; login-instance isolation would require the larger auth contract option.
- **Unverified:** production rows, current deployment environment values, live audit records, and installed mobile-version distribution were not inspected in this analysis.
- **Unverified:** external consumers outside this repository may depend on active sessions always containing a non-null expiry.
- **Inferred:** client-first rollout is the smoothest compatibility order, but the exact mobile release/adoption window requires release telemetry or stakeholder confirmation.
- **Confirmed limitation:** no login-specific identifier is present in the inspected Maintenance policy boundary; `sessionVersion` is account-wide and is not changed by the inspected normal logout/password flows.

Within the inspected backend, web, mobile, schema, reset, auth, contract, OpenSpec, and focused test scope, the final exact-symbol and endpoint search found no additional Maintenance Access dependency. This is bounded static coverage, not proof that no external or runtime-only dependency exists.

## 7. Read-only validation evidence

- Backend focused suites: `admin-maintenance.service.spec.ts` and `admin-maintenance.policy.spec.ts` — **19 tests passed**.
- Web focused suites: Maintenance Access page and provider — **4 tests passed** across two suites.
- Mobile focused suite: `admin-maintenance-settings.test.tsx` — **3 tests passed**.
- Baseline repository was clean before this report was added; branch parity was `origin/developement...HEAD = 0 0`.

These tests characterize the existing timed behavior. They do not prove the proposed switch behavior because no implementation was authorized or performed.
