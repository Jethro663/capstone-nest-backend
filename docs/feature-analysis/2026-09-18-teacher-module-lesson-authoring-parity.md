# Teacher mobile module and lesson authoring parity

Date: 2026-09-18
Status: analysis and redesign plan only
Surfaces: Expo mobile teacher and student, Next.js teacher and student, NestJS lesson and module contracts

## Executive verdict

The module detail problem is primarily an interaction and density problem. Its current routes and backend operations line up, but the screen wastes a row on one settings action, hides frequent section/item actions behind unlabeled ellipses, and makes adding to a specific section indirect.

The lesson problem is a contract and capability problem, not merely an old design. The mobile editor can replace structured content objects with plain strings, the mobile teacher and student previews do not understand most supported block shapes, and the web add-block helper creates an empty string for Video and Divider even though the backend rejects empty content. Those paths must be corrected before a visual rewrite can be considered safe.

Recommended direction: **Inline Outline + Focus Editor**.

- Module detail becomes one full-page outline. Lock state is on the left of the context strip; a labeled Settings action is on the right. Every section ends with Add content.
- Lesson preview gets Mobile, Web, and Compare modes. Mobile uses the exact shared native student renderer. Web uses a short-lived, role-checked preview session rendered by the web client. Compare is stacked on phones and side-by-side only where width permits.
- Lesson editor uses typed block editors for all 11 web authoring choices. Rich text reuses the mobile editor/renderer already present in the repository. It never flattens a structured block into a string.
- Versions remain server-owned. The UI adds snapshot preview and an explicit restore confirmation, and restore gains a stale-write guard.

## Scope and confidence

| Finding | Status | Evidence |
|---|---|---|
| Web Video and Divider creation fails because the client sends empty `content` and the backend rejects it | **Confirmed** | `createStructuredLessonBlockContent()` returns `''` for both types; `CreateContentBlockDto.content` has `@IsNotEmpty()` |
| Mobile lesson editing can destroy structured block data | **Confirmed** | Every block is converted to extracted text and saved back as `{ content: string }` |
| Mobile lesson previews cannot render the complete web block model | **Confirmed** | Teacher and student renderers special-case Image and otherwise fall back to extracted text |
| Raw `<p>` in the mobile lesson description is caused by missing rich-text rendering on that screen | **Confirmed** | Description is bound directly to a native text input; existing rich-text components are bypassed |
| Version route/type mismatch causes snapshot failure | **Not confirmed** | Mobile routes and `LessonVersion` metadata match backend routes and response fields |
| Snapshot UX is unsafe and difficult to understand | **Confirmed** | History is inside an options sheet and exposes Restore without preview, diff, or confirmation |
| Module API routes mismatch backend routes | **Not confirmed** | Inspected module load, update, section, item, reorder, release, cover, and grading routes align |
| Module item client typing is weaker than the backend contract | **Confirmed** | Mobile accepts `itemType: string`; backend restricts it to `lesson | assessment | file` and enforces one matching target |
| Exact behavior on an authenticated physical Android device | **Unverified** | This was a static source/contract audit and HTML design review, not an APK/device test |

## Current feature anatomy

### Route and stack inventory

```text
TeacherClassDetail
  -> TeacherModuleDetail { classId, moduleId, source }
       -> TeacherLessonDetail { lessonId, classId, moduleId, source: module }
            -> TeacherLessonEditor { lessonId, classId }

TeacherLessons
  -> TeacherLessonDetail { lessonId, source: lessons }
       -> TeacherLessonEditor
```

The existing source parameters preserve correct Back destinations. The redesign should retain these route names and parameters. Overlay-first Back must close a block library, editor, settings panel, version preview, or confirmation before popping the route.

### Module detail today

Owner: `mobile/src/screens/TeacherModuleDetailScreen.tsx`.

- `TeacherContextStrip` shows state, then a separate `TeacherQuickActionRail` uses a full row for Module settings.
- Section and item controls are 44px ellipsis buttons. Their accessibility labels exist, but their purpose is not visually discoverable.
- Adding content is global first, then asks for a section. Teachers working inside a section have to leave their current context.
- The attach modal is already centered, but the initial Add to module chooser and management menus use bottom sheets.
- The backend protects teacher/admin access, core assets, same-class lesson/assessment attachment, file visibility, and one target per item type. These invariants must remain.

