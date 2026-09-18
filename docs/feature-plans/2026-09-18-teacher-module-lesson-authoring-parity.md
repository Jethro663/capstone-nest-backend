# Teacher Module and Lesson Authoring Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give mobile teachers a compact, fully capable module and lesson workspace; make lesson blocks render and edit without data loss; add exact web/mobile preview and safe version restoration; and fix the web Video/Divider create failure.

**Architecture:** Keep NestJS as the contract and authorization owner. Add canonical block factories and guarded lesson-version inspection/restore APIs, then reuse a single typed block model across web and mobile. Mobile uses one native student renderer for student reading and teacher Mobile preview, while an expiring, lesson-scoped preview token opens the real web renderer in a WebView for Web and Compare modes.

**Tech Stack:** NestJS 11, Drizzle/PostgreSQL, Next.js 16/React 19, Expo 54/React Native 0.81, TanStack Query, React Native WebView, Jest, class-validator.

## Global Constraints

- Preserve backend ownership of RBAC, class ownership, official lesson state, audit history, and durable RAG reindex side effects.
- Preserve the existing lesson, module, and navigation route names; contract additions must be backward-compatible for existing web and mobile clients.
- Never flatten structured block objects into strings. Rich text stays sanitized HTML inside the existing block shapes.
- Mobile preview must reuse the native student renderer; web preview must use the production web renderer, not an imitation.
- Preview credentials must be scoped to one lesson, one teacher, read-only, purpose-bound, and expire after five minutes; no access or refresh JWT may enter a URL.
- Restore must show the selected snapshot before confirmation and reject a stale expected lesson timestamp with HTTP 409.
- Touch targets must be at least 44 by 44 logical pixels, dialogs must remain usable at 360, 390, and 430 logical pixels, and the redesign must not introduce stat-card rows or single-action space-eater panels.
- Android release identity advances from `0.1.44` / versionCode `45` to `0.1.45` / versionCode `46`; the iOS build number is unchanged.
- This plan intentionally changes no database schema: existing `jsonb` block content/metadata and lesson-version snapshot columns can represent every added contract.

---

## 1. Decision Summary and Feature Brief

Ship one coherent authoring workspace rather than patching the legacy mobile editor in place:

1. A module page whose outline owns the available space, with lock state at left, Settings at right, visible Manage actions, an Add content affordance at the end of each section, and a centered create/attach dialog.
2. A lesson editor split into **Details** and **Content**, with rich-text description editing, all eleven web authoring choices, type-specific editors, insertion at any boundary, and explicit arrange/delete controls.
3. A teacher lesson preview with **Mobile**, **Web**, and **Compare** modes. Mobile is the exact shared native student renderer; Web is a short-lived server-authorized rendering of the exact Next.js student component.
4. A two-stage version restore: inspect snapshot and change summary, then confirm using the lesson timestamp that was inspected.
5. Canonical type-specific block defaults so Video and Divider are valid even when a client omits content.

The selected direction is **Inline Outline + Focus Editor**. It keeps the common task in place, reveals management actions without an inaccessible ellipsis dependency, and moves only complex block editing into a focused centered dialog.

## 2. Scope, Non-Goals, Permissions, and Assumptions

### In scope

- Mobile teacher module detail, lesson detail/preview, and lesson editor.
- Shared mobile student/teacher lesson-block rendering.
- Web lesson block creation defaults and exact preview route.
- Backend lesson block defaults, snapshot detail, guarded restore, and preview-token contracts.
- Module item type tightening in mobile.
- Focused tests, complete affected-package checks, Android APK, commit, push, CI, Railway deploy, and live artifact verification under the user's explicit finish-and-ship authorization.

### Non-goals

- Replacing the existing web lesson editor or changing its general layout.
- New block kinds beyond the six storage types and eleven existing palette variants.
- Collaborative live editing, autosave, comments, or a new media pipeline.
- Database migrations or changing lesson publication/academic policy.
- Redesigning unrelated teacher pages in this release.

### Assumptions

- **Confirmed:** `ReactNativeWebView` is already available because `AssessmentRichTextEditor.tsx` uses it.
- **Confirmed:** `FRONTEND_URL` is an existing optional deployment setting and is already listed in backend environment validation.
- **Inferred:** Railway production already provides `FRONTEND_URL`; deployment verification must prove this before exact web preview is claimed live.
- **Assumed:** A five-minute reusable read-only preview token is sufficient. One-time use would require durable token state and would make WebView reload/recovery brittle without adding material protection.

