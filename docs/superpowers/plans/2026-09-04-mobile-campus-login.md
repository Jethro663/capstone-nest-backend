# Mobile Campus Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic mobile login with a responsive GABHS/Nexora Campus Front Door and add truthful pre-authentication server and APK diagnostics, then publish a verified Android `0.1.17` / build `18` artifact.

**Architecture:** Keep `LoginScreen` as the authentication owner and introduce focused visual, status-model, modal, and health-service units around it. Server evidence comes from the existing public health endpoints; APK evidence and update actions come from the existing update provider and native identity service. No backend contract or new dependency is required.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, Axios, React Navigation, React Native Animated/Safe Area, Jest/react-test-renderer, Gradle/Android build-tools, OpenSpec.

## Global Constraints

- Preserve current login, activation verification, recovery, secure-storage, role-resolution, and update/install behavior.
- Scope the top-left `!` control to the unauthenticated login only; do not create a global overlay.
- Never equate configured URL text with runtime connectivity.
- Never report `Offline` when liveness succeeds but readiness fails; use `Connected · limited`.
- Never report `Up to date` without a usable version decision and installed code at least equal to latest code.
- Do not add continuous polling, backend DTO changes, a role picker, external image loading, or a new package.
- Use the bundled GABHS seal and Nexora student artwork copied byte-for-byte from `next-frontend/public/`.
- Publish package `com.nexora.lms.mobile` as native version `0.1.17`, version code `18`, ARM64, with the production API URL.
- Keep all work uncommitted until the full plan and verification gates pass; the user requested one final reviewed commit and push.

---

### Task 1: Truthful Login Server Diagnostics

**Files:**
- Create: `mobile/src/services/system-status/login-server-status.ts`
- Create: `mobile/src/services/system-status/__tests__/login-server-status.test.ts`

**Interfaces:**
- Consumes: `publicClient` from `mobile/src/api/client.ts` and `API_BASE_URL` from `mobile/src/api/config.ts`.
- Produces: `describeApiTarget(apiUrl?: string): ApiTargetDescription` and `checkLoginServerStatus(): Promise<LoginServerStatus>`.

- [ ] **Step 1: Write failing target-description and health-classification tests**

Create a Jest test that mocks `publicClient.get` and asserts these exact cases:

```ts
import { publicClient } from "../../../api/client";
import {
  checkLoginServerStatus,
  describeApiTarget,
} from "../login-server-status";

jest.mock("../../../api/client", () => ({
  publicClient: { get: jest.fn() },
}));

const mockedGet = publicClient.get as jest.MockedFunction<typeof publicClient.get>;

describe("login server status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("labels the hosted Railway API without exposing the /api suffix", () => {
    expect(
      describeApiTarget("https://capstone-backend-v2-production.up.railway.app/api"),
    ).toEqual({
      label: "Hosted server",
      address: "capstone-backend-v2-production.up.railway.app",
    });
  });

  it("labels emulator and loopback APIs as local development", () => {
    expect(describeApiTarget("http://10.0.2.2:3000/api").label).toBe(
      "Local development",
    );
    expect(describeApiTarget("http://127.0.0.1:3000/api").label).toBe(
      "Local development",
    );
  });

  it("reports online only after expected liveness and readiness", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: { status: "ok", service: { name: "backend" } },
      } as never)
      .mockResolvedValueOnce({ data: { success: true } } as never);

    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "online",
      headline: "Connected",
    });
    expect(mockedGet).toHaveBeenNthCalledWith(1, "/health/live", {
      timeout: 5000,
    });
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/health/ready", {
      timeout: 5000,
    });
  });

  it("reports limited when liveness succeeds but readiness fails", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: { status: "ok", service: { name: "backend" } },
      } as never)
      .mockRejectedValueOnce(new Error("readiness unavailable"));

    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "limited",
      headline: "Connected · limited",
    });
  });

  it("reports unexpected for a live but unrelated response", async () => {
    mockedGet.mockResolvedValueOnce({ data: { status: "ok" } } as never);
    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "unexpected",
      headline: "Unexpected server response",
    });
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("reports offline when liveness cannot be reached", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "offline",
      headline: "Cannot reach server",
    });
  });
});
```

