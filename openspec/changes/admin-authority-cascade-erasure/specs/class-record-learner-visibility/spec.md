## ADDED Requirements

### Requirement: Class records expose learner-state filters
Web and mobile class-record workspaces SHALL provide `current`, `historical`, and `all` learner filters using the backend's current-enrollment and removed-participant state.

#### Scenario: Active draft workspace opens
- **WHEN** a teacher or administrator opens an active draft class record
- **THEN** the learner list defaults to `current` and shows only currently enrolled eligible learners

#### Scenario: Historical filter selected
- **WHEN** the user selects `historical`
- **THEN** dropped, completed, transferred, withdrawn, or otherwise removed evidence-bearing learners are shown with a clear historical label

#### Scenario: All filter selected
- **WHEN** the user selects `all`
- **THEN** current and historical learners are shown without duplicating a learner

### Requirement: Finalized evidence remains visible
Finalized or historical class-record evidence views SHALL default to the complete learner set and SHALL not discard participant or score history.

#### Scenario: Finalized class record opens
- **WHEN** a finalized record or historical evidence workspace opens
- **THEN** it shows all evidence-bearing learners by default while still allowing state filters

### Requirement: Exports remain complete
Class-record exports and roster evidence SHALL include every evidence-bearing learner independent of the interactive presentation filter unless the export action explicitly offers and labels a filtered export.

#### Scenario: Current filter is active during export
- **WHEN** the interactive grid is filtered to current learners and the standard class-record export runs
- **THEN** the exported evidence still includes historical participants and identifies their enrollment state

### Requirement: Cross-client semantics stay aligned
Web and mobile SHALL use the same learner-state vocabulary and defaulting rules while the backend continues returning the full evidence set.

#### Scenario: Same active record on web and mobile
- **WHEN** the same active draft record is opened on both clients
- **THEN** both default to current learners and can reveal the same historical/all population