### Lesson preview today

Owners:

- `mobile/src/screens/TeacherLessonDetailScreen.tsx`
- `mobile/src/screens/LessonDetailScreen.tsx`
- `mobile/src/utils/lessonBlocks.ts`

Both mobile readers only provide a real Image path plus a best-effort text extractor. Objectives, key points, worked examples, recap, reflection, checkpoints, video, files, and dividers do not have semantic native renderers. This is why valid blocks can produce “This block does not have text that mobile can render.”

The web renderer, `next-frontend/src/features/lesson-blocks/LessonBlockStudentRenderer.tsx`, already understands the full semantic model and is the behavior reference.

### Lesson editor today

Owner: `TeacherLessonEditorScreen` inside `mobile/src/screens/TeacherDeepParityScreens.tsx`.

- Only Text, Image, Video, and File are offered.
- Every new type is sent as a trimmed string.
- Every existing block is shown in the same multiline text input.
- Saving writes extracted text back to `content`, even when the original block contains structured choices, file metadata, rich-text arrays, or worked-example steps.
- Lesson description is handled as plain text, so stored HTML can become literal `<p>` markup.

The repository already contains `mobile/src/components/ui/RichTextContent.tsx` and a WebView-based `AssessmentRichTextEditor.tsx`. The correct change is to extract a shared mobile rich-text editor and reuse the existing renderer, not introduce a second editor stack.

## Confirmed web 400 root cause

Flow:

```text
Teacher selects Video or Divider
  -> handleAddBlock()
  -> createStructuredLessonBlockContent(type)
  -> returns empty string for any non-text type except question/image/file
  -> POST /lessons/:id/blocks with content: ""
  -> CreateContentBlockDto @IsNotEmpty()
  -> HTTP 400
```

Relevant owners:

- `next-frontend/app/(dashboard)/dashboard/teacher/lessons/[id]/edit/page.tsx:704`
- `next-frontend/src/features/lesson-blocks/structured-content.ts:198`
- `backend/src/modules/lessons/DTO/lesson.dto.ts:80`

The focused structured-content suite passes 5/5, but it does not cover default Video or Divider creation. This is a coverage gap, not evidence that those paths work.

## Contract findings

### C1. Lesson block content is too loosely typed

Current public shape:

```ts
type ContentBlock = {
  type: "text" | "image" | "video" | "question" | "file" | "divider";
  content?: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
```

This allows every client to invent a different shape and still compile. Replace it with an OpenAPI-described discriminated union shared by generated client types.

Recommended compatibility contract:

```ts
type LessonBlockCreate =
  | { type: "text"; variant: TextVariant; order: number; content?: TextContent }
  | { type: "image"; order: number; content?: ImageContent }
  | { type: "video"; order: number; content?: VideoContent }
  | { type: "question"; order: number; content?: QuestionContent; metadata?: QuestionMetadata }
  | { type: "file"; order: number; content?: FileContent }
  | { type: "divider"; order: number; content?: DividerContent };
```

The server should synthesize a canonical type-specific default when `content` is omitted, validate the resulting shape, sanitize rich text, store the normalized block, and return it. During migration it should still accept known legacy string/object shapes and normalize them. It must not accept arbitrary empty content as a permanent loophole.

Canonical defaults include:

- Video: `{ url: "", caption: "" }`
- Divider: `{ style: "line" }`
- Image/File: typed file reference objects
- Question: typed prompt, choices, and answer type plus answer metadata
- Text: typed content per `body | objectives | key_points | example | recap | reflection`

### C2. Mobile create-block request says required fields are optional

`mobile/src/api/services/lessons.ts` declares `content?` and `order?`; the backend requires both. The generated client type must make the request rules visible, or the backend create contract must formally allow omission and apply defaults. Do not keep a handwritten contradiction.

### C3. Snapshots are aligned but incomplete for safe restoration

Existing endpoints are consistent:

- `GET /lessons/:id/versions`
- `POST /lessons/:id/versions`
- `POST /lessons/:id/versions/:versionId/restore`

