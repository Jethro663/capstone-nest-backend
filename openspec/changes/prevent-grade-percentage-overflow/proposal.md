## Why

Assessment attempt scores are stored as percentages, but several web and mobile consumers treat them as raw points, while independent backend aggregates bypass the authoritative class-record calculator. This can display values such as `20/10`, double-normalize a valid 50% result to 500%, and allow malformed duplicate responses or legacy rows to contaminate performance and overall-grade calculations above 100%.

## What Changes

- Establish one backend-owned score normalization contract that distinguishes base points, bonus points, awarded points, possible points, effective points, and the bounded percentage.
- Cap each assessment or class-record item at its own highest possible score before category weighting so surplus points cannot offset other missed work.
- Require intentional bonus points to be entered separately with a reason; ordinary base scores remain bounded by HPS.
- Reject duplicate responses for the same attempt/question and add durable database invariants for response uniqueness and bounded stored percentages.
- Remove independent grade arithmetic from student standing and performance snapshots; those readers consume the policy-aware class-record calculation and explicit assessment percentages.
- Keep the legacy `score` percentage field temporarily for compatibility while exposing an unambiguous `scorePercent` and point breakdown to web and mobile.
- Correct every teacher, student, and admin web/mobile display that currently renders a percentage as points or recalculates a percentage.
- Audit existing records, preserve repair evidence, recompute affected projections, and prevent any persisted or returned grade percentage from falling outside 0–100.

## Capabilities

### New Capabilities

- `bounded-academic-scores`: Defines item-level capping, explicit bonus semantics, duplicate-response protection, policy-aware aggregation, legacy repair, and 0–100 invariants.
- `cross-platform-score-contract`: Defines the score-percent and point-breakdown API contract and consistent teacher, student, and admin presentation across web and mobile.

### Modified Capabilities

- None. The existing academic-period lifecycle, missing-versus-zero rules, justified exemptions, transmutation, annual grading, immutable revisions, and policy-period behavior remain unchanged.

## Impact

- Backend: assessment scoring and DTOs, class-record scoring/computation/synchronization, student standing, performance snapshots, reports/profiles/LXP/JA score consumers, Drizzle schemas, migration, repair audit, and regression tests.
- Web: assessment/class/performance/report service contracts and types, teacher grading and learner history, student results/history, shared teacher/admin workbooks, dashboards, and exports.
- Mobile: assessment/class/performance service contracts and types, teacher review, student results/history/dashboard/progress, shared academic workbook, and APK release artifact.
- Data: additive schema changes plus a read-only preflight audit, evidence-preserving repair, and deterministic snapshot recomputation.
- Compatibility: existing clients may continue reading `score` as a percentage during the migration window; new clients use `scorePercent` and explicit point fields.