- [ ] **Step 2: Run the focused suite and verify RED**

Run:

```bash
cd mobile
npx jest src/services/system-status/__tests__/login-server-status.test.ts --runInBand
```

Expected: FAIL because `login-server-status.ts` does not exist.

- [ ] **Step 3: Implement the bounded status service**

Create these exact public types and behaviors:

```ts
export type LoginServerStatusKind =
  | "checking"
  | "online"
  | "limited"
  | "unexpected"
  | "offline";

export type ApiTargetDescription = {
  label: "Hosted server" | "Local development" | "Configured server";
  address: string;
};

export type LoginServerStatus = ApiTargetDescription & {
  kind: LoginServerStatusKind;
  headline: string;
  detail: string;
  checkedAt: string | null;
};

export function describeApiTarget(apiUrl = API_BASE_URL): ApiTargetDescription;
export async function checkLoginServerStatus(): Promise<LoginServerStatus>;
```

Implementation requirements:

```ts
const target = describeApiTarget();
const checkedAt = new Date().toISOString();

try {
  const live = await publicClient.get("/health/live", { timeout: 5000 });
  const payload = live.data as {
    status?: unknown;
    service?: { name?: unknown };
  };
  if (payload.status !== "ok" || payload.service?.name !== "backend") {
    return {
      ...target,
      kind: "unexpected",
      headline: "Unexpected server response",
      detail: "The configured address responded, but it did not identify the Nexora backend.",
      checkedAt,
    };
  }

  try {
    await publicClient.get("/health/ready", { timeout: 5000 });
    return {
      ...target,
      kind: "online",
      headline: "Connected",
      detail: "Nexora and its required services are ready.",
      checkedAt,
    };
  } catch {
    return {
      ...target,
      kind: "limited",
      headline: "Connected · limited",
      detail: "Nexora is online, but one or more supporting services are unavailable.",
      checkedAt,
    };
  }
} catch {
  return {
    ...target,
    kind: "offline",
    headline: "Cannot reach server",
    detail: "Check your internet connection or confirm that this is the intended server.",
    checkedAt,
  };
}
```

Use `new URL(apiUrl)` for valid targets. Classify `localhost`, `127.0.0.1`, `10.0.2.2`, RFC1918 IPv4 ranges, and `.local` as local; `.up.railway.app` as hosted; every other valid host as configured. If parsing fails, preserve the trimmed string as the address and label it configured.

- [ ] **Step 4: Run the focused suite and verify GREEN**

Run the Step 2 command. Expected: 6 tests pass with no new warning or open handle.

---

### Task 2: Version Presentation and Responsive Layout Models

**Files:**
- Create: `mobile/src/components/auth/login-status-model.ts`
- Create: `mobile/src/components/auth/__tests__/login-status-model.test.ts`
- Create: `mobile/src/components/auth/campus-login-layout.ts`
- Create: `mobile/src/components/auth/__tests__/campus-login-layout.test.ts`

**Interfaces:**
- Consumes: `UpdateState` and installed `{ currentNativeVersion, currentVersionCode }`.
- Produces: `resolveLoginVersionStatus`, `resolveLoginStatusTone`, and `resolveCampusLoginLayout`.

- [ ] **Step 1: Write failing version-presentation tests**

Cover these exact outcomes using a complete base `UpdateState`: `checking`, `current`, `supported`, `available`, `required`, and `unverified`. Representative assertions:

```ts
expect(
  resolveLoginVersionStatus(
    { ...baseState, decision: { ...decision, updateType: "none" } },
    { currentNativeVersion: "0.1.17", currentVersionCode: 18 },
  ),
).toMatchObject({ kind: "current", headline: "Up to date" });

expect(
  resolveLoginVersionStatus(
    { ...baseState, decision: { ...decision, updateType: "none" } },
    { currentNativeVersion: "0.1.16", currentVersionCode: 17 },
  ),
).toMatchObject({ kind: "supported", headline: "Supported version" });

expect(
  resolveLoginVersionStatus(
    {
      ...baseState,
      status: "idle",
      decision: null,
      errorMessage: "Failed to check for updates.",
      failureStage: "check",
    },
    { currentNativeVersion: "0.1.16", currentVersionCode: 17 },
  ),
).toMatchObject({ kind: "unverified", headline: "Could not verify latest version" });
```

