# Nexora Mobile Version Gate & Forced Update Blueprint

**Document purpose:** Complete 0–100 implementation blueprint for adding a backend-controlled mobile app version gate to Nexora.

**Target behavior:**

1. Mobile app checks the backend before login/auth bootstrap.
2. If the app is below the backend minimum supported version, login is blocked.
3. If a user is already logged in and the backend later raises the minimum supported version, every mobile API call can return `APP_UPDATE_REQUIRED`.
4. Mobile clears local auth/session state, stops retries, and forces the user to update.
5. Android users can be directed to the latest APK download URL or external update page.
6. Web, AI-service, and normal backend APIs must not break.

---

## 0. Current Repo Assumptions

This blueprint is designed for the current Nexora repo state:

- Monorepo apps:
  - `backend/`: NestJS API
  - `next-frontend/`: Next.js web client
  - `ai-service/`: FastAPI internal AI service
  - `mobile/`: Expo / React Native app
- Backend is the system of record and API authority.
- Mobile talks to backend `/api/*` routes.
- Mobile already has separate auth endpoints:
  - `POST /api/auth/mobile/login`
  - `POST /api/auth/mobile/refresh`
  - `POST /api/auth/mobile/logout`
- Mobile already stores access token, refresh token, and session snapshot using SecureStore plus AsyncStorage fallback.
- Mobile already has:
  - `mobile/App.tsx`
  - `mobile/src/bootstrap/AppRoot.tsx`
  - `mobile/src/providers/AppProviders.tsx`
  - `mobile/src/providers/AuthProvider.tsx`
  - `mobile/src/navigation/AppNavigator.tsx`
  - `mobile/src/api/client.ts`
  - `mobile/src/api/services/auth.ts`
  - `mobile/src/api/storage.ts`
- Backend already has:
  - modular NestJS structure
  - Drizzle schema/migrations
  - JWT access tokens
  - opaque rotating refresh tokens
  - global JWT guard
  - role guards/decorators
  - audit logs
  - health/readiness routes
- AI service should not be involved in this feature.
- Web should not be blocked by mobile version rules.

---

## 1. Final Architecture

### 1.1 New system component

Add a backend-owned feature:

```txt
Mobile Version Gate
```

This gate answers one question:

```txt
Is this mobile app build allowed to talk to the backend?
```

It should be independent of auth identity.

Auth answers:

```txt
Who are you?
```

Roles answer:

```txt
What are you allowed to access?
```

Version gate answers:

```txt
Is your app binary/build still supported?
```

### 1.2 High-level architecture

```txt
Expo Mobile App
  ↓
VersionGateProvider
  ↓
GET /api/mobile/version-policy
  ↓
NestJS MobileVersionModule
  ↓
PostgreSQL app_versions table
  ↓
Decision:
  - allow
  - optional update
  - force update
  - unsupported platform/channel
```

Authenticated runtime flow:

```txt
Mobile API request
  ↓
Axios request interceptor adds version headers
  ↓
Backend MobileVersionGuard checks headers
  ↓
If app is supported:
    continue to normal controller
  ↓
If app is unsupported/outdated:
    return 426 APP_UPDATE_REQUIRED
  ↓
Mobile response interceptor clears tokens/session
  ↓
Show ForceUpdateScreen
```

---

## 2. Feature Goals

### 2.1 Required goals

- Block outdated mobile users before login.
- Block outdated mobile users during active sessions.
- Force logout locally when backend rejects app version.
- Provide latest APK/update URL in backend response.
- Allow optional update prompts for non-breaking releases.
- Protect web from mobile-only version guard.
- Make version policy configurable without app rebuild.
- Support staging/production/internal release channels.
- Support Android now; leave iOS-ready structure.
- Avoid infinite refresh loops.
- Avoid breaking health checks/static assets.
- Add tests for backend version decisions and mobile interceptor behavior.

### 2.2 Non-goals for first implementation

Do **not** implement these in v1 unless explicitly needed:

- Full Play Store integration.
- Silent APK install.
- Forced binary installation without Android installer.
- AI-service changes.
- Complex percentage rollout.
- Per-user A/B version policy.
- Admin UI if deadline is tight.
- Device attestation.
- Native anti-tamper checks.

---

## 3. Core Concepts

### 3.1 Version vs build

Use both:

```txt
appVersion = human-readable semantic version
appBuild = monotonic integer build number
```

Example:

```txt
version: 1.3.0
build: 35
```

Backend decisions should primarily compare `build`, not string versions.

Why:

```txt
1.10.0 > 1.2.0
```

can be mishandled if compared as plain strings.

### 3.2 Policy fields

Each release policy should define:

```txt
platform
channel
latestVersion
latestBuild
minimumSupportedVersion
minimumSupportedBuild
forceUpdate
updateUrl
apkUrl
apkSha256
releaseNotes
isActive
```

### 3.3 Decisions

The engine should return one of:

```txt
ALLOW
OPTIONAL_UPDATE
FORCE_UPDATE
BLOCK_UNSUPPORTED
HEADER_REQUIRED
POLICY_NOT_CONFIGURED
```

### 3.4 HTTP status

Use:

```txt
200 OK
```

for:

```txt
ALLOW
OPTIONAL_UPDATE
```

Use:

```txt
426 Upgrade Required
```

for:

```txt
FORCE_UPDATE
```

Use:

```txt
400 Bad Request
```

for malformed version headers on mobile-specific requests.

Use:

```txt
503 Service Unavailable
```

only if policy is required but missing due to server misconfiguration.

---

## 4. Backend Files to Add

### 4.1 New backend module

Create:

```txt
backend/src/modules/mobile-version/
├── dto/
│   ├── version-policy-query.dto.ts
│   ├── version-policy-response.dto.ts
│   ├── update-version-policy.dto.ts
│   └── create-version-policy.dto.ts
├── mobile-version.constants.ts
├── mobile-version.controller.ts
├── mobile-version.guard.ts
├── mobile-version.module.ts
├── mobile-version.service.ts
├── mobile-version.types.ts
└── mobile-version.util.ts
```

### 4.2 New schema file

Create:

```txt
backend/src/drizzle/schema/mobile-version.schema.ts
```

### 4.3 Schema barrel export

Touch whatever schema export file exists in repo, likely:

```txt
backend/src/drizzle/schema/index.ts
```

or current schema aggregation file.

Add export for:

```ts
export * from './mobile-version.schema';
```

### 4.4 Migration

Create a new migration under:

```txt
backend/drizzle/
```

Example name:

```txt
0087_add_mobile_app_versions.sql
```

Actual number must follow current migration sequence.

### 4.5 App module registration

Touch:

```txt
backend/src/app.module.ts
```

Add:

```ts
MobileVersionModule
```

### 4.6 Auth integration

Touch:

```txt
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/auth.service.ts
```

or only `auth.controller.ts` if version validation is done before service login.

### 4.7 Optional audit logging

Touch or reuse:

```txt
backend/src/modules/admin/admin.controller.ts
backend/src/modules/users/users.controller.ts
backend/src/drizzle/schema/base.schema.ts
```

Only if audit logs have a shared service.

### 4.8 Optional admin API

Add endpoints in:

```txt
backend/src/modules/mobile-version/mobile-version.controller.ts
```

No separate admin module is necessary for v1.

---

## 5. Mobile Files to Add

Create:

```txt
mobile/src/version/
├── app-version.ts
├── version-policy.types.ts
├── version-policy.service.ts
├── VersionGateProvider.tsx
├── useVersionGate.ts
└── version-gate-storage.ts
```

Create screen:

```txt
mobile/src/screens/ForceUpdateScreen.tsx
```

Optional reusable UI:

```txt
mobile/src/components/UpdateRequiredCard.tsx
mobile/src/components/OptionalUpdateBanner.tsx
```

---

## 6. Mobile Files to Touch

Touch:

```txt
mobile/src/bootstrap/AppRoot.tsx
mobile/src/providers/AppProviders.tsx
mobile/src/providers/AuthProvider.tsx
mobile/src/navigation/AppNavigator.tsx
mobile/src/api/client.ts
mobile/src/api/services/auth.ts
mobile/src/api/storage.ts
mobile/src/api/config.ts
mobile/app.json
mobile/package.json
```

Possible touch depending on structure:

```txt
mobile/app.config.ts
mobile/eas.json
```

if the project uses EAS build profiles.

---

## 7. Docs / Config Files to Touch

Create:

```txt
docs/mobile-version-gate.md
docs/release-management/mobile-release-runbook.md
```

Touch:

```txt
README.md
.env.compose.example
backend/.env.example
mobile/.env.example
```

Optional:

```txt
mobile/AGENTS.md
backend/AGENTS.md
```

if the repo uses agent instruction files.

---

## 8. Backend Database Design

### 8.1 Drizzle schema target

Create table:

```ts
export const mobileAppVersions = pgTable('mobile_app_versions', {
  id: uuid('id').defaultRandom().primaryKey(),

  platform: varchar('platform', { length: 20 }).notNull(),
  channel: varchar('channel', { length: 40 }).notNull().default('production'),

  latestVersion: varchar('latest_version', { length: 40 }).notNull(),
  latestBuild: integer('latest_build').notNull(),

  minimumSupportedVersion: varchar('minimum_supported_version', { length: 40 }).notNull(),
  minimumSupportedBuild: integer('minimum_supported_build').notNull(),

  forceUpdate: boolean('force_update').notNull().default(false),

  updateUrl: text('update_url'),
  apkUrl: text('apk_url'),
  apkSha256: varchar('apk_sha256', { length: 128 }),

  releaseNotes: text('release_notes'),
  message: text('message'),

  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### 8.2 Indexes

Add:

```sql
CREATE INDEX idx_mobile_app_versions_platform_channel_active
ON mobile_app_versions(platform, channel, is_active);
```

Add a uniqueness rule for active policy.

PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX uniq_active_mobile_policy_per_platform_channel
ON mobile_app_versions(platform, channel)
WHERE is_active = true;
```

### 8.3 Supported values

Use constants:

```ts
export const MOBILE_PLATFORMS = ['android', 'ios'] as const;
export const MOBILE_CHANNELS = ['production', 'staging', 'internal'] as const;
```

### 8.4 First seed

For development:

```sql
INSERT INTO mobile_app_versions (
  platform,
  channel,
  latest_version,
  latest_build,
  minimum_supported_version,
  minimum_supported_build,
  force_update,
  update_url,
  apk_url,
  release_notes,
  is_active
)
VALUES (
  'android',
  'production',
  '1.0.0',
  1,
  '1.0.0',
  1,
  false,
  'https://example.com/nexora/latest',
  'https://example.com/nexora/nexora-1.0.0.apk',
  'Initial mobile release.',
  true
);
```

---

## 9. Backend API Contracts

### 9.1 Public version policy check

Add:

```http
GET /api/mobile/version-policy
```

Query params:

```txt
platform=android
version=1.0.0
build=1
channel=production
```

Example:

```http
GET /api/mobile/version-policy?platform=android&version=1.0.0&build=1&channel=production
```

### 9.2 Headers alternative

The same data may also come from headers:

```http
X-Nexora-App-Platform: android
X-Nexora-App-Version: 1.0.0
X-Nexora-App-Build: 1
X-Nexora-App-Channel: production
```

Recommendation:

- Public startup check can use query params.
- All normal API calls should use headers.

### 9.3 OK response

```json
{
  "code": "APP_VERSION_OK",
  "decision": "allow",
  "updateRequired": false,
  "updateAvailable": false,
  "platform": "android",
  "channel": "production",
  "currentVersion": "1.0.0",
  "currentBuild": 1,
  "latestVersion": "1.0.0",
  "latestBuild": 1,
  "minimumSupportedVersion": "1.0.0",
  "minimumSupportedBuild": 1,
  "message": null,
  "releaseNotes": null,
  "updateUrl": null,
  "apkUrl": null,
  "apkSha256": null
}
```

### 9.4 Optional update response

```json
{
  "code": "APP_UPDATE_AVAILABLE",
  "decision": "optional_update",
  "updateRequired": false,
  "updateAvailable": true,
  "platform": "android",
  "channel": "production",
  "currentVersion": "1.0.0",
  "currentBuild": 1,
  "latestVersion": "1.1.0",
  "latestBuild": 2,
  "minimumSupportedVersion": "1.0.0",
  "minimumSupportedBuild": 1,
  "message": "A newer version is available.",
  "releaseNotes": "Bug fixes and notification improvements.",
  "updateUrl": "https://example.com/nexora/latest",
  "apkUrl": "https://example.com/nexora/nexora-1.1.0.apk",
  "apkSha256": "..."
}
```

### 9.5 Forced update response

Status:

```http
426 Upgrade Required
```

Body:

```json
{
  "code": "APP_UPDATE_REQUIRED",
  "decision": "force_update",
  "updateRequired": true,
  "updateAvailable": true,
  "platform": "android",
  "channel": "production",
  "currentVersion": "1.0.0",
  "currentBuild": 1,
  "latestVersion": "1.2.0",
  "latestBuild": 5,
  "minimumSupportedVersion": "1.2.0",
  "minimumSupportedBuild": 5,
  "message": "Please update Nexora to continue.",
  "releaseNotes": "This update is required for compatibility.",
  "updateUrl": "https://example.com/nexora/latest",
  "apkUrl": "https://example.com/nexora/nexora-1.2.0.apk",
  "apkSha256": "..."
}
```

### 9.6 Missing version headers on mobile request

Status:

```http
400 Bad Request
```

Body:

```json
{
  "code": "APP_VERSION_HEADER_REQUIRED",
  "message": "Mobile app version headers are required."
}
```

### 9.7 Policy not configured

Status:

```http
503 Service Unavailable
```

Body:

```json
{
  "code": "APP_VERSION_POLICY_NOT_CONFIGURED",
  "message": "Mobile version policy is not configured for this platform and channel."
}
```

