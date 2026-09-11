# Safe Admin Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. For this authorized run, execute inline because sub-agent delegation was not authorized.

**Goal:** Add a time-limited, admin-only Demo mode that relaxes a documented set of presentation-blocking workflow rules across backend, web, and mobile while preserving security, integrity, evidence, and audit safeguards.

**Architecture:** A global NestJS module owns one durable, optimistic-versioned mode state and exposes admin-only status/activation/deactivation endpoints. Existing feature services ask that module whether a named rule is relaxed for the authenticated admin; web and mobile consume only the status contract, display an active warning, and stop locally disabling options that the backend permits.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL, class-validator, bcrypt, Next.js 16 App Router, React 19, Tailwind 4, Expo 54, React Native 0.81, TanStack Query, Jest, Playwright, Android Gradle, GitHub Actions, Railway.

## Global Constraints

- Stay in the current `developement` checkout; create no worktree and preserve unrelated changes.
- Keep the `{ success, message, data }` response envelope and every existing mutation payload unchanged outside the three new Demo mode endpoints.
- Never accept a client header, query, or mutation flag that claims Demo mode; resolve it from backend state plus authenticated actor roles.
- `ADMIN_DEMO_MODE_AVAILABLE` defaults to `false`; only the exact string `true` enables activation.
- An expired or unreadable mode state always enforces normal safeguards.
- Demo mode never relaxes JWT/RBAC, self-account protection, DTO/content validation, unique identities, referential integrity, `@AcademicMutation()`, finalized/locked workbooks, attempts/returned grades, score caps, append-only evidence/audit, or evidence-aware purge.
- Activation durations are exactly 15, 30, 60, or 120 minutes and default to 30 minutes in both clients.
- Activation requires current password, exact phrase `ENABLE DEMO MODE`, a 10-240 character reason, the latest version, and all three required acknowledgements.
- Deactivation requires exact phrase `DISABLE DEMO MODE` and the latest version; it remains available when the deployment gate is false.
- Web and mobile use the current GABHS/admin visual language. Add one compact amber active-state notice; do not add a second navigation system, decorative metrics, gradients, or badge clutter.
- Mobile source changes require a monotonic Android version, rebuilt release APK, committed manifest/checksum metadata, updater registration, and exact-artifact verification. Do not change or compare the iOS build number.
- Production acceptance must end with Demo mode disabled.

---

### Task 1: Persisted state, configuration, and typed policy catalog

**Files:**

- Create: `backend/src/drizzle/schema/admin-demo-mode.schema.ts`
- Create: `backend/drizzle/0021_admin_demo_mode.sql`
- Create: `backend/drizzle/meta/0021_snapshot.json`
- Modify: `backend/drizzle/meta/_journal.json`
- Modify: `backend/src/drizzle/schema/index.ts`
- Create: `backend/src/config/admin-demo-mode.config.ts`
- Create: `backend/src/config/admin-demo-mode.config.spec.ts`
- Create: `backend/src/modules/admin-demo-mode/admin-demo-mode.policy.ts`
- Modify: `backend/.env.example`
- Modify: `.env.compose.example`

**Interfaces:**

- Produces `adminDemoModeStates` with fixed-row state, actor references, expiry, reason, and optimistic version.
- Produces `AdminDemoModeRule`, `ADMIN_DEMO_MODE_RELAXED_RULES`, and `ADMIN_DEMO_MODE_PROTECTED_RULES`.
- Produces config key `adminDemoMode.available: boolean`.

- [x] **Step 1: Write the failing config and policy tests**

Create `admin-demo-mode.config.spec.ts` with these assertions:

```ts
describe('admin demo mode config', () => {
  const previous = process.env.ADMIN_DEMO_MODE_AVAILABLE;

  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_DEMO_MODE_AVAILABLE;
    else process.env.ADMIN_DEMO_MODE_AVAILABLE = previous;
  });

  it('fails closed unless the value is exactly true', () => {
    for (const value of [undefined, '', '1', 'TRUE', 'yes']) {
      if (value === undefined) delete process.env.ADMIN_DEMO_MODE_AVAILABLE;
      else process.env.ADMIN_DEMO_MODE_AVAILABLE = value;
      expect(adminDemoModeConfig()).toEqual({ available: false });
    }
    process.env.ADMIN_DEMO_MODE_AVAILABLE = 'true';
    expect(adminDemoModeConfig()).toEqual({ available: true });
  });
});
```

Add a policy test asserting the exact relaxed and protected codes from the design and asserting no code appears in both sets.

- [x] **Step 2: Run RED**

Run:

```bash
npm --prefix backend test -- --runInBand src/config/admin-demo-mode.config.spec.ts src/modules/admin-demo-mode/admin-demo-mode.policy.spec.ts
```

Expected: FAIL because the config, policy, and tests do not yet have implementations.

- [x] **Step 3: Add the schema and forward-only migration**

Implement the schema with this shape:

