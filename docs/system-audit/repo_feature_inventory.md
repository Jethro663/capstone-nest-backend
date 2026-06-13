# Repository Feature Inventory

## Actual System Identity
- Repository: `capstone-nest-react-lms`
- Product name in code and routes: Nexora
- Primary apps: `backend/`, `next-frontend/`, `ai-service/`, `test-mobile/`

## Actual Stack Versions
- Web frontend: Next 16.2.4, React 19.2.3, React DOM 19.2.3
- Backend: NestJS core ^11.0.1, Swagger ^11.2.6, BullMQ ^5.70.1, Socket.IO ^4.8.3
- Mobile: Expo ~54.0.0, React Native 0.81.5, React 19.1.0
- AI service: FastAPI app with Ollama integration and optional cloud fallback

## Actual User Roles
- `admin`
- `teacher`
- `student`

## Actual Backend Surfaces
- Modules discovered: 32
- Key modules: academic-state, admin, ai-mentor, analytics, announcements, assessments, audit, auth, class-record, class-templates, classes, content-modules, discussion-board, health, JA, lessons, LXP, notifications, OTP, performance, profiles, reports, roster-import, school-events, sections, teacher, users
- Controllers discovered: 33

## Actual Web Surface
- App routes discovered: 96
- Live-verified web routes during this audit: `/login`, `/forgot-password`, `/dashboard/admin`, `/dashboard/admin/diagnostics`, `/dashboard/admin/audit`, `/dashboard/teacher/classes`, `/dashboard/teacher/interventions`, `/dashboard/student`, `/dashboard/student/courses`, `/dashboard/student/ja`, `/dashboard/student/announcements`

## Actual Mobile Surface
- Mobile screens discovered: 23
- Current `test-mobile` build is student-focused.
- Teacher mobile is explicitly marked unsupported in the app shell.

## Actual Database Reality
- Schema tables discovered: 81
- Key table families:
- auth/users/roles/sections/classes/enrollments
- lessons/modules/assessments/attempts/responses
- announcements/notifications/discussion threads
- class records and academic state
- performance snapshots/logs/intervention cases/LXP progress
- AI extraction, chunking, embeddings, generation jobs/outputs, interaction logs

## Actual AI Reality
- FastAPI service exists and was live during the audit.
- Ollama models present live: `qwen2.5:3b`, `gemma3:4b`, `nomic-embed-text`.
- Vector retrieval is implemented against `content_chunk_embeddings`.
- Async extraction and quiz-generation endpoints exist.
- Cloud fallback code exists, so the architecture is not purely local-only in design terms.

## Actual Live Status During Audit
- Backend already running on `localhost:3000`
- Frontend already running on `localhost:3001`
- AI service already running on `localhost:8000`
- Postgres running on `5432` and Ollama on `11434`
- Health endpoint returned database/redis/ai-service all OK

## Partial or Missing Areas
- Teacher mobile not implemented in the current `test-mobile` build
- Mobile discussion board not backed by a live data source yet
- No verified mobile push-notification stack found
- No confirmed 30-second lesson-completion rule found
- Some analytics/evaluation datasets were sparse in the live database

## Live Data Counts Observed
- users: 20
- classes: 14
- lessons: 31
- assessments: 39
- content chunks: 391
- content chunk embeddings: 391
- ai_generation_jobs: 44
- ai_generation_outputs: 35
- ai_interaction_logs: 20
- intervention_cases: 7
- audit_logs: 1214
- notifications: 33
- announcements: 2
- school_events: 1
- system_evaluations: 0

## Setup Reality
- The stack was already up outside docker compose; the audit therefore verified the active local runtime rather than a fresh compose bring-up.
