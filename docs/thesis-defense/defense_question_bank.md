# Defense Question Bank
Paper source: `May03-CHAPTER-1-4-FINAL (1).pdf`
Repository: `capstone-nest-react-lms`
Generated: `2026-05-04 18:21:12`
Total questions: **245**
## General Defense Questions
### 1. What is Nexora in one sentence?
1. Why the panelist might ask it: The panel will test whether the team can explain the system simply and consistently.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 2. What exact school problem does Nexora solve?
1. Why the panelist might ask it: They want a concrete problem, not a vague EdTech mission statement.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 3. Why focus on Gat Andres Bonifacio High School specifically?
1. Why the panelist might ask it: Institutional fit is a common capstone scrutiny point.
2. Risk level: High
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 4. What makes Nexora different from a normal LMS?
1. Why the panelist might ask it: This is the core novelty challenge.
2. Risk level: High
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 5. Why combine LMS and LXP instead of building only one system?
1. Why the panelist might ask it: They want the architectural and product rationale.
2. Risk level: High
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 6. Who are the primary users of the system?
1. Why the panelist might ask it: They are checking role clarity and feature alignment.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 7. What is the strongest contribution of the project?
1. Why the panelist might ask it: They want to hear a focused contribution, not a long feature dump.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 8. What is your real scope, as opposed to your ideal scope?
1. Why the panelist might ask it: This tests whether the team can defend limitations cleanly.
2. Risk level: High
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 9. What is explicitly outside the current capstone scope?
1. Why the panelist might ask it: Good panelists expect a disciplined boundary.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 10. Why did you include AI at all?
1. Why the panelist might ask it: They want to see whether AI is necessary or just fashionable.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 11. Does Nexora replace teachers?
1. Why the panelist might ask it: This is both a pedagogy and ethics challenge.
2. Risk level: High
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 12. What is the intervention trigger in Nexora?
1. Why the panelist might ask it: A panelist will test whether the team knows the system rule cold.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 13. Why is the threshold 74 and not 75 or 70?
1. Why the panelist might ask it: This is one of the most predictable defense questions.
2. Risk level: Critical
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 14. What happens to a student who scores exactly 74%?
1. Why the panelist might ask it: They are probing rule precision.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
- Is the comparison below 74 or at or below 74?
### 15. What happens to a student who scores below the threshold?
1. Why the panelist might ask it: They want a concrete workflow answer.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 16. Can high-performing students also benefit from the LXP?
1. Why the panelist might ask it: This tests fairness and pedagogy awareness.
2. Risk level: High
3. Best safe answer: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
4. Short answer version: The current rule targets scarce remedial support, but the design could be widened later.
5. Long answer version: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
6. Evidence to cite from paper/repo/system:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
7. What not to say: Do not argue that only struggling learners deserve personalized support.
8. If the feature is incomplete, safest honest answer: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
9. Follow-up questions they may ask:
- Is that fair to high achievers?
- Could the threshold stigmatize students?
### 17. Why call the assistant JAKIPIR?
1. Why the panelist might ask it: They are probing branding versus actual function.
2. Risk level: Medium
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 18. Is JAKIPIR an actual NPC mentor or mainly a guided chatbot?
1. Why the panelist might ask it: This exposes overclaim risk around the AI persona.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 19. What part of the system is already strongest today?
1. Why the panelist might ask it: Panels often want the team to identify its most defensible surface.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 20. What part of the system still needs the most improvement?
1. Why the panelist might ask it: This tests honesty and technical maturity.
2. Risk level: High
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 21. If the AI is removed, what still remains valuable?
1. Why the panelist might ask it: This checks whether the project still has educational value without hype.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 22. Why is this still a capstone and not an overambitious startup pitch?
1. Why the panelist might ask it: They are looking for scope realism.
2. Risk level: High
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 23. What objective does Nexora satisfy best right now?
1. Why the panelist might ask it: They want prioritization instead of a kitchen-sink answer.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 24. What claim about Nexora should be phrased most carefully during defense?
1. Why the panelist might ask it: This tests strategic communication.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 25. What are the biggest limitations you would admit up front?
1. Why the panelist might ask it: Panels reward honest but controlled answers.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 26. Why not just recommend Google Classroom plus a separate tutor bot?
1. Why the panelist might ask it: This attacks the need for integration.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 27. What school process becomes easier because of Nexora?
1. Why the panelist might ask it: They want a workflow-level benefit, not just a feature list.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 28. Why is targeted intervention better than generic review for everyone in this project?
1. Why the panelist might ask it: This probes the intervention philosophy.
2. Risk level: High
3. Best safe answer: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
4. Short answer version: The current rule targets scarce remedial support, but the design could be widened later.
5. Long answer version: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
6. Evidence to cite from paper/repo/system:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
7. What not to say: Do not argue that only struggling learners deserve personalized support.
8. If the feature is incomplete, safest honest answer: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
9. Follow-up questions they may ask:
- Is that fair to high achievers?
- Could the threshold stigmatize students?
### 29. What evidence shows the project is more than mock UI?
1. Why the panelist might ask it: They want proof of implementation depth.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: backend, next-frontend, ai-service, and mobile all have substantive modules and routes.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 30. If the panel remembers only one sentence, what should it be?
1. Why the panelist might ask it: This reveals the maturity of the team's narrative.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
## Technical Questions
### 1. What is the actual architecture of Nexora?
1. Why the panelist might ask it: A technical panelist will test whether the architecture matches the repo.
2. Risk level: Critical
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: root README and docker-compose.yml show Next frontend, Nest backend, FastAPI AI service, PostgreSQL, Redis, Ollama.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 2. Why is the backend NestJS instead of Next.js API routes?
1. Why the panelist might ask it: They want evidence of intentional architecture separation.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 3. How does the web frontend communicate with the backend?
1. Why the panelist might ask it: API boundary clarity is a baseline technical expectation.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 4. How does the backend communicate with the AI service?
1. Why the panelist might ask it: They want to see whether the AI service is truly separate.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- Repo: backend/src/modules/ai-mentor/ai-mentor.controller.ts forwards to AI proxy endpoints.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 5. Where is the intervention threshold enforced in code?
1. Why the panelist might ask it: This checks whether the team can tie business rules to implementation.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 6. How are background AI jobs processed?
1. Why the panelist might ask it: BullMQ and async workflow claims invite inspection.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 7. Why do you need Redis in this project?
1. Why the panelist might ask it: They are testing whether dependencies are justified.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: backend uses BullMQ and Redis-backed coordination.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 8. Where is pgvector actually used?
1. Why the panelist might ask it: This is a classic 'you claimed RAG, prove it' question.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- Repo: ai-service/app/retrieval_service.py CASTs embeddings AS vector and searches content_chunk_embeddings.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 9. What does Drizzle ORM do in the backend?
1. Why the panelist might ask it: They want to know whether the team understands its own persistence layer.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: backend/drizzle config and schema files define typed schema and migrations.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 10. How are JWT and role checks enforced?
1. Why the panelist might ask it: This is a core API security question.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 11. How is OTP handled securely?
1. Why the panelist might ask it: Panels often target credential recovery flows.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 12. How do you prevent AI outputs from modifying official grades?
1. Why the panelist might ask it: This checks domain boundaries.
2. Risk level: Critical
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 13. How are real-time notifications implemented?
1. Why the panelist might ask it: Socket.IO is an explicit architecture claim.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo: backend dependencies and notifications gateway indicate real-time notification support.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 14. What happens if the AI service is down?
1. Why the panelist might ask it: This is a demo and resilience question.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 15. Is your AI stack strictly local-only?
1. Why the panelist might ask it: The panel may challenge architecture wording versus reality.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- Repo inventory and docs note optional cloud fallback code exists in addition to local Ollama.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 16. How are extracted lessons reviewed before becoming real content?
1. Why the panelist might ask it: This tests safety of automation.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 17. How do you avoid blocking the UI during long AI tasks?
1. Why the panelist might ask it: Async UX and system design matter here.
2. Risk level: Medium
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
- Repo: queued jobs, extraction status polling, and async AI job endpoints exist.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 18. What observability tools are actually included?
1. Why the panelist might ask it: They want to know if OpenTelemetry/Prometheus/Loki are real or decorative.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- Repo: docker-compose provisions Prometheus, Loki, Tempo, Grafana, promtail, exporters.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 19. What is the difference between liveness and readiness in your backend?
1. Why the panelist might ask it: This is a crisp architecture comprehension test.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
- Repo: backend/src/modules/health/health.controller.ts exposes /health/live and /health/ready with dependency-aware readiness.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 20. How do you validate request payloads?
1. Why the panelist might ask it: This reveals baseline API discipline.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 21. How do you separate admin, teacher, and student routes on the web?
1. Why the panelist might ask it: They want proof of role-aware app structure.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- Repo: next-frontend uses /dashboard/admin, /dashboard/teacher, /dashboard/student route conventions.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 22. How do you store AI chats and extraction logs?
1. Why the panelist might ask it: A technical panelist may target logging and audit design.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts defines ai_interaction_logs and extracted_modules tables.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 23. What is the purpose of class AI policies?
1. Why the panelist might ask it: This is a good test of teacher oversight mechanisms.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 24. How do you keep the mobile app aligned with backend contracts?
1. Why the panelist might ask it: This is a cross-platform maintainability question.
2. Risk level: Medium
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 25. How does your retrieval stay inside allowed class material?
1. Why the panelist might ask it: Panels will test RAG containment claims.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 26. How do you handle failed extractions or weak evidence?
1. Why the panelist might ask it: Failure-path design is a common technical challenge.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 27. How are reports and analytics generated from the database?
1. Why the panelist might ask it: This tests whether analytics are merely visual shells.
2. Risk level: Medium
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 28. Why use a separate FastAPI service for AI instead of embedding everything in NestJS?
1. Why the panelist might ask it: This is a practical architecture rationale question.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 29. Which service currently looks most fragile from a demo-day perspective?
1. Why the panelist might ask it: A fair technical panelist may ask where the real operational risk lives.
2. Risk level: High
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 30. If you had one more week, what technical hardening would you do first?
1. Why the panelist might ask it: They want prioritization under pressure.
2. Risk level: High
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
## Research and Methodology Questions
### 1. What is the exact research gap your study addresses?
1. Why the panelist might ask it: A research panelist wants a gap, not just a feature wish list.
2. Risk level: Critical
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 2. How do you justify the need for Nexora in the chosen school context?
1. Why the panelist might ask it: This tests whether the problem is locally grounded.
2. Risk level: High
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 3. Why is your problem statement not too broad?
1. Why the panelist might ask it: Broad problem statements are a classic capstone weakness.
2. Risk level: High
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 4. How do your objectives map to your implemented system?
1. Why the panelist might ask it: They want objective-to-artifact traceability.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 5. Which objective is fully demonstrated and which objective is still only partially validated?
1. Why the panelist might ask it: This tests methodological honesty.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 6. Why did you choose Agile as your development methodology?
1. Why the panelist might ask it: Methodology choice must be defendable, not copied.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 7. What actual Agile evidence do you have beyond the diagram?
1. Why the panelist might ask it: They will probe whether Agile was truly followed.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 8. How do you measure functionality, reliability, usability, and portability?
1. Why the panelist might ask it: The paper explicitly promises these dimensions.
2. Risk level: Critical
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 9. How many respondents evaluated the system?
1. Why the panelist might ask it: A research panelist will ask this quickly.
2. Risk level: Critical
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 10. What instrument did you use for evaluation?
1. Why the panelist might ask it: They want instrument rigor.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 11. What statistical treatment did you apply to the evaluation data?
1. Why the panelist might ask it: This is a standard defense question.
2. Risk level: Critical
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 12. How do you separate system implementation success from educational effectiveness?
1. Why the panelist might ask it: Strong panels distinguish artifact quality from learning outcomes.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 13. How did you validate the 74% threshold academically?
1. Why the panelist might ask it: This crosses methodology and pedagogy.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 14. What are your delimitations and why are they reasonable?
1. Why the panelist might ask it: Scope discipline is a research strength.
2. Risk level: Medium
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 15. Why are offline mode and third-party integrations excluded?
1. Why the panelist might ask it: Exclusions need rationale, not excuses.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 16. How current and credible are your cited statistics?
1. Why the panelist might ask it: Literature quality is a likely attack line.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 17. How do you defend the claim that existing LMS platforms are insufficient?
1. Why the panelist might ask it: This tests whether the gap is proven rather than assumed.
2. Risk level: High
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 18. What is the significance of the study to teachers?
1. Why the panelist might ask it: Stakeholder significance must tie to actual workflows.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 19. What is the significance of the study to students?
1. Why the panelist might ask it: They want stakeholder-specific value.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 20. What is the significance of the study to the school?
1. Why the panelist might ask it: Institution-level value must be realistic.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 21. Why is your Chapter 4 not just design documentation?
1. Why the panelist might ask it: This challenges 'Results and Discussion' inflation.
2. Risk level: Critical
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 22. What limitation would you highlight if asked about external validity?
1. Why the panelist might ask it: A good panelist will test transferability limits.
2. Risk level: High
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 23. How do you defend your related-systems comparison table?
1. Why the panelist might ask it: Comparative tables are frequent overclaim zones.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 24. What future study should follow this capstone?
1. Why the panelist might ask it: They want to see whether you know the next research step.
2. Risk level: Medium
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 25. If the panel says your implementation is stronger than your study design, how do you answer?
1. Why the panelist might ask it: This is a likely accurate criticism.
2. Risk level: Critical
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
## LMS, LXP, and Pedagogy Questions
### 1. Why do you call this an LXP and not just an LMS with remediation?
1. Why the panelist might ask it: This is the most likely pedagogy challenge.
2. Risk level: Critical
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 2. What pedagogical theory supports the intervention flow?
1. Why the panelist might ask it: They want theory behind system behavior.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 3. How is mastery learning reflected in your design?
1. Why the panelist might ask it: This probes depth of educational reasoning.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 4. Why is the remedial path limited to struggling students?
1. Why the panelist might ask it: This is a fairness question.
2. Risk level: High
3. Best safe answer: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
4. Short answer version: The current rule targets scarce remedial support, but the design could be widened later.
5. Long answer version: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
6. Evidence to cite from paper/repo/system:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
7. What not to say: Do not argue that only struggling learners deserve personalized support.
8. If the feature is incomplete, safest honest answer: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
9. Follow-up questions they may ask:
- Is that fair to high achievers?
- Could the threshold stigmatize students?
### 5. Could restricting access create stigma?
1. Why the panelist might ask it: A pedagogy panelist may challenge the student experience.
2. Risk level: High
3. Best safe answer: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
4. Short answer version: The current rule targets scarce remedial support, but the design could be widened later.
5. Long answer version: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
6. Evidence to cite from paper/repo/system:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
7. What not to say: Do not argue that only struggling learners deserve personalized support.
8. If the feature is incomplete, safest honest answer: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
9. Follow-up questions they may ask:
- Is that fair to high achievers?
- Could the threshold stigmatize students?
### 6. How does Nexora support learner autonomy?
1. Why the panelist might ask it: This is a common LXP criterion.
2. Risk level: High
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 7. How does the system personalize remediation?
1. Why the panelist might ask it: Personalization claims must be defensible.
2. Risk level: High
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 8. What role does the teacher still play after intervention is triggered?
1. Why the panelist might ask it: This tests whether the design remains teacher-centered.
2. Risk level: High
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 9. How does the system avoid over-reliance on AI during learning?
1. Why the panelist might ask it: This is a pedagogy plus ethics challenge.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 10. Why should a student trust JAKIPIR?
1. Why the panelist might ask it: Trust and learning relationship matter in pedagogy defense.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 11. How do students revisit previous lessons and assessments in a meaningful way?
1. Why the panelist might ask it: They want concrete remedial learning design.
2. Risk level: Medium
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 12. Is the LXP designed for remediation only or also enrichment?
1. Why the panelist might ask it: Scope of pedagogy matters.
2. Risk level: Medium
3. Best safe answer: Restricting the remedial path to low-performing students is a design choice for targeted intervention, but it is not the same as saying stronger students could never benefit from similar supports.
4. Short answer version: The current rule targets scarce remedial support, but the design could be widened later.
5. Long answer version: A fair answer acknowledges the tradeoff. Nexora uses targeted access because the capstone problem is intervention for struggling learners, not enrichment for everyone. That is consistent with the paper and the LXP logic. If a panelist asks whether high performers might also benefit, the correct answer is yes, but that broader personalization model is outside the current intervention-focused scope.
6. Evidence to cite from paper/repo/system:
- Concept paper and paper scope both define the LXP as an intervention component for selected students.
- Repo LXP logic is tied to at-risk and threshold-based case management.
7. What not to say: Do not argue that only struggling learners deserve personalized support.
8. If the feature is incomplete, safest honest answer: If challenged, say the current capstone scope focuses on targeted remediation first and can be expanded later for enrichment use cases.
9. Follow-up questions they may ask:
- Is that fair to high achievers?
- Could the threshold stigmatize students?
### 13. How do you prevent students from using the AI only to get answers?
1. Why the panelist might ask it: Academic integrity challenge.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 14. How does the system support 'Catch-Up Fridays' or similar school remediation periods?
1. Why the panelist might ask it: This ties project rhetoric to actual practice.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 15. What evidence do you have that the intervention path is pedagogically coherent?
1. Why the panelist might ask it: They want more than feature chaining.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 16. Why is immediate targeted remediation better than waiting for manual teacher follow-up only?
1. Why the panelist might ask it: This tests the educational rationale for automation.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 17. How are weak concepts identified?
1. Why the panelist might ask it: They want to connect analytics with intervention design.
2. Risk level: Medium
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 18. How do you balance motivation with accountability?
1. Why the panelist might ask it: This probes student experience design.
2. Risk level: Medium
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 19. Could the system misclassify a student as needing remediation?
1. Why the panelist might ask it: Fairness and threshold design challenge.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 20. What happens when a student improves after remediation?
1. Why the panelist might ask it: They want the close-the-loop answer.
2. Risk level: Medium
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 21. How do class records and LXP records stay conceptually separate?
1. Why the panelist might ask it: Pedagogically and administratively important.
2. Risk level: High
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 22. How does the system help teachers who are not subject specialists in remediation?
1. Why the panelist might ask it: A paper claim directly invites this question.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 23. How do you justify using an anthropomorphic mentor for minors?
1. Why the panelist might ask it: This blends pedagogy and ethics.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 24. What learning outcome should improve first if Nexora works as intended?
1. Why the panelist might ask it: They want realistic pedagogical expectations.
2. Risk level: Medium
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 25. If the panel says this is targeted tutoring rather than a full LXP, how do you respond?
1. Why the panelist might ask it: This is a nuanced pedagogy defense moment.
2. Risk level: Critical
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
## AI, JAKIPIR, and RAG Questions
### 1. What exactly does JAKIPIR do?
1. Why the panelist might ask it: This is the baseline AI question.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 2. Is JAKIPIR retrieval-augmented or just a plain chatbot?
1. Why the panelist might ask it: They want the real architecture.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 3. Where does the AI get its evidence?
1. Why the panelist might ask it: Grounding claims must be explicit.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 4. How do you prevent hallucinations?
1. Why the panelist might ask it: This is inevitable in an AI defense.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 5. Can JAKIPIR give wrong answers?
1. Why the panelist might ask it: A hostile-but-fair panelist will ask this bluntly.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 6. What happens when the AI is unsure?
1. Why the panelist might ask it: Good AI safety design should admit uncertainty.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 7. How do you stop the AI from giving direct answer keys?
1. Why the panelist might ask it: Academic integrity question.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 8. What models are actually used and for what tasks?
1. Why the panelist might ask it: This tests whether claimed models are real.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
- Repo: ai-service README maps qwen2.5:3b to text tasks and gemma3:4b to document-oriented reasoning.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 9. Why use qwen2.5:3b for text tutoring?
1. Why the panelist might ask it: They want model selection rationale.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 10. Why use gemma3:4b for document reasoning or extraction?
1. Why the panelist might ask it: They want task-model alignment.
2. Risk level: Medium
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 11. How do you store embeddings?
1. Why the panelist might ask it: This checks whether RAG is technically real.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 12. What is the role of pgvector in Nexora?
1. Why the panelist might ask it: Another direct RAG proof question.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 13. How does PDF extraction work end to end?
1. Why the panelist might ask it: This is a likely AI workflow defense topic.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 14. What if a PDF is scanned or poorly formatted?
1. Why the panelist might ask it: The panel will test a failure case.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 15. Can teachers edit AI-generated outputs before applying them?
1. Why the panelist might ask it: Teacher oversight is essential.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 16. Is AI-generated remedial content automatically trusted by the system?
1. Why the panelist might ask it: This probes automation boundaries.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 17. What AI logs are kept?
1. Why the panelist might ask it: Logging and accountability matter.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 18. Can teachers control how strict the AI grounding is?
1. Why the panelist might ask it: This is an advanced but fair question.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 19. What is the difference between JA, JAKIPIR, AI Tutor, and LXP in your system?
1. Why the panelist might ask it: Naming consistency can confuse a panel.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 20. Is the AI feature safe for minors?
1. Why the panelist might ask it: This is both an ethics and AI question.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 21. What happens if Ollama is slow or unavailable?
1. Why the panelist might ask it: This is a live demo risk.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 22. Do you rely only on local AI or can the architecture fall back to cloud APIs?
1. Why the panelist might ask it: Architecture truthfulness matters.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 23. How do you justify calling the AI adaptive?
1. Why the panelist might ask it: Adaptivity is an overclaim risk.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 24. How do you measure AI quality?
1. Why the panelist might ask it: A research-quality AI question.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 25. If the panel says your AI is useful but not yet trustworthy enough for strong claims, how do you answer?
1. Why the panelist might ask it: This is a likely nuanced criticism.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
## Privacy and Security Questions
### 1. How do you protect student data?
1. Why the panelist might ask it: A privacy panelist will ask this early.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 2. How do JWT and refresh flows work in your system?
1. Why the panelist might ask it: They want concrete auth knowledge.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 3. How are OTP codes stored?
1. Why the panelist might ask it: This is a precise security detail question.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 4. How do you prevent account enumeration in recovery flows?
1. Why the panelist might ask it: A sharper panelist may test security maturity.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 5. How is role-based access control enforced?
1. Why the panelist might ask it: RBAC is central to school systems.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 6. How do you separate teacher, admin, and student data access?
1. Why the panelist might ask it: This tests authorization design.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 7. How do you handle AI chats that may contain personal information?
1. Why the panelist might ask it: Sensitive data governance question.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 8. Are AI interaction logs stored separately from official academic records?
1. Why the panelist might ask it: Important ethical and technical boundary.
2. Risk level: High
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 9. How would you answer a Data Privacy Act of 2012 question?
1. Why the panelist might ask it: In the Philippines context, this is very likely.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 10. What consent assumptions exist when minors use AI features?
1. Why the panelist might ask it: The paper should not dodge this.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 11. What if a student types private family or health information into JAKIPIR?
1. Why the panelist might ask it: Real-world safety scenario.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 12. How do you audit sensitive system actions?
1. Why the panelist might ask it: Auditability is an explicit repo strength.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 13. How do you secure cookies, tokens, and API access?
1. Why the panelist might ask it: This is a standard security panel question.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 14. What happens if someone tampers with client-side requests?
1. Why the panelist might ask it: They want server-side trust boundaries.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 15. How is rate limiting handled?
1. Why the panelist might ask it: This checks anti-abuse basics.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 16. How are password resets protected from abuse?
1. Why the panelist might ask it: Recovery flows are a common attack point.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 17. Can AI-generated content introduce unsafe or biased advice?
1. Why the panelist might ask it: This is an ethics challenge.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 18. What is your fallback if an AI output is harmful or misleading?
1. Why the panelist might ask it: Incident response at a capstone level.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 19. Do you claim legal compliance is already complete?
1. Why the panelist might ask it: This is a trap around overclaiming compliance.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 20. What security claim should you never say during defense?
1. Why the panelist might ask it: A panelist may ask bluntly about overclaiming.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
## Database Questions
### 1. Why did you choose PostgreSQL for Nexora?
1. Why the panelist might ask it: They want foundational architecture reasoning.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 2. Why add pgvector instead of a separate vector store?
1. Why the panelist might ask it: This tests practical design tradeoffs.
2. Risk level: Medium
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 3. What does Drizzle ORM give you over raw SQL everywhere?
1. Why the panelist might ask it: ORM choice needs rationale.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 4. How many major table families does the system have?
1. Why the panelist might ask it: They want schema awareness.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
- Repo inventory identified auth, classes, lessons, assessments, performance, intervention, reporting, and AI-related table groups.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 5. Which tables support intervention logic?
1. Why the panelist might ask it: This ties DB design to the thesis claim.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
- Repo: intervention_cases, intervention_assignments, lxp_progress, performance_snapshots, performance_logs.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 6. Which tables support AI logging and extraction?
1. Why the panelist might ask it: This checks AI persistence design.
2. Risk level: High
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 7. How is threshold information persisted?
1. Why the panelist might ask it: They want data-level rule traceability.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 8. How do performance snapshots differ from performance logs?
1. Why the panelist might ask it: A good schema-comprehension question.
2. Risk level: Medium
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 9. How is LXP progress recorded?
1. Why the panelist might ask it: Core data model question.
2. Risk level: Medium
3. Best safe answer: The honest answer is that Nexora has LXP features for targeted remedial guidance, but it is not trying to compete with a full enterprise LXP. Its LXP claim rests on guided review, learner support, personalized remediation signals, and AI-assisted follow-up inside school scope.
4. Short answer version: Nexora is best defended as an LMS with LXP-style intervention features, not as a full standalone enterprise LXP.
5. Long answer version: A hostile panelist may say this looks like an LMS with gating rather than a true LXP. The safest response is to agree partly and narrow the claim: Nexora is primarily an LMS, but it adds LXP-style remedial experience through targeted access, personalized checkpoints, review paths, JA support, and intervention progress tracking. That is defensible. Calling it a complete LXP replacement would be harder to sustain.
6. Evidence to cite from paper/repo/system:
- Concept paper positions the LXP as an intervention component rather than general student use.
- Repo: LXP tables include intervention_cases, intervention_assignments, and lxp_progress.
- Repo: student JA/LXP surfaces route students into guided review and replay flows.
7. What not to say: Do not insist it has every hallmark of a commercial LXP if the panel challenges personalization depth.
8. If the feature is incomplete, safest honest answer: If pushed, say the current capstone scope focuses on intervention-oriented LXP features rather than broad enterprise personalization.
9. Follow-up questions they may ask:
- Where is learner autonomy?
- What makes this more than a remedial tab?
### 10. How are system evaluations stored?
1. Why the panelist might ask it: This links methodology claims to schema.
2. Risk level: High
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 11. How are audit records stored and queried?
1. Why the panelist might ask it: Auditability question.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 12. How do you store extracted modules before teacher approval?
1. Why the panelist might ask it: Important extraction-state question.
2. Risk level: Medium
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 13. How do you store embeddings?
1. Why the panelist might ask it: Another direct RAG database question.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 14. What happens to official class records when intervention occurs?
1. Why the panelist might ask it: Data boundary question.
2. Risk level: High
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 15. How do you keep grade-level scope constrained in the database?
1. Why the panelist might ask it: Schema-level scope control question.
2. Risk level: Medium
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 16. How do you handle indexing and query performance for retrieval?
1. Why the panelist might ask it: This is a fair vector-query performance question.
2. Risk level: Medium
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 17. What data would you seed before a defense demo?
1. Why the panelist might ask it: Demo planning often comes down to data quality.
2. Risk level: High
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 18. What table would be the first place to inspect if threshold gating looked wrong?
1. Why the panelist might ask it: A practical debugging question.
2. Risk level: Medium
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 19. What table would prove that AI interactions are really logged?
1. Why the panelist might ask it: They want concrete evidence paths.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 20. If the panel asks whether your schema is already stable for production, what do you say?
1. Why the panelist might ask it: Schema maturity is another overclaim trap.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
## Mobile and Web Implementation Questions
### 1. What web roles are strongest today?
1. Why the panelist might ask it: They are checking practical role parity.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 2. What mobile roles are strongest today?
1. Why the panelist might ask it: Parity challenge.
2. Risk level: High
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 3. Can students authenticate on mobile with OTP and password recovery flows?
1. Why the panelist might ask it: Paper-to-code parity question.
2. Risk level: High
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 4. Can teachers work on mobile?
1. Why the panelist might ask it: This requires a nuanced current-state answer.
2. Risk level: High
3. Best safe answer: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
4. Short answer version: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
5. Long answer version: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
6. Evidence to cite from paper/repo/system:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
7. What not to say: Do not promise full feature parity until you have live proof on the defense device.
8. If the feature is incomplete, safest honest answer: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
9. Follow-up questions they may ask:
- Which teacher actions are proven?
- What remains web-only?
### 5. Can administrators work fully on mobile?
1. Why the panelist might ask it: A likely parity trap.
2. Risk level: High
3. Best safe answer: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
4. Short answer version: Admin mobile is not a defense centerpiece.
5. Long answer version: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
7. What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
8. If the feature is incomplete, safest honest answer: If asked, say administration remains strongest on web in the current scope.
9. Follow-up questions they may ask:
- Why include admin mobile at all?
- Is it functional or just a shell?
### 6. Why is the web app still the primary admin surface?
1. Why the panelist might ask it: This tests channel prioritization.
2. Risk level: Medium
3. Best safe answer: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
4. Short answer version: Admin mobile is not a defense centerpiece.
5. Long answer version: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
7. What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
8. If the feature is incomplete, safest honest answer: If asked, say administration remains strongest on web in the current scope.
9. Follow-up questions they may ask:
- Why include admin mobile at all?
- Is it functional or just a shell?
### 7. How do web and mobile differ in scope today?
1. Why the panelist might ask it: Scope clarity question.
2. Risk level: High
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 8. Can students access JA/LXP on mobile?
1. Why the panelist might ask it: A specific capability question.
2. Risk level: Medium
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 9. How are mobile routes organized?
1. Why the panelist might ask it: This is a technical cross-platform question.
2. Risk level: Medium
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 10. What happens if a teacher signs into the mobile app?
1. Why the panelist might ask it: This checks current role routing.
2. Risk level: Medium
3. Best safe answer: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
4. Short answer version: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
5. Long answer version: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
6. Evidence to cite from paper/repo/system:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
7. What not to say: Do not promise full feature parity until you have live proof on the defense device.
8. If the feature is incomplete, safest honest answer: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
9. Follow-up questions they may ask:
- Which teacher actions are proven?
- What remains web-only?
### 11. What happens if an admin signs into the mobile app?
1. Why the panelist might ask it: Current admin limitation question.
2. Risk level: Medium
3. Best safe answer: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
4. Short answer version: Admin mobile is not a defense centerpiece.
5. Long answer version: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
7. What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
8. If the feature is incomplete, safest honest answer: If asked, say administration remains strongest on web in the current scope.
9. Follow-up questions they may ask:
- Why include admin mobile at all?
- Is it functional or just a shell?
### 12. Does the mobile app depend on the same backend as the web app?
1. Why the panelist might ask it: Integration basics.
2. Risk level: Medium
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 13. How do you justify claiming both web and mobile accessibility?
1. Why the panelist might ask it: This attacks breadth claims.
2. Risk level: High
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 14. What mobile feature should not be overpromised during defense?
1. Why the panelist might ask it: Strategic communication question.
2. Risk level: High
3. Best safe answer: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
4. Short answer version: Admin mobile is not a defense centerpiece.
5. Long answer version: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
7. What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
8. If the feature is incomplete, safest honest answer: If asked, say administration remains strongest on web in the current scope.
9. Follow-up questions they may ask:
- Why include admin mobile at all?
- Is it functional or just a shell?
### 15. If a panelist asks to switch roles live on mobile, what should you do?
1. Why the panelist might ask it: Demo survival question.
2. Risk level: High
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 16. How do mobile assessment flows compare with web assessment flows?
1. Why the panelist might ask it: Cross-platform behavior question.
2. Risk level: Medium
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 17. How do mobile auth screens reflect the backend contract?
1. Why the panelist might ask it: Contract traceability question.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 18. How should you describe teacher mobile if not every action has been live-verified today?
1. Why the panelist might ask it: This tests safe phrasing discipline.
2. Risk level: High
3. Best safe answer: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
4. Short answer version: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
5. Long answer version: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
6. Evidence to cite from paper/repo/system:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
7. What not to say: Do not promise full feature parity until you have live proof on the defense device.
8. If the feature is incomplete, safest honest answer: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
9. Follow-up questions they may ask:
- Which teacher actions are proven?
- What remains web-only?
### 19. How should you describe admin mobile if asked directly?
1. Why the panelist might ask it: Another safe-phrasing test.
2. Risk level: High
3. Best safe answer: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
4. Short answer version: Admin mobile is not a defense centerpiece.
5. Long answer version: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
7. What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
8. If the feature is incomplete, safest honest answer: If asked, say administration remains strongest on web in the current scope.
9. Follow-up questions they may ask:
- Why include admin mobile at all?
- Is it functional or just a shell?
### 20. If the web app works but mobile is unstable, what is the honest defense answer?
1. Why the panelist might ask it: A realistic live-demo contingency question.
2. Risk level: High
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
## Demo Attack Questions
### 1. Show me the login flow right now.
1. Why the panelist might ask it: A demo-focused panelist starts with basic credibility.
2. Risk level: High
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 2. Show me the role-based dashboards.
1. Why the panelist might ask it: They want to know if roles are real.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
### 3. Show me where the 74% threshold is visible.
1. Why the panelist might ask it: They want to verify the core intervention rule.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 4. Show me a student who triggered intervention.
1. Why the panelist might ask it: This tests whether seeded data is ready.
2. Risk level: Critical
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 5. Show me JAKIPIR answering from class material.
1. Why the panelist might ask it: This is a likely demo request.
2. Risk level: High
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 6. Show me a PDF extraction and what happens after it finishes.
1. Why the panelist might ask it: This is an attractive but risky AI demo request.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 7. Show me that teachers can review AI output before applying it.
1. Why the panelist might ask it: They are checking governance, not just AI flash.
2. Risk level: High
3. Best safe answer: The extraction feature is real, but it should be defended as teacher-reviewed AI assistance rather than one-click perfect content conversion.
4. Short answer version: PDF extraction exists, but the safe claim is teacher-reviewed AI-assisted drafting.
5. Long answer version: The strongest defense is that Nexora automates the first drafting pass from uploaded materials and then expects teachers to review, edit, and apply the output. That matches both technical reality and safer academic language. We should avoid describing extraction as a fully autonomous curriculum authoring engine.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service README and extraction pipeline implement extract, status, patch, and apply flows.
- Repo: backend/src/drizzle/schema/ai-mentor.schema.ts stores extracted_modules with statuses and isApplied flag.
- Repo: teacher extraction and AI draft routes exist in next-frontend.
7. What not to say: Do not say uploaded PDFs are always parsed perfectly, especially for scanned or messy files.
8. If the feature is incomplete, safest honest answer: If extraction quality is questioned, say the feature accelerates teacher preparation but still depends on teacher review before applied lesson content becomes part of class workflow.
9. Follow-up questions they may ask:
- What if the PDF is scanned?
- Can formulas and images fail?
- Can teachers reject AI output?
### 8. Show me a report export.
1. Why the panelist might ask it: Export paths often break under pressure.
2. Risk level: Medium
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 9. Show me the audit trail.
1. Why the panelist might ask it: A good panelist likes accountability features.
2. Risk level: Medium
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 10. Show me what happens when a student scores exactly 74%.
1. Why the panelist might ask it: This is a rule edge case demonstration.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 11. Show me the mobile app for an administrator.
1. Why the panelist might ask it: This is a dangerous parity request.
2. Risk level: Critical
3. Best safe answer: Admin mobile support should be treated as limited. The current mobile codebase includes placeholder-style admin workspace sections rather than full parity.
4. Short answer version: Admin mobile is not a defense centerpiece.
5. Long answer version: The mobile navigator resolves admin roles, but the admin tabs point to a generic RoleWorkspaceScreen rather than full operational admin workflows. That is not a fatal capstone issue because the project is still web-first for administration, but it becomes a problem only if the team overclaims mobile parity.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/AppNavigator.tsx maps admin tabs to RoleWorkspaceScreen.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx contains placeholder explanatory text.
7. What not to say: Do not offer to demo admin mobile unless explicitly required and clearly framed as limited.
8. If the feature is incomplete, safest honest answer: If asked, say administration remains strongest on web in the current scope.
9. Follow-up questions they may ask:
- Why include admin mobile at all?
- Is it functional or just a shell?
### 12. Show me the mobile app for a teacher.
1. Why the panelist might ask it: This can work only if the demo device is prepared.
2. Risk level: High
3. Best safe answer: Teacher mobile is materially better than a placeholder because teacher tabs and detail screens exist, but it still should not be described as full web parity unless verified live.
4. Short answer version: Teacher mobile exists in code, but it is still safer to treat web as the primary teacher surface.
5. Long answer version: The current mobile app includes teacher home, classes, assessments, announcements, profile, and detail screens in its navigator. That is a meaningful capability increase over older repo states. Still, without a live teacher walkthrough in this run, the defense-safe position is that teacher workflows exist on mobile in prototype form while the web interface remains the main teacher workspace.
6. Evidence to cite from paper/repo/system:
- Repo: AppNavigator includes TeacherTabs and TeacherNavigator.
- Repo: teacher screens exist under mobile/src/screens.
7. What not to say: Do not promise full feature parity until you have live proof on the defense device.
8. If the feature is incomplete, safest honest answer: Use 'teacher mobile workflows are present in prototype scope' if you cannot verify every flow live.
9. Follow-up questions they may ask:
- Which teacher actions are proven?
- What remains web-only?
### 13. Show me system health or diagnostics.
1. Why the panelist might ask it: They want proof that architecture claims are real.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 14. Show me what happens if the AI is down.
1. Why the panelist might ask it: This probes resilience and honesty.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 15. Show me how the system avoids AI-based grade tampering.
1. Why the panelist might ask it: This is a conceptual demo question.
2. Risk level: High
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 16. Use a random account instead of your prepared seed data.
1. Why the panelist might ask it: This is a classic demo ambush.
2. Risk level: Critical
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 17. Can you switch quickly from student to teacher to admin live?
1. Why the panelist might ask it: Role switching can expose session or data issues.
2. Risk level: High
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 18. What if the backend suddenly fails during the demo?
1. Why the panelist might ask it: They want to see whether the team can recover calmly.
2. Risk level: Critical
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 19. What if Ollama is still loading the model?
1. Why the panelist might ask it: AI latency is a real demo risk.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 20. If something breaks live, what can you still prove from the repo?
1. Why the panelist might ask it: A fair but sharp defense question.
2. Risk level: High
3. Best safe answer: Nexora is a prototype LMS with targeted LXP-style intervention features. Its strongest demonstrated value is the integration between class workflows, assessment performance, and remedial follow-up inside one school-focused system.
4. Short answer version: Nexora is a school-focused LMS prototype with targeted intervention and AI-assisted support, not a claim of full platform replacement.
5. Long answer version: Within the current capstone scope, Nexora demonstrates an integrated learning workflow rather than a generic portal. The LMS side handles classes, lessons, assessments, records, and role-based dashboards. The LXP side is narrower: it uses performance signals to open guided remedial access for struggling learners. That is the core contribution we can defend confidently.
6. Evidence to cite from paper/repo/system:
- Concept paper: LMS plus LXP for targeted intervention with below-74% access control.
- Repo: backend modules for classes, lessons, assessments, performance, LXP, JA, reports, audit, and AI proxy.
- Repo: next-frontend role dashboards for admin, teacher, and student.
7. What not to say: Do not say Nexora fully transforms education or fully replaces existing school systems.
8. If the feature is incomplete, safest honest answer: The safest honest phrasing is that the system is implemented in prototype scope and demonstrates the intended intervention workflow under controlled school-centered conditions.
9. Follow-up questions they may ask:
- Which exact features are already stable?
- Which claims are still only partially validated?
## Deployment and Feasibility Questions
### 1. Can a public high school realistically run this system?
1. Why the panelist might ask it: Feasibility matters.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 2. What hardware is required for the AI-enabled version?
1. Why the panelist might ask it: This is a practical cost question.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 3. Can the core LMS still work without the AI stack?
1. Why the panelist might ask it: This tests graceful degradation.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 4. How expensive is long-term AI hosting?
1. Why the panelist might ask it: A skeptical business panelist will ask this.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 5. Why use local Ollama instead of a pure cloud API?
1. Why the panelist might ask it: This probes cost, privacy, and speed tradeoffs.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 6. Who maintains the stack after the capstone?
1. Why the panelist might ask it: Operational sustainability question.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 7. How much technical skill would school staff need?
1. Why the panelist might ask it: Training burden question.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 8. What is your fallback when internet or local networking fails?
1. Why the panelist might ask it: Resilience question.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 9. Can the school adopt Nexora without GPU hardware?
1. Why the panelist might ask it: Another practical feasibility question.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 10. Is your observability stack necessary for school deployment or mainly for technical operations?
1. Why the panelist might ask it: This tests whether the team understands operator priorities.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 11. Why is backend readiness more important than frontend appearance during deployment?
1. Why the panelist might ask it: A systems-thinking question.
2. Risk level: Medium
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 12. What would you deploy first in a pilot?
1. Why the panelist might ask it: They want phased adoption reasoning.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 13. What is the safest school rollout strategy?
1. Why the panelist might ask it: Change management question.
2. Risk level: Medium
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 14. What part of the architecture is most likely to raise cost or maintenance burden?
1. Why the panelist might ask it: They want honest prioritization.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 15. What is your strongest honest deployment claim today?
1. Why the panelist might ask it: This is a strategic closeout question.
2. Risk level: High
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
## Trap Questions
### 1. Is the AI fully accurate?
1. Why the panelist might ask it: A careless yes would seriously damage credibility.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 2. Is Nexora ready for production deployment today?
1. Why the panelist might ask it: Overclaim trap.
2. Risk level: Critical
3. Best safe answer: Nexora is better defended as deployable in pilot conditions than as already ready for unrestricted production rollout.
4. Short answer version: It is demo-capable and pilot-oriented, not something we should overstate as school-wide production-ready.
5. Long answer version: The repository has Docker, observability, pgvector, Redis, and AI service integration, which is more mature than a typical capstone. But live deployment claims should still stay modest because uptime, cost, training, operations, and policy approval are separate problems from code completeness. The safest answer is that the system is technically deployable for a controlled pilot and designed with production-minded components, but not yet defended as fully deployed institutional infrastructure.
6. Evidence to cite from paper/repo/system:
- Repo: root docker-compose.yml provisions PostgreSQL, Redis, Ollama, backend, frontend, and monitoring stack.
- Repo: README documents observability, environment variables, and deployment notes.
- Current runtime check: frontend and ai-service reachable, backend not currently listening.
7. What not to say: Do not say it is already production-ready for any public school without operational validation.
8. If the feature is incomplete, safest honest answer: If asked about readiness, say the architecture is deployment-minded, but the defense claim is prototype readiness for controlled pilot use.
9. Follow-up questions they may ask:
- What hardware is required?
- Who will maintain it?
- What if Ollama is slow?
### 3. Does the AI replace the teacher during remediation?
1. Why the panelist might ask it: Ethics and pedagogy trap.
2. Risk level: Critical
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 4. Can your system support all grade levels and all subjects right now?
1. Why the panelist might ask it: Scope overclaim trap.
2. Risk level: Critical
3. Best safe answer: The safe defense scope is Grades 7 to 10 at Gat Andres Bonifacio High School, with deployment breadth kept narrower than the broadest wording in the paper.
4. Short answer version: We should defend the system as scoped to Grades 7 to 10 in one school context.
5. Long answer version: The repository enforces grade-level values of 7, 8, 9, and 10, so the strongest defensible scope is that range inside Gat Andres Bonifacio High School. Some paper wording still sounds like all subjects and all high-school-wide deployment have already been proven. For defense, we should present that as intended institutional scope, not as fully validated breadth.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/common/utils/grade-level.util.ts restricts grade levels to 7, 8, 9, and 10.
- Repo: backend/src/drizzle/schema/base.schema.ts uses grade_level enum ['7','8','9','10'].
- Paper extract: still contains 'all subjects and grade levels' wording.
7. What not to say: Do not say the system has already been proven across every subject and every possible high-school deployment scenario.
8. If the feature is incomplete, safest honest answer: We can say the design targets Grades 7 to 10 and is structurally extensible, but broader validation remains future work.
9. Follow-up questions they may ask:
- Why not include senior high?
- How many subjects were actually seeded or demonstrated?
### 5. Is the LXP already proven effective at improving grades?
1. Why the panelist might ask it: Methodology trap.
2. Risk level: Critical
3. Best safe answer: The main methodological weakness is not that the system is empty, but that implementation depth currently exceeds the strength of the measured evaluation evidence. The answer should admit that distinction directly.
4. Short answer version: Our implementation evidence is stronger than our formal outcome evidence, so we should avoid claiming proven educational effectiveness.
5. Long answer version: A strong defense answer is that this capstone primarily validates feasibility, workflow integration, and prototype functionality. The repository includes a system_evaluations feature and the paper promises evaluation dimensions such as usability, functionality, reliability, and portability, but that does not automatically prove actual learning gains yet. We should say the current study demonstrates system design and prototype behavior, while larger-scale educational impact evaluation remains future work.
6. Evidence to cite from paper/repo/system:
- Paper extract: repeatedly promises functionality, reliability, usability, and portability evaluation.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines system_evaluations.
- Repo audits previously observed sparse or absent live evaluation records.
7. What not to say: Do not say the platform is already proven effective in improving school outcomes unless you have respondent data and statistical treatment ready.
8. If the feature is incomplete, safest honest answer: The honest fallback is that the capstone validates the system artifact and workflow logic first, while large-sample outcome validation should be treated as a subsequent study.
9. Follow-up questions they may ask:
- How many respondents did you have?
- What statistics did you compute?
- Where are your measured results?
### 6. Can you guarantee there will never be hallucinations?
1. Why the panelist might ask it: AI overclaim trap.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
### 7. Does mobile fully match the web system?
1. Why the panelist might ask it: Parity overclaim trap.
2. Risk level: Critical
3. Best safe answer: The mobile story should be defended carefully: student workflows are the strongest, teacher mobile has meaningful surfaces in the current codebase, and admin mobile is still limited.
4. Short answer version: Mobile exists, but parity is not equal across roles.
5. Long answer version: The current mobile app contains real student flows, auth recovery screens, JA/LXP access, assessments, and profile screens. It also includes teacher navigation and detail screens, while admin routes remain placeholder-level. The safest defense is to present mobile as role-asymmetric rather than claiming full parity with the web system.
6. Evidence to cite from paper/repo/system:
- Repo: mobile/src/navigation/types.ts includes Login, VerifyEmail, ForgotPassword, ResetPassword, SetInitialPassword.
- Repo: mobile/src/navigation/AppNavigator.tsx includes teacher tabs and teacher detail screens.
- Repo: mobile/src/screens/RoleWorkspaceScreen.tsx shows admin mobile placeholder sections.
7. What not to say: Do not say all web features are fully available on mobile.
8. If the feature is incomplete, safest honest answer: If asked about missing parity, say the capstone prioritized student mobile access first and role expansion remains staged.
9. Follow-up questions they may ask:
- Can admin work fully on mobile?
- Can teacher do every class action on mobile?
### 8. Does the system already comply completely with all privacy laws?
1. Why the panelist might ask it: Compliance overclaim trap.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 9. Can the AI directly change a student's academic record?
1. Why the panelist might ask it: Domain-boundary trap.
2. Risk level: Critical
3. Best safe answer: AI and LXP outputs are assistive and intentionally separated from official academic records.
4. Short answer version: The system keeps AI guidance separate from official grading records.
5. Long answer version: This is one of the safest technical answers in the repo. The code and schema separate official class-record behavior from AI and intervention surfaces, which is important ethically and defensively. The panel should hear clearly that AI recommendations do not directly overwrite official grades.
6. Evidence to cite from paper/repo/system:
- Repo guidance: backend and ai-service AGENTS emphasize that AI features must not mutate official academic records.
- Repo: class-record, LXP, and AI logging are separate schema areas.
7. What not to say: Do not imply the AI directly changes grades or decides final marks.
8. If the feature is incomplete, safest honest answer: If pushed, say intervention feedback informs support decisions, while teachers and official records remain authoritative.
9. Follow-up questions they may ask:
- Can AI modify scores?
- Can a remedial result alter the official record automatically?
### 10. If a student gets 74%, are they automatically failing?
1. Why the panelist might ask it: Terminology trap around threshold meaning.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 11. Is the 74% threshold universally correct?
1. Why the panelist might ask it: Policy absolutism trap.
2. Risk level: High
3. Best safe answer: The system currently uses 74% as a configurable mastery cutoff for remedial access, and the defense should frame that as a project policy choice aligned to the intervention design, not as a universal educational law.
4. Short answer version: Nexora currently uses a configurable 74% threshold to trigger intervention.
5. Long answer version: In code, the threshold is consistently 74 across performance snapshots, intervention cases, and teacher performance views. The defensible answer is that 74% is the project's current mastery cutoff used to operationalize targeted intervention. We should not pretend that 74 is permanently optimal for every school; instead, we should say it should be validated further against school policy and remediation practice.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/modules/lxp/lxp.service.ts sets INTERVENTION_THRESHOLD = 74.
- Repo: backend/src/drizzle/schema/performance.schema.ts defaults threshold_applied to 74.
- Paper extract: Figure 13 and multiple sections now use 74% wording.
7. What not to say: Do not claim 74% is scientifically perfect or permanently correct for every institution.
8. If the feature is incomplete, safest honest answer: If asked for stronger justification, say the system already supports threshold-based intervention logic and the exact cutoff should be refined with school policy and future validation data.
9. Follow-up questions they may ask:
- Why not 75?
- What happens at exactly 74%?
- Can teachers override it?
### 12. Is every chart in your analytics based on large real-world school data already?
1. Why the panelist might ask it: Data-validity trap.
2. Risk level: High
3. Best safe answer: Reports and analytics exist in code, but presentation quality depends on the available seeded or live data at demo time.
4. Short answer version: The reporting features are real, but their persuasiveness depends on data completeness.
5. Long answer version: The repo contains reports, exports, analytics, performance snapshots, and evaluation routes. However, these screens are only as strong as the data loaded into them. The safest defense is to claim the reporting workflow is implemented, while also preparing realistic seeded data so charts and exports do not look empty or trivial during demo.
6. Evidence to cite from paper/repo/system:
- Repo: reports, analytics, performance, and evaluations modules exist across backend and frontend.
- Prior repo audits noted sparse datasets in some analytics areas.
7. What not to say: Do not imply the analytics have already been validated over long-term real school usage.
8. If the feature is incomplete, safest honest answer: If a chart looks sparse, say the workflow is implemented and currently demonstrated with controlled development data.
9. Follow-up questions they may ask:
- Is this real school data?
- How many records feed these charts?
### 13. If the backend is currently down, does that mean the system is fake?
1. Why the panelist might ask it: A hostile reframing trap.
2. Risk level: High
3. Best safe answer: The codebase is broad, but the current local runtime is not fully healthy because backend port 3000 was unreachable during this audit. That makes demo discipline essential.
4. Short answer version: The biggest immediate demo risk is runtime stability, not absence of code.
5. Long answer version: During this run, the frontend on port 3001 and the AI service on port 8000 were reachable, but the backend on port 3000 was not. That means I could not rely on a full end-to-end live sweep and had to combine runtime checks with static evidence. For defense, the team should treat backend startup and seeded-auth verification as must-fix items before demo day.
6. Evidence to cite from paper/repo/system:
- Current run: localhost:3001 returned HTTP 200.
- Current run: localhost:8000/ready returned ready with Ollama models available.
- Current run: localhost:3000/api/health/live and /ready were unreachable.
7. What not to say: Do not walk into defense saying the whole stack is already stable without rechecking ports, seeded logins, and backend health on the actual machine.
8. If the feature is incomplete, safest honest answer: If the backend is unstable, say the repository implementation is present but the local demo environment needs startup verification before presentation.
9. Follow-up questions they may ask:
- Can you show the health checks?
- What is your fallback if backend fails?
### 14. Can you promise the AI is safe for all minors under every circumstance?
1. Why the panelist might ask it: Absolute safety trap.
2. Risk level: Critical
3. Best safe answer: The repository shows real security controls such as JWT guards, OTP flows, hashed OTP storage, validation pipes, throttling, CORS rules, and audit logging, but compliance claims should still stay practical and not absolute.
4. Short answer version: Security is implemented with concrete controls, but we should avoid absolute guarantees.
5. Long answer version: The backend uses a global JWT guard, a global throttler guard, validation pipes, CORS allowlists, and role-based route protection. OTP codes are hashed with HMAC-SHA256 and never stored in plaintext, and audit logs exist for administrative accountability. That is a strong technical defense. The safer framing is that the project applies core security controls and privacy-aware design, while formal compliance review and institutional policy rollout would still be required before production deployment.
6. Evidence to cite from paper/repo/system:
- Repo: backend/src/app.module.ts wires global JwtAuthGuard and throttling.
- Repo: backend/src/main.ts configures validation, helmet, CORS, and cookie parsing.
- Repo: backend/src/modules/otp/otp.service.ts hashes OTP codes and enforces resend limits.
- Repo: backend/src/modules/audit/audit.service.ts writes audit log entries.
7. What not to say: Do not say the system is unhackable or fully compliant by thesis claim alone.
8. If the feature is incomplete, safest honest answer: If privacy law questions go deeper, say the system is built with role-based access, protected credentials, and auditability, but institutional deployment would still require policy, consent, and governance review.
9. Follow-up questions they may ask:
- How are refresh tokens handled?
- How do you protect minors' data?
- Are AI logs separated from grades?
### 15. Should schools trust the AI without teacher review?
1. Why the panelist might ask it: Oversimplification trap.
2. Risk level: Critical
3. Best safe answer: JAKIPIR is assistive and grounded, not infallible. The safe defense is that it uses class evidence, retrieval, policy controls, and teacher oversight to reduce hallucination risk, while still acknowledging that AI output must be reviewed critically.
4. Short answer version: JAKIPIR is grounded and policy-controlled, but not claimed as perfectly accurate.
5. Long answer version: The code shows real retrieval, lesson bias, pgvector-backed similarity search, AI interaction logs, and class-level AI policies such as source scope and strict grounding. That supports a strong answer that the mentor is designed to stay within visible class material and avoid unsupported guesses. We should still say AI output is assistive, not an official grading authority, and that teacher oversight remains necessary.
6. Evidence to cite from paper/repo/system:
- Repo: ai-service/app/retrieval_service.py implements vector retrieval and source filtering.
- Repo: backend/src/drizzle/schema/lxp.schema.ts defines class_ai_policies including strictGrounding and sourceScope.
- Repo: next-frontend teacher interventions page surfaces AI policy controls.
7. What not to say: Do not say the AI never hallucinates or always gives correct pedagogy.
8. If the feature is incomplete, safest honest answer: If reliability is challenged, say the system is designed to reduce hallucination risk through grounding and policy controls, but teacher review remains part of safe use.
9. Follow-up questions they may ask:
- What prevents cheating help?
- What happens when evidence is weak?
- Can the teacher disable AI?