```ts
export const adminDemoModeStates = pgTable('admin_demo_mode_states', {
  id: uuid('id').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  reason: text('reason'),
  activatedBy: uuid('activated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  deactivatedBy: uuid('deactivated_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  version: integer('version').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

Generate migration `0021_admin_demo_mode.sql` with Drizzle Kit so the SQL, `0021_snapshot.json`, and `_journal.json` entry stay consistent. The migration creates the table, foreign keys with `ON DELETE SET NULL`, and an index on `expires_at`. It inserts no active state and contains no destructive down operation.

- [x] **Step 4: Add fail-closed config and the immutable catalog**

```ts
export default registerAs('adminDemoMode', () => ({
  available: process.env.ADMIN_DEMO_MODE_AVAILABLE === 'true',
}));
```

Define the ten relaxed rule codes and twelve protected rule codes verbatim from the design, each with a stable code, short label, and plain-language description. Export read-only arrays so controller responses and tests share one source.

- [x] **Step 5: Update examples and migration exports**

Export the schema from `schema/index.ts`. Add `ADMIN_DEMO_MODE_AVAILABLE=false` with a warning comment to both environment templates. Do not edit committed or local secret values.

- [x] **Step 6: Run GREEN and migration integrity**

```bash
npm --prefix backend test -- --runInBand src/config/admin-demo-mode.config.spec.ts src/modules/admin-demo-mode/admin-demo-mode.policy.spec.ts
npm --prefix backend run check:migrations
```

Expected: both commands exit 0; config tests prove only exact `true` enables availability.

- [x] **Step 7: Commit the foundational contract**

```bash
git add backend/src/drizzle/schema/admin-demo-mode.schema.ts backend/drizzle/0021_admin_demo_mode.sql backend/drizzle/meta/0021_snapshot.json backend/drizzle/meta/_journal.json backend/src/drizzle/schema/index.ts backend/src/config/admin-demo-mode.config.ts backend/src/config/admin-demo-mode.config.spec.ts backend/src/modules/admin-demo-mode/admin-demo-mode.policy.ts backend/src/modules/admin-demo-mode/admin-demo-mode.policy.spec.ts backend/.env.example .env.compose.example
git commit -m "feat(admin): add durable demo mode state"
```

---

### Task 2: Admin-only state lifecycle API

**Files:**

- Create: `backend/src/modules/admin-demo-mode/DTO/admin-demo-mode.dto.ts`
- Create: `backend/src/modules/admin-demo-mode/DTO/admin-demo-mode.dto.spec.ts`
- Create: `backend/src/modules/admin-demo-mode/admin-demo-mode.service.ts`
- Create: `backend/src/modules/admin-demo-mode/admin-demo-mode.controller.ts`
- Create: `backend/src/modules/admin-demo-mode/admin-demo-mode.module.ts`
- Create: `backend/src/modules/admin-demo-mode/admin-demo-mode.service.spec.ts`
- Create: `backend/src/modules/admin-demo-mode/admin-demo-mode.controller.spec.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**

- `getStatus(): Promise<AdminDemoModeStatusDto>`
- `activate(dto: ActivateAdminDemoModeDto, actorId: string): Promise<AdminDemoModeStatusDto>`
- `deactivate(dto: DeactivateAdminDemoModeDto, actorId: string): Promise<AdminDemoModeStatusDto>`
- `resolveForActor(actorId: string | undefined, roles?: string[]): Promise<AdminDemoModeContext>`
- `AdminDemoModeContext.allows(rule): boolean`
- `AdminDemoModeContext.audit(bypassedRules)` returns version/expiry/rule metadata only when at least one rule was bypassed.

- [x] **Step 1: Write service RED tests**

Cover these exact scenarios with a fixed clock:

```ts
it.each([
  ['missing row', null, 'disabled', false],
  ['disabled row', { enabled: false }, 'disabled', false],
  ['future expiry', { enabled: true, expiresAt: future }, 'active', true],
  ['past expiry', { enabled: true, expiresAt: past }, 'expired', false],
])('derives %s from server time', async (_label, row, state, active) => {
  db.query.adminDemoModeStates.findFirst.mockResolvedValue(row);
  await expect(service.getStatus()).resolves.toMatchObject({ state, active });
});
```

Also prove: unavailable activation is `503`; bad password is `403`; bad version is `409`; valid activation sets an exact future expiry and increments version; deactivation works while unavailable; audit receives no password; a non-admin actor context never allows a rule; a DB read error returns a fail-closed inactive context for mutations.

- [x] **Step 2: Write controller RED tests**

Assert `@Roles(RoleName.Admin)` protects the controller, all three methods retain the response envelope, and `@CurrentUser()` actor identity is passed to activate/deactivate.

- [x] **Step 3: Run RED**

```bash
npm --prefix backend test -- --runInBand src/modules/admin-demo-mode/admin-demo-mode.service.spec.ts src/modules/admin-demo-mode/admin-demo-mode.controller.spec.ts
```

Expected: FAIL because the module is not implemented.

- [x] **Step 4: Implement concrete DTO validation**

Use `class-validator` classes, not erased unions:

```ts
export class ActivateAdminDemoModeDto {
  @IsString() @MinLength(1) currentPassword!: string;
  @Equals('ENABLE DEMO MODE') confirmation!: 'ENABLE DEMO MODE';
  @IsString() @Length(10, 240) reason!: string;
  @IsInt() @IsIn([15, 30, 60, 120]) durationMinutes!: 15 | 30 | 60 | 120;
  @IsInt() @Min(0) expectedVersion!: number;
  @IsArray() @ArrayUnique()
  @IsIn(REQUIRED_DEMO_ACKNOWLEDGEMENTS, { each: true })
  acknowledgements!: AdminDemoAcknowledgement[];
}

export class DeactivateAdminDemoModeDto {
  @Equals('DISABLE DEMO MODE') confirmation!: 'DISABLE DEMO MODE';
  @IsInt() @Min(0) expectedVersion!: number;
}
```

The service compares the acknowledgement set against the exact required set, so missing or extra entries fail.

- [x] **Step 5: Implement atomic versioned activation/deactivation**

Use fixed singleton ID `00000000-0000-4000-8000-000000000002`. Verify bcrypt password before the state transaction. Insert the disabled version-0 row if absent, then update with `WHERE id = singleton AND version = expectedVersion`; require exactly one returned row or throw `409`. Calculate expiry from the injected/current clock only once.

`deactivate` sets `enabled=false`, clears `expiresAt`, records deactivation actor/time, increments version, and never checks the availability flag.

- [x] **Step 6: Implement actor-scoped fail-closed policy resolution**

```ts
export type AdminDemoModeContext = {
  active: boolean;
  version: number;
  expiresAt: Date | null;
  allows: (rule: AdminDemoModeRelaxedRuleCode) => boolean;
  audit: (bypassedRules: readonly AdminDemoModeRelaxedRuleCode[]) =>
    | { demoModeVersion: number; demoModeExpiresAt: string; bypassedRules: AdminDemoModeRelaxedRuleCode[] }
    | undefined;
};
```

