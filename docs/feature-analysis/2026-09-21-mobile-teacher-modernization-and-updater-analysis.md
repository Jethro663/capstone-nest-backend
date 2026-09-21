# Nexora Mobile Teacher Modernization and Android Updater Analysis

**Date:** 2026-09-21  
**Scope:** Planning and evidence only; no production mobile, backend, schema, release, or data changes were made.  
**Prototype:** `/home/jethro/.codex/visualizations/2026/09/21/01a0c425-9c46-7d21-b436-ec2ffe985ce5/nexora-mobile-teacher-redesign.html`

## 1. Executive decision

Adopt a **“navy frame, red intent”** visual system across the mobile app:

- Use web navy `#0C1D3A` for app bars, navigation context, selected navigation, and high-emphasis information surfaces.
- Use the current web red `#DC2626` for primary action, urgency, notification badges, and destructive confirmation—not as the background color of every control.
- Keep content surfaces white or near-white so dense academic information remains readable.
- Replace role-specific filter pills with one shared **Filter & sort trigger + bottom-sheet selector**. Keep segmented controls only when they switch persistent page sections such as Overview / Submissions / Analytics.
- Reduce the app to four shared action shapes: primary filled, secondary outlined, quiet/tertiary, and icon-only overflow.
- Remove duplicate page identity strips when the top app bar already provides the title. Retain contextual cards only when they communicate record-specific state or a next action.

This direction is recommended because it creates the red/navy contrast requested by the user while avoiding a dark, heavy, or decorative dashboard. It also matches the most useful patterns found in current high-adoption LMS apps: task-first dashboards, compact course context, consolidated filters, direct grading entry, and focused mobile review.

## 2. Evidence labels

- **Confirmed:** directly verified in repository code, a built artifact, or an authoritative source.
- **Inferred:** strongly indicated by the code or interaction architecture but not reproduced on a physical device.
- **Unverified:** requires physical-device, authenticated runtime, or user acceptance evidence.

## 3. Android update failure investigation

### Verdict

**Confirmed root cause for devices upgrading from build 46 or earlier:** the installed APK and build 47 are signed by different certificates. Android therefore cannot install build 47 as an in-place update over the legacy build.

Android documents that an app signing key normally does not change during the app's lifetime, and users can update only when the update is signed with the expected signing key. See [Android app signing](https://developer.android.com/studio/publish/app-signing).

### Artifact evidence

Both APKs use the same package name, so this is not a package-ID mismatch:

| Artifact | Package | Version | Certificate subject | SHA-256 certificate digest |
|---|---|---:|---|---|
| Previous public APK | `com.nexora.lms.mobile` | `46` / `0.1.45` | `CN=Android Debug, OU=Android, O=Unknown…` | `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| Current public APK | `com.nexora.lms.mobile` | `47` / `0.1.46` | `CN=Nexora LMS, OU=Mobile, O=Gat Andres Bonifacio High School…` | `46cbcee985a7e0ecfda5a8fddfbdd679d9f0312ee07d96a593817302eb7c0a39` |

The fingerprints were verified with Android SDK Build Tools 36 `apksigner`. Package/version metadata was verified with `aapt dump badging`.

The repository history confirms the transition:

- Build 46 configured the `release` build type with `signingConfigs.debug`.
- Build 47 configures the release-specific keystore at `mobile/android/app/build.gradle:127-149`.
- The current release manifest requires build 47 and points to the immutable build-47 APK at `next-frontend/public/downloads/nexora-student-mobile-release.json:1-17`.

### Why the failure felt unexplained

**Confirmed:** the app already recognizes build 46 and earlier as a one-time legacy-signer migration and tells the user to uninstall the old app before installing the school release (`mobile/src/providers/UpdateProvider.tsx:987-1022`).

**Confirmed:** the installer handoff only receives a general activity result and maps a non-success result to `cancelled_or_blocked` (`mobile/src/services/update/update.service.ts:226-256`). The UI can therefore show a generic “cancelled or blocked” or unknown-sources explanation even when Android's actual reason is certificate incompatibility.

**Inferred:** this message mismatch is why a technically intentional signing migration still looked like an unexplained updater failure.

**Confirmed:** the ordinary updater downloads the APK under Expo's app-private cache directory (`mobile/src/services/update/update.service.ts:10,145-181`). Android removes that directory when the legacy app is uninstalled. A legacy migration must therefore hand the immutable HTTPS artifact to the system browser/download manager before uninstall; downloading only into the app cache and then asking the user to uninstall cannot complete the migration.

### Required remediation design

Do **not** return to the debug certificate. Keep the permanent Nexora production signer and make the one-time migration unmistakable:

1. Detect legacy builds before download and label the step **“One-time reinstall required”**, not “Update.”
2. Require the user to be online and complete a final sync/readiness check before proceeding.
3. Explain that uninstalling removes device-only offline snapshots or unfinished local work, while already-synced official school records remain on the server.
4. Provide two bounded actions: **Open school APK download** and **Not now**. The first opens the immutable HTTPS artifact in the system browser/download manager so it survives app removal; it must not use the app-private cache downloader.
5. Show literal steps: finish and sync work → open/download the school APK in the browser → uninstall old Nexora → open the saved APK → install → sign in again.
6. For build 47 and later, retain the normal verified in-app download and in-place update flow and never display the legacy reinstall path.
7. Record telemetry or local diagnostic state for `legacy_signer_migration_shown`, `external_apk_download_opened`, and `post_install_version_confirmed`; do not claim installation completed solely from the Android intent result.

### Acceptance evidence still required

- **Unverified:** reproduce on a physical Android device with build 46 installed.
- **Unverified:** confirm the exact system installer message and screenshots.
- **Unverified:** complete the uninstall/install path, authenticate again, and verify server-owned records.
- **Unverified:** verify a build 47 → build 48 update succeeds in place with the same production certificate.
- **Unverified:** verify local-only drafts/offline data warnings match actual storage behavior.

`adb` is not installed on this workstation, so installed-package signature and physical-device evidence were not available in this analysis.

## 4. External design benchmark

This is a representative benchmark of the most widely adopted current mobile LMS products, not a claim to have inspected every LMS ever published.

| Product/source | Adoption signal on 2026-09-21 | Pattern worth borrowing | Pattern to avoid |
|---|---:|---|---|
| [Google Classroom](https://play.google.com/store/apps/details?id=com.google.android.apps.classroom&hl=en_US) | 100M+ Android downloads | Simple assignment workflow, restrained screen hierarchy, low learning cost | Do not copy its reliance on very sparse screens when Nexora teachers need richer grading controls |
| [Canvas](https://play.google.com/store/apps/details?id=com.instructure.candroid&hl=en_US) | 10M+ Android downloads; 4.5 rating | Customizable, task-focused dashboard; offline support; clear course context | Avoid pushing advanced grading into too many nested surfaces |
| [Moodle](https://play.google.com/store/apps/details?id=com.moodle.moodlemobile&hl=en_US) | 10M+ Android downloads; 4.5 rating | Offline course access, activity progress, deadline focus | Avoid long content streams without strong contextual anchors |
| [Blackboard](https://play.google.com/store/apps/details?id=com.blackboard.android.bbstudent&hl=en_US) | 10M+ Android downloads | Alerts, grading entry, and course management from mobile | Its lower rating is a warning against broken deep links, blank content, and session friction |
| [Schoology](https://play.google.com/store/apps/details?id=com.schoology.app&hl=en_US) | 10M+ Android downloads | Broad course coverage confirms demand for full mobile workflows | 1.8 rating and reviews about scrolling/content problems are a direct warning for Nexora's WebView and long-page behavior |
| [Canvas Teacher mobile feature matrix](https://community.instructure.com/en/kb/articles/388744-canvas-teacher-mobile-features) | Official product documentation | Filter/sort submissions, grading, messaging, files, and dark mode are treated as first-class mobile tasks | Do not expose controls that cannot be completed safely on mobile |
| [Canvas SpeedGrader redesign](https://community.instructure.com/en/discussion/659754/grade-faster-anywhere-canvas-teacher-app-just-leveled-up) | Current official redesign write-up | Assignment/due/status in the header; a direct grading shortcut; consolidated filters; grading, comments, and details in one focused flow | Avoid extra taps and context loss between submission list and grading |

### Derived design principles

1. **Show the next task, not a decorative dashboard.** A teacher home should answer “What happens next?” and “What needs attention?” in one glance.
2. **Keep context attached to the action.** Assessment title, learner, score state, and question position must remain visible during grading.
3. **One compact filter entry point.** Powerful filters are valuable, but a row of pills consumes space and scales poorly.
4. **Mobile-native reading and grading.** Web content must scroll normally, but native mobile components should own high-frequency actions.
5. **Consistency is a product feature.** The same action hierarchy, filter sheet, state colors, and spacing should work across teacher, student, and admin roles.

## 5. Current architecture and feature anatomy

### Navigation owners

The teacher drawer and stack inventory is centralized at `mobile/src/navigation/teacher-route-manifest.ts:8-47`. The requested route chains map to:

```text
TeacherDrawer / Home
  └─ Notifications

