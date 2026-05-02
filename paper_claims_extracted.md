# Paper Claims Extracted

Source DOCX: `C:\Users\jethr\Downloads\April-13-CHAPTER-123-and-4.docx`

## Extraction Summary
- Paragraphs: 663
- Tables: 50
- Figure-caption hits: 78
- Table-caption hits: 99
- Extracted media files: 37

## 1. System Identity and Title
- "Nexora: A Learning Management With Learning Experience Platform Features for Targeted Student Intervention for Gat Andres Bonifacio High School"
- Positions the project as a hybrid LMS plus LXP platform with AI-driven targeted intervention.

## 2. Target Institution
- Gat Andres Bonifacio High School.

## 3. Target Users
- Administrator
- Teacher
- Student

## 4. Grade Levels and Subjects
- Broad high-school-wide coverage is implied, often with language close to all subjects and all grade levels.
- This is broader than the implementation evidence, which is bounded to grade levels 7-10 in the schema.

## 5. Objectives
- Build a web and mobile LMS with LXP intervention capabilities.
- Identify at-risk students by assessment performance.
- Gate remedial access to lower-performing students.
- Provide an AI mentor to explain mistakes and guide remediation.

## 6. Scope and Delimitation
- LMS for standard class, lesson, assessment, and reporting workflows.
- LXP reserved for struggling learners.
- Mobile and web clients both claimed.

## 7. LMS Features
- Role-based login
- Dashboards
- Classes, sections, rosters, modules, lessons
- Assessments and submissions
- Discussion boards and announcements
- Reports and records

## 8. LXP Features
- Targeted remedial access
- Performance-based gating
- Prior-lesson review and intervention support

## 9. AI Features
- JAKIPIR AI mentor / AI NPC mentor / AI tutor
- PDF extraction
- AI quiz drafting
- AI-driven explanations and hints

## 10. AI Model and RAG Claims
- FastAPI microservice
- Ollama runtime
- qwen2.5:3b for tutoring/chat
- gemma3:4b for PDF/document reasoning
- pgvector-backed retrieval-augmented generation

## 11. Authentication and Security Claims
- OTP verification
- Forgot password and account recovery
- Audit trail
- Protected dashboards and role routing

## 12. Role Permissions
- Admin manages users, sections, classes, diagnostics, audit, settings, reports
- Teacher manages classes, modules, AI drafting, interventions, announcements, discussions
- Student consumes lessons, takes assessments, accesses JA/LXP if eligible, manages profile

## 13. Database and Storage Claims
- PostgreSQL
- pgvector
- Redis
- Cloud database wording appears once in a likely copied paragraph and conflicts with the rest of the paper

## 14. Architecture Claims
- Next.js frontend
- NestJS backend
- FastAPI AI microservice
- Socket.IO, BullMQ, Redis, Swagger UI, OpenTelemetry, Prometheus, Loki

## 15. Mobile App Claims
- Expo SDK 54 mobile app
- Login, OTP, forgot password, dashboard, modules, assessments, profile, LXP and AI mentor flows

## 16. Web App Claims
- Login and dashboard navigation
- Course browsing and filtering
- Assessment taking with out-of-focus warning

## 17. Admin Portal Claims
- User lifecycle management
- Password resets
- Sections and rosters
- Diagnostics
- Audit trail
- Calendar and academic-state transitions

## 18. Teacher Portal Claims
- Classes and instructional materials
- AI extraction review
- AI quiz drafting
- Interventions and outcomes

## 19. Student Portal Claims
- Dashboard and continue learning
- Course/module browsing
- Assessments
- JA mentor access
- Announcements and profile management

## 20. Reports and Analytics Claims
- Performance analytics
- Quarterly trends
- Heatmaps
- Academic reports and export

## 21. Monitoring and Observability Claims
- Diagnostics
- Dependency health checks
- Audit trail
- OpenTelemetry, Prometheus, Loki

## 22. Testing and Evaluation Claims
- Agile process and technical validation are implied.
- The paper reads as if the workflows are broadly finished and ready.

## 23. Diagrams and Workflows
- Figure 1 through Figure 39 are listed.
- Chapters 3-4 rely heavily on process flow and decomposition diagrams.

## 24. Use Cases and Tables
- Table 1 through Table 49 are listed.
- There are visible duplicates and numbering conflicts in the extracted table list.

## 25. Hardware and Software Requirements
- Specific stack versions are listed, including Next.js 16.1.6, React 19, NestJS 11, Expo SDK 54, qwen2.5:3b, and gemma3:4b.

## High-Risk Exact Strings Found
- `c0 percent` / `c0%`
- `RND` / `nutritionist` / `food intakes` / `cloud database` / `chat box feature is available on the web system`
- `Disccusion`
- `Non-Placer Character`
- duplicated `Student Profile` table titles

## Notes
- This file intentionally extracts claims, not corrections.
- Final truth judgments are in the companion audit outputs.