## 3. Current-State Evidence Ledger

| Status | Finding | Evidence | Consequence |
|---|---|---|---|
| Confirmed | Web sends invalid empty content for new Video and Divider blocks. | `next-frontend/src/features/lesson-blocks/structured-content.ts#createStructuredLessonBlockContent` returns `''` for every non-text type except question/image/file; `backend/src/modules/lessons/DTO/lesson.dto.ts#CreateContentBlockDto.content` has `@IsNotEmpty()`. | `POST /api/lessons/:id/blocks` returns HTTP 400 before service logic for these two choices. |
| Confirmed | The mobile editor can destroy structured content. | `mobile/src/screens/TeacherDeepParityScreens.tsx#TeacherLessonEditorScreen` extracts display text and later calls `lessonsApi.updateBlock(blockId, { content })`. | Objectives, examples, questions, media and other object shapes can be replaced by a plain string. |
| Confirmed | Mobile exposes only four coarse choices. | The same screen restricts `newBlockType` to `text | image | video | file`; the web palette exposes paragraph, objectives, key points, worked example, image, video, checkpoint, recap, reflection, file, divider. | Mobile cannot author the current web lesson model. |
| Confirmed | Mobile teacher and student lesson views fall back to extracted text. | `TeacherLessonDetailScreen.tsx` and `LessonsScreen.tsx` only special-case images and use `extractLessonBlockText`. | Structured variants, question choices, files, divider semantics, and rich layout are missing or reported as unrenderable. |
| Confirmed | Mobile already has reusable rich-text infrastructure. | `mobile/src/components/AssessmentRichTextEditor.tsx`; `mobile/src/components/RichTextContent.tsx`. | A shared rich editor/renderer can be extracted without adding an editor dependency. |
| Confirmed | Version routes align statically. | Backend `GET/POST /lessons/:id/versions` and `POST /lessons/:id/versions/:versionId/restore`; mobile `lessonsApi` calls the same paths. | The issue is unsafe UX and insufficient contract detail, not a missing route or typo. |
| Confirmed | Restore is destructive and currently unguarded. | `LessonsService.restoreLessonVersion` snapshots, replaces lesson fields and all blocks, but accepts no expected revision; mobile restores immediately from the list. | A teacher can restore an unseen or stale version over newer edits. |
| Confirmed | Backend already retains complete snapshots and preserves structured content. | `lessonVersions.snapshot` consumption in `restoreLessonVersion`; service tests restore structured text and question objects. | Snapshot inspection needs an API projection, not a schema change. |
| Confirmed | Module attach types are stricter on the backend than mobile. | Backend DTO accepts only `lesson | assessment | file`; `mobile/src/types/module.ts` and its API payload widen the value with `string`. | Invalid states remain representable in mobile TypeScript. |
| Confirmed | The module page spends a full rail on one Settings action and relies on ellipsis controls. | `mobile/src/screens/TeacherModuleDetailScreen.tsx` renders a one-entry QuickActionRail and `dots-horizontal` item buttons. | Common edit actions are visually hidden while a low-information component consumes vertical space. |
| Confirmed | Existing route behavior and authorization are reusable. | Lesson controller teacher/admin role guards and `LessonsService.assertTeacherOwnership`; module services use class ownership checks. | New endpoints must delegate to the same ownership boundary rather than create parallel policy. |
| Unverified | Exact web preview works through the deployed Railway frontend/backend origin pairing. | Requires live `FRONTEND_URL`, CORS, WebView, and deployed token route evidence. | Do not claim production preview until the shipped SHA is live and an authenticated teacher/device flow is exercised. |

## 4. End-to-End Impact and Consumer Map

