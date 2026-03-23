# test-mobile Placeholder and Mapping Notes

## Backend-backed derivations
- Subject emoji, card color, and gradient are local visual metadata derived from `classes.subjectName`.
- Lesson duration and XP are visual estimates derived from lesson block counts when the backend does not provide those fields directly.
- Assessment status is derived from submitted student attempts plus due dates:
  - `completed`: latest attempt is submitted
  - `late`: attempt exists but due date has already passed
  - `missing`: no attempt exists and due date has already passed
  - `pending`: no submitted attempt and due date has not passed
- Profile readiness percentage is a visual score derived from which profile fields exist in `/profiles/me`.
- Achievements are derived from real backend counts across lessons, assessments, LXP checkpoints, and performance summaries. They are not separate database entities.
- XP, level, streak, and study hours are derived from lesson completions, submitted assessments, and LXP progress because the backend does not expose native gamification totals for the mobile app.

## API compatibility notes
- Mobile auth uses the new JSON token endpoints under `/auth/mobile/*` and stores both access and refresh tokens in secure storage.
- Existing web auth cookie endpoints remain unchanged.
- `Lessons` tab is now the student home/dashboard and includes class announcements to keep the tab layout compact.
- AI tutor recommendations come from `/ai/student/tutor/bootstrap` and session flows from `/ai/student/tutor/session*`.

## Known visual-only placeholders
- If a backend record has no profile image, the app falls back to the `🎓` avatar.
- If a class has no teacher metadata, the app displays `Assigned teacher`.
- If no due date is present, assessments show `TBA`.
