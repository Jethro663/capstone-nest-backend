# Current Repository State

**Document Generated:** 2026-07-06  
**Repository Name:** `capstone-nest-backend` (Nexora LMS/LXP Monorepo)  
**Target Organization:** Gat Andres Bonifacio High School  

---

## 1. Executive Summary

### Project Identity & Purpose
Nexora is an enterprise-grade Learning Management System (LMS) and Learning Experience Platform (LXP) built specifically for Gat Andres Bonifacio High School (`README.md:L1-L4`). It combines core academic administration (rosters, classes, grading, schedules, lesson delivery, and guided assessments) with an assistive, AI-driven learning experience layer (AI tutoring, dynamic quiz generation, lesson plan drafting, and threshold-based remedial interventions).

### Current Maturity Level
The project is at a **late-stage prototype / near-production release candidate** level (`docs/system-audit/NEXORA_AUDIT_2026-03-27.md:L5-L13`). Unlike early scaffolding or MVP prototypes, all primary LMS and LXP product surfaces are fully implemented in code rather than placeholder shells. Cross-platform verification suites (builds, unit tests, and typechecks) are green across all four core applications (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L10-L15`).

### Main Technology Stack
*   **Backend API:** NestJS 11 + Drizzle ORM + PostgreSQL 16 + Redis + BullMQ (`backend/package.json`, `backend/src/main.ts`)
*   **Web Client:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Radix UI (`next-frontend/package.json`)
*   **AI Microservice:** FastAPI + SQLAlchemy/asyncpg + LlamaIndex + PyMuPDF + Ollama / OpenRouter (`ai-service/requirements.txt`, `ai-service/app/main.py`)
*   **Mobile App:** Expo SDK 54 / React Native 0.81.5 + NativeWind v4 (`mobile/package.json`)
*   **DevOps & Observability:** Docker Compose + Prometheus + Loki + Tempo + Grafana (`docker-compose.yml`, `monitoring/`)

### Production Readiness vs. Active Development
The repository is in **active development and verification stabilization** (`docs/state/CURRENT_REPO_STATE 6-17.md:L16-L17`). The core functional requirements for an educational institution are present and tested. Remaining work consists of documentation alignment, resolving legacy ESLint/formatting debt, hardening UI performance smoke scripts against DOM label drift, and preparing for multi-instance cloud deployment (such as Azure or Railway).

---

## 2. Repository Structure

### High-Level Tree Overview
```txt
/home/jethro/Documents/Projects/capstone-nest-backend/
├── .agents/                        # Repo-specific agent instructions and skill routers
├── .github/                        # CI/CD workflows and Copilot instructions
│   └── workflows/                  # Automated build, docker publish, and Railway deploy YAMLs
├── .idea/                          # IDE configuration files
├── .orchestration/                 # Local AI coding assistant task orchestration logs
├── .serena/                        # Serena semantic analysis cache and project indexing
├── ai-service/                     # Python FastAPI AI microservice
│   ├── app/                        # Core AI service pipelines, routers, and DB models
│   ├── evals/                      # AI model evaluation scripts and data sets
│   ├── scripts/                    # Test runners and standalone AI utility scripts
│   └── tests/                      # Python unit and integration test suite
├── artifacts/                      # System-generated test outputs, screenshots, and logs
├── backend/                        # NestJS 11 core backend API and orchestration server
│   ├── drizzle/                    # SQL migration files (0000 to 0086)
│   ├── scripts/                    # Database seeding, verification, and smoke scripts
│   ├── src/                        # NestJS application source code
│   │   ├── common/                 # Schedulers, guards, pipes, circuit breakers, and loggers
│   │   ├── config/                 # Environment and configuration modules
│   │   ├── database/               # Database connection and helper service
│   │   ├── drizzle/                # Drizzle ORM module and schema definitions
│   │   └── modules/                # 32 feature domain modules (auth, classes, lessons, etc.)
│   └── test/                       # End-to-end (e2e) Jest test configurations and suites
├── docs/                           # Extensive technical documentation and system audits
│   ├── architecture/               # System architecture and workflow diagrams
│   ├── deployment/                 # Deployment guides for cloud and local containers
│   ├── state/                      # Historical repository state and milestone documentation
│   └── system-audit/               # Detailed verification audits and progress crosschecks
├── mobile/                         # Expo / React Native mobile client (student target)
│   ├── android/                    # Android native project wrapper
│   ├── assets/                     # App icons, splash screens, and fonts
│   └── src/                        # Screens, navigation, theme, providers, and API clients
├── monitoring/                     # Observability stack provisioning (Grafana, Prometheus, Loki)
├── next-frontend/                  # Next.js 16 web application (App Router)
│   ├── app/                        # Route layouts, pages, and role groups (admin, teacher, student)
│   ├── public/                     # Static assets, branding images, and icons
│   ├── scripts/                    # Performance smoke test scripts and standalone runners
│   ├── src/                        # Reusable React components, hooks, providers, and API clients
│   └── tests/                      # Playwright end-to-end (E2E) test specs and helpers
├── stitch_crimson_mobile_lms/      # Static HTML and UI template exports from design mockups
├── AGENTS.md                       # Authoritative routing rules and coding guidelines for AI agents
├── README.md                       # Main project documentation and onboarding guide
└── docker-compose.yml              # Root Docker Compose file defining full-stack local infrastructure
```

### Subsystem Roles & File Organization
*   **`backend/`**: Serves as the system authority for authentication, Role-Based Access Control (RBAC), academic records, and API contracts (`README.md:L42`). Important files include `src/main.ts` (bootstrap, CORS, Helmet, pipes), `src/app.module.ts` (root module and BullMQ configuration), and `drizzle.config.ts` (ORM schema definitions).
*   **`next-frontend/`**: Delivers the web browser interface for admins, teachers, and students (`README.md:L31`). Organized using Next.js App Router route groups (`app/(dashboard)/dashboard/admin`, `teacher`, `student`). Key files include `src/lib/api-client.ts` (Axios wrapper with JWT refresh rotation) and `src/lib/api-origin.ts` (environment-aware URL resolution).
*   **`ai-service/`**: Houses asynchronous AI pipelines for extraction, RAG indexing, lesson plan drafting, quiz generation, and AI mentor tutoring (`README.md:L32`). Key files include `app/main.py` (FastAPI initialization and endpoints), `app/config.py` (model and runtime settings), and `app/indexing_pipeline.py` (vector embeddings).
*   **`mobile/`**: Standalone React Native app targeting the student mobile LMS experience (`README.md:L33`). Important files include `App.tsx` (entry point) and `src/api/client.ts` (mobile HTTP API wrapper).
*   **`monitoring/`**: Contains Prometheus rules, Loki log transport configuration, Tempo trace settings, and pre-provisioned Grafana dashboards (`docker-compose.yml:L1-L100`).

### Unused, Duplicated, or Misplaced Items
*   **`stitch_crimson_mobile_lms/`**: Contains HTML templates and design mockup exports (`course_content_modern_academic/`, `dashboard_modern_academic/`). This directory is not imported or executed by any active runtime; it serves strictly as a static design reference (`docs/state/CURRENT_REPO_STATE 6-17.md:L1660-L1670`).
*   **`.agents/`, `.serena/`, `.orchestration/`**: Tool-specific cache and configuration folders for local agentic workflows. While essential for development assistants, they are not part of the deployed application stack.

---

## 3. Technology Stack

### Programming Languages
*   **TypeScript (v5.x):** Used across `backend/`, `next-frontend/`, and `mobile/` (`backend/package.json:L103`, `next-frontend/package.json:L79`, `mobile/package.json:L59`).
*   **Python (v3.11+ / 3.12):** Used in `ai-service/` (`ai-service/requirements.txt:L1`, `ai-service/Dockerfile:L1`).
*   **JavaScript (ES6+):** Used for Node.js build, seeding, and verification scripts (`backend/seed-database.js`, `next-frontend/scripts/`).

### Frameworks & Runtimes
*   **Backend Framework:** NestJS v11.0.1 (`backend/package.json:L27`).
*   **Web Framework:** Next.js v16.2.4 with React v19.2.3 (`next-frontend/package.json:L55-L56`).
*   **AI Microservice Framework:** FastAPI v0.115.0+ running on Uvicorn v0.32.0+ (`ai-service/requirements.txt:L1-L2`).
*   **Mobile Framework:** Expo SDK v54.0.0 with React Native v0.81.5 (`mobile/package.json:L27`, `L41`).
*   **Runtime Engines:** Node.js v20+ (recommended for workspace tooling, enforced in Dockerfiles) and Python 3.12 (`README.md:L51-L53`, `backend/Dockerfile:L1`).

### Libraries, ORMs & Data Tools
*   **Database & Vector Storage:** PostgreSQL 16+ with `pgvector` extension for vector search (`docker-compose.yml`, `backend/drizzle/0049_add_rag_pgvector.sql`).
*   **Relational ORM:** Drizzle ORM v0.45.1 with Drizzle Kit v0.31.8 (`backend/package.json:L53`, `L90`).
*   **Python ORM / Async Database:** SQLAlchemy v2.0.36+ with `asyncpg` v0.30.0+ (`ai-service/requirements.txt:L4-L5`).
*   **AI / RAG Frameworks:** LlamaIndex Core v0.12.0+, PyMuPDF v1.25.0+, `python-pptx` v1.0.2+ (`ai-service/requirements.txt:L8-L11`).
*   **Job Queue & Caching:** BullMQ v5.70.1 + `ioredis` v5.9.3 (`backend/package.json:L48`, `L56`).
*   **Real-time Communication:** Socket.IO v4.8.3 (`backend/package.json:L66`, `next-frontend/package.json:L60`, `mobile/package.json:L49`).

### Authentication & Security
*   **Authentication Core:** Passport.js v0.7.0 with `@nestjs/jwt` v11.0.2 and `passport-jwt` v4.0.1 (`backend/package.json:L31-L33`, `L58-L59`).
*   **Password & OTP Security:** `bcrypt` v6.0.0 for password hashing; peppered HMAC hashing for OTP verification (`backend/package.json:L47`, `backend/src/modules/otp/otp.service.ts`).
*   **HTTP Security:** Helmet v8.1.0, CORS enforcement, and `@nestjs/throttler` v6.5.0 rate limiting (`backend/package.json:L38`, `L55`).

### UI Libraries & Styling Systems
*   **Web Styling:** Tailwind CSS v4.0 with `@tailwindcss/postcss` and `clsx` / `tailwind-merge` (`next-frontend/package.json:L48`, `L62`, `L67`).
*   **Web UI Primitives:** Radix UI headless components (Dialog, Dropdown, Navigation, Select, Tabs, Tooltip) and Lucide React v0.487.0 icons (`next-frontend/package.json:L26-L37`, `L54`).
*   **Rich Text Editor:** TipTap v3.21.0 (Starter Kit, Link, Placeholder, Underline) (`next-frontend/package.json:L41-L45`).
*   **Mobile Styling:** NativeWind v4.2.1 and Tailwind CSS v3.4.17 (`mobile/package.json:L38`, `L57`).
*   **Animations:** Framer Motion v12.33.0 (`next-frontend/package.json:L51`) and React Native Reanimated v4.1.6 (`mobile/package.json:L43`).

### Testing & Quality Assurance
*   **Backend Testing:** Jest v30.0.0 with `ts-jest` and Supertest v7.0.0 (`backend/package.json:L95`, `L98-L99`).
*   **Frontend Testing:** Jest v30.2.0 with React Testing Library v16.3.0 and Playwright v1.58.2 for E2E automation (`next-frontend/package.json:L66-L69`, `L76`).
*   **AI Service Testing:** Python standard `unittest` suite executed via custom runner (`ai-service/scripts/run_tests.py`).
*   **Mobile Testing:** Jest v30.3.0 with `react-test-renderer` v19.1.0 (`mobile/package.json:L55-L56`).

### DevOps, Build & DevOps Tools
*   **Containerization:** Docker Desktop, Docker Compose (multi-stage builds in `Dockerfile` across services) (`docker-compose.yml`).
*   **Observability Stack:** Prometheus, Loki, Tempo, Promtail, Grafana, Node Exporter, cAdvisor, Blackbox Exporter (`docker-compose.yml`, `monitoring/`).
*   **OpenTelemetry:** `@opentelemetry/sdk-node` v0.213.0 and auto-instrumentations for Node (`backend/package.json:L40-L45`).
*   **Package Managers:** `npm` v10+ (for Node.js workspaces) and `pip` / `venv` (for Python).

### Configured but Unused Technologies
*   **Ollama Local Fallback:** Configured in `docker-compose.yml:L32-L34` and `ai-service/app/config.py`, but production environments (such as Railway or Azure) are configured to use cloud OpenRouter as the primary AI runtime (`AI_RUNTIME_MODE=cloud`). Local Ollama serves as an optional dev-only offline fallback (`README.md:L249-L250`).
*   **NativeWind in Mobile:** `nativewind` is installed in `mobile/package.json:L38`, but several screens and components continue to use standard React Native `StyleSheet.create` alongside utility classes.

---

## 4. Application Architecture

### Architectural Pattern
Nexora follows a **layered, modular, microservice-assisted monorepo architecture** (`README.md:L40-L46`).
1.  **Client Layer:** Independent web (`next-frontend`) and mobile (`mobile`) applications presented to specific end-user roles.
2.  **API Gateway / Core Service Layer (`backend`):** A monolithic NestJS server organized into domain feature modules that handles authentication, authorization, business logic, DB transactions, and API contracts.
3.  **Assistive Microservice Layer (`ai-service`):** An internal FastAPI service dedicated to CPU/GPU-heavy tasks (document extraction, vector chunking, LLM generation, and RAG).

```
[Web Client (Next.js)]       [Mobile Client (Expo)]
        │                              │
        └──────────────┬───────────────┘
                       │ (REST / JSON / JWT / Cookie / Socket.IO)
                       ▼
      [Backend API Gateway (NestJS 11)]
       (Auth, RBAC, Core LMS Records, Drizzle ORM)
        │                              │
        │ (PostgreSQL / Drizzle)       │ (Internal REST / Shared Secret)
        ▼                              ▼
 [PostgreSQL 16 DB] <──────── [AI Service (FastAPI)]
 (Core Tables + pgvector)      (LlamaIndex, PyMuPDF, OpenRouter / Ollama)
        ▲                              ▲
        │                              │
        └────────── [Redis 7] ─────────┘
            (BullMQ Job Queues & Caching)
```

### Frontend Architecture
*   **Route Organization:** Built around Next.js App Router route groups (`app/(auth)/login`, `app/(dashboard)/dashboard/admin`, `app/(dashboard)/dashboard/teacher`, `app/(dashboard)/dashboard/student`).
*   **Data Fetching & Caching:** Uses TanStack React Query (`@tanstack/react-query`) wrapped in `QueryProvider.tsx` (`next-frontend/src/providers/QueryProvider.tsx`). Server API calls use a centralized Axios client (`api-client.ts`) that intercepts 401 responses and triggers silent JWT refresh rotation.
*   **Real-Time Integration:** A global Socket.IO provider (`NotificationProvider.tsx`) establishes a persistent WebSocket connection to the backend gateway to receive live announcements and notification badges (`next-frontend/src/providers/NotificationProvider.tsx`).

### Backend Architecture
*   **Layered Design:** Strictly follows the standard NestJS layered architecture: Controllers handle HTTP request/response validation, Services execute business logic, and Drizzle ORM schemas execute database queries (`backend/src/modules/`).
*   **System Authority:** The backend is the single source of truth for user identities, role assignments, enrollment records, class rosters, and gradebook computations (`README.md:L42`).
*   **Asynchronous Processing:** Long-running operations (such as AI lesson plan drafting, quiz generation, discussion thread summarization, and CSV roster parsing) are offloaded to Redis-backed BullMQ queues (`@nestjs/bullmq` in `backend/src/app.module.ts:L45-L55`). Dedicated background processors (`backend/src/modules/notifications/processors/`, `backend/src/modules/discussion-board/discussion-board.processor.ts`) process jobs asynchronously and push status updates via WebSockets.

### AI Proxying & Microservice Boundary
A critical security and architectural design in Nexora is that **client applications NEVER communicate directly with `ai-service`** (`README.md:L43`, `backend/AI_MENTOR_README.md`).
*   All client AI requests target backend proxy endpoints (e.g., `POST /api/ai/student/ja/practice/sessions/generate`, `POST /api/teacher/lesson-plans/jobs`).
*   The NestJS backend authenticates the request, validates RBAC and rate limits, logs audit metadata, and forwards the payload to `http://localhost:8000` (or internal container URL) attaching an internal authentication header (`X-Internal-Service-Token: AI_SERVICE_SHARED_SECRET`).
*   The FastAPI microservice validates this shared secret, processes the request via OpenRouter or Ollama, and returns structured JSON or writes vector chunks directly to the shared PostgreSQL database.

### Database & Storage Architecture
*   **Single Database Instance:** Both `backend` and `ai-service` connect to the exact same PostgreSQL 16 database (`capstone` database defined in `docker-compose.yml:L11-L12`).
*   **Separation of Schema Ownership:** Drizzle ORM (`backend`) owns all relational LMS tables (users, classes, enrollments, assessments, submissions, grades). The AI service uses SQLAlchemy and `asyncpg` to access read-only LMS tables for RAG context and writes directly to vector search tables (`rag_chunks`, `library_files`) using `pgvector` (`ai-service/app/database.py`).
*   **File Uploads:** Uploaded documents (PDFs, course images, assessment attachments) are handled via local filesystem volume mounts (`/app/uploads`), shared between backend and AI containers in Docker Compose (`docker-compose.yml:L35-L40`, `backend/src/modules/file-upload/`).

---

## 5. Main Features Implemented

| Feature Name | What It Does | Relevant Files / Folders | Completion State | Known Limitations / Missing Pieces |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | Handles email/password login, JWT access/refresh tokens, peppered OTP verification, password recovery, and role-based route protection (`admin`, `teacher`, `student`). | `backend/src/modules/auth/`<br>`backend/src/modules/otp/`<br>`next-frontend/src/providers/AuthProvider.tsx` | Complete | None. Functional across web cookies and mobile JSON payloads. |
| **User & Roster Management** | Admin creation of student/teacher accounts, Excel/CSV batch roster imports with validation, profile picture management, and account archival. | `backend/src/modules/users/`<br>`backend/src/modules/roster-import/`<br>`backend/src/modules/profiles/` | Complete | Batch import requires strict CSV header matching as defined in sample templates. |
| **Class & Section Management** | Creation of academic sections, course classes, teacher-class assignments, student enrollment mapping, and scheduling. | `backend/src/modules/classes/`<br>`backend/src/modules/sections/`<br>`next-frontend/app/(dashboard)/dashboard/admin/sections/` | Complete | None. Covers full academic structure management. |
| **Class Templates & Curriculum Engine** | Allows admins to build standardized course templates (modules, lessons, assessments) and publish/copy them across multiple teacher classes. | `backend/src/modules/class-templates/`<br>`next-frontend/app/(dashboard)/dashboard/admin/class-templates/` | Complete | UI labels in performance smoke tests need periodic alignment with template workspace controls. |
| **Lesson Plan Builder & Reader** | Teacher creation of structured lesson content using rich text, embedded media blocks, and modular sequences; student interactive reading view. | `backend/src/modules/lessons/`<br>`backend/src/modules/content-modules/`<br>`next-frontend/src/components/teacher/lessons/` | Complete (Minor Gap) | Core creation and reading work; historical diffing/version restoration UI is still minimal (`README.md:L334`). |
| **Assessment Engine & Strict Mode** | Guided and strict mode quiz/exam delivery, timer tracking, rubric grading, question randomization, auto-grading for objective items, and file upload submissions. | `backend/src/modules/assessments/`<br>`backend/src/modules/class-record/`<br>`next-frontend/src/components/student/assessments/` | Complete | File upload assessment mode stores files locally; requires cloud object storage for multi-server scaling. |
| **Class Records & Gradebook** | Automatic grade aggregation, rubric score computation, performance tracking across assessment types, and teacher gradebook export. | `backend/src/modules/class-record/`<br>`next-frontend/app/(dashboard)/dashboard/teacher/class-record/` | Complete | None. Integrates seamlessly with completed student assessment attempts. |
| **AI Mentor & Student Tutoring** | Context-aware AI NPC tutor for students offering interactive explanations, guided remediation, and teacher-directed intervention recommendations. | `backend/src/modules/ai-mentor/`<br>`ai-service/app/student_tutor_service.py`<br>`next-frontend/src/components/student/ai-mentor/` | Complete | Teacher-controlled AI policy scope works in code but needs stronger surfacing in UX/docs (`README.md:L335`). |
| **Junior Achievement (JA) Hub** | Specialized workplace readiness training modules: JA Practice (interactive scenarios), JA Ask (career Q&A), and JA Review (knowledge checks). | `backend/src/modules/ja/`<br>`ai-service/app/ja_practice_service.py`<br>`next-frontend/app/(dashboard)/dashboard/student/lxp/` | Complete | Fully integrated into the student Learning Experience Platform (LXP) tab. |
| **Automated AI Job Generation** | BullMQ background jobs allowing teachers to auto-generate draft lesson plans and quizzes from library documents, with human-in-the-loop draft review before publishing. | `backend/src/modules/ai-mentor/`<br>`ai-service/app/lesson_plan_service.py`<br>`ai-service/app/quiz_generation_service.py` | Complete | Heavy extraction jobs can take several minutes on CPU-only local Ollama setups. |
| **RAG & Library Indexing** | Ingestion of teacher/admin PDF/PPTX curriculum assets, text chunking, embedding generation (nomic-embed-text / OpenRouter), and vector similarity search. | `backend/src/modules/rag/`<br>`ai-service/app/indexing_pipeline.py`<br>`ai-service/app/retrieval_service.py` | Complete | Requires PostgreSQL `pgvector` extension enabled in the target database. |
| **Discussion Boards & Notifications** | Class discussion threads with AI summarization, real-time Socket.IO notification fan-out, and class announcements. | `backend/src/modules/discussion-board/`<br>`backend/src/modules/notifications/`<br>`next-frontend/src/providers/NotificationProvider.tsx` | Complete | None. Real-time updates verified across web clients. |
| **Performance Tracking & Remedial LXP** | Threshold-based learning gap detection (e.g., scores `< 74%` trigger remediation), automated intervention case tracking, and remedial AI content delivery. | `backend/src/modules/performance/`<br>`backend/src/modules/lxp/`<br>`ai-service/app/remedial_service.py` | Complete | Aligned with updated school threshold rules (`74%` passing baseline). |
| **System Evaluation Campaigns** | Built-in questionnaires and evaluation campaigns allowing administrators to collect feedback from teachers and students on platform effectiveness. | `backend/src/modules/audit/`<br>`backend/src/modules/reports/`<br>`next-frontend/app/(dashboard)/dashboard/admin/evaluations/` | Complete | None. Complete with admin reporting and export tables. |

---

## 6. API Endpoints

The NestJS backend registers **33 feature module controllers** (`backend/src/modules/`). The table below outlines representative discoverable endpoints across core domains:

| Method | Route | Purpose | Auth Required | Request Body | Response | Source File |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user via email/password; set refresh cookie. | No | `{ email, password }` | `{ accessToken, user: { id, role, email } }` | `backend/src/modules/auth/auth.controller.ts:L55` |
| `POST` | `/api/auth/mobile/login` | Authenticate mobile client; return JSON tokens. | No | `{ email, password }` | `{ accessToken, refreshToken, user }` | `backend/src/modules/auth/auth.controller.mobile.ts:L30` |
| `POST` | `/api/auth/refresh` | Rotate JWT access and refresh tokens via httpOnly cookie. | Yes (Cookie) | None | `{ accessToken }` + Cookie update | `backend/src/modules/auth/auth.controller.ts:L90` |
| `POST` | `/api/auth/logout` | Invalidate current refresh token and clear cookie. | Yes (JWT) | None | `{ success: true }` | `backend/src/modules/auth/auth.controller.ts:L115` |
| `GET` | `/api/users` | List system users with filtering and pagination. | Yes (`admin`) | None | `{ data: User[], total, page }` | `backend/src/modules/users/users.controller.ts:L40` |
| `POST` | `/api/roster-import/upload` | Upload Excel/CSV spreadsheet for batch student/teacher import. | Yes (`admin`) | `Multipart (file)` | `{ jobId, totalRows, validRows, errors }` | `backend/src/modules/roster-import/roster-import.controller.ts:L74` |
| `GET` | `/api/classes` | Get classes assigned to teacher or enrolled by student. | Yes (All roles) | None | `ClassDTO[]` | `backend/src/modules/classes/classes.controller.ts:L70` |
| `POST` | `/api/classes` | Create a new academic class section under a teacher. | Yes (`admin`, `teacher`) | `{ name, sectionId, subject, teacherId }` | `ClassDTO` | `backend/src/modules/classes/classes.controller.ts:L95` |
| `GET` | `/api/class-templates` | List administrative curriculum class templates. | Yes (`admin`, `teacher`) | None | `ClassTemplateDTO[]` | `backend/src/modules/class-templates/class-templates.controller.ts:L62` |
| `POST` | `/api/lessons` | Create a new curriculum lesson within a class module. | Yes (`teacher`) | `{ title, moduleId, contentBlocks, order }` | `LessonDTO` | `backend/src/modules/lessons/lessons.controller.ts:L34` |
| `GET` | `/api/assessments/:id` | Fetch assessment details, instructions, and timer settings. | Yes (All roles) | None | `AssessmentDTO` | `backend/src/modules/assessments/assessments.controller.ts:L91` |
| `POST` | `/api/assessments/:id/attempts` | Start a student attempt for an assessment (enforces strict mode). | Yes (`student`) | None | `{ attemptId, startTime, questions }` | `backend/src/modules/assessments/assessments.controller.ts:L140` |
| `POST` | `/api/assessments/attempts/:id/submit` | Submit finalized assessment answers for grading. | Yes (`student`) | `{ answers: Record<string, any> }` | `{ attemptId, score, maxScore, status }` | `backend/src/modules/assessments/assessments.controller.ts:L185` |
| `GET` | `/api/class-record/classes/:classId` | Retrieve aggregated gradebook and class records for a class. | Yes (`teacher`) | None | `ClassRecordSummaryDTO` | `backend/src/modules/class-record/class-record.controller.ts:L22` |
| `POST` | `/api/ai/teacher/lesson-plans/jobs` | Trigger async BullMQ AI job to generate a draft lesson plan. | Yes (`teacher`) | `{ classId, topic, prompt, libraryFileIds }` | `{ jobId, status: "queued" }` | `backend/src/modules/ai-mentor/ai-mentor.controller.ts:L84` |
| `POST` | `/api/ai/teacher/quizzes/jobs` | Trigger async BullMQ AI job to generate a draft quiz from docs. | Yes (`teacher`) | `{ classId, numQuestions, difficulty, fileIds }` | `{ jobId, status: "queued" }` | `backend/src/modules/ai-mentor/ai-mentor.controller.ts:L110` |
| `POST` | `/api/ai/student/tutor/session` | Start an AI NPC mentoring/tutoring session for a student. | Yes (`student`) | `{ lessonId, topic, context }` | `{ sessionId, greeting, aiMessage }` | `backend/src/modules/ai-mentor/ai-mentor.controller.ts:L145` |
| `POST` | `/api/ai/student/ja/practice/sessions/generate` | Generate interactive Junior Achievement practice scenario. | Yes (`student`) | `{ moduleType, difficulty, background }` | `{ sessionId, scenarioText, options }` | `backend/src/modules/ja/ja.controller.ts:L28` |
| `GET` | `/api/notifications` | Get paginated real-time notification feed for logged-in user. | Yes (All roles) | None | `{ notifications: Notification[], unreadCount }` | `backend/src/modules/notifications/notifications.controller.ts:L29` |
| `GET` | `/api/health/ready` | Probe system readiness (checks Postgres and Redis connections). | No | None | `{ status: "ok", db: true, redis: true }` | `backend/src/modules/health/health.controller.ts:L7` |

---

## 7. Database and Data Models

### Database & ORM Setup
*   **Engine:** PostgreSQL 16 configured in `docker-compose.yml:L11-L25` with persistent volume `postgres_data`.
*   **Extensions:** Utilizes `pgvector` for vector similarity search and RAG embedding storage (`backend/drizzle/0049_add_rag_pgvector.sql`).
*   **Relational ORM:** Drizzle ORM (`drizzle-orm` v0.45.1) configured in `backend/drizzle.config.ts`.
*   **Vector Query Engine:** SQLAlchemy v2.0+ with `asyncpg` in `ai-service/app/database.py` for direct vector chunk queries.

### Schema Files & Core Entities
All Drizzle schemas are defined under `backend/src/drizzle/schema/`:
1.  **`base.schema.ts`**: Defines foundational entities: `users` (email, password hash, role, status), `roles`, `student_profiles` (LRN, grade level, section), `teacher_profiles` (employee ID, department), `classes`, `sections`, `enrollments`, `subjects`, and `audit_logs`.
2.  **`class-templates.schema.ts`**: Defines `class_templates`, `template_modules`, and `template_lessons` for administrative curriculum cloning.
3.  **`class-record.schema.ts`**: Defines `class_records`, `gradebook_columns`, and `student_grades` for academic performance tracking.
4.  **`ai-mentor.schema.ts`**: Defines `ai_chat_sessions`, `ai_chat_messages`, `ai_generation_jobs`, and teacher AI intervention policies.
5.  **`lxp.schema.ts`**: Defines LXP remedial modules, intervention tracking cases, and student learning path milestones.
6.  **`ja.schema.ts`**: Defines Junior Achievement practice sessions, Ask responses, and Review scores.
7.  **`rag.schema.ts`**: Defines `library_files`, `rag_chunks` (containing `vector(768)` embedding columns), and document ingestion statuses.
8.  **`discussion-board.schema.ts`**: Defines `discussion_threads`, `discussion_posts`, and AI thread summary analytics.
9.  **`announcements-notifications.schema.ts`**: Defines `announcements`, `notifications`, and broadcast target mappings.
10. **`otp.schema.ts`**: Defines peppered OTP hashes, expiration timestamps, and usage tracking.
11. **`performance.schema.ts`**: Defines learning gap analytics and historical performance evaluation snapshots.
12. **`refresh-tokens.schema.ts`**: Defines secure hashed refresh token storage, user device mapping, and revocation flags.
13. **`school-events.schema.ts`**: Defines academic calendar events, holidays, and examination schedules.
14. **`academic-state.schema.ts`**: Tracks global school year terms, grading quarters, and system lock states.

### Entity Relationships Overview
```
[roles] 1 ──< [users] >── 1 [student_profiles] / [teacher_profiles]
                 │
                 ├──< [enrollments] >── 1 [classes] ──> 1 [sections]
                 │                          │
                 ├──< [ai_chat_sessions]    ├──< [content_modules] ──< [lessons]
                 │                          │
                 └──< [assessment_attempts] ├──< [assessments] ──< [questions]
                                            │
                                            └──< [class_records]
```

### Migrations & Seeding
*   **Migration History:** Located in `backend/drizzle/`, containing **86 sequential SQL migration files** (`0000_naive_doctor_spectrum.sql` through `0086_add_assessments_class_id_index.sql`). Migrations are applied via `npx drizzle-kit push:pg` or `node run-migrations.js` (`backend/package.json:L199-L200`).
*   **Database Seeding:** Executed via `node seed-database.js` (`README.md:L203`, `backend/seed-database.js`). This script populates test accounts (admin, teacher, student), sample classes, curriculum templates, library files, and baseline grading records.
*   **Smoke Verification:** A post-seed verification script (`node scripts/post-seed-smoke.js` / `npm run seed:smoke` in `backend/package.json:L17`) runs automated assertions against the database to confirm data integrity and intervention state alignment (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L34-L35`).

### Validation & Constraints
*   Primary keys universally use **UUIDv4** across all schemas (`uuid` extension in PostgreSQL).
*   Enforces strict foreign key cascading where appropriate (e.g., deleting an assessment cascades to attempts and question items).
*   Unique constraints enforce email uniqueness on `users`, LRN uniqueness on `student_profiles`, and employee ID uniqueness on `teacher_profiles`.
*   JSONB columns store structured dynamic data, such as TipTap lesson content blocks and assessment question choices.

---

## 8. Environment Variables and Configuration

The repository defines configuration requirements across four primary `.env.example` templates (`README.md:L306-L321`). Docker Compose is configured to **fail fast** if required variables are omitted (`README.md:L139-L147`).

### Environment Variable Reference Table

| Variable | Required? | Purpose | Default / Example Value | Source File |
| :--- | :--- | :--- | :--- | :--- |
| `POSTGRES_PASSWORD` | **Yes** | Bootstrap password for PostgreSQL container volume initialization. | `NexoraDbPassword123!` | `.env.compose.example:L5` |
| `BACKEND_DATABASE_URL` | **Yes** | Connection string for NestJS Drizzle ORM (must URL-encode special chars). | `postgresql://postgres:NexoraDbPassword123%21@postgres:5432/capstone` | `.env.compose.example:L11` |
| `AI_DATABASE_URL` | **Yes** | Async connection string for FastAPI SQLAlchemy / asyncpg vector engine. | `postgresql+asyncpg://postgres:NexoraDbPassword123%21@postgres:5432/capstone` | `.env.compose.example:L12` |
| `JWT_SECRET` | **Yes** | Secret key for signing short-lived JWT access tokens (min 32 chars). | `CHANGE_ME_AT_LEAST_32_CHARS_LONG_SECRET_01` | `.env.compose.example:L15` |
| `JWT_REFRESH_SECRET` | **Yes** | Secret key for signing rotating refresh tokens (min 32 chars). | `CHANGE_ME_AT_LEAST_32_CHARS_LONG_SECRET_02` | `.env.compose.example:L16` |
| `OTP_PEPPER` | **Yes** | Secret pepper added to OTP codes before HMAC hashing. | `CHANGE_ME_AT_LEAST_32_CHARS_LONG_PEPPER_03` | `.env.compose.example:L17` |
| `AI_SERVICE_SHARED_SECRET` | **Yes** | Internal shared secret for backend-to-ai-service API authentication. | `CHANGE_ME_INTERNAL_SHARED_SECRET` | `.env.compose.example:L18`<br>`backend/.env.example:L44` |
| `REDIS_URL` / `REDIS_HOST_PORT` | **Yes** | Connection URL / port for Redis job queue and caching server. | `6379` / `redis://HOST:6379` | `.env.compose.example:L7`<br>`backend/.env.example:L9` |
| `AI_SERVICE_URL` | **Yes** | Internal HTTP endpoint where NestJS forwards AI job requests. | `http://localhost:8000` (Local) / `http://ai-service:8000` (Docker) | `backend/.env.example:L41` |
| `AI_DEGRADED_ALLOWED` | No | Allows AI service to boot and serve non-LLM requests even if Ollama is offline. | `true` | `backend/.env.example:L45`<br>`ai-service/.env.example:L16` |
| `AI_RUNTIME_MODE` | No | Specifies whether AI service uses local Ollama (`local`) or OpenRouter (`cloud`). | `cloud` | `ai-service/.env.example:L17` |
| `AI_CLOUD_FALLBACK_API_KEY`| Optional | OpenRouter API key used when cloud runtime or fallback is enabled. | `CHANGE_ME_OPENROUTER_KEY` | `ai-service/.env.example:L22` |
| `OLLAMA_BASE_URL` | Optional | HTTP URL for local Ollama container instance (left unset in cloud primary mode). | `http://ollama:11434` / Empty | `backend/.env.example:L38`<br>`ai-service/.env.example:L4` |
| `NEXT_PUBLIC_APP_ORIGIN` | No | Configured origin URL for Next.js browser client API resolution. | `http://localhost:3001` / `https://nexora-lms.com` | `next-frontend/src/lib/api-origin.ts:L14` |
| `BACKEND_INTERNAL_URL` | No | Internal Docker DNS URL for Next.js server-side API rendering. | `http://127.0.0.1:3000` / `http://backend:3000` | `next-frontend/src/lib/api-origin.ts:L29`<br>`ai-service/.env.example:L12` |
| `EXPO_PUBLIC_API_URL` | **Yes** (Mobile)| HTTP URL for mobile Expo client to reach NestJS backend API. | `http://10.0.2.2:3000/api` (Android Emulator default) | `mobile/.env.example:L1` |
| `GRAFANA_ADMIN_PASSWORD` | No | Initial admin login password for Grafana observability dashboard. | `admin12345` | `.env.compose.example:L24` |

### Configuration Files & Runtime Setup
*   **Docker Compose Runtime:** Developers copy `.env.compose.example` to an untracked `.env.compose` file (`README.md:L68`). Container-specific environment files (`backend/.env.docker`, `ai-service/.env.docker`) inject internal container DNS hostnames (`postgres`, `redis`, `ai-service`).
*   **Frontend Configuration:** Next.js uses `next.config.ts`, `postcss.config.mjs`, and `tailwind.config.ts`. API routing resolves dynamically via `src/lib/api-origin.ts`, which prevents internal Docker hostnames (`http://backend:3000`) from leaking into browser client bundles (`next-frontend/src/lib/api-origin.ts:L3-L10`).
*   **Secrets Audit:** Inspection confirmed that all `.env.example` templates contain safe placeholder strings (`CHANGE_ME_*`). **No live production secrets or private API keys were found committed in tracked files.**

---

## 9. Authentication and Authorization

### Authentication & Token Flow
Nexora implements a dual-mode authentication architecture tailored for web browsers and mobile apps (`docs/state/CURRENT_REPO_STATE 6-17.md:L26-L27`):
1.  **Login Verification:** Users authenticate via `POST /api/auth/login` (web) or `POST /api/auth/mobile/login` (mobile). Passwords are verified against `bcrypt` hashes stored in the `users` table (`backend/package.json:L47`).
2.  **Access Tokens:** Short-lived JSON Web Tokens (JWT, default **15-minute expiry**) are issued for stateless API request authorization (`backend/.env.example:L21`).
3.  **Refresh Tokens:** Long-lived rotating refresh tokens (default **7-day expiry**) are generated, SHA-256 hashed, and persisted in the `refresh_tokens` database table alongside device metadata (`refresh-tokens.schema.ts`).
4.  **Transport Mechanisms:**
    *   **Web Client (`next-frontend`):** The refresh token is transmitted via an **httpOnly, Secure, SameSite=Strict cookie** (`backend/src/modules/auth/auth.controller.ts:L55-L70`). This prevents Cross-Site Scripting (XSS) attacks from exfiltrating long-lived credentials. When an access token expires, Axios interceptors (`next-frontend/src/lib/api-client.ts`) automatically call `POST /api/auth/refresh` to obtain a fresh access token without user disruption.
    *   **Mobile Client (`mobile`):** Because mobile environments do not use standard browser cookie jars, the mobile endpoint returns both access and refresh tokens directly in the JSON response payload (`backend/src/modules/auth/auth.controller.mobile.ts:L30-L45`). The Expo client stores the refresh token securely in encrypted device storage using `expo-secure-store` (`mobile/package.json:L36`).

### One-Time Password (OTP) & Password Recovery
*   Password recovery and verification flows generate 6-digit numeric OTPs (`backend/src/modules/otp/otp.service.ts`).
*   To prevent database breach compromise, OTP codes are combined with a server-side secret (`OTP_PEPPER`), hashed using SHA-256, and stored with strict expiration timestamps (`otp.schema.ts`).

### Role-Based Access Control (RBAC) & Guards
*   **Global Protection:** NestJS registers `JwtAuthGuard` globally or at module boundaries, requiring a valid Bearer token for all protected endpoints (`backend/src/app.module.ts`).
*   **Role Enforcement:** Endpoints and controllers are decorated with `@Roles('admin', 'teacher', 'student')` (`backend/src/modules/auth/decorators/roles.decorator.ts`). The NestJS `RolesGuard` intercepts incoming requests, extracts user claims from the verified JWT payload, and rejects unauthorized access with an HTTP `403 Forbidden` error.
*   **Route Isolation:** In Next.js, role separation is enforced structurally via App Router layouts (`app/(dashboard)/dashboard/admin/layout.tsx`, `teacher/layout.tsx`, `student/layout.tsx`) and client-side route guards in `AuthProvider.tsx`.

---

## 10. Frontend State

### Next.js Web Application (`next-frontend/`)
*   **Framework & Structure:** Next.js 16.2.4 using the App Router (`app/`).
*   **Role Dashboards & Pages:**
    *   **Admin Workspace (`app/(dashboard)/dashboard/admin/`):** Full system administration including user rosters (`/users`), section management (`/sections`), class creation (`/classes`), academic calendar (`/calendar`), file library (`/library`), Excel batch import (`/roster-import`), system reports (`/reports`), evaluation campaigns (`/evaluations`), announcements (`/announcements`), system settings (`/system-settings`), audit logs (`/audit`), and the Curriculum Class Template Editor (`/class-templates`).
    *   **Teacher Workspace (`app/(dashboard)/dashboard/teacher/`):** Class management (`/classes`), section monitoring (`/sections`), curriculum library (`/library`), lesson plan builder (`/classes/[id]/lessons`), assessment editor (`/classes/[id]/assessments`), interactive class record/gradebook (`/class-record`), remedial intervention management (`/interventions`), performance analytics (`/performance`), evaluation reviews (`/evaluations`), and announcements (`/announcements`).
    *   **Student Workspace (`app/(dashboard)/dashboard/student/`):** Enrolled course cards (`/courses`), interactive lesson reader (`/courses/[id]/lessons/[lessonId]`), assessment attempt delivery with timers (`/courses/[id]/assessments/[assessmentId]`), Learning Experience Platform (`/lxp`), AI Mentor NPC tutor (`/ai-mentor`), Junior Achievement hub (`/ja`), and performance tracking (`/performance`).

### Components & UI Styling
*   **Design Tokens:** Built with Tailwind CSS v4 (`next-frontend/package.json:L48`) using a cohesive design system (custom color palettes, dark mode support, smooth transitions, and glassmorphism cards).
*   **Component Architecture:** Reusable UI components are separated cleanly by role (`src/components/admin/`, `teacher/`, `student/`) and shared primitives (`src/components/ui/` containing Radix UI wrappers for Modals, Tabs, Selects, Tooltips, and Popovers).
*   **Forms & Validation:** All interactive forms use React Hook Form (`@hookform/resolvers/zod`) bound to Zod validation schemas (`next-frontend/package.json:L59`, `L63`). This ensures synchronous frontend validation before API dispatch.

### State Management & Real-Time Flows
*   **Server State:** Managed by TanStack React Query v5 (`@tanstack/react-query`). Queries utilize automated background refetching and structured query invalidation on mutation (`src/providers/QueryProvider.tsx`).
*   **Real-Time WebSocket Events:** Socket.IO client (`socket.io-client` v4.8.3) listens for broadcast events from the backend gateway (`src/providers/NotificationProvider.tsx`). When a teacher publishes an announcement or an AI generation job completes, notification badges update live without page reloads.

### Mobile Application (`mobile/`)
*   **Framework:** Expo SDK 54 with React Native 0.81.5 (`mobile/package.json`).
*   **Current Scope:** The mobile client is intentionally scoped to the **student learning experience** (`README.md:L45`, `docs/system-audit/NEXORA_AUDIT_2026-03-27.md:L58`). It implements native screens for student login, course navigation, lesson content reading, quiz attempts, and AI tutor chat (`mobile/src/screens/`).
*   **Navigation & Styling:** Uses `@react-navigation/bottom-tabs` and `native-stack` (`mobile/package.json:L22-L24`). Styled using NativeWind v4 (`mobile/global.css`), with clean responsive layouts tailored for Android and iOS screen dimensions.

### Frontend Limitations & Technical Debt
*   **Residual Lint Warnings:** The audit notes 22 non-fatal ESLint warnings in `next-frontend`, primarily involving unoptimized raw `<img>` tags (where `<Image />` is recommended) and minor React hook dependency array warnings (`docs/system-audit/NEXORA_AUDIT_2026-03-27.md:L67`).
*   **Next.js Proxy Deprecation:** Next.js 16 emits a build warning indicating that the root `middleware.ts` should eventually be migrated to the newer `proxy.ts` convention (`docs/system-audit/NEXORA_AUDIT_2026-03-27.md:L42`, `next-frontend/proxy.ts`).

---

## 11. Backend State

### NestJS Server Organization (`backend/`)
*   **Application Bootstrap:** Configured in `backend/src/main.ts`. Configures global CORS origins, attaches Helmet security headers, enables cookie parsing, and sets a global NestJS `ValidationPipe` with `whitelist: true` and `transform: true` (`backend/src/main.ts:L15-L45`).
*   **Feature Modules:** The application is cleanly partitioned into **32 domain feature modules** under `backend/src/modules/`:
    `academic-state`, `admin`, `ai-mentor`, `analytics`, `announcements`, `assessments`, `audit`, `auth`, `class-record`, `class-templates`, `classes`, `content-modules`, `discussion-board`, `file-upload`, `health`, `ja`, `lessons`, `lxp`, `mail`, `notifications`, `otp`, `performance`, `profiles`, `rag`, `reports`, `roles`, `roster-import`, `school-events`, `sections`, `teacher`, `teacher-profiles`, and `users`.

### Services, Business Logic & Orchestration
*   **Database Access:** Services do not execute raw SQL strings; they interact with database tables via typed Drizzle ORM query builders and repository wrappers (`backend/src/drizzle/`).
*   **Asynchronous Job Processing (BullMQ):** Heavy background workloads are decoupled from HTTP request threads using BullMQ queues backed by Redis (`@nestjs/bullmq` in `backend/src/app.module.ts:L45`). Dedicated queue processors handle:
    *   `lesson-plans`: Asynchronous AI drafting of curriculum lesson content (`backend/src/modules/ai-mentor/`).
    *   `quizzes`: Automated AI question generation from uploaded library documents (`backend/src/modules/ai-mentor/`).
    *   `announcement-fan-out`: Asynchronous delivery of class announcements to hundreds of enrolled student websocket connections (`backend/src/modules/notifications/processors/announcement-fan-out.processor.ts`).
    *   `discussion-threads`: Background AI summarization and analytics of class discussion threads (`backend/src/modules/discussion-board/discussion-board.processor.ts`).

### File Upload Handling
*   **Internal Uploads Controller:** Handled by `backend/src/modules/file-upload/internal-uploads.controller.ts`.
*   **Storage & Validation:** Files are stored directly to a local filesystem volume (`/app/uploads`), which is shared with the AI service container for PDF chunking and ingestion (`docker-compose.yml:L35-L40`). Incoming files pass through custom NestJS validation pipes (`pdf-validation.pipe.ts`, `library-file-validation.pipe.ts`) to verify MIME types and enforce maximum file size limits before writing to disk.

### Logging, Error Handling & Observability
*   **Centralized Logging:** Utilizes Winston (`winston` v3.19.0) configured with `winston-loki` (`backend/package.json:L69-L70`). Logs automatically include service labels (`service_name=nexora-backend`) and are shipped directly to the Loki container for Grafana querying (`README.md:L130`).
*   **Distributed Tracing:** Instrumentation is initialized in `backend/src/tracing.ts` using OpenTelemetry (`@opentelemetry/sdk-node`). HTTP requests, Drizzle DB queries, and Redis job spans are exported via OTLP to the Tempo tracing server (`README.md:L96`, `L131`).
*   **Exception Handling:** Global NestJS exception filters catch unhandled errors, log stack traces to Winston, and return sanitized, consistent JSON error envelopes to client applications.

### Backend Weaknesses & Technical Debt
*   **Pre-Existing ESLint Debt:** Running `npm run lint` directly on `backend/` fails due to pre-existing code formatting discrepancies and strict TypeScript warnings across historical files (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L20`, `L46`). While `npm run build` compiles cleanly, strict linting requires cleanup.
*   **Local File Volume Scaling:** Relying on local filesystem volume mounts (`/app/uploads`) works perfectly for single-instance Docker Compose deployments, but requires migration to cloud object storage (AWS S3, Azure Blob, or Cloudflare R2) before deploying horizontal multi-container backend clusters.

---

## 12. Testing State

The repository maintains an active, multi-layered testing suite across all core subsystems (`README.md:L270-L305`).

### Summary Table of Test Coverage

| Subsystem | Test Framework | Test Files Location | What Is Covered | How to Run Tests | Current Health / Outdated Tests |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend (`backend`)** | Jest + Supertest (`ts-jest`) | `src/**/*.spec.ts` (Unit)<br>`test/*.e2e-spec.ts` (E2E) | **65 suites, 851 tests.** Comprehensive unit coverage of controllers, services, guards, pipes, schedulers, and DTO validation. E2E tests verify LXP evaluation flows and app bootstrap. | `cd backend && npm test`<br>`npm run test:e2e` | **Healthy & Green.** Builds and passes cleanly (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L44`). |
| **Web Frontend (`next-frontend`)** | Jest + React Testing Library + Playwright | `app/**/*.test.tsx`<br>`src/**/*.test.tsx`<br>`tests/e2e/*.spec.ts` | **76 suites, 227 tests.** Unit coverage of role components, hooks, utilities, and page rendering. Playwright E2E specs (`tests/e2e/`) test admin template editors, student lesson readers, and teacher assessment tools. | `cd next-frontend && npm test`<br>`npm run test:e2e` | **Healthy & Green.** Unit tests pass cleanly after audit isolation fixes (`whole-repo-lms-audit-2026-04-24.md:L48`). |
| **AI Service (`ai-service`)** | Python `unittest` | `tests/test_*.py` | **21 test files, 43 tests.** Verifies document extraction pipelines, RAG indexing, remedial logic, quiz generation, cloud openrouter fallback, and metrics endpoints. | `cd ai-service && python scripts/run_tests.py` | **Healthy & Green.** Custom runner ensures stable execution across OS environments (`whole-repo-lms-audit-2026-04-24.md:L49`). |
| **Mobile Client (`mobile`)** | Jest + React Test Renderer | `src/**/__tests__/*.test.ts`<br>`*.test.tsx` | **25+ test files.** Verifies API client hooks, HTTP error handling, student screens, navigation parity, UI primitives, and theme switching. | `cd mobile && npm test`<br>`npm run typecheck` | **Healthy & Green.** Typechecking and Jest test suites pass cleanly (`README.md:L303`). |

### Outdated or Incomplete Testing Artifacts
*   **Performance Smoke Scripts (`next-frontend/scripts/`):** Standalone Node.js verification scripts (`engine-perf-smoke.js` and `discussion-perf-smoke.js`) are used to measure live DOM UI responsiveness. The audit notes that `engine-perf-smoke.js` is currently out of sync with the admin template workspace because button labels changed (e.g., searching for `Export Engine YAML` instead of current controls like `Save Draft` or `Publish`) (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L18`). These scripts require DOM selector updates when UI copy evolves.

---

## 13. Build, Run, and Development Workflow

The repository supports both portable Docker Compose full-stack execution and service-by-service local development (`README.md:L63-L269`). All commands below are actively supported by repo configuration files.

### Option A: Full-Stack Docker Compose (Recommended Quick Start)
Starts PostgreSQL, Redis, Ollama (with model pulling), AI Service, NestJS Backend (`3000`), Next.js Frontend (`3001`), and the full observability stack (Grafana on `3002`, Prometheus on `9090`, Loki on `3100`, Tempo on `3200`) (`README.md:L67-L80`).
```bash
# 1. Copy container environment template
cp .env.compose.example .env.compose

# 2. Validate docker compose configuration
docker compose --env-file .env.compose config

# 3. Build and launch full stack in detached mode
docker compose --env-file .env.compose up -d --build

# 4. Monitor logs for backend and AI service
docker compose --env-file .env.compose logs -f backend ai-service
```

### Option B: Local Service-by-Service Development

#### 1. Backend (`backend/`)
```bash
cd backend
npm install
cp .env.example .env

# Generate and apply Drizzle SQL migrations to local PostgreSQL
npx drizzle-kit generate:pg
npx drizzle-kit push:pg

# Optional: Seed database with sample school accounts and classes
node seed-database.js

# Start NestJS development server with watch mode
npm run start:dev
# -> API running at http://localhost:3000
# -> Swagger Docs at http://localhost:3000/api/docs
```

#### 2. Web Frontend (`next-frontend/`)
```bash
cd next-frontend
npm install

# Start Next.js App Router development server
npm run dev
# -> Web app running at http://localhost:3001
```

#### 3. AI Microservice (`ai-service/`)
```bash
cd ai-service
python -m venv .venv

# Activate virtual environment (Linux/macOS: source .venv/bin/activate | Windows: .venv\Scripts\activate)
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env.local

# Optional: Pull local embedding model if Ollama is running locally
ollama pull nomic-embed-text

# Start FastAPI Uvicorn dev server
uvicorn app.main:app --reload --port 8000
# -> AI Service readiness probe at http://localhost:8000/ready
```

#### 4. Mobile Client (`mobile/`)
```bash
cd mobile
npm install

# Start Expo Metro bundler
npm run start

# Launch Android emulator (or iOS / Web)
npm run android
```

### Quality Verification Sweep Commands
```bash
# Backend verification
cd backend && npm run build && npm test && npm run test:e2e

# Frontend verification
cd next-frontend && npm run lint && npm test && npm run build

# AI service verification
cd ai-service && python scripts/run_tests.py

# Mobile verification
cd mobile && npm run typecheck && npm test
```

---

## 14. Deployment State

### Target Platforms & Hosting Assumptions
*   **Cloud Platform Targets:** The repository is configured for cloud container deployment, explicitly targeting **Railway** (automated deployment workflow in `.github/workflows/railway-deploy-developement.yml`) and **Azure Cloud** (referenced in phase deployment notes in `backend/.env.example:L35`).
*   **Docker Containerization:** Fully containerized with production-ready multi-stage Dockerfiles present in `backend/Dockerfile`, `next-frontend/Dockerfile`, and `ai-service/Dockerfile`.
*   **Container Registry Publishing:** Automated GitHub Actions workflow (`.github/workflows/docker-publish.yml`) builds and publishes tagged container images to GitHub Container Registry (`ghcr.io`).

### CI/CD Pipeline Capabilities
The `.github/workflows/` directory contains three active continuous integration and deployment pipelines (`docs/state/CURRENT_REPO_STATE 6-17.md:L37`):
1.  **`ci.yml`**: Runs automatically on pull requests and pushes. Executes Node.js 20 setup, linting, typechecking, unit tests, and build verification across `backend`, `next-frontend`, and `mobile`, plus Python 3.12 test suite execution for `ai-service`.
2.  **`docker-publish.yml`**: Triggers on branch merges to build optimized container images and push them to GHCR.
3.  **`railway-deploy-developement.yml`**: Automates continuous deployment of the development branch directly to Railway container environments.

### Mobile App Standalone Build
*   **APK & IPA Deployment:** Standalone mobile app deployment is documented in `mobile/APK_DEPLOYMENT.md` using Expo Application Services (EAS Build).
*   **Configuration:** Configured via `mobile/eas.json` and `mobile/app.json`. Running `eas build -p android --profile preview` generates an Android `.apk` ready for direct student device installation or school distribution.

### Production Build Outputs & Missing Steps
*   **Build Verification:** Running `npm run build` produces optimized production bundles (`dist/` in backend, `.next/` standalone output in frontend) and passes cleanly (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L43`, `L47`).
*   **Missing Production Steps:**
    1.  **Cloud Object Storage Migration:** Replacing local volume file storage (`/app/uploads`) with an S3-compatible cloud bucket for horizontal container scaling.
    2.  **Production SSL / Domain Routing:** Configuring reverse proxy SSL termination and production DNS mapping for frontend and API domain separation (`CORS_ALLOWED_ORIGINS`, `COOKIE_DOMAIN`).

---

## 15. Code Quality Review

### Strengths
*   **Clean Architectural Boundaries:** High separation of concerns between core record-keeping (`backend`), assistive AI processing (`ai-service`), and role-scoped user interfaces (`next-frontend`, `mobile`).
*   **Microservice Security Isolation:** The design preventing frontends from calling the AI service directly eliminates a major vector for unauthorized LLM token consumption and prompt injection abuse.
*   **Strict Data Typing & Schema Enforcement:** TypeScript v5 is used universally across client and server JS/TS code. Drizzle ORM schemas and Zod/class-validator DTOs enforce contract stability from database tables up to UI form inputs.
*   **Comprehensive Test Coverage:** Maintaining 850+ backend unit tests, 220+ frontend tests, Python AI test suites, and Playwright E2E browser automation provides exceptional regression safety for an academic capstone repository.
*   **Production-Grade Observability:** Built-in OpenTelemetry tracing, Winston/Loki structured logging, and Grafana dashboard provisioning reflect enterprise DevOps standards rarely seen in university capstones.

### Weaknesses & Maintainability Risks
*   **Pre-Existing Backend ESLint Debt:** Running strict ESLint without automatic fix flags fails across historical backend files due to formatting rules and legacy TypeScript type assertions (`docs/system-audit/whole-repo-lms-audit-2026-04-24.md:L46`). This creates visual noise during lint audits and should be cleaned up in a dedicated tech-debt PR.
*   **Monolithic AI Service Entry Point:** The core FastAPI application file (`ai-service/app/main.py`) is ~186 KB (over 4,800 lines of code) and defines dozens of endpoints inline (`grep_search` results). While functional, this file is over-engineered in length and should be refactored into modular FastAPI `APIRouter` files (`routers/chat.py`, `routers/admin.py`, `routers/tutor.py`).
*   **UI DOM Selector Drift in Scripts:** Standalone verification scripts (`next-frontend/scripts/*.js`) rely on hardcoded button text labels. As UI designers refine button copy (e.g., changing "Export Engine" to "Save Draft"), these scripts break even though the application functions perfectly (`whole-repo-lms-audit-2026-04-24.md:L18`).
*   **Frontend Image & Hook Warnings:** Next.js linting reports 22 warnings, primarily where standard HTML `<img>` tags are used instead of the optimized `next/image` component (`NEXORA_AUDIT_2026-03-27.md:L67`).

---

## 16. Security Review

### Findings & Security Controls
*   **Exposed Secrets Check:** **No live production secrets or private API keys were found in tracked repository files.** All environment templates (`.env.example`, `.env.compose.example`) properly utilize dummy placeholder strings (`CHANGE_ME_*`).
*   **Authentication & Session Security:** Secure JWT authentication is implemented with appropriate access token lifespans (15m). Web client refresh tokens are protected against XSS via `httpOnly`, `Secure`, `SameSite=Strict` cookies (`backend/src/modules/auth/auth.controller.ts`).
*   **Password & OTP Protection:** Password storage correctly utilizes industry-standard `bcrypt` hashing with salt rounds. One-Time Passwords (OTPs) use peppered HMAC-SHA256 hashing (`OTP_PEPPER`), ensuring stored OTPs cannot be reversed even if the database is exposed (`otp.schema.ts`).
*   **Authorization & RBAC Checks:** Endpoints enforce strict Role-Based Access Control using NestJS guards (`@Roles(...)` + `RolesGuard`). Admin and teacher endpoints reject student bearer tokens with `403 Forbidden`.
*   **AI Microservice Token Protection:** Internal communication between NestJS and FastAPI is authenticated via `AI_SERVICE_SHARED_SECRET` (`X-Internal-Service-Token`), preventing external network actors from triggering expensive LLM generation endpoints directly.
*   **SQL Injection & XSS Mitigation:** Drizzle ORM and SQLAlchemy query builders automatically parameterize SQL queries, eliminating SQL injection risks. Frontend rich text content (TipTap HTML outputs) is sanitized using DOMPurify (`next-frontend/package.json:L49`) and Python content sanitizers (`ai-service/app/content_sanitizer.py`) before rendering.
*   **Rate Limiting & HTTP Headers:** NestJS registers Helmet for HTTP response hardening and `@nestjs/throttler` for API rate limiting (`backend/package.json:L38`, `L55`), preventing brute-force login attempts and denial-of-service flooding.

### Security Recommendations
*   **File Upload Storage:** In multi-server production environments, local file uploads to `/app/uploads` could lead to denial-of-service via disk exhaustion. Enforce strict quota limits per user and migrate storage to a cloud object bucket with pre-signed URLs.
*   **CORS & Cookie Domain Alignment:** When deploying to production domains, ensure `CORS_ALLOWED_ORIGINS` and `COOKIE_DOMAIN` in `backend/.env` are restricted strictly to verified school production hostnames (`backend/.env.example:L15-L16`).

---

## 17. Known Bugs, Gaps, and Incomplete Work

| Issue / Gap | Location | Severity | Explanation | Suggested Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Out-of-Sync Performance Smoke Script** | `next-frontend/scripts/engine-perf-smoke.js` | Medium | Standalone script fails because it searches for an outdated UI button label (`Export Engine YAML`) that was modified in the current Admin Class Template workspace (`whole-repo-lms-audit-2026-04-24.md:L18`). | Update script DOM selectors to match current UI controls (`Save Draft`, `Publish`, `Add Module`). |
| **Student Discussion Smoke Timeout** | `next-frontend/scripts/discussion-perf-smoke.js` | Low | The student test leg experienced timing timeouts during automated browser sweeps when resolving student class route IDs (`whole-repo-lms-audit-2026-04-24.md:L19`). | Harden script navigation waits to wait for dynamic class card network idle before clicking. |
| **Backend Direct ESLint Debt** | `backend/` | Medium | Running `npm run lint` directly on backend codebase reports pre-existing formatting and strict TypeScript type warnings (`whole-repo-lms-audit-2026-04-24.md:L20`). | Run `npm run lint --fix` and resolve remaining strict type assertions in a dedicated chore PR. |
| **Next.js Middleware Deprecation Warning** | `next-frontend/middleware.ts` | Low | Next.js 16 outputs a build warning advising that root `middleware.ts` should be transitioned to the `proxy.ts` convention (`NEXORA_AUDIT_2026-03-27.md:L42`). | Refactor authentication redirect routing from `middleware.ts` into Next.js 16 `proxy.ts` pattern. |
| **Lesson Versioning Surface Depth** | `backend/src/modules/lessons/`<br>`next-frontend/` | Low | Lesson versioning is supported in database schema and backend APIs, but UI controls for diffing and restoring historical lesson drafts are minimal (`README.md:L334`). | Build a historical version drawer in the Teacher Lesson Editor allowing visual version comparisons. |
| **Unused Static Design Folder** | `stitch_crimson_mobile_lms/` | Low | Contains static HTML templates and design mockup exports that are not executed or imported by active code (`docs/state/CURRENT_REPO_STATE 6-17.md:L1660`). | Maintain as static design reference; do not delete or couple to active Next.js runtime. |

---

## 18. Dependency Review

### Major Dependencies & Purpose
*   **`@nestjs/*` (v11.x):** Enterprise backend framework providing modular DI, routing, JWT auth, Swagger docs, and websockets (`backend/package.json`).
*   **`drizzle-orm` (v0.45.1) & `drizzle-kit`:** Type-safe SQL ORM and migration generator for PostgreSQL (`backend/package.json:L53`).
*   **`bullmq` (v5.70.1) & `ioredis`:** High-performance Redis background job processing for asynchronous AI tasks (`backend/package.json:L48`).
*   **`next` (v16.2.4) & `react` (v19.2.3):** Cutting-edge web framework and UI rendering library with Server Components and App Router (`next-frontend/package.json:L55-L57`).
*   **`@tanstack/react-query` (v5.101.0):** Asynchronous server state caching, pagination, and invalidation for frontend and mobile (`next-frontend/package.json:L39`).
*   **`fastapi` (v0.115+) & `llama-index-core` (v0.12+):** High-speed Python asynchronous API server and RAG orchestration framework (`ai-service/requirements.txt`).
*   **`expo` (v54.0.0) & `react-native` (v0.81.5):** Cross-platform native mobile app runtime and SDK (`mobile/package.json:L27`).

### Unused or Redundant Dependencies
*   **`nativewind` in Mobile:** Installed in `mobile/package.json:L38` for utility-first Tailwind styling in React Native, but several mobile components still use standard React Native `StyleSheet` objects. Consolidate styling approaches where appropriate.

### Security Overrides & Version Compatibility
*   **Package Overrides:** Both `backend/package.json:L126-L130` and `next-frontend/package.json:L81-L88` implement explicit package overrides forcing `exceljs` to use `uuid` v14.0.0+. This addresses known security vulnerabilities in legacy `uuid` transitive dependencies.
*   **Cutting-Edge Runtimes:** React 19 and Next.js 16 represent the latest major releases. Ensure any new third-party UI components or rich-text plugins checked into the codebase explicitly support React 19 peer dependencies.

---

## 19. Suggested Next Steps

### Prioritized Recommendations

#### A. Immediate Fixes (Next Sprint / Stabilizing Verification)
1.  **Update Performance Smoke Scripts:** Modify DOM selectors in `next-frontend/scripts/engine-perf-smoke.js` and `discussion-perf-smoke.js` to match current button labels in the Admin and Teacher workspaces, restoring 100% automated smoke pass rates (`whole-repo-lms-audit-2026-04-24.md:L18-L19`).
2.  **Resolve Frontend Lint Warnings:** Run a cleanup pass across `next-frontend/` to replace raw `<img>` tags with Next.js `<Image />` components and fix React hook dependency warnings (`NEXORA_AUDIT_2026-03-27.md:L67`).
3.  **Harden Mobile Click Verifications:** Verify pointer click targets on Teacher Class Cards in mobile/web integration sweeps to ensure synthetic click parity (`whole-repo-lms-audit-2026-04-24.md:L90`).

#### B. Short-Term Improvements (Architecture & Tech Debt)
1.  **Clean Up Backend ESLint Debt:** Execute `npm run lint --fix` on `backend/` and manually resolve remaining strict TypeScript formatting and type warnings (`whole-repo-lms-audit-2026-04-24.md:L20`).
2.  **Refactor Monolithic AI Service Main File:** Split `ai-service/app/main.py` (~186 KB) into modular FastAPI `APIRouter` files (`routers/chat.py`, `routers/admin.py`, `routers/tutor.py`, `routers/indexing.py`) to improve readability and maintainability.
3.  **Migrate Next.js Middleware:** Transition authentication cookie routing checks from `next-frontend/middleware.ts` to the recommended Next.js 16 `proxy.ts` convention (`NEXORA_AUDIT_2026-03-27.md:L68`).

#### C. Long-Term Improvements (Scalability & Cloud Production)
1.  **Cloud Object Storage Migration:** Replace local filesystem volume storage (`/app/uploads`) in `backend/src/modules/file-upload/` with an S3-compatible cloud storage adapter (AWS S3 or Azure Blob) to support multi-container horizontal scaling.
2.  **Expand Lesson Versioning UI:** Enhance the Teacher Lesson Builder UI to allow teachers to visually diff historical lesson plan versions and restore prior drafts (`README.md:L334`).
3.  **Broaden Playwright E2E Coverage:** Expand Playwright automated browser test suites (`next-frontend/tests/e2e/`) to cover remedial LXP intervention generation and student Junior Achievement practice sessions.

---

## 20. AI Agent Handoff Notes

This section provides authoritative onboarding instructions and architectural boundaries for future AI coding agents working in this repository.

### Critical Project Context & Routing Kernel
*   **Authoritative Kernel:** Always consult `AGENTS.md` at the repository root before planning or executing substantive code modifications (`AGENTS.md:L1-L20`).
*   **Mandatory Router Trace:** Before executing complex workflows or code edits, you **MUST emit the required router trace log** as defined in `AGENTS.md:L16-L17`:
    `ROUTER_TRACE task=<type> include=<kernel,...> optional_skipped=<...> exclude=<...> reason=<one line>`
*   **Subsystem Rules:** Review the subsystem-specific instructions before editing files within them: `backend/AGENTS.md`, `next-frontend/AGENTS.md`, `ai-service/AGENTS.md`, and `mobile/AGENTS.md`.

### Files to Read First When Onboarding
1.  `README.md` & `AGENTS.md` (Root project scope, quick start, and kernel routing rules).
2.  `docker-compose.yml` (Port mappings, database URLs, and environment variables for local infrastructure).
3.  `backend/src/app.module.ts` (NestJS module hierarchy, BullMQ registration, and global providers).
4.  `next-frontend/src/lib/api-origin.ts` (Frontend URL resolution logic preventing Docker DNS hostname leaks).
5.  `ai-service/app/config.py` (FastAPI environment settings, Ollama/OpenRouter fallback parameters).
6.  `docs/system-audit/whole-repo-lms-audit-2026-04-24.md` (Latest verification audit baselines and historical smoke test notes).

### Risky Areas & Architectural Boundaries to Respect
*   **NEVER Bypass Backend AI Proxies:** Do not configure `next-frontend` or `mobile` to send HTTP requests directly to `ai-service` (`http://localhost:8000`). All AI requests must route through NestJS endpoints (`/api/ai/*`), where authentication, RBAC, rate limiting, and audit logging are enforced (`README.md:L43`, `backend/AI_MENTOR_README.md`).
*   **Do Not Modify Database Schema Directly:** Never edit database tables manually. Modify Drizzle schema files in `backend/src/drizzle/schema/` and generate a new migration file using `npx drizzle-kit generate:pg` (`README.md:L199`).
*   **Respect Shared Secret Auth:** Keep `AI_SERVICE_SHARED_SECRET` synchronized between `backend` and `ai-service`. Backend requests lacking this header will be rejected by FastAPI.
*   **Do Not Alter Legacy Design References:** Do not delete or modify `stitch_crimson_mobile_lms/` unless explicitly instructed; it serves as an offline static design reference (`docs/state/CURRENT_REPO_STATE 6-17.md:L1660`).

### Preferred Coding Patterns Present
*   **Backend:** Layered NestJS architecture (`.controller.ts` -> `.service.ts` -> `.schema.ts` / Drizzle ORM). Use DTO classes with `class-validator` decorators for input validation. Use `@Roles('admin', 'teacher', 'student')` for endpoint RBAC.
*   **Frontend:** Next.js Server and Client Components (`"use client"` where hooks/interactivity are required). Use TanStack React Query (`useQuery`, `useMutation`) for data fetching with automatic cache invalidation. Use Zod schemas with React Hook Form for form validation.
*   **AI Service:** Asynchronous FastAPI endpoints using Pydantic models for request/response serialization. Use SQLAlchemy async sessions (`asyncpg`) for database queries.

### Things Future Agents Should Avoid Doing
*   **Never Hardcode Localhost URLs in Frontend:** Do not hardcode `http://localhost:3000` or `http://backend:3000` in UI components or hooks. Always use `getFrontendApiOrigin()` or `process.env.NEXT_PUBLIC_APP_ORIGIN` (`next-frontend/src/lib/api-origin.ts`).
*   **Never Commit Real Secrets:** Do not commit actual passwords, API keys, or JWT secrets into `.env.example` or code files. Use placeholder strings (`CHANGE_ME_*`).
*   **Do Not Spawn Unnecessary Subagents:** As instructed in `AGENTS.md:L33-L37`, keep sequential or tightly coupled tasks local. Only suggest subagents for independent parallel slices that do not block immediate progress, and always request user permission first unless explicitly authorized.

### Best Next Tasks to Continue the Project Safely
1.  **Smoke Test Alignment:** Run `node next-frontend/scripts/engine-perf-smoke.js` and update any broken DOM selector strings to match the current Admin Class Template UI controls.
2.  **Lint & Tech-Debt Clean Up:** Run `cd backend && npm run lint --fix` and clean up remaining strict TypeScript type warnings.
3.  **FastAPI Modularization:** Refactor `ai-service/app/main.py` by extracting distinct domain routes into separate `APIRouter` modules under an `ai-service/app/routers/` directory without altering API URL contracts.

---
*End of Report. Generated by Antigravity AI Coding Assistant.*