Also assert combined tone priority: red for offline/unexpected/required, amber for limited/available/unverified, green only for online plus current/supported, neutral while either side is checking.

- [ ] **Step 2: Write failing layout tests**

Assert exact layout boundaries:

```ts
expect(
  resolveCampusLoginLayout({ width: 320, height: 568, keyboardVisible: false }),
).toEqual({ mode: "stacked", compact: true, heroHeight: 190 });

expect(
  resolveCampusLoginLayout({ width: 390, height: 844, keyboardVisible: false }),
).toEqual({ mode: "stacked", compact: false, heroHeight: 320 });

expect(
  resolveCampusLoginLayout({ width: 390, height: 844, keyboardVisible: true }),
).toEqual({ mode: "stacked", compact: true, heroHeight: 118 });

expect(
  resolveCampusLoginLayout({ width: 768, height: 1024, keyboardVisible: false }),
).toEqual({ mode: "split", compact: false, heroHeight: 1024 });
```

- [ ] **Step 3: Run both suites and verify RED**

```bash
cd mobile
npx jest \
  src/components/auth/__tests__/login-status-model.test.ts \
  src/components/auth/__tests__/campus-login-layout.test.ts \
  --runInBand
```

Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement the pure models**

Use these public shapes:

```ts
export type LoginVersionStatusKind =
  | "checking"
  | "current"
  | "supported"
  | "available"
  | "required"
  | "unverified";

export type LoginVersionStatus = {
  kind: LoginVersionStatusKind;
  headline: string;
  detail: string;
  installedLabel: string;
};

export type LoginStatusTone = "neutral" | "green" | "amber" | "red";

export function resolveLoginVersionStatus(
  state: UpdateState,
  installed: { currentNativeVersion: string; currentVersionCode: number },
): LoginVersionStatus;

export function resolveLoginStatusTone(
  serverKind: LoginServerStatusKind,
  versionKind: LoginVersionStatusKind,
): LoginStatusTone;
```

Mapping order must be: provider `checking` first; policy-check failure; `apk_forced`; `apk_optional`; usable `none` decision with code comparison; otherwise unverified. Check failure precedes a retained decision because the provider preserves its previous decision while recording a refresh failure. Installed copy is always `Installed v<version> (build <code>)`.

Use this layout contract:

```ts
export type CampusLoginLayout = {
  mode: "stacked" | "split";
  compact: boolean;
  heroHeight: number;
};

export function resolveCampusLoginLayout({
  width,
  height,
  keyboardVisible,
}: {
  width: number;
  height: number;
  keyboardVisible: boolean;
}): CampusLoginLayout {
  if (width >= 768) return { mode: "split", compact: false, heroHeight: height };
  if (keyboardVisible) return { mode: "stacked", compact: true, heroHeight: 118 };
  if (height < 700) return { mode: "stacked", compact: true, heroHeight: 190 };
  return {
    mode: "stacked",
    compact: false,
    heroHeight: Math.min(340, Math.max(280, Math.floor(height * 0.38))),
  };
}
```

- [ ] **Step 5: Run both suites and verify GREEN**

Run Step 3. Expected: all model/layout tests pass.

---

### Task 3: Campus Layout, Shared Primitive Customization, and Status Modal

**Files:**
- Create: `mobile/src/components/auth/MobileCampusLogin.tsx`
- Create: `mobile/src/components/auth/MobileLoginStatusModal.tsx`
- Create: `mobile/src/components/auth/__tests__/MobileCampusLogin.test.tsx`
- Create: `mobile/src/components/auth/__tests__/MobileLoginStatusModal.test.tsx`
- Modify: `mobile/src/components/auth/MobileAuthPrimitives.tsx`
- Create: `mobile/assets/auth/gabhs-seal.png`
- Create: `mobile/assets/auth/nexora-students.png`

