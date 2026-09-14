# Maintenance Access Switch Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement this plan task-by-task in the current checkout. Do not create a worktree because the authorized `finish-and-ship` workflow requires the current branch. Track every checkbox and preserve unrelated changes.

**Goal:** Replace the fixed 15-minute Maintenance Access window with an audited, per-administrator ON/OFF mode that remains active until explicit close or a security revocation event, while preserving backend-owned scopes, stale-preview protection, web/mobile parity, and release evidence.

**Architecture:** Keep the existing Admin-only GET/POST/DELETE API and `AdminMaintenanceService` as the sole authority. Persist an explicit `MANUAL` session mode with nullable expiry, preserve legacy `TIMED` rows for compatibility, and add one idempotent actor revocation method used by logout/logout-all/password-change paths. Web and mobile render the existing reviewed activation as “Turn ON,” render an immediate “Turn OFF,” and never infer authority from local state.

**Tech stack:** NestJS 11, Drizzle/PostgreSQL, Next.js 16/React 19, Expo 54/React Native 0.81, Jest, Playwright, Android Gradle, GitHub Actions, Railway.

**Source analysis:** `docs/feature-analysis/2026-09-14-maintenance-access-switch-mode-isolation-analysis.md`

**Baseline:** `developement` at `15828cdef19c1b9648437be5125e95fd399c3607`, initially equal to `origin/developement`. Production read-only observation showed Maintenance Access closed and the current 15-minute form at `/dashboard/admin/system-settings/maintenance-access`.

## Global constraints

- The administrator’s switch is account-bound, never global and never client-authoritative.
- Turning ON keeps current password, exact confirmation, 10–240 character reason, required acknowledgements, fixed server scopes, controller throttling, and audit.
- Turning OFF is immediate, idempotent, and restores normal policy.
- Logout, logout-all, and every password update revoke active Maintenance Access; account/role/verification/session-version invalidation and Full Reset remain fail-closed.
- `ADMIN_MAINTENANCE_ENABLED` remains the deployment kill switch. `ADMIN_MAINTENANCE_DURATION_MINUTES` is retired from active configuration.
- New sessions use explicit database mode `MANUAL` with `expires_at = NULL`; existing timed rows remain valid and continue to expire.
- Lifecycle and cascade-erasure manifests retain their independent five-minute freshness expiry.
- Maintenance scopes and protected rules do not change.
- Backend `/api` response envelope remains `{ success, message, data }`.
- Web and mobile consume the same contract; neither calls `ai-service`.
- Mobile source changes require Android version `0.1.38`, versionCode `39`, a newly built ARM64 APK, synchronized manifest, and served-artifact verification.
- No live purge, cascade erasure, Full Reset, or unrelated production mutation is part of acceptance.

---

## 1. Decision summary and feature brief

### Selected design

Use a dual-mode persisted row during compatibility:

```ts
type AdminMaintenanceSessionMode = "TIMED" | "MANUAL";
type AdminMaintenanceMode = "timed" | "manual";
```

- Existing rows receive `mode = 'TIMED'` and keep their current `expires_at`.
- New POST requests create `mode = 'MANUAL'` and `expires_at = NULL`.
- An active manual row is effective only while the actor is active, verified, still an Admin, has the same `sessionVersion`, and the row status is `ACTIVE`.
- A timed row additionally requires backend time before `expires_at`.
- The response adds `mode: 'manual' | 'timed' | null`; `expiresAt` remains nullable.
- Historical `EXPIRED` state and rows remain supported. No fake far-future timestamp is permitted.

### Designs not selected

