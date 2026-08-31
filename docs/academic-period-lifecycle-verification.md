# Academic lifecycle delivery evidence

Verified locally on 2026-08-31 in the existing worktree. The authoritative design is [academic-quarter-lifecycle-and-annual-grading-analysis.md](academic-quarter-lifecycle-and-annual-grading-analysis.md). No production writes, deployment, commit, or push were performed. A production database snapshot was read in a PostgreSQL-enforced read-only session and restored only into isolated local databases. Browser and native interactions used synthetic accounts, never copied production users.

## Delivered behavior

The backend now owns frozen school-year policies, authenticated period activation, complete period grading, immutable revisions, annual learning-area results, transfer evidence, SRC, back subjects, Grade 10 completion, and a serialized year transition. Web and mobile provide the affected admin and teacher controls, assessment lifecycle restrictions, workbook eligibility and exemptions, history, annual results, and exports. Student entry points respect server lifecycle capabilities; direct requests remain guarded by the backend.

The old per-student promotion/retention/graduation actions cannot bypass the verified year transition. Historical policy and legacy grade values are preserved. Repair requires explicit evidence and never silently converts missing scores into zero or an incompatible Q4 into Term 3.

## Acceptance coverage

| Requirement | Implementation and verification evidence |
| --- | --- |
| Frozen legacy/2026/2027 policy, weights, exact rounding | `backend/src/modules/academic-state/academic-policy{,.spec}.ts`, `academic-policy.service.spec.ts`: four versus three periods, 70-to-75 adjusted threshold, zero-based grades, exact half-up annual arithmetic, subject classification and immutable policy arrays. |
| Authenticated/versioned activation, including ABA and replay | `academic-period.service.ts`; PostgreSQL scenario “activates periods with step-up authentication, version preconditions, replay protection, and reasoned overrides”; web System Settings tests verify exact observed version and password gating. |
| Future preparation, active release/start, ongoing completion, historical viewing | `assessment-academic-capabilities.spec.ts`, `assessments.service.spec.ts`, and the PostgreSQL future-draft/placement/ongoing-completion scenario cover normal, core, upload, question/rubric, timed, finalized and closed-year paths. Browser teacher flow confirmed a saved Term 2 draft with Term 1 active and release disabled. |
| Eligibility, missing/zero/excused, configured components and pending review | `class-record-calculation.spec.ts`, `class-record-readiness.service.spec.ts`, `class-record-sync.service.spec.ts`, and PostgreSQL confirmed-complete-finalization and exemption-restoration scenarios. Explicit zero is retained; a whole excused category blocks; modern ST1/ST2/TE weighting and empty confirmed rosters are covered. |
| Immutable period evidence and audited correction | PostgreSQL finalization/reopen scenarios preserve every revision and invalidate dependent annual evidence; restoration of a linked exemption requires a reason and does not invent a score from an ungraded attempt. |
| Annual completeness, transfers, external evidence, duplicate-source choice | `annual-grade-sources.spec.ts` and PostgreSQL annual/idempotency/source-conflict/reopen scenarios verify one trusted source per policy period and no partial annual result. |
| SRC, retention, conditional promotion and Grade 10 | `academic-policy.spec.ts` covers all-pass, one/two/three failures, SRC pass/fail, and Grade 10 deficiencies. PostgreSQL remediation/back-subject and Grade 10 completion scenarios cover persistence, scheduling limits, clearance and append-only completion evidence. |
| Expected matrix and serialized transition | PostgreSQL successful/missing/draft/early/non-next-year/conflicting/concurrent transition tests, competing correction and imported-student tests. Clones retain structure, new rosters stay empty, state resets to the first period, and failures roll back outcomes, profiles, clones and audit. |
| Grouped reminders, deduplication and after-commit effects | PostgreSQL reminder tests include a missing period, a ready teacher, identical repeats and rollback with no escaped notification; `academic-transaction.spec.ts` verifies request isolation and nested transaction behavior. |
| Non-destructive upgrade and explicit recovery | `backend/test/academic-migration-upgrade.cjs`, fresh migration runner, and PostgreSQL legacy archive, incompatible Q4, duplicate state, workbook repair and duplicate-class retirement scenarios. No annual trust is fabricated by migration. |
| Web controls, workbook and export parity | System Settings, assessment editor, workbook, workbook hook and export tests; live production-browser observations below. Export uses backend annual evidence, distinguishes null/zero/excused, and includes policy/source identifiers. |
| Mobile controls, navigation, workbook and contracts | Admin Academic tab, teacher creation/editor/workbook screens, capability-aware assessment details, annual/recovery panels and academic export; React renderer, API contract and navigation regressions, TypeScript and Android bundle checks. Assessment changes invalidate academic and class-record caches. Android API 35 emulator interaction covered admin navigation, roster confirmation with keyboard input, incomplete annual evidence, CSV file creation and the native sharing chooser; teacher workbook navigation, explicit-zero entry and an evidenced exemption were exercised. |

