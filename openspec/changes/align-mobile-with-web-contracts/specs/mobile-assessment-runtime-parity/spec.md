## ADDED Requirements

### Requirement: Server-authoritative assessment order and timing
Mobile SHALL render and resume an assessment using the attempt's server-owned question order, current question index, current question timestamps, and per-question deadline.

#### Scenario: Randomized assessment starts
- **WHEN** the backend returns a non-empty `questionOrder`
- **THEN** mobile SHALL project questions in that exact order for the lifetime of the attempt, including after restart

#### Scenario: Per-question deadline expires
- **WHEN** `currentQuestionDeadlineAt` passes during a timed-question attempt
- **THEN** mobile SHALL synchronize with the backend and render the server-returned next-question or submitted state without permitting stale navigation

#### Scenario: App resumes from background
- **WHEN** a timed assessment returns to the foreground
- **THEN** mobile SHALL derive remaining time from server timestamps rather than a paused local countdown

### Requirement: Complete grade return contract
Mobile SHALL support teacher feedback, direct-score override, rubric scores, and manual response scores with the same validation and ownership rules as the backend.

#### Scenario: Teacher grades a rubric submission
- **WHEN** a teacher returns criterion scores for a rubric-based file submission
- **THEN** mobile SHALL persist each criterion score and display the resulting rubric breakdown

#### Scenario: Teacher grades manually scored questions
- **WHEN** an attempt contains responses that require manual scoring
- **THEN** mobile SHALL submit points per question and SHALL NOT substitute an unexplained aggregate score

### Requirement: Accurate assessment feedback state
Mobile SHALL model nullable result values, feedback release state, rubric results, and indeterminate correctness without presenting ungraded work as incorrect.

#### Scenario: Grade awaits teacher return
- **WHEN** the backend returns an awaiting-return result with null score and passed values
- **THEN** mobile SHALL show the authoritative waiting message and SHALL NOT render a failure or correction label

#### Scenario: Detailed feedback is delayed
- **WHEN** `feedbackStatus.unlocked` is false
- **THEN** mobile SHALL show the backend feedback status and SHALL hide locked answer details
