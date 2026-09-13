# Admin Safeguard System Isolation Analysis

**Date:** 2026-09-13

**Repository baseline:** `developement` at `99fb82e0a61910dd7764c9a50c59669b602dfacf`

**Method:** static, full-depth source and contract analysis; no code, configuration, schema, data, deployment, or Git mutation was performed.
**Decision being prepared:** retire the existing admin-specific safeguard policy and build a simpler replacement without creating an unguarded production interval or deleting academic evidence.

## Evidence vocabulary

- **Confirmed** — directly supported by inspected source, schema, tests, or current repository documentation.
- **Inferred** — a consequence strongly implied by confirmed relationships but not executed against a live runtime or database.
- **Unverified** — requires runtime state, deployed configuration, database contents, or an external consumer inventory that was outside this analysis.
- Effects are classified as **direct**, **transitive**, **operational**, **dormant**, or **uncertain**.

## 1. Executive verdict

### Verdict

The current “admin safeguards” are not one removable feature. They are three overlapping control planes plus database constraints:

1. **Legacy service guards** embedded in `UsersService`, `SectionsService`, `ClassesService`, `RosterImportService`, `AcademicPolicyService`, profile services, and class-record services.
2. **Governed Admin Lifecycle**, which adds preview manifests, password step-up, exact confirmations, idempotency, serialized transactions, audit records, lifecycle events, and impact-aware student/class/section/purge planners.
3. **Admin Demo Mode**, a second policy plane that selectively bypasses some legacy and lifecycle rules while declaring other rules permanently protected.
4. **Database integrity and evidence constraints**, including foreign keys, unique indexes, status checks, retained academic records, and append-only operation/event tables.

**Coupling rating: High — Confirmed.** The behavior crosses backend, web admin, mobile admin, teacher clients that share endpoints, PostgreSQL state, global guards, reset tooling, and test contracts.

**Complete removability: No — Confirmed for the current architecture.** Removing every layer would also remove authentication/RBAC, evidence retention, transaction serialization, and protections used by teacher-facing routes. Those are architectural invariants, not replaceable admin policy.

**Admin-policy replaceability: Yes, with a staged cutover — Inferred.** The replaceable target is the current *decision policy*: scattered legacy blockers, the Admin Demo Mode bypass catalog, and the student/class/section lifecycle planning rules. The reusable shell is the governed execution machinery: preview hash, revalidation, password step-up, exact confirmation, idempotency, academic transaction lock, append-only lifecycle record, audit link, and post-commit handling.

### Recommended boundary

| Boundary | Recommendation | Reason |
|---|---|---|
| Authentication, Admin role checks, DTO/content validation, self-account protection | **Keep** | Security boundary shared by all admin mutations. |
| Database FKs/checks/uniqueness and official/finalized academic evidence | **Keep and strengthen** | Last line of defense against orphaning and silent evidence loss. |
| Academic transaction/advisory lock, preview hash, stale-state rejection, idempotency | **Keep as infrastructure** | Prevents race conditions, double execution, and approval of an outdated impact set. |
| Audit records and enrollment lifecycle history | **Keep/migrate, never truncate as cleanup** | They are evidence produced by earlier operations and referenced by reset/retention logic. |
| Existing student/class/section/purge planners and scattered admin business blockers | **Replace behind one policy interface** | They are the tangled rule set the user wants to restart. |
| Admin Demo Mode and its UI/provider/hooks | **Retire completely** | It creates a cross-cutting bypass plane and contradictory semantics. |
| Dormant destructive legacy routes | **Deprecate, return an explicit compatibility response, then remove** | They bypass or duplicate the governed path and can be rediscovered by old/external clients. |
| Teacher ownership and mutation rules | **Leave outside the reset** | Some teacher actions share the same endpoints; global guard deletion would silently expand teacher authority. |

### Central recommendation

Create one backend-owned **Admin Maintenance Gateway** backed by an `AdminMutationPolicy` seam. Every admin mutation first receives a structured decision such as `READY`, `AUTO_RESOLVABLE`, `NEEDS_CHOICE`, `OVERRIDABLE_WARNING`, or `IMMUTABLE`, with stable reason codes, suggested next actions, and an impact description. Initially the gateway adapts the current services and governed lifecycle; then a smaller policy catalog runs in shadow mode and replaces the old rules. Remove Demo Mode only after clients use the gateway. This is a front-door replacement: coworkers receive the easier workflow before the old guard branches are physically removed.

### Confirmed product constraint

The user has explicitly chosen that **finalized grades and audit history remain immutable during ordinary coworker manipulation**. This reduces the new hard-stop catalog to a defensible core. Routine student, roster, class, section, schedule, capacity, room, adviser, year, and account-lifecycle problems should be automatically reconciled, presented as an overridable warning, or redirected to an evidence-preserving correction. They should not appear as unexplained failed actions. Finalized grade values, their source evidence, audit logs, and append-only lifecycle history remain non-destructive.

The user has explicitly confirmed that **Full Reset means a complete reset**. It is the deliberate exception to ordinary immutability and may clear live finalized grades, other school data, and every coworker account except the initiating administrator. Audit/recovery history and required system essentials remain preserved because they are outside live school data and are necessary to prove that the reset occurred. No per-record academic safeguard should obstruct the reset once its dedicated preview, authorization, coordination, and verification contract succeeds.

### What must not happen

A “temporarily disable all safeguards” release is unsafe. It would create an interval in which a class removal could rewrite a roster around finalized records, a section archive could silently mark every membership completed, a user purge could be blocked or cascade differently depending on retained rows, and shared teacher endpoints could inherit admin-level freedom. The cutover must never pass through an unguarded state.

## 2. Feature anatomy

### 2.1 Control-flow anatomy

```text
Web admin / Mobile admin / Teacher clients
        |
        +-- legacy public routes -------------------------------+
        |                                                       |
        |   UsersService / SectionsService / ClassesService     |
        |   Profiles / RosterImport / AcademicPolicy            |
        |           |                                           |
        |           +-- scattered hard checks                   |
        |           +-- Admin Demo Mode rule lookups --------+  |
        |                                                    |  |
        +-- /admin/lifecycle preview + execute               |  |
                    |                                       |  |
                    +-- student/class/section/purge planner  |  |
                    +-- Demo availability bypass -----------+  |
                    +-- password + confirmations + hash         |
                    +-- idempotent academic transaction         |
                    +-- audit + lifecycle event                  |
                                                                |
             PostgreSQL constraints and retained evidence <-----+
```

The difficulty comes from duplicated policy responsibility. A rule may exist in a direct service, a lifecycle planner, Demo Mode’s relaxed/protected catalog, a UI precondition, and a database constraint, with similar wording but different semantics.

### 2.2 Entry points and ownership

