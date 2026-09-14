# Editable Roster Preview and Student Mobile Layout Implementation Plan

**Date:** 2026-09-15

**Status:** Direction A implemented and locally verified; exact-SHA release verification pending

**Evidence source:** `docs/feature-analysis/2026-09-15-roster-preview-and-student-mobile-layout-analysis.md`

## 1. Decision summary and feature brief

Implement Direction A as two isolated presentation changes with one coordinated release:

1. Turn the admin roster attachment preview into an editable spreadsheet draft. A changed draft must be sent through the existing server preview endpoint, and only an explicit `Commit import` action may invoke the existing commit endpoint.
2. Recompose the student Home `After that` content as full-width rows and the My Classes actions as one full-width primary action plus bounded `Tasks` and `Schedule` secondary actions.

The recommendation is **frontend-only**. The existing backend preview/commit boundary is already the correct authority and remains unchanged. The mobile API/query/navigation contracts also remain unchanged.

## 2. Scope, non-goals, permissions, and assumptions

### In scope

- `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx`
- A focused roster workbook-draft helper under `next-frontend/src/lib/`
- Roster page/helper Jest coverage
- `mobile/src/screens/student-home/StudentHomeView.tsx`
- `mobile/src/screens/student-classes/StudentClassCard.tsx`
- Focused mobile layout/render coverage
- Android version, APK, public manifest, and release metadata required to deliver the mobile bundle change
- The approved repository release workflow: commit, push `developement`, verify exact-SHA CI/deployment, and verify the public APK/manifest

### Non-goals

- No general-purpose Excel editor: formulas, styles, macros, merged cells, and workbook protection editing are out of scope.
- No legacy `.xls` editing. The UI will retain the explicit instruction to convert `.xls` to `.xlsx` for browser preview/editing.
- No backend endpoint, DTO, schema, role, academic-policy, audit, onboarding, or transaction changes.
- No mobile data, React Query, navigator, route parameter, or back-navigation changes.
- No unrelated admin, teacher, AI, or deployment changes.
- No iOS build/version change; this request changes and distributes the Android package only.

### Permissions and approved assumptions

- The user approved Direction A after reviewing the isolation report.
- The original goal explicitly authorizes implementation, testing, APK packaging, commit, push, deployment, and verification after planning.
- Editable roster **data cells** are sufficient for the roster workflow.
- The first worksheet is the only import source because the backend parser consumes only that sheet. Additional worksheets are viewable as `Reference only`.

## 3. Current-state evidence ledger

| Status | Evidence | Consequence |
|---|---|---|
| Confirmed | `RosterImportPage` stores parsed cells but renders them as plain `TableCell` content. | The attached workbook is visible but immutable. |
| Confirmed | `handleUploadPreview` calls `rosterImportService.preview` and then `commit` in one action. | The server preview is not a usable correction checkpoint. |
| Confirmed | `handleCommit` and a commit result UI already exist separately. | The auto-commit edge can be removed without a new endpoint. |
| Confirmed | The backend preview performs parsing/classification without writes; commit rechecks policy and writes transactionally. | Reuse both endpoints in their intended sequence. |
| Confirmed | The XLSX backend parser reads only the first worksheet while the browser exposes every sheet. | The UI must identify the authoritative sheet. |
| Confirmed | Current roster tests expect auto-commit and only assert preview text visibility. | Replace the wrong contract with edit/validate/stale/commit tests. |
| Confirmed | `StudentHomeView` puts two dynamic `MoveTile`s in an unconditional horizontal `moveGrid`. | Long content competes for half the phone and can overflow. |
| Confirmed | `StudentClassCard` puts `View Tasks` and `Continue Learning` in a fixed 50/50 row. | Icon and label geometry is unstable on narrow/large-text layouts. |
| Confirmed | The focused mobile layout test requires the broken horizontal Home row; render tests validate callbacks but not bounded hierarchy. | Test assertions must describe the desired layout, not preserve the defect. |
| Unverified | The exact APK SHA and font-scale setting used for the supplied screenshots. | Do not make pixel-specific or physical-device completion claims without new runtime evidence. |

## 4. End-to-end impact and consumer map