**Interfaces:**
- `MobileCampusLogin` accepts `children`, `footer`, `statusTone`, and `onOpenStatus`.
- `MobileLoginStatusModal` is presentational and receives `serverStatus`, `versionStatus`, `checking`, `onCheckAgain`, `onReviewUpdate`, `onClose`, and `visible`.

- [ ] **Step 1: Copy existing assets mechanically and verify exact provenance**

```bash
mkdir -p mobile/assets/auth
cp next-frontend/public/taguigpic.png mobile/assets/auth/gabhs-seal.png
cp next-frontend/public/NexoraHome.png mobile/assets/auth/nexora-students.png
cmp next-frontend/public/taguigpic.png mobile/assets/auth/gabhs-seal.png
cmp next-frontend/public/NexoraHome.png mobile/assets/auth/nexora-students.png
```

Expected: both `cmp` commands exit 0.

- [ ] **Step 2: Write failing component tests**

Mock React Native primitives, `useSafeAreaInsets`, and bundled images. Assert:

```ts
expect(flattenText(campusRenderer.toJSON())).toContain("GABHS Digital Campus");
expect(flattenText(campusRenderer.toJSON())).toContain("Nexora Portal");
expect(
  campusRenderer.root.findByProps({ accessibilityLabel: "App and server status" }),
).toBeTruthy();
expect(
  campusRenderer.root.findByProps({ accessibilityLabel: "App and server status" }).props.style,
).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 44, minWidth: 44 })]));
```

For the modal, assert online/current, limited/supported, offline/unverified, and required-update copy, plus close/refresh/review callbacks. The modal's `accessibilityViewIsModal` must be true and the close button label must be `Close app and server status`.

- [ ] **Step 3: Run component suites and verify RED**

```bash
cd mobile
npx jest \
  src/components/auth/__tests__/MobileCampusLogin.test.tsx \
  src/components/auth/__tests__/MobileLoginStatusModal.test.tsx \
  --runInBand
```

Expected: FAIL because both components are missing.

- [ ] **Step 4: Add default-preserving primitive customization**

Modify shared auth primitives without changing default output:

```ts
export function AuthInputField({
  iconColor = authTheme.textLight,
  containerStyle,
  ...props
}: TextInputProps & {
  icon: string;
  iconColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightAccessory?: ReactNode;
})

export function AuthPrimaryButton({
  gradientColors = loadingGradient,
  ...props
}: {
  gradientColors?: readonly [string, string, ...string[]];
  // preserve existing label/loading/disabled/onPress props
})

export function AuthFooterLink({
  color = authTheme.textMid,
  ...props
}: {
  color?: string;
  label: string;
  onPress: () => void;
})
```

Apply `containerStyle` after default field-container styles, use `iconColor` for the left icon, pass `gradientColors` to `LinearGradient`, and use `color` for footer text. Existing callers need no edits.

- [ ] **Step 5: Implement `MobileCampusLogin`**

Use `useWindowDimensions`, `Keyboard.addListener`, `AccessibilityInfo.isReduceMotionEnabled`, `Animated`, `useSafeAreaInsets`, and `resolveCampusLoginLayout`. Required public props:

```ts
type Props = PropsWithChildren<{
  footer?: ReactNode;
  statusTone: LoginStatusTone;
  onOpenStatus: () => void;
}>;
```

Required visual structure:

- Root warm `#FFFAF9` surface.
- Bundled student image over deep-red fallback with a readable red gradient overlay.
- Real seal plus `GABHS Digital Campus` and `Nexora Portal`.
- Top-left 44 px `!` trigger positioned at `insets.top + 12` / `insets.left + 16` with a separate 8 px tone dot.
- Stacked form surface uses rounded top corners and `marginTop: -24`; split mode uses a left hero and right form column.
- Form column maximum width 480 px and scrollable content.
- Entrance opacity/translation duration 380 ms only when reduced motion is false; reduced motion sets the animated value directly to 1.
- Copyright copy remains at the bottom of the form column.

- [ ] **Step 6: Implement `MobileLoginStatusModal`**

