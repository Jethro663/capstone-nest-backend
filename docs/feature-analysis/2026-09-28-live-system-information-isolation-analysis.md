# Live System Information Isolation Analysis

**Date:** 2026-09-28

**Scope:** The top-right web System information button/modal and the build metadata it displays for frontend and backend.
**Execution boundary:** This report is the analysis artifact required before the separately authorized finish-and-ship implementation.

## 1. Executive verdict

The modal is already a shared, low-coupling consumer of public health endpoints. Its stale values come from two metadata producer defects, not from the dialog request flow:

- **Confirmed:** the backend falls back to `0.0.0` because `HealthService.getServiceMetadata()` reads `process.env.npm_package_version`, while the production image launches `node dist/main` through the entrypoint instead of an npm lifecycle (`backend/src/modules/health/health.service.ts:49-56`, `backend/package.json` `start:prod`).
- **Confirmed:** the frontend expects commit metadata at Next build time, but the Docker builder did not declare a corresponding build argument (`next-frontend/next.config.ts`, `next-frontend/Dockerfile`). Railway documents that injected variables must be declared with `ARG` in the Docker stage that needs them.
- **Confirmed by live release:** this repository deploys checked-out CI source with `railway up`, so Railway's GitHub-source-only `RAILWAY_GIT_COMMIT_SHA` remained unavailable and the first deployed health check still returned `development`. The workflow already owns the authoritative `TESTED_SHA`; it must pin that value into each service as `APP_GIT_COMMIT_SHA` before upload.
- **Confirmed:** the same `SystemInfoButton` is mounted in admin, teacher, and student top bars, so one fix covers all web roles (`next-frontend/src/components/layout/TopBar.tsx:80-81,148-149,234-235`).

Recommendation: keep the existing public health contract, make both producers emit immutable package version plus deployment commit, and render version and commit as separate readable fields. Prefer the workflow-pinned `APP_GIT_COMMIT_SHA`, retain Railway's native SHA as a fallback for future GitHub-source deployments, and keep explicit local fallbacks. No schema, database, auth, queue, or mobile API change is needed.

Coupling is **moderate** because the frontend commit is a Docker/Next build-time concern while backend metadata is a runtime health concern. Removal is easy at the UI entry point, but removing metadata from health responses would break observability consumers and is not recommended.

## 2. Feature anatomy

1. A role top bar renders `SystemInfoButton`.
2. Opening the modal starts parallel requests to `/api/health/live`, `/api/health/ready`, and the AI health proxy (`SystemInfoButton.tsx:59-91`).
3. The frontend version is compile-time metadata from `NEXT_PUBLIC_APP_VERSION` plus a commit selected from workflow-pinned `APP_GIT_COMMIT_SHA` or Railway's native SHA fallback.
4. Backend liveness/readiness both use `HealthService.getServiceMetadata()` (`health.controller.ts:17-24,50-65`).
5. The modal tolerates partial failures through `Promise.allSettled` and displays `Unavailable`, so metadata correction does not need to weaken health/error handling.

State is ephemeral and read-only. There is no database state, cache beyond the existing 15-second readiness cache, background job, audit write, or privileged action.

## 3. Cascade map