| Surface | Confirmed entry points | Current behavior |
|---|---|---|
| Governed admin lifecycle | `AdminLifecycleController` under `/admin/lifecycle`; web `AdminLifecycleDialog`; mobile `AdminLifecycleReviewScreen` | Preview first, render effects/preserved records, require confirmations/password, then execute with manifest hash and idempotency key. |
| Admin Demo Mode | `AdminDemoModeController` under `/admin/demo-mode`; web provider/settings/banner; mobile hook/settings screen | Activates a time-limited database-backed state and allows named relaxed rule codes. Defaults to unavailable unless configured. |
| User lifecycle | `UsersController` plus `UsersService.softDeleteUser`, `reactivateUser`, `purgeUser`, and legacy `deleteUser` | Direct status/lifecycle guards; selected sequencing can be relaxed by Demo Mode. Purge is not implemented by the governed purge planner. |
| Section roster | Direct `DELETE /sections/:id/roster/:studentId`; governed student resolution from admin roster UI | Admin web normally opens lifecycle review, while teacher web/mobile still call the direct route. |
| Class roster | Direct `DELETE /classes/:classId/enrollments/:studentId`; governed class/student lifecycle elsewhere | Admin class-detail removal still uses the direct route and can be blocked by class-record editability. |
| Class/section archive and deletion | Direct toggle/archive services plus governed class/section lifecycle and purge | Overlapping paths have different definitions of “complete”, “withdraw”, “archive”, and “purge”. |
| Academic/profile changes | `AcademicPolicyService`, `assertGradeLevelChangeAllowed`, class-record editability | Blocks admin changes based on year/period, active memberships, and finalized/locked official records. |
| Roster import | `RosterImportService` preview/commit | File, identity, role, grade, duplication, academic-window, and capacity checks; only selected rules are Demo-relaxable. |

### 2.3 Safeguard classes

| Class | Examples | Replaceability | Evidence status |
|---|---|---|---|
| Security boundary | JWT, Admin role, self-account protection, current-password step-up | Not part of policy reset | Confirmed |
| Input/identity integrity | DTO validation, UUID/enums, unique email/LRN, teacher/student role checks | Keep; normalize error codes | Confirmed |
| Academic evidence integrity | finalized/locked class records, attempts/scores/grades, append-only events | Keep; expose impact clearly | Confirmed |
| Concurrency/execution integrity | advisory lock, transaction, preview hash, idempotency, optimistic version | Keep as reusable shell | Confirmed |
| Replaceable admin business policy | active-year windows, capacity, membership sequence, archive prerequisites, transfer compatibility | Replace behind one seam | Confirmed |
| Temporary bypass policy | Demo Mode relaxed rule list and activation state | Retire | Confirmed |
| Client affordances | disabled buttons, lifecycle dialogs, demo banners/settings, generic errors | Replace after backend contract is stable | Confirmed |
| Database enforcement | foreign keys, checks, uniqueness, cascade/restrict actions | Keep unless a separately reviewed migration strengthens semantics | Confirmed |

### 2.4 Why the example actions are blocked

#### Move a student to another section

The governed path checks the source enrollment, active academic period, destination year and grade, destination capacity, duplicate membership, and compatible subject-class mapping. Its apply phase creates the destination membership, retires the source membership, updates current/future draft participant eligibility, and appends an enrollment lifecycle event. Removing only the front-end warning does not remove any backend decision. Removing only the planner would also remove the authoritative impact calculation needed for correct downstream roster changes.

#### Remove a student from a section

The direct section service blocks removal when the learner still has an active class enrollment and requires a section-only active row. Admin web generally converts this into a governed `CORRECT`, `WITHDRAW`, or `TRANSFER_SECTION` decision. Teacher clients use the direct endpoint. Therefore, weakening `removeStudentFromSection` globally affects teachers as well as admins.

#### Remove a student from a class

The direct class service captures the enrollment into the official class record before detaching it. `ClassRecordService.assertEditable` rejects edits to locked or finalized records. The admin class-detail page still calls this direct endpoint, which explains a dead-end “blocked by safeguards” experience even though a governed lifecycle system exists elsewhere.

#### Archive or permanently delete

Direct class/section archive methods can be blocked by active memberships. Demo Mode can bypass those blockers and mark active memberships `completed`; the governed lifecycle instead requires an explicit outcome per affected learner. Governed purge refuses deletion when retained evidence exists. Direct user purge follows a separate implementation whose outcome depends on the actual foreign-key graph and retained rows.

### 2.5 Persisted state and side effects

- `admin_lifecycle_operations` stores actor snapshot, action, target, status, idempotency key, manifest hash, reason/notes, result/failure, and an audit link. **Confirmed.**
- `enrollment_lifecycle_events` stores source/destination snapshots, outcome, academic period, reason/notes, and a restrictive link to the operation. **Confirmed.**
- `admin_demo_mode_states` stores the shared Demo Mode state/version/expiry. **Confirmed.**
- Core user, section, class, enrollment, class-record, score, attempt, and grade tables contain a mixture of `cascade`, `set null`, and `restrict` foreign keys. **Confirmed.**
- Notifications and other post-commit effects are durable/best-effort around a committed lifecycle operation; they are not the authority for whether the database mutation occurred. **Confirmed.**
- The system-reset catalog preserves lifecycle operation/event evidence while clearing Demo Mode state with account/session data. **Confirmed.** It is a data-reset feature, not a switch for disabling safeguards.

### 2.6 Why the current experience feels like a crash

Static source does not prove that the web page, mobile app, or NestJS process is actually crashing. The confirmed pattern is usually an **expected business conflict being presented as a stopped action**:

1. A direct admin button calls a mutation endpoint immediately.
2. A service throws `BadRequestException`, `ConflictException`, or `ForbiddenException` when it discovers linked state.
3. The client catches the response and shows a generic toast or notice.
4. The administrator receives no executable route from the failed action to the required correction.

For example, admin class removal calls `classService.unenrollStudent` and falls back to “Failed to remove student”; it does not open the lifecycle planner. The inspected service files contain many exception sites—42 in `UsersService`, 65 in `ClassesService`, 43 in `SectionsService`, 28 in `RosterImportService`, and 10 in `AcademicPolicyService`. These counts include valid non-admin and security checks, so they are evidence of a fragmented error channel, not a count of safeguards to delete.

The governed lifecycle is better structured but still stops short of resolution. Its contract includes `resolvable` and `resolutionOptions`. Web types preserve those fields, but `AdminLifecycleDialog` only prints blocker messages. Mobile shows a “Resolvable” label but does not turn `resolutionOptions` into actions. The backend therefore knows that a blocked correction could become `WITHDRAW`, `TRANSFER_SECTION`, or `ACADEMIC_REPAIR`, while the coworker must leave the dialog and manually discover another screen.

