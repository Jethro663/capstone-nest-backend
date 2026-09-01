## Why

Production is one school year ahead of the school-authoritative calendar, while the released policy exposes three terms for modern school years. That combination blocks current teacher assessment and AI-draft work and conflicts with the school-confirmed Quarter 1–4 model.

## What Changes

- **BREAKING** Replace the 2026-and-later three-term period policy with Quarter 1–4 while retaining the existing grading methods, weights, promotion rules, examination components, and rounding.
- Add a read-only, deterministic alignment preview and a step-up-authenticated atomic repair that can move reviewed state, policy snapshots, classes, sections, and explicitly confirmed legacy evidence without changing record identities.
- Add policy-driven Quarter filters to the aggregate web and mobile teacher assessment lists.
- Replace silent AI Draft button disabling with ordered academic, job, question, indexing, and source readiness explanations while retaining server-side historical-class restrictions.

## Capabilities

### New Capabilities
- `four-quarter-academic-policy`: Defines the school-authoritative Quarter 1–4 contract for every supported school year and its annual-completion behavior.
- `academic-state-alignment-repair`: Defines deterministic preview, stale-data protection, step-up confirmation, atomic state/class/section/evidence correction, and audit requirements.
- `teacher-assessment-period-experience`: Defines matching web/mobile assessment filters and explicit AI Draft readiness feedback.

### Modified Capabilities

None. The earlier academic-period lifecycle change has not been archived into the main spec store; this change explicitly supersedes its three-term requirement.

## Impact

- Backend academic policy, audit/recovery DTOs, controller, service, tests, and production academic records.
- Admin System Settings and Academic Audit and Recovery UI plus its typed service contract.
- Web and mobile teacher assessment lists and AI Draft readiness presentation.
- No database schema, AI-service route, or BullMQ payload change.
