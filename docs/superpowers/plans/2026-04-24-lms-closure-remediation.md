# LMS Closure Remediation Plan - 2026-04-24

## Wave 1 - Demo-Critical Closure
1. Finish teacher class-card click verification.
   - Reproduce with a manual browser click pass, not only automation.
   - If pointer navigation is still inconsistent, simplify card hit areas further and remove any nonessential overlay layers.
2. Repair or replace `next-frontend/scripts/engine-perf-smoke.js`.
   - Decide whether `Export Engine YAML` is still a product requirement.
   - If yes, restore a visible export affordance and cover it.
   - If no, rewrite the smoke to measure the current `Save Draft` / `Publish` / `Add Module` workflow.
3. Stabilize `next-frontend/scripts/discussion-perf-smoke.js` for the student leg.
   - Remove hardcoded assumptions that drift with seeded IDs or redirects.
   - Make the script resolve the student class link the same way it already does for teacher.

## Wave 2 - Performance Hardening
1. Reduce teacher class-detail and discussion warm timings below `1000ms`.
   - Profile class-detail data fetching and eliminate duplicate fetches.
   - Cache or batch teacher dashboard card metrics where possible.
2. Keep `student_ja` under the current sub-second baseline.
   - Preserve the stable backend state that removed the earlier `2129ms` cold hit.
   - Add a regression threshold to the perf report so a future 4-digit regression is caught immediately.

## Wave 3 - Backend and AI Hardening
1. Leave `backend/scripts/post-seed-smoke.js` aligned with the intervention lifecycle.
   - Keep open-case validation tolerant of both `pending` and `active`.
2. Separate AI readiness language into:
   - live-verified
   - test-verified
   - not yet live-exercised
3. Add one explicit end-to-end live exercise for:
   - teacher quiz generation job
   - teacher intervention recommendation job
   - student JA session bootstrap plus one follow-up turn

## Wave 4 - Frontend Design and QoL
1. Push teacher `My Classes` toward teacher work, not student momentum language.
   - Replace generic stats with due grading, pending interventions, and discussion activity.
   - Add clearer quick actions for `Open Class`, `View Lessons`, and creation paths.
2. Clean demo seed content.
   - Remove placeholder-like announcement titles and other obviously synthetic copy.
3. Tighten empty/error/loading states on dense admin and teacher pages.
   - Keep the current campus-red design language, but reduce ambiguity in actionable states.

## Wave 5 - Test and Tooling Hygiene
1. Investigate the frontend Jest worker-shutdown warning and close open handles.
2. Decide how much backend ESLint debt must be retired for release readiness.
   - At minimum, isolate the highest-risk `no-unsafe-*` findings in shared auth, guard, and service code.
3. Keep unit and e2e boundaries clean.
   - The `tests/e2e` ignore in frontend Jest should remain unless the test runner strategy is redesigned.