Return active only when state is effective and roles include `admin`. If roles are omitted, query the actor roles once. Catch state-read failure, log a warning without PII, and return the inactive context.

- [x] **Step 7: Register the global module and controller**

Mark `AdminDemoModeModule` global, import `DatabaseModule` and `AuditModule`, export the service, and import it once in `AppModule`. Add `adminDemoModeConfig` to `ConfigModule.forRoot({ load })`.

- [x] **Step 8: Run GREEN and build**

```bash
npm --prefix backend test -- --runInBand src/modules/admin-demo-mode/admin-demo-mode.service.spec.ts src/modules/admin-demo-mode/admin-demo-mode.controller.spec.ts
npm --prefix backend run build
```

Expected: focused tests and build exit 0.

- [x] **Step 9: Commit the API**

```bash
git add backend/src/modules/admin-demo-mode backend/src/app.module.ts
git commit -m "feat(admin): add guarded demo mode activation API"
```

---

### Task 3: User lifecycle policy integration

**Files:**

- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/users/users.service.spec.ts`

**Interfaces:**

- Consumes `AdminDemoModeService.resolveForActor(adminId)`.
- Produces audit metadata only when `user_lifecycle_sequence` is actually bypassed.

- [x] **Step 1: Add backend RED cases**

Prove normal mode keeps the exact suspend-before-archive and suspended-only-reactivate errors. Prove active admin Demo mode allows an ACTIVE/PENDING account to archive and a DELETED account to reactivate. Prove self-suspend/delete/purge remains rejected in both modes. Prove purge still requires DELETED.

- [x] **Step 2: Run backend RED**

```bash
npm --prefix backend test -- --runInBand src/modules/users/users.service.spec.ts
```

Expected: only the new Demo-mode cases fail.

- [x] **Step 3: Implement the narrow bypass**

Resolve policy once per lifecycle mutation. Replace only the status-sequence conditions:

```ts
const demo = await this.adminDemoMode.resolveForActor(adminId);
const bypassedRules: AdminDemoModeRule[] = [];
if (existingUser.status !== 'SUSPENDED') {
  if (!demo.allows('user_lifecycle_sequence')) throw normalError;
  bypassedRules.push('user_lifecycle_sequence');
}
```

Keep self protection, existence, uniqueness, archive snapshot, transaction, and audit. Add `{ demoMode: demo.audit(bypassedRules) }` only when at least one rule was bypassed.

- [x] **Step 4: Run focused GREEN**

```bash
npm --prefix backend test -- --runInBand src/modules/users/users.service.spec.ts
```

Expected: the focused suite exits 0.

- [x] **Step 5: Commit the user slice**

```bash
git add backend/src/modules/users/users.service.ts backend/src/modules/users/users.service.spec.ts
git commit -m "feat(admin): relax demo user lifecycle sequence"
```

---

### Task 4: Class, section, and roster policy integration

**Files:**

- Modify: `backend/src/modules/classes/classes.service.ts`
- Modify: `backend/src/modules/classes/classes.service.spec.ts`
- Modify: `backend/src/modules/sections/sections.service.ts`
- Modify: `backend/src/modules/sections/sections.service.spec.ts`
- Modify: `backend/src/modules/roster-import/roster-import.service.ts`
- Modify: `backend/src/modules/roster-import/roster-import.service.spec.ts`

**Interfaces:**

- Consumes `AdminDemoModeContext` once per top-level mutation.
- Produces no HTTP shape changes; affected audits gain Demo metadata only when a rule is skipped.

- [x] **Step 1: Characterize permanent invariants first**

Add/retain tests proving active Demo mode still rejects:

- nonexistent section/teacher/student;
- non-teacher adviser;
- duplicate section identity and duplicate subject class identity;
- grade-mismatched or graduated learner;
- cross-section membership without lifecycle reconciliation;
- start time not before end time;
- class/section identity changes with linked academic evidence;
- direct evidence-bearing purge.

- [x] **Step 2: Add relaxed-rule RED cases**

For an active admin, prove:

- overlapping class schedule saves and logs `schedule_collision`;
- reused section room/adviser saves and logs `room_adviser_exclusivity`;
- section capacity may be reduced below headcount and overbooked;
- historical/inactive class and section membership writes proceed;
- roster import into a historical/inactive section proceeds while retaining user/LRN/role/grade checks;
- class/section archival with active memberships executes the existing transactional completion/archive updates;
- an archived class shell may be restored without restoring memberships.

Duplicate each with inactive mode and assert the current error remains.

- [x] **Step 3: Run RED**

```bash
npm --prefix backend test -- --runInBand src/modules/classes/classes.service.spec.ts src/modules/sections/sections.service.spec.ts src/modules/roster-import/roster-import.service.spec.ts
```

Expected: permanent-invariant tests pass; new relaxation cases fail.

- [x] **Step 4: Integrate one policy resolution per mutation**

At each top-level method:

```ts
const demo = await this.adminDemoMode.resolveForActor(actorId, actorRoles);
const bypassed: AdminDemoModeRule[] = [];