| Edge | Provider                       | Interface                                            | Consumer                            | Effect                                | Risk   | Confidence | Evidence                                                       | Disposition                                                       |
| ---- | ------------------------------ | ---------------------------------------------------- | ----------------------------------- | ------------------------------------- | ------ | ---------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| E1   | Admin/teacher/student top bars | `SystemInfoButton` component                         | Authenticated web users             | Opens the shared modal                | Low    | Confirmed  | `TopBar.tsx:80-81,148-149,234-235`                             | Preserve                                                          |
| E2   | `SystemInfoButton`             | `healthService.getLiveness/getReadiness/getAiHealth` | Modal cards                         | Loads current health and version data | Medium | Confirmed  | `SystemInfoButton.tsx:59-114`                                  | Preserve partial-failure behavior                                 |
| E3   | Next build config              | `NEXT_PUBLIC_APP_VERSION`                            | Browser bundle                      | Supplies frontend version             | Low    | Confirmed  | `next.config.ts:32-35`; `health-service.ts:4-9`                | Keep package version as authority                                 |
| E4   | CI deploy workflow             | `TESTED_SHA` -> service `APP_GIT_COMMIT_SHA`         | Backend runtime and Docker build    | Supplies exact tested revision        | High   | Confirmed  | `.github/workflows/railway-deploy.yml`; live release evidence  | Pin with `--skip-deploys` immediately before service upload       |
| E5   | Backend package/runtime        | `HealthService.getServiceMetadata()`                 | `/health/live`, `/health/ready`     | Supplies backend version and commit   | High   | Confirmed  | `health.service.ts:49-56`; `health.controller.ts:17-24,50-65`  | Resolve version from explicit env, npm env, then packaged version |
| E6   | Application metadata resolver  | `APP_GIT_COMMIT_SHA`, then `RAILWAY_GIT_COMMIT_SHA` | Backend and frontend metadata       | Identifies deployed service revision  | High   | Confirmed  | Health/config tests and live health response                   | Prefer tested SHA; normalize blanks and preserve native fallback  |
| E7   | Public health endpoints        | Existing response shapes                             | CI, deploy health checks, web modal | Operational observability             | High   | Confirmed  | `health.controller.ts`; `.github/workflows/railway-deploy.yml` | No response-shape removal or auth change                          |
| E8   | AI service health              | Version/provider/model fields                        | Modal AI card                       | Context for AI debugging              | Low    | Confirmed  | `SystemInfoButton.tsx:101-112,173-183`                         | Out of scope; preserve                                            |

## 4. Isolation and cut simulation

- **Cut E1:** removes discoverability only; health checks continue. Rollback is restoring the button import/render.
- **Cut E2:** the dialog becomes static/stale. This is the current anti-goal and must not be introduced.
- **Cut E4:** CLI-uploaded frontend and backend return to `development` even on Railway. Validation: pin a known tested SHA, deploy both services, and compare live metadata. Rollback: remove the non-secret service variable and resolver precedence; no database state is involved.
- **Cut E5/E6:** backend returns a fallback version or `development`. Validation: unit-test env precedence and package fallback, then inspect live `/api/health/live`. Rollback: revert the metadata resolver; health status semantics remain unaffected.
- **Compatibility:** keep `service.name`, `service.version`, and optional `service.gitCommit` exactly as current consumers expect. Presentation may expose the full SHA without changing the API.

## 5. Improvements

Required decoupling:

1. Separate frontend `version` and `gitCommit` values instead of embedding the short SHA into one opaque display string.
2. Resolve backend version without depending on how Node was launched.
3. Declare both the workflow-pinned and Railway-native commit inputs in the Docker build stage so Next can bake the available revision into the client bundle.

Optional, not included: deployment ID, build timestamp, copy-to-clipboard, or a new build-info endpoint. They add surface area without being required to answer “what version and commit is live?”

## 6. Uncertainty and coverage boundary

- **Confirmed:** the current production path uses CLI source uploads, not a Railway GitHub source integration; the tested SHA therefore requires explicit workflow-to-service propagation.
- **Unverified until the deploy-workflow change reaches the default branch:** GitHub evaluates `workflow_run` definitions from the default branch. The current release can be pinned and redeployed manually, while future automatic pinning activates after the workflow change is merged to the default branch.
- **Unverified until browser evidence:** whether caching serves an older frontend bundle immediately after deploy.
- **Coverage boundary:** source owners, public health consumers, Docker build inputs, and top-bar entry points were inspected. No additional dependency was found within the inspected scope after a focused search for version/commit variable names and `SystemInfoButton` references.