```text
Teacher mobile module outline
  -> contentModulesApi attach/update/reorder/remove (existing backend authority)
  -> TeacherLessonEditor
       -> lessonsApi create/update/reorder/delete block
       -> POST /lessons/:id/blocks
            -> canonical default + sanitize + lesson_content_blocks JSONB
            -> auto snapshot + audit/RAG reindex behavior

Teacher lesson preview
  -> Mobile tab -> shared native LessonBlockRenderer
       -> also used by student LessonDetailScreen
  -> Web tab -> POST /lessons/:id/preview-session (teacher JWT in header)
       -> short-lived scoped token
       -> Next /lesson-preview/[token]
       -> GET /lessons/preview/:token (no user JWT; token is authority)
       -> GET /lessons/preview/:token/files/:fileId
            -> only lesson-referenced files; unrelated IDs return 404
            -> same-origin Next proxy; private no-store response
       -> LessonBlockStudentRenderer + RichTextRenderer

Version history
  -> GET /lessons/:id/versions (existing list)
  -> GET /lessons/:id/versions/:versionId (new inspected snapshot)
  -> POST /lessons/:id/versions/:versionId/restore
       body expectedLessonUpdatedAt
       -> ownership + stale guard + pre-restore snapshot + transaction
       -> audit + RAG reindex
```

Affected producers and consumers:

- Backend producer: `LessonsController`, `LessonsService`, lesson DTOs and tests.
- Web consumers: structured-content block factory/editor tests; new preview page; existing `LessonBlockStudentRenderer` and `RichTextRenderer`.
- Mobile consumers: lesson API/types, teacher editor/detail, student lesson detail, module detail, navigation export, shared rich editor and renderer, tests.
- Operations: backend env example/validation, frontend public preview URL, mobile version metadata/APK manifest, GitHub Actions and Railway deployment.
- No AI-service or schema consumer is changed. RAG reindex calls remain the existing post-write side effect.

## 5. Conflicts, Invariants, Risks, and Design Options

### Preserved invariants

- Only an admin or owning teacher may mutate/inspect teacher lesson versions or create preview sessions.
- Public preview lookup grants only read-only access to the one lesson encoded in the token and cannot be exchanged for another credential.
- Student lesson access continues to respect publication/module visibility through existing student endpoints; teacher preview does not alter student access.
- Every lesson mutation preserves current auto-version, audit, and reindex behavior.
- Block order remains server-persisted and one-based.

### Options considered

| Option | Strength | Cost/risk | Decision |
|---|---|---|---|
| Patch the legacy mobile editor | Small diff. | Keeps the flattening architecture, four-choice palette, and monolithic 2,947-line screen. | Rejected. |
| Build one generic JSON block form | Supports arbitrary shapes quickly. | Exposes implementation data, is error-prone on phones, and allows invalid shape combinations. | Rejected. |
| Typed block palette plus focused editor | Matches teacher mental models, validates each shape, preserves structured content, and supports future variants. | More components and tests. | Selected. |
| Recreate a web-looking preview natively | Works offline. | Cannot truthfully show exact web output and will drift. | Rejected for Web mode; native remains Mobile mode. |
| Put teacher JWT in preview query | Minimal backend code. | Credential leaks through URLs/history/logging and grants broad account authority. | Rejected. |
| Five-minute purpose-bound encrypted token | No schema/Redis state, reload friendly, limited exposure. | Revocation is expiry-bound; requires secret and careful validation. | Selected. |

Primary risks and controls:

- **Structured data loss:** discriminated normalizers, typed editors, round-trip fixtures, and no generic `content: string` update path.
- **Unsafe restore race:** snapshot-detail response includes `inspectedLessonUpdatedAt`; restore must match it or return 409 without writes.
- **Preview leakage:** AES-256-GCM token, explicit purpose, lesson/user/role scope, random nonce, five-minute expiry, no preview data caching, generic invalid/expired error, and file downloads limited to IDs referenced by that lesson.
- **Small-screen crowding:** compact tabs, no stat cards, centered max-height dialog, 44px actions, stacked Compare under 600px.
- **Web/mobile drift:** the web tab imports the actual student renderer; native teacher/student screens import the same mobile renderer.

## 6. Recommended Architecture, Data Flow, Security, and Error Behavior

### Canonical lesson blocks

Add `backend/src/modules/lessons/lesson-block-defaults.ts` with:

```ts
export function createCanonicalLessonBlock(
  type: ContentBlockType,
  variant: LessonTextVariant = 'body',
): { content: unknown; metadata: Record<string, unknown> }
```