Use this only after v1 is stable. During initial rollout, default to fail-open for unknown policies to prevent accidental lockout.

---

## 10. Backend Version Decision Engine

Create:

```txt
backend/src/modules/mobile-version/mobile-version.service.ts
```

Main method:

```ts
evaluateClientVersion(input: EvaluateMobileVersionInput): Promise<MobileVersionDecision>
```

Input:

```ts
export type EvaluateMobileVersionInput = {
  platform: 'android' | 'ios';
  channel: 'production' | 'staging' | 'internal';
  version: string;
  build: number;
};
```

Decision:

```ts
export type MobileVersionDecisionCode =
  | 'APP_VERSION_OK'
  | 'APP_UPDATE_AVAILABLE'
  | 'APP_UPDATE_REQUIRED'
  | 'APP_VERSION_HEADER_REQUIRED'
  | 'APP_VERSION_POLICY_NOT_CONFIGURED'
  | 'APP_PLATFORM_UNSUPPORTED';

export type MobileVersionDecision = {
  code: MobileVersionDecisionCode;
  decision:
    | 'allow'
    | 'optional_update'
    | 'force_update'
    | 'header_required'
    | 'policy_not_configured'
    | 'unsupported';
  httpStatus: number;
  updateRequired: boolean;
  updateAvailable: boolean;
  platform: string;
  channel: string;
  currentVersion: string | null;
  currentBuild: number | null;
  latestVersion: string | null;
  latestBuild: number | null;
  minimumSupportedVersion: string | null;
  minimumSupportedBuild: number | null;
  message: string | null;
  releaseNotes: string | null;
  updateUrl: string | null;
  apkUrl: string | null;
  apkSha256: string | null;
};
```

Logic:

```ts
if (!platform || !version || !build) {
  return HEADER_REQUIRED;
}

policy = await getActivePolicy(platform, channel);

if (!policy) {
  return POLICY_NOT_CONFIGURED or ALLOW depending on rollout mode;
}

if (build < policy.minimumSupportedBuild) {
  return FORCE_UPDATE;
}

if (build < policy.latestBuild) {
  return OPTIONAL_UPDATE;
}

return ALLOW;
```

Important:

```txt
forceUpdate=true should not force update every latestBuild mismatch.
```

Recommended v1 rule:

```txt
A user is forced to update if:
  clientBuild < minimumSupportedBuild

A user is optionally prompted if:
  clientBuild >= minimumSupportedBuild
  AND clientBuild < latestBuild
```

`forceUpdate` can be used as an emergency override:

```txt
If forceUpdate = true:
  any build lower than latestBuild is forced
```

Pseudo:

```ts
const belowMinimum = client.build < policy.minimumSupportedBuild;
const belowLatest = client.build < policy.latestBuild;

if (belowMinimum) {
  return forceUpdateDecision;
}

if (policy.forceUpdate && belowLatest) {
  return forceUpdateDecision;
}

if (belowLatest) {
  return optionalUpdateDecision;
}

return allowDecision;
```

---

## 11. Backend Guard Design

Create:

```txt
backend/src/modules/mobile-version/mobile-version.guard.ts
```

### 11.1 Guard responsibility

The guard should:

1. Detect if request is from mobile.
2. Ignore non-mobile web requests.
3. Ignore excluded routes.
4. Extract version headers.
5. Call `MobileVersionService`.
6. Throw a controlled HTTP exception if update is required.
7. Allow request if version is accepted.

### 11.2 Mobile detection

Detect mobile by header:

```http
X-Nexora-Client: mobile
```

Request interceptor should always send:

```http
X-Nexora-Client: mobile
```

Do **not** rely only on User-Agent.

### 11.3 Headers

Every mobile request should send:

```http
X-Nexora-Client: mobile
X-Nexora-App-Platform: android
X-Nexora-App-Version: 1.0.0
X-Nexora-App-Build: 1
X-Nexora-App-Channel: production
```

### 11.4 Routes to exclude

Exclude:

```txt
/api/health
/api/health/live
/api/health/ready
/api/mobile/version-policy
/api/classes/banners/*
/api/sections/banners/*
/api/profiles/images/*
/api/assessments/questions/images/*
```

Also exclude web auth routes unless the request explicitly says mobile.

### 11.5 Apply guard

Recommended safe first approach:

- Do **not** make it a global `APP_GUARD` immediately.
- Apply it to mobile auth endpoints and known mobile API surfaces first.
- Then graduate to global mobile-detecting guard once tests pass.

Recommended final approach:

```ts
{
  provide: APP_GUARD,
  useClass: MobileVersionGuard,
}
```

Because it only activates when:

```http
X-Nexora-Client: mobile
```

is present.

### 11.6 Guard failure response

Throw:

```ts
throw new HttpException(decision, decision.httpStatus);
```

For forced update, status should be:

```ts
HttpStatus.UPGRADE_REQUIRED
```

Nest may not expose named constant depending on version. If not:

```ts
426
```

---

## 12. Backend Auth Integration

### 12.1 Mobile login must check version first

Touch:

```txt
backend/src/modules/auth/auth.controller.ts
```

Before validating credentials in:

```txt
POST /api/auth/mobile/login
```

do:

```ts
await this.mobileVersionService.assertMobileClientSupportedFromRequest(req);
```

If outdated, return `426 APP_UPDATE_REQUIRED`.

This prevents username/password validation from even happening on unsupported clients.

### 12.2 Mobile refresh must check version

Before refresh rotation in:

```txt
POST /api/auth/mobile/refresh
```

do version validation.

If outdated:

- reject with `426`
- do **not** rotate refresh token
- mobile clears local session

### 12.3 Mobile logout should remain allowed

For:

```txt
POST /api/auth/mobile/logout
```

Recommendation:

- Allow logout even if app is outdated.
- This lets old apps cleanly revoke refresh tokens.
- Version guard should exclude mobile logout or treat it as allowed.

### 12.4 Web auth must remain unaffected

Do not require version headers for:

```txt
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

---

## 13. Backend Admin APIs

Optional but recommended for 0–100 completeness.

### 13.1 Admin list policies

```http
GET /api/mobile/version-policies
```

Role:

```txt
admin
```

### 13.2 Admin get active policy

```http
GET /api/mobile/version-policies/active?platform=android&channel=production
```

Role:

```txt
admin
```

### 13.3 Admin create policy

```http
POST /api/mobile/version-policies
```

Role:

```txt
admin
```

Body:

```json
{
  "platform": "android",
  "channel": "production",
  "latestVersion": "1.2.0",
  "latestBuild": 5,
  "minimumSupportedVersion": "1.1.0",
  "minimumSupportedBuild": 3,
  "forceUpdate": false,
  "updateUrl": "https://example.com/nexora/latest",
  "apkUrl": "https://example.com/nexora/nexora-1.2.0.apk",
  "apkSha256": "...",
  "releaseNotes": "Bug fixes.",
  "message": "A new update is available."
}
```

### 13.4 Admin activate policy

```http
PATCH /api/mobile/version-policies/:id/activate
```

Behavior:

- Transaction:
  - deactivate current active policy for same platform/channel
  - activate selected policy

### 13.5 Admin update policy

```http
PATCH /api/mobile/version-policies/:id
```

### 13.6 Admin deactivate policy

```http
PATCH /api/mobile/version-policies/:id/deactivate
```

### 13.7 Admin audit log actions

Audit these:

```txt
mobile_version_policy.created
mobile_version_policy.updated
mobile_version_policy.activated
mobile_version_policy.deactivated
mobile_version_policy.force_update_enabled
```

---

## 14. Mobile Version Constants

Create:

```txt
mobile/src/version/app-version.ts
```

Recommended content:

```ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const APP_PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

