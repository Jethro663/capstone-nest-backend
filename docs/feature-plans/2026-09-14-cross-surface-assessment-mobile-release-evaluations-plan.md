# Cross-surface assessment, student mobile, APK, and evaluations design-solution-implementation plan

Date: 2026-09-14
Phase: 2 — decision and implementation plan
Authoritative evidence: `docs/feature-analysis/2026-09-14-cross-surface-assessment-mobile-release-evaluations-analysis.md`
Implementation target: current `developement` checkout, beginning at `2379d072`

## Outcome

Ship one coherent release that:

1. routes module-created assessments through the existing guided basic-settings wizard;
2. makes student Home a compact, recognizable GABHS dayboard rather than a long cascade of text cards;
3. contains active question attempts inside the mobile taker, clearly explains/records violations, and exempts file-upload workflows;
4. makes old-to-current APK upgrades reliable by keeping policy registration synchronized with the verified hosted artifact;
5. restores admin campaign creation for supported clients and protects the form with a real rendered interaction test and clear feedback.

No database schema, public API shape, role authority, AI service, assessment violation threshold, or academic lifecycle rule changes.

## Evidence gate

Every planned production change maps to a Phase 1 fact:

| Planned change                                                            | Evidence IDs |
| ------------------------------------------------------------------------- | ------------ |
| Adopt `NewAssignmentWizard` in the module page                            | E1-E5        |
| Redesign only the active `StudentHomeView` and consolidate priority logic | E6-E10       |
| Add question-attempt containment/warnings and file-upload exemption       | E11-E17      |
| Add stale-policy recovery and automatic post-deploy registration          | E18-E23      |
| Strengthen admin campaign interaction evidence/feedback                   | E24-E28      |

Unknowns are not converted into facts: the reporter's exact admin device build remains unknown, so the plan fixes the confirmed update deadlock and adds campaign-form regression evidence without changing its valid backend contract.

## Keep / Change / Frozen / Unknown

| Status  | Decision                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep    | `NewAssignmentWizard`, `createFromSetup`, its recovery key, format immutability, class-record placement, and draft-first behavior.                                                        |
| Keep    | Existing-assessment attach, lesson/file block creation, and module ordering behavior.                                                                                                     |
| Keep    | Dashboard query bridges and existing navigation destinations.                                                                                                                             |
| Keep    | Backend-owned assessment attempt state, three-violation auto-submit, timers, random order, and progress sync.                                                                             |
| Keep    | APK size and SHA-256 enforcement, monotonic version registration, Android-only admission, iOS isolation.                                                                                  |
| Keep    | Evaluation DTO/controller/service, RBAC, active-campaign assignment creation, and audit logging.                                                                                          |
| Change  | Module create-new handoff, Student Home presentation/priority owner, question-attempt route containment, verification retry, release registration automation, campaign UI feedback/tests. |
| Frozen  | Web assessment taker behavior except as comparison evidence.                                                                                                                              |
| Frozen  | Backend assessment and campaign contracts unless a failing test proves current source does not honor them.                                                                                |
| Frozen  | GABHS red/white/navy identity and current mobile navigation hierarchy.                                                                                                                    |
| Unknown | Reporter device build and exact campaign error text; do not invent a second campaign root cause.                                                                                          |

## Design options and decisions

### A. Teacher module create-new handoff

1. **Recommended — reuse the wizard in place.** Close the Add Block picker, open `NewAssignmentWizard` with the same class and authenticated actor, then attach the returned assessment to the stored section. This preserves the current module context and one canonical creation contract.
2. Route the teacher to the class Assignments tab. This avoids a second wizard mount but loses the selected module section and forces a return trip.
3. Duplicate the wizard's basic fields inside Add Block. This recreates the drift that caused the report.

Decision: option 1.

Failure design: creation and attachment are two durable operations. If creation succeeds and attachment fails, refresh assessments, reopen the existing-assessment attach state with the created ID selected, and show “Assessment created, but not attached.” Never call `createFromSetup` again for that recovery.

### B. Student Home structure

1. Add more artwork and color to the current stacked cards. Fast, but keeps the exact cascading geometry the user rejected.
2. **Recommended — compact student dayboard.** A useful, modest-height “Today” introduction with the existing JA mascot; one dominant next action; a concise schedule timeline; two side-by-side follow-up actions; one school update row. It uses real data and reduces repeated heading/card patterns.
3. Split Home into tabs or a carousel. This reduces scrolling but hides information and adds navigation state to a page meant to orient students quickly.

Decision: option 2.

Visual direction:

