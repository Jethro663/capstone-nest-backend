# Implementation Truth Table

| Feature | Claimed in Research Paper | Claimed in Concept Paper | Found in Backend | Found in Frontend Web | Found in Mobile | Found in Database | Confirmed Live | Status | Evidence | Required Correction in Paper | Required Correction in System |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Role-based login | Claimed | Claimed | Yes | Yes | Yes | Yes | Yes | Real | backend/src/common/constants/role.constants.ts:10; next-frontend/app/(auth)/login/page.tsx; mobile/src/screens/LoginScreen.tsx | None beyond versioned wording. | None |
| OTP verification | Claimed | Claimed | Yes | Yes | Partial | Yes | Unverified end-to-end | Partial | backend/src/modules/otp/otp.controller.ts:16; backend/src/drizzle/schema/otp.schema.ts:22; next-frontend/app/(auth)/verify-email/page.tsx | Avoid claiming fully verified live OTP unless demonstrated. | Optional: verify mobile OTP UX end-to-end |
| Forgot password | Claimed | Claimed | Yes | Yes | Unclear | Yes | Web only | Partial | backend/src/modules/auth/auth.controller.ts:318,335; next-frontend/app/(auth)/forgot-password/page.tsx | Scope mobile claim carefully. | Clarify mobile parity |
| Admin dashboard | Claimed | Claimed | Yes | Yes | No | N/A | Yes | Real | next-frontend/app/(dashboard)/dashboard/admin/page.tsx; screenshot admin-dashboard.png | Note web-admin scope. | None |
| Teacher dashboard | Claimed | Claimed | Yes | Yes | No | N/A | Yes | Partial | teacher route screenshots; TeacherUnsupportedScreen.tsx:40,45 | Do not imply mobile teacher parity. | Build teacher mobile if needed |
| Student dashboard | Claimed | Claimed | Yes | Yes | Yes | N/A | Web yes | Real | student dashboard routes in web and mobile | None | None |
| Class management | Claimed | Claimed | Yes | Yes | No | Yes | Teacher/admin routes verified | Real | classes module and routes | None | None |
| Section management | Claimed | Claimed | Yes | Yes | No | Yes | Not directly clicked in this audit | Real | backend/src/modules/sections; frontend admin sections routes | None | None |
| Roster import | Claimed | Claimed | Yes | Yes | No | Yes | Unverified | Real | roster-import controller and admin route | None | Optional live smoke |
| CSV/Excel validation | Claimed | Claimed | Yes | Yes | No | N/A | Unverified | Partial | roster-import module and admin page | Avoid overstating live proof. | Run import demo flow |
| Lessons/modules | Claimed | Claimed | Yes | Yes | Yes | Yes | Yes | Real | lessons/modules schemas and routes | None | None |
| Course browsing | Claimed | Claimed | Yes | Yes | Yes | Yes | Web yes | Real | student courses screenshot; StudentClassesIndexPage routes | None | None |
| 30-second completion tracking | Claimed | Not explicit | No clear rule | No clear rule | No clear rule | Time spent only | No | Unsupported | base.schema.ts:636 timeSpentSeconds only; no explicit 30-second rule found | Remove or rewrite | Implement if required |
| Assessments | Claimed | Claimed | Yes | Yes | Partial | Yes | Web static/runtime evidence | Real | assessment tables and pages; live nav smoke | Scope mobile precisely | Optional mobile parity |
| Out-of-focus warning | Claimed | Not explicit | N/A | Yes | No evidence | N/A | Static only | Partial | next-frontend/app/(dashboard)/dashboard/student/assessments/[id]/take/page.tsx:355,417,699-712 | Call it web assessment logic, not generic mobile/web unless proven | Optional live scenario proof |
| Score calculation | Claimed | Claimed | Yes | Yes | Partial | Yes | Indirect yes | Real | assessment/class-record services; seed smoke counts | None | None |
| 60% threshold gating | Claimed | No | No | No | No | No | No | Unsupported | actual threshold 74 in concept, code, UI, DB | Replace with 74 | None unless policy changes |
| LXP unlock | Claimed | Claimed | Yes | Yes | Partial | Yes | Yes via teacher interventions UI plus DB | Real | lxp.service.ts; intervention_cases table; teacher-interventions screenshot | Use 74 threshold wording | None |
| Remedial playlist | Claimed | Claimed | Yes | Yes | Partial | Yes | Indirect | Partial | student lxp routes and lxp schema | Avoid over-describing if not fully demoed | Optional richer demo data |
| JAKIPIR AI mentor | Claimed | Claimed in lighter form | Yes | Yes | No full proof | Yes | Web route and ai-service healthy | Real | ai-service student JA endpoints; /dashboard/student/ja live route | Standardize terminology | Improve load perception |
| RAG grounding | Claimed | Only lighter AI integration claim | Yes | Yes | N/A | Yes | Static + DB counts | Real | ai-service/retrieval_service.py:257-261; content_chunk_embeddings table; live chunk counts 391 | None | None |
| PDF extraction | Claimed | Claimed | Yes | Yes | N/A | Yes | Service tests only | Real | ai-service/app/main.py /extract endpoints; extracted_modules table | Clarify teacher review/verification step | None |
| AI quiz drafting | Claimed | Claimed | Yes | Yes | N/A | Yes | Static + DB jobs | Real | ai-service /teacher/quizzes/jobs; ai_generation_jobs table; live ai_jobs=44 | None | Optional live demo proof |
| Asynchronous AI jobs | Claimed | Partial | Yes | Yes | N/A | Yes | Static + DB | Real | BullMQ deps; ai_generation_jobs table; ai-service 202 endpoints | None | None |
| Notifications | Claimed | Claimed | Yes | Yes | In-app partial | Yes | Web yes | Real | notifications schema/controller/gateway; live notifications row count 33 | Distinguish web/in-app from push | Add push stack only if needed |
| Socket.IO real-time updates | Claimed | Not explicit | Yes | Yes | Not proven | N/A | Static only | Real | backend/src/modules/notifications/notifications.gateway.ts:13; frontend deps | None | Optional mobile parity |
| Redis/BullMQ queue | Claimed | Not explicit | Yes | N/A | N/A | N/A | Health yes | Real | backend/package.json:47; health ready endpoint reported redis ok | None | None |
| PostgreSQL/pgvector | Claimed | Not explicit on pgvector | Yes | N/A | N/A | Yes | Yes | Real | docker-compose.yml pgvector image; rag.schema tables; retrieval_service vector casts | None | None |
| Audit trail | Claimed | Claimed | Yes | Yes | No | Yes | Yes | Real | audit_logs table; admin audit screenshot; live audit_logs=1214 | Replace legacy nutritionist paragraph with this actual feature | None |
| System diagnostics | Claimed | Not explicit | Yes | Yes | No | N/A | Yes | Real | health controller; admin diagnostics screenshot | None | None |
| Academic year/quarter settings | Claimed | Claimed | Yes | Yes | No | Yes | Static only | Real | academic-state controller/schema; admin routes | None | Optional live walkthrough |
| Performance analytics | Claimed | Claimed | Yes | Yes | Yes limited | Yes | Partial | Partial | analytics/performance modules; performance tables; live snapshots present | Qualify live data completeness | Seed fuller demo data |
| Competency heatmaps | Claimed | Claimed | Yes | Yes | No evidence | Yes | Unverified | Partial | student_concept_mastery table; analytics/performance modules | Avoid calling it fully validated unless shown | Prepare live demo data |
| Quarterly trends | Claimed | Claimed | Yes | Yes | Partial | Yes | Partial | Partial | performance schema; analytics routes | Qualify dataset coverage | Seed fuller demo data |
| Reports/export | Claimed | Claimed | Yes | Yes | No | Yes | Unverified | Real | reports module; admin pages; class template export | Do not overstate live proof | Run export smoke if defense depends on it |
| Discussion boards | Claimed | Claimed | Yes | Yes | Partial/mock | Yes | Web static/runtime evidence | Partial | discussion board schema/controller; mobile note says not live-backed | Mark mobile parity as partial | Implement mobile data source |
| Announcements | Claimed | Claimed | Yes | Yes | In-app partial | Yes | Web yes | Real | announcements schema/controller; student announcements screenshot | Remove push claim | Optional push implementation |
| Profile management | Claimed | Claimed | Yes | Yes | Yes | Yes | Static/runtime evidence | Real | profiles module; StudentProfilePage; mobile profile screen | Use accurate lock wording | None |
| Class record sync/spreadsheet | Claimed | Claimed | Yes | Yes | No | Yes | Static + post-seed smoke | Real | class-record module/schema; post-seed-smoke.js results | None | Optional live route click proof |
| Mobile app flows | Claimed | Claimed | Yes | N/A | Yes but student-first | N/A | Typecheck/test only | Partial | mobile package and screen inventory; teacher unsupported placeholder | Narrow scope | Build missing parity |
| Admin AI chatbot | Claimed | Not prominent | Yes | Yes | No | Yes logs/history | Route exists | Real | next-frontend/app/(dashboard)/dashboard/admin/chatbot/page.tsx; ai-service/app/main.py:1690 | None | Optional live interaction demo |
| AI mentor oversight | Claimed | Claimed in teacher-guided form | Yes | Yes | N/A | Yes | Partial | Partial | teacher intervention jobs; ai logs; admin chat auditing | State oversight boundaries precisely | Optional stronger review UX |
