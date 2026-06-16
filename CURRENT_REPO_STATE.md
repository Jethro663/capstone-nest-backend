# Current Repo State

## 1. Project Overview

Nexora is a school-focused LMS plus LXP platform for Gat Andres Bonifacio High School. The repository is a multi-app workspace containing a NestJS backend, a Next.js web client, a FastAPI AI service, and an Expo mobile target, with Docker Compose and monitoring assets at the repo root (`README.md`, `backend/src/app.module.ts`, `next-frontend/app/layout.tsx`, `ai-service/app/main.py`, `mobile/src/bootstrap/AppRoot.tsx`).

The current repo is not an early scaffold. Most major LMS and LXP surfaces exist in code:

- user management and role-based access
- classes, sections, lessons, modules, assessments, class records
- announcements, notifications, reports, analytics
- AI-backed extraction, tutoring, quiz drafting, lesson-plan drafting, interventions
- student web and mobile flows
- admin, teacher, and student dashboards

The repo is still in active development. The main remaining gaps are quality, consistency, verification drift, and a few partially finished product surfaces rather than total feature absence (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md`, `docs/system-audit/NEXORA_AUDIT_2026-03-27.md`).

## 2. Tech Stack

- Backend framework: NestJS 11 (`backend/package.json`, `backend/src/main.ts`)
- Frontend framework: Next.js 16 App Router with React 19 (`next-frontend/package.json`, `next-frontend/app/`)
- Mobile framework: Expo / React Native 0.81 (`mobile/package.json`, `mobile/App.tsx`)
- AI service: FastAPI on Python 3.12 (`ai-service/requirements.txt`, `ai-service/Dockerfile`)
- Database: PostgreSQL 16 with `pgvector` in Docker Compose (`docker-compose.yml`)
- ORM / query builder: Drizzle ORM + drizzle-kit (`backend/package.json`, `backend/drizzle.config.ts`)
- Authentication: JWT access tokens plus opaque rotating refresh tokens; web uses httpOnly cookie refresh, mobile uses JSON token refresh endpoints (`backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/token.service.ts`, `next-frontend/src/lib/api-client.ts`, `mobile/src/api/client.ts`)
- Authorization: global JWT guard plus explicit role guards/decorators (`backend/src/app.module.ts`, `backend/src/modules/auth/decorators/roles.decorator.ts`)
- Validation: Nest `ValidationPipe`, `class-validator`, `class-transformer`, frontend `zod`, React Hook Form (`backend/src/main.ts`, `next-frontend/package.json`)
- Styling: Tailwind CSS 4 on web, NativeWind on `mobile` (`next-frontend/package.json`, `mobile/package.json`, `mobile/global.css`)
- State / data fetching: TanStack React Query on web and mobile (`next-frontend/src/providers/QueryProvider.tsx`, `mobile/package.json`)
- Real-time: Socket.IO for live notifications (`backend/src/modules/notifications/notifications.gateway.ts`, `next-frontend/src/providers/NotificationProvider.tsx`)
- Background jobs / queues: BullMQ + Redis (`backend/package.json`, `backend/src/app.module.ts`)
- AI runtime: Ollama primary, cloud fallback config present in AI service (`ai-service/app/config.py`, `docker-compose.yml`)
- File handling: Multer-style backend uploads plus shared upload volume to AI service (`backend/src/modules/file-upload`, `docker-compose.yml`)
- Observability: Prometheus, Loki, Tempo, Grafana, Promtail, OpenTelemetry (`docker-compose.yml`, `backend/src/tracing.ts`, `monitoring/`)
- Testing: Jest for backend, web, and mobile; Playwright for web e2e; Python `unittest` for AI service (`backend/package.json`, `next-frontend/package.json`, `mobile/jest.config.js`, `ai-service/scripts/run_tests.py`)
- Deployment: Dockerfiles per service, Docker Compose for local full stack, Railway deploy workflow, GHCR image publish workflow (`backend/Dockerfile`, `next-frontend/Dockerfile`, `ai-service/Dockerfile`, `.github/workflows/railway-deploy-developement.yml`, `.github/workflows/docker-publish.yml`)
- Package manager: npm for JS/TS apps, pip for AI service (`backend/package-lock.json`, `next-frontend/package-lock.json`, `mobile/package-lock.json`, `ai-service/requirements.txt`)
- Runtime versions visible in repo:
- Node 20 in CI and Docker (`.github/workflows/ci.yml`, `backend/Dockerfile`, `next-frontend/Dockerfile`)
- Python 3.12 in CI and AI Dockerfile (`.github/workflows/ci.yml`, `ai-service/Dockerfile`)

## 3. Repository Structure

```txt
.
├── backend/
├── next-frontend/
├── ai-service/
├── mobile/
├── docs/
├── monitoring/
├── docker-compose.yml
├── .env.compose.example
├── README.md
└── .github/workflows/
```

Important top-level folders:

- `backend/`: main NestJS API, schema, migrations, auth, domain modules, reporting, queues, notifications, monitoring hooks.
- `next-frontend/`: current main web client with admin, teacher, and student dashboards.
- `ai-service/`: internal AI microservice used through backend proxy; owns tutoring, extraction, retrieval, AI job execution, and AI health/metrics.
- `mobile/`: default current Expo mobile target; mostly student-first but includes growing teacher parity surfaces (`mobile/AGENTS.md`, `mobile/src/navigation/AppNavigator.tsx`).
- `docs/`: audits, architecture notes, deployment docs, testing reports, design references.
- `monitoring/`: Prometheus, Loki, Tempo, Promtail, Grafana provisioning configs for the Docker stack.
- `.github/workflows/`: CI, Docker publish, Railway deployment automation.

Important backend structure:

```txt
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   ├── config/
│   ├── database/
│   ├── drizzle/schema/
│   ├── modules/
│   ├── monitoring/
│   └── tracing.ts
├── drizzle/
├── scripts/
├── seed-database.js
├── run-migrations.js
└── Dockerfile
```

- `backend/src/modules/`: feature modules such as `auth`, `users`, `classes`, `sections`, `lessons`, `assessments`, `class-record`, `lxp`, `ai-mentor`, `performance`, `reports`, `notifications`, `discussion-board`.
- `backend/src/drizzle/schema/`: source-of-truth database schema grouped by domain.
- `backend/drizzle/`: SQL migrations and snapshots.

Important web structure:

```txt
next-frontend/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── demo/
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   ├── schemas/
│   ├── services/
│   ├── types/
│   └── utils/
├── proxy.ts
└── Dockerfile
```

- `app/(auth)/`: login, verify email, forgot/reset/set-initial-password, complete-profile routes.
- `app/(dashboard)/dashboard/`: admin, teacher, student, shared dashboard pages.
- `src/services/`: typed wrappers over backend endpoints.
- `src/lib/`: auth, API client, route guards, utility logic.

Important AI service structure:

```txt
ai-service/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── schemas.py
│   ├── extraction_pipeline.py
│   ├── retrieval_service.py
│   ├── mentor_service.py
│   ├── student_tutor_service.py
│   ├── quiz_generation_service.py
│   └── indexing_pipeline.py
├── tests/
├── scripts/
└── Dockerfile
```

Important mobile structure:

```txt
mobile/
├── App.tsx
├── src/
│   ├── api/
│   ├── bootstrap/
│   ├── components/
│   ├── navigation/
│   ├── providers/
│   ├── screens/
│   ├── theme/
│   └── types/
├── FEATURES_MODULES_LIST.txt
└── INTEGRATION_PLACEHOLDERS.md
```

## 4. Application Architecture

This repo is a modular monorepo, not a single app.

- Backend is the system-of-record and API authority.
- Frontend and mobile are clients of backend `/api` routes.
- AI service is an internal subordinate service, not a public auth authority.
- PostgreSQL stores LMS records, LXP state, AI logs, refresh tokens, and retrieval/indexing state.
- Redis supports BullMQ and readiness dependencies.
- WebSockets support live notifications.

Architecture style:

- Backend: modular layered Nest app. Controllers delegate to services. Services use `DatabaseService` and Drizzle schema (`backend/src/app.module.ts`, `backend/src/database/database.service.ts`).
- Frontend: App Router pages + shared providers + service wrappers.
- Mobile: provider-driven Expo app with React Navigation and API service wrappers.
- AI service: FastAPI route handlers orchestrating helper services and direct database access.

Primary request flow:

```txt
User -> Next.js or Expo UI -> service wrapper -> backend /api route -> controller -> service -> Drizzle/PostgreSQL -> response
```

AI-assisted flow:

```txt
Teacher or student -> frontend/mobile -> backend /api/ai/* -> AiProxyService -> ai-service route -> Ollama/cloud fallback + Postgres -> backend response envelope -> UI
```

Auth flow:

```txt
Web login -> POST /api/auth/login -> backend sets refreshToken cookie + returns access token -> frontend keeps access token in memory -> refresh via /api/auth/refresh

Mobile login -> POST /api/auth/mobile/login -> backend returns access + refresh tokens -> mobile stores both in SecureStore/AsyncStorage -> refresh via /api/auth/mobile/refresh
```

Background job flow:

```txt
Teacher action -> backend AI/performance route -> BullMQ or async orchestration -> ai-service / internal processing -> DB job/output rows -> polling endpoints -> frontend/mobile review/apply flow
```

Readiness flow:

- backend readiness checks database, Redis, and AI-service health (`backend/src/modules/health/health.service.ts`).
- AI-service exposes `/health`, `/ready`, `/metrics`, `/live` (`ai-service/app/main.py`).
- Docker Compose monitoring stack scrapes backend and AI metrics and probes other services (`monitoring/prometheus.yml`).

## 5. Core Features Currently Implemented

### Identity, authentication, and session management

- Web login/logout/refresh/me/profile update/password reset/OTP activation are implemented in `backend/src/modules/auth/auth.controller.ts` and consumed by `next-frontend/src/lib/auth-service.ts`.
- Mobile-specific auth token endpoints exist under `/auth/mobile/*` and are consumed by `mobile/src/api/services/auth.ts`.
- Refresh token rotation, reuse detection, and global session revocation are implemented in `backend/src/modules/auth/token.service.ts`.
- Status: implemented and central to all apps.

### User and role administration

- Admin can create, update, suspend, reactivate, soft-delete, purge, export, and bulk-manage users (`backend/src/modules/users/users.controller.ts`).
- Admin web pages exist for users and user creation/edit flows (`next-frontend/app/(dashboard)/dashboard/admin/users/**`).
- Status: implemented, with strong backend surface.

### Sections and classes

- Sections support create/update/banner/roster/lifecycle/access-students flows (`backend/src/modules/sections/sections.controller.ts`).
- Classes support listing, filtering by teacher/student/section, enrollment management, banners, presentation, and lifecycle actions (`backend/src/modules/classes/classes.controller.ts`).
- Admin and teacher pages for sections/classes exist on web, and student/teacher class flows exist on mobile (`next-frontend/app/(dashboard)/dashboard/admin/classes/**`, `next-frontend/app/(dashboard)/dashboard/teacher/classes/**`, `mobile/src/screens/ClassDetailScreen.tsx`, `mobile/src/screens/TeacherClassDetailScreen.tsx`).
- Status: implemented.

### Lessons, content modules, and template engine

- Lessons have content blocks, ordering, draft/publish, completion, and version snapshots (`backend/src/drizzle/schema/base.schema.ts`, `backend/src/modules/lessons/lessons.controller.ts`).
- Content modules organize lessons, assessments, and files into sectioned module structures (`backend/src/modules/content-modules/content-modules.controller.ts`, `backend/src/drizzle/schema/base.schema.ts`).
- Class templates exist with template modules, sections, lessons, assessments, announcements, and engine chunks (`backend/src/drizzle/schema/class-templates.schema.ts`, `backend/src/modules/class-templates/class-templates.controller.ts`).
- Teacher and admin editors exist in web routes and feature components (`next-frontend/app/(dashboard)/dashboard/teacher/lessons/**`, `next-frontend/app/(dashboard)/dashboard/admin/class-templates/**`, `next-frontend/src/features/lesson-blocks/`).
- Status: implemented, but template-engine verification harness is reported stale in repo audits (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md`).

### Assessments and submissions

- Assessments support question banks, options, images, rubric-source upload/review, attempt tracking, progress saving, submission, return/unreturn, stats, and analytics (`backend/src/modules/assessments/assessments.controller.ts`).
- Student assessment pages, teacher assessment editors, and result views exist on web and mobile (`next-frontend/app/(dashboard)/dashboard/student/assessments/**`, `next-frontend/app/(dashboard)/dashboard/teacher/assessments/**`, `mobile/src/screens/AssessmentTakeScreen.tsx`).
- Status: implemented.

### Class records and grading

- DepEd-style class record sheets, categories, items, scores, finalization, reopening, spreadsheet/report exports, and slot overview exist (`backend/src/drizzle/schema/class-record.schema.ts`, `backend/src/modules/class-record/class-record.controller.ts`).
- Teacher web and mobile class-record surfaces exist (`next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx`, `mobile/src/screens/TeacherClassRecordScreen.tsx`).
- Status: implemented.

### Announcements, notifications, and discussion board

- Class announcements support publish/visibility/pin/archive concepts (`backend/src/drizzle/schema/announcements-notifications.schema.ts`, `backend/src/modules/announcements/announcements.controller.ts`).
- Notifications have DB persistence plus live Socket.IO fan-out (`backend/src/modules/notifications/notifications.controller.ts`, `backend/src/modules/notifications/notifications.gateway.ts`).
- Discussion threads, attachments, comments, reactions, and moderation-like actions exist (`backend/src/drizzle/schema/discussion-board.schema.ts`, `backend/src/modules/discussion-board/discussion-board.controller.ts`).
- Web and mobile inbox/announcement surfaces are implemented (`next-frontend/app/(dashboard)/dashboard/notifications/page.tsx`, `mobile/src/screens/NotificationsInboxScreen.tsx`).
- Status: implemented.

### Reporting and analytics

- Admin overview, dashboard stats, audit log retrieval, usage summaries, activity export, and user monitoring reports exist (`backend/src/modules/admin/admin.controller.ts`, `backend/src/modules/users/users.controller.ts`).
- Report endpoints include class enrollment, student performance, intervention participation, assessment summary, and system usage (`backend/src/modules/reports/reports.controller.ts`).
- Analytics endpoints include class trends, workload, admin overview, and intervention outcomes (`backend/src/modules/analytics/analytics.controller.ts`).
- Status: implemented.

### Performance tracking and at-risk detection

- `performance_snapshots` and `performance_logs` track computed student class health and at-risk state (`backend/src/drizzle/schema/performance.schema.ts`).
- Recompute, summary, at-risk, diagnostics, job polling, and admin analytics routes exist (`backend/src/modules/performance/performance.controller.ts`).
- Teacher and student performance pages exist on web and mobile (`next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`, `next-frontend/app/(dashboard)/dashboard/student/performance/page.tsx`, `mobile/src/screens/PerformanceScreen.tsx`).
- Status: implemented.

### LXP interventions and learner pathways

- Intervention cases, assignments, generated remedial lessons, guided assessments, LXP XP/progress, system evaluations, teacher evaluations, and per-class AI policy rows are modeled in `backend/src/drizzle/schema/lxp.schema.ts`.
- Student eligibility, playlists, checkpoint completion, guided-assessment start/progress/submit/result, teacher intervention assignment/activate/resolve/regenerate, and evaluation routes exist in `backend/src/modules/lxp/lxp.controller.ts`.
- Student LXP / JA / intervention pages exist on web and mobile (`next-frontend/app/(dashboard)/dashboard/student/lxp/**`, `mobile/src/screens/LxpScreen.tsx`).
- Status: implemented.

### JA, tutor, and AI mentor flows

- Backend exposes `/api/ai/*` and `/api/ai/student/ja/*` routes; AI service exposes matching internal endpoints (`backend/src/modules/ai-mentor/ai-mentor.controller.ts`, `backend/src/modules/ja/*.controller.ts`, `ai-service/app/main.py`).
- Supported surfaces include mentor explain, student tutor bootstrap/session/message/answers, JA practice, JA ask, JA review, admin analytics chat, intervention recommendations, quiz draft jobs, lesson-plan jobs, indexing, extraction flows, and history.
- Web and mobile route surfaces exist for student chatbot/JA and teacher AI draft/intervention tools (`next-frontend/app/(dashboard)/dashboard/student/ja/page.tsx`, `next-frontend/app/(dashboard)/dashboard/student/chatbot/page.tsx`, `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx`, `mobile/src/screens/JaScreen.tsx`, `mobile/src/screens/AiTutorScreen.tsx`).
- Status: implemented, but some live end-to-end teacher AI job flows are still described as only partially live-verified in repo audits (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md`).

### File library and retrieval/indexing

- Backend supports teacher/general library folders and files, AI indexing state, storage summary, and downloads (`backend/src/modules/file-upload/file-upload.controller.ts`, `backend/src/drizzle/schema/base.schema.ts`).
- RAG/indexing schema tracks chunks, embeddings, mastery, generation jobs, and outputs (`backend/src/drizzle/schema/rag.schema.ts`).
- AI service owns retrieval preview, indexing, backfill, and library indexing work (`ai-service/app/main.py`, `ai-service/app/indexing_pipeline.py`, `ai-service/app/library_indexing_pipeline.py`).
- Status: implemented.

### School events and calendars

- School events table and controller exist (`backend/src/drizzle/schema/school-events.schema.ts`, `backend/src/modules/school-events/school-events.controller.ts`).
- Admin, teacher, and student calendar pages exist on web and mobile.
- Status: implemented.

### Landing page and demo flow

- Marketing/public landing page exists and redirects authenticated users into dashboard role routes (`next-frontend/app/page.tsx`).
- A scripted guided demo exists with student/teacher branching and AI plan generation (`next-frontend/app/demo/page.tsx`).
- Status: implemented.

## 6. Routes / API Endpoints

The repo has three route surfaces:

- backend public API under `/api/*`
- internal AI-service API under `/...`
- Next.js page routes under `/...`

### Backend API

Auth rule of thumb:

- `No` means the route is explicitly public with `@Public()`.
- `Yes` means the global JWT guard applies.
- Role-specific restrictions are enforced by controller decorators; see the referenced controller file.

| Method | Path | Purpose | Main File | Auth Required | Notes |
| ------ | ---- | ------- | --------- | ------------- | ----- |
| POST | `/api/auth/login` | Web login | `backend/src/modules/auth/auth.controller.ts` | No | Sets refresh cookie and returns access token |
| POST | `/api/auth/mobile/login` | Mobile login | `backend/src/modules/auth/auth.controller.ts` | No | Returns refresh token in JSON |
| POST | `/api/auth/refresh` | Rotate web refresh token | `backend/src/modules/auth/auth.controller.ts` | No | Cookie-based refresh |
| POST | `/api/auth/mobile/refresh` | Rotate mobile refresh token | `backend/src/modules/auth/auth.controller.ts` | No | JSON-based refresh |
| POST | `/api/auth/logout` | Web logout | `backend/src/modules/auth/auth.controller.ts` | No | Clears cookie |
| POST | `/api/auth/mobile/logout` | Mobile logout | `backend/src/modules/auth/auth.controller.ts` | No | Revokes supplied refresh token |
| POST | `/api/auth/logout-all` | Revoke all sessions | `backend/src/modules/auth/auth.controller.ts` | Yes | Current user only |
| GET | `/api/auth/me` | Current authenticated user | `backend/src/modules/auth/auth.controller.ts` | Yes | Used by web and mobile bootstrap |
| PATCH | `/api/auth/profile` | Update current user profile | `backend/src/modules/auth/auth.controller.ts` | Yes | Writes audit log |
| POST | `/api/auth/forgot-password` | Request reset OTP | `backend/src/modules/auth/auth.controller.ts` | No | Rate limited |
| POST | `/api/auth/reset-password` | Reset password with OTP | `backend/src/modules/auth/auth.controller.ts` | No | |
| POST | `/api/auth/validate-credentials` | Check password without full login | `backend/src/modules/auth/auth.controller.ts` | No | Used during unverified-account flow |
| POST | `/api/auth/set-initial-password` | Activation password using OTP | `backend/src/modules/auth/auth.controller.ts` | No | |
| POST | `/api/auth/set-activation-password` | Set password after verification | `backend/src/modules/auth/auth.controller.ts` | No | |
| POST | `/api/otp/verify` | Verify email OTP | `backend/src/modules/otp/otp.controller.ts` | No | |
| POST | `/api/otp/resend` | Resend verification OTP | `backend/src/modules/otp/otp.controller.ts` | No | |
| GET | `/api/health` | Liveness alias | `backend/src/modules/health/health.controller.ts` | No | |
| GET | `/api/health/live` | Liveness | `backend/src/modules/health/health.controller.ts` | No | |
| GET | `/api/health/ready` | Readiness with DB/Redis/AI checks | `backend/src/modules/health/health.controller.ts` | No | |
| GET | `/api/admin/overview` | Admin dashboard overview | `backend/src/modules/admin/admin.controller.ts` | Yes | Admin-only |
| GET | `/api/admin/dashboard/stats` | Admin dashboard stats | `backend/src/modules/admin/admin.controller.ts` | Yes | Admin-only |
| GET | `/api/admin/audit-logs` | Audit log search | `backend/src/modules/admin/admin.controller.ts` | Yes | Admin-only |
| GET | `/api/admin/usage-summary` | Usage metrics summary | `backend/src/modules/admin/admin.controller.ts` | Yes | Admin-only |
| GET | `/api/admin/activity-export` | CSV export of usage summary | `backend/src/modules/admin/admin.controller.ts` | Yes | Admin-only |
| GET | `/api/users/all` | Paginated user list | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| GET | `/api/users/reports/monitoring` | Monitoring report | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| GET | `/api/users/:id` | User detail | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| POST | `/api/users/create` | Create user | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| PUT | `/api/users/update/:id` | Update user | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| POST | `/api/users/:id/reset-password` | Admin reset password | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| PATCH | `/api/users/:id/suspend` | Suspend user | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| PATCH | `/api/users/:id/reactivate` | Reactivate user | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| DELETE | `/api/users/:id/soft-delete` | Archive then soft-delete user | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| DELETE | `/api/users/:id/purge` | Permanently purge archived user | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| GET | `/api/users/:id/export` | Export user JSON archive | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| POST | `/api/users/bulk/lifecycle` | Bulk lifecycle action | `backend/src/modules/users/users.controller.ts` | Yes | Admin-only |
| GET | `/api/sections/all` | Section list | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/my` | Teacher/admin owned sections | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/:id` | Section detail | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| POST | `/api/sections/create` | Create section | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| PUT | `/api/sections/update/:id` | Update section | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| PATCH | `/api/sections/:id/presentation` | Update section presentation | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| POST | `/api/sections/:id/banner` | Upload section banner | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| DELETE | `/api/sections/delete/:id` | Soft delete section | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| DELETE | `/api/sections/permanent/:id` | Permanent delete section | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/:id/roster` | Section roster | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| POST | `/api/sections/:id/roster` | Add student to section roster | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| DELETE | `/api/sections/:id/roster/:studentId` | Remove student from section roster | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/:id/candidates` | Candidate students for section | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/:id/schedule` | Section schedule | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/access-students/overview` | Promotion/access-students overview | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/access-students/target-sections` | Access-students targets | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| POST | `/api/sections/access-students/finalize-grades` | Finalize grades for progression | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| POST | `/api/sections/access-students/move-up` | Promote students | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| POST | `/api/sections/access-students/fail` | Mark failure / non-promotion | `backend/src/modules/sections/sections.controller.ts` | Yes | |
| GET | `/api/sections/banners/:filename` | Serve section banner | `backend/src/modules/sections/sections.controller.ts` | No | Public asset route |
| GET | `/api/classes` | Current user class list | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/all` | All classes | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/:id` | Class detail | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| POST | `/api/classes` | Create class | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| PUT | `/api/classes/:id` | Update class | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| POST | `/api/classes/:id/banner` | Upload class banner | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| PUT | `/api/classes/:id/toggle-status` | Toggle class active status | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| PATCH | `/api/classes/:id/presentation` | Update class presentation | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/teacher/:teacherId` | Classes by teacher | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/section/:sectionId` | Classes by section | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/student/:studentId` | Classes by student | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/:classId/enrollments` | Class enrollments | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| POST | `/api/classes/:classId/enrollments` | Enroll student in class | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| DELETE | `/api/classes/:classId/enrollments/:studentId` | Remove enrollment | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/:classId/students/masterlist` | Masterlist | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/:classId/students/:studentId/profile` | Student class profile | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/:classId/students/:studentId/overview` | Student class overview | `backend/src/modules/classes/classes.controller.ts` | Yes | |
| GET | `/api/classes/banners/:filename` | Serve class banner | `backend/src/modules/classes/classes.controller.ts` | No | Public asset route |
| GET | `/api/lessons/class/:classId` | Lessons for class | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| GET | `/api/lessons/class/:classId/drafts` | Draft lessons for class | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| GET | `/api/lessons/:id` | Lesson detail | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| POST | `/api/lessons` | Create lesson | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| PUT | `/api/lessons/:id` | Update lesson | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| PUT | `/api/lessons/:id/publish` | Publish lesson | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| GET | `/api/lessons/:id/versions` | Lesson versions | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| POST | `/api/lessons/:id/versions` | Create version snapshot | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| POST | `/api/lessons/:id/versions/:versionId/restore` | Restore snapshot | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| POST | `/api/lessons/:lessonId/blocks` | Add lesson block | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| PUT | `/api/lessons/blocks/:blockId` | Update lesson block | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| DELETE | `/api/lessons/blocks/:blockId` | Delete lesson block | `backend/src/modules/lessons/lessons.controller.ts` | Yes | |
| POST | `/api/lessons/:lessonId/complete` | Mark completion | `backend/src/modules/lessons/lessons.controller.ts` | Yes | Student-facing |
| GET | `/api/lessons/:lessonId/completion-status` | Completion status | `backend/src/modules/lessons/lessons.controller.ts` | Yes | Student-facing |
| GET | `/api/modules/class/:classId` | Modules for class | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| GET | `/api/modules/class/:classId/:moduleId` | Module detail | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| POST | `/api/modules` | Create module | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| PATCH | `/api/modules/:moduleId` | Update module | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| PATCH | `/api/modules/:moduleId/core-release` | Core release toggle | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| DELETE | `/api/modules/:moduleId` | Delete module | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| POST | `/api/modules/:moduleId/sections` | Create module section | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| PATCH | `/api/modules/sections/:sectionId` | Update module section | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| DELETE | `/api/modules/sections/:sectionId` | Delete module section | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| POST | `/api/modules/sections/:sectionId/items` | Add module item | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| PATCH | `/api/modules/items/:itemId` | Update module item | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| DELETE | `/api/modules/items/:itemId` | Delete module item | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| GET | `/api/modules/items/:itemId/file/download` | Download module file item | `backend/src/modules/content-modules/content-modules.controller.ts` | Yes | |
| GET | `/api/assessments/class/:classId` | Assessments by class | `backend/src/modules/assessments/assessments.controller.ts` | Yes | |
| GET | `/api/assessments/:id` | Assessment detail | `backend/src/modules/assessments/assessments.controller.ts` | Yes | |
| POST | `/api/assessments` | Create assessment | `backend/src/modules/assessments/assessments.controller.ts` | Yes | |
| PUT | `/api/assessments/:id` | Update assessment | `backend/src/modules/assessments/assessments.controller.ts` | Yes | |
| DELETE | `/api/assessments/:id` | Delete assessment | `backend/src/modules/assessments/assessments.controller.ts` | Yes | |
| POST | `/api/assessments/:assessmentId/start` | Start attempt | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Student-facing |
| PATCH | `/api/assessments/attempts/:attemptId/progress` | Save attempt progress | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Student-facing |
| POST | `/api/assessments/submit` | Submit attempt | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Student-facing |
| GET | `/api/assessments/attempts/:attemptId/results` | Attempt results | `backend/src/modules/assessments/assessments.controller.ts` | Yes | |
| GET | `/api/assessments/:assessmentId/stats` | Assessment stats | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Teacher/admin |
| GET | `/api/assessments/:assessmentId/question-analytics` | Question analytics | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Teacher/admin |
| POST | `/api/assessments/attempts/:attemptId/return` | Return assessment | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Teacher/admin |
| POST | `/api/assessments/attempts/:attemptId/unreturn` | Unreturn assessment | `backend/src/modules/assessments/assessments.controller.ts` | Yes | Teacher/admin |
| GET | `/api/assessments/questions/images/:filename` | Public question image | `backend/src/modules/assessments/assessments-public.controller.ts` | No | |
| POST | `/api/class-record` | Create class record header | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| GET | `/api/class-record/by-class/:classId` | Class records for class | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| GET | `/api/class-record/:id/spreadsheet` | Spreadsheet export | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| POST | `/api/class-record/items/:itemId/scores` | Record score | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| POST | `/api/class-record/items/:itemId/scores/bulk` | Bulk score entry | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| POST | `/api/class-record/:id/finalize` | Finalize class record | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| POST | `/api/class-record/:id/reopen` | Reopen class record | `backend/src/modules/class-record/class-record.controller.ts` | Yes | |
| GET | `/api/files` | File library listing | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| POST | `/api/files/upload` | Upload file | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| GET | `/api/files/folders` | Folder listing | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| POST | `/api/files/folders` | Create folder | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| PATCH | `/api/files/:id` | Update file metadata | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| GET | `/api/files/:id/download` | Download file | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| POST | `/api/files/:id/index/retry` | Retry indexing | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| DELETE | `/api/files/:id` | Delete file | `backend/src/modules/file-upload/file-upload.controller.ts` | Yes | |
| GET | `/api/internal/uploads/raw` | Internal raw upload fetch | `backend/src/modules/file-upload/internal-uploads.controller.ts` | No | Internal/public risk surface |
| POST | `/api/roster-import/:sectionId/preview` | Preview roster import | `backend/src/modules/roster-import/roster-import.controller.ts` | Yes | |
| POST | `/api/roster-import/:sectionId/commit` | Commit roster import | `backend/src/modules/roster-import/roster-import.controller.ts` | Yes | |
| GET | `/api/roster-import/:sectionId/pending` | Pending roster rows | `backend/src/modules/roster-import/roster-import.controller.ts` | Yes | |
| PATCH | `/api/roster-import/pending/:id/resolve` | Resolve pending roster row | `backend/src/modules/roster-import/roster-import.controller.ts` | Yes | |
| GET | `/api/notifications` | Notification list | `backend/src/modules/notifications/notifications.controller.ts` | Yes | |
| GET | `/api/notifications/unread-count` | Unread count | `backend/src/modules/notifications/notifications.controller.ts` | Yes | |
| PATCH | `/api/notifications/:id/read` | Mark one notification read | `backend/src/modules/notifications/notifications.controller.ts` | Yes | |
| PATCH | `/api/notifications/read-all` | Mark all notifications read | `backend/src/modules/notifications/notifications.controller.ts` | Yes | |
| POST | `/api/classes/:classId/announcements` | Create announcement | `backend/src/modules/announcements/announcements.controller.ts` | Yes | |
| GET | `/api/classes/:classId/announcements` | List announcements | `backend/src/modules/announcements/announcements.controller.ts` | Yes | |
| POST | `/api/classes/:classId/discussion-threads` | Create discussion thread | `backend/src/modules/discussion-board/discussion-board.controller.ts` | Yes | |
| GET | `/api/classes/:classId/discussion-threads` | List discussion threads | `backend/src/modules/discussion-board/discussion-board.controller.ts` | Yes | |
| GET | `/api/classes/:classId/discussion-threads/:threadId` | Thread detail | `backend/src/modules/discussion-board/discussion-board.controller.ts` | Yes | |
| POST | `/api/classes/:classId/discussion-threads/:threadId/comments` | Add comment | `backend/src/modules/discussion-board/discussion-board.controller.ts` | Yes | |
| PUT | `/api/classes/:classId/discussion-threads/:threadId/comments/:commentId/reaction` | Add or replace reaction | `backend/src/modules/discussion-board/discussion-board.controller.ts` | Yes | |
| GET | `/api/reports/student-master-list` | Student master list report | `backend/src/modules/reports/reports.controller.ts` | Yes | |
| GET | `/api/reports/class-enrollment` | Class enrollment report | `backend/src/modules/reports/reports.controller.ts` | Yes | |
| GET | `/api/reports/student-performance` | Student performance report | `backend/src/modules/reports/reports.controller.ts` | Yes | |
| GET | `/api/reports/intervention-participation` | Intervention participation report | `backend/src/modules/reports/reports.controller.ts` | Yes | |
| GET | `/api/reports/assessment-summary` | Assessment summary report | `backend/src/modules/reports/reports.controller.ts` | Yes | |
| GET | `/api/reports/system-usage` | System usage report | `backend/src/modules/reports/reports.controller.ts` | Yes | |
| GET | `/api/performance/classes/:classId/summary` | Performance summary | `backend/src/modules/performance/performance.controller.ts` | Yes | |
| GET | `/api/performance/classes/:classId/at-risk` | At-risk students | `backend/src/modules/performance/performance.controller.ts` | Yes | |
| POST | `/api/performance/classes/:classId/recompute` | Recompute performance | `backend/src/modules/performance/performance.controller.ts` | Yes | |
| POST | `/api/performance/classes/:classId/analysis/jobs` | Start performance analysis job | `backend/src/modules/performance/performance.controller.ts` | Yes | |
| GET | `/api/performance/analysis/jobs/:jobId` | Poll analysis job | `backend/src/modules/performance/performance.controller.ts` | Yes | |
| GET | `/api/analytics/classes/:classId/trends` | Class trends | `backend/src/modules/analytics/analytics.controller.ts` | Yes | |
| GET | `/api/analytics/teachers/:teacherId/workload` | Teacher workload | `backend/src/modules/analytics/analytics.controller.ts` | Yes | |
| GET | `/api/profiles/me` | My profile | `backend/src/modules/profiles/profiles.controller.ts` | Yes | |
| GET | `/api/profiles/me/transcript` | Transcript | `backend/src/modules/profiles/profiles.controller.ts` | Yes | Student-facing |
| GET | `/api/profiles/me/assessment-history` | Assessment history | `backend/src/modules/profiles/profiles.controller.ts` | Yes | Student-facing |
| POST | `/api/profiles/me/avatar` | Upload avatar | `backend/src/modules/profiles/profiles.controller.ts` | Yes | |
| GET | `/api/profiles/images/:filename` | Serve profile image | `backend/src/modules/profiles/profiles.controller.ts` | No | Public asset route |
| GET | `/api/lxp/me/eligibility` | LXP eligibility | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Student-facing |
| GET | `/api/lxp/me/playlist/:classId` | Intervention playlist | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Student-facing |
| POST | `/api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/start` | Start generated guided assessment | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Student-facing |
| PATCH | `/api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/progress` | Save generated guided assessment progress | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Student-facing |
| POST | `/api/lxp/me/playlist/:classId/guided-assessments/:assignmentId/submit` | Submit generated guided assessment | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Student-facing |
| GET | `/api/lxp/teacher/classes/:classId/interventions` | Teacher interventions for class | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Teacher/admin |
| POST | `/api/lxp/teacher/interventions/:caseId/assign` | Assign intervention checkpoint | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Teacher/admin |
| POST | `/api/lxp/teacher/interventions/:caseId/activate` | Activate intervention | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Teacher/admin |
| POST | `/api/lxp/teacher/interventions/:caseId/resolve` | Resolve intervention | `backend/src/modules/lxp/lxp.controller.ts` | Yes | Teacher/admin |
| GET | `/api/lxp/evaluations` | System evaluations list | `backend/src/modules/lxp/lxp.controller.ts` | Yes | |
| POST | `/api/lxp/evaluations` | Create evaluation | `backend/src/modules/lxp/lxp.controller.ts` | Yes | |
| GET | `/api/school-events` | List school events | `backend/src/modules/school-events/school-events.controller.ts` | Yes | |
| POST | `/api/school-events` | Create school event | `backend/src/modules/school-events/school-events.controller.ts` | Yes | |
| GET | `/api/teacher/classes` | Teacher dashboard classes | `backend/src/modules/teacher/teacher.controller.ts` | Yes | Teacher/admin |
| GET | `/api/teacher/lessons` | Teacher lesson list | `backend/src/modules/teacher/teacher.controller.ts` | Yes | Teacher/admin |
| GET | `/api/teacher/assessments` | Teacher assessment list | `backend/src/modules/teacher/teacher.controller.ts` | Yes | Teacher/admin |
| GET | `/api/teacher-profiles/me` | Teacher profile self | `backend/src/modules/teacher-profiles/teacher-profiles.controller.ts` | Yes | |
| GET | `/api/teacher-profiles/:userId` | Teacher profile detail | `backend/src/modules/teacher-profiles/teacher-profiles.controller.ts` | Yes | |
| PUT | `/api/teacher-profiles/:userId` | Update teacher profile | `backend/src/modules/teacher-profiles/teacher-profiles.controller.ts` | Yes | |
| POST | `/api/teacher-profiles/me/avatar` | Teacher avatar upload | `backend/src/modules/teacher-profiles/teacher-profiles.controller.ts` | Yes | |
| GET | `/api/academic-state/current` | Current school-year / quarter state | `backend/src/modules/academic-state/academic-state.controller.ts` | Yes | Admin-focused |
| GET | `/api/academic-state/impact-preview` | Preview academic-state transition impact | `backend/src/modules/academic-state/academic-state.controller.ts` | Yes | |
| POST | `/api/academic-state/transition` | Transition academic state | `backend/src/modules/academic-state/academic-state.controller.ts` | Yes | |

### Internal AI-Service API

These routes are served by `ai-service/app/main.py`. The backend proxies the user-facing subset.

| Method | Path | Purpose | Main File | Auth Required | Notes |
| ------ | ---- | ------- | --------- | ------------- | ----- |
| POST | `/chat` | Basic AI chat | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/admin/chat` | Admin analytics chat | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/mentor/explain` | Explain assessment mistake | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/student/tutor/bootstrap` | Tutor bootstrap | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/student/tutor/session` | Start tutor session | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/student/tutor/session/{session_id}` | Tutor session detail | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/student/tutor/session/{session_id}/message` | Continue tutor chat | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/student/tutor/session/{session_id}/answers` | Submit tutor answers | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/student/ja/practice/bootstrap` | JA practice bootstrap | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/student/ja/practice/sessions/generate` | Generate JA practice session | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/student/ja/ask/bootstrap` | JA ask bootstrap | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/student/ja/ask/respond` | JA ask reply generation | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/student/ja/review/bootstrap` | JA review bootstrap | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/student/ja/review/sessions/generate` | Generate JA review session | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/extract` | Queue extraction | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/extractions` | List extractions | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/extractions/{extraction_id}` | Extraction detail | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| PATCH | `/extractions/{extraction_id}` | Update reviewed extraction | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/extractions/{extraction_id}/apply/preview` | Preview extraction apply | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/extractions/{extraction_id}/apply` | Apply extraction | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/teacher/interventions/{case_id}/jobs` | Start intervention job | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/teacher/quizzes/jobs` | Start quiz draft job | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| POST | `/teacher/lesson-plans/jobs` | Start lesson-plan job | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/teacher/jobs/{job_id}` | Job status | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/teacher/jobs/{job_id}/result` | Job result | `ai-service/app/main.py` | Header-based internal auth | Backend proxied |
| GET | `/internal/retrieval/preview` | Retrieval preview | `ai-service/app/main.py` | Internal | Non-frontend support route |
| POST | `/internal/index/classes/{class_id}` | Internal reindex | `ai-service/app/main.py` | Internal | |
| POST | `/internal/index/library-files/{file_id}` | Index a library file | `ai-service/app/main.py` | Internal | |
| POST | `/internal/index/backfill` | Full indexing backfill | `ai-service/app/main.py` | Internal | |
| GET | `/health` | AI health | `ai-service/app/main.py` | Internal/public service health | |
| GET | `/live` | AI liveness | `ai-service/app/main.py` | Internal/public service health | |
| GET | `/ready` | AI readiness | `ai-service/app/main.py` | Internal/public service health | |
| GET | `/metrics` | AI Prometheus metrics | `ai-service/app/main.py` | Internal/public service health | |

### Next.js Page Routes

| Route | Purpose | Main File | Notes |
| ----- | ------- | --------- | ----- |
| `/` | Marketing/public landing page | `next-frontend/app/page.tsx` | Redirects authenticated users into dashboard |
| `/demo` | Guided product demo | `next-frontend/app/demo/page.tsx` | SessionStorage-backed demo state |
| `/login` | Web login | `next-frontend/app/(auth)/login/page.tsx` | |
| `/verify-email` | OTP verification | `next-frontend/app/(auth)/verify-email/page.tsx` | |
| `/forgot-password` | Forgot password | `next-frontend/app/(auth)/forgot-password/page.tsx` | |
| `/reset-password` | Reset password | `next-frontend/app/(auth)/reset-password/page.tsx` | |
| `/set-initial-password` | First password set | `next-frontend/app/(auth)/set-initial-password/page.tsx` | |
| `/complete-profile` | Required profile completion | `next-frontend/app/(auth)/complete-profile/page.tsx` | |
| `/dashboard` | Shared dashboard entry | `next-frontend/app/(dashboard)/dashboard/page.tsx` | Role redirect surface |
| `/dashboard/notifications` | Shared notifications inbox | `next-frontend/app/(dashboard)/dashboard/notifications/page.tsx` | |
| `/dashboard/library` | Shared library surface | `next-frontend/app/(dashboard)/dashboard/library/page.tsx` | |
| `/dashboard/profile` | Shared profile surface | `next-frontend/app/(dashboard)/dashboard/profile/page.tsx` | |
| `/dashboard/admin` | Admin home | `next-frontend/app/(dashboard)/dashboard/admin/page.tsx` | |
| `/dashboard/admin/users` | User management | `next-frontend/app/(dashboard)/dashboard/admin/users/page.tsx` | |
| `/dashboard/admin/users/create` | Create user | `next-frontend/app/(dashboard)/dashboard/admin/users/create/page.tsx` | |
| `/dashboard/admin/users/[id]` | User detail/edit | `next-frontend/app/(dashboard)/dashboard/admin/users/[id]/page.tsx` | |
| `/dashboard/admin/sections` | Section management | `next-frontend/app/(dashboard)/dashboard/admin/sections/page.tsx` | |
| `/dashboard/admin/sections/new` | Create section | `next-frontend/app/(dashboard)/dashboard/admin/sections/new/page.tsx` | |
| `/dashboard/admin/sections/[id]/edit` | Edit section | `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx` | |
| `/dashboard/admin/sections/[id]/roster` | Section roster | `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx` | |
| `/dashboard/admin/classes` | Class management | `next-frontend/app/(dashboard)/dashboard/admin/classes/page.tsx` | |
| `/dashboard/admin/classes/new` | Create class | `next-frontend/app/(dashboard)/dashboard/admin/classes/new/page.tsx` | |
| `/dashboard/admin/classes/[id]` | Class detail | `next-frontend/app/(dashboard)/dashboard/admin/classes/[id]/page.tsx` | |
| `/dashboard/admin/class-templates` | Template workspace list | `next-frontend/app/(dashboard)/dashboard/admin/class-templates/page.tsx` | |
| `/dashboard/admin/class-templates/[id]` | Template editor | `next-frontend/app/(dashboard)/dashboard/admin/class-templates/[id]/page.tsx` | |
| `/dashboard/admin/roster-import` | Roster import | `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx` | |
| `/dashboard/admin/reports` | Admin reports | `next-frontend/app/(dashboard)/dashboard/admin/reports/page.tsx` | |
| `/dashboard/admin/evaluations` | System evaluations | `next-frontend/app/(dashboard)/dashboard/admin/evaluations/page.tsx` | |
| `/dashboard/admin/announcements` | Admin announcements view | `next-frontend/app/(dashboard)/dashboard/admin/announcements/page.tsx` | |
| `/dashboard/admin/audit` | Audit logs UI | `next-frontend/app/(dashboard)/dashboard/admin/audit/page.tsx` | |
| `/dashboard/admin/calendar` | School events/calendar admin | `next-frontend/app/(dashboard)/dashboard/admin/calendar/page.tsx` | |
| `/dashboard/admin/library` | Library admin | `next-frontend/app/(dashboard)/dashboard/admin/library/page.tsx` | |
| `/dashboard/admin/chatbot` | Admin analytics chatbot | `next-frontend/app/(dashboard)/dashboard/admin/chatbot/page.tsx` | |
| `/dashboard/admin/system-settings` | System settings | `next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx` | |
| `/dashboard/admin/diagnostics` | Diagnostics | `next-frontend/app/(dashboard)/dashboard/admin/diagnostics/page.tsx` | |
| `/dashboard/teacher` | Teacher redirect | `next-frontend/app/(dashboard)/dashboard/teacher/page.tsx` | |
| `/dashboard/teacher/classes` | Teacher classes | `next-frontend/app/(dashboard)/dashboard/teacher/classes/page.tsx` | |
| `/dashboard/teacher/classes/[id]` | Teacher class detail | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx` | |
| `/dashboard/teacher/classes/[id]/ai-draft` | Teacher AI draft workspace | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/ai-draft/page.tsx` | |
| `/dashboard/teacher/classes/[id]/modules/[moduleId]` | Teacher module detail | `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx` | |
| `/dashboard/teacher/lessons` | Teacher lessons | `next-frontend/app/(dashboard)/dashboard/teacher/lessons/page.tsx` | |
| `/dashboard/teacher/lessons/[id]/edit` | Lesson editor | `next-frontend/app/(dashboard)/dashboard/teacher/lessons/[id]/edit/page.tsx` | |
| `/dashboard/teacher/assessments` | Teacher assessments | `next-frontend/app/(dashboard)/dashboard/teacher/assessments/page.tsx` | |
| `/dashboard/teacher/assessments/[id]/edit` | Assessment editor | `next-frontend/app/(dashboard)/dashboard/teacher/assessments/[id]/edit/page.tsx` | |
| `/dashboard/teacher/sections` | Teacher sections | `next-frontend/app/(dashboard)/dashboard/teacher/sections/page.tsx` | |
| `/dashboard/teacher/calendar` | Teacher calendar | `next-frontend/app/(dashboard)/dashboard/teacher/calendar/page.tsx` | |
| `/dashboard/teacher/library` | Teacher library | `next-frontend/app/(dashboard)/dashboard/teacher/library/page.tsx` | |
| `/dashboard/teacher/class-record` | Teacher class record | `next-frontend/app/(dashboard)/dashboard/teacher/class-record/page.tsx` | |
| `/dashboard/teacher/reports` | Teacher reports | `next-frontend/app/(dashboard)/dashboard/teacher/reports/page.tsx` | |
| `/dashboard/teacher/interventions` | Intervention queue | `next-frontend/app/(dashboard)/dashboard/teacher/interventions/page.tsx` | |
| `/dashboard/teacher/interventions/[caseId]` | Intervention workspace | `next-frontend/app/(dashboard)/dashboard/teacher/interventions/[caseId]/page.tsx` | |
| `/dashboard/teacher/performance` | Teacher performance | `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx` | |
| `/dashboard/teacher/evaluations` | Teacher evaluations | `next-frontend/app/(dashboard)/dashboard/teacher/evaluations/page.tsx` | |
| `/dashboard/teacher/announcements` | Teacher announcements | `next-frontend/app/(dashboard)/dashboard/teacher/announcements/page.tsx` | |
| `/dashboard/teacher/extractions/[id]` | Extraction review/apply | `next-frontend/app/(dashboard)/dashboard/teacher/extractions/[id]/page.tsx` | |
| `/dashboard/student` | Student home | `next-frontend/app/(dashboard)/dashboard/student/page.tsx` | |
| `/dashboard/student/classes` | Student class list | `next-frontend/app/(dashboard)/dashboard/student/classes/page.tsx` | |
| `/dashboard/student/classes/[id]` | Student class detail | `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx` | |
| `/dashboard/student/classes/[id]/modules/[moduleId]` | Student module detail | `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/modules/[moduleId]/page.tsx` | |
| `/dashboard/student/lessons` | Student lessons | `next-frontend/app/(dashboard)/dashboard/student/lessons/page.tsx` | Redirect/support route |
| `/dashboard/student/assessments` | Student assessments | `next-frontend/app/(dashboard)/dashboard/student/assessments/page.tsx` | |
| `/dashboard/student/assessments/[id]/take` | Take assessment | `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/take/page.tsx` | |
| `/dashboard/student/assessments/[id]/results/[attemptId]` | Assessment results | `next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/results/[attemptId]/page.tsx` | |
| `/dashboard/student/lxp` | LXP landing | `next-frontend/app/(dashboard)/dashboard/student/lxp/page.tsx` | |
| `/dashboard/student/lxp/[classId]` | Class-specific LXP | `next-frontend/app/(dashboard)/dashboard/student/lxp/[classId]/page.tsx` | |
| `/dashboard/student/lxp/[classId]/guided-assessment/[assignmentId]` | Generated guided assessment | `next-frontend/app/(dashboard)/dashboard/student/lxp/[classId]/guided-assessment/[assignmentId]/page.tsx` | |
| `/dashboard/student/ja` | JA hub | `next-frontend/app/(dashboard)/dashboard/student/ja/page.tsx` | |
| `/dashboard/student/chatbot` | Chatbot/JA ask route | `next-frontend/app/(dashboard)/dashboard/student/chatbot/page.tsx` | |
| `/dashboard/student/calendar` | Student calendar | `next-frontend/app/(dashboard)/dashboard/student/calendar/page.tsx` | |
| `/dashboard/student/courses` | Student courses | `next-frontend/app/(dashboard)/dashboard/student/courses/page.tsx` | |
| `/dashboard/student/performance` | Student performance | `next-frontend/app/(dashboard)/dashboard/student/performance/page.tsx` | |
| `/dashboard/student/transcript` | Student transcript | `next-frontend/app/(dashboard)/dashboard/student/transcript/page.tsx` | |
| `/dashboard/student/profile` | Student profile | `next-frontend/app/(dashboard)/dashboard/student/profile/page.tsx` | |

### Mobile Navigation Routes

| Route Name | Purpose | Main File | Notes |
| ---------- | ------- | --------- | ----- |
| `Login` | Login screen | `mobile/src/navigation/AppNavigator.tsx` | Auth stack |
| `VerifyEmail` | OTP verify | `mobile/src/navigation/AppNavigator.tsx` | Auth stack |
| `ForgotPassword` | Password reset request | `mobile/src/navigation/AppNavigator.tsx` | Auth stack |
| `ResetPassword` | Reset password | `mobile/src/navigation/AppNavigator.tsx` | Auth stack |
| `SetInitialPassword` | Initial password | `mobile/src/navigation/AppNavigator.tsx` | Auth stack |
| `MainTabs` | Student or teacher root tabs | `mobile/src/navigation/AppNavigator.tsx` | Root stack |
| `StudentGuidedAssessment` | Student LXP generated assessment | `mobile/src/navigation/AppNavigator.tsx` | |
| `StudentJaReviewAssessment` | Student JA review flow | `mobile/src/navigation/AppNavigator.tsx` | |
| `Dashboard` / `Home` | Student dashboard or teacher home | `mobile/src/navigation/AppNavigator.tsx` | Role-specific tab label |
| `Classes` | Student or teacher classes | `mobile/src/navigation/AppNavigator.tsx` | |
| `Assessments` | Student or teacher assessments | `mobile/src/navigation/AppNavigator.tsx` | |
| `Announcements` | Notifications / announcements | `mobile/src/navigation/AppNavigator.tsx` | |
| `Sections` | Teacher sections | `mobile/src/navigation/AppNavigator.tsx` | Teacher only |
| `Profile` | Profile screen | `mobile/src/navigation/AppNavigator.tsx` | |
| `TeacherClassDetail` | Teacher class detail | `mobile/src/navigation/AppNavigator.tsx` | Teacher stack |
| `TeacherAssessmentEditor` | Teacher assessment editor | `mobile/src/navigation/AppNavigator.tsx` | Teacher stack |
| `TeacherInterventions` | Teacher interventions | `mobile/src/navigation/AppNavigator.tsx` | Teacher stack |
| `TeacherPerformance` | Teacher performance | `mobile/src/navigation/AppNavigator.tsx` | Teacher stack |

## 7. Database / Data Models

Schema source of truth is `backend/src/drizzle/schema/` with migrations in `backend/drizzle/` and Drizzle config in `backend/drizzle.config.ts`.

### Identity and access

- `roles`: role catalog (`student`, `teacher`, `admin`) (`backend/src/drizzle/schema/base.schema.ts`)
- `users`: email, hashed password, first/middle/last name, status, email verification, login timestamps
- `user_roles`: many-to-many role assignment with composite primary key
- `refresh_tokens`: hashed opaque refresh tokens, IP, user-agent, revocation flag, expiry (`backend/src/drizzle/schema/refresh-tokens.schema.ts`)
- `otp_verifications`: hashed OTP codes by user and purpose, expiry, attempt count, single active OTP per purpose (`backend/src/drizzle/schema/otp.schema.ts`)
- `audit_logs`: actor, action, target type/id, metadata JSON, created_at

### Academic structure

- `sections`: section name, grade level, school year, capacity, room, adviser, banner, active flag
- `classes`: subject name/code, grade level, section, teacher, room, school year, grading weights, banner, active flag
- `class_schedules`: day array plus start/end time
- `enrollments`: student, class, section, status, enrollment timestamp
- `academic_system_states`: school year + quarter state machine row (`backend/src/drizzle/schema/academic-state.schema.ts`)

### Profiles

- `student_profiles`: DOB, profile picture, gender, phone, address, guardian fields, grade level, LRN
- `teacher_profiles`: department, specialization, profile picture, contact number, DOB, gender, address, employee ID

### Learning content

- `lessons`: title, description, class, order, draft flag, source extraction link, template links
- `lesson_content_blocks`: typed JSON content blocks plus metadata
- `lesson_completions`: student completion rows with progress percentage
- `lesson_versions`: lesson snapshot history with version numbers and creator
- `class_modules`: course modules with visibility, lock state, theme, cover image, template links
- `module_sections`: ordered sections inside modules
- `module_items`: lesson/assessment/file items in module sections with visibility/required/given flags
- `module_grading_scale_entries`: per-module grading bands

### Assessments

- `assessments`: title, class, type, publish state, timing, upload rules, rubric parsing state, feedback settings, class-record linkage, template linkage, AI origin
- `assessment_questions`: question type, content, points, explanation, image, metadata, concept tags
- `assessment_question_options`: text/image/isCorrect/order/metadata
- `assessment_attempts`: attempt number, current progress, time tracking, submission state, return state, rubric scores, uploaded submission file metadata
- `assessment_responses`: per-question student answers, selected options, correctness, points earned

### Class records

- `class_records`: per-class per-grading-period sheet header
- `class_record_categories`: weighted grading categories
- `class_record_items`: scored activities, optional assessment linkage, date given
- `class_record_scores`: student scores per item
- `class_record_final_grades`: computed final percentages and remarks

### Announcements, notifications, and discussions

- `announcements`: class-scoped posts with visibility/pin/schedule/publish/archive state
- `notifications`: user-scoped messages with type, reference, read state
- `discussion_threads`: themed thread header with publish/close/archive state and comment policy
- `discussion_thread_attachments`: file/link attachments
- `discussion_comments`: thread replies with soft-delete fields
- `discussion_comment_attachments`: comment file attachments
- `discussion_comment_reactions`: one reaction per user per comment

### File library and retrieval

- `library_folders`: folder tree for teacher/general library
- `uploaded_files`: teacher, class, scope, AI-enabled flag, subject/grade partitioning, index status, file metadata, deleted_at
- `content_chunks`: normalized retrieval chunks from lessons, extractions, questions, or library files
- `content_chunk_embeddings`: `vector(768)` embedding rows
- `student_concept_mastery`: derived mastery counters by student/class/concept
- `ai_generation_jobs`: queued generation job headers
- `ai_generation_outputs`: structured AI outputs, approval state, linked target class/teacher

### AI extraction and interaction history

- `ai_interaction_logs`: all AI prompt/response logs with model used, response time, context metadata, session IDs
- `extracted_modules`: raw extracted text, structured content JSON, status, progress, model, apply flag

### LXP and interventions

- `intervention_cases`: student/class at-risk case records with thresholds and status
- `intervention_assignments`: ordered intervention checkpoints linking lessons, assessments, or generated artifacts
- `lxp_generated_remedial_lessons`: teacher-approvable remedial lesson drafts
- `lxp_generated_guided_assessments`: teacher-approvable guided assessments
- `lxp_generated_guided_assessment_attempts`: student attempts through generated guided assessments
- `lxp_progress`: student XP/streak/checkpoint progress by class
- `class_ai_policies`: per-class AI grounding and follow-up policy
- `system_evaluations`, `system_evaluation_campaigns`, `system_evaluation_assignments`: evaluation system for LMS/LXP/JA surfaces
- `teacher_evaluation_windows`, `teacher_evaluation_submissions`: teacher evaluation periods and submissions

### JA / tutor gamification state

- `ja_sessions`, `ja_session_items`, `ja_session_responses`, `ja_session_events`: practice/review session state
- `ja_progress`: XP, streak, sessions completed per student/class
- `ja_xp_ledger`: XP event ledger
- `ja_threads`, `ja_thread_messages`: JA ask conversation threads and messages
- `ja_guardrail_events`: blocked-prompt events and related moderation telemetry

### Performance and events

- `performance_snapshots`: per student/class computed averages, blended score, threshold, at-risk flag
- `performance_logs`: event-like transitions and threshold trigger history
- `school_events`: school-year calendar events / holiday breaks

### Template engine models

- `class_templates`, `class_template_modules`, `class_template_module_sections`
- `class_template_lessons`, `class_template_lesson_blocks`
- `class_template_assessments`, `class_template_assessment_questions`, `class_template_assessment_question_options`
- `class_template_module_items`, `class_template_announcements`, `class_template_engine_chunks`

### Seeds and migrations

- Migrations are numerous and ongoing, from `0000_...sql` through `0086_add_assessments_class_id_index.sql` (`backend/drizzle/`).
- `seed-database.js` seeds roles, admin/teacher/student users, profiles, sections, classes, schedules, enrollments, and more demo data.
- `scripts/post-seed-smoke.js` validates that seeded content includes attempts, chunks, embeddings, performance rows, and intervention cases.

## 8. Authentication and Authorization

### How login works

- Backend `POST /api/auth/login` validates email, verified status, account status, and bcrypt password (`backend/src/modules/auth/auth.service.ts`).
- Backend updates `last_login_at`, creates JWT access token, generates opaque refresh token, stores only the refresh token hash, writes audit log, and returns sanitized user data (`backend/src/modules/auth/auth.service.ts`, `backend/src/modules/auth/token.service.ts`).

### Web session handling

- Refresh token is stored as httpOnly cookie named `refreshToken` with environment-aware `sameSite`, `secure`, optional `domain`, and configured TTL (`backend/src/modules/auth/auth.controller.ts`).
- Frontend keeps access token only in memory (`next-frontend/src/lib/api-client.ts`).
- Frontend bootstraps by calling `/api/auth/refresh` and then `/api/auth/me` (`next-frontend/src/providers/AuthProvider.tsx`, `next-frontend/src/lib/session-refresh.ts`).

### Mobile session handling

- Mobile uses `/api/auth/mobile/login`, `/api/auth/mobile/refresh`, `/api/auth/mobile/logout` (`backend/src/modules/auth/auth.controller.ts`).
- `mobile` stores access token, refresh token, and session snapshot using SecureStore plus AsyncStorage fallback (`mobile/src/api/storage.ts`, `mobile/src/api/client.ts`).

### Registration model

- There is no open self-registration on web auth helpers; accounts are created by admin (`next-frontend/src/lib/auth-service.ts`).
- Activation uses OTP verification plus initial password or activation-password endpoints (`backend/src/modules/otp/otp.controller.ts`, `backend/src/modules/auth/auth.controller.ts`).

### Password hashing and rotation

- Password verification uses `bcrypt.compare` and password updates route through user services (`backend/src/modules/auth/auth.service.ts`).
- Refresh tokens are random opaque hex tokens hashed with SHA-256 before storage. Refresh rotation is atomic and revokes all sessions on reuse detection (`backend/src/modules/auth/token.service.ts`).

### Authorization model

- Global JWT guard is registered in `AppModule` (`backend/src/app.module.ts`).
- Explicit role checks use `@Roles(...)` and `RolesGuard` on controller methods.
- Frontend role-aware routing is enforced at dashboard layout and auth bootstrap level (`next-frontend/app/(dashboard)/layout.tsx`, `next-frontend/src/lib/dashboard-route-access.ts`).
- Mobile role selection is done in navigator role resolution (`mobile/src/navigation/AppNavigator.tsx`).

### Security concerns

- `backend/src/modules/notifications/notifications.gateway.ts` currently accepts all WebSocket origins; the comment says this should be tightened, but the code allows all origins.
- `backend/BACKEND_SETUP.md` contains real-looking JWT secret examples and default credentials; even as documentation, this is risky and should be sanitized.
- `backend/seed-database.js` contains hardcoded demo credentials. That is normal for seed data but must never be reused outside local/demo environments.
- `ai-service/.env` is tracked by git according to `git ls-files`. If it contains non-example secrets, that is a serious repo hygiene issue.
- `backend/src/modules/file-upload/internal-uploads.controller.ts` exposes a public raw upload route and should be treated carefully.

## 9. Frontend / UI State

### Main web surfaces

- Public landing page and demo: `next-frontend/app/page.tsx`, `next-frontend/app/demo/page.tsx`
- Auth flow: `next-frontend/app/(auth)/*`
- Admin dashboards: `next-frontend/app/(dashboard)/dashboard/admin/**`
- Teacher dashboards: `next-frontend/app/(dashboard)/dashboard/teacher/**`
- Student dashboards: `next-frontend/app/(dashboard)/dashboard/student/**`

### Shared frontend composition

- Root providers: React Query, theme, auth, toaster (`next-frontend/app/layout.tsx`)
- Protected shell: sidebar, top bar, student tutor launcher, unfinished attempt notifier, role mismatch logout (`next-frontend/app/(dashboard)/layout.tsx`)
- Services layer: typed wrappers for almost every backend domain (`next-frontend/src/services/`)

### Styling and themes

- Global CSS tokens live in `next-frontend/app/globals.css`.
- Student/teacher/admin shells intentionally use different visual language.
- `ThemeProvider` currently forces `DEFAULT_THEME` and exposes a no-op `setTheme`, which suggests theme switching is not fully live despite theme infrastructure existing (`next-frontend/src/providers/ThemeProvider.tsx`).

### API and session behavior

- Frontend uses a relative `/api` base URL and Next rewrites to backend origin (`next-frontend/src/lib/api-client.ts`, `next-frontend/next.config.ts`).
- `proxy.ts` handles public/protected cookie-gated routing before React boot (`next-frontend/proxy.ts`).
- Notification provider polls APIs, opens Socket.IO connection, tracks extraction notifications, and synthesizes student reminders (`next-frontend/src/providers/NotificationProvider.tsx`).

### Incomplete or notable web areas

- README is generic `create-next-app` boilerplate and does not describe the actual product (`next-frontend/README.md`).
- Theme switching infrastructure exists but behaves as stubbed/default-only in `ThemeProvider`.
- Repo audits mention stale performance smoke scripts and previously noisy test/lint environments (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md`).

## 10. Backend / Server State

### Server bootstrap

- Entry point: `backend/src/main.ts`
- Global prefix: `/api`
- Middleware: `helmet`, `cookie-parser`, JSON/urlencoded limits, CORS allowlist logic
- Global validation: `ValidationPipe` with whitelist, forbidNonWhitelisted, transform
- Global metrics interceptor and Winston logger
- Swagger only outside production

### Module graph

- Root module imports more than 20 feature modules including auth, classes, lessons, assessments, LXP, AI mentor, reports, analytics, notifications, class templates, discussion board, academic state (`backend/src/app.module.ts`).

### Persistence

- `DatabaseService` owns the pg pool and Drizzle DB instance (`backend/src/database/database.service.ts`).
- Drizzle schema exports are aggregated in `backend/src/drizzle/schema/index.ts`.
- Manual migration runner exists in `backend/run-migrations.js` and is used by Docker entrypoint.

### Error handling and monitoring

- `GlobalExceptionFilter` normalizes errors into `{ success: false, statusCode, message, ... }` envelopes (`backend/src/common/filters/global-exception.filter.ts`).
- Prometheus metrics are registered through a global module (`backend/src/monitoring/metrics.module.ts`).
- OpenTelemetry tracing is initialized at process startup (`backend/src/tracing.ts`).

### AI and external service integration

- AI requests are proxied through `AiProxyService` which forwards `X-User-*` headers and optional shared secret to the AI service (`backend/src/modules/ai-mentor/ai-proxy.service.ts`).
- Backend readiness checks treat AI degraded mode as allowed when `AI_DEGRADED_ALLOWED=true` (`backend/src/modules/health/health.service.ts`).

### Background and live features

- BullMQ is globally configured with Redis URL from config (`backend/src/app.module.ts`).
- Notifications use Socket.IO namespace `/notifications` with JWT handshake auth (`backend/src/modules/notifications/notifications.gateway.ts`).

## 11. Configuration and Environment

### Root / compose env

- `.env.compose.example` defines:
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST_PORT`
- `REDIS_HOST_PORT`
- `BACKEND_DATABASE_URL`
- `AI_DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `OTP_PEPPER`
- `AI_SERVICE_SHARED_SECRET`
- `GRAFANA_PORT`
- `PROMETHEUS_PORT`
- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `LOKI_PORT`
- `TEMPO_OTLP_HTTP_PORT`
- `TEMPO_PORT`
- `RUN_DB_MIGRATIONS`
- `RUN_DB_SEED`
- `FRONTEND_PORT`
- `AI_SERVICE_PORT`
- `OLLAMA_TEXT_MODEL`
- `OLLAMA_VISION_MODEL`
- `OLLAMA_EMBED_MODEL`

### Backend env vars

- `NODE_ENV`, `PORT`
- `DATABASE_URL`, `DB_POOL_MAX`, `DB_IDLE_TIMEOUT_MS`, `DB_CONNECT_TIMEOUT_MS`
- `REDIS_URL`
- `FRONTEND_URL`, `NEXT_FRONTEND_URL`, `MOBILE_URL`, `BACKEND_PUBLIC_URL`, `CORS_ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, `TRUST_PROXY_HOPS`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- `OTP_PEPPER`
- `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
- `OLLAMA_BASE_URL`, `OLLAMA_TEXT_MODEL`, `OLLAMA_VISION_MODEL`
- `AI_SERVICE_URL`, `AI_SERVICE_TIMEOUT_CHAT_MS`, `AI_SERVICE_TIMEOUT_EXTRACTION_MS`, `AI_SERVICE_SHARED_SECRET`, `AI_DEGRADED_ALLOWED`
- `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOKI_HOST`

### AI-service env vars

- `DATABASE_URL`
- `OLLAMA_BASE_URL`, `OLLAMA_TEXT_MODEL`, `OLLAMA_VISION_MODEL`, `OLLAMA_EMBED_MODEL`
- `OLLAMA_TIMEOUT_CHAT_S`, `OLLAMA_TIMEOUT_EXTRACTION_S`, `OLLAMA_KEEP_ALIVE`
- `UPLOAD_DIR`, `BACKEND_INTERNAL_URL`, `MAX_RAW_TEXT`, `LOG_LEVEL`
- `AI_SERVICE_SHARED_SECRET`, `AI_DEGRADED_ALLOWED`
- `AI_RUNTIME_MODE`, `AI_CLOUD_FALLBACK_ENABLED`, `AI_CLOUD_FALLBACK_BASE_URL`, `AI_CLOUD_FALLBACK_API_KEY`, `OPENROUTER_EMBEDDING_MODEL`

### Mobile env vars

- `EXPO_PUBLIC_API_URL`
- optional QA-only login seed vars in `mobile/.env.example`

### Config files

- Backend typed config: `backend/src/config/*.ts`
- Next rewrite/proxy config: `next-frontend/next.config.ts`, `next-frontend/proxy.ts`
- Docker Compose orchestration: `docker-compose.yml`
- Docker service images: `backend/Dockerfile`, `next-frontend/Dockerfile`, `ai-service/Dockerfile`
- CI/CD: `.github/workflows/*.yml`

## 12. Dependencies

### Backend dependencies that matter

- `@nestjs/*`: main app framework
- `drizzle-orm`, `drizzle-kit`, `pg`: schema and PostgreSQL access
- `bcrypt`: password hashing
- `passport-jwt`, `@nestjs/jwt`: JWT auth
- `bullmq`, `ioredis`, `@nestjs/bullmq`: job orchestration
- `socket.io`, `@nestjs/websockets`: live notifications
- `pdf-parse`, `exceljs`, `csv-parse`: content import/export
- `prom-client`, OpenTelemetry packages, `winston`, `winston-loki`: monitoring/logging/tracing

### Frontend dependencies that matter

- `next`, `react`, `react-dom`: web app core
- `axios`: HTTP client
- `@tanstack/react-query`: data fetching/caching
- `react-hook-form`, `zod`, `@hookform/resolvers`: forms and validation
- `socket.io-client`: live notifications
- `@react-pdf/renderer`: report/lesson PDF generation
- `@tiptap/*`: rich text editing
- `framer-motion`: landing/demo motion design

### Mobile dependencies that matter

- `expo`, `react-native`, `@react-navigation/*`: app runtime and navigation
- `@tanstack/react-query`: data access
- `expo-secure-store`, `@react-native-async-storage/async-storage`: session storage
- `nativewind`: styling
- `socket.io-client`: live updates

### AI-service dependencies that matter

- `fastapi`, `uvicorn`: HTTP service
- `sqlalchemy[asyncio]`, `asyncpg`: async DB access
- `pydantic`, `pydantic-settings`: config and request schema validation
- `pymupdf`, `python-pptx`: document ingestion
- `llama-index-core`: retrieval/indexing support
- `prometheus_client`: metrics export

### Suspicious / notable dependency situations

- The repo has separate lockfiles and no root workspace package, so dependency management is per-app rather than centrally coordinated.

## 13. Scripts and Commands

### Root

```bash
cp .env.compose.example .env.compose
docker compose --env-file .env.compose up --build
docker compose ps
docker compose logs -f backend
```

### Backend

```bash
cd backend
npm install
npm run start:dev
npm run start:dev:core
npm run build
npm run lint
npm run test
npm run test:e2e
npm run seed:smoke
node seed-database.js
node run-migrations.js
```

### Web frontend

```bash
cd next-frontend
npm install
npm run dev
npm run dev:smoke
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
npm run perf:auth-smoke
npm run perf:nav-smoke
npm run perf:discussion-smoke
npm run perf:engine-smoke
```

### AI service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
python scripts/run_tests.py
python scripts/run_eval_suite.py
```

### Mobile

```bash
cd mobile
npm install
npm run start
npm run android
npm run android:emulator
npm run ios
npm run web
npm run typecheck
npm run test
```

## 14. Current Known Issues

- `next-frontend/README.md` and `backend/README.md` are mostly starter boilerplate and do not match the actual product.
- Root README references `docs/NEXORA_AUDIT_2026-03-27.md`, but the file actually lives at `docs/system-audit/NEXORA_AUDIT_2026-03-27.md`.
- `ThemeProvider` is effectively stubbed to one default theme with `setTheme` as a no-op (`next-frontend/src/providers/ThemeProvider.tsx`).
- WebSocket notification gateway allows all origins instead of using a proper allowlist (`backend/src/modules/notifications/notifications.gateway.ts`).
- `BACKEND_SETUP.md` includes real-looking secrets and default credentials in documentation form.
- `ai-service/.env` is tracked in git and should be reviewed for secret leakage risk.
- Repo audits report stale smoke scripts around template engine and flaky discussion smoke coverage (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md`).
- Repo audits also report lingering backend ESLint debt and prior frontend worker-shutdown warnings.

## 15. Technical Debt

- Documentation drift is widespread across root README, backend README, frontend README, and historical audits.
- The repo recently consolidated multiple mobile tracks into `mobile/`, so stale guidance can still linger in audits or notes.
- Backend migrations include a very long history with manual extras and custom migration runner logic, which increases migration maintenance risk (`backend/run-migrations.js`, `backend/drizzle/`).
- Auth/session logic is split across cookie-based web and token-based mobile flows; correct but easy to regress without cross-client testing.
- Notification logic combines polling, socket updates, synthetic reminders, and extraction tracking in one provider, which is useful but complex (`next-frontend/src/providers/NotificationProvider.tsx`).
- AI route surface is large across backend and AI service, making proxy/header compatibility a maintenance hotspot.

## 16. Missing Features / Incomplete Areas

- Lesson versioning exists in schema and routes, but repo audits still call it the clearest remaining functional gap relative to some product/document wording (`backend/src/drizzle/schema/base.schema.ts`, `docs/system-audit/NEXORA_AUDIT_2026-03-27.md`).
- Some teacher AI job flows are only partially live-verified according to audits, even though code and tests exist (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md`).
- Theme switching appears architected but not fully implemented in current web runtime (`next-frontend/src/providers/ThemeProvider.tsx`).
- `otpPurposeEnum` reserves `login_2fa` for future use; 2FA is not implemented (`backend/src/drizzle/schema/otp.schema.ts`).

## 17. Recommended Next Steps

### Immediate Fixes

1. Remove or sanitize any tracked secret-bearing env files, especially `ai-service/.env`.
2. Tighten WebSocket CORS in `backend/src/modules/notifications/notifications.gateway.ts`.
3. Keep the canonical `mobile/` verification path green after the repo-path consolidation.
4. Update README files to match the real monorepo and correct broken doc links.

### Short-Term Improvements

1. Replace or remove stale smoke scripts and align them with current UI controls.
2. Clean backend ESLint debt enough to make lint a real regression gate.
3. Simplify or finish theme switching on web.
4. Audit public asset/raw upload routes and ensure intended exposure.

### Medium-Term Features

1. Finish live verification for teacher AI generation flows.
2. Continue hardening lesson versioning and recovery workflows.
3. Improve demo/seed content quality for student-facing routes before stakeholder demos.
4. Unify teacher/mobile parity documentation with the actual `mobile` implementation.

### Long-Term Improvements

1. Keep archived mobile assets out of the primary routing and verification paths.
2. Add stronger end-to-end contract tests across backend, frontend, mobile, and AI service.
3. Consider central workspace tooling if the repo keeps growing.
4. Split very large AI and notification orchestration surfaces into more focused subsystems if maintenance cost rises further.

## 18. Agent Notes for Future Work

- Treat this repo as a monorepo, not a backend-only project.
- The authoritative backend schema lives in `backend/src/drizzle/schema/`; verify schema before assuming table or field names from docs.
- Web auth and mobile auth are intentionally different. Do not “simplify” one into the other without tracing client impact.
- AI-service is internal. Frontend and mobile should continue to talk to backend, not directly to AI-service.
- Be careful around `backend/run-migrations.js`, `seed-database.js`, and Docker entrypoint behavior; they affect local/dev bootstrapping materially.
- For route or role changes, inspect all three layers: backend controller guard/decorator, frontend dashboard routing, and mobile navigator role resolution.
- Before changing mobile flows, confirm whether the task targets the canonical `mobile/` app or an archived artifact folder.
- Before claiming a bugfix on auth, AI proxying, or route gating, verify end-to-end behavior in the relevant client rather than only unit tests.

## 19. Unknown / Needs Confirmation

- Whether `ai-service/.env` contains real secrets or only local non-sensitive placeholders.
- Whether the Railway branch name `developement` is intentional or an accidental long-lived typo.
- Whether any archived mobile asset folders still matter for a real deployment target.
- Whether the current product still intends full theme switching on web or the theme system is intentionally frozen.
- Whether all public file/image/raw routes are intentionally public or partly historical convenience endpoints.

## 20. File-by-File Important Notes

### `README.md`

Purpose:
- Root monorepo guide and product overview.

Important details:
- Correctly describes major apps and Docker workflow.
- Contains a stale audit file path reference.

Connected to:
- `docker-compose.yml`
- `docs/system-audit/NEXORA_AUDIT_2026-03-27.md`

### `docker-compose.yml`

Purpose:
- Full local stack orchestration for Postgres, Redis, Ollama, backend, frontend, AI service, and monitoring.

Important details:
- Uses fail-fast required env vars.
- Shares backend uploads volume with AI service.

Connected to:
- `.env.compose.example`
- `backend/.env.docker`
- `ai-service/.env.docker`

### `.env.compose.example`

Purpose:
- Template for full-stack local runtime configuration.

Important details:
- Documents required DB URLs, JWT secrets, AI secret, and monitoring ports.

Connected to:
- `docker-compose.yml`

### `.github/workflows/ci.yml`

Purpose:
- Main CI pipeline.

Important details:
- Builds/tests backend, frontend, legacy `mobile/`, and AI service.
- Does not validate `mobile/`.

Connected to:
- `backend/package.json`
- `next-frontend/package.json`
- `mobile/package.json`
- `ai-service/requirements.txt`

### `.github/workflows/railway-deploy-developement.yml`

Purpose:
- Railway deployment automation.

Important details:
- Deploys backend, frontend, and AI service to Railway.
- Uses `developement` branch spelling.

Connected to:
- `backend/`
- `next-frontend/`
- `ai-service/`

### `backend/package.json`

Purpose:
- Backend scripts and dependency manifest.

Important details:
- Declares build/test/e2e/lint/seed-smoke commands.
- Shows BullMQ, Drizzle, Socket.IO, metrics, and tracing dependencies.

Connected to:
- `backend/src/main.ts`
- `backend/src/app.module.ts`

### `backend/src/main.ts`

Purpose:
- Backend bootstrap.

Important details:
- Configures logging, validation, CORS, Swagger, JSON size limits, `/api` prefix.

Connected to:
- `backend/src/app.module.ts`
- `backend/src/common/filters/global-exception.filter.ts`

### `backend/src/app.module.ts`

Purpose:
- Root Nest module and module graph.

Important details:
- Registers global guards and imports nearly all feature modules.

Connected to:
- `backend/src/modules/*`
- `backend/src/config/*.ts`

### `backend/src/database/database.service.ts`

Purpose:
- Owns PostgreSQL pool and Drizzle instance.

Important details:
- Performs connection sanity check on boot.

Connected to:
- `backend/src/drizzle/schema/index.ts`

### `backend/src/common/filters/global-exception.filter.ts`

Purpose:
- Global API error envelope normalization.

Important details:
- Special-cases file size and payload size failures.

Connected to:
- all backend controllers

### `backend/src/modules/auth/auth.controller.ts`

Purpose:
- Auth HTTP endpoints for web and mobile.

Important details:
- Owns cookie issuance/clearing and mobile token JSON routes.

Connected to:
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/auth/token.service.ts`
- `next-frontend/src/lib/auth-service.ts`
- `mobile/src/api/services/auth.ts`

### `backend/src/modules/auth/auth.service.ts`

Purpose:
- Auth business logic.

Important details:
- Validates status/verification/password and writes auth audit logs.

Connected to:
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/otp/otp.service.ts`

### `backend/src/modules/auth/token.service.ts`

Purpose:
- Refresh-token hashing, storage, rotation, reuse detection, and revocation.

Important details:
- Revokes all sessions on reuse detection.

Connected to:
- `backend/src/drizzle/schema/refresh-tokens.schema.ts`

### `backend/src/modules/health/health.service.ts`

Purpose:
- Backend readiness dependency checks.

Important details:
- Reads database, Redis, and AI-service health; supports degraded AI mode.

Connected to:
- `backend/src/database/database.service.ts`
- `ai-service/app/main.py`

### `backend/src/modules/ai-mentor/ai-proxy.service.ts`

Purpose:
- Safe proxy boundary between backend and AI service.

Important details:
- Adds forwarded user headers, timeouts, shared secret, and circuit breaker.

Connected to:
- `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- `ai-service/app/main.py`

### `backend/src/modules/notifications/notifications.gateway.ts`

Purpose:
- Socket.IO live notification gateway.

Important details:
- Authenticates handshake JWT and emits to `user:{id}` rooms.
- Currently allows all origins.

Connected to:
- `next-frontend/src/providers/NotificationProvider.tsx`

### `backend/src/drizzle/schema/base.schema.ts`

Purpose:
- Core LMS schema: users, sections, classes, lessons, assessments, modules, files, preferences, roster.

Important details:
- Largest schema file and main relation hub.

Connected to:
- most backend services and controllers

### `backend/src/drizzle/schema/lxp.schema.ts`

Purpose:
- LXP, interventions, system evaluations, teacher evaluations, class AI policy.

Important details:
- Central source for at-risk and learner-path persistence.

Connected to:
- `backend/src/modules/lxp/*`
- `backend/src/modules/performance/*`

### `backend/src/drizzle/schema/rag.schema.ts`

Purpose:
- Retrieval/indexing chunks, embeddings, AI job headers, outputs, mastery rows.

Important details:
- Uses `vector(768)` for embeddings.

Connected to:
- `ai-service/app/indexing_pipeline.py`
- `backend/src/modules/rag/*`

### `backend/drizzle.config.ts`

Purpose:
- Drizzle migration config.

Important details:
- Uses `DATABASE_URL` and writes migrations to `backend/drizzle/`.

Connected to:
- `backend/run-migrations.js`

### `backend/run-migrations.js`

Purpose:
- Custom migration runner.

Important details:
- Mixes journal-driven and extra SQL migration discovery.

Connected to:
- `backend/drizzle/`
- `backend/docker-entrypoint.sh`

### `backend/seed-database.js`

Purpose:
- Populate demo roles, users, sections, classes, and more.

Important details:
- Contains hardcoded demo credentials and school-year sample data.

Connected to:
- `backend/scripts/post-seed-smoke.js`

### `backend/docker-entrypoint.sh`

Purpose:
- Production container startup sequence.

Important details:
- Waits for DB, runs migrations, optionally seeds, then starts Nest.

Connected to:
- `backend/run-migrations.js`
- `backend/seed-database.js`

### `next-frontend/package.json`

Purpose:
- Web scripts and dependency manifest.

Important details:
- Includes dev smoke, perf smokes, Jest, and Playwright commands.

Connected to:
- `next-frontend/scripts/`

### `next-frontend/next.config.ts`

Purpose:
- Web build config and API rewrite config.

Important details:
- Rewrites `/api/*` to backend origin depending on env.

Connected to:
- `next-frontend/src/lib/api-client.ts`

### `next-frontend/proxy.ts`

Purpose:
- Pre-render public/protected route gating.

Important details:
- Uses presence of refresh cookie for high-level gating.

Connected to:
- `next-frontend/app/(dashboard)/layout.tsx`

### `next-frontend/app/layout.tsx`

Purpose:
- Root web layout and provider composition.

Important details:
- Mounts QueryProvider, ThemeProvider, AuthProvider, and toaster.

Connected to:
- `next-frontend/src/providers/*`

### `next-frontend/app/(dashboard)/layout.tsx`

Purpose:
- Protected dashboard shell.

Important details:
- Handles redirect-to-login/complete-profile, role mismatch logout, sidebar state, and notification/student launcher components.

Connected to:
- `next-frontend/src/providers/AuthProvider.tsx`
- `next-frontend/src/lib/dashboard-route-access.ts`

### `next-frontend/app/page.tsx`

Purpose:
- Public landing page.

Important details:
- Rich marketing-style page that redirects authenticated users.

Connected to:
- `next-frontend/src/providers/AuthProvider.tsx`

### `next-frontend/app/demo/page.tsx`

Purpose:
- Guided demo journey.

Important details:
- Simulates lesson, assessment, outcome, teacher plan, and LXP remediation flow.

Connected to:
- `next-frontend/src/lib/demo-engine.ts`
- `next-frontend/src/services/demo-ai-plan-service.ts`

### `next-frontend/src/providers/AuthProvider.tsx`

Purpose:
- Client-side auth bootstrap and role context.

Important details:
- Refreshes access token, fetches current user, and exposes status/loading helpers.

Connected to:
- `next-frontend/src/lib/session-refresh.ts`
- `next-frontend/src/lib/api-client.ts`

### `next-frontend/src/lib/api-client.ts`

Purpose:
- Axios client with in-memory access token and refresh retry logic.

Important details:
- Relies on `/api` rewrite and refresh cookie for web session continuity.

Connected to:
- `next-frontend/src/lib/session-refresh.ts`

### `next-frontend/src/providers/NotificationProvider.tsx`

Purpose:
- Live/polled notification orchestration and reminder synthesis.

Important details:
- One of the more complex frontend providers.

Connected to:
- `backend/src/modules/notifications/notifications.gateway.ts`

### `next-frontend/src/providers/ThemeProvider.tsx`

Purpose:
- Theme context and route-theme flags.

Important details:
- Currently fixed to default theme.

Connected to:
- `next-frontend/app/globals.css`

### `ai-service/app/main.py`

Purpose:
- FastAPI entrypoint and route registry.

Important details:
- Very large file containing health, tutor, JA, extraction, indexing, and teacher AI job endpoints.

Connected to:
- `backend/src/modules/ai-mentor/ai-proxy.service.ts`

### `ai-service/app/config.py`

Purpose:
- Env-backed AI settings.

Important details:
- Defines Ollama, cloud fallback, DB pool, and degraded-mode behavior.

Connected to:
- `ai-service/app/main.py`

### `ai-service/app/schemas.py`

Purpose:
- Pydantic request/response DTOs.

Important details:
- Covers chat, extraction, tutor, JA, quiz generation, lesson-plan generation, and draft update payloads.

Connected to:
- `ai-service/app/main.py`

### `ai-service/requirements.txt`

Purpose:
- AI-service dependency manifest.

Important details:
- Confirms FastAPI, SQLAlchemy async, LlamaIndex core, PyMuPDF, and metrics usage.

Connected to:
- `ai-service/Dockerfile`

### `mobile/App.tsx`

Purpose:
- Expo app entry.

Important details:
- Mounts `AppRoot` and global CSS.

Connected to:
- `mobile/src/bootstrap/AppRoot.tsx`

### `mobile/src/bootstrap/AppRoot.tsx`

Purpose:
- Provider + navigator composition.

Important details:
- Minimal but central mobile boot file.

Connected to:
- `mobile/src/providers/AppProviders.tsx`
- `mobile/src/navigation/AppNavigator.tsx`

### `mobile/src/navigation/AppNavigator.tsx`

Purpose:
- Main mobile route graph.

Important details:
- Student and teacher route trees coexist here.

Connected to:
- `mobile/src/providers/AuthProvider.tsx`

### `mobile/src/providers/AuthProvider.tsx`

Purpose:
- Mobile auth/session provider.

Important details:
- Bootstraps refresh from secure storage snapshot and repopulates current user.

Connected to:
- `mobile/src/api/client.ts`
- `mobile/src/api/services/auth.ts`

### `mobile/src/api/client.ts`

Purpose:
- Mobile axios clients and token refresh handling.

Important details:
- Uses `/auth/mobile/refresh` and secure token persistence.

Connected to:
- `mobile/src/api/storage.ts`

### `mobile/src/api/config.ts`

Purpose:
- Mobile API origin resolution.

Important details:
- Infers host from Expo runtime and falls back to Railway production origin outside dev.

Connected to:
- all mobile service wrappers

### `mobile/FEATURES_MODULES_LIST.txt`

Purpose:
- Human-generated inventory of mobile screens and modules.

Important details:
- Useful orientation doc because `mobile` has no README.

Connected to:
- `mobile/src/`

### `mobile/INTEGRATION_PLACEHOLDERS.md`

Purpose:
- Notes on visual derivations and placeholder mappings in mobile.

Important details:
- Documents where UI values are derived rather than directly backed by native API fields.

Connected to:
- `mobile/src/screens/*`
