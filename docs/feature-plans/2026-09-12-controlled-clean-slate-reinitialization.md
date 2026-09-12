# Reset school data while preserving system essentials

Date: 2026-09-12. Status: reviewed for implementation; release in progress.

## 1. Decision and authorization

The user authorized review, System Settings design using planning-frontend-redesigns, implementation, verification, Android packaging, commit, push, and configured deployment using finish-and-ship. Running the destructive operation on live school data is not part of release acceptance. Rehearsals use explicitly disposable local resources.

The revised feature is **Reset school data**: retain the acting admin, system configuration, software release/migration state and audit history; clear other users and school/learning content, indexes, files and jobs; initialize a selected academic year and valid period. The earlier proposal to remove audit/grading configuration is superseded by this complete revision.

School content is not intrinsically unimportant. The preview names accounts, attempts and grades explicitly; the admin deliberately confirms their removal. Existing ordinary deletion and Demo mode rules remain.

## 2. Scope and preservation contract

| Disposition | Rows/assets | Reason |
|---|---|---|
| Preserve | roles, app_versions, _applied_migrations, schema/extensions/constraints | RBAC, Android updates, migrations continue working |
| Preserve | academic_year_policies, transmutation_tables | Configured grading settings survive |
| Preserve | audit_logs, grade_score_repair_evidence, admin_lifecycle_operations, enrollment_lifecycle_events, reset state/receipts | Security and repair provenance survives; nullable references to deleted entities are detached after exact snapshots are archived |
| Archive, then clear live references | academic_legacy_grade_evidence | Its non-null restrictive FKs must remain intact for ordinary workflows; reset copies exact rows into system_reset_evidence before clearing the live table |
| Conditional | users, user_roles | Keep exactly the acting admin identity/password and admin role; remove extra role memberships |
| Initialize | academic_system_states | Exactly one selected year/period, monotonic version |
| Disable | admin_demo_mode_states | Normal workflow rules after reset |
| Clear | Other explicitly classified application tables | School/test users, profiles, roster, classes, content/templates, grades/attempts, discussion, notifications, reports, LXP/JA/AI, chunks/vectors |
| Clear | Owned uploads, AI materialization cache, known queues, refresh/OTP/grace state | Deleted content cannot reappear through pending work |
| Preserve | Deployed static files/APK, secrets/env settings, Ollama models, service resources | Software and infrastructure are not school content |

Audit/evidence JSON can retain old names or academic values. The UI explicitly says audit history remains; this is not erasure of every historical trace. The preserved admin's own school content/chats/sessions are cleared. Clients cannot supply deletion targets, preserved user IDs, SQL, object prefixes or a force flag.

## 3. Current evidence ledger

Baseline: c258aebf on developement; this plan was the only starting change.

| Confidence | Evidence | Consequence |
|---|---|---|
| Confirmed | 108 pgTable declarations in backend/src/drizzle/schema; _applied_migrations in backend/run-migrations.js | Explicit complete registry and runtime unknown-table blocker |
| Confirmed | purge-lifecycle.service.ts::planPurgeLifecycle and users.service.ts::purgeUser | Record-level safeguards intentional; separate reset module |
| Confirmed | admin-lifecycle.service.ts::assertExecutionEvidence/execute | Reuse expiring preview, password, confirmation, idempotency patterns |
| Confirmed | admin-demo-mode.policy.ts and existing Demo mode OpenSpec | Reset is not another relaxed Demo mode rule |
| Confirmed | academic-policy.service.ts::currentState/forYear | Use existing policy; explicitly set selected state |
| Confirmed | app-version.service.ts::checkVersion rejects missing Android release policy | Preserve app_versions and static APK |
| Confirmed | rag.schema.ts and AI indexing_pipeline.py/library_indexing_pipeline.py | Chunks and vectors live in shared PostgreSQL |
| Confirmed | Seven queue registrations in backend/src/modules | announcements, notifications, discussion-board, rag-indexing, library-indexing, performance-recompute, ai-teacher-generation all need cleanup |
| Confirmed | token.service.ts local/Redis grace caches; JwtStrategy.validate reloads account without auth epoch | Account session version plus durable validation of refresh-cache hits |
| Confirmed | notifications.gateway.ts authenticates only signature/type | Recheck account/session version and disconnect stale sockets |
| Confirmed | storage.provider.ts lacks inventory; both delete providers swallow errors | Strict reset-specific storage adapter |
| Confirmed | AI backend_uploads.py caches bytes in nexora-backend-upload-cache | Include per-instance source cache invalidation |
| Confirmed | academic-transaction.ts lock covers selected writers only | DB barrier must also cover AI/schedulers and late writes |
| Inferred | PostgreSQL, files, Redis, service memory lack shared transaction | Persist phases; retry cleanup; maintenance remains after partial failure |
| Unverified | Live inventory, object ownership, replicas, reset flags | Inspect before enablement; deploy permission never implies live reset permission |