Video defaults to `{ url: '', caption: '' }`; Divider defaults to `{ style: 'line' }`. Text variants, question, image, and file mirror the current web shapes. `addContentBlock` fills only omitted `content`; explicit content is still sanitized and preserved. Web and mobile keep local factories for immediate UI but their fixture tests must match backend semantics.

### Version detail and guarded restore

`GET /lessons/:id/versions/:versionId` returns:

```ts
interface LessonVersionDetail extends LessonVersion {
  snapshot: LessonSnapshot;
  inspectedLessonUpdatedAt: string;
  summary: {
    titleChanged: boolean;
    descriptionChanged: boolean;
    publicationChanged: boolean;
    currentBlockCount: number;
    snapshotBlockCount: number;
  };
}
```

`POST .../restore` accepts `{ expectedLessonUpdatedAt: string }`. A mismatch throws `ConflictException('Lesson changed after this version was inspected. Refresh and review it again.')` before the pre-restore snapshot or transaction begins.

### Exact web preview

- `POST /lessons/:id/preview-session` is authenticated and ownership-checked; it returns `{ url, expiresAt }`.
- `LessonPreviewTokenService` encrypts a versioned JSON payload using AES-256-GCM and a key derived with SHA-256 from `LESSON_PREVIEW_SECRET`.
- `GET /lessons/preview/:token` is `@Public()` and returns only the sanitized lesson/read model needed by the renderer after token validation.
- `GET /lessons/preview/:token/files/:fileId` revalidates the token, proves the file ID is referenced by that lesson, then applies the existing file-access policy. The Next.js route proxies the bytes same-origin with `private, no-store`, so protected images/files render without putting an account JWT in the URL.
- Add `LESSON_PREVIEW_SECRET` to examples and boot validation as required in production, with test/development fallback to `JWT_SECRET` only outside production. `FRONTEND_URL` supplies the origin; a missing/invalid value returns a clear service-unavailable error and never fabricates a URL.
- Responses use `Cache-Control: no-store`; logs/audits never include the token.

### Mobile composition

- `MobileRichTextEditor` owns the WebView document/bridge; the assessment editor becomes a thin compatibility wrapper.
- `LessonBlockRenderer` renders all six storage types and the structured text variants. Questions display choices and feedback as read-only preview; media/file blocks show caption/name and an explicit open action; Divider draws a separator.
- `LessonBlockEditorDialog` owns typed edit state and upload selection, returns `{ type, content, metadata }`, and never accepts an untyped JSON blob.
- `TeacherLessonEditorScreen` owns fetching/mutations, Details/Content tabs, palette selection, insertion boundary, ordering, and delete confirmation.
- Errors stay visible through existing `toAppError` alerts; no optimistic success is shown before the server confirms.

## 7. Contract, Schema, Migration, and Compatibility Changes

### Backend contract additions

| Method/path | Request | Response | Compatibility |
|---|---|---|---|
| `POST /api/lessons/:id/blocks` | `content` becomes optional; `type` and integer `order` remain required. | Existing block envelope. | Backward compatible; old explicit bodies still work. |
| `GET /api/lessons/:id/versions/:versionId` | None. | `LessonVersionDetail`. | Additive. |
| `POST /api/lessons/:id/versions/:versionId/restore` | Required ISO `expectedLessonUpdatedAt`. | Existing lesson envelope; 409 on stale input. | Deliberately tightens teacher restore. Both first-party clients are updated in the same release. |
| `POST /api/lessons/:id/preview-session` | None. | `{ url: string; expiresAt: string }`. | Additive. |
| `GET /api/lessons/preview/:token` | Scoped token path. | Read-only lesson envelope with no-store header. | Additive and public only in the narrow token sense. |
| `GET /api/lessons/preview/:token/files/:fileId` | Scoped token and referenced file UUID. | Existing inline file bytes/redirect with private no-store headers; 404 for unrelated IDs. | Additive; bearer authority is bounded to assets already present in the preview lesson. |

### Client types

- Add discriminated `LessonBlockDraft`, `LessonTextVariant`, structured text/question/media/file/divider content types.
- Add `LessonVersionDetail`, `RestoreLessonVersionDto`, and `LessonPreviewSession`.
- Narrow module item types to `lesson | assessment | file`; remove `| string`.