## Verification results

| Check | Result |
| --- | --- |
| Backend full Jest run | 106 suites, 1,219 tests passed. |
| Real PostgreSQL lifecycle suite | 29 scenarios passed on PostgreSQL 16 and again on PostgreSQL 18; the large-fixture scenario is opt-in and was run separately. |
| Fresh migration | All 16 migrations applied successfully, including additive lifecycle migrations 0011–0015. |
| Upgrade and repeat migration | Passed from the schema through 0010. Exact legacy grade `74.125`, explicit zero, incompatible Q4, duplicate academic-state rows and unconfirmed roster survived; no annual snapshot was fabricated. |
| Large PostgreSQL fixture | 1,200 learners, 240 classes, 720 period records, 28,800 period grades and 9,600 annual grades. The PostgreSQL 18 rerun found the deliberately stale annual result in 1,291 ms locally; the entire fixture test took about 35 seconds. This is not a production latency guarantee. |
| Backend production build / migration checks | Passed. `dist/main.js` is asserted during every build; the audit compiles to `dist/scripts/academic-audit.js`. Both `npm run start:prod` and the actual Docker entrypoint passed `/api/health/live` against disposable local services. |
| Backend lint | Passed: zero errors, 2,288 warnings under the repository's existing maximum of 2,300. The warning backlog is not a clean-lint claim. |
| Web full Jest run | 154 suites, 646 tests passed with `--ci --maxWorkers=2`; process exited normally without `--forceExit` or a worker shutdown warning. A missing performance-analytics mock in the admin dashboard test had left a real 30-second HTTP timeout alive; the test now mocks that service. |
| Web production build | Passed; the standalone build ran against the disposable backend for browser verification. |
| Web full lint | Passed: zero errors and zero warnings. |
| Web standalone TypeScript | Passed with zero diagnostics. Corrected incomplete test fixtures and actual nullable API fields, including hidden feedback, optional profile values, and section-card clearing. `npm run typecheck` is a CI gate, and Next no longer ignores build type errors. |
| Mobile full Jest run | 39 suites, 213 tests passed on the final source, including grade-preview envelope, workbook, export, and navigation regressions. |
| Mobile TypeScript | Passed. |
| Mobile Android export | Expo/Hermes test bundle passed with an explicit local API URL. A separate ARM64 internal APK was then built with the production API URL; see packaging evidence below. |
| Deployment guard | 10 Node tests passed for exact deployment ID matching, startup waiting, failure and timeout handling. The CLI adapter also read existing backend/frontend deployment statuses successfully without triggering a deployment. |
| OpenSpec / whitespace | Strict validation and `git diff --check` passed. |

## Browser observations

The Codex in-app browser used real password login against a production Next standalone process on localhost and the full Nest app on a disposable PostgreSQL/Redis stack. Accounts and all mutations were synthetic; there was no production connection. `backend/test/academic-browser-seed.cjs` recreates the initial fixture only in an empty local test database.

- Admin System Settings showed `2026-2027 · Term 1`, policy `deped-2026-v1`, state version 1, and only Term 1–3. Incomplete transition was disabled and supplied working admin workbook links.
- Activation preview displayed open/missing records and unfinished-attempt counts. Activation remained disabled without a password. Backend tests cover the actual authenticated commit and stale-state failures.
- Admin workbook creation succeeded. An unconfirmed roster blocked finalization; confirmation required a reason. HPS editing changed an unused slot into a required item displaying Missing.
- Entering `0` displayed a numeric zero and satisfied that item's presence requirement. Recording an evidenced exemption showed the all-excused-category blocker. Neither action produced a fabricated final grade.
- Annual Summary displayed every required term as Missing and the official annual result as Incomplete. Admin external-source and source-selection controls were present. Export completed without an application error; generated row content and source parity are separately covered by tests.
- Teacher selected Term 2 when creating an assignment. The editor loaded `Term 2 · active Term 1`, saved an edited title, and kept “Ready to give” disabled. The stored period was not overwritten by current state.
- A screenshot of the admin annual view was inspected: period controls, readiness, evidence tabs, annual columns and repair controls were legible without overlapping elements.

## Reproducing the checks