```text
Roster file input
  -> browser draft parser
  -> editable cell state
  -> edited File serialization
  -> POST /roster-import/:sectionId/preview  [no writes]
  -> server-derived registered/pending/errors
  -> explicit Commit import
  -> POST /roster-import/:sectionId/commit [transaction/audit/onboarding]

DashboardScreen
  -> StudentHomeView
  -> full-width After that rows
  -> existing LessonDetail / AssessmentDetail / Assessments routes

StudentClassesView
  -> StudentClassCard
  -> full-width Open Class / Continue Learning
  -> Tasks + Schedule secondary controls
  -> existing ClassDetail tabs and route parameters
```

| Provider/interface | Consumers | Planned effect |
|---|---|---|
| `createSpreadsheetFilePreview` and new draft helpers | Roster page and helper tests | Extract into a focused client helper; preserve normalized strings, row numbers, sheet order, and CSV/XLSX support. |
| Editable workbook draft | Server preview call | Serialize the current draft into an in-memory `File`; never validate the stale original after edits. |
| `rosterImportService.preview(sectionId, file)` | Existing backend preview controller/service | Contract unchanged; now called from `Validate roster` only. |
| `RosterImportPreview` | Page result tables and commit DTO mapping | Keep read-only classifications and existing server-derived `userId` authority. |
| `rosterImportService.commit(sectionId, dto)` | Existing transactional backend path | Contract unchanged; callable only from explicit commit with a fresh preview. |
| `StudentHomeView` props and navigation | Dashboard and destination screens | Props/routes unchanged; only internal composition changes. |
| `StudentClassCard` callbacks | `StudentClassesView` and `ClassDetail` tabs | Callback signatures/destinations unchanged; only action hierarchy and visible secondary labels change. |
| Mobile source bundle | Android users and update service | Requires a new versionCode/versionName, APK, public manifest, and exact artifact verification. |

No additional contract consumer was identified in the inspected roster module, its web service/page/tests, the two mobile owners and parents, or the Android release metadata.

## 5. Conflicts, invariants, risks, and design options

### Invariants

- Backend remains the authority for identities, enrollment eligibility, section capacity, school-year state, roles, audit history, and durable writes.
- Editing any cell, changing section, or replacing the attached file invalidates the last server preview.
- A failed preview request retains the editable draft and cannot enable commit. Row-level errors returned by a successful preview remain visible while the existing partial-import rule continues to allow its valid rows to be committed.
- Commit uses only the latest server-derived registered and pending rows; the browser must not manufacture `userId` matches.
- The first XLSX worksheet is the import source; other sheets must not imply import coverage.
- Mobile colors, content semantics, minimum touch size, font scaling, and all navigation callbacks remain intact.

### Design options

| Option | Benefit | Cost/risk | Decision |
|---|---|---|---|
| A. Revalidated cell draft + content-aware mobile hierarchy | Restores the intended server boundary and removes mobile width contention. | Slightly more vertical space and a small client serialization helper. | **Approved** |
| B. Geometry-only width/font patch | Smallest visual diff. | Dynamic content still competes in half-width containers and can regress. | Rejected |
| C. Semantic JSON row editor + new backend endpoint | Strong named-field UX. | New public contract, duplicated parser rules, and no longer previews the uploaded sheet. | Rejected |

### Principal risks and controls

| Risk | Control |
|---|---|
| Edited data is not what the server validates. | Unit-test the `File` passed to `preview`; serialize from current state immediately before the request. |
| Stale validation is committed after another edit or section change. | Clear `preview` on every draft/section/file mutation and disable commit without it. |
| CSV quoting or XLSX row positions are corrupted. | Pure helper tests for commas, quotes, newlines, blank row positions, sheet order, and first-sheet labeling. |
| A registered match keeps a stale `userId` after identity edits. | Always rerun server preview and commit only its newest classification. |
| Mobile labels still clip with large text. | Use one full-width dynamic primary control; keep secondary labels short and do not cap OS font scaling. |
| Release metadata points at a stale APK. | Run release preparation/verification and compare APK size/SHA/version against the public manifest before and after deployment. |

## 6. Recommended architecture, data flow, security, and error behavior

### Roster draft helper

Create `next-frontend/src/lib/roster-import-preview.ts` with exported types and pure/testable operations:

- `SpreadsheetFilePreview` records source kind, name, size label, sheet order, source row numbers, and normalized string cells.
- `createSpreadsheetFilePreview(file)` parses CSV or XLSX using the existing browser behavior.
- `updateSpreadsheetPreviewCell(preview, sheetIndex, rowNumber, columnIndex, value)` returns a new draft without mutating prior state.
- `createSpreadsheetPreviewUpload(preview)` serializes CSV with RFC-compatible quoting or creates an XLSX workbook preserving sheet order and row positions.
- The generated `File` retains a supported extension and MIME type. Only in-memory browser data is created; nothing is uploaded until `Validate roster`.

### Roster page state and actions

```text
EMPTY
  -> ATTACHED_EDITABLE
  -> DIRTY
  -> VALIDATING
  -> VALIDATED
  -> COMMITTING
  -> COMMITTED
```

- Cell inputs use accessible names containing worksheet, row, and column.
- The first sheet tab shows `Import source`; subsequent tabs show `Reference only` plus a notice that only the first worksheet is imported.
- `Validate roster` serializes the latest draft and calls preview. It does not call commit.
- A successful validation enables the existing `Commit import` action when at least one valid row exists. Existing row-level errors remain visible and excluded from the commit DTO.
- Editing after validation immediately removes the result/commit opportunity.
- Validation/commit errors display the current API message and retain the draft.
- Clearing or replacing a dirty file uses a browser confirmation. Cancel keeps the draft; confirm resets it.
- Auth/RBAC, upload limits, CSRF/request behavior, and backend checks remain owned by existing service/controller layers.

### Mobile composition

- Home replaces `moveGrid` with `moveStack`; each `MoveTile` becomes a compact row with a fixed icon area and flexible wrapping copy.
- Class cards render the dynamic primary action full width first. A separate two-column secondary row contains `Tasks` and `Schedule`, with unchanged callback destinations and explicit accessibility labels `View tasks` and `View schedule`.
- Use existing theme values and pressed states. Do not add breakpoints, font-size reductions, disabled font scaling, new routes, or conditional platform behavior.

## 7. Contract, schema, migration, and compatibility changes

| Area | Change |
|---|---|
| Backend HTTP API | None. Existing multipart preview and JSON commit endpoints are reused. |
| DTO/response envelope | None. |
| Database/schema/migration | None. |
| Auth/RBAC/audit | None. Existing guards and `academic.roster.imported` audit remain authoritative. |
| Web internal API | New client-only helper types/functions under `src/lib`; page-local parser functions move there. |
| Mobile props/navigation | None. Visible `View Tasks`/`View Schedule` labels become `Tasks`/`Schedule`; accessible labels retain the full intent. |
| Android distribution | Increment `expo.version`, Android `versionCode`, Gradle `versionName/versionCode`, and refresh the APK/manifest. iOS build number remains unchanged. |
| Compatibility | Existing CSV/XLSX inputs and backend outputs remain valid. `.xls` continues to require conversion for editable preview. |

Rollback needs no schema cleanup. Reverting the client/mobile changes restores prior UI behavior; previously committed roster data remains authoritative and must not be deleted.

## 8. Ordered implementation phases with exact owners

### Phase 1 — roster characterization tests (RED)

**Owner:** `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.test.tsx`

1. Replace the auto-commit expectation with a test that attaches a real CSV, edits a labeled cell, selects a section, and clicks `Validate roster`.
2. Assert the `File` passed to `rosterImportService.preview` contains the edited value and `commit` has not been called.
3. Add an explicit-commit test asserting the existing DTO mapper is invoked only after validation and `Commit import` is clicked.
4. Add a stale-preview test: after validation, edit a cell and assert the server result/commit action is removed until revalidation.
5. Add an error-retention test: a rejected preview leaves the edited input value intact.

Run and observe the expected failure:

```bash
npm --prefix next-frontend test -- --runInBand --runTestsByPath 'app/(dashboard)/dashboard/admin/roster-import/page.test.tsx'
```

### Phase 2 — workbook draft seam (GREEN)

**Owners:**

- `next-frontend/src/lib/roster-import-preview.ts`
- `next-frontend/src/lib/roster-import-preview.test.ts`
- `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx`

1. Move current CSV/XLSX parsing and preview types from the page into the helper.
2. Add immutable cell-update and CSV/XLSX serialization functions.
3. Test CSV escaping, edited value propagation, XLSX sheet/row preservation, and supported-file metadata.
4. Keep ExcelJS as the existing dependency; add no package.
5. Run helper and page suites until green.