TeacherDrawer / Classes
  └─ TeacherClassDetail
      └─ TeacherModuleDetail
          └─ TeacherLessonDetail
              └─ TeacherLessonEditor

TeacherDrawer / Assessments
  └─ TeacherAssessmentDetail
      ├─ TeacherAssessmentEditor
      └─ TeacherAssessmentAttemptResult / TeacherAssessmentReview
```

`TeacherLessonDetail` already uses a source-aware back helper (`mobile/src/screens/TeacherLessonDetailScreen.tsx:27-31`). Assessment review currently uses a direct `navigation.goBack()` (`mobile/src/screens/TeacherAssessmentReviewScreen.tsx:229-235`).

### Visual owners

- `mobile/src/theme/tokens.ts:3-44` already defines a blue-led “modern academic” palette.
- `mobile/src/theme/teacher.ts:3-34` separately defines muted red/blue values and even maps `deepBlue` to a red value; this is a semantic contradiction.
- The web palette exposes navy `#0C1D3A`, navy-soft `#172944`, and red `#FF0011` for student surfaces at `next-frontend/app/globals.css:60-96`; the general web red is `#DC2626`.
- `TeacherScreen` currently renders a white app bar (`mobile/src/components/teacher/TeacherMobilePrimitives.tsx:15-126`).
- Shared teacher controls exist, but their purposes overlap: `TeacherSelectMenu`, `TeacherChip`, `TeacherWorkspaceSwitcher`, `TeacherSegmentedTabs`, and `TeacherActionButton`.
- Student and admin define separate segmented controls, select menus, chips, and filter bars. At least 46 screen files also define inline `Pressable` actions.

### Data and authority owners

- Backend remains authoritative for assessment lifecycle, scores, submissions, question analytics, and academic permissions.
- Mobile already consumes the assessment question-analytics endpoint.
- The current analytics contract exposes correctness, response counts, option distribution, average points, and free-text answers (`mobile/src/types/assessment.ts:414-431`).
- Backend enforces teacher ownership and calculates those aggregates (`backend/src/modules/assessments/assessments.service.ts:6078-6195`).
- The current endpoint does **not** expose learner identities per wrong answer. That is the only requested analytics detail that cannot be safely represented from the existing contract.

## 6. Problem-to-owner map

| Requested area | Confirmed current problem | Primary owner | Downstream consumers / edges |
|---|---|---|---|
| App-wide color | Teacher theme is dusty-red/white while global tokens are blue and web has a stronger navy/red identity | `mobile/src/theme/teacher.ts`, `tokens.ts` | All teacher screens; shared role navigation; notification shell |
| App bar | Generic teacher app bar is white and visually weak | `TeacherScreen` | Every teacher screen using the primitive |
| Buttons | Shared button is always a tinted outline; many screens add bespoke `Pressable` styles | Teacher/student/admin primitives plus screen-local buttons | All roles; dangerous/destructive confirmations; icon actions |
| Filters | Chips, selectors, segmented tabs, and local filter bars overlap semantically | Role primitives and screen consumers | Assessments, submissions, notifications, calendar, reports, rosters, announcements |
| Teacher Home | Duplicate “Teaching workspace” identity, low contrast, repeated headings/cards | `TeacherHomeScreen.tsx:223-430` | Class detail and notification entry paths |
| Notifications | Duplicate kicker/title/description, separate count row, horizontal filter pills | `NotificationsInboxScreen.tsx:236-314` | All roles that open the shared inbox |
| Module outline | Large “Manage item” button repeats on every row | `TeacherModuleDetailScreen.tsx:302-359` | Item action sheet and arrange mode |
| Lesson preview | `mobile / web / compare` adds phone complexity; WebView has a fixed minimum height inside a parent scroll surface | `TeacherLessonDetailScreen.tsx:18-63,121-147` | Secure preview-session endpoint; editor; version history |
| Assessment list | Duplicate context strip; client query loads all class assessments; no search or visible UI pagination | `TeacherAssessmentsScreen.tsx:80-119,247-330` | Class-specific queries, bulk delete, assessment detail |
| Assessment detail | Overview is repeated text rows; submission filters are chips; score lacks denominator/context; analytics rows are not interactive | `TeacherAssessmentDetailScreen.tsx:394-535` | Editor, attempt review, stats and analytics endpoints |
| Attempt review | Three large stat cards, filter chips for grading mode, empty horizontal scroller, small gray learner answer text | `TeacherAssessmentReviewScreen.tsx:229-294,609-709` | Return/unreturn, rubric/manual/direct scoring, attachments |
| Updater | Signer migration is technically recognized but Android installer result is generic | `UpdateProvider.tsx`, `update.service.ts`, Gradle signing, release manifest | Existing legacy installs; future production-signed updates |

