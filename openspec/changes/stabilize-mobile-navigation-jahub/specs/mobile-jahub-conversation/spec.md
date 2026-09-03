## ADDED Requirements

### Requirement: Screen-owned preset-only conversation
JAHUB Ask SHALL occupy the available screen as a single message conversation while the global student bottom bar remains visible, and it SHALL accept only the existing approved preset prompts without rendering a text input.

#### Scenario: Student opens Ask
- **WHEN** the selected JAHUB panel is Ask
- **THEN** mobile SHALL render one message scroller, an anchored approved-prompt launcher, and zero free-text inputs

#### Scenario: Student selects an approved prompt
- **WHEN** the student selects an approved prompt for a visible lesson
- **THEN** mobile SHALL send the existing request with `message` and `quickAction` equal to the approved label and the selected `lessonId`

### Requirement: Deterministic entry and thread resume
JAHUB Ask SHALL represent entry as `resume-pending`, `resume-loading`, `new`, or `active` and SHALL resume only the most recently updated active thread for the resolved class.

#### Scenario: Latest active thread exists
- **WHEN** Ask resolves a class with multiple prior active threads
- **THEN** mobile SHALL open the thread with the newest update timestamp

#### Scenario: Student chooses New Chat
- **WHEN** the student chooses New Chat while a prior thread exists
- **THEN** mobile SHALL enter the new state and SHALL NOT automatically reopen the prior thread

### Requirement: Grounded lesson selection
New JAHUB conversations SHALL use only lessons visible to the student and SHALL choose context according to the number of eligible lessons.

#### Scenario: Exactly one lesson is visible
- **WHEN** a new conversation has exactly one eligible lesson
- **THEN** mobile SHALL select that lesson automatically

#### Scenario: Multiple lessons are visible
- **WHEN** a new conversation has multiple eligible lessons
- **THEN** mobile SHALL require the student to select one in the lesson context sheet before enabling prompts

#### Scenario: No lesson is visible
- **WHEN** a new conversation has no eligible lesson
- **THEN** mobile SHALL disable prompt submission and explain that eligible lesson content is required

#### Scenario: Resumed lesson is stale
- **WHEN** a resumed thread references a lesson no longer visible to the student
- **THEN** mobile SHALL keep history readable, disable new prompts, and offer a path to a new grounded conversation

### Requirement: Intentional context changes
Changing lesson while viewing an active thread SHALL require confirmation and SHALL start a new conversation rather than mixing lesson contexts.

#### Scenario: Student confirms a different lesson
- **WHEN** a student selects a different visible lesson for an active thread and confirms the change
- **THEN** mobile SHALL preserve the prior thread, enter the new state, and use the selected lesson only for the next conversation

### Requirement: Preserved learning tools and response fidelity
The JAHUB header tools SHALL expose New Chat, recent conversations, Activity History, Replay, and Learner's Path while preserving blocked responses, citations, rich text, busy locking, refresh, and honest errors.

#### Scenario: Student opens a secondary learning tool
- **WHEN** the student selects Replay or Learner's Path from the header tools
- **THEN** mobile SHALL render the existing panel and retain its existing backend calls and route parameters

#### Scenario: Student opens Activity History
- **WHEN** the student opens the Activity History sheet
- **THEN** mobile SHALL begin loading the existing completely paginated history and retain its filters

#### Scenario: Prompt submission fails
- **WHEN** an approved prompt request fails
- **THEN** mobile SHALL show the failure without automatically resubmitting the message and SHALL offer refresh or dismissal
