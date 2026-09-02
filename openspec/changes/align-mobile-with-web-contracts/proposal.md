## Why

The Expo mobile client currently diverges from backend-owned contracts and from working web behavior in evaluation persistence, assessment timing and grading, AI draft settings, pagination, account gating, exports, navigation, LXP content, teacher tooling, and administrator workflows. These gaps include false-success writes and violations of server-authoritative assessment behavior, so they must be corrected before mobile can claim functional parity with web.

## What Changes

- Replace fabricated evaluation data and success responses with the real backend teacher-evaluation and assigned-system-evaluation contracts.
- Align teacher evaluation analytics with the current backend response shape.
- Make mobile assessment taking honor server-owned question order, per-question deadlines, resume state, and auto-submit behavior.
- Add rubric/manual-response grade return and complete feedback/result rendering.
- Preserve the full nested assessment settings object across AI draft creation, retry, review, preview, and apply.
- Preserve pagination metadata and provide complete/paged assessment, announcement, file, archive, and JA history behavior.
- Use the backend's audited CSV export contract for official mobile reports.
- Align profile-completion gating, password changes, notification read-all, and role navigation labels with web.
- Add generated remedial lesson and assigned system-evaluation mobile flows.
- Complete the basic teacher content/library lifecycle and replace misleading admin placeholders with real workflows or explicitly unavailable navigation.
- Introduce contract-manifest and adapter-boundary tests that prevent nonexistent routes, dropped fields, fake success, and silent envelope drift.

## Capabilities

### New Capabilities

- `mobile-evaluation-parity`: Durable teacher and system evaluation inbox, submission, analytics, campaign, and error behavior across supported roles.
- `mobile-assessment-runtime-parity`: Server-authoritative assessment ordering, timing, resume, submission, grading, and feedback behavior.
- `mobile-ai-draft-contract-parity`: Lossless mobile AI assessment settings and job lifecycle behavior.
- `mobile-paginated-data-parity`: Complete pagination and authoritative totals for assessments, announcements, files, archives, and JA history.
- `mobile-account-navigation-parity`: Web-equivalent profile completion, password, notifications, and correctly labelled role navigation.
- `mobile-lxp-content-parity`: Generated remedial lesson retrieval and completion-capable mobile navigation.
- `mobile-teacher-tooling-parity`: Basic web-equivalent teacher content lifecycle, grading analytics, library, and official report export behavior.
- `mobile-admin-workspace-parity`: Real mobile administrator workflows for the basic modules currently represented by placeholders.
- `client-contract-governance`: CI-verifiable backend route/schema ownership and thin, failure-transparent client adapters.

### Modified Capabilities

None. No main OpenSpec capability specs exist yet; this change introduces explicit requirements for the currently implicit mobile contracts.

## Impact

- Primary implementation: `mobile/src/api`, `mobile/src/types`, `mobile/src/navigation`, `mobile/src/screens`, and their tests.
- Backend remains the public contract authority; backend changes are limited to contract export/manifest support or missing aggregation endpoints proven necessary by mobile parity.
- Web types, services, and tested behavior serve as a consumer reference but are changed only when current backend evidence exposes shared drift.
- Assessment, evaluation, reports, auth/profile, notification, LXP, JA, file-library, content-authoring, and admin role surfaces are affected.
- Sensitive writes retain backend RBAC, validation, audit logging, revision/idempotency, and academic-policy enforcement.