## 4. Impact and consumer map

Backend owns capability, target-policy, preview, execute, operation status and coarse maintenance status. Web services/types/System Settings and mobile API/types/admin stack consume them. AI remains internal and uses shared maintenance/epoch state. Both clients continue to access AI only through backend.

| Owner | Change | Consumers/proof |
|---|---|---|
| New backend/src/modules/system-reset | Catalog, preview, coordinator, recovery and verification | Web/mobile new reset flow |
| Drizzle schema/migration | Control state/operation, user session_version, database write barrier | Every backend/AI/scheduler writer |
| Auth and notification gateway | Session version; safe refresh-cache validation; socket recheck | Web/mobile login/refresh/logout/socket flows |
| Storage and seven queue owners | Strict scoped inventory, quiescence, cleanup, empty verification | File downloads, RAG/AI, notifications |
| AI backend_uploads/cache lifecycle | Prevent/cache-clear across reset epoch on every instance | No previous source bytes persist or repopulate |
| Academic policy/state | Preserve policy/transmutation; choose valid target state | Class creation and web/mobile calendar |
| Web settings shell/overview/new system-reset page | Guided setup/review/confirm/run | Browser routing/accessibility/viewport checks |
| Mobile overview/types/navigator/new reset screen | Same contract; online-only execution | Native Back/offline/auth/query invalidation |

Preserved evidence referencing cleared tables is snapshotted before nullable references are detached. Legacy evidence with restrictive, non-null references is archived verbatim before deleting live rows. Clear tables in verified child-before-parent order using DELETE; no TRUNCATE CASCADE or disabled foreign-key constraints. Future dependency cycles or unreviewed retained references block execution.

## 5. Options and invariants

1. Recreate infrastructure: useful for CI, but changes external resources/credentials.
2. **Preserve essentials and reset content (selected):** requested fresh setup in the working installation; needs explicit catalog and resumable cleanup.
3. Demo mode/manual cleanup: retains school content and cannot meet the requested reset.

New/unclassified tables or queues block execution. Audit snapshots remain intentionally. Backup restoration is an operational recovery option, not an invented provider integration. Deployment defaults availability off. An explicit environment-bound preview/confirmation remains required wherever enabled.

## 6. Architecture, security and error behavior

A PostgreSQL coordinator runs independently of BullMQ. Persist phases: review → claim maintenance → drain writers → database committed → files/AI cache/queues cleanup → verify → complete. A session advisory lock prevents concurrent runners; phase checkpoints support restart. Incomplete cleanup remains resumable when creation of new resets is disabled.

Database BEFORE-statement triggers acquire a shared transaction barrier and reject writes during maintenance. The coordinator takes the exclusive barrier, marks maintenance and uses an operation-scoped bypass only inside its own transaction. This covers writes arriving after HTTP checks and direct AI/scheduler writes. In-flight uploads and AI source materialization additionally need an I/O barrier or per-instance acknowledgements before final verification. Active queue jobs must reach zero.

The database phase keeps the actor credentials, increments session version, clears other users/role links and all classified content, detaches nullable evidence FKs, disables Demo mode and initializes one state with monotonic version. Existing target policy is retained; a missing target policy uses backend defaults and configured transmutation settings.

After commit, external cleanup is retryable. Re-list objects/queues and re-count tables before releasing maintenance. Before commit an abort preserves data and restores prior queue pause states. After commit resumption or coordinated backup restore is required.

Security: admin RBAC, current password, reason, exact environment/year/period phrase, explicit acknowledgements, five-minute preview tied to actor/config/schema/policy/counts, UUID idempotency. Changed request under same UUID conflicts. No password/token material in receipts. Old JWT/refresh/grace/socket credentials fail after reset; admin signs in again after completion.

Errors: 400 invalid field/phrase, 401/403 auth/role, 409 stale/unknown scope/concurrent operation, 503 maintenance/dependency. Partial failures report a stable cleanup category; no raw DB secrets. Public status reveals only coarse active/phase information for login/progress screens.