| Option | Why not selected |
|---|---|
| Global school switch | Recreates retired Demo Mode behavior and leaks one Admin’s elevated state to others. |
| Increase the configured duration | The service clamps it to 5–30 minutes and the user explicitly wants no work timer. |
| Far-future expiry | Misrepresents manual state, produces false countdown/audit data, and leaves forgotten authority. |
| Login-instance binding | Stronger isolation but requires a new auth-session ID in JWT/refresh/web/mobile contracts; account-bound mode is the bounded release. |
| Remove preview expiry | Allows stale destructive manifests; this is evidence freshness, not access lifetime. |

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- Database/session model and migration.
- Backend policy evaluation, audit metadata, manual revocation API internals, and current routes.
- Auth logout/logout-all and user password-update revocation.
- Web status provider, global banner, Maintenance settings page, direct consumers, and tests.
- Mobile status hook, notice, Maintenance screen, direct consumers, tests, version bump, APK, and manifest.
- Shared contract fixture, OpenSpec requirement correction, environment examples, targeted and full repository gates.
- Commit, push to `developement`, exact-SHA CI/Railway observation, public health, authenticated non-destructive page/status acceptance, and live APK integrity.

### Non-goals

- No new role or data-steward permission system.
- No global bypass and no caller-selected maintenance scopes.
- No weakening of protected rules, evidence-aware deletion, finalized workbooks, attempts/grades, audit/lifecycle history, referential integrity, self-account protection, or transaction locks.
- No change to lifecycle/reset preview TTLs.
- No Full Reset or permanent record deletion during testing.
- No iOS packaging and no claim of physical-device acceptance without a device.

### Authorization

The user explicitly authorized plan creation, implementation, tests, mobile packaging, commit, push, deployment triggered by the push, log observation, and non-destructive use of the already-authenticated Nexora admin browser session.

### Assumptions

- Admin accounts are personal. Multiple devices logged in as the same account share the account-bound switch until OFF/revocation.
- Backend and frontend are deployed from the CI-tested `developement` SHA through the existing Railway workflow.
- Installed old mobile builds may briefly display “expiry unavailable” for a manual row but remain backend-safe; build 39 corrects the copy and is forced by the existing APK policy after registration.

## 3. Current-state evidence ledger

| ID | Status | Evidence | Consequence |
|---|---|---|---|
| C01 | Confirmed | `AdminMaintenanceService.durationMinutes/open/isEffective/touchSession/invalidation` | Backend, not the page, enforces 15 minutes. |
| C02 | Confirmed | `admin-maintenance.schema.ts` and migration `0027` | `expires_at` is non-null and checked; real manual state needs a migration. |
| C03 | Confirmed | `admin-maintenance.controller.ts` and DTO | Existing Admin/RBAC/throttle/step-up boundary is reusable. |
| C04 | Confirmed | policy references in classes, sections, users, roster import, academic state, and admin lifecycle | Switch lifetime affects six backend domains and irreversible execution gates. |
| C05 | Confirmed | web provider/page/banner and mobile hook/screen/notice | Both clients independently assume active sessions have expiry. |
| C06 | Confirmed | `AuthService.logout`, `TokenService.revokeAllForUser`, `UsersService.updatePassword` | Ordinary logout/password updates do not currently revoke Maintenance state. |
| C07 | Confirmed | `system-reset.catalog.ts` and `system-reset.database.ts` | Full Reset clears Maintenance rows and advances retained Admin session version. |
| C08 | Confirmed | `admin-lifecycle.manifest.ts` and erasure checks | Five-minute manifest TTL is independent and must remain. |
| C09 | Confirmed | `contract-fixtures/admin-client-contracts.v1.json` and CI workflow | Producer/web/mobile contract drift is gated in CI. |
| C10 | Confirmed | read-only production browser observation on 2026-09-14 | Live UI is closed and still advertises a 15-minute window. |
| C11 | Unverified | No production DB/config/mobile adoption inventory was mutated or queried during planning | Release acceptance must distinguish source, CI, deployed, installed-client, and device evidence. |

## 4. End-to-end impact and consumer map

| Producer/change | Direct consumers | Required treatment |
|---|---|---|
| Schema `mode` + nullable `expiresAt` | Maintenance service, migration tests, reset catalog/integration fixture | Generate migration `0030`, preserve active unique index and reset clearing. |
| Status `mode` + nullable active expiry | Web/mobile types, providers/hooks, pages/notices, contract fixture, tests | Update together; manual mode never runs a local countdown. |
| `revokeForActor(actorId, cause)` | Auth logout/logout-all, all password-update flows | Idempotent, audited, no password/token metadata. |
| Manual effectiveness | Classes, sections, users, roster import, academic state, lifecycle/erasure | Preserve exact rule catalog and transaction-bound rechecks. |
| UI wording/control | Full admin web shell and mobile admin navigation | Persistent ON indicator and immediate OFF; no timer copy. |
| Mobile source/version | Android Gradle/Expo metadata, downloadable APK/JSON, app-version policy | Build, validate, synchronize, register, and verify live bytes. |
| Existing timed OpenSpec requirement | Future planning/review | Supersede 15-minute clauses with manual-mode and security-revocation scenarios. |