## 7. Recommended design system

### 7.1 Color roles

| Token role | Recommended value | Use | Do not use for |
|---|---|---|---|
| `brand.navy` | `#0C1D3A` | App bars, drawer header, high-emphasis information cards, selected nav | Every card background |
| `brand.navySoft` | `#172944` | Pressed app-bar action, secondary navy surface | Body copy on white |
| `brand.red` | `#DC2626` | Primary CTA, urgent badge, destructive confirm, active progress | Neutral filters, all icons, all headings |
| `brand.redPressed` | `#B91C1C` | Pressed primary/destructive action | Passive status |
| `surface.page` | `#F6F7F9` | App background | Main card content |
| `surface.card` | `#FFFFFF` | Reading, lists, forms | Decorative nested cards |
| `text.strong` | `#0F172A` | Primary text | Disabled labels |
| `status.success` | `#15803D` | Correct/passed/returned | General branding |
| `status.warning` | `#B45309` | Needs review/due soon | Destructive errors |
| `status.danger` | `#B91C1C` | Incorrect/failed/error | Brand decoration |

The navy should frame the experience; red should communicate intent. This prevents the “mono red” problem without replacing it with a “mono navy” problem.

### 7.2 App bar

- Height: safe area + 56 px content row.
- Navy background on role workspaces and detail screens.
- One title, no duplicate uppercase kicker.
- Optional second line only for record context that changes the meaning of the screen, such as learner name on grading review—not generic descriptions.
- 44 × 44 px icon targets; white icons; subtle translucent pressed state.
- A bottom border or 2 px red accent line may identify Nexora without turning the whole bar red.

### 7.3 Action taxonomy

Create one role-neutral action primitive with four variants:

1. **Primary:** solid red, white label; exactly one dominant action per region.
2. **Secondary:** white/navy outline, navy label; safe supporting action.
3. **Tertiary:** text/icon only; low-emphasis actions such as refresh or cancel.
4. **Icon/overflow:** 44 × 44 px; use for repeated row actions such as “Manage item.”

Destructive actions may use the primary shape only inside a confirmation context. Status color must never be the only cue; pair color with an icon and label.

### 7.4 Filter rule

Use this distinction everywhere:

- **Tabs** change a persistent content section: Overview / Submissions / Analytics; Mobile / Web preview.
- **Filter & sort** changes which records are visible: status, class, date, section, score, sort order.
- **Menu/overflow** exposes actions on one record.

The shared filter control should be a 48 px row or compact 44 px button labeled with the active summary, for example `Filter: Turned in · Recent`. It opens a bottom sheet with:

- grouped radio rows for single-select criteria;
- checkboxes only where multi-select is genuinely supported;
- Reset and Apply actions;
- result count preview when available;
- accessibility selected state and screen-reader labels;
- a compact active-filter summary after dismissal.

No horizontal filter-pill row should remain. Segmented tabs remain allowed for true content modes.

### 7.5 Density and layout

- Base horizontal inset: 16 px.
- Section gap: 20–24 px; row gap: 8–12 px.
- Card radius: 14–16 px, not a mix of 8/12/18/24 without semantic reason.
- Use one card to group related content; avoid card-inside-card nesting.
- Use dividers and whitespace for repeated lists instead of putting every row in a floating card.
- Keep 44 px minimum targets and dynamic text wrapping.

## 8. Page-level redesign specification

### 8.1 Teacher Home

**Remove:** duplicate `TeacherContextStrip`, decorative/repeated labels, weak white-on-white hierarchy.

**New information order:**

