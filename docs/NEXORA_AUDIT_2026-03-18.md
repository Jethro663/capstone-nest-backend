# Nexora Audit - 2026-03-18

## Score Summary
- Concept paper feature coverage: `82%`
- Deployment readiness: `58%`
- AI/RAG maturity: `72%`

## Concept Paper Alignment
| Module | Status | Notes |
| --- | --- | --- |
| User Management | Complete | Accounts, auth, OTP, profile completion, status handling, audit coverage exist. |
| Role & Access Control | Complete | RBAC, guards, protected teacher/admin/student routes are implemented. |
| Student Profile | Complete | Student profile, enrollment, progress, history, and intervention eligibility exist. |
| Teacher Profile | Complete | Teacher profile and class handling access exist. |
| Class & Subject Management | Complete | Sections, classes, rosters, teacher/class mappings are implemented. |
| Learning Content Management | Partial | Upload, extraction, formatting, and lesson organization exist, but lesson versioning is still operationally light. |
| Assessment Management | Complete | Draft/publish, attempts, scoring, return flow, analytics, and file-upload assessments exist. |
| Performance Tracking & Evaluation | Complete | Snapshots, at-risk detection, interventions, and delta reporting exist. |
| LXP | Complete | Restricted LXP access, playlists, checkpoint progress, and intervention flow exist. |
| Intervention Management | Complete | Automatic and teacher-managed intervention flows exist. |
| AI Mentor | Partial | Grounded tutor, mistake explanations, recommendations, and quiz drafts exist, but teacher-governed scope controls need stronger UI and policy surfacing. |
| Instructional Support | Partial | AI recommendations and remedial plans exist, but the “instructional formula” concept should be described as teacher-facing recommendations, not autonomous pedagogy. |
| Analytics & Dashboard | Complete | Teacher/admin/student analytics and reporting views exist. |
| Reporting | Complete | Student, enrollment, performance, intervention, assessment, and usage reports exist. |
| System Evaluation | Complete | Evaluation submission and review flows exist. |
| Security & Data Management | Partial | JWT rotation, OTP, audit logs, throttling, and validation exist, but deployment secret management and readiness hardening were incomplete before this pass. |
| Web & Mobile Access | Complete | Next.js web and React Native mobile clients exist. |

## Mismatches To Correct In The Concept Paper
- The paper says “Backend: Nextjs”. The implemented backend is NestJS.
- The paper uses “below 60%” as an example threshold. Current product policy is intentionally `74`.
- The paper excludes advanced predictive analytics. Current analytics should continue to be described as descriptive and intervention-focused, not predictive.

## Risks Found Before Hardening
- Repo-tracked env files contained live-looking secrets and malformed dotenv syntax.
- Production env files mixed localhost assumptions with production mode.
- Refresh cookies were not split-origin safe for Azure-style frontend/backend deployment.
- Backend health only checked process liveness, not dependencies.
- Backend startup seeded the database every time the container started.
- AI service trusted forwarded user headers without a shared internal secret.
- RAG indexing depended too heavily on manual or request-time triggers.

## Hardening Implemented In This Pass
- Added backend readiness checks for database, Redis, and AI service.
- Added AI-service liveness and readiness endpoints with degraded-mode awareness.
- Added proxy-aware cookie/CORS handling for split frontend/backend origins.
- Added internal shared-secret forwarding between backend and AI service.
- Added queued backend-triggered RAG reindexing for lesson and assessment changes.
- Stopped unconditional production seeding by making it opt-in.
- Normalized env templates for backend, AI service, and frontend.

## Remaining Follow-up
- Rotate all secrets that were previously committed.
- Validate container builds on Linux or Azure build infrastructure.
- Decide whether Ollama will run in Azure for the first deployment or whether AI-degraded mode will be used initially.