## 5. Resolution of every “no solution” cut from the isolation report

| Isolation finding | Complete solution in this plan | Proof gate |
|---|---|---|
| UI switch alone still expires | Change schema, backend policy, contract, web, and mobile in Tasks 1–5. | Backend manual row remains active past the old expiry boundary; both clients show ON. |
| Removing duration config falls back to 15 | Remove `durationMinutes()` and active duration configuration after manual opening is implemented. | Config tests contain no duration; exact search finds no active duration dependency. |
| Values over 30 are clamped | Manual sessions no longer calculate duration. | Open-service test expects `expiresAt: null`, not a larger number. |
| Far-future timestamp is dishonest | Store `mode = MANUAL` and `expires_at = NULL`. | Migration check constraint rejects manual rows with an expiry and timed rows without one. |
| Nullable schema alone strands rows | Coordinate schema with effectiveness, touch, invalidation, status, audit, and clients. | Timed and manual service tests both pass. |
| No expiry survives security events | Add audited `revokeForActor`; require logout/logout-all/password flows to invoke it before success. | Focused auth/users/Maintenance tests prove immediate inactive state and cause. |
| Global switch leaks authority | Retain unique active row keyed by `actor_user_id`; service always resolves current actor. | Two-admin e2e case remains isolated. |
| Removing manifest TTL permits stale execution | Make no manifest-TTL change and keep execute rechecks. | Existing stale-manifest and OFF-between-preview/execute tests pass. |

## 6. Conflicts, invariants, risks, and error behavior

### Intentional invariants

- `ADMIN_MAINTENANCE_ENABLED=false` returns unavailable and grants nothing.
- Database/read failure resolves inactive for domain policy and reports status unavailable to clients.
- Teachers, students, background actors, and a different Admin account never receive the active actor’s scopes.
- Closing/revoking between preview and execute produces `MAINTENANCE_SESSION_REQUIRED` and preserves user-entered reason/outcome where clients already support it.
- Wrong password and malformed activation remain rejected before a row is created.
- System Reset active state rejects opening; Reset clears manual and timed rows.

### Highest-impact risks

1. **Logout or password change succeeds while revocation silently fails.** Revocation errors must not be swallowed. Close Maintenance before password replacement; logout only returns success after token and Maintenance revocation both complete and remains retryable/idempotent.
2. **Nullable expiry makes clients hide the active indicator.** Web banner currently requires `expiresAt`; mobile copy reports “expiry unavailable.” Client tests must fail before backend release and pass before push.
3. **Installed mobile version skew.** Additive `mode` is ignored by old clients and nullable expiry is already typed, so authorization remains safe; build 39 fixes presentation and is delivered through existing forced-APK policy.
4. **Migration accepts contradictory rows.** The new check constraint must encode `(TIMED + valid expiry) OR (MANUAL + null expiry)`.
5. **“No timer” is mistaken for “no safeguards.”** Protected-rule catalog and manifest freshness tests remain explicit and unchanged.

### Error behavior

| Condition | Result |
|---|---|
| Feature disabled | Existing `503` availability response; no authority inferred. |
| Wrong password/acknowledgement/confirmation | Existing validation/forbidden behavior; no row or audit secret. |
| Reset active | Existing `503`; current reset state unchanged. |
| OFF/revoked during execution | `403` with `MAINTENANCE_SESSION_REQUIRED`; refresh status and review impact again. |
| Status read failure | `503`; clients show unavailable rather than assuming ON. |
| Policy read failure | Inactive context; normal safeguards apply. |
| Repeated OFF or revoke | Successful inactive result/no-op without duplicate audit. |

## 7. Ordered implementation tasks