Use a transparent `Modal` with a dim overlay and a centered card capped at 360 px. Render the configured target label/address, server headline/detail, installed label, version headline/detail, and formatted local time when `checkedAt` exists. `Check again` remains available in every state. Render `Review update` only for `available` or `required`.

- [ ] **Step 7: Run component and existing auth-render suites and verify GREEN**

```bash
cd mobile
npx jest \
  src/components/auth/__tests__/MobileCampusLogin.test.tsx \
  src/components/auth/__tests__/MobileLoginStatusModal.test.tsx \
  src/screens/__tests__/auth-recovery-render.test.tsx \
  --runInBand
```

Expected: all tests pass and existing non-login auth components retain defaults.

---

### Task 4: Login Screen Integration Without Auth Regression

**Files:**
- Modify: `mobile/src/screens/LoginScreen.tsx`
- Modify: `mobile/src/screens/__tests__/auth-recovery-render.test.tsx`
- Modify: `mobile/src/screens/__tests__/screen-render.test.tsx`

**Interfaces:**
- Consumes: `useUpdate`, `getClientVersionInfo`, `checkLoginServerStatus`, status model, Campus layout, and modal.
- Preserves: existing `handleLogin`, seeded credentials, verification routing, banners, and forgot-password navigation.

- [ ] **Step 1: Extend test harness mocks before new assertions**

In both screen suites add required React Native mocks for `Image`, `Modal`, `Animated`, `Keyboard`, `AccessibilityInfo`, `useWindowDimensions`, and `useSafeAreaInsets`. Mock `useUpdate` with a stable `none` decision and `checkForUpdates: jest.fn()`. Mock `checkLoginServerStatus` with a resolved online status. Keep all existing auth mocks unchanged.

- [ ] **Step 2: Write failing login integration tests**

Add assertions that the rendered screen contains `GABHS Digital Campus`, `Nexora Portal`, `Welcome to Nexora`, `Use your school account to continue`, and `Sign in`; contains a pressable with accessibility label `App and server status`; calls `checkLoginServerStatus` once after mount; opens status copy after pressing the trigger; calls both `checkLoginServerStatus` and `checkForUpdates` on `Check again`; and does not contain `Connected to http` or `Connected to https`.

Keep the existing empty-submit, forgot-password, unverified-account, and password-visibility assertions and ensure they continue passing.

- [ ] **Step 3: Run login suites and verify RED**

```bash
cd mobile
npx jest \
  src/screens/__tests__/auth-recovery-render.test.tsx \
  src/screens/__tests__/screen-render.test.tsx \
  --runInBand
```

Expected: the new campus/status assertions fail against the old `AuthScreenShell` output.

- [ ] **Step 4: Integrate status lifecycle and new composition**

Add state:

```ts
const { state: updateState, checkForUpdates } = useUpdate();
const [statusVisible, setStatusVisible] = useState(false);
const [serverStatus, setServerStatus] = useState<LoginServerStatus>({
  ...describeApiTarget(),
  kind: "checking",
  headline: "Checking server",
  detail: "Confirming the configured Nexora connection.",
  checkedAt: null,
});

const installed = getClientVersionInfo();
const versionStatus = resolveLoginVersionStatus(updateState, installed);
const statusTone = resolveLoginStatusTone(
  serverStatus.kind,
  versionStatus.kind,
);
```

Add a memoized `refreshStatus` that first sets only the server portion to checking while preserving target/address, then runs `checkLoginServerStatus()` and `checkForUpdates()` in parallel. On mount run only `checkLoginServerStatus()` because the root update provider already performs its initial policy check. Track cancellation in the effect so an unmounted screen is not updated.

Replace `AuthScreenShell` with `MobileCampusLogin`. Use `AuthInputField` with campus icon/container customization, `AuthPrimaryButton` with `[#F59E0B, #EF4444, #FB7185]`, and `AuthFooterLink` with `#B91C1C`. Change presentation copy to `Welcome to Nexora` and `Use your school account to continue`; do not alter field labels/placeholders, button label, banners, or handlers.