### Phase 3 — editable staged roster workflow (GREEN/refactor)

**Owners:** page and page test above.

1. Render controlled cell inputs and authoritative/reference sheet labels.
2. Add dirty state, discard confirmation, and a shared validation-invalidation function.
3. Rename the combined action to `Validate roster`; serialize the draft and call preview only.
4. Keep `handleCommit` as the sole write path and retain draft state across server errors.
5. Remove obsolete auto-commit copy and assertions; preserve template download, import history, loading, and section selection behavior.

### Phase 4 — mobile characterization tests (RED)

**Owners:**

- `mobile/src/screens/__tests__/student-follow-up-layout.test.ts`
- `mobile/src/screens/__tests__/screen-render.test.tsx`

1. Replace the assertion requiring horizontal `moveGrid` with one requiring a vertical `moveStack` and compact row ownership.
2. Require class-card primary and secondary containers to be distinct and dynamic primary copy to remain full-width.
3. Update visible label assertions to `Tasks` and `Schedule` while retaining all route/callback assertions.
4. Run the focused suites and record the expected pre-implementation failure.

```bash
npm --prefix mobile test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts src/screens/__tests__/screen-render.test.tsx
```

### Phase 5 — mobile layout implementation (GREEN/refactor)

**Owners:**

- `mobile/src/screens/student-home/StudentHomeView.tsx`
- `mobile/src/screens/student-classes/StudentClassCard.tsx`

1. Replace the Home grid with a full-width row stack; give the icon fixed geometry and copy `flex: 1, minWidth: 0` with wrapping.
2. Move the class primary action into a standalone full-width surface.
3. Place `Tasks` and `Schedule` in a separate bounded row; retain 44+ px touch targets, callbacks, pressed feedback, and accessibility labels.
4. Run the focused tests until green.

### Phase 6 — local verification

Run the smallest gates first, then the broader relevant gates:

```bash
npm --prefix next-frontend test -- --runInBand --runTestsByPath 'src/lib/roster-import-preview.test.ts' 'app/(dashboard)/dashboard/admin/roster-import/page.test.tsx'
npm --prefix next-frontend run typecheck
npm --prefix next-frontend run lint
npm --prefix next-frontend run build
npm --prefix mobile test -- --runInBand src/screens/__tests__/student-follow-up-layout.test.ts src/screens/__tests__/screen-render.test.tsx
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runInBand
npm --prefix mobile run build:rich-text
npm --prefix mobile run test:release
```

Run the focused backend roster specs as regression evidence even though no backend file is expected to change. Use the exact package script/test path discovered at execution time.

### Phase 7 — Android package and manifest

**Owners:**