The list intentionally returns metadata only. The backend stores title, description, draft state, order, and blocks; it creates automatic snapshots before mutations and retains the newest 25 automatic versions. That explains why the web can show many entries.

Add:

```http
GET /lessons/:lessonId/versions/:versionId
```

Return a sanitized, read-only snapshot plus a change summary against the current lesson. Do not expose internal audit or credential data.

Extend restore with an optimistic concurrency guard:

```json
{ "expectedLessonUpdatedAt": "2026-09-18T...Z" }
```

If the lesson changed after preview, return `409 Conflict` and require a refresh. Preserve ownership checks, the pre-restore snapshot, transaction, audit event, and reindexing.

### C4. Exact web preview needs a bounded authorization contract

Native semantic parity is necessary but cannot promise pixel-identical web output. For a literal Web mode, add:

```http
POST /lessons/:lessonId/preview-session
```

The backend verifies teacher/admin ownership and returns a five-minute, single-purpose, encrypted preview URL. The dedicated web route is read-only, can render drafts, applies normal sanitization and CSP, and expires quickly. Protected images and files use a second lesson-scoped route that proves the file ID is referenced by that lesson before applying the existing file-access policy; unrelated IDs return 404. The Next.js same-origin proxy returns those bytes with `private, no-store`. Do not put the normal JWT in a query string. Mobile opens the result in a WebView. Screenshot generation is rejected because it is stale and non-interactive.

### C5. Module item typing should be discriminated, but routes need not change

The backend enum and runtime checks are correct. Replace mobile `itemType: string` with:

```ts
type AttachModuleItem =
  | { itemType: "lesson"; lessonId: string; ...Common }
  | { itemType: "assessment"; assessmentId: string; ...Common }
  | { itemType: "file"; fileId: string; ...Common };
```

This is a client/OpenAPI typing improvement. The existing POST route and server safeguards remain.

## Dependency and cascade map

| Edge | Source | Destination | Relationship | Risk if changed in isolation |
|---|---|---|---|---|
| E1 | Backend lesson block DTO/storage | Web authoring helper | create payload | Video/Divider 400 or divergent defaults |
| E2 | Backend lesson block response | Web student renderer | semantic read | Student view changes or regressions |
| E3 | Backend lesson block response | Mobile student renderer | semantic read | Unsupported-block fallback remains |
| E4 | Backend lesson block response | Mobile teacher preview | semantic read | Teacher preview lies about student output |
| E5 | Mobile teacher editor | Backend update block | destructive write | Structured content flattened to string |
| E6 | Shared rich-text sanitizer | Web/mobile rendering | security and formatting | Raw tags, lost formatting, or unsafe HTML |
| E7 | Lesson version storage | Version metadata/detail | snapshot read | Cannot preview restoration impact |
| E8 | Lesson version restore | Current lesson revision | destructive replace | Concurrent edits can be overwritten |
| E9 | Teacher ownership/RBAC | Web preview session | authorization | Draft content exposure |
| E10 | Module item enum/invariants | Mobile attach chooser | typed create | Invalid target combinations reach runtime |
| E11 | Navigation source parameters | Module/lesson/editor Back | stack behavior | Returns to wrong teacher workspace |

## Redesign alternatives

### Direction A — Inline Outline + Focus Editor (recommended)

The default screen is a clean reading/management outline. Explicit Manage/Edit actions replace ellipses. Reordering and destructive actions live in an opt-in Arrange mode. Add controls appear where the content will land.

Why it fits: smallest visual and behavioral jump, high discoverability, one-handed use, and direct reuse of current teacher primitives.

### Direction B — Permanent View / Arrange modes

Every outline has a mode switch; Arrange exposes handles and actions throughout.

Tradeoff: very clear for power users, but adds persistent mode management to every visit.

### Direction C — Split outline and editor

The outline remains visible while a selected section or block opens beside it.

Tradeoff: effective on tablet/web, but cramped and fragile on phones. Reserve it for a future tablet breakpoint.

## Recommended screen specification

### Module detail

