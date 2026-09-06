# Quiet Notification Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace noisy web and mobile notification-feed popups with one quiet, compact, aggregated prompt that sends users to the notification center.

**Architecture:** Keep backend notification contracts, unread state, polling, socket reconciliation, and the web backlog cooldown unchanged. Web will route every transient notification through its existing stable Sonner lane; mobile will replace its serial queue with one reducer-backed summary surface and a small presentational banner. Both surfaces show only a count, a clear View action, and an accessible close action.

**Tech Stack:** Next.js 16, React 19, Sonner, CSS Modules, Expo 54, React Native 0.81, Jest, React Testing Library, react-test-renderer, Gradle Android release tooling.

## Global Constraints

- Every central notification-feed event uses the same quiet treatment, including intervention notifications.
- At most one notification prompt is visible per platform; bursts update the existing prompt instead of queuing cards.
- The prompt contains no individual notification title/body, mascot, shimmer, pulse, progress animation, sound, or foreground vibration.
- Dismissal hides presentation only and never marks notifications as read.
- View opens the platform notification center; the inbox remains the detailed source of truth.
- Preserve web's account-scoped five-hour historical-backlog policy and notification lifecycle guards.
- Preserve mobile native/background notification handling, unread badge behavior, backend contracts, and role routing.
- Preserve unrelated task-specific controls such as the web unfinished-assessment resume notifier.
- Mobile source changes require a new synchronized Android version, verified APK, adjacent manifest, and live download verification.

---

### Task 1: Quiet web notification lane

**Files:**
- Modify: `next-frontend/src/components/notifications/LiveNotificationToast.test.tsx`
- Modify: `next-frontend/src/providers/NotificationProvider.test.tsx`
- Modify: `next-frontend/src/components/notifications/LiveNotificationToast.tsx`
- Modify: `next-frontend/src/components/notifications/LiveNotificationToast.module.css`
- Modify: `next-frontend/src/providers/NotificationProvider.tsx`

**Interfaces:**
- Consumes: existing `NotificationDigestKind` calls and `NOTIFICATION_TOAST_LANE_ID` lifecycle.
- Produces: `showNotificationDigestToast({ kind, count, onOpen?, onClose? })`, always rendered as one compact top-right prompt.

- [x] **Step 1: Write failing web presentation tests**

  Assert that backlog, live, catch-up, and urgent kinds all render `You have N unread notification(s)`, expose `View notifications` and `Dismiss notification summary`, use the same stable top-right lane and duration, and omit `Intervention Alert`, individual titles, descriptions, and decorative media.

- [x] **Step 2: Run the focused web tests and verify RED**

  Run: `cd next-frontend && npm test -- --runInBand src/components/notifications/LiveNotificationToast.test.tsx src/providers/NotificationProvider.test.tsx`

  Expected: failures on the old rich copy, urgent placement, and single-event individual routing.

- [x] **Step 3: Implement the minimal quiet web surface**

  Use one compact card structure equivalent to:

  ```tsx
  <article role="status" aria-live="polite">
    <Bell aria-hidden="true" />
    <p>You have {count} unread notification{count === 1 ? '' : 's'}</p>
    <button>View notifications</button>
    <button aria-label="Dismiss notification summary"><X /></button>
  </article>
  ```

  Remove the individual-event renderer and route every provider presentation through `showNotificationDigestToast`; keep the stable lane ID, use `top-right` for all kinds, and route View to `/dashboard/notifications`.

- [x] **Step 4: Run focused web tests and verify GREEN**

  Run the same focused command. Expected: all focused notification suites pass with zero failures.

### Task 2: Quiet aggregated mobile notification banner

**Files:**
- Create: `mobile/src/utils/quiet-notification-presentation.ts`
- Create: `mobile/src/utils/__tests__/quiet-notification-presentation.test.ts`
- Create: `mobile/src/components/notifications/QuietNotificationBanner.tsx`
- Create: `mobile/src/components/notifications/__tests__/QuietNotificationBanner.test.tsx`
- Create: `mobile/src/providers/__tests__/LiveNotificationProvider.presentation.test.ts`
- Modify: `mobile/src/providers/LiveNotificationProvider.tsx`

**Interfaces:**
- Produces: `EMPTY_QUIET_NOTIFICATION_PRESENTATION`, `addQuietNotifications(state, count)`, `dismissQuietNotifications()` and `QuietNotificationBanner`.
- Consumes: existing mobile notification polling/socket/reminder discovery and root `Notifications` route.