Use a disposable local PostgreSQL/pgvector database. Integration tests truncate their fixtures and explicitly refuse non-local/non-test database names. Never point these commands at production.

```sh
# backend/, with DATABASE_URL set to a fresh disposable local database
node run-migrations.js
npm run build
# REDIS_URL must also point to a disposable local instance; port 3000 must be free
npm run test:production-start
npm run lint
npm test -- --runInBand
# ACADEMIC_TEST_DATABASE_URL must identify the disposable local test database
npm run test:academic
ACADEMIC_LARGE_FIXTURE=1 npm run test:academic -- -t 'school-sized matrix'
# This harness needs a separate EMPTY local test database
node test/academic-migration-upgrade.cjs

# next-frontend/
npm run lint
npm run typecheck
BACKEND_INTERNAL_URL=http://127.0.0.1:3000 npm run build
npm test -- --ci --maxWorkers=2

# mobile/
npm run typecheck
npm test -- --runInBand
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000/api npx expo export --platform android --output-dir /tmp/nexora-academic-mobile-test

# repository root
openspec validate academic-period-lifecycle --strict
git diff --check
```

## Release hardening and production-copy rehearsal

- Backend build input is explicitly `src/**/*.ts`, with `rootDir: src`; moving the audit under `src/scripts/` prevents it from shifting the production output to `dist/src/main.js`. A build-output assertion catches that regression. Incremental build metadata is also stored inside `dist/`, so Nest cleaning the output cannot leave a stale external cache that suppresses the next build. CI builds twice consecutively to guard repeatability. The compiled audit runs without a development-only TypeScript loader.
- CI now checks fresh migration, the 29 real transaction scenarios, legacy upgrade/replay, and the actual production command on both pgvector/PostgreSQL 16 (Compose) and 18 (production). The web job includes standalone type checking. Frontend deployment depends on the exact backend deployment reaching runtime `SUCCESS` for the same CI-tested commit. Both jobs capture the `railway up --detach --json` receipt and wait for its deployment ID; they cannot accept an older successful deployment. Backend `/api/health/live` and frontend `/` health checks are configured with 300-second timeouts. Both config files validate against the official Railway JSON schema. CI runs the 10 deployment-guard tests, including on pull requests changing `.github/scripts/`.
- PostgreSQL 18 production snapshot: approximately 45 MB database / 6 MB custom backup. Restore and additive migration succeeded locally. A second untouched restore reproduced the old schema for rollback comparison. All original columns and rows across ten checked tables were unchanged: 36 classes, 73 enrollments, 42 student profiles, 34 records, 714 items, 41 scores, **25 final grades**, one academic state, 53 assessments and 29 attempts. Every saved final grade has exact archived legacy evidence; no annual result was manufactured.
- Native Android: Java 17 debug build for x86_64 succeeded and ran on the API 35 emulator through the production Docker backend with synthetic fixtures. Admin Academic navigation, term-record creation, typed eligibility confirmation, incomplete annual display, native CSV creation and Android sharing chooser passed. Sharing was cancelled without sending the file. CSV contents retained the policy, required periods and missing/incomplete semantics. Teacher navigation to Class Record, HPS editing, explicit zero and an evidenced exemption passed; the saved score was `recorded/0.00` and then `excused/null`, with its reason retained. Both synthetic role sessions were logged out. The admin header was corrected to identify the admin workspace.
- PostgreSQL enforced read-only access during the remote backup. Migration, audit and restore ran locally. Private snapshot and detailed audit reports are outside the repository; do not commit them or treat temporary local storage as the school's durable backup policy.

## Remaining production decisions

The code and migrations can be reviewed/committed, but **an automatic production rollout is not yet a green light**. Pushing this branch triggers deployment. A migration that preserves rows does not resolve whether old academic evidence is valid for the new policy.

The copied production state is **2027–2028, Q1**. Its audit reports 53 blocker findings and one policy-initialization review across 15 classes / 16 records. These are findings, not 53 distinct students or broken migrations:

| Current-year finding | Count | Required resolution |
| --- | ---: | --- |
| Workbook weights differ from policy | 11 | Review the source record and use the evidenced workbook-policy repair. Preserve/reopen prior evidence as required. |
| Examination components not mapped to ST1/ST2/TE | 16 | A school owner must identify the intended component for each examination item. Do not guess mappings from order. |
| Unconfirmed period participation | 16 | The responsible teacher/admin confirms the actual period register, with reasons for exclusions or transfers. |
| Legacy grades not verified for official reuse | 2 | Verify the archived values against source documents; do not relabel a legacy incomplete computation as trusted. |
| Unknown subject policy profile | 5 | Confirm the official learning area and grade level or explicitly retire a non-academic/duplicate class. |
| Q4 assessments in a three-term year | 3 | Explicitly preserve as historical or relocate an eligible draft with evidence; never silently map Q4 to Term 3. |

