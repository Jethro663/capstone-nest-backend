# Live Stack and API Route Inventory — 2026-07-18

This is a point-in-time, read-only inventory captured from the running local Compose project on July 18, 2026 (Asia/Manila). It supports [CURRENT_REPO_STATE.md](../../CURRENT_REPO_STATE.md); code and executable configuration remain authoritative after this date.

## Runtime facts

| Service | Role | Container port | Published host port | Verification |
| --- | --- | ---: | ---: | --- |
| `backend` | NestJS public API and BullMQ workers | 3000 | 3000 | healthy; `/api/health/live` and `/api/health/ready` returned 200 |
| `frontend` | Next.js production web server | 3001 | 3001 | running; HTTP 200 (no container healthcheck is declared) |
| `ai-service` | Internal FastAPI execution service | 8000 | none | healthy; `/live` and `/ready` returned 200 |
| `postgres` | PostgreSQL 16 with pgvector | 5432 | none | healthy; `pg_isready` accepted connections; pgvector 0.8.4 |
| `redis` | BullMQ transport/state | 6379 | none | healthy; `PING` returned `PONG` |
| `ollama` | Local text, vision, and embedding runtime | 11434 | none | healthy; configured models materialized |
| `prometheus` | Metrics and probes | 9090 | 9090 | healthy; all 10 configured targets up |
| `grafana` | Dashboards | 3000 | 3002 | healthy; database status ok |
| `loki` | Logs | 3100 | 3100 | healthy |
| `tempo` | Traces and OTLP receiver | 3200 / 4318 | 3200 / 4318 | healthy |
| `promtail` | Docker log collection | 9080 | none | healthy |
| `blackbox-exporter` | HTTP/TCP probes | 9115 | none | healthy |
| `node-exporter` | Host metrics | 9100 | none | healthy |
| `cadvisor` | Container metrics | 8080 | none | healthy |

The first six services are the core stack. The other eight belong to the optional `observability` profile. PostgreSQL, Redis, Ollama, and FastAPI are intentionally internal unless `docker-compose.debug.yml` is added.

## Environment contract

Docker Compose automatically reads root `.env`; `.env.compose.example` is the onboarding template. Required secret-bearing inputs are `POSTGRES_PASSWORD`, `BACKEND_DATABASE_URL`, `AI_DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OTP_PEPPER`, and `AI_SERVICE_SHARED_SECRET`. The backend and AI service must share the same internal secret. Grafana credentials are required only when starting the observability profile.

Verified non-secret runtime anchors:

- backend: `NODE_ENV=production`, `PORT=3000`, `AI_SERVICE_URL=http://ai-service:8000`, `REDIS_URL=redis://redis:6379`
- frontend: production server on `0.0.0.0:3001`, with backend traffic routed through NestJS
- AI service: internal port 8000, `BACKEND_INTERNAL_URL=http://backend:3000`, Ollama at `http://ollama:11434`
- migrations: `RUN_DB_MIGRATIONS=true`, `RUN_DB_SEED=false`
- storage: shared local upload volume; no public direct AI port

Optional unset keys can disable SMTP and direct OTLP/Loki export. Actual secret values are intentionally not recorded.

## Database and queue facts

The live database had 89 public tables and pgvector 0.8.4. The journal and live `_applied_migrations` agree on these four ordered migrations:

1. `0000_baseline_nexora.sql`
2. `0001_mixed_morgan_stark.sql`
3. `0002_small_photon.sql`
4. `0003_enable_pgvector.sql`

Redis contained active BullMQ metadata/stalled-check keys for all seven backend-owned queues:

- `ai-teacher-generation`
- `announcements`
- `discussion-board`
- `library-indexing`
- `notifications`
- `performance-recompute`
- `rag-indexing`

## Log review

No fatal startup error or contract-drift warning was present. Bounded warnings observed:

- backend: optional AWS S3 and OTP email credentials are absent; validation passed and local storage/email-disabled behavior remains available
- Redis: Linux host `vm.overcommit_memory` is disabled and the default Redis config is in use
- Ollama: requested context 8192 exceeds the loaded model's trained 2048 context and is clamped
- cAdvisor: unavailable Podman/CRI-O sockets are informational on this Docker host
- Tempo: local single-binary/exposure warnings
- Promtail/Loki: one replayed July 15 entry was too old for the current ingestion window

Because `--tail=100` is per container, low-volume services also returned retained July 14–15 shutdown and discovery history: PostgreSQL “terminating connection due to administrator command,” Promtail references to containers that had already been replaced, cAdvisor filesystem paths for removed container layers, and Tempo/Promtail cancellation messages during prior stops. PostgreSQL syntax, missing-relation, and `role "root" does not exist` lines at 10:37–10:46 on July 18 were produced by this audit's malformed or incorrectly authenticated diagnostic probes; subsequent correctly authenticated checks passed. These retained/audit-induced lines are not current startup failures, but remain visible in container history and should not be silently omitted.

## NestJS public API

The production startup log mapped exactly 385 routes. Swagger is intentionally disabled under `NODE_ENV=production`; run the backend in development to use `/api/docs`.

