# Roster Preview and Student Mobile Layout Isolation Analysis

**Date:** 2026-09-15

**Authority boundary:** Evidence, isolation, and redesign planning only. No product code, API, schema, data, dependencies, git history, deployment, or release state was changed in this phase.

**Scope assumption:** “Mutable preview” means an admin can edit the roster data cells represented by the uploaded CSV/XLSX before server validation and final import; it does not mean reproducing Excel formulas, formatting, charts, or macros in the browser.

## 1. Executive verdict

The two reported problems are independent presentation systems and should be repaired without sharing implementation code.

### Admin roster import

- **Confirmed root cause 1 — no edit state exists.** The browser parser stores normalized cell strings in `filePreview`, but the preview renders those strings in plain `TableCell` elements. There is no cell update handler, dirty state, row operation, or editable input (`next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx:225-241,479-537`).
- **Confirmed root cause 2 — preview and commit are collapsed into one action.** `handleUploadPreview` calls the read-only preview endpoint, immediately calls the write endpoint, then clears the preview and selected file (`page.tsx:306-353`). The separate `handleCommit` and visible `Commit Import` control still exist (`page.tsx:355-384,561-579`), but the automatic commit path normally removes the data before the admin can use them.
- **Confirmed root cause 3 — tests preserve the wrong behavior.** The page test explicitly expects `Upload & Import` to call preview and commit in one click, and its local-preview test verifies only visible text (`page.test.tsx:123-158,222-262`).
- **Confirmed contract mismatch — sheets.** The browser preview exposes every worksheet, while backend import parses only the first worksheet (`page.tsx:165-197`; `backend/src/modules/roster-import/parsers/xlsx.parser.ts:7-53`). An editable UI must identify the first sheet as the import source instead of implying all visible sheets are imported.
- **Recommendation:** keep the current backend endpoints and make the browser’s first-sheet data grid editable. Any edit invalidates the last server validation. “Validate roster” serializes the current draft to an in-memory CSV/XLSX and calls the existing preview endpoint; only a later explicit “Commit import” writes. This restores the backend’s designed preview/commit separation without weakening its section, role, capacity, identity, transaction, audit, or activation checks.

Coupling is **medium** because the page owns local workbook state but commit creates/enrolls student accounts. The defect is removable through a frontend seam; a backend or schema change is not required for the recommended design.

### Student mobile Home and My Classes

- **Confirmed runtime symptom.** The supplied 955×2048 screenshots show the Home “After that” tiles extending past the right viewport and class-card actions breaking their icon/text alignment. The exact APK revision and device font-scale setting are unverified, but the displayed copy and hierarchy match current owners.
- **Confirmed Home cause.** `moveGrid` is always a horizontal row and both dynamic-content `MoveTile` controls are forced into that row (`mobile/src/screens/student-home/StudentHomeView.tsx:493-555,844-854`). There is no width/font-scale breakpoint or stacked fallback. This contradicts the accepted 320 px/large-text constraint and the original row-based Home direction (`docs/superpowers/plans/2026-09-10-student-mobile-follow-up-hotfixes.md:17`; `docs/superpowers/specs/2026-09-10-student-mobile-experience-redesign.md:114-115,203`).
- **Confirmed class-card cause.** `View Tasks` and `Continue Learning` are permanently split 50/50 inside one horizontal row. Each control combines an icon and a potentially two-line label inside a 52 px minimum height; no compact fallback exists (`mobile/src/screens/student-classes/StudentClassCard.tsx:146-170,240-248`). This leaves insufficient deterministic space for text and icon alignment on narrow/effective-large-text layouts.
- **Confirmed verification gap.** `student-follow-up-layout.test.ts` is a source-string test that requires `moveGrid` to contain `flexDirection: "row"`; `screen-render.test.tsx` checks text and navigation only, not calculated width or clipping (`student-follow-up-layout.test.ts:8-53`; `screen-render.test.tsx:2541-2581,3127-3191`). The focused suites pass while the supplied device artifact is visibly broken.
- **Recommendation:** use content-aware vertical rows for Home follow-ups and place the class card’s primary learning action on its own full-width row, followed by short secondary `Tasks` and `Schedule` controls. Preserve the navy/red/white hierarchy, data, and all navigation callbacks. This removes the contested width rather than hiding the defect with smaller text or disabled font scaling.

Coupling is **low** and presentation-local. The broken geometry is owned by two component files and their inadequate tests; API, React Query, navigator, backend, and academic procedures do not need to change.

## 2. Feature anatomy

### Current roster path