### Schema and migrations

None. JSONB content/metadata and snapshot storage already hold the shapes; the version detail is a projection and the preview credential is stateless.

## 8. Ordered Implementation Phases With Exact Owners

### Task 1: Record the approved contract in OpenSpec

**Files:**
- Modify: `openspec/changes/align-mobile-with-web-contracts/specs/mobile-teacher-tooling-parity/spec.md`
- Modify: `openspec/changes/align-mobile-with-web-contracts/tasks.md`

**Interfaces:** Consumes this plan. Produces requirements for block integrity, exact preview, guarded restore, and compact module authoring.

- [x] Add scenarios requiring canonical defaults, structured round-trip, native/web preview parity, reviewed stale-safe restore, and visible module actions.
- [x] Add section 12 tasks mapped one-to-one to Tasks 2-8 below.
- [x] Run `openspec validate align-mobile-with-web-contracts --strict`; expect success.

### Task 2: Make lesson-block creation canonical and remove the Web 400

**Files:**
- Create: `backend/src/modules/lessons/lesson-block-defaults.ts`
- Create: `backend/src/modules/lessons/lesson-block-defaults.spec.ts`
- Modify: `backend/src/modules/lessons/DTO/lesson.dto.ts`
- Modify: `backend/src/modules/lessons/lessons.service.ts`
- Modify: `backend/src/modules/lessons/lessons.service.spec.ts`
- Modify: `backend/src/modules/lessons/lessons.controller.spec.ts`
- Modify: `next-frontend/src/features/lesson-blocks/structured-content.ts`
- Modify: existing structured-content test beside that module

**Interfaces:** Produces `createCanonicalLessonBlock` and valid Video/Divider objects used by both create paths.

- [x] Write failing backend DTO/factory/service tests proving omitted Video content becomes `{ url: '', caption: '' }`, omitted Divider content becomes `{ style: 'line' }`, and explicit structured content is unchanged.
- [x] Write failing web tests proving `createStructuredLessonBlockContent('video')` and `('divider')` return those objects.
- [x] Run the focused backend and web tests; expect failures against the current empty-string/required-content behavior.
- [x] Implement the factory, make DTO `content` optional, and fill only `undefined` in the service.
- [x] Run focused tests; expect all new and existing block tests to pass.

### Task 3: Add inspected versions, stale restore protection, and scoped preview sessions

**Files:**
- Create: `backend/src/modules/lessons/lesson-preview-token.service.ts`
- Create: `backend/src/modules/lessons/lesson-preview-token.service.spec.ts`
- Modify: `backend/src/modules/lessons/DTO/lesson.dto.ts`
- Modify: `backend/src/modules/lessons/lessons.module.ts`
- Modify: `backend/src/modules/lessons/lessons.controller.ts`
- Modify: `backend/src/modules/lessons/lessons.controller.spec.ts`
- Modify: `backend/src/modules/lessons/lessons.service.ts`
- Modify: `backend/src/modules/lessons/lessons.service.spec.ts`
- Modify: `backend/src/config/validate-env.ts`
- Modify: `backend/.env.example`
- Modify: `.env.compose.example`

**Interfaces:** Produces `getLessonVersionDetail`, `restoreLessonVersion(..., expectedLessonUpdatedAt)`, `createPreviewSession`, and `getPreviewLesson`.

- [x] Write failing tests for ownership, wrong lesson/version, summary counts, stale 409 with zero writes, current timestamp restore, token tamper, wrong purpose, expiry, no token logging, and no-store response.
- [x] Run the focused backend suites; expect the new methods/routes to be absent.
- [x] Implement DTOs, token service, module wiring, service methods, controller routes, environment checks, and explicit `FRONTEND_URL` validation.
- [x] Run focused backend tests; expect pass with the pre-restore snapshot, atomic conditional update, transaction, audit, and reindex assertions intact.

### Task 4: Add the exact Next.js lesson preview route

**Files:**
- Create: `next-frontend/app/lesson-preview/[token]/page.tsx`
- Create: `next-frontend/app/lesson-preview/[token]/page.test.tsx`
- Create: `next-frontend/src/features/lesson-preview/preview-api.ts`
- Create: `next-frontend/src/features/lesson-preview/preview-api.test.ts`
- Modify: `next-frontend/src/features/lesson-blocks/structured-content.ts`