The current workflow also repeats high-friction evidence for every operation: reason, notes, every confirmation checkbox, and the current password. This is appropriate for purge and irreversible official changes, but unnecessarily heavy for a sequence of routine maintenance actions by the same authenticated coworker.

### 2.7 Fresh safeguard threshold

The replacement should classify conditions by what the system can safely do, not by whether the old service currently throws:

| Lane | Decision | Examples | Coworker experience |
|---|---|---|---|
| Green | `READY` | Correct names/contact data; move a learner with no linked academic work; edit draft class metadata; change capacity or schedule with no conflict | Show the planned change and apply directly within an authorized maintenance session. |
| Guided | `AUTO_RESOLVABLE` or `NEEDS_CHOICE` | Transfer a learner with linked classes; remove a draft enrollment; archive a class/section with active memberships; change grade level while active enrollment exists | Preselect the safe reconciliation. Ask only when mappings or real-world outcomes are ambiguous. Apply all dependencies atomically. |
| Warning | `OVERRIDABLE_WARNING` | Capacity overflow; schedule, room, or adviser collision; structural correction outside the active period | Explain the operational consequence, require a reason, then allow a properly scoped coworker to continue. Do not alter finalized evidence. |
| Protected | `IMMUTABLE` | Rewrite finalized grades; delete submitted evidence; delete audit/lifecycle history; purge an entity with retained official evidence | Do not mutate the source record. Offer an append-only correction, superseding record, withdrawal/transfer, archive, or no-op. |
| Security | HTTP `401/403` | Unauthenticated actor, wrong role, expired maintenance authorization, self-account destructive action | Hard stop. These are not business-policy blockers and must not be overrideable. |

This division makes “easy manipulation” concrete: almost every legitimate structural correction has a completion path, while the small immutable core never silently changes.

### 2.8 Existing clean-slate reset and presentation impact

The repository already contains a purpose-built `Reset school data` workflow. It is safer and smoother for a presentation clean slate than individually deleting students, sections, classes, assessments, and grades through ordinary CRUD endpoints.

#### Confirmed reset outcome

| After a successful reset | Outcome |
|---|---|
| Accounts | Exactly the initiating active, verified administrator remains with one admin role. All other users, student/teacher profiles, archived users, refresh tokens, OTP state, and Demo Mode state are cleared. |
| Academic structure | Sections, classes, schedules, enrollments, pending roster rows, events, and related preferences are cleared. |
| Learning and grading | Lessons, templates, assessments, questions, attempts, responses, class records, scores, final grades, annual grades, remediation, completion, and other listed academic-result tables are cleared. |
| Content and async state | Owned uploaded files, indexed/vector content, AI/LXP/JA state, reports, notifications, messages, and known queues are cleared and verified. |
| New baseline | Exactly one academic-system state is initialized for the chosen school year and valid period; the retained admin signs in again. |
| Preserved system state | Roles, app versions, migrations, academic-year policies, transmutation tables, reset control/receipts, audit logs, score-repair evidence, admin lifecycle operations, and enrollment lifecycle events remain. |
| Historical visibility | Preserved audit/evidence JSON may still contain old names or academic values. The ordinary school workspace is clean, but an audit/recovery view is intentionally not historically blank. |

#### Important presentation consequences

1. **Coworker accounts are deleted.** Recreate the intended teacher/student/admin presentation accounts after reset, or design a separately reviewed reset variant. The current contract intentionally does not accept a caller-provided list of accounts to preserve.
2. **Existing grading policy may survive.** `academic_year_policies` and transmutation tables are preserved. Resetting into a previously configured school year reuses that policy; selecting a new valid year uses defaults/configured transmutation settings when no policy exists.
3. **The reset is disabled by default.** Availability requires explicit environment, topology, storage-ownership, database-catalog, queue, and backend/AI participant checks. A blocker here is an operational safety precondition, not one of the admin data-manipulation safeguards targeted for replacement.
4. **No one should edit while reset is being prepared or drained.** Changed data, schema, policy, files, or participant topology invalidates the preview or aborts before commit. After database commit, external cleanup is resumable and maintenance stays active until verification completes.
5. **It is not an undoable demo toggle.** Reversal requires coordinated database/object backup restoration. The reset should be rehearsed on production-shaped disposable resources and run before the presentation window, never improvised during it.

#### Best presentation sequence

```text
backup + readiness check
          -> full Reset school data
          -> verify one admin + one academic state + zero school content
          -> sign in again
          -> recreate the small curated presentation roster/classes
          -> rehearse scripted actions through the Maintenance Gateway
```

For a visually fresh audit screen without deleting immutable history, use the reset operation as a **baseline boundary**: normal screens show “Current setup” by default, while authorized audit users can deliberately open “Previous setup history.” This is a presentation/filtering decision, not deletion of audit evidence.

## 3. Cascade map

Risk describes the consequence of cutting or changing the edge without its stated disposition.