export const APP_VERSION =
  Constants.expoConfig?.version ??
  Constants.manifest2?.extra?.expoClient?.version ??
  '0.0.0';

export const APP_BUILD = Number(
  Platform.select({
    android:
      Constants.expoConfig?.android?.versionCode ??
      Constants.manifest2?.extra?.expoClient?.android?.versionCode,
    ios:
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.manifest2?.extra?.expoClient?.ios?.buildNumber,
    default: 0,
  }) ?? 0,
);

export const APP_CHANNEL =
  process.env.EXPO_PUBLIC_APP_CHANNEL ?? 'production';

export const APP_CLIENT = 'mobile';
```

### 14.1 app.json / app.config

Ensure:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    },
    "ios": {
      "buildNumber": "1"
    },
    "extra": {
      "appChannel": "production"
    }
  }
}
```

For each APK release:

```txt
version must increase when user-facing release changes
android.versionCode must always increase
```

---

## 15. Mobile API Client Changes

Touch:

```txt
mobile/src/api/client.ts
```

### 15.1 Request interceptor

Add headers to all backend requests:

```ts
config.headers['X-Nexora-Client'] = 'mobile';
config.headers['X-Nexora-App-Platform'] = APP_PLATFORM;
config.headers['X-Nexora-App-Version'] = APP_VERSION;
config.headers['X-Nexora-App-Build'] = String(APP_BUILD);
config.headers['X-Nexora-App-Channel'] = APP_CHANNEL;
```

### 15.2 Response interceptor

Detect forced update:

```ts
const isUpdateRequired =
  error?.response?.status === 426 ||
  error?.response?.data?.code === 'APP_UPDATE_REQUIRED';
```

When true:

```ts
await clearStoredTokens();
await clearSessionSnapshot();
queryClient.clear();
emitVersionGateEvent(error.response.data);
return Promise.reject(error);
```

### 15.3 Avoid refresh loop

In response interceptor:

```ts
if (isUpdateRequired) {
  // never attempt refresh
  // never retry original request
  // clear session
  // open force update state
}
```

Make sure this block runs before the 401 refresh retry block.

### 15.4 Do not call logout API after 426

If backend rejects due to version, do not attempt `/auth/mobile/logout` because that could also be blocked or fail.

Local clearing is enough.

---

## 16. Mobile Version Policy Service

Create:

```txt
mobile/src/version/version-policy.service.ts
```

API call:

```ts
export async function getVersionPolicy(): Promise<VersionPolicyResponse> {
  const response = await publicApiClient.get('/mobile/version-policy', {
    params: {
      platform: APP_PLATFORM,
      version: APP_VERSION,
      build: APP_BUILD,
      channel: APP_CHANNEL,
    },
    headers: {
      'X-Nexora-Client': 'mobile',
      'X-Nexora-App-Platform': APP_PLATFORM,
      'X-Nexora-App-Version': APP_VERSION,
      'X-Nexora-App-Build': String(APP_BUILD),
      'X-Nexora-App-Channel': APP_CHANNEL,
    },
  });

  return response.data;
}
```

Use public client without auth token.

---

## 17. Mobile VersionGateProvider

Create:

```txt
mobile/src/version/VersionGateProvider.tsx
```

Responsibilities:

1. On app startup, call `getVersionPolicy`.
2. Store version decision in context.
3. Render splash/loading while checking.
4. Render `ForceUpdateScreen` if forced update.
5. Render children if allowed.
6. Optionally show update banner/modal if optional update.
7. Listen for `APP_UPDATE_REQUIRED` events from API interceptor.
8. Prevent AuthProvider bootstrap when forced update is active.

State shape:

```ts
type VersionGateState = {
  status: 'checking' | 'allowed' | 'optional_update' | 'force_update' | 'offline_grace';
  policy: VersionPolicyResponse | null;
  error: Error | null;
  recheck: () => Promise<void>;
};
```

### 17.1 Offline behavior

Recommended behavior:

```txt
If user is not logged in and version check fails because offline:
  show "Cannot verify app version" screen
  allow retry only

If user is logged in and version check fails because offline:
  allow limited offline bootstrap only if app was previously allowed recently
```

For v1, safer behavior:

```txt
No version check = no login.
```

But avoid locking in-school users out during network issues by caching a successful check.

### 17.2 Cached grace

Create:

```txt
mobile/src/version/version-gate-storage.ts
```

Store:

```txt
lastAllowedAt
lastAllowedBuild
lastPolicy
```

Recommended grace period:

```txt
24 hours
```

During grace:

```txt
If app cannot reach version-policy endpoint
AND last allowed check was within 24h
AND build is same as last allowed build
THEN allow app to continue
```

Do not use grace if backend explicitly returned forced update.

### 17.3 Event bridge

Create a tiny event emitter:

```txt
mobile/src/version/version-gate-events.ts
```

Events:

```ts
emitForceUpdate(policy)
subscribeForceUpdate(listener)
```

The API client response interceptor emits the event. `VersionGateProvider` subscribes and switches state to `force_update`.

---

## 18. ForceUpdateScreen

Create:

```txt
mobile/src/screens/ForceUpdateScreen.tsx
```

It should show:

```txt
Nexora update required
Your current app version is no longer supported.
Current version/build
Latest version/build
Release notes
Update button
Retry button
```

### 18.1 Buttons

Primary:

```txt
Update now
```

Behavior:

```ts
Linking.openURL(policy.apkUrl ?? policy.updateUrl)
```

Secondary:

```txt
I updated already / Retry
```

Behavior:

```ts
recheck()
```

### 18.2 Android APK note

Text:

```txt
After downloading, Android may ask you to confirm installation. Reopen Nexora after the update finishes.
```

### 18.3 Do not show login controls

The force update screen must not allow:

```txt
Login
Refresh session
Continue as cached user
Navigation into MainTabs
```

---

## 19. Optional Update UX

Optional update should not block the app.

Options:

### Simple v1

Show modal once per app session:

```txt
A new version is available.
Update now / Later
```

### Better v1.5

Store dismissed build:

```txt
dismissedOptionalUpdateBuild
```

Do not repeatedly show same optional update.

### UI location

Recommended:

```txt
VersionGateProvider overlay/modal
```

or

