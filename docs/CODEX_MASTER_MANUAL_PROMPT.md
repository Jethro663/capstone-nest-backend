# NEXORA LMS MASTER TECHNICAL & MAINTENANCE SERVICE MANUAL
## CODEX EXECUTION PROMPT (EXHAUSTIVE 200+ PAGE EQUIVALENT)

Copy and paste the entire prompt below into **Codex** to instruct it to generate the complete, exhaustive multi-chapter engineering service manual (`docs/master-manual/`) for `capstone-nest-react-lms` (Nexora LMS / LXP).

---

```markdown
# MISSION & IDENTITY: NEXORA MASTER SERVICE MANUAL ARCHITECT

You are the Principal Systems Architect, Core Database DBA, and Lead Technical Documentation Engineer for **Nexora LMS/LXP (`capstone-nest-react-lms`)**.

Your mission is to inspect the repository codebase and generate the **Nexora Master Technical & Maintenance Service Manual** under `docs/master-manual/`. This manual must serve as an appliance-grade engineering reference (equivalent to a 200+ page technical textbook and service manual) where every single entity, module, queue, schema, route, and architectural seam is explicitly stated.

If a developer reads this manual, they must immediately understand the exact internal state of the repository and be able to modify any database entity, API endpoint, BullMQ queue, AI prompt, or frontend flow **on a whim** without guessing.

---

## 1. MANDATORY EXECUTION PROTOCOL (ZERO TRUNCATION OR PLACEHOLDERS)

To prevent LLM output truncation and ensure 100% comprehensive coverage:
1. **Never use placeholders, summaries, ellipses (`...`), or "etc."** Every table, column, route, and queue worker must be explicitly documented.
2. **Always inspect source code before writing a chapter.** Use code search and file reading tools to verify exact Drizzle schemas, NestJS decorators, BullMQ queue names, and FastAPI routes.
3. **Generate incrementally chapter-by-chapter.** Write each chapter as a standalone, highly detailed Markdown file inside `docs/master-manual/`.
4. **Include rich Mermaid.js diagrams** in every chapter to visualize ERDs, sequence flows, state machines, and topologies.
5. **Provide a PDF compilation script** (`docs/master-manual/compile_pdf.sh`) using Pandoc/Weasyprint/Marp so the complete markdown series compiles cleanly into a unified, paginated PDF manual.

---

## 2. REQUIRED FILE STRUCTURE & CHAPTER INVENTORY

Create the following files under `docs/master-manual/`:

```
docs/master-manual/
├── 00-master-index-and-guide.md
├── 01-system-topology-and-architecture.md
├── 02-drizzle-database-schema-and-entity-dictionary.md
├── 03-bullmq-async-queue-and-job-orchestration.md
├── 04-auth-rbac-security-and-session-lifecycle.md
├── 05-nestjs-backend-module-and-api-catalog.md
├── 06-fastapi-ai-service-and-vector-engine.md
├── 07-nextjs-web-frontend-and-role-workspaces.md
├── 08-expo-mobile-architecture-and-navigation.md
├── 09-observability-telemetry-and-diagnostics.md
├── 10-developer-cookbook-and-modification-recipes.md
└── compile_pdf.sh
```

---

## 3. EXHAUSTIVE SPECIFICATION FOR EACH CHAPTER

### Chapter 01: System Topology & Cross-Subsystem Architecture (`01-system-topology-and-architecture.md`)
- **System Topology Schematic**: Comprehensive Mermaid C4 / Deployment diagram illustrating:
  - NestJS 11 Backend (`backend/`)
  - Next.js 16 App Router Web Client (`next-frontend/`)
  - Expo 54 React Native Mobile Client (`mobile/`)
  - FastAPI AI Service (`ai-service/`)
  - PostgreSQL + `pgvector` Database
  - Redis Server (Caching + BullMQ)
  - Ollama Local AI Runtime
  - Observability Suite (Prometheus, Loki, Tempo, Grafana, Promtail)
- **Container & Network Boundaries**: Detailed table of internal/external ports, Docker Compose topologies (`core` vs `observability` vs `debug`), non-root container user policies, volume mounts, and network bridges.
- **Service Responsibility Matrix**: Clear ownership boundaries between public official academic records (backend) vs. assistive AI processing (ai-service).

### Chapter 02: Drizzle ORM Database Schema & Entity Dictionary (`02-drizzle-database-schema-and-entity-dictionary.md`)
- **Master Entity-Relationship Diagram (ERD)**: Full Mermaid ER diagram connecting every table in the system.
- **Complete Entity Encyclopedia**: For every single table defined in `backend/src/db/schema/`:
  - Table name & description.
  - Complete column catalog: Column Name, Drizzle/Postgres Type, Nullability, Default Value, Constraints (Primary Key, Foreign Key, Unique).
  - Indexes & Vector Embedding Columns (`pgvector` dimensions, IVFFlat / HNSW index settings).
  - Relationship map (1:1, 1:N, N:M associations).
  - Lifecycle rules and cascade delete behaviors.

### Chapter 03: BullMQ & Async Queue Architecture (`03-bullmq-async-queue-and-job-orchestration.md`)
- **Queue Pipeline Schematic**: Mermaid sequence and state diagrams showing how NestJS dispatches jobs to Redis and how processors execute them.
- **Exhaustive Queue Dictionary**: Document every BullMQ queue in the system:
  - **Queue Name & Constant Identifier**
  - **Producers**: Which NestJS services or controllers enqueue jobs.
  - **Job Types & Payloads**: Exact TypeScript interface of job input parameters.
  - **Processor / Consumer Worker**: Exact class and method executing the job.
  - **AI Service Integration**: How the worker interacts with FastAPI `/ai-service` endpoints (extraction, RAG indexing, async grading).
  - **Retry Policy & Backoff**: Exponential backoff configurations, attempt limits, and rate limiters.
  - **Dead Letter Queue (DLQ) & Error Recovery**: How failed jobs are logged, preserved, and retried.

### Chapter 04: Authentication, RBAC Security & Session Lifecycle (`04-auth-rbac-security-and-session-lifecycle.md`)
- **Auth Lifecycle Diagrams**: Sequence flows for Login, Access Token issuance, Refresh Token rotation, Cookie/Header handling, and Logout.
- **RBAC Matrix**: Detailed table of every Role (`ADMIN`, `TEACHER`, `STUDENT`) and exact permission matrix across domain features.
- **Security Guard & Interceptor Reference**: Explanation of NestJS guards (`JwtAuthGuard`, `RolesGuard`), custom decorators (`@Roles()`, `@CurrentUser()`), and inter-service authentication (shared-secret headers between Backend and AI Service).

### Chapter 05: NestJS Backend Module & API Catalog (`05-nestjs-backend-module-and-api-catalog.md`)
- **Module Dependency Graph**: Mermaid diagram showing imports and exports across modules (`AuthModule`, `UsersModule`, `CoursesModule`, `AssessmentModule`, `LxpModule`, `QueueModule`, etc.).
- **Exhaustive API Route Catalog**: Document every API controller:
  - HTTP Method & Path (`GET /api/...`, `POST /api/...`)
  - Required Auth & Allowed Roles
  - Request Body DTO Schema & Query Parameters
  - Response Envelope & Error Codes
  - Downstream Queries & Queues Invoked

### Chapter 06: FastAPI AI Service & Vector Engine (`06-fastapi-ai-service-and-vector-engine.md`)
- **Internal AI Proxy Architecture**: Explain why `ai-service` is stateless, internal-only, and protected by shared secrets.
- **Endpoint Specification**: Document every FastAPI route (`/extract`, `/generate`, `/embed`, etc.), request schema, response schema, and timeout/error handling.
- **Ollama Runtime & Model Bindings**: Configured LLM, Vision, and Embedding models, prompt templates, context window constraints, and guardrails.

### Chapter 07: Next.js 16 Web Frontend & Role Workspaces (`07-nextjs-web-frontend-and-role-workspaces.md`)
- **App Router Sitemap**: Exhaustive tree of web pages for Admin, Teacher, and Student portals.
- **State Management & Caching**: API wrapper utilities, server actions, client components, and React Query / SWR / Next cache invalidation patterns.
- **Design System & Component Library**: Styling tokens, Tailwind CSS structure, and core shared UI components.

### Chapter 08: Expo 54 Mobile Architecture & Navigation (`08-expo-mobile-architecture-and-navigation.md`)
- **Mobile Navigation Tree**: Root stack, bottom tabs, and role-based screen routing.
- **Mobile-Backend Contract**: API client configuration, secure token storage, and mobile offline resilience.

### Chapter 09: Observability, Telemetry & Diagnostics Cookbook (`09-observability-telemetry-and-diagnostics.md`)
- **Metric & Trace Telemetry Pipeline**: How Prometheus scrapes `/api/metrics`, cAdvisor tracks containers, Loki captures logs, and Tempo traces requests.
- **Diagnostic Cheat Sheet**: Common alerts, health check endpoints (`/api/health`), and how to trace a request ID from Next.js -> NestJS -> BullMQ -> FastAPI.

### Chapter 10: The Developer's Modification Cookbook (How-To Maintenance Manual) (`10-developer-cookbook-and-modification-recipes.md`)
Provide **exact, step-by-step engineering recipes** showing specific file paths and code snippets to modify the system:
1. **Recipe 10.1: How to Add a New Database Table/Entity & CRUD API Route**
   - Step 1: Define Drizzle schema in `backend/src/db/schema/...`
   - Step 2: Generate & run Drizzle migration
   - Step 3: Create DTOs and NestJS Service/Controller
   - Step 4: Add RBAC guards and route tests
2. **Recipe 10.2: How to Add a New BullMQ Background Queue & Worker**
   - Step 1: Register queue constant and processor in `QueueModule`
   - Step 2: Define job input/output interface
   - Step 3: Implement processor worker with retry & error handling
   - Step 4: Enqueue jobs from a NestJS service
3. **Recipe 10.3: How to Add a New AI Feature (Prompt / RAG Extraction Pipeline)**
   - Step 1: Add endpoint or schema in `ai-service/`
   - Step 2: Create NestJS AI client wrapper or BullMQ worker
   - Step 3: Integrate database vector search or extraction storage
4. **Recipe 10.4: How to Add a New Role-Restricted Web & Mobile Screen**
   - Step 1: Create Next.js route / Expo screen
   - Step 2: Wire API query hook & role verification
5. **Recipe 10.5: How to Safely Upgrade Dependencies & Run Tests**
   - Step 1: Verification commands (`npm run test`, `docker compose up -d`)

---

## 4. COMPILATION SCRIPT REQUIREMENTS (`compile_pdf.sh`)

At the end of your workflow, generate `docs/master-manual/compile_pdf.sh` that merges chapters `00` through `10` and compiles them into a clean, book-formatted PDF using `pandoc` or `typst`/`weasyprint` with table of contents, page numbers, syntax highlighting, and Mermaid diagram rendering support.
```