| ID | Provider | Interface | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| E01 | Global auth layer | `JwtAuthGuard`, roles metadata | All admin controllers | direct | Critical: unauthorized mutation access | Confirmed | `backend/src/app.module.ts`; controller role decorators | **Keep** |
| E02 | Controller/DTO layer | validation pipes, DTO enums/strings, throttles | Demo and lifecycle APIs | direct | High: malformed or brute-force destructive requests | Confirmed | `admin-lifecycle.controller.ts`; `DTO/admin-lifecycle.dto.ts`; Demo DTO/controller | **Keep** |
| E03 | Web Demo provider | status polling, context, countdown | Entire admin dashboard, settings, users/classes/sections/forms | operational | Medium: API polling errors and inconsistent UI gating if backend is removed first | Confirmed | `next-frontend/app/(dashboard)/layout.tsx`; `AdminDemoModeProvider` consumers | **Retire client-first** |
| E04 | Mobile Demo hook | status/query invalidation | Admin user/classes/sections/roster/settings screens | operational | Medium: stale controls or failed queries | Confirmed | `mobile/src` Demo Mode hook and screen references | **Retire client-first** |
| E05 | Demo service | `/admin/demo-mode`, DB state/version/expiry | Web/mobile providers and policy consumers | direct | High: unresolved DI/API clients if removed abruptly; active state ambiguity | Confirmed | `admin-demo-mode.controller.ts`; `.service.ts`; schema | **Deactivate, freeze, then retire** |
| E06 | Demo policy | `user_lifecycle_sequence` | `UsersService` archive/reactivate/update flows | direct | High: lifecycle behavior changes and old UI assumptions break | Confirmed | `admin-demo-mode.policy.ts`; `users.service.ts` | **Replace with canonical policy** |
| E07 | Demo policy | membership window, capacity, archive membership, room/adviser rules | `SectionsService` | direct | Critical: over-capacity/history/archive semantics change | Confirmed | `admin-demo-mode.policy.ts`; `sections.service.ts` | **Replace with canonical policy** |
| E08 | Demo policy | schedule collision, archive membership, restore class | `ClassesService` | direct | High: collisions and roster outcomes change | Confirmed | `admin-demo-mode.policy.ts`; `classes.service.ts` | **Replace with canonical policy** |
| E09 | Demo policy | window/capacity context | `RosterImportService` preview/commit | transitive | High: bulk import acceptance changes | Confirmed | `roster-import.service.ts` and specs | **Replace; keep row/identity validation** |
| E10 | Demo policy | `admin_academic_window` | `AcademicPolicyService`, then assessments/repair/class records | transitive | Critical: official academic mutations outside active periods | Confirmed | `academic-policy.service.ts`; Demo policy catalog | **Replace; keep official-record boundaries** |
| E11 | Demo policy | `governed_execution_availability` | `AdminLifecycleService` | direct | High: lifecycle execution flag can be bypassed | Confirmed | `admin-lifecycle.service.ts`; policy catalog | **Remove with Demo Mode** |
| E12 | Classes controller/service | direct class unenrollment endpoint | Admin class detail plus teacher consumers | direct | Critical: shared endpoint; global weakening expands teacher behavior | Confirmed | `classes.controller.ts:754`; `classes.service.ts:3219`; admin/teacher clients | **Split admin decision from teacher authorization** |
| E13 | Class-record service | capture + `assertEditable` | Direct class removal | transitive | Critical: finalized/locked official roster evidence can be rewritten | Confirmed | `class-record.service.ts` capture/editability symbols | **Keep hard evidence rule; improve resolution path** |
| E14 | Sections controller/service | direct section-roster removal | Teacher web/mobile; callable API | direct | High: active class memberships can be orphaned if guard is deleted | Confirmed | `sections.controller.ts:553`; `sections.service.ts:871`; teacher clients | **Keep teacher path; adapt admin path** |
| E15 | Membership guard | `assertGradeLevelChangeAllowed` | Users/profile updates | direct | High: grade can contradict active section/class membership | Confirmed | `academic-membership-guard.ts`; users/profiles services | **Keep invariant; offer governed transition** |
| E16 | Web lifecycle UI | preview/review/execute dialog | Admin class, section, roster flows | operational | High: admin loses effects/preserved evidence and safe execution UI | Confirmed | `AdminLifecycleDialog`; admin class/section pages | **Retarget to new policy contract** |
| E17 | Mobile lifecycle UI | lifecycle API + review screen | Mobile admin class/section/student navigation | operational | High: mobile contract divergence or offline unsafe queueing | Confirmed | `mobile/src/api/services/admin-lifecycle.ts`; `AdminLifecycleReviewScreen` | **Retarget; preserve no-offline-queue rule** |
| E18 | Lifecycle controller | student/class/section/purge preview and execute routes | Web/mobile admin | direct | High: removing routes strands clients and old app builds | Confirmed | `admin-lifecycle.controller.ts` | **Version/adapter during cutover** |
| E19 | Lifecycle service | password, exact confirmations, expiry/hash, idempotency | Every governed execution | direct | Critical: replay, stale approval, and double-execution risk | Confirmed | `AdminLifecycleService.assertExecutionEvidence`, `verifyActor`, `claimOperation`, `execute` | **Keep as generic execution shell** |
| E20 | Student lifecycle planner | prepare/plan/apply | Student correction/withdraw/section/class transfer | direct | Critical: membership/class-record mismatch if removed without replacement | Confirmed | `student-lifecycle.service.ts` | **Replace decision rules; retain atomic apply contract** |
| E21 | Class lifecycle planner | prepare/plan/apply | Class archive | direct | Critical: affected learners need explicit outcome and compatible transfer | Confirmed | `class-lifecycle.service.ts` | **Replace rules; retain evidence inventory/apply discipline** |
| E22 | Section lifecycle planner | prepare/plan/apply | Section archive | direct | Critical: multi-class/multi-learner cascade | Confirmed | `section-lifecycle.service.ts` | **Replace rules; retain atomic aggregate operation** |
| E23 | Purge planner | archived/evidence inventory/no override | Class/section permanent deletion | direct | Critical: permanent academic evidence deletion | Confirmed | `purge-lifecycle.service.ts` | **Keep no-evidence floor; simplify policy above it** |
| E24 | Academic transaction layer | advisory lock + DB transaction | Lifecycle and other official mutations | direct | Critical: races and partial application | Confirmed | academic transaction decorator/runner and lifecycle execution | **Keep** |
| E25 | Audit/side-effect layer | audit link, durable notification/post-commit effects | Operators, affected users, incident review | operational | High: untraceable change or misleading notification | Confirmed | lifecycle service, audit service calls, post-commit handling | **Keep and normalize** |
| E26 | Lifecycle persistence | operation and enrollment-event tables | History, idempotency, reset retention, evidence | transitive | Critical: loss of prior audit/academic lineage | Confirmed | `admin-lifecycle.schema.ts`; migrations `0018`, `0020`; reset catalog | **Retain or migrate append-only** |
| E27 | Core database schema | FKs, checks, uniqueness, delete actions | All services and historical data | transitive | Critical: orphaning, accidental cascade, or impossible purge | Confirmed | core, class-record, academic-grading schemas | **Keep; separately review weak spots** |
| E28 | System reset | table catalog and preservation groups | Controlled reset tooling | operational | High: schema removal makes reset mapping stale; clearing history violates retention | Confirmed | `system-reset.catalog.ts`; `.database.ts`; specs | **Update only after schema migration decision** |
| E29 | User service | suspend/reactivate/archive flow | Web/mobile admin user management | direct | High: inconsistent state and missing archive snapshot | Confirmed | `users.service.ts:1211`, `:1282`, `:1328`; clients | **Route through new policy seam** |
| E30 | User service | direct permanent purge | Web/mobile admin user management | direct | Critical: mixed cascade/restrict behavior; no governed evidence manifest | Confirmed/Inferred | `users.service.ts:1418`; schema FK actions | **Replace with evidence-aware governed user purge** |
| E31 | Legacy user route | `DELETE users/delete/:id` -> `deleteUser` | No in-repo client caller found | dormant | Critical if rediscovered: bypasses current self/sequence model | Confirmed | `users.controller.ts:160`; `users.service.ts:1167`; focused caller search | **410/deprecate, then remove** |
| E32 | Legacy class route | direct class `delete` method/route | No in-repo client caller found | dormant | High: duplicates lifecycle deletion semantics and confusing audit metadata | Confirmed | `classes.service.ts` delete/purge symbols; focused caller search | **410/deprecate, then remove** |
| E33 | Teacher clients | shared class/section mutation APIs | Teacher web/mobile | transitive | Critical: admin-wide relaxation can unintentionally weaken teacher controls | Confirmed | teacher section/class pages/screens and API services | **Keep outside admin policy reset** |
| E34 | Test contracts | backend specs; web/mobile contract tests | CI and refactoring safety | operational | Medium: deleting tests hides drift; preserving all locks old design | Confirmed | Demo, lifecycle, users/classes/sections/roster specs; mobile admin contract tests | **Replace assertions in phases** |
| E35 | Environment flags | `ADMIN_LIFECYCLE_ENABLED`, `ADMIN_DEMO_MODE_AVAILABLE` | Service availability and execution | operational | High: flag-only changes do not remove rules and can strand UI | Confirmed | config files and `.env` examples | **Use only as rollout/rollback controls** |
| E36 | Lifecycle blocker contract | `resolvable` and `resolutionOptions` | Web/mobile lifecycle types and renderers | dormant | High usability risk: the backend names valid next actions but clients do not make them executable | Confirmed | `admin-lifecycle.types.ts`; student/class/section planners; web dialog; mobile review screen | **Activate through gateway navigation/actions** |
| E37 | Per-operation evidence UI | password, notes, reason, confirmation list | Coworkers performing repeated maintenance | operational | Medium: repeated ceremony encourages avoidance and makes safe workflows feel hostile | Confirmed | lifecycle DTOs; web dialog; mobile review screen | **Use a short-lived scoped maintenance authorization; retain per-operation audit** |
| E38 | Legacy exception channel | service exceptions | Direct admin clients and generic toast/notices | operational | High: expected conflicts look like failures and expose no continuation path | Confirmed | direct admin handlers; exception sites in users/classes/sections/roster/academic policy | **Translate expected conflicts into structured decisions** |
| E39 | Academic repair module | evidence-preserving repair routes and academic transaction | Admin repair/alignment workflows | direct | High if ignored: a second maintenance surface remains fragmented; high if removed: safe immutable-evidence corrections disappear | Confirmed | `academic-repair.controller.ts`; `AcademicRepairService`; alignment services | **Integrate as protected-lane handlers** |
| E40 | System Reset controller/UI | capability, policy, preview, execute, operation status | Admin System Settings on web/mobile | direct | Critical: destructive full-school operation; client/session handling must track one exact operation | Confirmed | `system-reset.controller.ts`; web/mobile services/screens and tests | **Use for clean slate, not routine editing** |
| E41 | Reset catalog/preview | explicit table dispositions, counts, schema hash, policy, assets, queues, participants | Reset confirmation and coordinator | direct | Critical: unknown table/reference or stale scope could leave residual or over-delete data | Confirmed | `system-reset.catalog.ts`; `.database.ts`; manifest/service | **Keep fail-closed inventory** |
| E42 | Reset coordinator | maintenance state, advisory/write/I/O locks, queue drain, participant acknowledgements | Backend, AI, writers, storage and queues | operational | Critical: concurrent writes or partial external cleanup could repopulate deleted content | Confirmed | `SystemResetService.runTick`; reset context/queues/assets | **Keep restart-safe coordination** |
| E43 | Reset database apply | delete order, retained actor, new academic state | All live school/account/academic tables | direct | Critical and intended: other accounts and live finalized grades are permanently cleared | Confirmed | `applyResetDatabase`; reset catalog | **Require explicit clean-slate authorization and backup** |
| E44 | Reset evidence retention | audit/history preserve, legacy evidence snapshot, nullable FK detach | Audit, repair, support and reset receipts | transitive | High: audit UI is not historically blank; deleting it would violate immutability | Confirmed | reset catalog and `system_reset_evidence` writes | **Preserve; filter by baseline in normal presentation** |
| E45 | Reset external cleanup | owned uploads, AI caches, Redis queues | File/AI/job behavior after reset | operational | Critical: stale files/jobs can resurrect deleted data if cleanup is incomplete | Confirmed | reset assets/queues/coordinator; implementation plan evidence | **Verify empty before maintenance ends** |
| E46 | Reset session invalidation | retained admin `session_version` increment; other auth state cleared | All web/mobile users and sockets | operational | High: everyone is signed out and only the retained admin can return immediately | Confirmed | `applyResetDatabase`; auth/client reset integration | **Plan account recreation and re-login** |