if (conflictFound) {
  if (!demo.allows('schedule_collision')) throw existingConflict;
  bypassed.push('schedule_collision');
}
```

Do not skip the complete validation method when it contains both relaxable and permanent checks. Split collision discovery from invalid time-shape validation so start/end rules always run. Split section capacity from student-role/grade/graduation validation. Keep transactions unchanged.

- [x] **Step 5: Implement archived-class restoration explicitly**

When `toggleActive` sees an inactive class, require active admin Demo mode, set only `classes.isActive=true`, retain completed enrollment statuses, and audit `restore_archived_class`. Do not reconstruct deleted schedules, records, lessons, assessments, or memberships.

- [x] **Step 6: Preserve safe archival cascades**

When `archive_active_memberships` is allowed, continue into the existing class/section transaction so enrolled rows become completed and linked targets become inactive. Never bypass by directly deleting a target row.

- [x] **Step 7: Run GREEN and contract gate**

```bash
npm --prefix backend test -- --runInBand src/modules/classes/classes.service.spec.ts src/modules/sections/sections.service.spec.ts src/modules/roster-import/roster-import.service.spec.ts
npm --prefix backend run contract:admin
```

Expected: focused suites and the admin contract gate exit 0.

- [x] **Step 8: Commit the school-data slice**

```bash
git add backend/src/modules/classes backend/src/modules/sections backend/src/modules/roster-import
git commit -m "feat(admin): relax demo school data workflows"
```

---

### Task 5: Academic-window and governed-lifecycle composition

**Files:**

- Modify: `backend/src/modules/academic-state/academic-policy.service.ts`
- Modify: `backend/src/modules/academic-state/academic-policy.service.spec.ts`
- Modify: `backend/src/modules/academic-state/academic-repair.service.ts`
- Modify: `backend/src/modules/assessments/assessments.service.ts`
- Modify: `backend/src/modules/assessments/assessments.service.spec.ts`
- Modify: `backend/src/modules/class-record/class-record.service.ts`
- Modify: `backend/src/modules/class-record/class-record.service.spec.ts`
- Modify: `backend/src/modules/class-record/class-record-roster.service.ts`
- Modify: `backend/src/modules/class-record/class-record-sync.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.ts`
- Modify: `backend/src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts`

**Interfaces:**

- `assertAssessmentAction(assessment, action, existingAttempt, actor?)` accepts optional `{ userId, roles }`.
- Demo relaxation applies only to admin `prepare`, `release`, and `grade` actions.
- Lifecycle execution availability becomes `adminLifecycle.enabled || demo.allows('governed_execution_availability')`.

- [x] **Step 1: Add RED tests for actor-scoped academic behavior**

```ts
await expect(
  service.assertAssessmentAction(historicalAssessment, 'prepare', false, {
    userId: ADMIN_ID,
    roles: ['admin'],
  }),
).resolves.toBeDefined();
```

Add paired cases proving the same request rejects for teacher, student, expired mode, and unavailable mode. Prove invalid policy period, finalized/locked workbook, assessment attempts, immutable assessment type, and score caps still reject under active mode.

- [x] **Step 2: Add lifecycle availability RED tests**

Prove active Demo mode can pass the execution-availability gate while `ADMIN_LIFECYCLE_ENABLED=false`, but still requires current password, fresh matching manifest, exact confirmations, safe manifest, idempotency, and evidence-aware purge.

- [x] **Step 3: Run RED**

```bash
npm --prefix backend test -- --runInBand src/modules/academic-state/academic-policy.service.spec.ts src/modules/assessments/assessments.service.spec.ts src/modules/class-record/class-record.service.spec.ts src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts
```

- [x] **Step 4: Pass actor context through existing service boundaries**

Construct actor context from the already-authenticated `currentUser`/`roles`. Do not add a request header or body field. Let `AcademicPolicyService` validate that the period exists before considering the admin relaxation. Student `view`, `start`, and `complete` never receive the relaxation.

- [x] **Step 5: Keep workbook/evidence guards after policy resolution**

The assessment and class-record services continue to check record status and attempts after the policy window check. Add Demo audit metadata to their existing audit calls when the academic window was the only bypass.

- [x] **Step 6: Compose lifecycle availability only**

Replace the operational flag condition with:

```ts
const demo = await this.adminDemoMode.resolveForActor(actorId, ['admin']);
if (
  !this.configService.get<boolean>('adminLifecycle.enabled') &&
  !demo.allows('governed_execution_availability')
) {
  throw existingUnavailableError;
}
```

Leave every line after that gate—password, claim, transaction, manifest evidence, apply, notification, audit, result, and failure persistence—intact.

- [x] **Step 7: Run GREEN**

```bash
npm --prefix backend test -- --runInBand src/modules/academic-state/academic-policy.service.spec.ts src/modules/assessments/assessments.service.spec.ts src/modules/class-record/class-record.service.spec.ts src/modules/admin-lifecycle/admin-lifecycle.service.spec.ts
```

Expected: all focused suites exit 0 with paired normal/Demo cases.

- [x] **Step 8: Commit the academic composition slice**

```bash
git add backend/src/modules/academic-state backend/src/modules/assessments backend/src/modules/class-record backend/src/modules/admin-lifecycle
git commit -m "feat(admin): compose demo mode with academic policies"
```

---

### Task 6: Web contract, shared status, banner, and settings route

**Files:**

- Create: `next-frontend/src/types/admin-demo-mode.ts`
- Create: `next-frontend/src/services/admin-demo-mode-service.ts`
- Create: `next-frontend/src/providers/AdminDemoModeProvider.tsx`
- Create: `next-frontend/src/providers/AdminDemoModeProvider.test.tsx`
- Create: `next-frontend/src/components/admin/AdminDemoModeBanner.tsx`
- Create: `next-frontend/src/components/admin/AdminDemoModeBanner.test.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/demo-mode/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/system-settings/demo-mode/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/layout.tsx`
- Modify: `next-frontend/src/components/admin/system-settings/SystemSettingsShell.tsx`
- Modify: `next-frontend/src/components/admin/system-settings/SystemSettingsShell.test.tsx`

**Interfaces:**

- `useAdminDemoMode()` returns `{ status, loading, error, refresh, activate, deactivate, mutating }`.
- Provider mounts only for the admin shell, refetches on window focus and every 30 seconds, and uses backend `serverTime`/`expiresAt` for display.

- [x] **Step 1: Write provider and banner RED tests**

Prove: active renders one compact notice and Manage link; disabled/expired renders no global banner; role non-admin makes no request; focus refetches; 30-second poll refetches; API error does not claim disabled; expiry removes the active banner on the next local tick/refetch.

- [x] **Step 2: Write route RED tests**

Cover available-disabled, unavailable, active, expired, loading, API error, wrong password, stale version, and deactivation. Assert the Activate button remains disabled until all fields match. Assert password is cleared after every submission result.

- [x] **Step 3: Run RED**

```bash
npm --prefix next-frontend test -- --runInBand src/providers/AdminDemoModeProvider.test.tsx src/components/admin/AdminDemoModeBanner.test.tsx 'app/(dashboard)/dashboard/admin/system-settings/demo-mode/page.test.tsx' src/components/admin/system-settings/SystemSettingsShell.test.tsx
```

Expected: FAIL because new contract and route are absent.

- [x] **Step 4: Implement the typed service**

```ts
export const adminDemoModeService = {
  getStatus: () => api.get<ApiEnvelope<AdminDemoModeStatus>>('/admin/demo-mode'),
  activate: (payload: ActivateAdminDemoMode) =>
    api.post<ApiEnvelope<AdminDemoModeStatus>>('/admin/demo-mode/activate', payload),
  deactivate: (payload: DeactivateAdminDemoMode) =>
    api.post<ApiEnvelope<AdminDemoModeStatus>>('/admin/demo-mode/deactivate', payload),
};
```

Normalize axios responses inside the service so components receive `data.data` consistently.

- [x] **Step 5: Implement provider and shell banner**

Wrap admin children inside `AdminDemoModeProvider` in the existing dashboard layout and render `AdminDemoModeBanner` immediately above admin page content. Do not affect teacher/student shells or auth redirects.

- [x] **Step 6: Implement the settings route**

Use existing admin fields, checkboxes, and button/dialog primitives. Keep relaxed and protected lists visible. Use `aria-live` for status/error, associate every field, return focus after confirmation, support 390px without horizontal scrolling, and honor reduced motion.

- [x] **Step 7: Add route-backed navigation**

Add `Demo mode` under `Advanced` in `SystemSettingsShell` with a flask/shield icon. Existing browser Back/Forward and mobile select navigation stay source-aware.

- [x] **Step 8: Run GREEN, lint, and typecheck**

```bash
npm --prefix next-frontend test -- --runInBand src/providers/AdminDemoModeProvider.test.tsx src/components/admin/AdminDemoModeBanner.test.tsx 'app/(dashboard)/dashboard/admin/system-settings/demo-mode/page.test.tsx' src/components/admin/system-settings/SystemSettingsShell.test.tsx
npm --prefix next-frontend run lint
npm --prefix next-frontend run typecheck
```

- [x] **Step 9: Commit the web feature surface**

```bash
git add next-frontend/src/types/admin-demo-mode.ts next-frontend/src/services/admin-demo-mode-service.ts next-frontend/src/providers/AdminDemoModeProvider.tsx next-frontend/src/providers/AdminDemoModeProvider.test.tsx next-frontend/src/components/admin/AdminDemoModeBanner.tsx next-frontend/src/components/admin/AdminDemoModeBanner.test.tsx 'next-frontend/app/(dashboard)/layout.tsx' 'next-frontend/app/(dashboard)/dashboard/admin/system-settings/demo-mode' next-frontend/src/components/admin/system-settings
git commit -m "feat(admin): add web demo mode controls"
```

---

### Task 7: Web forms stop enforcing relaxed rules locally

**Files:**

- Modify: `next-frontend/src/components/admin/ClassForm.tsx`
- Modify: `next-frontend/src/components/admin/ClassForm.test.tsx`
- Modify: `next-frontend/src/components/admin/SectionForm.tsx`
- Modify: `next-frontend/src/components/admin/SectionForm.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/classes/new/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/classes/new/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/new/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/sections/new/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx`
- Create: `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/edit/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.test.tsx`

**Interfaces:**

- Consumes `useAdminDemoMode().status.active` and the relaxed rule codes.
- UI relaxation is advisory; backend remains authoritative if status expires before submit.

- [x] **Step 1: Write RED form tests**

Assert normal mode preserves every current disabled option. Under active Demo mode, conflicting schedule, room, adviser, and assigned teacher choices remain visibly annotated but selectable. Historical section/year choices become available only when they remain class/section-consistent. Required room/schedule/teacher/section fields remain required. Add archived-class cases proving Demo mode exposes `Restore class` while normal mode keeps archived classes terminal. Add user-detail cases proving editing a DELETED account and direct Archive/Reactivate become available only in Demo mode while permanent purge keeps full-name confirmation and the DELETED prerequisite.

- [x] **Step 2: Run RED**

```bash
npm --prefix next-frontend test -- --runInBand src/components/admin/ClassForm.test.tsx src/components/admin/SectionForm.test.tsx 'app/(dashboard)/dashboard/admin/classes/new/page.test.tsx' 'app/(dashboard)/dashboard/admin/classes/[id]/page.test.tsx' 'app/(dashboard)/dashboard/admin/users/[id]/page.test.tsx'
```

- [x] **Step 3: Use capability checks, not one broad UI boolean**

```ts
const canRelax = (rule: AdminDemoModeRule) =>
  status?.active === true &&
  status.relaxedRules.some((entry) => entry.code === rule);