- White top bar remains fixed by `StudentScreen`.
- Intro surface uses solid deep navy with a thin campus-red accent, not a gradient, glass effect, or oversized marketing hero.
- `ja_cheer.png` is a small orientation/empty-state anchor, not decoration that displaces work.
- The primary action is the only high-emphasis card.
- “Continue” and “Due work” share one row at phone widths; they wrap only when accessibility text size requires it.
- Schedule is a compact timeline with maximum four entries from the agenda model.
- Empty state has one useful action and encouraging copy; it does not manufacture metrics or filler activity.
- Red, white, navy, existing semantic amber/green, typography, 44–48px touch targets, and reduced-motion behavior remain consistent.

### C. Mobile assessment containment

1. Block only the visible header back button. Hardware back, gestures, and programmatic navigation remain gaps.
2. **Recommended — attempt-aware containment at screen and navigator levels.** Disable the stack gesture, intercept all removal/back actions while a non-file-upload attempt is ongoing, show an immediate stay/submit warning, keep a persistent “Attempt in progress” strip with server violation count, and record lifecycle violations once.
3. Add a global app-wide assessment-session provider. This can display an indicator outside the taker but is unnecessary after in-app exit is contained and creates a second attempt-state owner.

Decision: option 2.

Policy matrix:

| State                             | Header/hardware/gesture     | Screen capture                  | App background                               | Warning                            |
| --------------------------------- | --------------------------- | ------------------------------- | -------------------------------------------- | ---------------------------------- |
| Preparing question attempt        | Stay on screen              | Prevent                         | Do not count until attempt ID exists         | Preparation status                 |
| Active question attempt           | Block exit                  | Prevent and register screenshot | Register one transition and resync on return | Persistent strip + immediate alert |
| Submitted/locked question attempt | Allow result navigation     | Release on cleanup              | No new violation                             | Submitted/locked state             |
| File-upload attempt               | Allow ordinary back/pickers | Do not register as anti-cheat   | Do not register picker lifecycle             | Upload guidance only               |

Android Home/Recents cannot be blocked; lifecycle detection and server registration remain the correct boundary.

### D. APK release consistency

1. Document the manual registration command. This repeats the existing hidden operational dependency.
2. **Recommended — verified post-deploy registration plus one policy-change retry.** After the CI-tested frontend deployment is healthy, verify the public manifest and stream/hash the public APK, register exactly that manifest through Railway-injected `CI_ADMIN_SECRET`, then assert old/current admission responses. On device, retry verification once only when a fresh policy describes a different package.
3. Make the backend discover release metadata from the frontend on every version check. This couples API availability and admission latency to another service and weakens backend policy ownership.

Decision: option 2.

Ordering invariant:

```text
CI validates repository source + APK + manifest
  -> backend deploy succeeds
  -> frontend deploy succeeds
  -> public manifest and APK bytes match the tested revision
  -> exact manifest is registered
  -> old/current version checks match the new policy
```

Registration must fail the deployment job if live bytes, hash, size, version, secret availability, POST response, or post-registration policy checks disagree. Logs may show public metadata but never the secret.

### E. Admin campaign creation

1. Change the campaign DTO/backend service speculatively. Phase 1 found no contract mismatch, so this would be unjustified.
2. **Recommended — resolve admission and protect the existing form.** Keep the contract, add a rendered interaction test for request/success/error behavior, show explicit success feedback, and label `APP_UPDATE_REQUIRED` as “Update required” rather than a generic campaign failure.
3. Add a parallel web-only campaign creator. This does not fix mobile and creates feature divergence.

Decision: option 2.

## Navigation and state behavior

### Teacher module

```text
Module sections
  -> Add Block
  -> Assessment
  -> Create New / Open basic settings
  -> NewAssignmentWizard
     Close -> return to unchanged module section
     Success -> attach to stored section
        Success -> refresh -> assessment editor ?created=1
        Failure -> refresh -> existing-assessment recovery selected
```

Browser Back/Escape follows the wizard's current dialog behavior. The existing-assessment path never opens the wizard.

### Student Home

- Menu, notifications, intervention, and system bridges remain above/around Home exactly as today.
- Next action routes to assessment detail, lesson detail, class detail, or Classes using existing parameters.
- Schedule routes to class detail; full calendar remains available.
- The two compact follow-ups route to lesson/assessment lists or their detail.
- Latest school update routes to calendar.
- Loading/partial error remains inline; sparse content produces a purposeful “day is clear” state.

### Assessment taker

- Back during an active question attempt shows one warning and remains on the screen.
- Successful/manual/automatic submit sets the existing leave bypass before replacement navigation.
- App background registers at most once per active→inactive/background episode; foreground resynchronizes and surfaces the returned count.
- Locked/auto-submitted attempts route to results through the existing backend-owned state.
- File uploads retain document/image picker and back behavior.