1. Keep the first context component, reduced to two compact rows.
2. Place lock/open state at the lower left and a visible `Settings` button at the lower right.
3. Remove the one-action `TeacherQuickActionRail`.
4. Let Module outline begin immediately and fill the remaining space.
5. Section header: disclosure, title/count, and a labeled `Manage` target. No unlabeled ellipsis.
6. Item row: type icon, title/status, whole-row open behavior, and a compact `Manage` target.
7. End every expanded section with `+ Add content to this section`.
8. Keep the sticky bottom `Add to module` action for adding a section or choosing a destination globally.
9. Open Add, Settings, and Manage as centered, scrollable, keyboard-safe dialogs. On very short screens they may grow to near-full height while retaining clear Close/Cancel.
10. Arrange mode exposes move controls; ordinary scanning remains uncluttered.

### Teacher lesson preview

1. Header actions: `Versions`, `Edit`, and draft/published state.
2. Preview switcher: `Mobile`, `Web`, `Compare`.
3. Mobile uses the same native components as the student lesson route; no teacher-only approximation.
4. Web uses the secured preview session. Loading, expiry, offline, and unauthorized states have explicit recovery actions.
5. Compare selects one block at a time. Phones stack Mobile above Web; tablets/landscape may use two columns.
6. Versions open a centered workspace with metadata, type, creator, date, snapshot preview, change summary, then a separate Restore confirmation.

### Lesson editor

1. Compact `Details | Content` switch; no large stat or hero cards.
2. Details: title, rich-text description, draft state, Save.
3. Content: ordered block outline with type/variant, useful preview, and a visible Edit action.
4. Arrange is explicit; move and delete do not crowd normal editing.
5. `+` insertion targets appear between blocks and at the end.
6. Centered block library groups all web choices:
   - Text: Paragraph, Objectives, Key points, Worked example, Recap, Reflection
   - Media: Image, Video, File
   - Activity: Checkpoint
   - Structure: Divider
7. Each type opens a dedicated typed editor. Never reuse a generic text field for media, question, or divider.
8. Extract `AssessmentRichTextEditor` into a shared mobile editor and render saved HTML with `RichTextContent`.
9. Save one block at a time with dirty-state protection. Back prompts only when the current block has unsaved changes.

## Interaction and state matrix

| Surface | Loading | Empty | Error/offline | Permission | Success feedback |
|---|---|---|---|---|---|
| Module outline | skeleton rows | Add first section | retained content + Retry | read-only explanation | inline saved state |
| Section add | local spinner | no attachable items + Create action | retry without losing destination | disabled with reason | item appears in place |
| Lesson Mobile preview | block skeletons | Add first block | unsupported block names type and recovery | owner error | none needed |
| Web preview | secured session spinner | same lesson empty state | expired/offline + Refresh preview | explicit denied state | session loaded timestamp |
| Versions | list skeleton | No versions yet + Save version | retry; current lesson unchanged | hidden/denied | snapshot label appears |
| Restore | preview + change count | not applicable | 409 stale warning | denied | restored version banner + undo snapshot reference |
| Block editor | current value immediately | canonical defaults | save retry preserves draft | disabled | Saved at timestamp |

## Design rationale from established products

