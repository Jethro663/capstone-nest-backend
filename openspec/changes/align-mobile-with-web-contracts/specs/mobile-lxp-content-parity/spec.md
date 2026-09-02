## ADDED Requirements

### Requirement: Generated remedial lesson access
Mobile SHALL retrieve and render backend-generated remedial lesson assignments from the learner playlist.

#### Scenario: Student opens a generated lesson assignment
- **WHEN** a playlist checkpoint references a generated lesson assignment
- **THEN** mobile SHALL open a typed generated-lesson route, render the checkpoint label and generated content, and preserve class/assignment identity

#### Scenario: Generated lesson is unavailable
- **WHEN** the backend rejects or cannot find the assignment
- **THEN** mobile SHALL show the backend-derived error and a safe return path without fabricating lesson content