## Architecture and contract impact

| Layer                   | Change                                                                                           | Contract effect                      |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Web module page         | Mount wizard and attach callback                                                                 | No public API change                 |
| Web wizard              | Reused unchanged unless a failing integration test requires a narrowly typed callback adjustment | Existing creation contract preserved |
| Mobile Home view/model  | Presentation and single priority owner                                                           | Props/navigation preserved           |
| Mobile taker/navigation | Guard predicate, warning strip, route gesture option                                             | Existing attempt APIs preserved      |
| Mobile updater          | One bounded fresh-policy retry                                                                   | Existing version response preserved  |
| CI/deploy scripts       | Verify live release, secret-backed register, post-check                                          | Existing registration endpoint used  |
| Admin Evaluations       | Feedback and rendered interaction coverage                                                       | Existing campaign DTO preserved      |
| Packaged APK            | Version `0.1.40`, build 41, ARM64 release artifact                                               | Monotonic native release             |

## Test-driven implementation tasks

### Task 1 — teacher module uses canonical assignment creation

Files:

- Modify `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.test.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/modules/[moduleId]/page.tsx`

Steps:

- [ ] Replace the old test expectation with a failing integration test that opens create-new and expects the guided wizard, not `createDraft`.
- [ ] Add failing tests for successful section attachment/editor navigation and created-but-not-attached recovery.
- [ ] Consume the authenticated actor and mount `NewAssignmentWizard` for the selected section.
- [ ] Attach only the returned assessment ID; preserve existing/lesson/file paths.
- [ ] On attach failure, reopen recoverable existing-assessment state and avoid duplicate creation.
- [ ] Run the module page and wizard suites; then frontend typecheck/lint/build later in the verification ladder.

### Task 2 — student dayboard redesign

Files:

- Modify `mobile/src/screens/student-home/model.ts`
- Modify `mobile/src/screens/student-home/__tests__/model.test.ts`
- Modify `mobile/src/screens/student-home/StudentHomeView.tsx`
- Modify focused Home expectations in `mobile/src/screens/__tests__/screen-render.test.tsx`
- Modify `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`

Steps:

- [ ] Add failing model tests for deterministic due/schedule ordering used by the production view.
- [ ] Add failing render/source expectations for the dayboard, JA image, compact follow-up row, and navigation affordances.
- [ ] Make `StudentHomeView` consume `buildStudentHomeAgenda` instead of reimplementing priority.
- [ ] Implement the solid GABHS dayboard layout with `ja_cheer.png`, one primary action, compact timeline, two follow-ups, and real empty states.
- [ ] Preserve all props and route payloads; avoid touching the unreachable legacy dashboard branch.
- [ ] Render at 390×844 with the supplied student account and inspect normal, sparse, error, and large-text-safe geometry where locally controllable.

### Task 3 — assessment session containment

Files:

- Modify `mobile/src/screens/AssessmentTakeScreen.tsx`
- Modify `mobile/src/navigation/AppNavigator.tsx`
- Modify `mobile/src/screens/__tests__/screen-render.test.tsx`
- Modify/add a focused utility test only if the attempt-active predicate is extracted.

Steps:

- [ ] Add failing tests proving active question attempts block `beforeRemove`, hardware back, and header back; file-upload/submitted states remain escapable.
- [ ] Add failing tests for persistent attempt/violation indication and one lifecycle violation per leave episode.
- [ ] Add `gestureEnabled: false` to the `AssessmentTake` stack screen.
- [ ] Centralize the active-question-attempt predicate and leave warning.
- [ ] Scope screen-capture/AppState anti-cheat to that predicate, dedupe lifecycle transitions, and keep foreground resync.
- [ ] Set the existing navigation bypass only for successful submit/result flows.
- [ ] Run the focused screen tests, assessment utilities, mobile typecheck, and later device smoke.

### Task 4 — resilient updater and automatic release registration

Files:

- Modify `mobile/src/providers/__tests__/UpdateProvider.test.tsx`
- Modify `mobile/src/providers/UpdateProvider.tsx`
- Add `.github/scripts/register-mobile-release.cjs`
- Add `.github/scripts/register-mobile-release.test.cjs`
- Modify `.github/workflows/ci.yml`
- Modify `.github/workflows/railway-deploy.yml`

Steps:

- [ ] Add a failing provider test: first download mismatches, fresh policy changes package identity, second download verifies, no integrity bypass.
- [ ] Add a failing provider test: unchanged bad policy stops after one refresh and remains blocked.
- [ ] Implement a maximum-one automatic retry only for `size_mismatch`/`checksum_mismatch` plus changed version/hash/size/URL.
- [ ] Test-drive a Node registration script with mocked HTTP: live manifest match, streamed size/hash match, secret POST, old/current post-checks, secret absent, mismatch, and non-2xx failures.
- [ ] Add the script test to CI.
- [ ] Run registration after frontend health/security checks using Railway-injected backend variables; never expose `CI_ADMIN_SECRET`.
- [ ] Preserve backend monotonic registration and client hard verification.

### Task 5 — admin evaluation creation confidence and feedback

Files:

- Add `mobile/src/screens/__tests__/admin-evaluations.test.tsx`
- Modify `mobile/src/screens/AdminEvaluationsScreen.tsx`

Steps:

- [ ] Add a failing rendered test that opens the builder, enters a title, chooses values, and asserts the exact ISO create request.
- [ ] Assert success closes/resets, invalidates campaign/response queries, and shows a success message.
- [ ] Assert `APP_UPDATE_REQUIRED` produces an explicit update-required message and no false success.
- [ ] Make only the feedback/error-title change required by those tests; do not change the DTO/backend contract.
- [ ] Run the new test with existing admin API/contract and backend system-evaluation suites.

### Task 6 — version, build, package, and release

Files:

- Modify `mobile/app.json`
- Modify `mobile/android/app/build.gradle`
- Modify `mobile/scripts/app-version-release.test.cjs`
- Replace `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Regenerate `next-frontend/public/downloads/nexora-student-mobile-release.json`

Steps:

- [ ] Bump Android to version `0.1.40`, `versionCode 41`, runtime policy by app version; keep iOS build metadata isolated.
- [ ] Run clean ARM64 release assembly with production `EXPO_PUBLIC_API_URL`.
- [ ] Copy the exact release APK to the public download path.
- [ ] Run `release:prepare` with honest release notes and default minimum build 41.
- [ ] Verify APK package/version, ARM64 ABI, signing certificate, zip alignment, installer permission, API URL, byte size, and SHA-256.
- [ ] Install/smoke on an Android target where available; separately label emulator and physical-device evidence.

## Verification ladder

Run from smallest to broadest; stop on first red signal and diagnose before continuing.

1. Focused red/green suites for each task.
2. `npm run typecheck` in `mobile` and `next-frontend`.
3. Relevant backend app-version/system-evaluation suites and build.
4. Full `npm test`, lint, typecheck, and build in every changed workspace.
5. `npm run test:release` and `npm run release:verify` in `mobile`.
6. APK archive/hash/signature/alignment/ABI/API checks and emulator/device smoke.
7. Review `git diff --check`, scoped diff, and exact changed files; request code review through the configured review workflow if available.
8. Commit on `developement`, push exact SHA, verify `origin/developement...HEAD` is `0 0`.
9. Track `gh run list --commit <sha>`; wait for CI success, then the workflow-run Railway deployment for the same SHA.
10. Confirm backend, frontend, and AI Railway deployment success for the tested SHA; confirm public manifest/APK match repository artifact and backend policy now returns build 41 for old clients and `none` for build 41.
11. Authenticated acceptance: student Home and assessment containment; admin campaigns reachable on build 41. Do not create durable production campaigns merely to prove a button.

## Rollout and rollback

### Rollout

- One commit is preferred so CI, APK, manifest, deployment, and policy registration all identify the same SHA.
- The deployment workflow registers only after live frontend verification.
- Because minimum supported defaults to 41, all older Android builds receive a forced, integrity-checked direct update to build 41.
- Web teacher flow and mobile UI changes become live with their normal services; no migration or feature flag is required.

### Rollback

- UI regression: revert the exact commit and redeploy web/mobile source as appropriate.
- APK runtime regression: build a new higher `versionCode`; never regress the backend version row or overwrite policy with a lower code.
- Registration-script failure: deployment job stays failed and must not claim release success. Fix the script/live artifact and rerun; do not bypass hash checks.
- Policy accidentally too strict: register the same current version code with a deliberately lower minimum only through the explicit recovery override and audited secret path; do not disable admission.
- Assessment containment issue: revert mobile containment in a higher APK while preserving backend attempt records and violation history.

## Definition of done

- [ ] Phase 1 analysis remains the factual evidence source and no contradiction is left unresolved.
- [ ] Every task above is implemented through red/green tests.
- [ ] No public contract/schema/authority drift.
- [ ] Versioned APK, repository manifest, live bytes, and backend policy agree exactly.
- [ ] CI and all three Railway deployments for the exact pushed SHA succeed.
- [ ] Student/admin authenticated checks pass within their safe, non-destructive scope.
- [ ] Final report distinguishes static, unit/integration, archive, emulator, live deployment, and physical-device evidence.