- Canvas provides instructor Student View, validating an explicit teacher-as-student preview rather than a generic author preview: [Canvas Teacher Android Guide](https://community.canvaslms.com/html/assets/Canvas_Teacher_Android_Guide.pdf).
- Articulate Rise supports block insertion above, between, and after existing blocks, which maps directly to the requested per-section/end-of-list additions: [Rise lesson and block types](https://community.articulate.com/series/157/articles/rise-choosing-lesson-and-block-types/).
- Notion treats all content as blocks and exposes a searchable block picker plus a dedicated handle for block operations. Nexora should borrow the discoverability, not the desktop-hover dependence: [Notion block basics](https://www.notion.com/help/guides/block-basics-build-the-foundation-for-your-teams-pages).

These are interaction references only. The visual system remains Nexora/GABHS: navy hierarchy, red action accents, white reading surfaces, restrained borders, no gradients or glass panels, and no decorative metric cards.

## Decision ledger

### Keep

- Current teacher route names, source parameters, Back behavior, RBAC, class ownership, module item invariants, audit history, version pre-restore snapshot, and backend sanitization.
- `TeacherScreen`, `TeacherContextStrip`, `TeacherFlatSection`, `TeacherBottomActionBar`, existing theme tokens, `RichTextContent`, and the current rich-text editor capability.
- Existing lesson block types and semantic text variants from web.

### Change

- Replace handwritten loose block payload types with a generated discriminated contract.
- Make server defaults authoritative for block creation.
- Build a shared native lesson block renderer used by student and teacher preview.
- Redesign module outline controls, lesson preview modes, version preview/restore, and typed block editing.
- Add exact web preview session and version detail/change-summary contracts.

### Frozen

- Academic completion rules, publication semantics, visibility/locked behavior, assessment-given behavior, class membership, file access policy, version audit trail, and RAG reindexing.

### Unknown / requires runtime verification

- The user-reported snapshot failure response body and the exact production device path that triggers it.
- WebView behavior under the production CSP/cookie configuration.
- Keyboard and modal behavior on the smallest supported Android device.
- Video playback and protected file previews on a real device.

## Isolation and implementation sequence

1. **Contract foundation — E1–E6, E10.** Define block and module-item discriminated unions in backend/OpenAPI; preserve legacy normalization; add schema fixtures consumed by backend, web, and mobile contract tests.
2. **Repair confirmed failures — E1, E5.** Fix Video/Divider canonical defaults, make create requirements consistent, and prevent mobile structured blocks from being saved through a plain text path.
3. **Renderer parity — E2–E6.** Extract a shared mobile native renderer, cover every type/variant, then make student and teacher preview consume it.
4. **Safe versions and exact preview — E7–E9.** Add version detail/change summary, guarded restore, and secure preview sessions before exposing Web/Compare in production.
5. **UX replacement — E10–E11.** Implement module outline, centered pickers, typed block library/editors, route-state retention, and accessibility. Run focused contracts, component tests, mobile navigation tests, web tests, backend tests, emulator layouts, then physical-device acceptance.

## Implementation ownership

| Work package | Primary owners |
|---|---|
| Backend block DTO/default/validation | `backend/src/modules/lessons/DTO/lesson.dto.ts`, `backend/src/modules/lessons/lessons.service.ts`, controller/OpenAPI tests |
| Version detail and restore guard | lesson controller/service/schema-facing tests |
| Preview session | backend lesson auth/service + dedicated Next.js preview route |
| Web add-block fix and contract types | lesson edit page, `structured-content.ts`, service/types/tests |
| Mobile block types/API | `mobile/src/types/lesson.ts`, `mobile/src/api/services/lessons.ts` |
| Shared native renderer | new lesson-block UI module consumed by `LessonDetailScreen` and `TeacherLessonDetailScreen` |
| Shared rich editor | extract from `AssessmentRichTextEditor`; retain assessment consumer |
| Mobile module UX | `TeacherModuleDetailScreen.tsx`, teacher primitives only where reuse is justified |
| Navigation/regression | `AppNavigator.tsx`, route types, teacher Back tests |

## Acceptance gates

- Creating each of the 11 author choices succeeds on web and mobile and returns the same normalized semantic block.
- Editing any structured block preserves its unedited fields and metadata.
- The student mobile route and teacher Mobile preview render the same component tree for the same fixture.
- Web preview can show a draft only to an authorized owner/admin, expires, and never receives the normal JWT in a URL.
- Version preview identifies changes; restore requires confirmation; stale restore returns 409 without changing the lesson.
- Module add-to-section is reachable from every expanded section; Settings is visible without a spare action row; no core action is ellipsis-only.
- 360px, 390px, and 430px widths have no clipped controls; every interactive target is at least 44px; screen reader labels name the action and target.
- HTML is rendered rather than shown as tags; rich text retains heading, bold, italic, underline, links, quote, code, ordered list, and unordered list behavior.
- Loading, empty, offline, validation, permission, expired-preview, and conflict states are exercised.
- Final acceptance separates static tests, emulator evidence, APK integrity, and authenticated physical-device testing.

## Recommended next implementation slice

Do not begin with the visual module screen. First land the lesson block discriminated contract and compatibility normalizer, add failing tests for Video/Divider defaults and mobile structured-block preservation, then build the shared native renderer. That removes the destructive/data-loss risk before the new authoring interface increases mobile usage.