### 3.1 Confirmed contradictions and gaps

1. **Dormant delete bypass:** the mounted legacy user-delete route calls a simpler status-changing method and does not express the self-account and suspend/archive sequence enforced by the newer lifecycle methods. No current in-repo caller was found, but the public route remains reachable. **Confirmed, dormant.**
2. **Admin class removal bypasses governed UX:** the admin class-detail page directly unenrolls, invokes class-record capture, and can hit locked/finalized editability errors instead of offering an impact-aware resolution. **Confirmed, direct.**
3. **Demo archive semantics conflict with governed semantics:** direct class/section archive under Demo Mode can convert all active memberships to `completed`; governed archive requires explicit outcomes and redirects academic completion to the academic-transition authority. **Confirmed, direct.**
4. **User purge is not evidence-manifest-driven:** web copy presents a guarded/evidence-aware action, but `UsersService.purgeUser` does not use the governed purge planner. Because user-linked tables mix `cascade` and `restrict`, actual behavior depends on retained rows. **Confirmed source difference; runtime outcome inferred.**
5. **Normal section membership audit gap:** direct section add/remove code emits explicit audit metadata around Demo bypass cases, but a normal removal does not visibly create the same lifecycle/audit record. **Confirmed within inspected methods.**
6. **Weak section-only uniqueness:** the enrollment unique key includes nullable `class_id`; PostgreSQL normally treats multiple `NULL` values as distinct, so the schema alone does not guarantee one section-only row per learner. Services attempt logical deduplication. **Confirmed schema; database behavior inferred from PostgreSQL semantics.**
7. **Bulk UI is not a bulk transaction:** some web selection flows start lifecycle review for only the first selected target rather than producing one combined manifest. **Confirmed.**
8. **Documentation drift:** earlier lifecycle design material deferred mobile while current source includes a mobile lifecycle API and review screen. Current code is authoritative. **Confirmed.**
9. **Resolution data is discarded at the last mile:** planners emit actionable `resolutionOptions`, but web does not render them and mobile does not navigate from them. **Confirmed.**
10. **Expected conflicts use two incompatible channels:** direct actions throw exceptions while lifecycle actions return blocker manifests. Clients must understand both, which produces inconsistent recovery and generic failures. **Confirmed.**
11. **“Immutable grades” and “full clean slate” are different policies:** ordinary lifecycle operations preserve finalized evidence, while System Reset clears live grade/attempt/class-record tables by explicit confirmation. Treating them as the same action would misstate the deletion boundary. **Confirmed.**

