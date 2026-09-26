# Roster Import Activation Verification Implementation Plan

> **Execution:** Implement inline under the finish-and-ship workflow. Keep the existing OTP path, administrator authorization, explicit acknowledgement, onboarding delivery, and audit history intact.

**Goal:** Make an administrator's immediate-activation choice observable in the roster commit response and drive the web success state from that backend-confirmed result before releasing it to production.

**Architecture:** `RosterImportService` remains the authority for account state. The commit response will report the applied activation mode and counts; the typed web service will carry that contract to the admin page, which will show server-confirmed results instead of assuming the local toggle was honored. No schema, mobile, authentication, or existing-account behavior changes.

**Tech stack:** NestJS, class DTOs, Jest, Next.js/React, Testing Library, TypeScript.

---

## Task 1: Characterize the backend result contract

**Files:**

- Modify: `backend/src/modules/roster-import/roster-import.service.spec.ts`
- Verify: `backend/src/modules/roster-import/roster-import.service.spec.ts`

1. Extend the existing `skipVerification=false/true` table test to require:

   ```ts
   expect(res.activationMode).toBe(
     skipVerification ? 'admin_attested' : 'email_otp',
   );
   expect(res.createdActiveCount).toBe(skipVerification ? 2 : 0);
   expect(res.createdPendingCount).toBe(skipVerification ? 0 : 2);
   ```

2. Run the focused service spec and confirm it fails because the response fields are absent.

## Task 2: Add the authoritative backend response

**Files:**

- Modify: `backend/src/modules/roster-import/dto/roster-import.dto.ts`
- Modify: `backend/src/modules/roster-import/roster-import.service.ts`
- Verify: `backend/src/modules/roster-import/roster-import.service.spec.ts`

1. Add required response fields:

   ```ts
   activationMode: 'admin_attested' | 'email_otp';
   createdActiveCount: number;
   createdPendingCount: number;
   ```

2. Compute `activationMode` once from the validated administrator-only request, reuse it in the audit record, and return counts derived from the created-account IDs.
3. Run the focused backend service and controller specs and confirm they pass.

## Task 3: Characterize server-confirmed web feedback

**Files:**

- Modify: `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.test.tsx`
- Verify: `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.test.tsx`

1. Give the commit mock a complete standard-mode result by default.
2. In the immediate-activation test, return `activationMode: 'admin_attested'` with one active account and require a success message containing `Server confirmed: 1 new account is active immediately`.
3. Run the focused page test and confirm it fails because the page currently trusts its local toggle and ignores the response.

## Task 4: Consume the typed result and clarify the control

**Files:**

- Modify: `next-frontend/src/services/roster-import-service.ts`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx`
- Verify: `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.test.tsx`

1. Define a typed `RosterImportCommitResult` matching the backend response and apply it to `commit()`.
2. Capture the commit response and render success text from `response.data.activationMode` and the backend counts.
3. Rename the switch labels to `Activate new accounts now (skip OTP)` and `Immediate activation: On`; retain the acknowledgement and existing-account warning.
4. Run the focused frontend test and confirm it passes.

## Task 5: Verify and release

**Files:**

- Include: `docs/feature-analysis/2026-09-27-roster-import-otp-bypass-analysis.md`
- Include: `docs/superpowers/plans/2026-09-27-roster-import-activation-verification.md`
- Preserve: `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md`

1. Run focused backend and frontend tests, diagnostics, lint, typecheck, and builds.
2. Run the repository CI-equivalent affected suites; distinguish any unrelated baseline failure from a product regression.
3. Review the diff and status; stage only task-owned files.
4. Commit on `developement`, fetch, verify upstream divergence, and push without force.
5. Wait for CI and the configured Railway production deployment for the exact commit SHA.
6. Verify public backend health and frontend reachability. Do not create production learner records; the live behavioral acceptance remains the next authorized real roster import.