```text
Admin route
  -> choose section + attach file
  -> browser parses file into string-only filePreview
  -> read-only "Attached file preview"
  -> Upload & Import
       -> POST /roster-import/:sectionId/preview (no write)
       -> POST /roster-import/:sectionId/commit (transactional write)
       -> clear file/preview + refresh history
```

The backend contract itself is intentionally two-stage. Preview parses the first worksheet, verifies the target section and teacher/admin authority, validates names/LRN/email, checks duplicate identities, and classifies registered, pending, and error rows without writing (`roster-import.controller.ts:79-105`; `roster-import.service.ts:99-394`). Commit rechecks section state, school year, role, section capacity, registered-student eligibility, cross-section membership, email/LRN conflicts, creates pending accounts, enrolls students transactionally, writes import history, audits `academic.roster.imported`, and emits onboarding events after commit (`roster-import.service.ts:404-865`).

Editing a categorized registered row and committing it directly is unsafe: `userId` is the identity authority, while edited email/LRN/name fields could become stale relative to that match. Re-running the existing preview endpoint after edits is therefore required.

### Proposed roster state machine

```text
EMPTY -> ATTACHED/EDITABLE -> DIRTY -> VALIDATING -> VALIDATED -> COMMITTING -> COMMITTED
              ^                 |          |             |
              |                 +-- error -+             +-- write error keeps VALIDATED
              +------- Edit again invalidates validation -+
```

- Only `COMMITTING` may call the write endpoint.
- A changed section, replaced file, or edited cell clears the validated result.
- Network/validation errors retain the editable draft.
- The first worksheet is labeled `Import source`; additional sheets may remain visible as `Reference only` and never imply import coverage.
- A dirty replacement/clear action gets an explicit discard confirmation; browser Back remains ordinary route history and does not claim an import occurred.

### Current mobile paths

```text
DashboardScreen -> StudentHomeView -> MoveTile -> existing Lesson/Assessment routes
LessonsScreen -> StudentClassesView -> StudentClassCard
                                      -> ClassDetail (modules)
                                      -> ClassDetail (assignments)
                                      -> ClassDetail (calendar)
```

The layout repair changes only composition. Route names, `source: "home" | "classes"`, `initialTab`, back behavior, data derivation, refresh behavior, status semantics, and touch actions remain frozen.

## 3. Decision ledger

| Keep | Change | Frozen | Unknown |
|---|---|---|---|
| Uploaded workbook shown before server action; current section/template/history surfaces; server validation categories; GABHS red/white/navy identity; class subject/teacher/status/progress facts | Editable import-source cells; dirty/validated state; explicit validate then commit; accurate sheet messaging; Home follow-ups as bounded rows; class primary/secondary action hierarchy | Existing routes, roles, endpoints, response envelope, commit DTO, transaction/audit/onboarding behavior, academic policies, React Query ownership, mobile navigation callbacks, Android-only release policy | Exact file extension in the reported roster case; exact APK revision/font scale in screenshots; post-fix physical-device geometry until a new APK is installed |

## 4. Design directions

### Direction A — revalidated spreadsheet draft + content-aware mobile hierarchy (**recommended**)

1. Render the import-source worksheet as labeled cell inputs. Serialize the edited draft and call the existing multipart preview endpoint. Keep the returned classification read-only but provide `Edit rows` and explicit `Commit import` controls.
2. Render Home follow-ups as full-width compact rows, not a two-up card grid.
3. Render `Continue Learning`/`Open Class` full width, then a secondary row with the shorter labels `Tasks` and `Schedule`.

This direction changes hierarchy and action placement, preserves all frozen contracts, supports long/dynamic copy, and has the smallest data-integrity blast radius. Its tradeoff is slightly more vertical scrolling.

### Direction B — geometry-only patch

Add explicit width/flex-basis constraints, font-size caps, and breakpoints while retaining the two-up Home tiles and 50/50 class actions. This is the smallest diff, but it continues to make dynamic school content compete for half a phone and risks another device/font-scale regression. It is not recommended.

### Direction C — semantic row editor with a new backend re-preview contract

Replace raw workbook cells with named roster fields and add a JSON validation endpoint for edited rows. This offers the clearest field-level errors but changes backend/client contracts, adds another public input path, and no longer previews the uploaded worksheet itself. It is disproportionate to the reported problem.

### Accessibility and non-happy states for Direction A

- Cell inputs expose sheet, row, and column labels; keyboard focus remains inside the scrollable grid.
- Validation loading disables duplicate submission but not draft recovery.
- Empty/unsupported files keep the attachment error and never enable commit.
- Server errors remain tied to source row numbers and offer `Edit rows`.
- Mobile controls retain at least 44 px touch targets, allow two-line dynamic titles where necessary, and never suppress OS font scaling to force a fit.
- Offline failures keep current content and the roster draft; no success is fabricated.

