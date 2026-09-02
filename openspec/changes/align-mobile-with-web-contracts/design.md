## Context

The backend owns public API contracts, role enforcement, academic state, audit history, and durable AI job orchestration. Web and mobile are separate consumers with different auth and file-handling transports. The 2026-09-02 audit confirmed that most literal mobile routes exist, but several adapters and screens use stale response models, drop authoritative fields, swallow failures, discard pagination, or expose placeholders instead of working role modules.

The remediation spans evaluations, assessments, AI drafts, paginated resources, account/navigation behavior, LXP content, teacher tooling, administrator workflows, and contract governance. Existing backend behavior is retained unless a mobile capability requires a missing aggregate or contract-export seam. Existing unrelated work must be preserved.

## Goals / Non-Goals

**Goals:**

- Make every shipped mobile workflow use the backend-owned contract and match essential web behavior.
- Eliminate false success, fabricated production data, stale response shapes, and silent pagination truncation.
- Keep assessment order/timing, grading, feedback, AI settings, audit events, and academic safeguards server-authoritative.
- Replace misleading role navigation/placeholders with real workflows.
- Add adapter-boundary and semantic contract tests that prevent recurrence.
- Verify the affected backend, web, and mobile surfaces proportionally to risk.

**Non-Goals:**

- Mobile will not call `ai-service` directly.
- Client code will not become an authentication, academic-state, grading, audit, or AI-job authority.
- The change will not weaken RBAC, validation, password/reason confirmation, idempotency, or immutable academic-history rules for convenience.
- UI pixel identity with web is not required; functional and contract parity is required.
- Deployment, commit, push, or production data mutation is not implied by implementation.

## Decisions

### Backend/OpenAPI is the contract authority

Client types will be generated from or mechanically validated against the backend public schema. Web is a tested reference consumer, not an authority when it conflicts with backend policy. Directly sharing web service files was rejected because browser cookie/file behavior differs from React Native secure storage and protected-file handling.

### Repair high-risk behavior before broad feature coverage

Work proceeds in independently verifiable slices: evaluation integrity; assessment runtime; grading/results; AI settings; pagination/export; account/navigation; LXP; teacher tooling; admin; governance. This limits cascade risk and makes regressions attributable.

### Tests cross the real adapter boundary

Screen-only mocks are insufficient for contract integrity. Every fixed service receives tests that inspect actual Axios method/path/body/params or parse a backend-derived fixture. Screen tests then verify presentation, error state, navigation, and cache invalidation.

### Errors remain errors

Production adapters may normalize compatible envelopes, but they may not convert rejected HTTP operations to demo data, empty authoritative state, or successful writes. Explicit demo/test providers must be separately injected and excluded from production composition.

### Server timestamps and IDs drive assessment runtime

Question order, current index, deadlines, and submission state come from the current attempt response. Local clocks only calculate display deltas. Foreground/resume and every progress mutation resynchronize from the server.

### Pagination metadata is never discarded

Paginated service methods return their complete envelope. Reusable infinite/page loaders consume it. Aggregating screens either request a backend aggregation or deliberately walk all pages within reviewed bounds; arbitrary `limit: 100` is not completeness.

### Official exports stay server-generated and audited

The official mobile export path downloads the backend CSV. A local visible-row convenience export may exist only under a distinct label and must not impersonate the official report.

### Admin parity is modular, not one monolithic screen

Admin navigation will compose domain-specific service/screens for overview, users, classes/sections, assessments, announcements/calendar, library, reports/evaluations, audit/diagnostics/roster/settings, profile, and academic operations. Shared primitives may be reused, but each module owns typed loading, empty, error, paging, mutation, and invalidation behavior.

## Risks / Trade-offs

- **Large cross-surface scope can hide regressions** → Land and verify one contract slice at a time; do not batch unrelated production changes before its focused tests are green.
- **Generated types may not represent polymorphic runtime data perfectly** → Add reviewed overrides and backend-derived semantic fixtures rather than hand-maintaining an entire parallel model.
- **Timed assessment race conditions** → Treat server response as final, use idempotent/safe mutation paths, and test deadline, background, offline, and resume boundaries.
- **Fetching all pages can create load spikes** → Prefer page UI or server aggregation; fetch-all is allowed only with explicit bounds and cancellation.
- **Admin mobile breadth increases security exposure** → Reuse backend RBAC and validation, avoid caching sensitive data unnecessarily, and include role-negative tests.
- **Current OpenSpec assessment change has an unfinished runtime gate** → Integrate its remaining evidence into this change without declaring provider/device coverage that did not run.
- **Current branch may change during a long goal** → Recheck status/diff before every slice and preserve user-owned changes.

## Migration Plan

1. Capture current backend-derived fixtures and failing adapter tests.
2. Repair P0 evaluation and assessment runtime behavior without changing backend persistence.
3. Reconcile grading/result and AI settings contracts.
4. Change paginated mobile service return types and update every consumer in the same slice.
5. Add account/navigation, LXP, and teacher tooling parity.
6. Replace admin placeholders module-by-module; hide no incomplete module behind a functioning label.
7. Add generated/mechanical contract checks after consumers are reconciled.
8. Run focused tests after each slice, then full backend/web/mobile verification and available authenticated/device flows.

Rollback is slice-based: each independently reviewed contract slice can be reverted without reverting unrelated completed slices. No database migration is planned unless implementation proves a backend aggregation requires persistent state, in which case a separate reviewed migration/design update is required.

## Open Questions

No blocking product decision remains for the audited basic parity scope. Platform-specific visual layouts may follow existing mobile primitives as long as all normative contract, error, paging, audit, navigation, and role requirements are met.
