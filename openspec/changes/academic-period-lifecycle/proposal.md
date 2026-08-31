## Why

Academic state cannot advance grading periods, existing readiness can mistake partial grades for a completed year, and transition can finalize drafts without calculating grades. The proposed four-quarter-only implementation also conflicts with DepEd's three-term calendar for SY 2026–2027 onward.

## What Changes

- Persist school-year policy and period metadata while preserving legacy Q1–Q4 identifiers and historical grades.
- Add audited admin period activation with stale-state protection and separate student-release and grading permissions.
- Add complete period rosters, explicit score/exemption handling, immutable grade revisions, annual subject snapshots, and recorded remediation outcomes.
- Replace transition readiness with an expected subject/student/period matrix; serialize academic writes, prohibit automatic finalization, and reset the next year to its first period.
- Update web and mobile creation, workbook, annual summary, readiness, and admin controls together.
- Add an audit/repair workflow, compatible migration, and regression tests including concurrency and historical data.
- **BREAKING**: unsafe publication, grade finalization, and school-year transition requests will now return actionable readiness errors.

## Capabilities

### New Capabilities

- `academic-period-lifecycle`: school-year policies, active-period management, and assessment lifecycle enforcement.
- `complete-academic-grades`: eligibility, complete period grades, annual revisions, transfer evidence, and remediation.
- `safe-academic-transition`: readiness, notifications, atomic year transition, migration auditing, and client parity.

### Modified Capabilities

None; this repository has no existing published OpenSpec capability for these workflows.

## Impact

Backend academic-state, assessments, class-record, enrollment hooks, schema and migrations; web academic-state, teacher assessment editor and workbook; mobile academic-state and teacher assessment/class-record screens. No AI authority changes and no new runtime dependency. Work stays in the existing checkout. Implementation and local verification are authorized; no production migration or deployment is included.