## 5. Cascade map

| Edge | Provider / interface | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|
| R1 | `/dashboard/admin/roster-import` | `RosterImportPage` | Admin entry point | Direct | Confirmed | `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx:225-681` | Keep |
| R2 | file input -> `createSpreadsheetFilePreview` | `filePreview` state | Parses CSV/XLSX into string cells; preview only | Direct | Confirmed | `page.tsx:165-197,225-304` | Add editable draft seam |
| R3 | `filePreview` -> plain `TableCell` | Admin | Visible but immutable workbook cells | Direct/high | Confirmed | `page.tsx:479-537` | Replace cell display with controlled inputs |
| R4 | `handleUploadPreview` -> `rosterImportService.preview` | Backend preview | Read-only classification | Direct | Confirmed | `page.tsx:306-324`; `src/services/roster-import-service.ts:87-95` | Keep, rename to validation action |
| R5 | same handler -> `rosterImportService.commit` | Backend commit | Writes immediately after preview | Direct/critical | Confirmed | `page.tsx:325-345` | Cut automatic edge |
| R6 | server preview result -> commit DTO mapper | Commit endpoint | Preserves matched `userId` and pending rows | Direct/high | Confirmed | `page.tsx:355-373`; DTO `backend/.../roster-import.dto.ts:75-117` | Keep only after fresh validation |
| R7 | backend preview parser | first XLSX worksheet + DB identity lookups | Section/row validation and classification, no writes | Transitive/high | Confirmed | `roster-import.service.ts:99-394`; `xlsx.parser.ts:7-53` | Keep authoritative |
| R8 | backend commit transaction | users/profiles/enrollments/import history/audit/onboarding | Durable academic and identity side effects | Stateful/async/critical | Confirmed | `roster-import.service.ts:404-865` | Preserve unchanged |
| R9 | all-sheet browser preview | first-sheet backend parser | UI can imply unconsumed sheets will import | Compatibility/medium | Confirmed | `page.tsx:182-195,494-502`; `xlsx.parser.ts:10-13` | Label import source and reference sheets |
| R10 | page Jest tests | CI | Protects auto-commit and visibility, not editing/stage separation | Operational/high | Confirmed | `page.test.tsx:123-158,222-262`; focused suite 4/4 passed | Replace with edit/invalidate/validate/explicit-commit cases |
| M1 | `DashboardScreen` -> `StudentHomeView` | Student Home | Supplies current agenda data and navigation | Direct | Confirmed | `mobile/src/screens/DashboardScreen.tsx:1172-1225` | Keep |
| M2 | fixed `moveGrid` row -> two `MoveTile`s | Home “After that” | Dynamic cards compete horizontally and overflow in supplied screenshot | Direct/high | Confirmed | `StudentHomeView.tsx:493-555,844-854`; supplied image 2 | Replace with vertical row stack |
| M3 | `StudentClassesView` -> `StudentClassCard` | My Classes | Supplies row data and unchanged route callbacks | Direct | Confirmed | `StudentClassesView.tsx:124-142` | Keep |
| M4 | fixed 50/50 `actionRow` | Class actions | Long labels/icons lose stable alignment in supplied screenshot | Direct/high | Confirmed | `StudentClassCard.tsx:146-181,240-249`; supplied image 1 | Separate primary and secondary hierarchy |
| M5 | source-string layout test | CI | Requires fixed Home row and cannot calculate geometry | Operational/high | Confirmed | `student-follow-up-layout.test.ts:8-53`; focused suite 4/4 passed | Replace brittle assertion with desired hierarchy/layout policy |
| M6 | React Test Renderer navigation test | CI | Proves copy/callbacks but not width/clipping | Operational/medium | Confirmed | `screen-render.test.tsx:2541-2581,3127-3191` | Keep callback checks; add bounded layout assertions/runtime evidence |
| M7 | mobile source change -> Android release pipeline | installed users | Requires APK/version/manifest refresh to deliver the fix | Operational/high | Confirmed | `mobile/app.json:5,22`; `mobile/android/app/build.gradle:95`; public manifest versionCode 41 | Run packaging/release gates after implementation |

## 6. Isolation and ordered cuts

### Roster phase