**Interfaces:** Consumes the public scoped preview endpoint. Reuses `LessonBlockStudentRenderer` and `RichTextRenderer` without copying their render rules.

- [x] Write failing tests for loading, exact student-renderer usage, invalid/expired token state, retry, protected asset proxying, and no editing controls.
- [x] Run focused web tests; expect module-not-found failures.
- [x] Implement the minimal full-page preview with GABHS/Nexora shell, lesson description, ordered blocks, protected asset proxy, and a neutral expiry/error page.
- [x] Run focused web tests; expect pass.

### Task 5: Create shared mobile typed blocks, rich editor, and renderer

**Files:**
- Modify: `mobile/src/types/lesson.ts`
- Modify: `mobile/src/utils/lessonBlocks.ts`
- Modify: `mobile/src/utils/__tests__/lesson-blocks.test.ts`
- Create: `mobile/src/components/lesson/LessonBlockRenderer.tsx`
- Create: `mobile/src/components/lesson/__tests__/LessonBlockRenderer.test.tsx`
- Create: `mobile/src/components/MobileRichTextEditor.tsx`
- Modify: `mobile/src/components/AssessmentRichTextEditor.tsx`
- Modify: the student lesson-detail screen that currently calls `extractLessonBlockText`

**Interfaces:** Produces `createLessonBlockDraft`, `normalizeLessonBlock`, `LessonBlockRenderer`, and `MobileRichTextEditor` for Tasks 6-7.

- [x] Write failing pure tests for all eleven palette choices and round-trip preservation of every structured shape.
- [x] Write failing renderer tests for body/objectives/key points/example/recap/reflection, protected image, video, checkpoint, file, divider, legacy strings, malformed data, and accessible open actions.
- [x] Run focused mobile tests; expect failures for missing exports/components.
- [x] Implement typed factories/normalizers, a shared rich-text editor wrapper, the shared renderer, and switch the student screen to it.
- [x] Run focused tests plus `npm --prefix mobile run typecheck`; expect pass.

### Task 6: Replace the legacy mobile lesson editor

**Files:**
- Create: `mobile/src/components/lesson/LessonBlockEditorDialog.tsx`
- Create: `mobile/src/components/lesson/__tests__/LessonBlockEditorDialog.test.tsx`
- Create: `mobile/src/screens/TeacherLessonEditorScreen.tsx`
- Create: `mobile/src/screens/__tests__/teacher-lesson-editor.test.tsx`
- Modify: `mobile/src/screens/TeacherDeepParity.ts`
- Modify: `mobile/src/api/services/lessons.ts`
- Modify: `mobile/src/api/__tests__/teacher-tooling-api.test.ts`

**Interfaces:** Consumes Task 5 types/components and existing upload/reorder APIs. Produces the route-compatible `TeacherLessonEditorScreen`.

- [x] Write failing interaction tests for Details/Content tabs, HTML description load/save, eleven palette actions, end/between insertion, type-specific editing, file/image upload, move, delete confirmation, refresh, and mutation failure without false success.
- [x] Run focused mobile tests; expect the new screen/dialog to be missing.
- [x] Implement the centered max-height dialog, typed field groups, compact insertion controls, and screen orchestration. Re-export the new screen and leave the old implementation unreferenced until cleanup.
- [x] Run focused tests and mobile typecheck; expect pass and no `updateBlock(... { content: string })` path for object-backed variants.

### Task 7: Add Mobile/Web/Compare preview and guarded version UX