- [x] **Step 1: Write failing mobile reducer, banner, and wiring tests**

  Cover aggregation (`0 + 3 + 2 = one visible summary with count 5`), dismissal reset, singular/plural unread copy, one View action, one accessible close action, and provider wiring that contains no queue, mascot, pulsing intervention branch, or per-item `View now` content.

- [x] **Step 2: Run the focused mobile tests and verify RED**

  Run: `cd mobile && npm test -- --runInBand src/utils/__tests__/quiet-notification-presentation.test.ts src/components/notifications/__tests__/QuietNotificationBanner.test.tsx src/providers/__tests__/LiveNotificationProvider.presentation.test.ts`

  Expected: missing modules and old provider queue/presentation assertions fail for the requested behavior.

- [x] **Step 3: Implement the reducer-backed single surface**

  Use state equivalent to:

  ```ts
  type QuietNotificationPresentation = { visible: boolean; count: number };

  function addQuietNotifications(state: QuietNotificationPresentation, incoming: number) {
    if (incoming <= 0) return state;
    return { visible: true, count: state.count + incoming };
  }
  ```

  Replace `queueRef` and serial `activeNotification` advancement with this one summary state. Hydration aggregates unread rows once; polling/socket/reminder bursts increment the existing summary. The banner uses a short fade/slide only and opens the root `Notifications` screen without changing read state.

- [x] **Step 4: Run focused mobile tests and verify GREEN**

  Run the same focused command. Expected: all focused mobile presentation tests pass with zero failures.

### Task 3: Cross-surface verification and Android packaging

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Replace: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`

**Interfaces:**
- Consumes: final mobile source and `mobile/scripts/app-version-release.cjs`.
- Produces: synchronized version `0.1.21` / build `22`, verified APK, size/SHA manifest, and repository download artifact.

- [x] **Step 1: Run focused and required source gates**

  Run frontend notification tests, full frontend tests, typecheck, lint, and build. Run mobile focused tests, full tests, typecheck, and `test:release`.

- [x] **Step 2: Bump synchronized Android metadata**

  Change `expo.version` and Gradle `versionName` to `0.1.21`; change `expo.android.versionCode` and Gradle `versionCode` to `22`.

- [x] **Step 3: Build and prepare the APK**

  Build the release variant with the production `/api` URL using the repo's configured Android SDK/JDK, then run:

  `cd mobile && npm run release:prepare -- --release-notes "Quiet notification summaries now keep web and mobile updates compact and uncluttered."`

- [x] **Step 4: Verify the APK and delivery contract**

  Run `cd mobile && npm run release:verify`, inspect package/version/signature/ABI/alignment, record size and SHA-256, and confirm build and public APK bytes match.

- [x] **Step 5: Rerun checks invalidated by artifact/version changes**

  Rerun mobile release tests, release verification, mobile typecheck/tests, and frontend tests/build that cover the embedded download artifact.

### Task 4: Review, commit, push, CI, deployment, and live delivery

**Files:**
- Review all task-owned files above; no additional source files expected.

**Interfaces:**
- Produces: one scoped commit on `developement`, matching remote SHA, green exact-commit CI, terminal Railway deployment, and verified live web/APK delivery.

- [x] **Step 1: Audit requirements and final diff**

  Run `git diff --check`, inspect every changed file, confirm no old rich notification presentation remains in the central web/mobile owners, and verify all plan requirements have direct evidence.

- [ ] **Step 2: Commit the scoped release**

  Stage only task-owned files and commit with `feat(notifications): quiet web and mobile alerts`.

- [ ] **Step 3: Fetch, inspect divergence and outgoing history, then push**

  Confirm `origin/developement...HEAD` contains exactly the intended outgoing commit, push without force, and confirm local/remote SHAs match with `0 0` divergence.

- [ ] **Step 4: Observe exact CI and Railway deployment**

  Identify CI by pushed SHA, wait for every required job to reach success, correlate the downstream Railway workflow to the same tested SHA, and verify each applicable deployment job succeeds.

- [ ] **Step 5: Verify live behavior and APK delivery**

  Check the production frontend health/page, confirm the live APK URL returns the packaged byte size and SHA-256, and report browser/device evidence honestly if an authenticated notification flow or physical device is unavailable.