```

Use the matching capability for each option. Keep conflict labels such as `(conflict allowed in Demo mode)` so the user sees the consequence.

- [x] **Step 4: Preserve failure recovery**

If the backend returns the existing conflict because mode expired, keep all entered form values, refresh status, and show the server message. Do not silently retry the mutation.

- [x] **Step 5: Run GREEN**

```bash
npm --prefix next-frontend test -- --runInBand src/components/admin/ClassForm.test.tsx src/components/admin/SectionForm.test.tsx 'app/(dashboard)/dashboard/admin/classes/new/page.test.tsx' 'app/(dashboard)/dashboard/admin/classes/[id]/page.test.tsx' 'app/(dashboard)/dashboard/admin/users/[id]/page.test.tsx'
```

- [x] **Step 6: Commit the web consumer alignment**

```bash
git add next-frontend/src/components/admin/ClassForm.tsx next-frontend/src/components/admin/ClassForm.test.tsx next-frontend/src/components/admin/SectionForm.tsx next-frontend/src/components/admin/SectionForm.test.tsx 'next-frontend/app/(dashboard)/dashboard/admin/classes' 'next-frontend/app/(dashboard)/dashboard/admin/sections' 'next-frontend/app/(dashboard)/dashboard/admin/users/[id]'
git commit -m "feat(admin): align web forms with demo capabilities"
```

---

### Task 8: Mobile contract, settings stack, active notice, and offline behavior

**Files:**

- Create: `mobile/src/types/admin-demo-mode.ts`
- Create: `mobile/src/api/services/admin-demo-mode.ts`
- Create: `mobile/src/api/__tests__/admin-demo-mode-contract.test.ts`
- Create: `mobile/src/hooks/useAdminDemoMode.ts`
- Create: `mobile/src/components/admin/AdminDemoModeNotice.tsx`
- Create: `mobile/src/screens/AdminDemoModeSettingsScreen.tsx`
- Create: `mobile/src/screens/__tests__/admin-demo-mode-settings.test.tsx`
- Modify: `mobile/src/components/admin/AdminMobilePrimitives.tsx`
- Modify: `mobile/src/components/admin/AdminPaginatedList.tsx`
- Modify: `mobile/src/components/admin/__tests__/AdminMobilePrimitives.test.tsx`
- Modify: `mobile/src/screens/AdminSettingsOverviewScreen.tsx`
- Modify: `mobile/src/screens/__tests__/admin-settings-workspaces.test.ts`
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/navigation/__tests__/admin-route-manifest.test.ts`