## 7. Contracts, schema and compatibility

Add /api/admin/system-reset capability, /policy?schoolYear=..., /preview, /execute (202), /operations/:id, and minimal public maintenance status. Preserve success/message/data envelopes. Preview returns cleared/kept counts, retained account, target policy/period, blockers, confirmation and expiry.

Add system reset control/operation, archived evidence and instance tables, users.session_version default zero, shared reset epoch and registered migration with write-barrier function/triggers. Generate schema snapshot/journal using current Drizzle. Verify runtime trigger/table coverage. Existing JWTs missing session version mean zero until reset increments it. The implemented trigger also locks the state row so stale repeatable-read snapshots cannot bypass maintenance.

Storage gets strict reset methods without silently altering ordinary deletion behavior. Existing domain and Demo mode contracts stay unchanged. Preserved app_versions keeps Android checks functional.

## 8. System Settings design and implementation checklist

Decision ledger: Keep GABHS red/white, existing System Settings shell, page help and native admin stack. Change overview to expose testing tools distinctly and add a guided reset destination. Frozen: normal academic/lifecycle procedures, server policy labels, RBAC, update distribution. Unknown runtime capabilities are visible blockers, never fake data.

Directions: A guided task page; B dense maintenance console; C compact danger-zone modal. **A selected** under the user's implementation authorization: progressive disclosure accommodates mobile and keeps the destructive action away from overview. Technical inventory expands only on request.

| Surface | Navigation | State/primary action |
|---|---|---|
| Overview | Existing sidebar/drawer; pushes destinations | Calendar, school operations, testing tools; errors must not hide navigation |
| Reset setup | Overview/Advanced/direct link; Back pops actual source, fallback Settings | Year then server period; loading/offline/unavailable/error; Generate preview |
| Review | Same page; Change selection returns to setup | Cleared versus Kept, retained admin, expiry, expandable details |
| Confirm | Same page; cancel clears sensitive form data | Reason/acknowledgements/password/phrase; one Reset school data action |
| Running | Form replaced after acceptance; leaving never cancels server work | Real phase/retry/reconnect; persist operation ID only |
| Complete | Clear local tokens/account caches, replace auth stack | Sign in again; retained credentials and chosen calendar |

Use existing AdminSectionCard/Button/Input/Label and native admin primitives, white surfaces, compact borders, readable warning, side-by-side Cleared/Kept on desktop and stacked on mobile. Cover labels, focus, screen readers, native keyboard and safe area. No standalone HTML mockup was requested; implemented local UI is the browser-verified review artifact.

- [x] Review preservation contract, owners, alternatives and navigation.
- [x] Catalog/policy tests and runtime unknown-scope/reference/cycle blockers.
- [x] Generated schema/migrations, database write barrier, transactional database reset and preservation rehearsal.
- [x] Durable resumable coordinator, external drain/cleanup checkpoints and HTTP fence wiring.
- [x] Preview/execute/auth/idempotency contracts and session invalidation.
- [x] Queue/storage/upload/AI-cache quiescence and verified cleanup.
- [x] Web overview/reset flow, typed contract and behavior tests.
- [x] Mobile overview/reset screen/navigation/offline contract and tests.
- [x] Disposable real PostgreSQL/Redis/files rehearsal, failure injection, fresh setup journey.
- [x] Backend/web/mobile/AI required verification, rendered browser checks, Android packaging.
- [ ] Scoped commit/push, exact-SHA CI/provider success, non-destructive live acceptance and served APK verification.

## 9. Verification and acceptance

| Requirement | Proof |
|---|---|
| Keep essentials | Real DB reset preserves admin/password, roles, policies/transmutation, release/migrations, audit/evidence |
| Clear content | All classified content tables zero, exactly one admin, no vectors/chunks/AI jobs or prior learning state |
| Calendar | Existing policy unchanged; selected valid period; exactly one state with monotonic version |
| Authorization | Role/password/phrase/expiry/scope/idempotency/concurrent request tests |
| Writer safety | Real transaction race; trigger coverage; drained queues and I/O; no late write/cache repopulation |
| Files/queues | Strict inventory/delete/re-list, unrelated objects/keys untouched, partial failure stays pending |
| Auth | Pre-reset JWT/refresh/cache/socket rejection; same admin credentials work after completion |
| Recovery | Restart at each phase resumes one operation; precommit failure leaves data; postcommit remains in maintenance |
| UX | Component/contract tests and browser viewport/interaction proof; mobile Back/offline/keyboard behavior |
| Delivery | Required builds/tests; APK version/signature/ABI/hash; exact pushed SHA CI/deployment and non-mutating live preview |

