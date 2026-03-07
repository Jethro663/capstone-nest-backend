# Performance Module Event Map

Module 8 is projection-based and event-driven. It continuously materializes
student risk status into `performance_snapshots` and appends state transitions
to `performance_logs`.

## Trigger -> Consumer

- `assessment.submitted` -> `PerformanceEventsListener.handleAssessmentSubmitted()` -> `PerformanceService.recomputeFromAssessmentSubmission()`
- `class-record.scores.updated` -> `PerformanceEventsListener.handleClassRecordScoresUpdated()` -> `PerformanceService.recomputeStudentsForClass()`
- `performance.status.changed` -> `LxpPerformanceListener.handlePerformanceStatusChanged()` -> creates/resolves intervention cases and notifies student/teacher

## Source Emitters

- `assessment.submitted`: emitted by `AssessmentsService` after scoring an attempt
- `class-record.scores.updated`: emitted by class-record score write paths
  - manual single score write
  - manual bulk score write
  - manual sync from linked assessment
  - assessment-driven class-record sync

## Core Rule

- `is_at_risk = has_data && blended_score < 74`