**Interfaces:**

- Query key `['admin-demo-mode']` is shared across all admin screens.
- `AdminSettingsDemoMode: undefined` is a native stack route.
- Mutations are disabled when offline and never queued.

- [x] **Step 1: Write contract/navigation RED tests**

Assert exact paths and request payloads, response typing, new stack route, settings row navigation, header/hardware Back compatibility, and no new drawer destination.

- [x] **Step 2: Write screen/primitive RED tests**

Cover loading, unavailable, disabled, active, expired, wrong password, stale version refresh, disabled-offline writes, cached status label, password clearing, and notice rendering in both `AdminScreen` and `AdminPaginatedList`.

- [x] **Step 3: Run RED**

```bash
npm --prefix mobile test -- --runInBand admin-demo-mode admin-settings-workspaces AdminMobilePrimitives admin-route-manifest
```

- [x] **Step 4: Implement service and shared query**

Use authenticated `apiClient`, the same types/codes as web, `staleTime: 30_000`, and refetch on app focus. Activation/deactivation invalidate `['admin-demo-mode']` and affected admin list/detail query prefixes.

- [x] **Step 5: Implement the native settings screen**

Use `AdminScreen`, `AdminNotice`, `AdminSection`, `AdminField`, `AdminChip`, and `AdminButton`. Use secure password input, multiline reason capped at 240, duration chips, three explicit acknowledgement controls, typed phrase, and a final native confirmation alert. Do not store the password in React Query or async storage.

- [x] **Step 6: Add the shared active notice**

Render `AdminDemoModeNotice` below the compact header in `AdminScreen` and above the list header in `AdminPaginatedList`. It renders only for effective active state, shows time remaining and a Manage action, and labels cached/offline state.

- [x] **Step 7: Add stack navigation**

Add the route to `RootStackParamList`, register it in `AdminNavigator`, and add the System Settings row. Keep the drawer inventory unchanged because Demo mode is a subtask of System Settings.

- [x] **Step 8: Run GREEN and typecheck**

```bash
npm --prefix mobile test -- --runInBand admin-demo-mode admin-settings-workspaces AdminMobilePrimitives admin-route-manifest
npm --prefix mobile run typecheck
```

- [x] **Step 9: Commit the mobile feature surface**

```bash
git add mobile/src/types/admin-demo-mode.ts mobile/src/api/services/admin-demo-mode.ts mobile/src/api/__tests__/admin-demo-mode-contract.test.ts mobile/src/hooks/useAdminDemoMode.ts mobile/src/components/admin mobile/src/screens/AdminDemoModeSettingsScreen.tsx mobile/src/screens/AdminSettingsOverviewScreen.tsx mobile/src/screens/__tests__ mobile/src/navigation
git commit -m "feat(admin): add mobile demo mode controls"
```

---

### Task 9: Mobile forms honor capabilities without weakening offline safety

**Files:**

- Modify: `mobile/src/screens/AdminClassesWorkspaceScreen.tsx`
- Modify: `mobile/src/screens/AdminSectionsScreen.tsx`
- Modify: `mobile/src/screens/AdminRosterScreen.tsx`
- Modify: `mobile/src/screens/AdminUserDetailScreen.tsx`
- Modify: `mobile/src/screens/__tests__/admin-school-setup-contract.test.ts`
- Modify: `mobile/src/screens/__tests__/admin-workspace-contract.test.ts`

**Interfaces:**

- Consumes `useAdminDemoMode()` and exact relaxed rule codes.
- Existing APIs and query invalidation remain unchanged.

- [x] **Step 1: Write RED UI cases**

Prove conflicts remain explained but selectable when their capability is active. Prove archived-class Restore appears only in active Demo mode. Prove a DELETED user can be edited/reactivated only in Demo mode while purge confirmation remains unchanged. Prove required fields, valid times, role/grade requirements, exact lifecycle confirmation, and offline disabled state remain in both modes.

- [x] **Step 2: Run RED**

```bash
npm --prefix mobile test -- --runInBand admin-school-setup admin-workspace-contract
```

- [x] **Step 3: Implement capability-aware controls**

Use the server rule list; never infer capability from the word `active` alone. Add one concise `AdminNotice` inside an expanded form when a conflicting selection is being permitted. Preserve entered values when a mode-expiry backend conflict occurs.

- [x] **Step 4: Run GREEN**

```bash
npm --prefix mobile test -- --runInBand admin-school-setup admin-workspace-contract
npm --prefix mobile run typecheck
```

- [x] **Step 5: Commit the mobile consumer alignment**