- `mobile/app.json`
- `mobile/android/app/build.gradle`
- `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- `next-frontend/public/downloads/nexora-student-mobile-release.json`

1. Recheck current versions immediately before editing; increment Android versionCode once and versionName/Expo version once. Keep iOS build number unchanged.
2. Build the release APK with the repository's configured Android environment.
3. Copy the exact APK into the public download path.
4. Run `npm --prefix mobile run release:prepare -- --release-notes "Editable roster validation and corrected student Home and My Classes layouts."`.
5. Run `npm --prefix mobile run release:verify` and independently record version, byte size, and SHA-256.

### Phase 8 — self-review, commit, push, and release proof

1. Review `git diff --check`, scoped diff/stat, and each changed file for accidental scope expansion or secrets.
2. Confirm the plan/report and implementation agree; confirm no backend contract/schema diff.
3. Commit all in-scope source, tests, analysis, plan, APK, and manifest on `developement` with a descriptive message.
4. Recheck `origin/developement...HEAD`, push `developement`, and capture the exact pushed SHA.
5. Verify all required GitHub Actions for that SHA, Railway deployment success for that SHA, and live public APK/manifest version-size-hash equality. Never treat a green CI job as physical-device visual proof.

## 9. Verification matrix and acceptance criteria

| Requirement | Automated proof | Runtime/release proof |
|---|---|---|
| Uploaded CSV/XLSX is editable | Page test changes a labeled input; helper tests cover CSV/XLSX. | Browser check can type into the attached grid. |
| Server validates current edits | Inspect the captured preview `File` and assert edited data. | Network request contains the edited draft. |
| Validation does not write | `commit` call count stays zero after validate/error/edit. | No import history/success is produced until commit. |
| Commit is explicit and fresh | Click-only test for `Commit import`; stale preview disappears after mutation. | Result UI clearly separates edit/validate/commit. |
| Workbook semantics are honest | Test first-sheet `Import source`, later-sheet `Reference only`. | Sheet notice matches backend behavior. |
| Existing safeguards remain | Focused backend roster specs pass; backend diff is empty. | Existing errors/capacity/policy continue to come from the server. |
| Home stays inside the viewport | Layout contract requires vertical rows and flexible copy. | 320–360 dp or equivalent large-text screenshot shows both rows bounded. |
| Class actions remain aligned | Layout/render tests require full-width primary and unchanged callbacks. | Screenshot shows primary plus bounded secondary controls. |
| Android artifact is deliverable | Typecheck/Jest/release verifier pass. | APK embedded metadata, manifest version, bytes, SHA, URL, exact-SHA CI, and Railway deployment agree. |

Acceptance requires all automated gates that are available locally plus exact artifact/deployment proof. Physical-device appearance remains a separate acceptance item unless a device/emulator becomes available during execution.

## 10. Rollout, rollback, observability, cleanup, and unverified boundaries

### Rollout

- One normal `developement` release after local gates.
- Web deployment changes the roster page and serves the new Android artifact.
- The app version endpoint/public manifest exposes the new Android build according to the existing release contract.
- No feature flag or multi-stage database deployment is necessary because contracts and schemas do not change.

### Rollback

- Web/mobile source: revert the implementation commit and redeploy.
- Android: restore the prior verified APK/manifest pair together; never mix a new manifest with an old APK.
- Roster data: do not delete historical imports. The backend commit transaction remains authoritative and is unaffected by this UI rollback.

### Observability and audit

- Use existing API errors/toasts for validation and commit failures.
- Use existing pending import history and `academic.roster.imported` audit behavior to confirm writes occur only at commit.
- Use GitHub Actions and Railway deployment state tied to the exact commit SHA.
- Record APK SHA-256, bytes, versionCode, versionName, download URL, and public-manifest equality.

### Cleanup

- Remove page-local parser duplicates after the helper is covered.
- Remove the old `Upload & Import`/auto-commit test and `moveGrid` assertion.
- Add no temporary fixtures, downloaded artifacts outside the approved public path, dependency changes, or backend compatibility shims.

### Unverified boundaries

- Exact device/font-scale provenance of the original screenshots.
- Physical-device post-fix rendering until the built APK is installed and both target screens are captured.
- Legacy `.xls` parsing/editing, formulas, styles, macros, and merged-cell fidelity remain outside scope.

These boundaries do not block Direction A's source implementation or automated release verification, but they must remain explicit in the final evidence report.

## 11. Local execution evidence

- RED evidence: the new roster page tests initially failed because no editable cell or `Validate roster` action existed; the workbook helper test initially failed because the helper did not exist; the mobile contract tests initially failed because `moveGrid` and the fixed class action row still owned the layout.
- GREEN evidence: roster helper/page suites passed **10/10**; focused mobile layout/render suites passed **95/95**.
- Regression evidence: next-frontend passed **194 suites / 875 tests**, mobile passed **127 suites / 713 tests**, and focused backend roster safeguards passed **3 suites / 25 tests**.
- Static/build evidence: both frontend typechecks passed, the next-frontend lint gate passed, and the production Next.js build generated all 75 static pages successfully.
- Android evidence: the first clean build exposed a Gradle prefab ordering race between Worklets and Reanimated; the unchanged build succeeded serially after the prerequisite existed. The verified ARM64 APK embeds package `com.nexora.lms.mobile`, version `0.1.41` / build `42`, the production backend URL, installer permission, v2 signature, and 16 KB alignment.
- Artifact evidence: `next-frontend/public/downloads/nexora-student-mobile-release.apk` is **41,077,411 bytes** with SHA-256 `a6a65a8b74a42d6d8cade3e5d299fe95293b0cd0b612bdacdd1eaa8a063f4a74`; `release:verify` confirms the public manifest matches it.
- Still unverified: physical-device rendering of the two repaired student screens. No connected Android device or `adb` surface was available for that evidence.
