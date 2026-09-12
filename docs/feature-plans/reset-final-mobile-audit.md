# Final mobile audit: Reset school data

Date: 2026-09-12
Scope: read-only audit of the admin mobile reset flow against the fixed reset contract
Verdict: **RESOLVED — APPROVE**

## Findings

### [P1 — RESOLVED] Clear every reset-scoped local data key before reporting sign-out complete

The matching-completion path clears auth, React Query, and only `clearAllEditorRecovery()` before setting `signedOut=true` (`mobile/src/providers/SystemResetProvider.tsx:190-217`). That helper removes only keys beginning with `assessment-editor:v1:` (`mobile/src/features/assessment-editor/recovery.ts:4-43`). Other durable school-data keys survive:

- `assignment-creation:v1:*` stores the complete `SaveAssessmentEditorInput` (`mobile/src/features/assignment-creation/recovery.ts:7-15,39-55`), including assessment settings and question content (`mobile/src/types/assessment.ts:445-452`).
- `teacher-ai-draft:*:active-job` survives (`mobile/src/api/teacher-ai-draft-jobs.ts:3-16`).
- `teacher-extractions:*:active` survives (`mobile/src/api/teacher-extraction-jobs.ts:3-33`).

That leaves cleared school content and references to deleted jobs/classes on the device after the progress gate says it is clearing cached school data. It violates the feature's clean-slate contract even though the server-side reset succeeds.

Resolution: `clearAllSchoolDataRecovery()` now owns the four known school-content prefixes and deliberately excludes the reset-operation key (`mobile/src/features/assessment-editor/recovery.ts:4-53`). Matching completion awaits that cleanup before clearing queries or reporting `signedOut=true`; a failure resets the attempt guard so Check progress can retry without forgetting the operation UUID (`mobile/src/providers/SystemResetProvider.tsx:190-217`). Regression coverage seeds all four prefix families, the reset UUID, and an unrelated preference (`mobile/src/features/assessment-editor/__tests__/recovery.test.ts:27-65`), while provider coverage proves cleanup failure remains locked/retryable and does not remove the UUID (`mobile/src/providers/__tests__/SystemResetProvider.test.tsx:108-165`).

### [P2 — RESOLVED] Android Back hides a terminal receipt without resolving its persisted UUID

The primary terminal action correctly calls `reset.forget()` in `close()` (`mobile/src/screens/SystemResetProgressGate.tsx:27-38`). The native modal dismissal path does not use it: after an abort, or after completion once local cleanup succeeds, `onRequestClose` calls only `reset.hide()` (`mobile/src/screens/SystemResetProgressGate.tsx:58-63`). Android Back therefore leaves `nexora.system-reset.operation` persisted. The app shows the stale progress banner and reopens the old receipt on the next launch; if public status has since moved to another operation, it degrades to an unnecessary unknown-recovery flow.

Resolution: native Back now ignores running state, routes terminal state through `close()`, blocks completion until local cleanup reports signed out, and awaits durable UUID removal before an abort navigates to settings. If removal fails, the modal stays recoverable and refreshes status (`mobile/src/screens/SystemResetProgressGate.tsx:27-39,59-65`). Tests cover running, completion still clearing, completed, aborted, and storage-failure Back behavior (`mobile/src/screens/__tests__/system-reset-progress-gate.test.tsx:66-156`).

## Contract checks that passed review

- The UUID is persisted before the execute request, and a persistence failure prevents the POST (`mobile/src/screens/AdminSystemResetScreen.tsx:253-285`; `mobile/src/providers/SystemResetProvider.tsx:84-101`).
- First-attempt and retry 409 responses remain uncertain and retain the same UUID/request (`mobile/src/features/system-reset/model.ts:53-58`; `mobile/src/screens/AdminSystemResetScreen.tsx:286-323`).
- A remount restores only the UUID; mismatched public status is not adopted, an exact owned receipt can resolve it, and 404 remains ambiguous (`mobile/src/providers/SystemResetProvider.tsx:59-82,116-142,151-188`).
- Offline/readiness/preview state is rechecked after durable storage and before transmission; alert cancel and native alert dismissal clear password, reason, phrase, and acknowledgements without dropping a saved recovery UUID (`mobile/src/screens/AdminSystemResetScreen.tsx:253-349`).
- Progress lives above navigation, uses the unauthenticated maintenance client, and only matching completion triggers local auth/query cleanup (`mobile/src/bootstrap/AppRoot.tsx:6-15`; `mobile/src/api/services/system-reset.ts:44-53`; `mobile/src/providers/SystemResetProvider.tsx:151-217`).
- The API paths, envelope unwrapping, year/period target, operation lookup, and public maintenance path match the backend contract (`mobile/src/api/services/system-reset.ts:14-53`; `mobile/src/types/system-reset.ts:7-75`).
- The reset destination is reachable through the typed admin stack and the System Settings testing-tools section (`mobile/src/navigation/AppNavigator.tsx:990-1027`; `mobile/src/screens/AdminSettingsOverviewScreen.tsx:118-136`).

## Verification performed

Focused command (no server and no full-suite contention):

`npm test -- src/features/system-reset/__tests__/model.test.ts src/api/__tests__/system-reset-api.test.ts src/providers/__tests__/SystemResetProvider.test.tsx src/screens/__tests__/admin-system-reset.test.tsx src/screens/__tests__/system-reset-progress-gate.test.tsx`

Initial audit result: 5 suites passed, 35 tests passed, but those tests did not exercise the two findings.

TDD evidence:

- RED: the two new regression targets failed with 5 expected failures: three cached-data families survived, running native Back hid progress, and terminal native Back did not forget/retry.
- GREEN: `npm test -- src/features/assessment-editor/__tests__/recovery.test.ts src/screens/__tests__/system-reset-progress-gate.test.tsx` passed 2 suites / 9 tests.
- Final focused reset verification: the command above, expanded with `src/features/assessment-editor/__tests__/recovery.test.ts` and `src/navigation/__tests__/system-reset-navigation.test.ts`, passed 7 suites / 41 tests.
- `npm run typecheck` passed, including 21 administrator contracts across 63 layer checks and `tsc --noEmit`.
- Prettier check passed for all six touched mobile source/test files, and `git diff --check` reported no whitespace errors.

The only test output beyond passes was React's existing `react-test-renderer` deprecation warning.