1. Navy app bar: “Home”, notification icon, unread badge.
2. Compact greeting/date line on the page, not a second page title.
3. **Next up** navy focus card with time, class, section/room, and one `Open class` action.
4. **Needs attention** compact rows for ungraded submissions, interventions, and drafts; hide the section when zero.
5. **Today** agenda list with time rail and state icons.
6. **My classes** quiet list or horizontal cards only after the actionable content.

Preserve offline notice, class navigation, priority routes, and current server-owned data. Empty Home should state there are no scheduled or urgent items rather than showing zeros in large cards.

### 8.2 Notification Center

**Remove:** uppercase “Notification Center” kicker, descriptive paragraph, large stats area, horizontal filter pills.

**New structure:**

- Navy app bar: back, `Notifications`, `Read all`, overflow for destructive `Clear all`.
- One compact counter rail immediately below the bar using icons and text: `Unread 3`, `Interventions 1`, `Tasks 4`.
- One `Filter: All notifications` trigger; the bottom sheet lists All, Unread, Interventions, Assessments/Tasks.
- Dense notification rows with source icon, readable title, one-line context, timestamp, unread marker, and swipe/overflow actions only when behavior is reliable.
- Keep error, empty, refresh, and live-notification behavior.

Use icons rather than literal colorful emoji in production so rendering, accessibility labels, and school tone stay consistent. The HTML prototype uses simple symbols only to communicate the compact concept.

### 8.3 Module Detail

- Replace `Manage item` and `Manage section` text buttons with a 44 px `dots-vertical` overflow control with explicit accessibility labels.
- Keep tapping the row as the open action.
- Preserve arrange mode; when arranging, the move controls replace overflow so the row never has two competing action systems.
- Move module-level settings to the top-bar overflow or a single secondary button above the outline.
- Keep visibility, lock, add-content, and backend lifecycle behavior unchanged.

### 8.4 Lesson Viewer / Preview

- Remove `Compare` entirely on phone.
- Keep a two-section `Mobile | Web` segmented tab because it switches a genuine preview mode.
- When Web is selected, render the WebView in a dedicated flex/viewport region so it owns vertical scrolling rather than nesting a fixed-height WebView inside the page scroll.
- On Android, enable nested scrolling only if the parent remains scrollable; preferred architecture is to avoid competing vertical scroll owners.
- Keep the secure `createPreviewSession` endpoint, disabled shared/third-party cookies, cache-off behavior, refresh, retry, version history, and read-only guarantee.
- Loading: skeleton or centered progress in the preview viewport.
- Error: concise error + `Try again`; never fall back to a fake comparison pane.

### 8.5 Assessment List

- Remove the redundant `Assessment workspace` strip.
- Add a search field and one compact `Filter & sort` trigger for class, status, period, and sort.
- Render 10 or 20 records at a time with explicit `Previous / Page n / Next` or `Load more` behavior.
- Reuse the same list-row and filter primitives as submissions and role workspaces.
- Keep bulk selection, but reveal bulk actions only after selection begins.

**Important pagination boundary:** the mobile service currently fetches all pages per class and flattens them. A first implementation can paginate the rendered rows without changing backend contracts, improving visual and rendering load but not network load. True server-efficient cross-class search/pagination requires a deliberate aggregate contract and should not be silently invented in this redesign.

### 8.6 Assessment Detail

Keep `Overview / Submissions / Analytics` as tabs; they are content sections, not filters.

**Header/identity:** assessment title in the navy app bar; one compact state line below it with Draft/Published, type, and due date. Remove the redundant generic indicator card.

**Overview:**

- One next-action callout: draft, waiting, needs review, or released.
- Compact metadata grid: due date, total points/questions, passing score, submissions.
- Description as readable body text, collapsed only when long.
- Primary action changes with state: Continue setup, Review submissions, or View results.

**Submissions:**

- Search + one `Filter & sort` sheet.
- List row: learner, state, submitted time, and explicit score such as `82 / 100` or `Not scored`.
- Semantic score chip: green passed/returned, amber needs review, red below threshold; always include text.
- Direct route to review for actionable attempts.

**Analytics:**

- Top summary remains compact: completion, average, pass rate.
- Rank or flag questions by difficulty, not just original order.
- Every question row is interactive and opens a question-analysis sheet/screen.
- Existing-contract detail: correct vs incorrect count, correct percentage, average points, option distribution with correct-answer marking, and anonymized text-answer list.
- Unsupported without contract change: named learners associated with each wrong answer. If added later, backend must preserve teacher ownership and define privacy/audit expectations.

### 8.7 Submission / Attempt Review

