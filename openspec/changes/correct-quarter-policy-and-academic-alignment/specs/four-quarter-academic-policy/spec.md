## ADDED Requirements

### Requirement: Every supported school year uses four quarters
The backend SHALL expose Q1, Q2, Q3, and Q4 labeled Quarter 1 through Quarter 4 for every valid consecutive school year, including 2026–2027 and later.

#### Scenario: Teacher loads a modern policy
- **WHEN** a client requests policy for 2026–2027 or 2027–2028
- **THEN** the response contains exactly Q1–Q4 with Quarter labels and the versioned four-quarter policy ID.

### Requirement: Annual completion requires all four quarters
Annual grade calculation and transition readiness MUST require one valid contribution for each of Q1, Q2, Q3, and Q4 while retaining the school-year-specific grading method and other policy rules.

#### Scenario: Q4 is missing
- **WHEN** annual calculation receives only Q1–Q3 for a modern school year
- **THEN** calculation is rejected as incomplete without inventing or remapping Q4.

### Requirement: Rollover preserves valid quarter identity
Content copied between four-quarter policies SHALL preserve Q1–Q4 identity unless an administrator explicitly chooses another valid destination.

#### Scenario: Q4 content is copied
- **WHEN** an administrator maps source Q4 to destination Q4
- **THEN** rollover accepts Q4 without coercing it to Q3.