**Files:**
- Modify: `mobile/src/types/lesson.ts`
- Modify: `mobile/src/api/services/lessons.ts`
- Modify: `mobile/src/api/__tests__/teacher-tooling-api.test.ts`
- Modify: `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- Create: `mobile/src/screens/__tests__/teacher-lesson-preview.test.tsx`
- Modify: `mobile/src/components/teacher/TeacherWorkspacePrimitives.tsx`
- Modify: `mobile/src/components/teacher/__tests__/TeacherWorkspacePrimitives.test.tsx`

**Interfaces:** Consumes backend version detail/restore and preview session contracts, Task 4 web page, and Task 5 native renderer. Produces `TeacherCenteredDialog` for reuse.

- [x] Write failing adapter tests for version detail, timestamped restore, and preview-session requests.
- [x] Write failing screen tests for Mobile/Web/Compare tabs, phone stacking, unavailable preview recovery, version inspect before restore, change summary, explicit confirm, and stale 409 refresh prompt.
- [x] Write a failing primitive test for a centered, keyboard-safe, scrollable dialog with 44px close/confirm actions.
- [x] Implement APIs/types, `TeacherCenteredDialog`, exact native/WebView preview composition, and two-stage version restore.
- [x] Run focused tests and mobile typecheck; expect pass.

### Task 8: Redesign mobile module detail without hidden or wasteful controls

**Files:**
- Modify: `mobile/src/types/module.ts`
- Modify: module API service payload types
- Modify: `mobile/src/screens/TeacherModuleDetailScreen.tsx`
- Create: `mobile/src/screens/__tests__/teacher-module-detail.test.tsx`

**Interfaces:** Consumes `TeacherCenteredDialog` and existing module services. Preserves all current route parameters and mutation calls.

- [x] Write failing tests for left lock state, right Settings, absence of one-item QuickActionRail, visible Manage controls, per-section Add content, centered create/attach dialog, Arrange mode, empty state, and strict item-type compile fixture.
- [x] Run focused mobile tests; expect failures against the current rail/ellipsis/bottom-sheet UI.
- [x] Implement the outline-first screen, labeled actions, section footer insertion, centered dialog, and explicit arrange mode.
- [x] Run focused tests and mobile typecheck; expect pass at 360/390/430 responsive helper widths.

### Task 9: Broad verification, Android release, and shipping

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/scripts/app-version-release.test.cjs`
- Replace via release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify via release tooling: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Modify: this plan and OpenSpec task checkboxes with evidence.

**Interfaces:** Consumes the complete source tree. Produces Android `0.1.45` / `46`, exact APK manifest, one pushed SHA, and release evidence.

- [x] Run focused suites, then backend lint/build/unit, web lint/typecheck/test/build, mobile typecheck/full Jest/export, OpenSpec strict validation, `git diff --check`, and secret/debug scans. Every code failure must be fixed before continuing; unavailable service/device coverage is recorded separately.
- [x] Change Expo/Gradle release identity together and first demonstrate the existing release test fails on the old expected identity; update the assertion and make it pass.
- [x] Build the release APK with the production API URL and existing signing configuration; require `BUILD SUCCESSFUL`.
- [x] Inspect package/version, SHA-256, size, ABI, alignment, certificate, production API string, and forbidden secrets. Prepare/copy the exact APK using `release:prepare`; require `release:verify`, `cmp`, and `test:release` success.
- [x] Self-review every changed file for scope, unsafe token/data handling, renderer drift, accidental structured-content flattening, and stale restores; run final affected checks after corrections.
- [ ] Commit the complete coherent change, push `developement`, and correlate GitHub Actions with the exact pushed SHA. Require all applicable gates to finish successfully.
- [ ] Verify Railway services deployed that SHA, check health endpoints, download the live APK with a cache-busting query, compare bytes/SHA/manifest to the committed artifact, and register the app-version policy only after live artifact equality is proven.
- [ ] Exercise available authenticated teacher flows on a device/emulator. Record exact evidence boundaries for any unavailable physical-device, preview-env, or authenticated state.

## 9. Verification Matrix and Acceptance Criteria

| Requirement | Static/unit evidence | Integration/build evidence | Runtime/release evidence |
|---|---|---|---|
| Video/Divider create | Backend/web factory + DTO/service tests. | Backend build; Next build. | Authenticated web create produces 201, not 400. |
| Structured integrity | Eleven-choice round-trip fixtures; no flattening path. | Mobile typecheck/full Jest. | Edit and reopen representative objectives/question/media blocks. |
| Native preview parity | Teacher and student import the same renderer; renderer tests. | Expo production export. | Compare the same lesson in student and teacher Mobile views. |
| Exact web preview | Token/route/web renderer tests. | Backend and Next production builds. | WebView loads deployed route with correct lesson; expired token fails closed. |
| Safe restore | Detail/summary/stale service/controller/API tests. | Backend build/full Jest. | Inspect, confirm, restore; simulate stale edit and observe 409/no overwrite. |
| Module usability | Screen tests for settings/manage/add/arrange/dialog. | Mobile typecheck/export. | 360/390/430 captures and touch use. |
| Accessibility | Roles/labels/state, min-size and dialog tests. | Screen-reader/static review. | TalkBack pass where a device is available. |
| Release identity | `test:release`, `aapt`, hash/size/cert/ABI/alignment scans. | Release APK build. | Live APK byte-for-byte matches manifest and committed binary. |