- Remove the three stat cards.
- Navy app bar context: assessment title; second line only for learner + attempt number.
- Sticky control region immediately below the app bar: score, Passed/Needs review, Returned/Draft, and one primary `Return grade` action.
- Replace grading-mode filter chips with a compact `Scoring method` selector.
- Add a real question navigator (`Question 3 of 10` + bottom-sheet list), previous/next controls, and optional “only needs grading” filter.
- Focus on one question at a time on phone.
- Display the learner answer in a large high-contrast answer box; show correct answer/evidence below it with green/amber/red labels.
- Manual points and feedback sit next to the evidence they affect; long rubric controls collapse until needed.
- Attachments remain accessible before grading controls.
- Preserve direct override, rubric scoring, response scoring, return/unreturn, files, and authoritative server calculations.

## 9. Reusable component plan

### Replace or consolidate

| New primitive | Replaces/absorbs | First consumers |
|---|---|---|
| `MobileAppBar` | Teacher white header and screen-specific headers | Teacher shell, notifications, detail/review screens |
| `MobileAction` | `TeacherActionButton` plus common bespoke action styles | All teacher pages, then student/admin migration |
| `MobileFilterTrigger` + `MobileFilterSheet` | Teacher/Admin/Student filter chips, local filter-pill rows, role select overlap | Notifications, assessment list, submissions, calendars |
| `MobileSegmentedTabs` | Role-specific segmented controls where semantics are truly tabs | Assessment detail, lesson preview |
| `MobileOverflowAction` | Repeated “Manage item/section” text buttons | Module detail, list rows |
| `MobileScoreState` | Raw score strings and inconsistent color labels | Submission list, attempt review, results |
| `MobileRecordList` | Repeated card/row lists | Notifications, assessments, submissions |

### Keep separate

- Academic lifecycle confirmation and permission logic.
- Teacher/student/admin navigation manifests.
- Assessment APIs, mutation hooks, and cache invalidation.
- Secure lesson preview session creation.
- Role-specific content—not every screen should look identical, but they should use the same grammar.

## 10. Cascade and blast-radius map

```text
Theme roles (navy/red/surface/status)
  ├─ MobileAppBar
  │   ├─ all teacher drawer screens
  │   ├─ class/module/lesson stack
  │   └─ assessment/review stack
  ├─ MobileAction
  │   ├─ row actions and dialogs
  │   ├─ destructive confirmations
  │   └─ bottom action bars
  ├─ MobileFilterSheet
  │   ├─ notifications
  │   ├─ assessments and submissions
  │   ├─ rosters/classes/announcements
  │   └─ calendar/reports/admin/student lists
  └─ MobileScoreState
      ├─ assessment detail
      ├─ attempt review
      └─ student results/class record surfaces
```

The highest-risk coupling is not color; it is replacing controls that currently carry navigation, mutation, selection, accessibility, or lifecycle behavior. Migration must therefore be consumer-by-consumer with behavior tests, not a bulk visual search-and-replace.

### Active specification conflicts

- **Confirmed:** `openspec/changes/align-mobile-with-web-contracts/specs/mobile-teacher-tooling-parity/spec.md` currently requires Mobile, Web, and Compare preview modes. The approved redesign removes Compare on phones. That requirement must be amended before code and tests are changed.
- **Confirmed:** the same active spec requires visible per-section Manage actions and rejects ellipsis-only discovery. The approved module design replaces repeated Manage labels with accessible 44 px overflow actions. The revised contract must preserve discoverability through explicit accessibility labels and a stable item action sheet rather than visible repeated text.
- **Disposition:** update the active parity change in the same planning phase, validate both OpenSpec changes together, and keep the secure Mobile/Web renderers and all authorized actions intact.

## 11. Frozen behavior and preservation contract

The redesign must not change these procedures unless a separate change is approved:

- Backend remains the authority for roles, permissions, academic state, scores, return/unreturn, publication, and analytics.
- Existing route names and typed parameters remain stable.
- Class → module → lesson source-aware back behavior remains intact.
- Notification account scope, deep links, mark-read, and clear behavior remain intact.
- Assessment lifecycle restrictions and capability reasons remain visible.
- Official synced records are never described as deleted by the signer migration.
- Secure preview sessions remain short-lived and server-owned.
- Offline/read-only behavior stays explicit; the redesign may improve messaging but must not pretend unavailable mutations succeeded.

## 12. States each redesigned surface must specify