```txt
Dashboard banner
```

Do not put optional update logic in each screen.

---

## 20. Provider Composition

Current flow likely:

```tsx
<AppRoot>
  <AppProviders>
    <AppNavigator />
  </AppProviders>
</AppRoot>
```

Recommended final:

```tsx
<AppProviders>
  <VersionGateProvider>
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  </VersionGateProvider>
</AppProviders>
```

Alternative if `AuthProvider` is inside `AppProviders`:

```tsx
<AppProviders>
  <VersionGateProvider>
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  </VersionGateProvider>
</AppProviders>
```

Important:

```txt
VersionGateProvider must wrap AuthProvider or block AuthProvider bootstrap.
```

Reason:

```txt
If AuthProvider refreshes before version check, outdated app may refresh tokens before being blocked.
```

---

## 21. Navigation Impact

Touch:

```txt
mobile/src/navigation/AppNavigator.tsx
```

Possible changes:

- Add no new route if `ForceUpdateScreen` is rendered outside navigation.
- Add `ForceUpdate` route only if navigation is required.

Recommended:

```txt
Render ForceUpdateScreen outside AppNavigator.
```

Why:

```txt
It prevents back-navigation into auth/main stacks.
```

---

## 22. AuthProvider Impact

Touch:

```txt
mobile/src/providers/AuthProvider.tsx
```

### Required behavior

Auth bootstrap should only run if version gate is allowed.

Pseudo:

```ts
const { status } = useVersionGate();

useEffect(() => {
  if (status !== 'allowed' && status !== 'optional_update') return;
  bootstrapAuth();
}, [status]);
```

### When force update event happens

AuthProvider should expose or listen to a clear session method.

If response interceptor already clears storage, AuthProvider still needs to update React state:

```ts
setUser(null);
setAccessToken(null);
setStatus('signed_out');
```

Possible solution:

- central `authEvents.ts`
- response interceptor emits `SESSION_FORCE_CLEARED`
- AuthProvider listens

Events:

```txt
FORCE_LOGOUT_UPDATE_REQUIRED
TOKEN_REFRESH_FAILED
MANUAL_LOGOUT
```

---

## 23. Token Storage Impact

Touch:

```txt
mobile/src/api/storage.ts
```

Ensure there is one clear method:

```ts
export async function clearAuthStorage(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(SESSION_SNAPSHOT_KEY),
  ]);
}
```

Add if missing:

```ts
clearSessionSnapshot()
clearStoredTokens()
clearAllAuthState()
```

Use a single canonical clear method to prevent partial logout.

---

## 24. React Query Impact

The repo uses TanStack Query on mobile.

When forced update happens:

```ts
queryClient.clear();
```

or at minimum:

```ts
queryClient.removeQueries();
```

Reason:

```txt
User data from unsupported session should not remain visible after forced update logout.
```

If queryClient is not directly available in `mobile/src/api/client.ts`, expose an event and clear inside provider where queryClient exists.

---

## 25. Backend Session Revocation Strategy

### 25.1 Default v1

Do not revoke backend refresh tokens automatically when app is outdated.

Instead:

```txt
Backend rejects API access with 426.
Mobile clears local tokens.
```

Reason:

```txt
Less destructive. User can update app and continue if refresh token is still valid.
```

### 25.2 Security emergency mode

If old mobile build has security-breaking behavior:

1. Add app version/build metadata to refresh tokens.
2. Revoke sessions where `client_build < minimumSupportedBuild`.

This requires schema changes.

Optional fields for `refresh_tokens`:

```txt
client_platform
client_channel
client_version
client_build
device_id
```

### 25.3 When to revoke

Revoke if:

```txt
Old app leaks tokens
Old app sends corrupted data
Old app bypasses important validation
Old app points to wrong API behavior
```

Do not revoke for:

```txt
Normal UI update
Minor bug fix
Cosmetic update
Optional release
```

---

## 26. APK Hosting / Distribution

### 26.1 Storage options

Pick one:

```txt
Option A: Backend static file hosting
Option B: Railway/Render static file route
Option C: S3/R2/Supabase Storage
Option D: GitHub Releases
Option E: Firebase App Distribution
Option F: Play Store internal testing
```

Recommended for capstone/local school deployment:

```txt
GitHub Releases or Cloudflare R2/S3-style storage
```

### 26.2 Do not store APK in repo

Avoid committing:

```txt
*.apk
*.aab
```

to git.

### 26.3 Store APK metadata in backend

Store:

```txt
apkUrl
apkSha256
version
build
releaseNotes
```

### 26.4 SHA256 verification

Optional v1:

- show hash in admin
- store in policy
- future: verify downloaded APK if app handles download itself

For simple link-opening flow, Android installer handles installation but app will not verify hash directly.

---

## 27. Expo/EAS Update Interaction

Use this rule:

```txt
If the fix only changes JS/assets and is compatible with current native runtime:
  OTA/EAS update may be enough.

If the fix changes native dependencies, permissions, SDK, runtimeVersion, app config, or backend contract compatibility:
  require APK/binary update.
```

### 27.1 Backend policy with OTA

Optional additional fields:

```txt
runtimeVersion
otaUpdateRequired
nativeUpdateRequired
```

Do not implement initially unless EAS Update is already set up.

### 27.2 Practical v1

Use binary version gate only:

```txt
version + android.versionCode
```

---

## 28. Environment Variables

### 28.1 Backend

Add to:

```txt
backend/.env.example
.env.compose.example
```

Suggested:

```env
MOBILE_VERSION_GATE_ENABLED=true
MOBILE_VERSION_GATE_FAIL_OPEN=true
MOBILE_VERSION_GATE_DEFAULT_CHANNEL=production
MOBILE_VERSION_GATE_CACHE_TTL_SECONDS=60
```

Meaning:

```txt
ENABLED=false
  guard does not block anything

FAIL_OPEN=true
  if policy missing or DB lookup fails, allow request but log warning

FAIL_OPEN=false
  if policy missing or DB lookup fails, block mobile request
```

During rollout:

```env
MOBILE_VERSION_GATE_FAIL_OPEN=true
```

After stable:

```env
MOBILE_VERSION_GATE_FAIL_OPEN=false
```

### 28.2 Mobile

Add to:

```txt
mobile/.env.example
```

```env
EXPO_PUBLIC_APP_CHANNEL=production
EXPO_PUBLIC_VERSION_GATE_ENABLED=true
```

---

## 29. Caching Strategy

### 29.1 Backend cache

Version policy is read often. Cache it.

Simple in-memory cache:

```txt
key = platform:channel
ttl = 60 seconds
```

Do not over-optimize. DB load will be small.

### 29.2 Mobile cache

Cache last allowed policy:

```txt
lastAllowedAt
lastAllowedBuild
lastPolicyJson
```

Use only for network failure grace, not for overriding backend forced update.

---

## 30. Observability / Logging

Log backend events:

```txt
mobile_version_check.allow
mobile_version_check.optional_update
mobile_version_check.force_update
mobile_version_check.header_missing
mobile_version_check.policy_missing
```