- `GET /api/academic-state/current`
- `GET /api/academic-state/impact-preview`
- `POST /api/academic-state/transition`
- `GET /api/admin/activity-export`
- `GET /api/admin/audit-logs`
- `GET /api/admin/dashboard/stats`
- `GET /api/admin/overview`
- `GET /api/admin/usage-summary`
- `POST /api/ai/admin/chat`
- `GET /api/ai/admin/history`
- `GET /api/ai/admin/sessions/:sessionId`
- `POST /api/ai/chat`
- `POST /api/ai/demo/intervention-plan`
- `POST /api/ai/extract-module`
- `GET /api/ai/extractions`
- `DELETE /api/ai/extractions/:id`
- `GET /api/ai/extractions/:id`
- `PATCH /api/ai/extractions/:id`
- `POST /api/ai/extractions/:id/apply`
- `POST /api/ai/extractions/:id/apply/preview`
- `POST /api/ai/extractions/:id/cancel`
- `POST /api/ai/extractions/:id/retry`
- `GET /api/ai/extractions/:id/status`
- `GET /api/ai/health`
- `GET /api/ai/history`
- `POST /api/ai/index/classes/:classId`
- `GET /api/ai/index/classes/:classId/status`
- `POST /api/ai/mentor/explain`
- `GET /api/ai/student/ja/ask/bootstrap`
- `POST /api/ai/student/ja/ask/threads`
- `GET /api/ai/student/ja/ask/threads/:threadId`
- `POST /api/ai/student/ja/ask/threads/:threadId/messages`
- `GET /api/ai/student/ja/hub`
- `GET /api/ai/student/ja/practice/bootstrap`
- `POST /api/ai/student/ja/practice/sessions`
- `DELETE /api/ai/student/ja/practice/sessions/:sessionId`
- `GET /api/ai/student/ja/practice/sessions/:sessionId`
- `POST /api/ai/student/ja/practice/sessions/:sessionId/complete`
- `POST /api/ai/student/ja/practice/sessions/:sessionId/events`
- `POST /api/ai/student/ja/practice/sessions/:sessionId/responses`
- `GET /api/ai/student/ja/review/bootstrap`
- `POST /api/ai/student/ja/review/sessions`
- `GET /api/ai/student/ja/review/sessions/:sessionId`
- `POST /api/ai/student/ja/review/sessions/:sessionId/complete`
- `POST /api/ai/student/ja/review/sessions/:sessionId/events`
- `POST /api/ai/student/ja/review/sessions/:sessionId/responses`
- `GET /api/ai/student/tutor/bootstrap`
- `POST /api/ai/student/tutor/session`
- `GET /api/ai/student/tutor/session/:sessionId`
- `POST /api/ai/student/tutor/session/:sessionId/answers`
- `POST /api/ai/student/tutor/session/:sessionId/message`
- `GET /api/ai/teacher/classes/:classId/policy`
- `PATCH /api/ai/teacher/classes/:classId/policy`
- `POST /api/ai/teacher/interventions/:caseId/jobs`
- `POST /api/ai/teacher/interventions/:caseId/recommend`
- `DELETE /api/ai/teacher/jobs/:jobId`
- `GET /api/ai/teacher/jobs/:jobId`
- `GET /api/ai/teacher/jobs/:jobId/result`
- `POST /api/ai/teacher/lesson-plans/jobs`
- `PATCH /api/ai/teacher/lesson-plans/jobs/:jobId/draft`
- `POST /api/ai/teacher/quizzes/generate-draft`
- `POST /api/ai/teacher/quizzes/jobs`
- `POST /api/ai/teacher/quizzes/jobs/:jobId/apply`
- `POST /api/ai/teacher/quizzes/jobs/:jobId/apply/preview`
- `POST /api/ai/teacher/quizzes/jobs/:jobId/cancel`
- `PATCH /api/ai/teacher/quizzes/jobs/:jobId/draft`
- `POST /api/ai/teacher/quizzes/jobs/:jobId/retry`
- `GET /api/analytics/admin/overview`
- `GET /api/analytics/classes/:classId/intervention-outcomes`
- `GET /api/analytics/classes/:classId/trends`
- `GET /api/analytics/teachers/:teacherId/workload`
- `GET /api/app-version/check`
- `POST /api/assessments`
- `GET /api/assessments/:assessmentId/all-attempts`
- `GET /api/assessments/:assessmentId/ongoing-attempt`
- `GET /api/assessments/:assessmentId/question-analytics`
- `POST /api/assessments/:assessmentId/return-all`
- `PUT /api/assessments/:assessmentId/rubric-review`
- `POST /api/assessments/:assessmentId/rubric-source`
- `POST /api/assessments/:assessmentId/start`
- `GET /api/assessments/:assessmentId/stats`
- `GET /api/assessments/:assessmentId/student-attempts`
- `POST /api/assessments/:assessmentId/submission-file`
- `DELETE /api/assessments/:assessmentId/submission-files/:fileId`
- `GET /api/assessments/:assessmentId/submissions`
- `POST /api/assessments/:assessmentId/teacher-attachment`
- `GET /api/assessments/:assessmentId/teacher-attachment/download`
- `POST /api/assessments/:assessmentId/unsubmit-file-upload`
- `DELETE /api/assessments/:id`
- `GET /api/assessments/:id`
- `PUT /api/assessments/:id`
- `PATCH /api/assessments/:id/core-release`
- `PATCH /api/assessments/attempts/:attemptId/progress`
- `GET /api/assessments/attempts/:attemptId/results`
- `POST /api/assessments/attempts/:attemptId/return`
- `GET /api/assessments/attempts/:attemptId/submission-file/download`
- `GET /api/assessments/attempts/:attemptId/submission-files/:fileId/download`
- `POST /api/assessments/attempts/:attemptId/unreturn`
- `POST /api/assessments/attempts/bulk-return`
- `GET /api/assessments/attempts/ongoing`
- `GET /api/assessments/class/:classId`
- `POST /api/assessments/options/:id/image`
- `POST /api/assessments/questions`
- `DELETE /api/assessments/questions/:id`
- `PUT /api/assessments/questions/:id`
- `POST /api/assessments/questions/:id/image`
- `GET /api/assessments/questions/images-private/:filename`
- `GET /api/assessments/questions/images/:filename`
- `POST /api/assessments/submit`
- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/me`
- `POST /api/auth/mobile/login`
- `POST /api/auth/mobile/logout`
- `POST /api/auth/mobile/refresh`
- `PATCH /api/auth/profile`
- `POST /api/auth/refresh`
- `POST /api/auth/reset-password`
- `POST /api/auth/set-activation-password`
- `POST /api/auth/set-initial-password`
- `POST /api/auth/validate-credentials`
- `POST /api/class-record`
- `GET /api/class-record/:classRecordId/final-grades/:studentId`
- `GET /api/class-record/:id`
- `GET /api/class-record/:id/final-grades`
- `POST /api/class-record/:id/finalize`
- `GET /api/class-record/:id/preview-grades`
- `POST /api/class-record/:id/reopen`
- `GET /api/class-record/:id/reports/class-average`
- `GET /api/class-record/:id/reports/distribution`
- `GET /api/class-record/:id/reports/intervention`
- `GET /api/class-record/:id/spreadsheet`
- `GET /api/class-record/adviser/section/:sectionId`
- `GET /api/class-record/by-class/:classId`
- `GET /api/class-record/by-class/:classId/slot-overview`
- `PATCH /api/class-record/items/:itemId`
- `POST /api/class-record/items/:itemId/scores`
- `POST /api/class-record/items/:itemId/scores/bulk`
- `POST /api/class-record/items/:itemId/sync-scores`
- `GET /api/class-templates`
- `POST /api/class-templates`
- `DELETE /api/class-templates/:id`
- `GET /api/class-templates/:id`
- `PATCH /api/class-templates/:id`
- `POST /api/class-templates/:id/assessment-images`
- `GET /api/class-templates/:id/content`
- `PUT /api/class-templates/:id/content`
- `GET /api/class-templates/:id/engine-export`
- `POST /api/class-templates/:id/publish`
- `GET /api/class-templates/compatible`
- `POST /api/class-templates/engine-import`
- `POST /api/class-templates/engine-import/validate`
- `GET /api/class-templates/images/:filename`
- `GET /api/classes`
- `POST /api/classes`
- `GET /api/classes/:classId/announcements`
- `POST /api/classes/:classId/announcements`
- `DELETE /api/classes/:classId/announcements/:id`
- `GET /api/classes/:classId/announcements/:id`
- `PATCH /api/classes/:classId/announcements/:id`
- `PATCH /api/classes/:classId/announcements/:id/core-release`
- `GET /api/classes/:classId/candidates`
- `GET /api/classes/:classId/discussion-threads`
- `POST /api/classes/:classId/discussion-threads`
- `DELETE /api/classes/:classId/discussion-threads/:threadId`
- `GET /api/classes/:classId/discussion-threads/:threadId`
- `PATCH /api/classes/:classId/discussion-threads/:threadId`
- `GET /api/classes/:classId/discussion-threads/:threadId/attachments/:attachmentId/download`
- `GET /api/classes/:classId/discussion-threads/:threadId/attachments/:attachmentId/inline`
- `POST /api/classes/:classId/discussion-threads/:threadId/close`
- `POST /api/classes/:classId/discussion-threads/:threadId/comments`
- `DELETE /api/classes/:classId/discussion-threads/:threadId/comments/:commentId`
- `GET /api/classes/:classId/discussion-threads/:threadId/comments/:commentId/attachments/:attachmentId/download`
- `GET /api/classes/:classId/discussion-threads/:threadId/comments/:commentId/attachments/:attachmentId/inline`
- `DELETE /api/classes/:classId/discussion-threads/:threadId/comments/:commentId/reaction`
- `PUT /api/classes/:classId/discussion-threads/:threadId/comments/:commentId/reaction`
- `POST /api/classes/:classId/discussion-threads/:threadId/comments/:commentId/report`
- `POST /api/classes/:classId/discussion-threads/:threadId/comments/uploads`
- `POST /api/classes/:classId/discussion-threads/:threadId/publish`
- `POST /api/classes/:classId/discussion-threads/:threadId/reopen`
- `POST /api/classes/:classId/discussion-threads/uploads`
- `GET /api/classes/:classId/enrollments`
- `POST /api/classes/:classId/enrollments`
- `DELETE /api/classes/:classId/enrollments/:studentId`
- `GET /api/classes/:classId/students/:studentId/overview`
- `GET /api/classes/:classId/students/:studentId/profile`
- `GET /api/classes/:classId/students/masterlist`
- `DELETE /api/classes/:id`
- `GET /api/classes/:id`
- `PUT /api/classes/:id`
- `POST /api/classes/:id/banner`
- `PATCH /api/classes/:id/hide`
- `PATCH /api/classes/:id/presentation`
- `DELETE /api/classes/:id/purge`
- `PUT /api/classes/:id/student-presentation`
- `PUT /api/classes/:id/toggle-status`
- `PATCH /api/classes/:id/unhide`
- `GET /api/classes/all`
- `GET /api/classes/banners/:filename`
- `POST /api/classes/bulk/lifecycle`
- `GET /api/classes/section/:sectionId`
- `GET /api/classes/student/:studentId`
- `GET /api/classes/student/:studentId/preferences/presentation`
- `GET /api/classes/student/:studentId/preferences/view`
- `PUT /api/classes/student/:studentId/preferences/view`
- `GET /api/classes/subject/:subjectCode`
- `GET /api/classes/teacher/:teacherId`
- `GET /api/files`
- `DELETE /api/files/:id`
- `GET /api/files/:id`
- `PATCH /api/files/:id`
- `GET /api/files/:id/download`
- `POST /api/files/:id/index/retry`
- `POST /api/files/admin/backfill-storage`
- `GET /api/files/folders`
- `POST /api/files/folders`
- `DELETE /api/files/folders/:id`
- `PATCH /api/files/folders/:id`
- `GET /api/files/storage-summary`
- `POST /api/files/upload`
- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/internal/uploads/raw`
- `POST /api/lessons`
- `DELETE /api/lessons/:id`
- `GET /api/lessons/:id`
- `PUT /api/lessons/:id`
- `PUT /api/lessons/:id/publish`
- `GET /api/lessons/:id/versions`
- `POST /api/lessons/:id/versions`
- `POST /api/lessons/:id/versions/:versionId/restore`
- `POST /api/lessons/:lessonId/blocks`
- `POST /api/lessons/:lessonId/complete`
- `GET /api/lessons/:lessonId/completion-status`
- `PUT /api/lessons/:lessonId/reorder-blocks`
- `DELETE /api/lessons/blocks/:blockId`
- `PUT /api/lessons/blocks/:blockId`
- `GET /api/lessons/class/:classId`
- `POST /api/lessons/class/:classId/bulk-delete`
- `PUT /api/lessons/class/:classId/bulk-status`
- `GET /api/lessons/class/:classId/completed`
- `GET /api/lessons/class/:classId/drafts`
- `PUT /api/lessons/class/:classId/reorder`
- `GET /api/lxp/evaluations`
- `POST /api/lxp/evaluations`
- `GET /api/lxp/me/eligibility`
- `GET /api/lxp/me/intervention-alerts`
- `GET /api/lxp/me/overview/:classId`
- `GET /api/lxp/me/playlist/:classId`
- `POST /api/lxp/me/playlist/:classId/checkpoints/:assignmentId/complete`
- `GET /api/lxp/me/playlist/:classId/generated-lessons/:assignmentId`
- `PATCH /api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/progress`
- `GET /api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/result`
- `POST /api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/start`
- `POST /api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/submit`
- `GET /api/lxp/me/system-evaluations`
- `POST /api/lxp/me/system-evaluations/:assignmentId/submit`
- `GET /api/lxp/me/teacher-evaluations`
- `POST /api/lxp/me/teacher-evaluations`
- `GET /api/lxp/system-evaluation-campaigns`
- `POST /api/lxp/system-evaluation-campaigns`
- `PATCH /api/lxp/system-evaluation-campaigns/:campaignId/status`
- `GET /api/lxp/teacher/classes/:classId/interventions`
- `GET /api/lxp/teacher/classes/:classId/interventions/history`
- `GET /api/lxp/teacher/classes/:classId/reports/summary`
- `GET /api/lxp/teacher/evaluations/summary`
- `GET /api/lxp/teacher/interventions/:caseId`
- `POST /api/lxp/teacher/interventions/:caseId/activate`
- `POST /api/lxp/teacher/interventions/:caseId/assign`
- `GET /api/lxp/teacher/interventions/:caseId/detail`
- `POST /api/lxp/teacher/interventions/:caseId/generated-content/approve`
- `POST /api/lxp/teacher/interventions/:caseId/generated-content/reject`
- `POST /api/lxp/teacher/interventions/:caseId/regenerate`
- `POST /api/lxp/teacher/interventions/:caseId/resolve`
- `GET /api/lxp/teacher/interventions/pending-count`
- `GET /api/metrics`
- `POST /api/modules`
- `DELETE /api/modules/:moduleId`
- `PATCH /api/modules/:moduleId`
- `PATCH /api/modules/:moduleId/core-release`
- `POST /api/modules/:moduleId/cover`
- `PUT /api/modules/:moduleId/grading-scale`
- `POST /api/modules/:moduleId/sections`
- `PUT /api/modules/:moduleId/sections/reorder`
- `GET /api/modules/class/:classId`
- `GET /api/modules/class/:classId/:moduleId`
- `PUT /api/modules/class/:classId/reorder`
- `GET /api/modules/covers/:filename`
- `DELETE /api/modules/items/:itemId`
- `PATCH /api/modules/items/:itemId`
- `PATCH /api/modules/items/:itemId/core-release`
- `GET /api/modules/items/:itemId/file/download`
- `DELETE /api/modules/sections/:sectionId`
- `PATCH /api/modules/sections/:sectionId`
- `POST /api/modules/sections/:sectionId/items`
- `PUT /api/modules/sections/:sectionId/items/reorder`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/notifications/unread-count`
- `POST /api/otp/resend`
- `POST /api/otp/verify`
- `GET /api/performance/admin/analytics`
- `GET /api/performance/analysis/jobs/:jobId`
- `GET /api/performance/analysis/jobs/:jobId/result`
- `POST /api/performance/classes/:classId/analysis/jobs`
- `GET /api/performance/classes/:classId/at-risk`
- `GET /api/performance/classes/:classId/diagnostics`
- `GET /api/performance/classes/:classId/intervention-quiz-comparison`
- `GET /api/performance/classes/:classId/logs`
- `POST /api/performance/classes/:classId/recompute`
- `GET /api/performance/classes/:classId/summary`
- `GET /api/performance/students/me/summary`
- `GET /api/profiles/:userId`
- `POST /api/profiles/create`
- `GET /api/profiles/images/:filename`
- `GET /api/profiles/me`
- `GET /api/profiles/me/academic-summary`
- `GET /api/profiles/me/assessment-history`
- `POST /api/profiles/me/avatar`
- `GET /api/profiles/me/transcript`
- `PUT /api/profiles/update/:userId`
- `GET /api/reports/assessment-summary`
- `GET /api/reports/class-enrollment`
- `GET /api/reports/intervention-participation`
- `GET /api/reports/student-master-list`
- `GET /api/reports/student-performance`
- `GET /api/reports/system-usage`
- `POST /api/roster-import/:sectionId/commit`
- `GET /api/roster-import/:sectionId/pending`
- `POST /api/roster-import/:sectionId/preview`
- `PATCH /api/roster-import/pending/:id/resolve`
- `GET /api/school-events`
- `POST /api/school-events`
- `DELETE /api/school-events/:id`
- `PATCH /api/school-events/:id`
- `GET /api/sections/:id`
- `POST /api/sections/:id/banner`
- `GET /api/sections/:id/candidates`
- `PATCH /api/sections/:id/hide`
- `PATCH /api/sections/:id/presentation`
- `PUT /api/sections/:id/restore`
- `GET /api/sections/:id/roster`
- `POST /api/sections/:id/roster`
- `DELETE /api/sections/:id/roster/:studentId`
- `GET /api/sections/:id/schedule`
- `GET /api/sections/:id/students/:studentId/profile`
- `PATCH /api/sections/:id/unhide`
- `POST /api/sections/access-students/fail`
- `POST /api/sections/access-students/finalize-grades`
- `POST /api/sections/access-students/move-up`
- `GET /api/sections/access-students/overview`
- `GET /api/sections/access-students/target-sections`
- `GET /api/sections/all`
- `GET /api/sections/banners/:filename`
- `POST /api/sections/bulk/lifecycle`
- `POST /api/sections/create`
- `DELETE /api/sections/delete/:id`
- `GET /api/sections/my`
- `DELETE /api/sections/permanent/:id`
- `PUT /api/sections/update/:id`
- `GET /api/teacher-profiles/:userId`
- `PUT /api/teacher-profiles/:userId`
- `GET /api/teacher-profiles/me`
- `POST /api/teacher-profiles/me/avatar`
- `GET /api/teacher/assessments`
- `GET /api/teacher/classes`
- `GET /api/teacher/lessons`
- `GET /api/users/:id`
- `GET /api/users/:id/export`
- `DELETE /api/users/:id/purge`
- `PATCH /api/users/:id/reactivate`
- `POST /api/users/:id/reset-password`
- `DELETE /api/users/:id/soft-delete`
- `PATCH /api/users/:id/suspend`
- `GET /api/users/all`
- `POST /api/users/bulk/lifecycle`
- `POST /api/users/create`
- `DELETE /api/users/delete/:id`
- `GET /api/users/reports/monitoring`
- `PUT /api/users/update/:id`

## FastAPI internal API

The live FastAPI OpenAPI document exposed exactly 57 paths. These are internal contracts; web and mobile must reach them through NestJS.

- `POST /admin/chat`
- `GET /admin/history`
- `GET /admin/sessions/{session_id}`
- `POST /chat`
- `POST /demo/intervention-plan`
- `POST /extract`
- `GET /extractions`
- `GET, PATCH, DELETE /extractions/{extraction_id}`
- `POST /extractions/{extraction_id}/apply`
- `POST /extractions/{extraction_id}/apply/preview`
- `POST /extractions/{extraction_id}/cancel`
- `POST /extractions/{extraction_id}/retry`
- `GET /extractions/{extraction_id}/status`
- `GET /health`
- `GET /history`
- `POST /index/classes/{class_id}`
- `GET /index/classes/{class_id}/status`
- `GET /internal/extractions/{extraction_id}/audit`
- `POST /internal/extractions/{extraction_id}/fail`
- `POST /internal/extractions/{extraction_id}/run`
- `POST /internal/index/backfill`
- `POST /internal/index/classes/{class_id}`
- `POST /internal/index/library-files/{file_id}`
- `DELETE /internal/index/library-files/{file_id}/chunks`
- `POST /internal/index/library/backfill`
- `GET /internal/retrieval/preview`
- `POST /internal/teacher/interventions/jobs/{job_id}/run`
- `POST /internal/teacher/lesson-plans/jobs/{job_id}/run`
- `POST /internal/teacher/quizzes/jobs/{job_id}/run`
- `GET /live`
- `POST /mentor/explain`
- `GET /metrics`
- `GET /ready`
- `GET /student/ja/ask/bootstrap`
- `POST /student/ja/ask/respond`
- `GET /student/ja/practice/bootstrap`
- `POST /student/ja/practice/sessions/generate`
- `GET /student/ja/review/bootstrap`
- `POST /student/ja/review/sessions/generate`
- `GET /student/tutor/bootstrap`
- `POST /student/tutor/session`
- `GET /student/tutor/session/{session_id}`
- `POST /student/tutor/session/{session_id}/answers`
- `POST /student/tutor/session/{session_id}/message`
- `POST /teacher/interventions/{case_id}/jobs`
- `POST /teacher/interventions/{case_id}/recommend`
- `GET, DELETE /teacher/jobs/{job_id}`
- `GET /teacher/jobs/{job_id}/result`
- `POST /teacher/lesson-plans/jobs`
- `PATCH /teacher/lesson-plans/jobs/{job_id}/draft`
- `POST /teacher/quizzes/generate-draft`
- `POST /teacher/quizzes/jobs`
- `POST /teacher/quizzes/jobs/{job_id}/apply`
- `POST /teacher/quizzes/jobs/{job_id}/apply/preview`
- `POST /teacher/quizzes/jobs/{job_id}/cancel`
- `PATCH /teacher/quizzes/jobs/{job_id}/draft`
- `POST /teacher/quizzes/jobs/{job_id}/retry`