## 4. Isolation and disassembly plan

### 4.1 Removal target

The safe interpretation of “remove/disable it completely” is:

- remove the current **admin-specific policy decisions and bypass catalog**;
- remove Admin Demo Mode from web, mobile, backend, config, and active state;
- eliminate or seal duplicate destructive admin entry points;
- retain security, evidence integrity, database integrity, execution integrity, and history;
- install the new policy before enforcing removal of the old one.

This target cuts E03–E11 and replaces the decision portions of E12, E14, E15, E20–E23, and E29–E30. It explicitly preserves E01–E02, E13, E19, and E24–E28.

### 4.2 Removal simulations

| Simulation | Immediate outcome | Hidden cascade | Verdict |
|---|---|---|---|
| Set both feature flags false | Demo relaxations stop; governed execution can return unavailable while legacy blockers remain | Admin still encounters the same service guards, but loses the best resolution path | **Not the goal** |
| Remove only disabled buttons/dialogs | UI appears freer | Backend and DB still block; old clients behave differently | **Reject** |
| Remove Demo backend before clients | API/DI/contract failures | Web polling and mobile queries fail; service imports/tests break; active state has no orderly closure | **Reject ordering** |
| Delete checks inside section/class services | Some actions start succeeding | Shared teacher endpoints weaken; capacity/schedule/year rules lack DB equivalents; roster/evidence inconsistencies become possible | **Reject** |
| Remove governed lifecycle module | Admin class/section flows lose preview/execute APIs | Operation/event tables become dormant; clients fail; teams may fall back to unsafe direct routes | **Reject until replacement is live** |
| Remove database constraints | More destructive calls appear to succeed | Orphans, cascading evidence loss, duplicate membership, irrecoverable corruption | **Reject** |
| Keep execution shell, replace policy behind one interface | Admin receives new decisions with existing atomicity/audit | Requires adapters and temporary double evaluation | **Recommended** |

### 4.3 Three smoother approaches

| Approach | Time to coworker relief | Removal quality | Main trade-off | Verdict |
|---|---|---|---|---|
| A — Delete service checks and rely on PostgreSQL | Apparently immediate | Very poor | Domain conflicts become raw FK/unique errors or silent semantic damage; teacher paths are weakened; finalized evidence can still block unpredictably | **Reject** |
| B — Route every admin action through the existing lifecycle system and polish its UI | Fast | Medium | Quickly removes direct dead ends, but retains the large existing planner catalog and per-operation ceremony | **Good bridge, incomplete reset** |
| C — Strangler Admin Maintenance Gateway | Fast in stages | High | Requires a compatibility adapter and temporary double evaluation, but gives one contract while old internals are replaced independently | **Recommended** |

Approach C should use Approach B as its first release. The gateway initially delegates student/class/section operations to current lifecycle planners and evidence repairs to the existing academic-repair services. Direct green actions use typed command handlers. Coworkers therefore gain a consistent workflow early; the replacement policy does not have to be complete before the first usability improvement ships.

### 4.4 Recommended interaction and execution model

```text
Coworker opens Maintenance Workspace
                 |
                 +-- authenticate once -> short-lived, scoped maintenance session
                 |
          choose record + desired real-world outcome
                 |
            POST preview / plan
                 |
       +---------+-----------+----------------+----------------+
       |                     |                |                |
     READY            AUTO_RESOLVABLE    NEEDS_CHOICE     IMMUTABLE
       |                     |                |                |
   apply once       show preselected fix   ask one fact    offer correction,
                         + impact          then replan      never raw rewrite
       |                     |                |                |
       +---------------------+----------------+----------------+
                             |
               hash + idempotent transaction
                             |
             receipt + audit + affected-user notice
```

#### The workspace should ask for outcomes, not database operations

The primary verbs should be “Transfer learner,” “Correct enrollment,” “Withdraw learner,” “Archive class,” “Archive section,” “Correct account,” and “Permanently remove empty/test record.” Coworkers should not have to know whether the system must update an enrollment row, create destination class memberships, change participant eligibility, or append a lifecycle event.

#### The planner should do all deterministic work

- If a destination section has exactly one matching class for each subject, map them automatically.
- If a source enrollment only affects draft/current-or-future participant rows, update those rows automatically within the transaction.
- If an archive affects active learners, compute all outcomes and preselect the non-destructive outcome supported by current state.
- If capacity, schedule, room, adviser, or academic-window policy is the only conflict, present it as an authorized warning rather than a dead end.
- If more than one destination or real-world outcome is valid, ask one focused question and immediately regenerate the plan.
- If finalized evidence exists, preserve it and route to the existing repair/superseding path. Never reinterpret it as an erroneous record merely to make deletion succeed.

#### How the gateway crosses old guards during migration

The gateway must not call a legacy mutation and merely catch whatever exception it throws. That would improve wording but leave the action blocked. For an action whose old service guard conflicts with an approved fresh-policy decision, separate the mutation into four internal stages:

1. load current facts and dependency versions;
2. enforce non-overrideable security, identity, referential, and immutable-evidence invariants;
3. obtain the gateway decision and, when applicable, an internal `AdminMutationPermit` bound to the actor, operation, action, target, permitted warning codes, dependency versions, and a short expiry;
4. call a transaction-scoped apply primitive that accepts only that server-created permit.

The client must never send `force=true`, a list of rule codes to ignore, or a reusable global bypass flag. A permit is created only after a concrete preview and cannot authorize another target or action. Existing direct routes continue through legacy policy during the compatibility window; gateway routes use the scoped permit. Once all consumers migrate, the replaceable legacy branches and permit compatibility checks can be removed together. This provides a narrow strangler seam instead of recreating Demo Mode under a new name.

#### Reduce repeated security friction without weakening authorization

Use a server-owned maintenance authorization created after current-password or stronger step-up verification. It should be short-lived, bound to the authenticated session/device, revocable, and scoped to action families such as roster, structure, account lifecycle, or evidence-free purge. Each mutation still creates its own operation and audit record. A permanent purge should still demand fresh action-specific confirmation; ordinary transfers and metadata corrections should not require retyping the password for every row.

This is a proposed design, not a currently implemented capability. No reusable step-up session was found in the inspected source.

#### Suggested authority split

| Scope | Typical allowed work | Never grants |
|---|---|---|
| Data steward/registrar | identities, profiles, enrollment correction, transfers, withdrawals, roster import | finalized-grade edits, audit deletion, system reset |
| Academic administrator | class/section structure, academic-state repair, evidence-preserving correction, operational collision override | deletion of finalized evidence or history |
| System owner | evidence-free permanent purge, system-level maintenance | rewrite of finalized grades or audit history |