Source searches or mocked calls alone do not prove cleanup/recovery. Live school records must not be reset as a release smoke test.

## 10. Rollout, recovery, observability and evidence

Availability defaults off. Document explicit environment/storage ownership configuration. Verify migrations, writer and cleanup coverage before enablement. Do not run seed-database.js after reset: it would repopulate demo content.

Precommit failures restore paused queues and release maintenance; postcommit failures remain resumable. Disabling availability does not stop recovery. A coordinated DB/object backup is necessary to undo content deletion. Deployed application code, settings, APK and credentials remain untouched.

Receipts retain actor/environment/target/counts/phases/redacted failures and timing. Existing audit evidence remains. Monitor long maintenance duration, retry count, unknown tables/queues and residual data. Dispose only task-owned local fixtures.

Live counts/storage isolation/replicas, authenticated acceptance credentials, signing and device availability remain runtime boundaries. Record exact SHAs, tests, workflow/deployment IDs and artifact hashes as work progresses. Missing required proof means the goal remains active.

### Implementation evidence checkpoint (2026-09-12)

- Migrations `0022` through `0026` add the reset receipts/state, transaction and I/O fences, durable participants, immutable storage generation and serialized participant retirement. All 27 migrations apply from an empty disposable pgvector/PostgreSQL 16 database, and the 112 application tables plus migration ledger are explicitly classified.
- The real disposable reset runner passes 23 tests: preservation and indexed-content deletion, statement barriers, late-writer denial, coordinator restart, storage-generation races, stable ownership sentinels, materialized-view blocking, graceful retirement in both claim orderings, safe hard-loss recovery for expired idle participants, atomic retirement receipts, and fail-closed handling of expired busy participants. Its databases are automatically dropped; it refuses non-local administrative URLs.
- Automatic hard-loss retirement is deliberately restricted to captured rows with `in_flight=0`, after the coordinator owns the exclusive I/O lock and the heartbeat is older than 30 seconds. An expired busy row cannot be inferred dead during a database partition: it remains in maintenance and requires authoritative process termination/recovery before its real acknowledgement. Pre-commit timeout aborts without deleting data; post-commit cleanup remains retryable and closed.
- Storage keys are immutable-generation scoped. A protected UUID ownership sentinel is rechecked before every destructive batch; local path or S3 locator reuse with a different sentinel blocks. Strict filesystem tests cover outside-file preservation, symlinks and broad-root refusal. S3 tests cover pagination, versions/delete markers, multipart aborts, unversioned delayed deletion, ownership substitution and per-object errors. These provider calls are mocked; no live bucket was purged.
- Backend unit verification passes 155 suites / 1,621 tests and lint passes with 0 errors / 2,293 existing warnings. The production backend build passes twice consecutively with 27 migration-integrity checks. Backend end-to-end passes 3 suites / 8 tests; academic integration passes 2 suites / 55 tests including 1,200 students; queue/Redis integration passes 15 tests.
- AI verification passes 205 tests with 6 database-gated skips, plus its separate real PostgreSQL participant suite passes 6 tests. Frontend passes 191 suites / 859 tests, production build, typecheck, lint, 21 admin contracts / 63 layer checks, and 2 mocked Chromium reset journeys. Mobile passes 124 suites / 698 tests, typecheck, the same contract gate, and its focused final audit passes 7 suites / 41 tests.
- Independent backend, web and mobile review reports live beside this plan. All final findings are resolved and all three reports conclude `APPROVE`.
- Android release `0.1.34` build `35` is ARM64-only, v2-signed, and passes its 10 release-policy tests and manifest verification. APK SHA-256 is `765e90dafcd3c29c08faf94e33ed2d992d45919c59bf50c7c74e2898b8c70774`; size is 41,068,131 bytes. It installs on the available x86_64 emulator but cannot load ARM64 React Native DSOs there, so physical ARM64 launch remains an explicit device boundary.
- Availability remains off by default and requires an environment label, supported single-backend topology, and a matching UUID ownership sentinel. No live reset was executed. Exact pushed SHA, CI/deployment, live health/status, release registration and served-download proof remain release gates.