Delete the passive raw API text. Render `MobileLoginStatusModal` as the sibling overlay. `onReviewUpdate` closes the diagnostic modal and calls `checkForUpdates()` so the official updater handles the release.

- [ ] **Step 5: Run focused suites and verify GREEN**

Run Step 3 plus the service/model/component suites from Tasks 1-3. Expected: all focused tests pass.

---

### Task 5: Full Verification and Multi-Viewport Visual Evidence

**Files:**
- Verify: every source/test/asset/OpenSpec/plan path from Tasks 1-4.
- Generate only local evidence: Expo/Playwright screenshots outside tracked source paths.

**Interfaces:**
- Produces: type/test evidence plus reviewed 320x568, 390x844, 844x390, and 1024x768 renders.

- [ ] **Step 1: Run the required mobile gates**

```bash
cd mobile
npm run typecheck
npm run test -- --runInBand
```

Expected: typecheck exit 0; all mobile suites and tests pass. Existing React 19 renderer deprecation warnings may remain, but no new error, failed assertion, or open-handle warning is accepted.

- [ ] **Step 2: Validate planning and repository hygiene**

```bash
cd ..
openspec validate redesign-mobile-login-campus-status
rg -n "T[B]D|T[O]DO|implement l[a]ter|fill in d[e]tails" \
  openspec/changes/redesign-mobile-login-campus-status \
  docs/superpowers/plans/2026-09-04-mobile-campus-login.md
git diff --check
git status --short
git diff --stat
```

Expected: OpenSpec valid; placeholder search has no matches; whitespace check passes; changed paths are limited to the approved scope.

- [ ] **Step 3: Start Expo web for render verification**

Run in a managed terminal session:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
npx expo start --web --port 8085
```

Use Playwright against `http://127.0.0.1:8085` at the four required viewports. Capture the closed login and open status modal where the viewport permits. Inspect for field clipping, hero crop, safe-area collision, modal overflow, form reachability, and split-layout balance. Do not commit screenshots or Expo-generated cache output.

- [ ] **Step 4: Attempt Android runtime verification without overstating evidence**

```bash
adb devices -l
```

If an authorized emulator/device is listed, run the Expo Android target and verify login layout, keyboard collapse, status modal, offline/online refresh, and password/recovery controls. If no target is listed, record that Android runtime/device evidence is unavailable and retain the Expo web/render plus automated evidence as distinct proof.

- [ ] **Step 5: Review the diff against every OpenSpec scenario**

Create a requirement checklist from `specs/mobile-campus-login/spec.md` and mark each as source-proven, automated-test-proven, render-proven, artifact-proven, or pending release. Correct any uncovered requirement before version bump.

---

### Task 6: Version 0.1.17 / Build 18 APK, Delivery, and Production Proof

**Files:**
- Modify: `mobile/app.json`
- Modify: `mobile/android/app/build.gradle`
- Replace: `next-frontend/public/downloads/nexora-student-mobile-release.apk`
- Modify: `next-frontend/public/downloads/nexora-student-mobile-release.json`
- Modify: `openspec/changes/redesign-mobile-login-campus-status/tasks.md` as steps complete.

**Interfaces:**
- Produces: reviewed ARM64 APK and exact manifest, one scoped `developement` commit, exact-commit CI/deployment evidence, live-byte equality, and registered policy when the secret is available.

- [ ] **Step 1: Bump both native metadata sources test-first**

Update release tests to expect `0.1.17` / code `18`, run `npm run test:release`, and verify the test fails against existing `0.1.16` / 17 metadata. Then modify `mobile/app.json` and `mobile/android/app/build.gradle` together and rerun the release test to pass.

- [ ] **Step 2: Re-run pre-build gates**

Run full mobile typecheck/Jest, `npm run test:release`, OpenSpec validation, `git diff --check`, and scope review again after the version bump.

- [ ] **Step 3: Build with the explicit production environment**

```bash
cd mobile/android
EXPO_PUBLIC_API_URL=https://capstone-backend-v2-production.up.railway.app/api \
NODE_ENV=production \
JAVA_HOME=/home/jethro/.jdks/jdk-17.0.10+7 \
ANDROID_HOME=/home/jethro/Android/Sdk \
./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  --no-daemon --max-workers=2
cd ../..
```