1. **Characterize R3/R5/R10:** write failing tests proving a cell can be edited, editing invalidates validation, validate does not commit, and commit occurs only after a fresh valid preview. Rollback: tests only.
2. **Create the R2 seam:** extract pure workbook draft update/serialization helpers from the page so file parsing and edited upload generation can be tested without the route. Preserve row numbers and sheet order; label the first sheet as authoritative. Rollback: restore page-local parser.
3. **Cut R3:** add controlled inputs plus dirty state and discard behavior. Changing section/file/cell clears the server preview. Rollback: revert editable rendering; no backend/data cleanup.
4. **Cut R5:** make the first action validation-only and retain `handleCommit` as the sole write path. Rollback: revert frontend commit staging only; no schema rollback.
5. **Validate R6-R9:** use CSV and XLSX fixtures with an invalid row corrected in-browser, assert the uploaded edited file is what preview receives, then explicitly commit the server-derived rows. Confirm failed validation/write retains the draft.

### Mobile phase

1. **Characterize M2/M4-M6:** replace the test that mandates a row with failing expectations for a vertical Home follow-up hierarchy and a full-width primary class action; retain route callback assertions. Rollback: tests only.
2. **Cut M2:** recompose `MoveTile` as a compact full-width row/stack. Preserve its labels, tones, and destinations. Rollback: one presentation component/file.
3. **Cut M4:** move the primary class action to its own row and shorten secondary visible labels without changing accessibility labels or callbacks. Rollback: one presentation component/file.
4. **Validate:** focused render/navigation tests, full mobile typecheck and Jest, then Android packaging because mobile bundle code changed. Capture a 320–360 dp or equivalent device/emulator screenshot with large text before release acceptance.

Compatibility is additive at the UI layer. No migration, persistent cleanup, cache invalidation, API consumer update, or backend rollout ordering is required for Direction A. Roll back by reverting the frontend/mobile commit and serving the prior APK/manifest; roster data already committed before the fix remains authoritative and must not be deleted.

## 7. Improvements

### Required decoupling

- Separate roster draft, server validation, and durable commit into explicit states. The commit endpoint must never be invoked from the validation handler.
- Replace content-width-dependent mobile rows with a hierarchy that has one unambiguous width owner per action/content block.

### Optional, evidence-backed enhancements (maximum five)

1. Add `data-testid`/accessible labels using sheet-row-column coordinates so corrected cells and server row errors can be correlated reliably.
2. Surface `Only the first worksheet is imported` beside sheet tabs; mark later sheets `Reference only`.
3. Add an admin `Discard edits` confirmation only when the draft is dirty.
4. Add a small pure mobile layout-policy test for compact widths/font scales if tablet two-column behavior is introduced later.

## 8. Verification and acceptance matrix

| Requirement | Proof required |
|---|---|
| Uploaded CSV/XLSX is visible and editable | Component test edits a cell and observes controlled draft state; browser check verifies keyboard/mouse editing and horizontal scroll |
| Edits are actually validated | Captured `File` passed to `rosterImportService.preview` contains the edited value |
| Preview is non-destructive | Test asserts zero `commit` calls after attach/edit/validate and while errors exist |
| Import is explicit and authoritative | Only `Commit import` sends the latest server-derived registered/pending rows; stale preview is disabled after edits |
| Existing safeguards remain | Backend roster specs stay green; no backend diff for Direction A |
| Home does not overflow | Structure/layout check plus 320–360 dp large-text runtime screenshot shows both follow-ups inside viewport |
| Class actions remain aligned | Runtime screenshot shows full-width primary CTA and bounded secondary controls; navigation tests prove all three destinations |
| No mobile regression | Focused tests, full `npm --prefix mobile run typecheck`, full mobile Jest, release checks, APK verifier, exact-SHA CI/deployment, public artifact/manifest equality |

## 9. Uncertainty and coverage boundary

- **Unverified:** the exact mobile version/build and OS font scale used for the supplied screenshots. This does not change the confirmed fixed-row ownership, but it limits pixel-specific claims.
- **Unverified:** post-fix physical-device rendering until the new APK is installed and the two target screens are captured.
- **Bounded assumption requiring approval:** editable roster *data cells* are sufficient; Excel formulas/styles/macros are outside roster semantics and will not become a general spreadsheet editor.
- `.xls` is accepted by file selectors/validation but the browser explicitly cannot preview it and the backend routes it through the XLSX parser. Legacy `.xls` edit support is not proven and should remain an explicit conversion requirement unless separately expanded.
- Source/consumer searches covered the roster module, its web client/page/tests, the two mobile owners/parents/tests, and release metadata. **No additional dependency was found within the inspected scope.**

## Approved direction

The user approved **Direction A** on 2026-09-15. The canonical implementation and release plan is `docs/feature-plans/2026-09-15-roster-preview-and-student-mobile-layout.md`.