### Task 1: Define manual/timed persistence and contract using TDD

**Files:**

- Modify: `backend/src/modules/admin-maintenance/admin-maintenance.service.spec.ts`
- Modify: `backend/src/modules/admin-maintenance/admin-maintenance.policy.spec.ts`
- Modify: `backend/src/drizzle/schema/admin-maintenance.schema.ts`
- Generate: `backend/drizzle/0030_admin_maintenance_switch_mode.sql`
- Generate: `backend/drizzle/meta/0030_snapshot.json`
- Modify: `backend/drizzle/meta/_journal.json`
- Modify: `backend/src/modules/admin-maintenance/DTO/admin-maintenance.dto.ts`
- Modify: `backend/src/modules/admin-maintenance/admin-maintenance.service.ts`
- Modify: `backend/src/config/admin-maintenance.config.ts`
- Modify: `backend/src/config/admin-maintenance.config.spec.ts`
- Modify: `.env.compose.example`
- Modify: `backend/.env.example`

**Interfaces produced:**

```ts
type AdminMaintenanceSessionMode = "TIMED" | "MANUAL";
type AdminMaintenanceMode = "timed" | "manual";

interface AdminMaintenanceStatusDto {
  mode: AdminMaintenanceMode | null;
  expiresAt: string | null;
}

interface AdminMaintenanceContext {
  mode: AdminMaintenanceMode | null;
  expiresAt: Date | null;
}
```

- [x] Add service tests showing a newly opened session writes `mode: 'MANUAL'`, `expiresAt: null`, returns `mode: 'manual'`, and remains effective when the clock advances beyond 15 minutes.
- [x] Keep/add a legacy timed-row test showing a due `TIMED` row becomes `EXPIRED` and audits `SESSION_EXPIRED`.
- [x] Run `npm test -- --runInBand src/modules/admin-maintenance/admin-maintenance.service.spec.ts src/config/admin-maintenance.config.spec.ts` from `backend/`; expect RED because mode/manual behavior is absent.
- [x] Patch the schema with a mode column, nullable expiry, valid mode check, and mutually exclusive timed/manual expiry check.
- [x] Run `npx drizzle-kit generate --name admin_maintenance_switch_mode` from `backend/`; inspect SQL and metadata so existing rows backfill to `TIMED` before the new constraint.
- [x] Implement manual opening/effectiveness/touch/status/audit behavior. Do not use a future date and do not remove timed-row compatibility.
- [x] Remove active duration configuration and examples.
- [x] Rerun focused service/config/policy tests; expect PASS.
- [x] Run `npm run check:migrations` and `npm run build` from `backend/`; expect PASS.

### Task 2: Add reliable security-event revocation using TDD

**Files:**

- Modify: `backend/src/modules/admin-maintenance/admin-maintenance.service.spec.ts`
- Modify: `backend/src/modules/admin-maintenance/admin-maintenance.service.ts`
- Modify: `backend/src/modules/auth/auth.service.spec.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/token.service.spec.ts`
- Modify: `backend/src/modules/auth/token.service.ts`
- Modify: `backend/src/modules/auth/auth.controller.spec.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/users/users.service.spec.ts`
- Modify: `backend/src/modules/users/users.service.ts`

**Interface produced:**

```ts
type AdminMaintenanceRevocationCause =
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "PASSWORD_CHANGED";

revokeForActor(
  actorId: string,
  cause: AdminMaintenanceRevocationCause,
): Promise<boolean>;

findUserIdByToken(rawToken: string): Promise<string | null>;
```

- [x] Add a Maintenance service test proving `revokeForActor` changes the actor’s one active row to `REVOKED`, audits the cause once, returns `true`, and returns `false` without duplicate audit on retry.
- [x] Add token/Auth/controller tests proving logout resolves the token owner before mutation, logout-all routes through Auth service, and neither reports success before Maintenance revocation.
- [x] Add Users service coverage proving every `updatePassword` path revokes Maintenance with `PASSWORD_CHANGED` before storing the new hash.
- [x] Run the three focused suites and verify RED for the missing method/calls.
- [x] Implement the idempotent audited revocation method without accepting client-provided causes.
- [x] Resolve the logout token owner without mutating it, revoke Maintenance first so failures remain retryable, then revoke the token. Route logout-all through the same ordering and preserve cookie clearing only after the service succeeds.
- [x] Wire `UsersService.updatePassword` before password persistence so failure cannot leave an active switch after a successful password change.
- [x] Rerun focused suites and adjacent auth/users tests; expect PASS.

