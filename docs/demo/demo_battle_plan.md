# Demo Battle Plan
## Recommended Demo Order
- Start with backend health confirmation and stable login.
- Show web role-based dashboards: admin, teacher, student.
- Show teacher class, lesson, and assessment management.
- Show student assessment result and the path to intervention logic.
- Show a prepared below-74% intervention case.
- Show JA/JAKIPIR only if the backend and ai-service are both healthy and warm.
- Show one stable report/export path.
- End with admin governance features such as audit trail or diagnostics.
## Accounts Needed
- 1 stable admin account with populated reports and audit visibility.
- 1 stable teacher account with at least one active class, lessons, assessments, and an intervention case.
- 1 student account above threshold for normal flow.
- 1 student account below threshold for intervention and JA/LXP flow.
- 1 backup student account in case the main intervention seed behaves unexpectedly.
## Seed Data Needed
- At least one class with published lessons and a published assessment.
- At least one failed attempt below 74% that clearly triggers an intervention case.
- At least one successful attempt at or above 74% for contrast.
- One prepared PDF and one already-completed extraction for fallback proof.
- At least one report/export dataset that does not render empty.
- Preferably a few system evaluation entries if the evaluation module will be shown.
## Demo Confidently
- Web login and role separation.
- Teacher class and assessment workflow.
- Student assessment result review.
- 74% threshold explanation using prepared data.
- Audit trail or diagnostics on the admin side.
## Demo Only If Asked
- Live PDF extraction from a new file.
- Teacher mobile workflow.
- Any chart or analytics screen that looks sparse.
- AI-heavy remedial generation if Ollama is cold.
- Admin mobile.
## Avoid Demoing Live Unless Forced
- Admin mobile placeholder routes.
- Random unprepared accounts.
- Any feature requiring a currently unhealthy backend service.
- Long extraction or generation jobs without a fallback artifact.
- Screens that depend on data you have not checked the same day.
## Backup Artifacts to Prepare
- Screenshots of healthy backend readiness, ai-service readiness, and key dashboards.
- Screenshots or a short video of a successful extraction review and apply flow.
- Screenshots of JA/JAKIPIR responding with grounded help.
- Screenshots of an intervention case opened below threshold.
- One export file and one analytics/report page with realistic data.
## If AI Is Slow
Say: `The AI-assisted features run asynchronously and are the most compute-sensitive part of the stack. We prepared successful outputs beforehand so we can still show the validated workflow without wasting the panel's time waiting on inference.`
## If Backend Fails
Say: `The current local environment needs recovery, but the implementation boundaries are real. We can still show the verified architecture, the current code paths, and prepared runtime evidence while we explain the exact backend dependency that failed.`
## If Mobile Fails
Say: `The mobile prototype is part of the system scope, but the web flow is the stronger validated demonstration surface today. We can still explain the mobile architecture and show prepared proof of the supported mobile routes.`
## If the Panelist Asks for a Random Account
Say: `For consistency and to avoid exposing incomplete test data, we prepared seeded accounts that represent each validated workflow clearly. We can still explain how the same logic applies across roles and users.`
## If the Panelist Asks Why a Feature Is Missing
Say: `The current capstone scope prioritized the integrated LMS-to-intervention workflow first. That missing area is a recognized extension path, but we did not want to overclaim features beyond what we could implement and defend responsibly.`
## Emergency Fallback
- If backend is unhealthy, stop live clicks immediately and pivot to prepared screenshots, paper-code evidence, and the architecture explanation.
- If AI is unhealthy, continue with LMS, threshold logic, reports, audit, and intervention explanation using saved outputs.
- If mobile is unstable, keep all role demonstrations on web and show only prepared mobile artifacts.
- Never improvise with unknown accounts under panel pressure.