This avoids solving coworker friction by giving every coworker unrestricted global-admin power.

#### Action matrix under the immutable-evidence decision

| Requested action | New behavior |
|---|---|
| Move student to another section | Auto-map compatible destination classes; show exceptions only for missing/ambiguous subjects; apply destination-first and close source in one transaction. |
| Remove student from a section | Ask whether this is correction, withdrawal, or transfer; automatically reconcile active class memberships; retain submitted/finalized work. |
| Remove student from a class | If only draft participation exists, close it directly; if finalized evidence exists, retain the record and change future eligibility/status through an append-only lifecycle event. |
| Change student grade level | If no active memberships, apply; otherwise offer a planned section transfer or effective-next-period change instead of a raw block. |
| Archive class or section | Generate learner outcomes and apply them together; never silently label everyone completed. |
| Override capacity or collision | Show affected section/class/room/teacher, require reason and suitable scope, then allow; log the override as operational policy, not Demo Mode. |
| Edit historical structure | Allow metadata repair when it does not rewrite finalized values; use the evidence-preserving repair path for policy/period corrections. |
| Permanently delete user/class/section | Allow only for archived, evidence-free/test records after a fresh preview; otherwise archive and retain lineage. |
| Edit finalized grade or delete audit history | Return `IMMUTABLE` and offer correction/supersession where meaningful. |

#### Clean-slate presentation mode is a separate workflow

Do not route a full presentation reset through the Maintenance Gateway as a large collection of ordinary delete commands. Use E40–E46 as one dedicated reset operation with its existing full inventory, locks, restart-safe coordinator, external cleanup, and verification. The gateway governs daily manipulation *after* the reset. This separation prevents the old per-record safeguards from obstructing the clean slate without weakening their ordinary evidence boundary.

The practical smooth path is therefore two-track:

- **One-time presentation preparation:** backup, verify reset capability, preview exact counts, execute one System Reset in a quiet window, verify completion, sign in again, and create a small deterministic presentation dataset.
- **Ongoing coworker manipulation:** use the Maintenance Gateway so transfers, removals, archive actions, and operational overrides resolve instead of failing.

### 4.5 Prerequisites

1. **Freeze the current contract baseline.** Record all admin mutation routes, DTOs, reason codes, UI entry points, external/mobile version support window, feature flag values, and counts of active Demo Mode/lifecycle operations. Covers E03–E05, E16–E18, E26, E35.
2. **Classify every rule.** Mark each current check as `SECURITY`, `DATA_INTEGRITY`, `ACADEMIC_EVIDENCE`, `ADMIN_POLICY`, or `CLIENT_GUIDANCE`; only `ADMIN_POLICY` enters the fresh-start catalog. Covers E01–E15 and E19–E30.
3. **Define retention before schema cleanup.** Decide how long Demo activation records, lifecycle operations, audit links, and enrollment events remain queryable. Covers E05, E26–E28.
4. **Inventory non-repository consumers.** API gateway logs or access telemetry must confirm whether E31/E32 are truly unused before removal. Static caller absence is insufficient.
5. **Design user-purge evidence handling.** A governed user purge must inventory both restrictive official evidence and cascading user-owned rows before the existing direct purge is retired. Covers E30.

### 4.6 Ordered cuts

| Phase | Change boundary | Validation gate | Rollback |
|---|---|---|---|
| 0 — Baseline | No behavioral change. Capture deployed flags, active Demo state, route traffic, DB constraint/migration state, operation failure/replay rates, and representative blocked actions. | Static inventory reconciles with OpenAPI/route discovery and production telemetry; restore drill identifies required tables. | None; read-only phase. |
| 1 — Immediate relief | Route direct admin class/section/student actions into current lifecycle preview; render E36 resolution options as buttons/navigation; normalize known expected conflicts into a common decision display. Do not delete guards. | Every admin write entry point is inventoried; representative blocked actions end with a next action instead of a generic toast; teacher behavior is unchanged. | Restore old UI handlers; backend contracts have not been removed. |
| 2 — Gateway facade | Add one maintenance preview/execute contract and adapters to current lifecycle, academic repair, user lifecycle, roster import, and typed green commands. Introduce `READY/AUTO_RESOLVABLE/NEEDS_CHOICE/OVERRIDABLE_WARNING/IMMUTABLE`; bind approved replaceable warnings to server-created per-operation permits. | Contract parity tests on web/mobile; permit target/action/version/expiry tests; adapter characterization matches current effects; immutable fixtures never produce a destructive plan. | Clients can return to the existing lifecycle APIs while adapters remain. |
| 3 — Scoped maintenance authorization | Add short-lived server-owned action scopes so routine operations reuse one step-up session; preserve fresh confirmation for purge/system reset. | Expiry, revocation, session/device binding, role scope, replay, stolen-token, and cross-action tests; audit still records each actor/action. | Disable reusable authorization and fall back to per-operation password. |
| 4 — Separate actors | Give admin mutations dedicated gateway paths; leave teacher ownership and direct mutation semantics unchanged. Seal accidental admin use of shared teacher endpoints where a gateway path exists. | Role-matrix tests prove Admin/Data Steward/Teacher behavior independently; E12/E14/E33 regressions run on web and mobile. | Re-enable adapters while retaining role telemetry. |
| 5 — Shadow fresh policy | Evaluate the minimal new policy beside old planners. Log decision/effect differences without sensitive row contents. Convert capacity/collision/window blocks into scoped warnings; preserve immutable/security outcomes. | Zero unexplained differences for the immutable core; every intentional relaxation has a reason code, authority scope, audit assertion, and fixture. | Disable shadow evaluator. |
| 6 — Enforce fresh policy | Switch the gateway to new decisions while retaining E19/E24–E27 execution infrastructure and E39 repair handlers. Keep old adapters behind a short-lived rollback flag. | End-to-end admin tests; concurrent/idempotent/stale-manifest tests; database invariant and audit assertions; finalized values and history checksums remain unchanged. | Flip decisions back to adapters; never reverse already committed operations by deleting their history. |
| 7 — Retire Demo Mode | Remove web/mobile Demo controls, keep a deterministic compatibility response for old clients, ensure state is inactive, then remove E05–E11 backend consumers/controller/module/config. | No client polling; no service import/rule-code reference; old clients receive documented unavailable/deprecated response; history retention is satisfied. | Restore compatibility adapter and preserved state table, not the bypass behavior by default. |
| 8 — Seal legacy/destructive paths | Deprecate E31/E32, observe traffic, remove wrappers/routes, and route user purge through the gateway evidence inventory. | Telemetry shows no unexpected caller; purge fixtures cover restrictive and cascading relationships; all admin buttons use the gateway. | Restore a compatibility route that delegates to the gateway. |
| 9 — Persistence cleanup | After retention approval, remove unused Demo state structures or rename lifecycle structures to generic maintenance history. Update exports, migrations, reset mappings, documentation, and tests. | Production-shaped migration rehearsal, row-count/checksum reconciliation, backup restore, and queryable operation/event history. | Forward corrective migration or database restore; never destructively roll back evidence. |