### Task 3: Update backend integration, lifecycle, contract, and OpenSpec evidence

**Files:**

- Modify: `backend/test/admin-maintenance.e2e-spec.ts`
- Modify: `backend/test/academic-lifecycle.integration-spec.ts` only if fixtures require explicit timed mode
- Modify: `backend/test/system-reset.integration-spec.ts` only if fixture assertions require mode
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts`
- Modify: `backend/src/modules/users/users.service.ts` maintenance audit metadata type
- Modify: `contract-fixtures/admin-client-contracts.v1.json`
- Modify: `openspec/changes/admin-maintenance-gateway/specs/admin-maintenance-access/spec.md`
- Modify: `openspec/changes/admin-maintenance-gateway/design.md`
- Modify: `openspec/changes/admin-maintenance-gateway/tasks.md`

- [x] Change e2e expectations from “expires after 15 minutes” to “manual until OFF/revocation,” while retaining a direct legacy timed-row expiry scenario.
- [x] Add an OFF-between-preview-and-execute assertion if existing lifecycle coverage does not already prove exact-session rejection.
- [x] Add `mode` to the shared backend/web/mobile field fixture and make `maintenanceExpiresAt` nullable while adding `maintenanceMode` to mutation audit metadata.
- [x] Supersede OpenSpec’s short-lived requirement with manual ON/OFF plus logout/logout-all/password/eligibility/Reset revocation scenarios. Keep fixed scopes and every protected-rule scenario.
- [x] Run backend focused integration/unit tests and `npm run contract:admin`; expect PASS.
- [x] Run `openspec validate admin-maintenance-gateway --strict`; expect PASS.

### Task 4: Convert the web admin surface to switch semantics using TDD

**Files:**

- Modify: `next-frontend/src/types/admin-maintenance.ts`
- Modify: `next-frontend/src/providers/AdminMaintenanceProvider.test.tsx`
- Modify: `next-frontend/src/providers/AdminMaintenanceProvider.tsx`
- Create: `next-frontend/src/components/admin/AdminMaintenanceBanner.test.tsx`
- Modify: `next-frontend/src/components/admin/AdminMaintenanceBanner.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/maintenance-access/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/maintenance-access/page.tsx`
- Modify: `next-frontend/tests/e2e/admin-maintenance-access.spec.ts`

- [x] Add provider/banner/page tests for `mode: 'manual'`, `active: true`, `expiresAt: null`: status stays active, the global banner is visible, copy says it remains ON until turned OFF, and the active control is an accessible checked switch.
- [x] Add inactive-page coverage showing the reviewed form ends with an unchecked `Turn Maintenance Access ON` switch and retains all four activation requirements.
- [x] Run focused Jest tests and verify RED because current provider/banner/page assume an expiry.
- [x] Add the mode type. Locally expire only timed sessions; manual status always defers to backend state/polling.
- [x] Render the banner whenever active. For manual mode, show no deadline and include direct navigation to manage/turn OFF.
- [x] Replace 15-minute/window language with ON/OFF language. Use `role="switch"` and `aria-checked`; ON still submits the existing reviewed payload and OFF calls DELETE immediately.
- [x] Update Playwright route stubs/expectations for manual mode.
- [x] Run focused Jest and Playwright Maintenance tests; expect PASS.

### Task 5: Convert the mobile admin surface and package build 39 using TDD

**Files:**

- Modify: `mobile/src/types/admin-maintenance.ts`
- Modify: `mobile/src/hooks/useAdminMaintenance.ts`
- Modify: `mobile/src/screens/__tests__/admin-maintenance-settings.test.tsx`
- Create: `mobile/src/components/admin/__tests__/AdminMaintenanceNotice.test.tsx`
- Modify: `mobile/src/screens/AdminMaintenanceSettingsScreen.tsx`
- Modify: `mobile/src/components/admin/AdminMaintenanceNotice.tsx`
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Replace after build: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Regenerate: `next-frontend/public/downloads/nexora-student-mobile-release.json`

- [x] Add screen/notice tests for manual active copy, no countdown, Turn ON review, Turn OFF action, offline write rejection, and password clearing.
- [x] Add hook-level coverage through the screen/notice or a focused hook test proving manual status does not self-expire.
- [x] Run focused mobile tests and verify RED.
- [x] Add mode typing; locally expire only timed rows.
- [x] Change copy/controls to explicit ON/OFF without removing the activation review or offline gate.
- [x] Run focused mobile tests and `npm run typecheck`; expect PASS before packaging.
- [x] Bump Expo/Gradle native version to `0.1.38` and versionCode `39`.
- [x] Build ARM64 release with explicit production API URL, Java 17, and the installed Android SDK.
- [x] Copy the built APK into the established frontend download location.
- [x] Run `npm run release:prepare --prefix mobile -- --release-notes "Replaces the 15-minute Maintenance Access window with an audited per-admin ON/OFF mode and immediate security revocation."`; default minimum supported build is 39.
- [x] Run `npm run release:verify --prefix mobile` and `npm run test:release --prefix mobile`; record package, version, ABI, signature, alignment, production API URL, byte size, and SHA-256.

### Task 6: Full verification and final diff audit

**Required commands:**

- [x] Backend: `npm run contract:admin`, `npm run lint`, `npm run test -- --runInBand`, `npm run build`, `npm run test:e2e -- --runInBand` with the configured disposable Maintenance database, migration bootstrap/upgrade, academic integration, and system-reset rehearsal.
- [x] Frontend: `npm run lint`, `npm run typecheck`, `npm run test -- --runInBand`, `npm run build`, and focused `npx playwright test tests/e2e/admin-maintenance-access.spec.ts`.
- [x] Mobile: `npm run typecheck`, `npm test`, `npm run test:release`, and `npm run release:verify`.
- [x] OpenSpec: strict validation of `admin-maintenance-gateway`.
- [x] Repository: final exact search for 15-minute Maintenance copy/config, `git diff --check`, task-file inventory, generated-artifact integrity, and requirement-to-diff comparison.
- [x] Run a local/non-production API or test-harness sequence proving OFF → reviewed ON → manual persistence → OFF, cross-admin isolation, password revocation, logout revocation, legacy timed expiry, and protected rules.
- [x] Run final code review. Resolve every task-caused correctness issue before commit; record unrelated baseline failures without weakening gates.

### Task 7: Commit, ship, observe, and accept

- [ ] Verify branch/upstream/remotes and inspect every outgoing commit. Stage only the analysis, plan, implementation, tests, migration/meta, OpenSpec updates, version files, APK, and manifest.
- [ ] Review staged diff/stat and commit with a scoped message such as `feat(admin): replace maintenance timer with switch mode`.
- [ ] Record the full SHA, push `developement` without force, and verify local/origin parity.
- [ ] Discover GitHub Actions runs by exact SHA. Wait for every required CI job to complete successfully; inspect failed logs and repair only in-scope failures.
- [ ] Correlate the downstream Railway workflow to the CI-tested SHA. Wait for backend, frontend, and AI deployment jobs and provider deployments to reach terminal success.
- [ ] Verify public backend live/readiness endpoints, Nexora frontend route, response/security headers, and live APK/manifest byte equality.
- [ ] Register Android build 39 through the guarded production app-version contract without printing `X-CI-Secret`; verify build 38 receives the configured forced update and build 39 receives `none`.
- [ ] In the already-authenticated admin browser, verify the deployed page says OFF/ON rather than 15 minutes, the current status remains closed unless the user supplies a password, and no console/network error appears. Do not execute purge, erasure, or Reset.
- [ ] If current-password material is not available, report activation itself as unverified rather than entering or extracting credentials. Automated backend/e2e evidence remains separate from authenticated live UI evidence.
- [ ] Summarize user-visible behavior, migration, security revocation, web/mobile parity, APK identity/hash/link, commit/SHA, CI/deployment IDs, live evidence, and any physical-device/credential boundary.

## 8. Verification matrix and acceptance criteria

| Requirement | Automated proof | Runtime/release proof | Acceptance |
|---|---|---|---|
| No 15-minute access timeout | Service clock-advance test; config search | Deployed page contains no 15-minute copy | Manual row stays ON until OFF/revoke. |
| Explicit non-global switch | Service/e2e two-actor test | Authenticated status belongs to current Admin | Another Admin remains under normal policy. |
| Deliberate ON | DTO/service/page/mobile tests | Deployed form still asks for review/password | No activation from a bare client boolean. |
| Immediate OFF | Service/web/mobile tests | DELETE/status or browser OFF when credentials permit | Next guarded action resolves inactive. |
| Logout/password revocation | Auth/users/Maintenance tests | Optional non-destructive authenticated logout check | Success is not returned before revocation. |
| Legacy timed compatibility | Service/migration/e2e test | Existing rows can age out during rollout | No stranded active timed rows. |
| Protected evidence remains | Policy/lifecycle/erasure tests | No destructive live acceptance | Switch changes lifetime, not scope. |
| Web visibility | Provider/banner/page/Playwright tests | Live route shows ON/OFF wording | Active manual state never hides due null expiry. |
| Mobile parity | Screen/notice/type/contract tests | APK metadata and updater decision | Build 39 contains switch copy and production API. |
| Migration/release safety | PG16/PG18 migration and reset suites | Exact-SHA Railway success/readiness | Schema and services deploy together. |

## 9. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

1. Commit backend, migration, web, mobile, tests, docs, and APK as one contract-consistent revision.
2. CI applies the migration to disposable databases and verifies backend/web/mobile.
3. Railway deploys backend before frontend from the exact tested SHA.
4. Publish/register mobile build 39 only after live APK bytes match the committed artifact.
5. Keep `ADMIN_MAINTENANCE_ENABLED` as the emergency kill switch.

### Rollback

- Disable Maintenance Access first; the resolver then fails closed.
- Revoke/close any active manual rows before restoring timed-only application code.
- The additive mode/nullable-expiry schema can remain during rollback; do not restore Demo Mode.
- Already committed admin lifecycle operations remain evidence and are never rolled back by deleting audit/history rows.
- APK rollback uses the existing monotonic app-version policy; never advertise an older binary as newer.

### Observability

- Audit actions: opened, closed, expired legacy row, revoked with cause, and exact relaxed rule codes.
- CI: exact SHA and all required job conclusions.
- Railway: workflow ID, deployment IDs/status, tested SHA, health/readiness.
- Client: status fetch failures, OFF/ON mutation errors, old-client null-expiry presentation.
- APK: package/version/code/ABI/signature/alignment/API URL/size/SHA and live byte equality.

### Cleanup after supported-client adoption

- Remove `TIMED` creation/configuration code immediately; retain only timed-row read compatibility.
- Retire the `expired` API state and database mode only in a separate later cleanup after no timed rows and no supported client depend on them.
- Remove stale duration variables from Railway separately if present; an unused environment value must not control runtime behavior.

### Unverified boundaries

- Physical Android-device installation and interaction remain unverified unless an attached compatible device is available.
- Live activation requires the user’s current password; credentials must not be requested, extracted, logged, or guessed.
- External clients outside this repository are not inventoried. The additive mode field and nullable expiry minimize but do not eliminate that uncertainty.
- Production database row contents are not required for the migration, but the deployed migration/provider status must reach terminal success before completion is claimed.

## 10. Plan self-review record

- Every isolation-report “no solution” cut maps to one implementation task and one proof gate.
- Backend producer changes map to all discovered web, mobile, lifecycle, reset, auth, schema, contract, CI, and release consumers.
- Manual and legacy timed rows have explicit, non-contradictory semantics.
- The plan does not remove protected rules or manifest freshness.
- The plan includes RED/GREEN test order before production edits.
- The plan contains no placeholder decisions; account-bound scope is selected.
- APK packaging is required because mobile source changes.
- Live destructive actions are explicitly excluded.