Acceptance criteria:

- Video and Divider blocks create successfully from the web and mobile without special caller hacks.
- Every existing web palette choice can be created, edited, reordered, deleted, saved, reloaded, and rendered by mobile without flattening its structured data.
- A teacher can switch Mobile/Web/Compare; Mobile equals the student native renderer and Web is the actual web renderer.
- A teacher must inspect a snapshot and confirm its summary before restore; a changed lesson rejects restore with 409 and keeps current content.
- Module Settings, lock state, Manage, Add content, and Arrange controls are visible and reachable without ellipsis-only discovery.
- No new stat-card row, single-action rail, or oversized one-purpose region appears.
- All applicable local checks, exact-SHA CI gates, deployment health checks, and live APK integrity checks pass before completion is claimed.

## 10. Rollout, Rollback, Observability, Cleanup, and Unverified Boundaries

### Rollout

1. Deploy backward-compatible defaults/detail/preview additions with the coordinated first-party clients and guarded restore contract in one pushed SHA.
2. Let GitHub Actions gate backend/web/mobile contracts and artifact checks.
3. Let Railway deploy only after CI gates; verify backend and frontend health and preview configuration.
4. Publish/register Android `0.1.45` only after the live download is byte-identical to the committed APK and manifest.

### Rollback

- Application rollback: redeploy the preceding SHA `0620fbb5` if backend/web health, preview security, or authoring behavior regresses.
- APK rollback: restore the previous committed APK/manifest and app-version policy; never point a manifest at mismatched bytes.
- Data rollback: no migration exists. Version restoration already keeps a pre-restore snapshot, so lesson content remains recoverable through the governed version workflow.
- Token rollback: removing the preview endpoint invalidates access immediately; rotating `LESSON_PREVIEW_SECRET` invalidates all outstanding preview URLs.

### Observability

- Reuse structured HTTP status/error logs, audit `lesson.version.restored`, and RAG reindex job outcomes.
- Add audit metadata for preview-session creation without token values and for stale restore rejection counts through normal HTTP 409 monitoring.
- Watch HTTP 400 on lesson block create, HTTP 409 on restore, HTTP 401/410-equivalent invalid preview responses, and WebView load failures during release acceptance.

### Cleanup

- Remove the unreferenced legacy `TeacherLessonEditorScreen` from `TeacherDeepParityScreens.tsx` after the new screen passes all checks; do not leave two exported implementations.
- Keep compatibility normalizers for historical string blocks because stored lessons may predate structured shapes.
- Mark OpenSpec section 12 tasks complete only with source/test evidence; keep runtime/device gates explicitly open if unavailable.

### Unverified boundaries before execution

- Production `LESSON_PREVIEW_SECRET` and `FRONTEND_URL` values are not yet verified.
- No fresh authenticated physical-device session has yet proven the exact web preview, upload picker, keyboard behavior, or TalkBack navigation.
- CI, Railway deployment, live APK bytes, and app-version registration necessarily remain unverified until after the implementation is committed and pushed.

## Plan Self-Review

- Spec coverage: every approved module, lesson editor, renderer, version, preview, contract, release, and error requirement maps to Tasks 2-9.
- Consumer coverage: backend producer, web editor/preview, mobile teacher/student, environment, release artifact, CI, and Railway are named; no discovered AI/schema consumer is falsely included.
- Type consistency: `LessonVersionDetail.inspectedLessonUpdatedAt` feeds `RestoreLessonVersionDto.expectedLessonUpdatedAt`; the preview session returns only a URL and expiry; block drafts remain discriminated end-to-end.
- Scope control: no unrelated teacher page, new block kind, migration, collaborative editor, or AI work is included.
- Evidence discipline: production configuration, physical-device behavior, CI, deployment, and live APK remain explicitly unverified until executed.