Historical audits also found 20 blocker findings in 2024–2025 and 29 in 2025–2026, plus one policy-initialization review per year. Missing/invalid assessment periods and historical participation/evidence must be reviewed before reusing those years' results. All 25 original final grades remained unchanged and archived.

Before rollout, approve the record-specific repair plan and maintenance window, take a fresh durable backup, deploy the backend before the web client, run the read-only audit again, and resolve/acknowledge the old records through the evidence-preserving controls. Do not enable official finalization/year transition while required evidence is unresolved. Before any new official writes, rollback can restore the verified snapshot and previous binaries; after official writes, retain all new history and use forward repair rather than dropping grade tables.

The native interaction evidence is from the x86_64 debug build against a local API. The ARM64 release APK described below still requires acceptance on a physical ARM device; iOS was not run. AI-provider and email delivery were isolated and were not revalidated by this academic release review.

## Internal Android package

- Updated `mobile/app.json` and Android version metadata to **0.1.9 / versionCode 10**. Java 17 `assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 -x lint -x test` succeeded; mobile tests and type checking were run separately.
- Built with `EXPO_NO_DOTENV=1`, `NODE_ENV=production`, explicit production `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL`, blank login-seed/development credentials and both auto-login flags false. The generated release bundle was explicitly rebuilt rather than trusting Gradle's up-to-date result after an environment change. Hermes bytecode confirms the API configuration loads `https://capstone-backend-v2-production.up.railway.app/api` and the matching production socket origin.
- APK: `next-frontend/public/downloads/nexora-student-mobile-release.apk`, **38,957,082 bytes**. SHA-256: `63a2ff4d22f617ff280feb336f7f4f110333d814ee9a23369e85751eaa6c1da9`. The public download and generated release APK match byte for byte. ZIP integrity and embedded/generated Hermes bundle equality pass; the academic controls are included.
- Package `com.nexora.lms.mobile`, minimum Android API 24, target 36, ARM64 only. APK signature verification passes and the certificate matches the prior downloadable APK, allowing the existing internal update path. It is still signed with the existing **Android Debug certificate**: this is an internal package, not a store-ready production-signing claim.
- The new and previous ARM64 APKs both fail identically when launched through the x86_64 emulator's ARM translation (`SoLoaderDSONotFoundError` for `libreactnative.so`). All 20 packaged native libraries are byte-identical between those APKs. This is a baseline emulator limitation, not evidence of a successful ARM release launch; physical-device acceptance remains required. The separate native x86_64 grading scenarios above passed.
- No APK was published remotely and no production app-version record was changed. Distribute it only with the coordinated backend/web rollout.

The deployment guard is needed because Railway CLI `--ci` follows build logs rather than proving runtime readiness; see the [CLI implementation](https://github.com/railwayapp/cli/blob/master/src/commands/up.rs). Health-check configuration follows [Railway's health-check documentation](https://docs.railway.com/deployments/healthchecks). The existing services support `railway.json`; Railway currently documents that legacy config format through 2026-12-01, so migrate these settings to its replacement before that deadline ([configuration reference](https://docs.railway.com/config-as-code/reference)).


## Final delivery authorization and rerun (2026-08-31)

The user subsequently authorized commit and push after another successful verification run, including the configured production deployment workflow. That authorization does not certify the school records listed above. The release retains its evidence checks; no roster, exam mapping, legacy grade or period placement is being approved automatically. A fresh production snapshot was taken through a read-only session and saved in private persistent local backup storage outside the repository before delivery.

Fresh rerun: backend 106 suites / 1,219 tests; backend e2e 2 suites / 5 tests; web 154 suites / 646 tests with a clean exit; mobile 39 suites / 213 tests; AI service 172 tests. Web/mobile type checks and web lint passed; backend lint remains at zero errors / 2,288 existing warnings. PostgreSQL 16 passed 29 lifecycle scenarios, and PostgreSQL 18 passed all 30 including the larger fixture; fresh migration and legacy upgrade/replay passed on both. The repeat-build failure was reproduced, fixed by colocating TypeScript incremental metadata with `dist`, and followed by two successful production builds. The fresh production-copy migration preserved all original values in ten tables (now 57 assessments), including all 25 saved final grades; the current-year audit remains at 53 blockers and one review.