### 4.7 Compatibility and deprecation strategy

- Keep `/admin/lifecycle` response shapes stable through Phases 1–4 where possible. Add new reason codes additively before removing old enum values.
- Mobile builds cannot be recalled. Backend compatibility for supported app versions must outlive client rollout; removed Demo endpoints should return a deterministic unavailable/deprecated response instead of an ambiguous 404.
- A legacy route found to have traffic should become an adapter to the new policy, not remain a second implementation.
- Do not reuse Demo Mode’s broad “allowed rule code” context as the new seam. The new policy result should be target-specific, actor-specific, state-versioned, and explain exactly which next action resolves a block.
- Preserve operation IDs and lifecycle event identifiers across any table rename so audit links and support references remain stable.

### 4.8 Cleanup and retained state

| State/artifact | Cleanup decision |
|---|---|
| Active Demo Mode state | Explicitly deactivate and record the actor/reason before disabling activation. Do not silently delete an active row. |
| Historical Demo state/audit | Retain for the approved audit period; later archive or migrate. |
| Lifecycle operations | Retain/migrate. They support idempotency history, incident analysis, and links from lifecycle events. |
| Enrollment lifecycle events | Retain append-only. They are academic lineage, not temporary feature state. |
| Old policy reason codes | Maintain a translation/deprecation map for logs, clients, and support documentation. |
| Legacy UI state and hooks | Remove after backend compatibility exists and supported clients have migrated. |
| Dead routes/wrappers | Deprecate visibly, observe, then delete after external consumer confirmation. |
| Tests | Convert current behavior tests into characterization fixtures first; replace policy assertions only when the corresponding phase cuts over. |

### 4.9 Validation plan

The implementation phase should prove all of the following before claiming the old safeguard system is gone:

1. **Static ownership:** no remaining runtime import of `AdminDemoModeService`, no Demo rule-code lookup, no admin UI/hook/provider reference, no unowned destructive admin route, and no admin button that calls a shared direct mutation when a gateway command exists.
2. **Policy behavior:** table-driven tests cover every decision lane and reason code for student move/remove, class removal, class/section archive, user suspend/archive/reactivate/purge, roster import, grade change, locked/finalized evidence, capacity/collision override, and current/non-current academic periods.
3. **Execution safety:** retry, concurrent request, stale manifest, wrong password, missing confirmation, expired manifest, transaction failure, and post-commit failure tests remain green.
4. **Contract parity:** web and mobile use the same backend decision envelope; teacher role tests demonstrate unchanged authorization and ownership behavior; offline mobile execution stays disallowed.
5. **Data proof:** migration rehearsal validates FK actions, retained row counts, audit links, lifecycle-event immutability, finalized-value/history checksums, system-reset mapping, backup restoration, and a zero-orphan query set.

Proposed acceptance targets for the replacement are: zero expected business conflicts rendered as a generic failure when a resolution exists; 100% of admin mutation buttons owned by the gateway or an explicit immutable/security handler; no change to finalized-grade and audit-history checksums; and zero traffic to deprecated direct destructive routes for the full compatibility window.

### 4.10 Removal saturation check

The final implementation review must run focused searches across backend, web, mobile, migrations/schema exports, reset tooling, tests, OpenAPI/route metadata, and deployment configuration for old module names, rule codes, endpoint paths, DTO enums, feature flags, and table identifiers. Success means the intended policy/runtime edges are gone or explicitly retained as compatibility/evidence edges; it does not mean that security and integrity safeguards have been erased.

## 5. Improvements

### Required decoupling

**One decision authority, separate from execution.** The new `AdminMutationPolicy` must own replaceable admin rules. Services should provide facts and apply an approved plan; they should not independently invent overlapping admin blockers. The governed execution shell should consume a versioned policy decision and remain responsible for password verification, confirmations, idempotency, transactionality, audit, and post-commit work. Teacher authorization and hard evidence constraints remain separate. This directly resolves E06–E15 and E19–E23 without weakening E01–E02, E13, or E24–E27.

### Optional enhancements

1. **Actionable blocker responses:** return stable code, human explanation, affected record counts, allowed alternatives, and executable next-action descriptors. Activate the existing but unused `resolutionOptions` concept instead of showing generic dead ends.
2. **Scoped maintenance sessions:** step up once for a short, server-owned, role/action-scoped window; retain fresh per-action authentication for evidence-free purge and system reset.
3. **Governed user purge:** add the same evidence manifest, exact confirmation, idempotency, and no-override retained-evidence floor used by class/section purge.
4. **Database membership invariants:** separately evaluate partial unique indexes for active section-only membership and other invariants currently enforced only in services. This needs its own migration/data-repair review.
5. **True bulk planning:** generate one combined manifest and atomic operation for multi-select archive/transfer instead of silently reviewing only the first selected target.

## 6. Uncertainty only

- **Unverified:** current deployed values of `ADMIN_LIFECYCLE_ENABLED` and `ADMIN_DEMO_MODE_AVAILABLE`, whether Demo Mode is presently active, and whether deployment configuration differs from examples.
- **Unverified:** production row counts, active/failed lifecycle operations, retained evidence distribution, actual purge failure/cascade cases, and whether all migrations/constraints match source definitions.
- **Unverified:** consumers outside this repository, including older deployed web bundles, older APK/IPA versions, scripts, integrations, or direct API users of the dormant delete routes.
- **Unverified:** the approved retention period and legal/school-policy classification of Demo activation history, lifecycle operations, and enrollment lifecycle events.
- **Unverified:** production telemetry needed to choose the compatibility window and quantify shadow-policy differences.
- **Unverified:** whether the deployed environment currently enables System Reset and satisfies its single-backend, AI-participant, storage-ownership, queue, and exact database-catalog checks.
- **Inferred:** mixed `cascade`/`restrict` user relationships make direct user-purge behavior data-dependent; this was not executed against a production-shaped database in this analysis.
- **Inferred:** PostgreSQL nullable uniqueness permits multiple section-only enrollment rows unless another deployed index or constraint exists outside the inspected schema/migrations.
- **Scope boundary:** inspected backend owners, web/mobile admin and shared teacher consumers, persistence/migrations, reset integration, relevant tests, and current design specifications. Unrelated read-only admin views, AI/LXP behavior without a direct user-delete cascade, live infrastructure, and actual database contents were excluded.

no additional dependency was found within the inspected scope