| State | Required behavior |
|---|---|
| Loading | Stable skeleton/progress without layout jump; preserve app-bar/back access |
| Empty | Explain why it is empty and offer the next valid action; no giant zero cards |
| Error | State what failed, retain already-loaded data where safe, provide retry |
| Offline | Identify cached/read-only content and last sync; disable mutations with reason |
| Partial data | Keep the screen usable when optional analytics or counts fail |
| Permission/read-only | Show backend-provided reason and valid alternative path |
| Long text | Wrap/collapse safely; no clipped titles or answers |
| Keyboard | Keep focused field and sticky action visible; avoid covered inputs |
| Refresh | Preserve current filter/tab and selection unless the record disappears |
| Destructive | Preview impact and require explicit confirmation |

## 13. Implementation plan after design approval

### Phase 1 — foundation and regression harness

1. Add role-neutral theme roles and map existing teacher tokens to them without changing APIs.
2. Build and test `MobileAppBar`, action variants, filter trigger/sheet, tabs, overflow, and score state.
3. Add interaction/accessibility tests for target size, selected state, destructive state, long labels, and bottom-sheet dismissal.
4. Inventory every filter consumer and classify it as tab, filter, selector, or action menu before migration.

### Phase 2 — requested teacher surfaces

1. Migrate Teacher Home and Notification Center.
2. Migrate Module Detail and Lesson Preview; remove compare; repair scroll ownership.
3. Migrate Assessment List with search, compact filters, and visible UI pagination.
4. Migrate Assessment Detail and clickable question analytics using the existing contract.
5. Migrate Attempt Review to focused-question interaction and sticky scoring controls.

### Phase 3 — app-wide consistency

1. Replace remaining teacher filter-pill rows and inconsistent buttons.
2. Migrate student/admin filter surfaces to the same role-neutral primitives while preserving content and permissions.
3. Remove deprecated primitives only after repository-wide consumer search reaches zero and behavior tests pass.

### Phase 4 — updater guidance

1. Add the legacy-signer migration state machine and final-sync/readiness wording.
2. Keep normal production-signed updates separate from legacy reinstall.
3. Add release verification that compares the published APK certificate to the pinned production certificate and compares consecutive releases.
4. Run the physical-device matrix below before publishing the next build.

## 14. Verification matrix

### Static and unit

- Typecheck mobile.
- Existing mobile unit suite.
- Primitive tests for pressed, disabled, loading, selected, accessibility, long labels, and dynamic type.
- Navigation tests for class → module → lesson and assessment → submission review.
- Analytics tests for empty, partial failure, option distribution, and text answers.
- Update decision tests for legacy build, current build, and future build.

### Runtime / device

- Narrow Android phone, typical Android phone, and tablet width.
- System font at 100%, 150%, and maximum supported size.
- Light theme and OS dark theme behavior (even if the app remains light, status/navigation bars must stay legible).
- Back gesture, hardware back, drawer return, notification deep link, and direct-entry fallback.
- Web preview vertical scroll, link behavior, retry, session expiry, and rotation.
- Keyboard with search, feedback, manual score, and rubric fields.
- Screen reader labels for icon-only manage/overflow actions and all filter options.

### Updater

1. Build 46 installed → build 47: expected one-time reinstall guidance; in-place install must not be represented as possible.
2. Clean build 47 install: expected success with production certificate.
3. Build 47 → next production-signed build: expected in-place update.
4. Corrupted APK: expected checksum rejection before installer.
5. Unknown-apps disabled: expected settings route and accurate recovery copy.
6. Installer cancelled: expected retry without claiming success.
7. After reinstall: authenticate, verify server records, and document device-only data loss behavior.

## 15. Alternatives considered

### A. Navy frame, red intent — **recommended**

Strong web/mobile identity, readable dense screens, and clear action hierarchy. It uses navy structurally and red semantically.

### B. Mostly white with navy typography

Lowest visual risk but would not solve the user's “bland” and “mono red” concern strongly enough. It also leaves the app bar without the cross-platform identity requested.

### C. Full navy dashboard with red cards and gradients

High immediate visual impact, but too heavy for long academic reading, likely to age quickly, and risks recreating template-like dashboard clutter.

## 16. Decision ledger

