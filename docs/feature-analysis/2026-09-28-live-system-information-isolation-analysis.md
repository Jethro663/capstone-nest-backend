# Live System Information Isolation Analysis

**Date:** 2026-09-28

**Scope:** The top-right web System information button/modal and the build metadata it displays for frontend and backend.
**Execution boundary:** This report is the analysis artifact required before the separately authorized finish-and-ship implementation.

## 1. Executive verdict

The modal is already a shared, low-coupling consumer of public health endpoints. Its stale values come from two metadata producer defects, not from the dialog request flow:

- **Confirmed:** the backend falls back to `0.0.0` because `HealthService.getServiceMetadata()` reads `process.env.npm_package_version`, while the production image launches `node dist/main` through the entrypoint instead of an npm lifecycle (`backend/src/modules/health/health.service.ts:49-56`, `backend/package.json` `start:prod`).
- **Confirmed:** the frontend expects Railway's commit SHA at Next build time, but the Docker builder does not declare `ARG RAILWAY_GIT_COMMIT_SHA` (`next-frontend/next.config.ts:32-35`, `next-frontend/Dockerfile:9-40`). Railway documents that injected variables must be declared with `ARG` in the Docker stage that needs them.
- **Confirmed:** the same `SystemInfoButton` is mounted in admin, teacher, and student top bars, so one fix covers all web roles (`next-frontend/src/components/layout/TopBar.tsx:80-81,148-149,234-235`).

Recommendation: keep the existing public health contract, make both producers emit immutable package version plus deployment commit, and render version and commit as separate readable fields. No schema, database, auth, queue, or mobile API change is needed.

Coupling is **moderate** because the frontend commit is a Docker/Next build-time concern while backend metadata is a runtime health concern. Removal is easy at the UI entry point, but removing metadata from health responses would break observability consumers and is not recommended.

## 2. Feature anatomy

1. A role top bar renders `SystemInfoButton`.
2. Opening the modal starts parallel requests to `/api/health/live`, `/api/health/ready`, and the AI health proxy (`SystemInfoButton.tsx:59-91`).
3. The frontend version is currently a compile-time string from `NEXT_PUBLIC_APP_VERSION` plus `NEXT_PUBLIC_RAILWAY_GIT_COMMIT_SHA` (`health-service.ts:4-9`).
4. Backend liveness/readiness both use `HealthService.getServiceMetadata()` (`health.controller.ts:17-24,50-65`).
5. The modal tolerates partial failures through `Promise.allSettled` and displays `Unavailable`, so metadata correction does not need to weaken health/error handling.

State is ephemeral and read-only. There is no database state, cache beyond the existing 15-second readiness cache, background job, audit write, or privileged action.

## 3. Cascade map

| Edge | Provider                       | Interface                                            | Consumer                            | Effect                                | Risk   | Confidence | Evidence                                                       | Disposition                                                       |
| ---- | ------------------------------ | ---------------------------------------------------- | ----------------------------------- | ------------------------------------- | ------ | ---------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| E1   | Admin/teacher/student top bars | `SystemInfoButton` component                         | Authenticated web users             | Opens the shared modal                | Low    | Confirmed  | `TopBar.tsx:80-81,148-149,234-235`                             | Preserve                                                          |
| E2   | `SystemInfoButton`             | `healthService.getLiveness/getReadiness/getAiHealth` | Modal cards                         | Loads current health and version data | Medium | Confirmed  | `SystemInfoButton.tsx:59-114`                                  | Preserve partial-failure behavior                                 |
| E3   | Next build config              | `NEXT_PUBLIC_APP_VERSION`                            | Browser bundle                      | Supplies frontend version             | Low    | Confirmed  | `next.config.ts:32-35`; `health-service.ts:4-9`                | Keep package version as authority                                 |
| E4   | Railway Docker build           | `RAILWAY_GIT_COMMIT_SHA` build arg                   | Next build config                   | Supplies deployed frontend revision   | High   | Confirmed  | `next-frontend/Dockerfile:9-40`; Railway Dockerfile docs       | Add builder-stage `ARG`                                           |
| E5   | Backend package/runtime        | `HealthService.getServiceMetadata()`                 | `/health/live`, `/health/ready`     | Supplies backend version and commit   | High   | Confirmed  | `health.service.ts:49-56`; `health.controller.ts:17-24,50-65`  | Resolve version from explicit env, npm env, then packaged version |
| E6   | Railway deployment             | `RAILWAY_GIT_COMMIT_SHA` runtime env                 | Backend health metadata             | Identifies deployed backend revision  | Medium | Confirmed  | `health.service.ts:53-55`; Railway variables reference         | Preserve, normalize blank values                                  |
| E7   | Public health endpoints        | Existing response shapes                             | CI, deploy health checks, web modal | Operational observability             | High   | Confirmed  | `health.controller.ts`; `.github/workflows/railway-deploy.yml` | No response-shape removal or auth change                          |
| E8   | AI service health              | Version/provider/model fields                        | Modal AI card                       | Context for AI debugging              | Low    | Confirmed  | `SystemInfoButton.tsx:101-112,173-183`                         | Out of scope; preserve                                            |

## 4. Isolation and cut simulation

- **Cut E1:** removes discoverability only; health checks continue. Rollback is restoring the button import/render.
- **Cut E2:** the dialog becomes static/stale. This is the current anti-goal and must not be introduced.
- **Cut E4:** frontend returns to `dev` even on Railway. Validation: build with a known SHA and assert the bundled metadata displays it. Rollback: remove the Docker `ARG`; no stored state is involved.
- **Cut E5/E6:** backend returns a fallback version or `development`. Validation: unit-test env precedence and package fallback, then inspect live `/api/health/live`. Rollback: revert the metadata resolver; health status semantics remain unaffected.
- **Compatibility:** keep `service.name`, `service.version`, and optional `service.gitCommit` exactly as current consumers expect. Presentation may expose the full SHA without changing the API.

## 5. Improvements

Required decoupling:

1. Separate frontend `version` and `gitCommit` values instead of embedding the short SHA into one opaque display string.
2. Resolve backend version without depending on how Node was launched.
3. Declare Railway's commit SHA in the Docker build stage so Next can bake it into the client bundle.

Optional, not included: deployment ID, build timestamp, copy-to-clipboard, or a new build-info endpoint. They add surface area without being required to answer “what version and commit is live?”

## 6. Uncertainty and coverage boundary

- **Unverified until release:** whether the current Railway frontend service is using exactly this Dockerfile and a GitHub-triggered deploy for the final revision. The release workflow must confirm provider logs and live modal/HTML evidence.
- **Unverified until browser evidence:** whether caching serves an older frontend bundle immediately after deploy.
- **Coverage boundary:** source owners, public health consumers, Docker build inputs, and top-bar entry points were inspected. No additional dependency was found within the inspected scope after a focused search for version/commit variable names and `SystemInfoButton` references.
