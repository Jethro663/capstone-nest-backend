# Defense Best Answers
High-risk and critical answer pack.
## General Defense Questions
### 1. What is Nexora in one sentence?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 2. What exact school problem does Nexora solve?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 3. Why focus on Gat Andres Bonifacio High School specifically?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 4. What makes Nexora different from a normal LMS?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
### 5. Why combine LMS and LXP instead of building only one system?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
### 6. What is the strongest contribution of the project?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 7. What is your real scope, as opposed to your ideal scope?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 8. Why did you include AI at all?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 9. Does Nexora replace teachers?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 10. What is the intervention trigger in Nexora?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 11. Why is the threshold 74 and not 75 or 70?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 12. What happens to a student who scores exactly 74%?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 13. What happens to a student who scores below the threshold?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 14. Can high-performing students also benefit from the LXP?
- Safest phrasing: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
- Short answer: The current rule targets scarce remedial support, but the design could be widened later.
- Long answer: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
- Evidence to show:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
- What not to say: Do not argue that only struggling learners deserve personalized support.
- Honest fallback if incomplete: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
### 15. Is JAKIPIR an actual NPC mentor or mainly a guided chatbot?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 16. What part of the system still needs the most improvement?
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
### 17. Why is this still a capstone and not an overambitious startup pitch?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 18. What claim about Nexora should be phrased most carefully during defense?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 19. What are the biggest limitations you would admit up front?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 20. Why not just recommend Google Classroom plus a separate tutor bot?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 21. Why is targeted intervention better than generic review for everyone in this project?
- Safest phrasing: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
- Short answer: The current rule targets scarce remedial support, but the design could be widened later.
- Long answer: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
- Evidence to show:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
- What not to say: Do not argue that only struggling learners deserve personalized support.
- Honest fallback if incomplete: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
### 22. What evidence shows the project is more than mock UI?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: backend, next-frontend, ai-service, and mobile all have substantive modules and routes.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
## Technical Questions
### 1. What is the actual architecture of Nexora?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: root README and docker-compose.yml show Next frontend, Nest backend, FastAPI AI service, PostgreSQL, Redis, Ollama.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 2. Why is the backend NestJS instead of Next.js API routes?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 3. How does the backend communicate with the AI service?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- Repo: backend/src/modules/ai-mentor/ai-mentor.controller.ts forwards to AI proxy endpoints.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 4. Where is the intervention threshold enforced in code?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 5. How are background AI jobs processed?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 6. Where is pgvector actually used?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- Repo: ai-service/app/retrieval_service.py CASTs embeddings AS vector and searches content_chunk_embeddings.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 7. How are JWT and role checks enforced?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 8. How is OTP handled securely?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 9. How do you prevent AI outputs from modifying official grades?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 10. What happens if the AI service is down?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 11. Is your AI stack strictly local-only?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- Repo inventory and docs note optional cloud fallback code exists in addition to local Ollama.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 12. How are extracted lessons reviewed before becoming real content?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 13. What observability tools are actually included?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- Repo: docker-compose provisions Prometheus, Loki, Tempo, Grafana, promtail, exporters.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 14. How do you store AI chats and extraction logs?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts defines ai_interaction_logs and extracted_modules tables.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 15. What is the purpose of class AI policies?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 16. How does your retrieval stay inside allowed class material?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 17. How do you handle failed extractions or weak evidence?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 18. Why use a separate FastAPI service for AI instead of embedding everything in NestJS?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 19. Which service currently looks most fragile from a demo-day perspective?
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
### 20. If you had one more week, what technical hardening would you do first?
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
## Research and Methodology Questions
### 1. What is the exact research gap your study addresses?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 2. How do you justify the need for Nexora in the chosen school context?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 3. Why is your problem statement not too broad?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 4. How do your objectives map to your implemented system?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 5. Which objective is fully demonstrated and which objective is still only partially validated?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 6. What actual Agile evidence do you have beyond the diagram?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 7. How do you measure functionality, reliability, usability, and portability?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 8. How many respondents evaluated the system?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 9. What instrument did you use for evaluation?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 10. What statistical treatment did you apply to the evaluation data?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 11. How do you separate system implementation success from educational effectiveness?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 12. How did you validate the 74% threshold academically?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 13. How current and credible are your cited statistics?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 14. How do you defend the claim that existing LMS platforms are insufficient?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
### 15. Why is your Chapter 4 not just design documentation?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 16. What limitation would you highlight if asked about external validity?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 17. How do you defend your related-systems comparison table?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 18. If the panel says your implementation is stronger than your study design, how do you answer?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
## LMS, LXP, and Pedagogy Questions
### 1. Why do you call this an LXP and not just an LMS with remediation?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
### 2. What pedagogical theory supports the intervention flow?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 3. How is mastery learning reflected in your design?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 4. Why is the remedial path limited to struggling students?
- Safest phrasing: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
- Short answer: The current rule targets scarce remedial support, but the design could be widened later.
- Long answer: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
- Evidence to show:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
- What not to say: Do not argue that only struggling learners deserve personalized support.
- Honest fallback if incomplete: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
### 5. Could restricting access create stigma?
- Safest phrasing: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
- Short answer: The current rule targets scarce remedial support, but the design could be widened later.
- Long answer: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
- Evidence to show:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
- What not to say: Do not argue that only struggling learners deserve personalized support.
- Honest fallback if incomplete: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
### 6. How does Nexora support learner autonomy?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
### 7. How does the system personalize remediation?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
### 8. What role does the teacher still play after intervention is triggered?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 9. How does the system avoid over-reliance on AI during learning?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 10. Why should a student trust JAKIPIR?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 11. How do you prevent students from using the AI only to get answers?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 12. What evidence do you have that the intervention path is pedagogically coherent?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 13. Why is immediate targeted remediation better than waiting for manual teacher follow-up only?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 14. Could the system misclassify a student as needing remediation?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 15. How do class records and LXP records stay conceptually separate?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 16. How does the system help teachers who are not subject specialists in remediation?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 17. How do you justify using an anthropomorphic mentor for minors?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 18. If the panel says this is targeted tutoring rather than a full LXP, how do you respond?
- Safest phrasing: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
- Short answer: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
- Long answer: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
- Evidence to show:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
- What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
- Honest fallback if incomplete: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
## AI, JAKIPIR, and RAG Questions
### 1. What exactly does JAKIPIR do?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 2. Is JAKIPIR retrieval-augmented or just a plain chatbot?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 3. Where does the AI get its evidence?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 4. How do you prevent hallucinations?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 5. Can JAKIPIR give wrong answers?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 6. What happens when the AI is unsure?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 7. How do you stop the AI from giving direct answer keys?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 8. What models are actually used and for what tasks?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- Repo: ai-service README maps qwen2.5:3b to text tasks and gemma3:4b to document-oriented reasoning.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 9. How do you store embeddings?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 10. What is the role of pgvector in Nexora?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 11. How does PDF extraction work end to end?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 12. What if a PDF is scanned or poorly formatted?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 13. Can teachers edit AI-generated outputs before applying them?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 14. Is AI-generated remedial content automatically trusted by the system?
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 15. What AI logs are kept?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 16. Can teachers control how strict the AI grounding is?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 17. What is the difference between JA, JAKIPIR, AI Tutor, and LXP in your system?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 18. Is the AI feature safe for minors?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 19. What happens if Ollama is slow or unavailable?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 20. Do you rely only on local AI or can the architecture fall back to cloud APIs?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 21. How do you justify calling the AI adaptive?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 22. How do you measure AI quality?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 23. If the panel says your AI is useful but not yet trustworthy enough for strong claims, how do you answer?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
## Privacy and Security Questions
### 1. How do you protect student data?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 2. How do JWT and refresh flows work in your system?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 3. How are OTP codes stored?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 4. How do you prevent account enumeration in recovery flows?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 5. How is role-based access control enforced?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 6. How do you separate teacher, admin, and student data access?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 7. How do you handle AI chats that may contain personal information?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 8. Are AI interaction logs stored separately from official academic records?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 9. How would you answer a Data Privacy Act of 2012 question?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 10. What consent assumptions exist when minors use AI features?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 11. What if a student types private family or health information into JAKIPIR?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 12. How do you audit sensitive system actions?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 13. How do you secure cookies, tokens, and API access?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 14. How are password resets protected from abuse?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 15. Can AI-generated content introduce unsafe or biased advice?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 16. What is your fallback if an AI output is harmful or misleading?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 17. Do you claim legal compliance is already complete?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 18. What security claim should you never say during defense?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
## Database Questions
### 1. Which tables support intervention logic?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- Repo: intervention_cases, intervention_assignments, lxp_progress, performance_snapshots, performance_logs.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 2. Which tables support AI logging and extraction?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 3. How is threshold information persisted?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 4. How are system evaluations stored?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 5. How do you store embeddings?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 6. What happens to official class records when intervention occurs?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 7. What data would you seed before a defense demo?
- Safest phrasing: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
- Short answer: The reporting features are real, but their persuasiveness depends on data completeness.
- Long answer: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
- Evidence to show:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
- What not to say: Do not imply the analytics have already been validated over long-term real school usage.
- Honest fallback if incomplete: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
### 8. If the panel asks whether your schema is already stable for production, what do you say?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
## Mobile and Web Implementation Questions
### 1. What mobile roles are strongest today?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
### 2. Can students authenticate on mobile with OTP and password recovery flows?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
### 3. Can teachers work on mobile?
- Safest phrasing: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
- Short answer: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
- Long answer: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
- Evidence to show:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
- What not to say: Do not promise full feature parity until you have live proof on the defense device.
- Honest fallback if incomplete: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
### 4. Can administrators work fully on mobile?
- Safest phrasing: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
- Short answer: Admin mobile is not a defense centerpiece.
- Long answer: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
- Evidence to show:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
- What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
- Honest fallback if incomplete: If asked, say administration remains strongest on web in the current scope.
### 5. How do web and mobile differ in scope today?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
### 6. How do you justify claiming both web and mobile accessibility?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
### 7. What mobile feature should not be overpromised during defense?
- Safest phrasing: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
- Short answer: Admin mobile is not a defense centerpiece.
- Long answer: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
- Evidence to show:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
- What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
- Honest fallback if incomplete: If asked, say administration remains strongest on web in the current scope.
### 8. If a panelist asks to switch roles live on mobile, what should you do?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
### 9. How should you describe teacher mobile if not every action has been live-verified today?
- Safest phrasing: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
- Short answer: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
- Long answer: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
- Evidence to show:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
- What not to say: Do not promise full feature parity until you have live proof on the defense device.
- Honest fallback if incomplete: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
### 10. How should you describe admin mobile if asked directly?
- Safest phrasing: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
- Short answer: Admin mobile is not a defense centerpiece.
- Long answer: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
- Evidence to show:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
- What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
- Honest fallback if incomplete: If asked, say administration remains strongest on web in the current scope.
### 11. If the web app works but mobile is unstable, what is the honest defense answer?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
## Demo Attack Questions
### 1. Show me the login flow right now.
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
### 2. Show me the role-based dashboards.
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
### 3. Show me where the 74% threshold is visible.
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 4. Show me a student who triggered intervention.
- Safest phrasing: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
- Short answer: The reporting features are real, but their persuasiveness depends on data completeness.
- Long answer: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
- Evidence to show:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
- What not to say: Do not imply the analytics have already been validated over long-term real school usage.
- Honest fallback if incomplete: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
### 5. Show me JAKIPIR answering from class material.
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 6. Show me a PDF extraction and what happens after it finishes.
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 7. Show me that teachers can review AI output before applying it.
- Safest phrasing: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
- Short answer: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
- Long answer: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
- Evidence to show:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
- Honest fallback if incomplete: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
### 8. Show me what happens when a student scores exactly 74%.
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 9. Show me the mobile app for an administrator.
- Safest phrasing: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
- Short answer: Admin mobile is not a defense centerpiece.
- Long answer: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
- Evidence to show:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
- What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
- Honest fallback if incomplete: If asked, say administration remains strongest on web in the current scope.
### 10. Show me the mobile app for a teacher.
- Safest phrasing: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
- Short answer: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
- Long answer: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
- Evidence to show:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
- What not to say: Do not promise full feature parity until you have live proof on the defense device.
- Honest fallback if incomplete: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
### 11. Show me what happens if the AI is down.
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 12. Show me how the system avoids AI-based grade tampering.
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 13. Use a random account instead of your prepared seed data.
- Safest phrasing: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
- Short answer: The reporting features are real, but their persuasiveness depends on data completeness.
- Long answer: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
- Evidence to show:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
- What not to say: Do not imply the analytics have already been validated over long-term real school usage.
- Honest fallback if incomplete: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
### 14. Can you switch quickly from student to teacher to admin live?
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
### 15. What if the backend suddenly fails during the demo?
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
### 16. What if Ollama is still loading the model?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 17. If something breaks live, what can you still prove from the repo?
- Safest phrasing: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
- Short answer: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
- Long answer: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
- Evidence to show:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
- Honest fallback if incomplete: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
## Deployment and Feasibility Questions
### 1. Can a public high school realistically run this system?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 2. What hardware is required for the AI-enabled version?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 3. Can the core LMS still work without the AI stack?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 4. Who maintains the stack after the capstone?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 5. What is your fallback when internet or local networking fails?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 6. Can the school adopt Nexora without GPU hardware?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 7. What part of the architecture is most likely to raise cost or maintenance burden?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 8. What is your strongest honest deployment claim today?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
## Trap Questions
### 1. Is the AI fully accurate?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 2. Is Nexora ready for production deployment today?
- Safest phrasing: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
- Short answer: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
- Long answer: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
- Evidence to show:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- What not to say: Do not say it is already production-ready for any public school without operational validation.
- Honest fallback if incomplete: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
### 3. Does the AI replace the teacher during remediation?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 4. Can your system support all grade levels and all subjects right now?
- Safest phrasing: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
- Short answer: We should defend the system as scoped to Grades 7 to 10 in one school context.
- Long answer: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
- Evidence to show:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
- What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
- Honest fallback if incomplete: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
### 5. Is the LXP already proven effective at improving grades?
- Safest phrasing: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
- Short answer: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
- Long answer: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
- Evidence to show:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
- What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
- Honest fallback if incomplete: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
### 6. Can you guarantee there will never be hallucinations?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
### 7. Does mobile fully match the web system?
- Safest phrasing: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
- Short answer: Mobile exists, but parity is not equal across roles.
- Long answer: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
- Evidence to show:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
- What not to say: Do not say all web features are fully available on mobile.
- Honest fallback if incomplete: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
### 8. Does the system already comply completely with all privacy laws?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 9. Can the AI directly change a student's academic record?
- Safest phrasing: AI and LXP outputs are assistive and intentionally separated from official academic records.
- Short answer: The system keeps AI guidance separate from official grading records.
- Long answer: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
- Evidence to show:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
- What not to say: Do not imply the AI directly changes grades or decides final marks.
- Honest fallback if incomplete: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
### 10. If a student gets 74%, are they automatically failing?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 11. Is the 74% threshold universally correct?
- Safest phrasing: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
- Short answer: Nexora currently uses a configurable 74% threshold to trigger intervention.
- Long answer: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
- Evidence to show:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
- Honest fallback if incomplete: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
### 12. Is every chart in your analytics based on large real-world school data already?
- Safest phrasing: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
- Short answer: The reporting features are real, but their persuasiveness depends on data completeness.
- Long answer: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
- Evidence to show:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
- What not to say: Do not imply the analytics have already been validated over long-term real school usage.
- Honest fallback if incomplete: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
### 13. If the backend is currently down, does that mean the system is fake?
- Safest phrasing: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
- Short answer: The biggest immediate demo risk is runtime stability, not absence of code.
- Long answer: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
- Evidence to show:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
- What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
- Honest fallback if incomplete: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
### 14. Can you promise the AI is safe for all minors under every circumstance?
- Safest phrasing: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
- Short answer: Security is implemented with concrete controls, but we should avoid absolute guarantees.
- Long answer: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
- Evidence to show:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
- Honest fallback if incomplete: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
### 15. Should schools trust the AI without teacher review?
- Safest phrasing: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
- Short answer: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
- Long answer: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
- Evidence to show:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
- Honest fallback if incomplete: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
## Safe Answers for Known Incomplete Areas
- **AI mentor not fully adaptive**: Within the current capstone scope, the AI mentor is implemented as a grounded support tool that uses visible class evidence and guided prompts. We describe it as context-aware and assistive, not as a fully adaptive intelligence that independently personalizes everything.
- **PDF extraction reliability**: The extraction workflow is implemented and useful for accelerating teacher preparation, but it is still treated as teacher-reviewed AI assistance. For complex or poorly formatted PDFs, human review remains part of the safe workflow.
- **RAG not perfect**: The RAG pipeline is implemented through pgvector-backed retrieval and source filtering, but retrieval quality still depends on the quality and availability of indexed class material. That is why we do not claim the AI is infallible.
- **Mobile app partial**: The mobile application is implemented in prototype scope with strongest support on student workflows and meaningful but not fully parity-proven role expansion beyond that. The web platform remains the primary surface for complete administration.
- **Analytics not fully real-time**: Analytics and reporting workflows are implemented, but not every chart should be described as continuously real-time in the strongest sense. Some outputs are best defended as updated data views based on the available records and generated snapshots.
- **Dashboards using seed data**: Several dashboard and reporting surfaces are best demonstrated through controlled test data so the workflow can be shown clearly and consistently. That does not make the feature fake; it simply means classroom-scale live data collection is still limited.
- **System not deployed to a real school server**: The current capstone demonstrates a deployable prototype architecture and a pilot-ready workflow, but not a finalized school-wide production deployment. We present it as technically ready for controlled pilot preparation, not as already institutionally rolled out.
- **No full external API integration**: The current scope focuses on internal LMS, LXP, and AI-service integration inside the Nexora architecture. External third-party integrations were intentionally excluded so the team could validate the core intervention workflow first.
- **No offline mode**: Offline functionality is outside the current scope because the project prioritizes synchronized records, real-time role access, and AI-assisted workflows that depend on connected services. That exclusion is deliberate rather than accidental.
- **Hardware requirements too high**: The full AI-enabled stack does require stronger infrastructure than a simple web portal, especially for smoother local inference. That is why the safest deployment answer is a staged or pilot-oriented rollout, not an assumption that every school setup can host the full AI stack immediately.
- **Teacher override not implemented everywhere**: Teacher judgment remains central to the workflow even where automated risk detection exists. If a specific override behavior is not yet implemented in the exact form the panel imagines, we describe that as a reasonable enhancement rather than pretending it already exists.
- **Audit logs partial**: Audit logging is implemented for important mutations and accountability flows, but we should avoid claiming exhaustive enterprise-grade monitoring of every possible system event. The current scope focuses on meaningful administrative and academic action traceability.
- **No large-scale user testing**: The present study is stronger as a system-design and prototype-validation capstone than as a large-scale educational impact study. We openly state that broader user testing remains an important next step.
- **No real student deployment yet**: The system is designed for the target school context and demonstrated using controlled development data and prototype workflows. Actual live student deployment remains a separate institutional rollout step.
