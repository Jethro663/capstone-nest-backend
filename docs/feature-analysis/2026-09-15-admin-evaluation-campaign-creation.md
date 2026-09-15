# Admin evaluation campaign creation isolation analysis

Date: 2026-09-15
Route: `/dashboard/admin/evaluations`
Starting revision: `5318b475a88ada8aa974023643c1fea41693a3f3` (`developement`, aligned 0/0 with `origin/developement`)
Status: Direction A approved; bounded implementation and local verification complete; release verification pending

## Outcome

The campaign POST route and typed payload remain aligned. The confirmed user-facing failure is an observability and admission mismatch in the web campaign builder:

1. the form validates only that title and dates are present;
2. it still permits a title longer than 160 characters, an arbitrary free-text class identifier, and an end time that is not after the start time;
3. the backend correctly rejects those inputs with specific validation messages; and
4. the component discards the response and always shows `Failed to create evaluation campaign`.

The supplied toast alone therefore cannot identify which rejected field caused the reported attempt. No retained production request trace or payload for that attempt is available, so selecting one of the possible 4xx causes would be speculation.

A separate confirmed backend integrity gap exists in the same campaign lifecycle: campaign insert, active assignment creation, and audit logging are three awaited writes without a transaction. Production inspection does **not** show that this caused the reported incident—all 10 persisted campaigns have their corresponding create audit row—but a future assignment or audit error could leave a campaign partially created while returning failure.

## Scope boundary

### In scope

- the admin web campaign builder and its interaction tests;
- the existing LXP campaign endpoint, DTO, service, assignment creation, and audit write;
- the campaign status activation path because it shares the same assignment/audit lifecycle;
- contract-regression checks for existing web and mobile consumers;
- release verification for the exact shipped revision.

### Explicitly out of scope

- evaluation question definitions or response scoring;
- student/teacher evaluation presentation changes;
- mobile UI redesign or mobile binary releases;
- unrelated LXP, performance, academic, roster, class, or lifecycle features;
- database migrations or production campaign cleanup;
- creating a durable production campaign only to prove the button.

## Evidence ledger

