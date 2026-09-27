# Discussion Attachment Image Hotfix Implementation Plan

**Goal:** Display protected discussion thread and comment images correctly in teacher and student web class workspaces without weakening backend authentication or authorization.

**Architecture:** `discussionBoardService` will fetch backend-produced discussion attachment URLs through the existing Axios client so bearer bootstrap and refresh/retry remain authoritative. A focused object-URL hook and shared image-link component will own loading, failure, click-through, stale resolution, and URL cleanup; teacher and student galleries will reuse it.

**Tech Stack:** Next.js 16, React 19, TypeScript, Axios, Jest, Testing Library, NestJS JWT/RBAC contract unchanged.

## Global constraints

- Keep `JwtAuthGuard`, `RolesGuard`, class membership checks, file lookup, and attachment access audit logging unchanged.
- Never put access or refresh tokens in URLs, query strings, markup, logs, or persistent storage.
- Preserve `DiscussionAttachmentResource`, backend `inlineUrl`/`downloadUrl` fields, uploads, external links, and local pre-submit previews.
- Apply the fix to both thread and comment images on teacher and student web surfaces.
- Preserve the unrelated modified `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` outside all commits.

## Task 1 — Characterize authenticated attachment delivery

**Files:**
- Modify `next-frontend/src/services/__tests__/discussion-board-service.test.ts`
- Modify `next-frontend/src/services/discussion-board-service.ts`
- Create `next-frontend/src/hooks/use-discussion-attachment-object-url.test.tsx`
- Create `next-frontend/src/hooks/use-discussion-attachment-object-url.ts`

- [x] Add a failing service test proving `/api/classes/.../inline` is normalized to `/classes/.../inline` and requested with `{ responseType: 'blob' }` through `api.get`.
- [x] Add a failing hook test proving a returned blob becomes an object URL, failures become an explicit failed state, stale loads cannot replace the current image, and created URLs are revoked on cleanup.
- [x] Run the focused tests and record the expected missing-method/module failures.
- [x] Implement `discussionBoardService.loadAttachment(url): Promise<Blob>` with a same-origin discussion-route allowlist.
- [x] Implement `useDiscussionAttachmentObjectUrl(sourceUrl)` with loading/failure state and complete object-URL lifecycle cleanup.
- [x] Re-run the focused tests to green.

## Task 2 — Repair all web discussion image consumers

**Files:**
- Create `next-frontend/src/components/discussion/AuthenticatedDiscussionImageLink.test.tsx`
- Create `next-frontend/src/components/discussion/AuthenticatedDiscussionImageLink.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx`
- Modify `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.modules-link.test.tsx`

- [x] Add a failing component test proving protected URLs are not placed directly in `<img src>` or the clickable link, the loading state is non-clickable, the authenticated `blob:` URL becomes both image source and click target, and load failure shows `Image unavailable`.
- [x] Update the existing student discussion test to expect authenticated loading for both thread and comment image URLs.
- [x] Run the focused component/student tests and record failure against direct backend URLs.
- [x] Add the shared image-link component and replace the teacher gallery's direct image branch while preserving file/link cards and existing CSS.
- [x] Replace the student attachment list's direct image branch while preserving file/link cards, metadata copy, compact sizing, and current CSS.
- [x] Confirm the teacher gallery still covers thread summaries, selected-thread attachments, and comments; confirm the student list covers the same three locations.
- [x] Re-run service, hook, component, teacher, and student focused tests.

## Task 3 — Integrated verification and release

**Files:** all Task 1–2 files, this plan, and `docs/feature-analysis/2026-09-27-discussion-attachment-image-delivery-analysis.md` only.

- [x] Run `npm run lint`, `npm run typecheck`, `npm run test -- --runInBand`, and `npm run build` in `next-frontend`.
- [x] Run `npm run perf:discussion-smoke` when an authenticated runtime is available; otherwise record the exact environment blocker without weakening automated coverage.
- [x] Review `git diff --check`, the checklist, URL allowlist, object-URL cleanup, and staged paths.
- [ ] Commit and push `developement`, verify the exact remote SHA, observe all applicable CI jobs and Railway deployments, and perform a post-deploy public health/security check.
- [ ] Report local, CI, deployment, and authenticated-browser evidence separately; never claim authenticated image bytes were observed unless they were.

## Acceptance matrix

| Outcome | Evidence |
|---|---|
| No direct protected image request | Component test asserts raw `/api/.../inline` is absent from image `src` and link `href` |
| Bearer/refresh path used | Service test asserts the existing Axios `api.get` blob request |
| Thread images work | Teacher/student shared consumers receive authenticated object URLs |
| Comment images work | The same components render nested comment attachments |
| Click-through works | Ready image link targets the object URL, not the protected raw route |
| Failure is understandable | Explicit `Image unavailable` state replaces broken image chrome |
| No memory leak/stale race | Hook tests prove cleanup and stale-load rejection |
| Backend security unchanged | No backend files, guards, DTOs, or schemas change |

## Self-review

- Scope matches the isolation report; no backend or mobile expansion.
- The URL allowlist prevents forwarding bearer credentials to arbitrary attachment URLs.
- The single shared lifecycle hook prevents separate teacher/student fixes from drifting.
- No placeholders or unresolved decisions remain.

## Verification record

- `npm run lint`: passed with zero warnings/errors.
- `npm run typecheck`: passed, including the administrator contract gate (19 contracts across 57 layer checks).
- `npm test -- --runInBand`: passed (205 suites, 916 tests).
- `npm run build`: passed (Next.js production build and 75 static pages generated).
- Focused authenticated-delivery coverage: passed for the service route allowlist, object-URL lifecycle, shared component, teacher gallery, student thread attachments, and student comment attachments.
- `npm run perf:discussion-smoke`: not runnable in the local environment because no service was listening on `127.0.0.1:3001`, `127.0.0.1:3000`, or `127.0.0.1:4000`; no production credentials were assumed or embedded to bypass that environment requirement.