```bash
git add mobile/src/screens/AdminClassesWorkspaceScreen.tsx mobile/src/screens/AdminSectionsScreen.tsx mobile/src/screens/AdminRosterScreen.tsx mobile/src/screens/AdminUserDetailScreen.tsx mobile/src/screens/__tests__/admin-school-setup-contract.test.ts mobile/src/screens/__tests__/admin-workspace-contract.test.ts
git commit -m "feat(admin): align mobile forms with demo capabilities"
```

---

### Task 10: Cross-surface contract and end-to-end regression coverage

**Files:**

- Modify: `scripts/check-admin-client-contracts.cjs`
- Modify: `scripts/check-admin-client-contracts.test.cjs`
- Create or modify: `backend/test/admin-demo-mode.e2e-spec.ts`
- Create or modify: `next-frontend/tests/e2e/admin-demo-mode.spec.ts`
- Modify: `.github/workflows/ci.yml` only if existing file globs do not automatically include the new migration/tests

**Interfaces:**

- The contract gate verifies backend DTO/controller paths plus matching web/mobile types/services.
- E2E proves server ownership, role isolation, expiry, and immediate restoration.

- [x] **Step 1: Add contract-gate RED cases**

Require the three endpoint paths, exact activation fields, exact rule code literals, web service, mobile service, web route, and mobile route. Require absence of `demo=true`, `X-Demo-Mode`, or equivalent client-authoritative bypass patterns.

- [x] **Step 2: Add backend E2E**

With an isolated seeded database and fixed/short expiry:

1. Teacher/student GET/POST requests return `403`.
2. Admin invalid activation variants return their exact status.
3. Valid activation returns active state and version increment.
4. One normally blocked reversible class or section operation succeeds and is audited.
5. One permanent safeguard remains blocked.
6. Expiry or deactivation makes the original normal guard reject again.

- [x] **Step 3: Add Playwright E2E without destructive production assumptions**

Against local seeded services, log in as admin, open the route, validate activation form gating, activate a short window, observe the global banner on Users and Classes, return via browser history, deactivate, and confirm the banner disappears. Test 1440x900 and 390x844.

- [x] **Step 4: Run focused cross-surface tests**

```bash
node --test scripts/check-admin-client-contracts.test.cjs
npm --prefix backend run contract:admin
npm --prefix backend run test:e2e -- --runInBand admin-demo-mode.e2e-spec.ts
npm --prefix next-frontend run test:e2e -- admin-demo-mode.spec.ts
```

Expected: all exit 0; Playwright artifacts remain untracked.

- [x] **Step 5: Commit cross-surface proof**

```bash
git add scripts/check-admin-client-contracts.cjs scripts/check-admin-client-contracts.test.cjs backend/test/admin-demo-mode.e2e-spec.ts next-frontend/tests/e2e/admin-demo-mode.spec.ts .github/workflows/ci.yml
git commit -m "test(admin): cover demo mode across clients"
```

---

### Task 11: Full verification and final code review

**Files:**

- Modify only task-owned files if a task-caused failure is found.
- Update this plan’s checkboxes as evidence is completed.

**Interfaces:**

- Every check is tied to the unchanged implementation input before packaging.

- [ ] **Step 1: Run backend gates**

```bash
npm --prefix backend run lint
npm --prefix backend test -- --runInBand
npm --prefix backend run test:e2e -- --runInBand
npm --prefix backend run build
npm --prefix backend run test:production-start
```

Expected: all commands exit 0 within the repository warning budget.

- [ ] **Step 2: Run web gates**

```bash
npm --prefix next-frontend run lint
npm --prefix next-frontend run typecheck
npm --prefix next-frontend test -- --runInBand
npm --prefix next-frontend run build
npm --prefix next-frontend run dev:smoke
```

Expected: all commands exit 0.

