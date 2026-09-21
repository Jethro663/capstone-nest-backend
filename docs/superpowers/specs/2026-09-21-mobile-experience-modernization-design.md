# Mobile Experience Modernization Design

## Approved direction

The approved HTML preview is the visual contract. The product uses a **navy frame, red intent** grammar:

- `#0C1D3A` navy owns app bars, structural navigation, and the strongest contextual containers.
- `#DC2626` red owns primary actions, urgency, destructive confirmation, and key brand accents.
- White and neutral grays own reading surfaces, forms, rows, and dense academic content.
- Green, amber, and danger roles communicate state; they do not become competing brand themes.

This is not dark mode. The contrast comes from a strong navy frame around calm content surfaces.

## Experience principles

1. The app bar is the single page-title owner. Decorative kickers and duplicate page-name strips are removed.
2. Record filters use one compact trigger and bottom sheet. Persistent content modes use segmented tabs. The two interactions never substitute for one another.
3. Actions use four visual levels: primary, secondary, tertiary, and icon/overflow.
4. Every touch target is at least 44 px and icon-only actions have explicit accessibility labels.
5. Existing routes, API calls, policy, grading logic, and query invalidation are preserved.
6. Screens expose the next task first and supporting evidence second.

## Shared component boundary

`mobile/src/theme/mobileBrand.ts` owns semantic tokens. Role-neutral components under `mobile/src/components/ui/` own rendering and accessibility only. Teacher/student/admin primitive files remain compatibility adapters and continue exporting current domain-facing APIs.

The shared controls are:

- `MobileAppBar`
- `MobileAction`
- `MobileFilterSheet`
- `MobileSegmentedTabs`
- `MobileOverflowAction`
- `MobileScoreState`

`TeacherChip` and equivalent chips are not deleted. They remain for tags, entity selection, editor options, date presets, and other non-record-filter toggles.

## Screen composition

### Teacher Home

The navy app bar anchors the page. Content begins with a greeting and a strong navy **Next Up** card, followed by compact attention rows and a chronological **Today** agenda. Existing dashboard queries remain the source of data.

### Notification Center

Remove the descriptive header paragraph and large statistic cards. Show compact icon/count facts beneath the app bar, then search and the shared filter trigger. Notification rows preserve current read/navigation behavior.

### Module Detail

Keep the outline, lock state, Settings, Add content, and Arrange. Replace the noisy visible **Manage item/section** buttons with 44 px overflow buttons labeled for assistive technology, opening the existing action sheets.

### Lesson Preview

Expose only **Mobile** and **Web** segmented modes. Mobile uses the existing native lesson block renderer. Web uses the existing secure preview URL in a WebView whose container owns its vertical scrolling; the parent screen does not render a simultaneous comparison.

### Assessments

The list has no duplicate context strip. Search and compact shared filter selectors lead the page, followed by ten visible results per display page and explicit previous/next controls. The current complete server-page aggregation remains unchanged.

Assessment detail starts with a scannable status/metric summary. Submissions use shared filter/sort selectors and semantic score states. Analytics rows are tappable and open existing correct/incorrect, average, option-distribution, and text-answer evidence. No learner identities are invented.

### Submission Review

Replace top summary-stat cards with a compact score/status control region, keep a question navigator close to the top, make the learner answer visually dominant, distinguish the expected answer, and keep manual/rubric scoring controls contextual to the active question.

## Android legacy update design

Version codes 46 and earlier cannot update in place to 47+ because the certificate changed. When that boundary is detected, the app presents a numbered one-time migration and opens the immutable HTTPS APK through the system browser/download manager. It never sends that branch through the app-private cache installer. The ordered guidance is:

1. Stop if important work is not synced and confirm sign-in credentials.
2. Download the APK outside the app and keep the browser/download-manager file.
3. Uninstall the old build.
4. Install the downloaded APK and allow the OS prompt if required.
5. Sign in and confirm the displayed version.

Builds 47 and later continue the checksum-verified in-app path.

## Evidence and acceptance

The complete evidence ledger, consumer map, alternatives, risk analysis, release gates, and unverified boundaries live in `docs/feature-plans/2026-09-21-mobile-experience-modernization.md`. The executable tasks live in `openspec/changes/modernize-mobile-experience/tasks.md` and `docs/superpowers/plans/2026-09-21-mobile-experience-modernization.md`.