Log fields:

```txt
platform
channel
currentVersion
currentBuild
latestBuild
minimumSupportedBuild
path
userId if authenticated
requestId
ipHash or partial IP if privacy policy allows
```

Do not log:

```txt
access token
refresh token
password
full device identifier if not needed
```

### 30.1 Metrics

If backend metrics are already used, add counters:

```txt
mobile_version_check_total{decision,platform,channel}
mobile_update_required_total{platform,channel}
```

Optional.

---

## 31. Security Notes

### 31.1 Do not trust version headers for security identity

Version headers are client-reported and can be spoofed.

They are still useful for:

```txt
Compatibility enforcement
Operational migration
User update UX
Basic old-client blocking
```

They are not enough for:

```txt
Strong anti-tamper
Device integrity
Fraud prevention
```

### 31.2 Backend must remain source of truth

Even with version gate, backend must validate all business rules.

Never assume:

```txt
New app = safe request
```

### 31.3 APK URL safety

Use HTTPS only.

Reject admin policy if:

```txt
apkUrl does not start with https://
```

unless local development.

### 31.4 Prevent accidental lockout

Use rollout flags:

```env
MOBILE_VERSION_GATE_FAIL_OPEN=true
```

at first.

Add emergency backend env:

```env
MOBILE_VERSION_GATE_ENABLED=false
```

---

## 32. Testing Plan

## 32.1 Backend unit tests

Create:

```txt
backend/src/modules/mobile-version/mobile-version.service.spec.ts
```

Test cases:

```txt
allows current build
allows build above latest
optional update when build below latest but >= minimum
force update when build below minimum
force update when forceUpdate=true and build below latest
rejects missing platform
rejects missing build
handles missing policy fail-open
handles missing policy fail-closed
handles unsupported platform
uses production as default channel
```

## 32.2 Backend controller tests

Create:

```txt
backend/src/modules/mobile-version/mobile-version.controller.spec.ts
```

Test:

```txt
GET /mobile/version-policy returns allow
GET /mobile/version-policy returns optional update
GET /mobile/version-policy returns force update
query params are validated
bad build returns 400
```

## 32.3 Backend guard tests

Create:

```txt
backend/src/modules/mobile-version/mobile-version.guard.spec.ts
```

Test:

```txt
non-mobile request passes
mobile request with valid version passes
mobile request with old version throws 426
mobile logout route passes
version-policy route passes
health route passes
missing headers throws 400 or fail-open depending route
```

## 32.4 Auth tests

Touch existing auth tests or add:

```txt
backend/src/modules/auth/auth.mobile-version.spec.ts
```

Test:

```txt
mobile login blocked when version outdated
mobile login allowed when version valid
mobile refresh blocked when version outdated
mobile logout allowed when version outdated
web login unaffected by mobile version gate
web refresh unaffected by mobile version gate
```

## 32.5 Mobile unit tests

Create:

```txt
mobile/src/version/__tests__/version-policy.service.test.ts
mobile/src/version/__tests__/VersionGateProvider.test.tsx
mobile/src/api/__tests__/client.version-gate.test.ts
```

Test:

```txt
app sends correct version headers
startup allowed state renders children
force update state renders ForceUpdateScreen
optional update state allows children
426 clears auth storage
426 does not trigger refresh retry
offline no cached allow blocks login
offline recent cached allow continues
retry button rechecks policy
```

## 32.6 Manual QA

### Scenario A: Fresh valid app

```txt
Set minimumSupportedBuild = 1
Install app build 1
Open app
Expected: login screen appears
Login succeeds
```

### Scenario B: Fresh outdated app

```txt
Set minimumSupportedBuild = 2
Install app build 1
Open app
Expected: ForceUpdateScreen appears
Login inaccessible
```

### Scenario C: Logged-in user becomes outdated

```txt
Set minimumSupportedBuild = 1
Login with build 1
Raise minimumSupportedBuild = 2
Tap any dashboard API action
Expected:
  API returns 426
  app clears session
  ForceUpdateScreen appears
```

### Scenario D: Optional update

```txt
minimumSupportedBuild = 1
latestBuild = 2
clientBuild = 1
Expected:
  App continues
  Optional update banner/modal appears
```

### Scenario E: Web unaffected

```txt
Use next-frontend login
Expected:
  no mobile version headers required
  login still works
```

### Scenario F: Health unaffected

```txt
GET /api/health/ready
Expected:
  no version headers required
```

### Scenario G: Refresh loop prevention

```txt
Logged-in old app calls /api/auth/me
Backend returns 426
Expected:
  app does not call /auth/mobile/refresh repeatedly
```

---

## 33. Cascaded Implementation Plan

This is the order an agent should follow.

---

### Phase 1: Backend schema and policy engine

Goal:

```txt
Add data model and pure version decision logic.
```

Tasks:

1. Create Drizzle schema `mobile-version.schema.ts`.
2. Export schema from schema index/barrel.
3. Create migration.
4. Add seed/dev policy.
5. Create `MobileVersionModule`.
6. Create `MobileVersionService`.
7. Implement `evaluateClientVersion`.
8. Add service unit tests.

Files touched:

```txt
backend/src/drizzle/schema/mobile-version.schema.ts
backend/src/drizzle/schema/index.ts
backend/drizzle/0087_add_mobile_app_versions.sql
backend/src/modules/mobile-version/mobile-version.module.ts
backend/src/modules/mobile-version/mobile-version.service.ts
backend/src/modules/mobile-version/mobile-version.types.ts
backend/src/modules/mobile-version/mobile-version.constants.ts
backend/src/modules/mobile-version/mobile-version.util.ts
backend/src/modules/mobile-version/mobile-version.service.spec.ts
backend/src/app.module.ts
```

Done when:

```txt
Backend tests pass and service returns correct decisions.
```

---

### Phase 2: Public version-policy endpoint

Goal:

```txt
Mobile can ask backend if its build is allowed before login.
```

Tasks:

1. Add DTOs.
2. Add `GET /api/mobile/version-policy`.
3. Validate query params.
4. Return standardized response.
5. Add controller tests.
6. Add API docs in `docs/mobile-version-gate.md`.

Files touched:

```txt
backend/src/modules/mobile-version/mobile-version.controller.ts
backend/src/modules/mobile-version/dto/version-policy-query.dto.ts
backend/src/modules/mobile-version/dto/version-policy-response.dto.ts
backend/src/modules/mobile-version/mobile-version.controller.spec.ts
docs/mobile-version-gate.md
```

Done when:

```txt
GET /api/mobile/version-policy returns allow/optional/force correctly.
```

---

### Phase 3: Mobile startup gate

Goal:

```txt
App checks version before auth bootstrap.
```

Tasks:

1. Add app version constants.
2. Add version policy types.
3. Add version policy service.
4. Add VersionGateProvider.
5. Add ForceUpdateScreen.
6. Insert VersionGateProvider above AuthProvider.
7. Block AuthProvider bootstrap until version is allowed.
8. Add retry/update buttons.