| ID | Status | Finding | Evidence |
| --- | --- | --- | --- |
| E1 | Confirmed | The admin route renders the shared `SystemEvaluationsPage`; there is no second web campaign implementation. | `next-frontend/app/(dashboard)/dashboard/admin/evaluations/page.tsx:1-10` |
| E2 | Confirmed | The web handler validates only non-empty title/start/end values. | `next-frontend/src/components/evaluations/system-evaluations-page.tsx:153-161` |
| E3 | Confirmed | The handler sends the established form type, audience, title, ISO dates, active status, and optional class ID to the existing service. | `next-frontend/src/components/evaluations/system-evaluations-page.tsx:163-177`; `next-frontend/src/services/lxp-service.ts:333-340` |
| E4 | Confirmed | The catch block has no error parameter and replaces every backend/network rejection with the same generic toast. | `next-frontend/src/components/evaluations/system-evaluations-page.tsx:186-188` |
| E5 | Confirmed | A shared error normalizer already preserves backend string/array messages, status codes, codes, and field errors; the campaign builder does not use it. | `next-frontend/src/lib/api-error.ts:48-105` |
| E6 | Confirmed | The UI has no title length cap, uses an unrestricted free-text `Class ID optional` input, and has no visible start-before-end validation. | `next-frontend/src/components/evaluations/system-evaluations-page.tsx:285-343` |
| E7 | Confirmed | The DTO requires UUID-v4 class IDs, title length at most 160, and ISO dates. | `backend/src/modules/lxp/dto/lxp.dto.ts:368-391` |
| E8 | Confirmed | The backend emits a precise error when the end is not after the start and enforces form/audience and role/class rules before writes. | `backend/src/modules/lxp/system-evaluation.service.ts:47-85`, `:166-190` |
| E9 | Confirmed | The controller route and frontend service path both use `POST /lxp/system-evaluation-campaigns`; no route or envelope mismatch was found. | `backend/src/modules/lxp/lxp.controller.ts:345-356`; `next-frontend/src/services/lxp-service.ts:333-340` |
| E10 | Confirmed | Campaign insert, assignment insert, and create audit are sequential writes on the root database handle, not one transaction. | `backend/src/modules/lxp/system-evaluation.service.ts:120-145`, `:192-222` |
| E11 | Confirmed | Campaign activation repeats the same update -> assignment -> audit sequence without a transaction. | `backend/src/modules/lxp/system-evaluation.service.ts:317-350` |
| E12 | Confirmed | Campaign/assignment tables and foreign keys exist in source and production listing works; no missing-table or route-load failure was observed. | `backend/src/drizzle/schema/lxp.schema.ts:382-451`; authenticated production page observation, 2026-09-15 |
| E13 | Confirmed | Production currently contains 10 campaigns. All 10 have one `lxp.system_evaluation_campaign.created` audit row; the newest persisted campaign was created 2026-09-13T11:36:06.292Z. | read-only production PostgreSQL query, 2026-09-15 |
| E14 | Confirmed | Production has three active students and three active teachers. Existing role-wide teacher campaigns have three assignments, while historical role-wide student campaigns have zero; this is persisted state, not proof of the current create failure. | read-only production PostgreSQL query and authenticated campaign list, 2026-09-15 |
| E15 | Confirmed | Runtime logs inspected across the current and eight recent backend deployments contain no retained exception for `POST /api/lxp/system-evaluation-campaigns`. Expected DTO/BadRequest rejections are not logged as unhandled exceptions. | Railway deploy/HTTP log inspection, 2026-09-15 |
| E16 | Confirmed | Existing web tests cover a valid request and pagination only; they do not assert date order, class selection, backend error visibility, or failure-state retention. | `next-frontend/src/components/evaluations/system-evaluations-page.test.tsx:19-102` |
| E17 | Confirmed | Existing backend service tests cover pagination and one authorization case only; they do not protect transaction ownership or rollback behavior. | `backend/src/modules/lxp/system-evaluation.service.spec.ts:1-75` |
| E18 | Confirmed | Mobile consumes the same campaign endpoint, so the public contract must remain unchanged, but its builder already validates date order and surfaces normalized application errors. | `mobile/src/api/services/evaluations.ts:234-263`; `mobile/src/screens/AdminEvaluationsScreen.tsx:175-222` |
| E19 | Confirmed | The September 12 admin overhaul changed campaign pagination/listing, not the create DTO or backend create algorithm. | `git diff a4d82524^ a4d82524 -- backend/src/modules/lxp/system-evaluation.service.ts next-frontend/src/components/evaluations/system-evaluations-page.tsx` |
| E20 | Confirmed | Focused baseline suites pass at the untouched revision: backend 2/2 tests; frontend 17/17 tests across the page and service suites. | commands recorded under Verification baseline |
| E21 | Inferred | The reported attempt most likely received a handled 4xx validation/admission response or a client/network rejection, because the route is live and no matching unhandled 500 is retained. The exact member of that set is unknowable from the generic toast. | E4-E9, E12-E15 |
| E22 | Unverified | The exact request payload, HTTP status, and backend response message for the user's failed attempt. | Not retained by the component or available logs |

## Dependency and state map

```text
/dashboard/admin/evaluations
  -> SystemEvaluationsPage.handleCreateCampaign
  -> lxpService.createSystemEvaluationCampaign
  -> POST /api/lxp/system-evaluation-campaigns
  -> LxpController
  -> LxpService facade
  -> SystemEvaluationService.createCampaign
       validate role/form/date
       insert campaign
       if active: resolve users/enrollments -> insert assignments
       append audit row
  -> campaign list/count UI

Persisted assignments
  -> GET /api/lxp/me/system-evaluations
  -> student/teacher web and mobile evaluation inboxes
  -> assigned response submission
  -> admin evaluation result reporting
```

The backend remains the authority for role/form/date rules and durable campaign/assignment/audit state. Web and mobile remain clients of the same `/api/lxp` contract.