- [ ] **Step 4: Inspect the generated APK before embedding**

```bash
android_tools=/home/jethro/Android/Sdk/build-tools/36.0.0
release_apk=mobile/android/app/build/outputs/apk/release/app-release.apk
"$android_tools/aapt" dump badging "$release_apk" | rg '^package:'
"$android_tools/aapt" dump permissions "$release_apk" | rg 'android.permission.REQUEST_INSTALL_PACKAGES'
"$android_tools/apksigner" verify --verbose --print-certs "$release_apk"
"$android_tools/zipalign" -c -P 16 -v 4 "$release_apk"
unzip -t "$release_apk"
unzip -l "$release_apk" | rg 'lib/arm64-v8a/.+\.so$'
```

Require package `com.nexora.lms.mobile`, version `0.1.17`/18, installer permission, ARM64 content, valid ZIP, v2 signature with certificate continuity, 16 KB alignment, and the production URL present with localhost API endpoints absent from the authoritative bundled configuration.

- [ ] **Step 5: Embed byte-for-byte and generate the manifest**

```bash
cp mobile/android/app/build/outputs/apk/release/app-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.apk
cmp mobile/android/app/build/outputs/apk/release/app-release.apk \
  next-frontend/public/downloads/nexora-student-mobile-release.apk
cd mobile
npm run release:prepare -- \
  --min-supported-version-code 1 \
  --release-notes "Web-aligned Campus Front Door login with server and APK status diagnostics."
npm run release:verify
cd ..
```

- [ ] **Step 6: Run final cross-surface gates**

Run mobile typecheck/full Jest/release tests/release verification; run `next-frontend` lint, tests, and production build because its public artifact changed; validate OpenSpec; run `git diff --check`; inspect status/stat/binary manifest; and require `git rev-list --left-right --count origin/developement...HEAD` to remain `0 0` before commit.

- [ ] **Step 7: Complete the one-round plan review and stage only reviewed paths**

Re-read this plan and OpenSpec design/spec/tasks. Verify every requirement maps to a completed task, search for placeholders, compare function/type names to implementation, and fix any discrepancy. Check every OpenSpec checkbox only after its evidence exists. Stage only the OpenSpec/plan, mobile source/tests/assets/version files, and frontend APK/manifest. Review `git diff --cached --check`, `git diff --cached --stat`, and the staged diff.

- [ ] **Step 8: Commit, push, and monitor the exact SHA**

```bash
git commit -m "feat(mobile): redesign Nexora campus login"
release_sha=$(git rev-parse HEAD)
git push origin developement
```

Identify GitHub workflow runs whose `headSha` equals `$release_sha` and wait for every required job to reach terminal success. Use Railway tooling to confirm backend/frontend deployments for the exact SHA reach terminal success. Do not claim deployment based only on a successful push.

- [ ] **Step 9: Prove live bytes before policy registration**

Download the live APK to a `mktemp` path with a cache-busting query, compare its byte count and SHA-256 with `nexora-student-mobile-release.json`, run `cmp` against the committed APK, and inspect the live file's version/signature/ABI/alignment. Delete the temporary file afterward.

- [ ] **Step 10: Register and read back exact policy when authorized secret access exists**

Use the existing secret-backed Railway execution path so `CI_ADMIN_SECRET` is never printed. POST the committed JSON unchanged to `/api/app-version/register`. Require build 17 to receive `apk_optional` pointing to build 18 and build 18 to receive `none`. If secret access is unavailable, do not invent or expose it; report registration as the only remaining external blocker while retaining all completed deployment/live-byte evidence.

- [ ] **Step 11: Final synchronization audit**

```bash
git fetch origin developement
git status --short
git rev-parse HEAD
git rev-parse origin/developement
git rev-list --left-right --count origin/developement...HEAD
git log -8 --oneline --decorate
```

Require a clean worktree, identical local/remote SHA, divergence `0 0`, terminal-success required workflows, exact live artifact equality, and every OpenSpec checkbox complete before marking the goal achieved.
