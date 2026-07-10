# Backend + AI Performance Audit

## Audit Summary

- Date: `2026-07-10`
- Repo: `capstone-nest-react-lms`
- Backend root: `backend`
- AI root: `ai-service`
- Findings recorded: `6`
- Severity counts: `{'high': 3, 'medium': 3}`

## Baseline Findings

- Backend build and Drizzle migration-integrity check passed in approximately 24 seconds.
- Backend non-mutating ESLint check passed.
- Targeted assessment and performance suites passed: 97 tests.
- Frontend ESLint passed, but Next.js build is blocked locally because Node 18.19.1 is below Next.js 16's required Node >=20.9.0.
- Mobile typecheck and Jest suite passed.
- AI-service tests and import check are blocked because the local Python interpreter lacks the dependencies declared in ai-service/requirements.txt.

## Prioritized Findings

### 1. Class performance recomputation repeats full data reads for every student

- Priority: `P1`
- Severity: `high`
- Subsystem: `backend`
- Category: `repeated-queries`
- Files: backend/src/modules/performance/performance.service.ts
- Rationale: A class recompute invokes recomputeStudent once per student; each invocation reads that student's submitted attempts and all class-record items with their scores. The read work grows with both students and record rows, and the same record dataset is repeatedly transferred and searched.
- Evidence: recomputeStudentsForClass batches five recomputeStudent calls; getClassRecordComponent queries class records with all item scores per call; buildClassRows can trigger this synchronous path for missing snapshots.
- Expected impact: A set-based batch loader can reduce class-record reads from one per student to one per class and avoid an expensive request-path refresh.
- Verification target: New batch-recompute unit tests plus performance.service.spec.ts, backend build, and a seeded class benchmark.
- Status: `candidate`

### 2. Student assessment listing is an N+1 query path and loads unbounded nested data

- Priority: `P1`
- Severity: `high`
- Subsystem: `backend`
- Category: `n-plus-one`
- Files: backend/src/modules/assessments/assessments.service.ts
- Rationale: The student path fetches every class assessment including questions and options, then awaits canStudentAccessAssessment for each assessment. Core-template checks issue another module-items query per assessment before in-memory pagination.
- Evidence: getAssessmentsByClass lines 1473-1517 and canStudentAccessAssessment lines 1092-1138.
- Expected impact: One visibility query keyed by assessment IDs, followed by DB pagination and a detail query only for the visible page, will lower query count and response payload size as a class grows.
- Verification target: Assessment visibility/pagination regression specs and endpoint timing with a large seeded class.
- Status: `candidate`

### 3. Reindexing repeats chunk construction and uses one SQL round trip per chunk

- Priority: `P1`
- Severity: `high`
- Subsystem: `ai-service`
- Category: `redundant-computation-and-writes`
- Files: ai-service/app/indexing_pipeline.py, ai-service/app/main.py, ai-service/app/library_indexing_pipeline.py
- Rationale: reindex_class_content constructs each category of chunks for the combined list, then constructs all three collections again only to count them. It then issues one INSERT ... RETURNING per chunk. Backfill routes invoke full reindexes sequentially on a request-held database session.
- Evidence: indexing_pipeline.py lines 856-970; main.py lines 2800-2820; library_indexing_pipeline.py lines 341-375.
- Expected impact: Retaining the first chunk lists and inserting chunks in bounded bulk batches can materially reduce CPU allocation and database round trips; backfills should run through the existing queue boundary rather than a live HTTP request.
- Verification target: indexing pipeline tests, row-count equivalence test, and an index benchmark with representative chunk volume.
- Status: `candidate`

### 4. One 198 KB FastAPI module owns routes, background execution, runtime state, and extraction workflows

- Priority: `P2`
- Severity: `medium`
- Subsystem: `ai-service`
- Category: `weak-module-boundary`
- Files: ai-service/app/main.py
- Rationale: The single module contains more than 40 route handlers plus job recovery, background task management, metrics, indexing, extraction, and teacher generation orchestration. This makes route-level changes expensive to review and increases regression coupling.
- Evidence: ai-service/app/main.py is about 199 KB and route definitions span chat, tutor, indexing, extraction, and teacher-job families.
- Expected impact: Splitting by route family behind APIRouters preserves contracts while isolating dependencies and reducing extension risk. This is structural rather than directly benchmarked.
- Verification target: Route-contract/import tests and backend AI-proxy compatibility checks.
- Status: `deferred`

### 5. Local verification is not reproducible from the documented host environment

- Priority: `P2`
- Severity: `medium`
- Subsystem: `cross-repo-tooling`
- Category: `toolchain-drift`
- Files: next-frontend/package.json, next-frontend/Dockerfile, ai-service/requirements.txt
- Rationale: The frontend Docker image correctly uses Node 20, but the host used for the scan runs Node 18.19.1 and cannot build Next.js 16. The AI test command uses system Python, which has no declared dependencies installed.
- Evidence: next build exits with Next.js's Node >=20.9.0 requirement; AI test imports fail for fastapi, httpx, pydantic, sqlalchemy, and fitz.
- Expected impact: Pinning tool versions and providing a bootstrap command or dev container turns a partial health check into a reliable full-repo gate.
- Verification target: Fresh-clone CI or container job running all four baseline commands.
- Status: `candidate`

### 6. Refresh paths fan out to per-class queries

- Priority: `P3`
- Severity: `medium`
- Subsystem: `mobile`
- Category: `client-request-fanout`
- Files: mobile/src/screens/ClassDetailScreen.tsx, mobile/src/screens/DashboardScreen.tsx
- Rationale: Several screens refresh base queries and then map refetch across every visible class. The shared 30-second cache softens normal navigation, but manual refresh can create request bursts proportional to enrollment count.
- Evidence: ClassDetailScreen and DashboardScreen use Promise.all with mapped class-level refreshers.
- Expected impact: Consolidated dashboard/class-summary endpoints or a bounded client concurrency helper would reduce mobile-radio and backend burst load. Requires UX/API decision.
- Verification target: React Query integration test and network trace on accounts with many classes.
- Status: `deferred`

## Actual Edits

- No production code changed; this run is a read-only audit.
- Created this audit artifact.

## Verification Run

- backend: npm run build (passed, approximately 24 seconds)
- backend: npx eslint '{src,apps,libs,test}/**/*.ts' (passed)
- backend: npm test -- performance.service.spec.ts assessments.service.spec.ts --runInBand (97 passed)
- next-frontend: npm run lint (passed)
- next-frontend: npm run build (blocked by host Node 18.19.1; requires >=20.9.0)
- mobile: npm run typecheck (passed)
- mobile: npm run test -- --runInBand (passed)
- ai-service: python3 scripts/run_tests.py (blocked by missing declared dependencies)

## Before vs After

### Improved

- The audit identified three P1 data-flow hotspots with direct code evidence and a staged remediation path.

### Stayed The Same

- No runtime benchmark suite or production trace was available, so performance deltas are reasoned rather than measured.

### Remaining Risks

- AI test health and frontend production build cannot be asserted until the local toolchain is aligned.

## Second-Pass Clean Check

- No code was changed, so existing response envelopes, auth enforcement, and backend-to-AI proxy contracts remain untouched.
- Backend queue use and client caching are present; recommendations avoid speculative caching or official-record writes.