| Decision | Status | Reason |
|---|---|---|
| Use navy app bars throughout role workspaces | Recommended | Matches the web identity and gives stable contrast/context |
| Use red as primary intent, not the default color of every control | Recommended | Restores hierarchy and reduces visual fatigue |
| One shared filter sheet across roles | Recommended | Solves the explicit inconsistency and space problem |
| Keep segmented tabs for genuine content modes | Recommended | Tabs and filters have different interaction semantics |
| Remove lesson comparison on phone | Recommended | Eliminates nested density and scroll competition |
| Make question analytics interactive with current aggregate data | Confirmed feasible | Current API already contains the required aggregate fields |
| Show named learners per wrong question | Deferred contract decision | Not available in the current analytics response |
| Use client-side visible pagination first | Recommended within frozen contracts | Improves screen density without inventing a backend endpoint |
| Keep the production signing certificate | Required | Returning to debug signing would weaken release integrity and still split future installs |

## 17. Uncertainty register

- **Physical updater failure wording:** unverified without the user's exact device/system message.
- **Installed build number:** unverified; the signer conclusion applies when the installed build is 46 or earlier.
- **Web preview failure mode:** code confirms risky nested scroll/fixed-height ownership; the exact device symptom needs runtime reproduction.
- **Assessment list scale:** record counts and performance thresholds need production-like data to choose 10 vs 20 rows and client vs server pagination.
- **Deep-link fallback:** assessment review's `goBack()` may be insufficient for a cold direct entry; validate with notification/deep-link routes before changing it.
- **Dark mode:** this plan adds navy brand surfaces, not a full dark theme. A true dark theme is a separate accessibility and QA scope.

## 18. Definition of done

The redesign is complete only when:

- the approved shared primitives are used consistently across the requested teacher flows;
- no horizontal filter-pill group remains where the control is actually a record filter;
- top bars, buttons, scores, and destructive states follow the same semantics;
- lesson WebView scroll works on a physical Android device;
- assessment lists have search and visible pagination behavior;
- question analytics opens meaningful per-question evidence;
- attempt review keeps context and grading actions visible without stat-card clutter;
- build 47 → next build updates in place with the same production certificate;
- the legacy build path is accurately presented as a one-time reinstall, with physical-device evidence captured.

## 19. Implemented and packaged evidence — 2026-09-21

### Confirmed in source and automated verification

- The approved navy-frame/red-intent system is implemented through shared role-neutral primitives for app bars, actions, record filters, segmented modes, overflow actions, and score states.
- Teacher Home, Notification Center, module detail, lesson preview, assessment list/detail, analytics question drill-down, and submission review now use the approved hierarchy while preserving existing API, RBAC, route, grading, and invalidation contracts.
- Every identified record-filter pill row across teacher, student, and admin surfaces now delegates to the shared selector; chips remain only for genuine selections or toggles.
- The complete mobile verification passed: 19 admin contracts / 57 layer checks, TypeScript with zero errors, and 146 Jest suites / 826 tests.
- Production Expo export completed with the production backend URL, and the Android release build completed with version `0.1.47` / build `48`.

### Confirmed release artifact

| Field | Verified value |
|---|---|
| Source revision | `e651e5f7fe6437f0a4fdbbf18c2ea8896585af2d` |
| Package | `com.nexora.lms.mobile` |
| Native version / build | `0.1.47` / `48` |
| Minimum / target SDK | `24` / `36` |
| ABI | `arm64-v8a` |
| Size | `37,637,094` bytes |
| SHA-256 | `5d80a3142999c7ab8cc83b3e146a44eb8e1e6f48bfc3d2e7df0c24370b12b342` |
| Signer SHA-256 | `46cbcee985a7e0ecfda5a8fddfbdd679d9f0312ee07d96a593817302eb7c0a39` |
| Signature / alignment | APK Signature Scheme v2 / 16 KB ZIP alignment verified |
| Immutable path | `next-frontend/public/downloads/android/48-e651e5f7/nexora-mobile-0.1.47-build48.apk` |

The signer matches build 47, so build 47 → 48 is eligible for an ordinary in-place Android update. Builds 46 and earlier use the explicit external browser/download-manager migration flow and never pass the new APK through app-private cache or the normal installer path.

### Still unverified

- Physical-device migration from legacy build 46 or earlier through backup/sync, external download, uninstall, reinstall, authentication, and version confirmation.
- Physical-device in-place update from production-signed build 47 to build 48.
- Authenticated teacher visual/accessibility acceptance on narrow phone, typical phone, tablet, and enlarged-font configurations.
- Public deployed-byte equality, CI, and deployment status remain pending until the packaging commit is pushed.