- [ ] **Step 3: Run mobile gates**

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand
npm --prefix mobile run test:release
```

Expected: all commands exit 0.

- [ ] **Step 4: Run migration/runtime checks**

Run the repository’s fresh and legacy migration rehearsal used by CI for PostgreSQL/pgvector. At minimum, `npm --prefix backend run check:migrations` and a disposable-database `node backend/run-migrations.js` must prove `0021` applies and replays safely. Never point a destructive rehearsal at production.

- [ ] **Step 5: Review the complete diff against the design**

Check every relaxed code has one owner and paired active/inactive tests. Search for unintended broad bypasses:

```bash
rg -n "demo.*(return|skip|bypass)|if \(.*demo" backend/src next-frontend mobile/src
git diff --check
git status --short
git diff --stat HEAD~10..HEAD
```

Manually verify that all permanent-rule tests remain present and no credentials, `.env`, reports, screenshots, `test-results/`, or `playwright-report/` are tracked.

- [ ] **Step 6: Fix only task-caused failures and rerun affected plus mandatory gates**

Do not weaken warning budgets, skip tests, or expand into unrelated cleanup.

- [ ] **Step 7: Commit verification-only corrections if needed**

```bash
git add backend/src/modules/admin-demo-mode next-frontend/src/providers/AdminDemoModeProvider.tsx mobile/src/hooks/useAdminDemoMode.ts
git commit -m "fix(admin): close demo mode verification gaps"
```

Stage only whichever listed task-owned paths were actually corrected; omit unchanged paths. Skip this commit when no corrections are required.

---

### Task 12: Android packaging and artifact integrity

**Files:**

- Modify through release tooling: `mobile/app.json`
- Modify through release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify through release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Modify any adjacent release metadata selected by `mobile/scripts/app-version-release.cjs`.

**Interfaces:**

- Consumes the verified mobile source and production API URL.
- Produces the next Android `versionCode` after 33, matching semantic version, release APK, byte size, SHA-256, and manifest.

- [ ] **Step 1: Read and follow finish-and-ship mobile packaging instructions**

Confirm the current version, release script behavior, JDK 17, Android SDK, signing configuration, ABI target, and production API/WS URLs before changing version metadata.

- [ ] **Step 2: Prepare the monotonic release**

Run the repository release preparation command from `mobile/`; require the next code to be greater than 33. Do not modify the iOS `buildNumber`.

- [ ] **Step 3: Build the exact production APK**

Use:

```bash
export ANDROID_HOME=/home/jethro/Android/Sdk
export JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7
export NODE_ENV=production
export EXPO_NO_DOTENV=1
export EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api
cd mobile
./android/gradlew --no-daemon --stacktrace assembleRelease
```

The JDK path is currently verified as Temurin 17.0.10+7. Re-run `/home/jethro/.jdks/jdk-17.0.10+7/bin/java -version` immediately before packaging and stop packaging if that executable no longer reports Java 17.

- [ ] **Step 4: Publish locally and verify artifact metadata**

Use `npm run release:prepare`/`release:verify` exactly as documented by the current script. Verify `aapt dump badging`, byte size, SHA-256, package name, version code/name, ABI, signing certificate, embedded production URL, served-copy equality, and JSON metadata consistency.

- [ ] **Step 5: Rerun mobile and frontend checks invalidated by packaging**

```bash
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand
npm --prefix mobile run test:release
npm --prefix next-frontend run build
```

- [ ] **Step 6: Commit the release artifact**

```bash
git add mobile/app.json next-frontend/public/downloads
git commit -m "chore(mobile): package admin demo mode release"
```

---

### Task 13: Ship exact revision and observe CI/Railway

**Files:**

- No source edits after final verification unless a failure is diagnosed and fixed with the affected checks rerun.

**Interfaces:**

- Exact pushed SHA must be the CI-tested and Railway-deployed SHA.

- [ ] **Step 1: Read and follow finish-and-ship release instructions and the Railway skill**

Resolve the current Railway project, production environment, backend/frontend services, GitHub repository, and workflow names from live tools. Do not rely only on old IDs.

- [ ] **Step 2: Pre-push evidence**

```bash
git status --short
git diff --check
git log --oneline --decorate -12
git rev-list --left-right --count origin/developement...HEAD
git rev-parse HEAD
```

Require a clean working tree and understand every outgoing commit.

- [ ] **Step 3: Push the reviewed current checkout**

```bash
git push origin developement
git fetch origin developement
git rev-parse HEAD
git rev-parse origin/developement
git rev-list --left-right --count origin/developement...HEAD
```

Require local SHA equals remote SHA and divergence is `0 0`.

- [ ] **Step 4: Observe exact-SHA CI**

Find the GitHub Actions run whose `headSha` equals the pushed SHA. Require backend unit/lint, backend E2E, PostgreSQL 16/18 migration/runtime, frontend build/security, mobile release/type/test, AI service, contract, and deployment gates to reach terminal success. A successful older run is not evidence.

- [ ] **Step 5: Observe exact-SHA Railway deployment**

Require backend and frontend deployments for the pushed SHA to reach terminal `SUCCESS`, then verify backend `/api/health/live`, `/api/health/ready`, frontend `/`, and the protected login route without exposing secrets.

- [ ] **Step 6: Enable production availability after healthy migration**

Set `ADMIN_DEMO_MODE_AVAILABLE=true` on the backend production service without printing other variables. Wait for the resulting deployment to reach terminal `SUCCESS`; recheck live/ready health. If this deployment fails, set the variable false before diagnosis.

- [ ] **Step 7: Register and verify the Android updater record**

Use Railway-injected admin secret without printing it. Register the committed APK manifest, then verify old version gets the intended update policy, the new version gets `none`, and live APK URL bytes/SHA match the committed artifact exactly.

---

### Task 14: Live web and Android acceptance, cleanup, and final proof

**Files:**

- No tracked edits unless acceptance finds a task-caused defect.

**Interfaces:**

- Uses the supplied admin credentials through the login UI only.
- Leaves production Demo mode disabled and test data unchanged/removed.

- [ ] **Step 1: Web login and inactive baseline**

Open the deployed frontend in the browser, log in with the supplied administrator account, navigate to System Settings → Demo mode, and confirm status is disabled and the global banner is absent. Do not expose credentials in logs, screenshots, source, or final output.

- [ ] **Step 2: Validate activation safeguards**

Confirm the action is disabled with missing reason, acknowledgement, password, phrase, or duration. Submit one deliberately wrong password and verify a safe field error with no state change.

- [ ] **Step 3: Activate the shortest production window**

Use a 15-minute duration and reason `Automated post-release Demo mode acceptance`. Complete all acknowledgements and exact phrase. Confirm active status, server-derived expiry, banner on System Settings, Users, Classes, and Sections, and the Manage link’s source-aware navigation.

- [ ] **Step 4: Observe one relaxed control without changing real academic data**

Open a class/section form and confirm a known conflict is now annotated/selectable. Do not submit a mutation against existing production academic records. Backend E2E supplies mutation proof; live acceptance supplies UI/deployment proof.

- [ ] **Step 5: Disable immediately and prove restoration**

Return to the Demo route, type `DISABLE DEMO MODE`, deactivate, and confirm the banner disappears across pages and the previously relaxed control returns to normal disabled behavior. Refresh the browser and re-query status to prove disabled state is durable.

- [ ] **Step 6: Android/emulator acceptance**

Run `/home/jethro/Android/Sdk/platform-tools/adb devices -l`. If a target exists, install the exact release APK, log in, open System Settings → Demo mode, repeat active-notice and deactivate checks, and record package/version/device evidence. If no target exists, report Android build/artifact proof and the missing device boundary separately; do not infer physical acceptance.

- [ ] **Step 7: Final cleanup checks**

Confirm Demo mode is disabled through API/UI, no disposable production records were created, the working tree is clean, divergence is `0 0`, and final local/remote SHA still matches the CI/deployed SHA. Ensure local browser/test output remains untracked.

- [ ] **Step 8: Complete the active goal only after evidence is final**

Summarize for a beginner: the safety conflict, chosen rule catalog, backend contract, web/mobile experience, checks, commit/branch, exact-SHA CI, Railway deployments, APK link/version/hash/signing, live browser evidence, and any explicit device limitation. Mark the goal complete only when no required outcome remains.