## Actual cause classification

### Primary, confirmed cause of the visible error

The web component destroys the only diagnostic evidence by ignoring the rejected error object. This converts actionable messages such as an invalid UUID or reversed date range into the same generic toast. It also prevents the admin from knowing which field to correct.

### Confirmed admission mismatch that can trigger the error

The form permits values the endpoint rejects:

- title length is not capped at 160;
- class scope is an unvalidated UUID text box instead of a class selection;
- end time is not checked against start time before the request.

These are deterministic frontend/backend contract gaps. The exact gap exercised by the reported attempt remains unverified because E22 is unavailable.

### Confirmed latent integrity defect, not attributed to this incident

Campaign creation and activation are not atomic. A future downstream database/audit failure can return an error after an earlier write succeeds. All inspected production campaign rows have audits, so this is not claimed as the cause of the existing 10 rows.

### Ruled out by current evidence

- missing campaign route;
- web/backend path mismatch;
- DTO field-name mismatch;
- missing campaign tables;
- September 12 pagination work changing the create contract;
- persisted campaigns currently lacking their create audit record.

## Redesign directions

### Direction A — guided, observable campaign builder (recommended)

Keep the current page and public API contract, but make campaign scope explicit:

- `Role-wide` or `Specific class` scope control;
- existing class API-backed selector for class scope, never raw UUID entry;
- title counter/160-character cap and inline required errors;
- start/end validation before submit;
- backend response text through `getApiErrorMessage` with the generic text only as fallback;
- successful result includes assigned-recipient count;
- campaign creation and activation writes run in one database transaction.

This removes known invalid-input paths, makes any remaining rejection actionable, and protects durable state without creating a new endpoint or touching mobile UI.

### Direction B — minimal diagnostic patch

Keep the raw form, add title/date checks and surface the backend message; add backend transaction coverage. This is the smallest diff but leaves admins copying UUIDs and preserves an avoidable input-error path.

### Direction C — multi-step campaign wizard with preview

Add audience/scope, schedule, recipient preview, and confirmation steps. This provides the strongest preflight experience but requires a recipient-preview contract and materially expands backend/UI scope beyond the reported regression.

## Recommended decision

Choose Direction A. It is the narrowest direction that fixes both confirmed frontend causes and the same-feature integrity gap while preserving route, DTO, role rules, mobile behavior, schemas, and historical records.

## Verification baseline

```text
backend/
npm test -- --runInBand src/modules/lxp/system-evaluation.service.spec.ts
PASS: 1 suite, 2 tests

next-frontend/
npm test -- --runInBand src/components/evaluations/system-evaluations-page.test.tsx src/services/__tests__/lxp-service.test.ts
PASS: 2 suites, 17 tests
```

## Direction A implementation evidence

The approved implementation stays inside the documented web campaign builder and backend campaign lifecycle. It adds no endpoint, DTO field, schema migration, production campaign, or mobile UI change.

| Status | Evidence |
| --- | --- |
| Confirmed | Web interaction coverage now proves role-wide omission of `classId`, selected-class submission, local required/title/date validation, backend error preservation, failed-form retention, assignment-count feedback, and post-success refresh: 9/9 focused tests and the full 195-suite/885-test frontend run passed. |
| Confirmed | Backend coverage now proves draft, active-create, and activation transaction ownership; same-handle audit writes; ordered campaign/assignment/audit writes; and validation/authorization rejection before transaction: 70/70 focused and adjacent tests plus the full 167-suite/1,735-test backend run passed. |
| Confirmed | The unchanged mobile endpoint contract remains compatible: 8/8 API contract tests passed. |
| Confirmed | Backend production build and Next.js production build both completed successfully. |
| Pending | Exact pushed revision, CI, Railway deployment, public health, and read-only authenticated route evidence are release-stage checks. |

## Approval gate

Direction A was explicitly approved by the user. The bounded implementation is complete locally; execute the release stage in `docs/feature-plans/2026-09-15-admin-evaluation-campaign-creation.md` without creating a production campaign.
