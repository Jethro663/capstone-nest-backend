## ADDED Requirements

### Requirement: Web and mobile assessment lists share period filtering
The aggregate teacher assessment lists SHALL offer All Quarters followed by the backend policy periods, default to All Quarters, combine period with existing filters, include unassigned assessments only under All Quarters, and clear bulk selection when period changes.

#### Scenario: Teacher selects Quarter 2
- **WHEN** a teacher selects Quarter 2 while search or status filtering is active
- **THEN** both clients show only records satisfying Quarter 2 and every active filter.

### Requirement: AI Draft explains generation readiness
Web and mobile SHALL preserve server-side historical-class restrictions and show the first actionable blocker plus remaining blockers in this order: policy, class activity, historical year, period, running job, question count, indexing, ready source, source selection, and submission state.

#### Scenario: Historical class has indexed content
- **WHEN** an indexed class belongs to an older school year
- **THEN** Generate remains disabled, the historical-year reason is shown before indexing guidance, and Reindex is not presented as the remedy.

#### Scenario: Current class needs indexing
- **WHEN** academic settings are valid but the index is stale or empty
- **THEN** Generate remains disabled and the client presents Reindex as the relevant recovery action.