Files touched:

```txt
mobile/src/version/app-version.ts
mobile/src/version/version-policy.types.ts
mobile/src/version/version-policy.service.ts
mobile/src/version/VersionGateProvider.tsx
mobile/src/version/useVersionGate.ts
mobile/src/screens/ForceUpdateScreen.tsx
mobile/src/bootstrap/AppRoot.tsx
mobile/src/providers/AppProviders.tsx
mobile/src/providers/AuthProvider.tsx
mobile/app.json
```

Done when:

```txt
Old app build cannot reach login screen.
```

---

### Phase 4: Mobile headers and runtime 426 handling

Goal:

```txt
Every mobile request identifies its app version and reacts to forced-update responses.
```

Tasks:

1. Add version headers in mobile API client request interceptor.
2. Add response interceptor for `426` or `APP_UPDATE_REQUIRED`.
3. Ensure 426 bypasses token refresh retry.
4. Clear token storage/session snapshot on 426.
5. Clear React Query cache.
6. Emit force update event.
7. VersionGateProvider listens and renders ForceUpdateScreen.

Files touched:

```txt
mobile/src/api/client.ts
mobile/src/api/storage.ts
mobile/src/version/version-gate-events.ts
mobile/src/version/VersionGateProvider.tsx
mobile/src/providers/AuthProvider.tsx
mobile/src/providers/AppProviders.tsx
```

Done when:

```txt
A logged-in outdated app is immediately forced to update after any backend 426 response.
```

---

### Phase 5: Backend runtime guard

Goal:

```txt
Backend rejects outdated mobile API requests globally/safely.
```

Tasks:

1. Add `MobileVersionGuard`.
2. Guard activates only when `X-Nexora-Client: mobile`.
3. Exclude health/static/version-policy/logout routes.
4. Wire guard safely.
5. Add guard tests.
6. Confirm web requests do not need mobile headers.

Files touched:

```txt
backend/src/modules/mobile-version/mobile-version.guard.ts
backend/src/modules/mobile-version/mobile-version.module.ts
backend/src/app.module.ts
backend/src/modules/mobile-version/mobile-version.guard.spec.ts
```

Done when:

```txt
Mobile old build gets 426 on protected API requests, web still works.
```

---

### Phase 6: Auth hardening

Goal:

```txt
Mobile login and refresh are explicitly version-gated.
```

Tasks:

1. Inject `MobileVersionService` into mobile auth controller/service path.
2. Validate version before mobile login credentials are checked.
3. Validate version before mobile refresh token rotation.
4. Allow mobile logout even if outdated.
5. Add auth tests.

Files touched:

```txt
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/auth.service.ts
backend/src/modules/auth/auth.mobile-version.spec.ts
```

Done when:

```txt
Outdated app cannot login or refresh tokens.
```

---

### Phase 7: Admin/release management API

Goal:

```txt
Admins can update mobile version policy without DB manual edits.
```

Tasks:

1. Add admin CRUD endpoints for policies.
2. Add role guard for admin.
3. Add activation transaction.
4. Add audit logs.
5. Add validation for URL/build numbers.
6. Add tests.

Files touched:

```txt
backend/src/modules/mobile-version/mobile-version.controller.ts
backend/src/modules/mobile-version/dto/create-version-policy.dto.ts
backend/src/modules/mobile-version/dto/update-version-policy.dto.ts
backend/src/modules/mobile-version/mobile-version.service.ts
backend/src/modules/mobile-version/mobile-version.admin.spec.ts
```

Done when:

```txt
Admin can create/update/activate version policy through API.
```

---

### Phase 8: Optional web admin UI

Goal:

```txt
Admin dashboard can manage mobile releases.
```

This is optional for first release.

Possible files:

```txt
next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx
next-frontend/app/(dashboard)/dashboard/admin/mobile-releases/page.tsx
next-frontend/src/services/mobile-version-service.ts
next-frontend/src/types/mobile-version.ts
```

UI should support:

```txt
List policies
Show active Android production policy
Create new policy
Activate policy
Set latest build
Set minimum supported build
Set APK URL
Set forceUpdate
```

Done when:

```txt
Admin can manage the policy from web UI.
```

---

### Phase 9: Release artifacts and runbook

Goal:

```txt
Make actual APK release process repeatable.
```

Tasks:

1. Document APK build process.
2. Document where APK is uploaded.
3. Document how to compute SHA256.
4. Document how to update backend policy.
5. Document rollback.
6. Add `.gitignore` entries for APKs if missing.

Files touched:

```txt
docs/release-management/mobile-release-runbook.md
README.md
.gitignore
mobile/eas.json
mobile/app.json
```

Done when:

```txt
Anyone can release a new mobile build without guessing.
```

---

### Phase 10: Full QA and rollout

Goal:

```txt
Enable without breaking users.
```

Tasks:

1. Deploy backend with gate disabled or fail-open.
2. Seed active policy matching current mobile build.
3. Release mobile app with version headers and startup gate.
4. Confirm headers in backend logs.
5. Turn on gate fail-open.
6. Test optional update.
7. Test forced update on staging/internal.
8. Turn on fail-closed only after confidence.

Recommended rollout order:

```txt
1. Backend policy endpoint only
2. Mobile app sends headers and handles 426
3. Backend guard in fail-open mode
4. Auth explicit checks
5. Staging force update test
6. Production optional update
7. Production forced update only when needed
```

Done when:

```txt
Production can force outdated mobile builds to update safely.
```

---

## 34. Rollout Flags

### 34.1 Initial safe config

```env
MOBILE_VERSION_GATE_ENABLED=true
MOBILE_VERSION_GATE_FAIL_OPEN=true
```

### 34.2 Strict config after verification

```env
MOBILE_VERSION_GATE_ENABLED=true
MOBILE_VERSION_GATE_FAIL_OPEN=false
```

### 34.3 Emergency disable

```env
MOBILE_VERSION_GATE_ENABLED=false
```

Use if:

```txt
All users accidentally blocked
Policy bad
APK URL wrong
Backend migration broken
```

---

## 35. Failure Modes and Fixes

### 35.1 All mobile users blocked

Likely causes:

```txt
minimumSupportedBuild too high
active policy wrong channel
mobile build reports 0
headers missing
guard applied too broadly
```

Fix:

```txt
Set MOBILE_VERSION_GATE_ENABLED=false
or lower minimumSupportedBuild
or set FAIL_OPEN=true
```

### 35.2 Web users blocked

Likely cause:

```txt
guard requires headers on all clients
```

Fix:

```txt
guard should activate only when X-Nexora-Client=mobile
```

### 35.3 Infinite refresh loop

Likely cause:

```txt
426 handled after 401 refresh logic
```

Fix:

```txt
handle APP_UPDATE_REQUIRED before auth refresh retry
```

### 35.4 User sees dashboard after force update

Likely cause:

```txt
AuthProvider state not cleared
React Query cache not cleared
VersionGateProvider rendered inside navigator
```

Fix:

```txt
clear auth state
clear query cache
render ForceUpdateScreen outside navigator
```

### 35.5 App always reports build 0

Likely cause:

```txt
Constants.expoConfig android.versionCode not available in current runtime
```

Fix:

```txt
add explicit EXPO_PUBLIC_APP_BUILD during build
or read from Application.nativeBuildVersion
```

Alternative:

Install:

```txt
expo-application
```

Then read:

```ts
Application.nativeApplicationVersion
Application.nativeBuildVersion
```

This may be more reliable than `expo-constants`.

---

## 36. Recommended Dependency: expo-application

If not already installed, add:

```bash
cd mobile
npx expo install expo-application
```

Then:

```ts
import * as Application from 'expo-application';

export const APP_VERSION = Application.nativeApplicationVersion ?? '0.0.0';
export const APP_BUILD = Number(Application.nativeBuildVersion ?? 0);
```

This is cleaner for production builds.

Fallback to `expo-constants` if unavailable.

---

## 37. Final Endpoint Map

Public:

```txt
GET /api/mobile/version-policy
```

Admin:

```txt
GET    /api/mobile/version-policies
GET    /api/mobile/version-policies/active
POST   /api/mobile/version-policies
PATCH  /api/mobile/version-policies/:id
PATCH  /api/mobile/version-policies/:id/activate
PATCH  /api/mobile/version-policies/:id/deactivate
```

Auth touched:

```txt
POST /api/auth/mobile/login
POST /api/auth/mobile/refresh
POST /api/auth/mobile/logout
```

Runtime protected:

```txt
All mobile requests with X-Nexora-Client: mobile
except excluded public/static/health/version routes
```

---

## 38. Final File Touch Map

### Backend add

```txt
backend/src/modules/mobile-version/
backend/src/drizzle/schema/mobile-version.schema.ts
backend/drizzle/0087_add_mobile_app_versions.sql
docs/mobile-version-gate.md
docs/release-management/mobile-release-runbook.md
```

### Backend touch

```txt
backend/src/app.module.ts
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/auth.service.ts
backend/src/drizzle/schema/index.ts
backend/.env.example
.env.compose.example
README.md
```

### Mobile add

```txt
mobile/src/version/
mobile/src/screens/ForceUpdateScreen.tsx
```

### Mobile touch

```txt
mobile/src/api/client.ts
mobile/src/api/storage.ts
mobile/src/api/services/auth.ts
mobile/src/bootstrap/AppRoot.tsx
mobile/src/providers/AppProviders.tsx
mobile/src/providers/AuthProvider.tsx
mobile/src/navigation/AppNavigator.tsx
mobile/app.json
mobile/package.json
mobile/.env.example
```

### Optional web add/touch

```txt
next-frontend/src/services/mobile-version-service.ts
next-frontend/src/types/mobile-version.ts
next-frontend/app/(dashboard)/dashboard/admin/mobile-releases/page.tsx
next-frontend/app/(dashboard)/dashboard/admin/system-settings/page.tsx
```

### No touch expected

```txt
ai-service/
```

---

## 39. Acceptance Criteria

The feature is complete when all of these are true:

### Backend

- `mobile_app_versions` table exists.
- There is one active Android production policy.
- `GET /api/mobile/version-policy` works.
- Old mobile build gets `426 APP_UPDATE_REQUIRED`.
- Valid mobile build proceeds normally.
- Web login and web API calls do not require mobile version headers.
- Mobile login is blocked before password validation when outdated.
- Mobile refresh is blocked when outdated.
- Mobile logout still works or local clearing is enough.
- Tests cover allow/optional/force paths.

### Mobile

- Mobile sends version headers on every API call.
- Mobile checks version before auth bootstrap.
- Outdated fresh app cannot access login.
- Outdated logged-in app clears tokens and shows force update screen.
- 426 does not trigger refresh loop.
- Optional update does not block user.
- Update button opens APK/update URL.
- Retry button rechecks backend policy.
- React Query cache is cleared on forced update logout.

### Release

- APK release process documented.
- SHA256 process documented.
- Backend policy update process documented.
- Emergency disable flag documented.
- Rollback process documented.

---

## 40. Suggested Codex Execution Prompt

Use this if feeding the implementation to Codex:

```txt
You are working in the Nexora monorepo. Implement the Mobile Version Gate feature exactly according to docs/mobile-version-gate-blueprint.md.

Primary goal:
- Add backend-controlled mobile app version enforcement for the Expo app.
- Block outdated mobile app builds before login.
- Force logout and show update screen if an already logged-in app becomes outdated.
- Do not break web or AI-service.

Implementation order:
1. Backend schema, migration, MobileVersionModule, service decision engine, tests.
2. Public GET /api/mobile/version-policy endpoint.
3. Mobile VersionGateProvider, ForceUpdateScreen, app-version constants.
4. Mobile API request headers and 426 response handling.
5. Backend MobileVersionGuard, initially mobile-header-only and safe for web.
6. Mobile auth login/refresh explicit version enforcement.
7. Docs and runbook.

Constraints:
- Web must not require mobile headers.
- AI-service must not be touched.
- 426 APP_UPDATE_REQUIRED must bypass refresh retry logic.
- Mobile logout should remain possible or local clearing must be enough.
- Build number comparison is authoritative.
- Use current repo patterns for modules, DTOs, Drizzle schema, tests, and providers.
- Add tests before claiming completion.
- Keep changes incremental and verify after each phase.

Definition of done:
- Old build cannot login.
- Old logged-in build is forced out on any API call.
- Valid build works normally.
- Optional update allows continued use.
- Web still works.
- Tests pass.
```

---

## 41. Recommended Minimum v1 Scope

If time is limited, implement only this:

### Backend

```txt
mobile_app_versions table
MobileVersionService
GET /api/mobile/version-policy
MobileVersionGuard
mobile login/refresh checks
```

### Mobile

```txt
app-version constants
VersionGateProvider
ForceUpdateScreen
API headers
426 handling
auth storage clearing
```

Skip for v1:

```txt
Admin UI
Metrics
Session revocation by app build
OTA/EAS advanced handling
Per-user rollout
```

This gives the full required behavior with the least risk.

---

## 42. Final Mental Model

The feature should feel like a firewall before auth:

```txt
Request enters backend
  ↓
Is this a mobile request?
  ↓
No → continue normally
  ↓
Yes → is app build supported?
  ↓
No → 426 APP_UPDATE_REQUIRED
  ↓
Yes → continue to auth/roles/controller
```

On mobile:

```txt
App opens
  ↓
Can this build talk to backend?
  ↓
No → ForceUpdateScreen
  ↓
Yes → AuthProvider starts
  ↓
User logs in / app refreshes session
  ↓
Any future 426 immediately clears session and returns to ForceUpdateScreen
```

This keeps the implementation clean:

```txt
Backend owns policy.
Mobile obeys policy.
Auth remains auth.
Version gate remains compatibility enforcement.
Web remains unaffected.
AI-service remains untouched.
```
