# CI Workflow Failure Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the failing `CI` GitHub Actions workflow by fixing the mobile dependency install break and aligning backend e2e coverage with the current health and LXP authorization behavior.

**Architecture:** This is a minimal remediation, not a workflow redesign. The mobile fix should update only the invalid Expo package pin and lockfile, while the backend fix should prefer correcting stale e2e tests where the source code already shows the intended behavior (`HealthController.check()` now calls `getServiceMetadata()`, and LXP evaluation listing is currently admin-only in both controller and service).

**Tech Stack:** GitHub Actions, Node 20, npm, Expo SDK 54, NestJS, Jest e2e, Supertest

## Global Constraints

- Keep the fix narrowly scoped to the failing CI surfaces in `mobile/` and `backend/`.
- Do not change `.github/workflows/ci.yml` unless a reproduction proves the workflow file itself is wrong.
- Preserve current backend RBAC behavior unless product requirements explicitly say teachers should access `/api/lxp/evaluations`.
- Prefer test corrections over production code changes when the current source already expresses the intended contract.
- Verify using the same commands the workflow runs: `npm ci`, `npm run typecheck`, `npm run build`, and `npx jest --config ./test/jest-e2e.json --ci`.

## Scope Map

- `[S1]` Mobile CI install succeeds by removing the invalid `expo-intent-launcher@~4.0.4` dependency pin and refreshing the lockfile.
- `[S2]` Backend health e2e liveness coverage reflects the current `HealthController.check()` dependency on `HealthService.getServiceMetadata()`.
- `[S3]` Backend LXP evaluations e2e coverage reflects the current admin-only authorization on `GET /api/lxp/evaluations`.
- `[S4]` End-to-end verification mirrors the CI job commands before opening a PR or merging.

---

### Task 1: Fix the mobile dependency pin

**Covers:** [S1]

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json`

**Interfaces:**
- Consumes: npm registry metadata for `expo-intent-launcher`, Expo's package resolver
- Produces: a lockfile and dependency manifest that allow `npm ci` to complete on Node 20 in GitHub Actions

- [x] **Step 1: Reproduce the current CI install failure**

```bash
cd mobile
npm ci
```

Expected: FAIL with `npm ERR! code ETARGET` and `No matching version found for expo-intent-launcher@~4.0.4`.

- [x] **Step 2: Remove the invalid manual pin using Expo's resolver**

```bash
cd mobile
npx expo install expo-intent-launcher --npm
```

Expected: `package.json` and `package-lock.json` are updated together, and `package.json` no longer contains `"expo-intent-launcher": "~4.0.4"`.

- [x] **Step 3: Confirm the manifest no longer points at the broken version**

```bash
cd mobile
grep -n 'expo-intent-launcher' package.json package-lock.json
```

Expected: neither file contains `~4.0.4`, and the lockfile change is limited to the resolved `expo-intent-launcher` package data.

- [x] **Step 4: Re-run the mobile CI commands locally**

```bash
cd mobile
npm ci
npm run typecheck
```

Expected: both commands PASS.

- [x] **Step 5: Commit the mobile fix**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "fix: restore mobile ci dependency install"
```


### Task 2: Repair the backend health e2e test

**Covers:** [S2]

**Files:**
- Modify: `backend/test/app.e2e-spec.ts`
- Reference: `backend/src/modules/health/health.controller.ts`

**Interfaces:**
- Consumes: `HealthController.check()` returning `{ status, service, timestamp }`
- Produces: an e2e test double that satisfies both `getReadiness()` and `getServiceMetadata()`

- [x] **Step 1: Reproduce the health e2e failure**

```bash
cd backend
npx jest --config ./test/jest-e2e.json --runInBand test/app.e2e-spec.ts
```

Expected: FAIL on `/api/health/live (GET)` with HTTP 500 because the mock `HealthService` does not implement `getServiceMetadata()`.

- [x] **Step 2: Update the mock to match the current controller dependency surface**

```ts
const mockHealthService = {
  getReadiness: jest.fn(),
  getServiceMetadata: jest.fn().mockReturnValue({
    name: 'backend',
    version: 'test',
  }),
};
```

Expected: the liveness route can build its response body without throwing.

- [x] **Step 3: Tighten the liveness assertion around the new `service` field**

```ts
.expect((response) => {
  expect(response.body.status).toBe('ok');
  expect(response.body.service).toEqual(
    expect.objectContaining({
      name: expect.any(String),
      version: expect.any(String),
    }),
  );
  expect(typeof response.body.timestamp).toBe('string');
});
```

Expected: the test now protects the current controller contract instead of only checking `status` and `timestamp`.

- [x] **Step 4: Re-run the targeted health e2e file**

```bash
cd backend
npx jest --config ./test/jest-e2e.json --runInBand test/app.e2e-spec.ts
```

Expected: PASS.

- [x] **Step 5: Commit the health test fix**

```bash
git add backend/test/app.e2e-spec.ts
git commit -m "test: align health e2e coverage with controller"
```


### Task 3: Align LXP evaluations e2e coverage with current RBAC and query binding

**Covers:** [S3]

**Files:**
- Modify: `backend/test/lxp-evaluations.e2e-spec.ts`
- Reference: `backend/src/modules/lxp/lxp.controller.ts:311-318`
- Reference: `backend/src/modules/lxp/lxp.service.ts:6188-6196`
- Reference: `backend/src/modules/lxp/lxp.controller.spec.ts:291-303`

**Interfaces:**
- Consumes: `LxpController.listEvaluations(user, query)` and `LxpService.listSystemEvaluations(user, query)`
- Produces: e2e expectations consistent with current admin-only access and Nest's `@Query()` object binding

- [x] **Step 1: Reproduce the current LXP evaluations e2e failures**

```bash
cd backend
npx jest --config ./test/jest-e2e.json --runInBand test/lxp-evaluations.e2e-spec.ts
```

Expected: FAIL because the teacher case currently expects `200`, and the admin case expects `undefined` for the query argument instead of the empty object Nest passes.

- [x] **Step 2: Change the teacher listing test to match the current admin-only route**

```ts
it('rejects teacher role for evaluation listing', async () => {
  await request(app.getHttpServer())
    .get('/api/lxp/evaluations?targetModule=lxp')
    .set('x-test-role', 'teacher')
    .expect(403);

  expect(mockLxpService.listSystemEvaluations).not.toHaveBeenCalled();
});
```

Expected: the test matches `@Roles(RoleName.Admin)` in `lxp.controller.ts` and the admin guard in `lxp.service.ts`.

- [x] **Step 3: Keep the admin success case, but assert the real query payload shape**

```ts
it('allows admin role for evaluation listing', async () => {
  await request(app.getHttpServer())
    .get('/api/lxp/evaluations')
    .set('x-test-role', 'admin')
    .expect(200);

  expect(mockLxpService.listSystemEvaluations).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 'admin-1',
      roles: ['admin'],
    }),
    {},
  );
});
```

Expected: the assertion matches e2e behavior, where `@Query()` binds to `{}` instead of `undefined` when no query string keys are present.

- [x] **Step 4: Preserve the student-denied case and rerun the file**

```bash
cd backend
npx jest --config ./test/jest-e2e.json --runInBand test/lxp-evaluations.e2e-spec.ts
```

Expected: PASS for the admin success case and both teacher/student forbidden cases.

- [x] **Step 5: Commit the LXP e2e alignment**

```bash
git add backend/test/lxp-evaluations.e2e-spec.ts
git commit -m "test: align lxp evaluations e2e expectations"
```


### Task 4: Run CI-equivalent verification before merge

**Covers:** [S4]

**Files:**
- Reference: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: updated mobile manifest/lockfile and backend e2e specs
- Produces: local evidence that the same commands used by GitHub Actions now pass

- [x] **Step 1: Run the backend job commands in the same order as CI**

```bash
cd backend
npm ci
npm run build
npx jest --config ./test/jest-e2e.json --ci
```

Expected: PASS.

- [x] **Step 2: Run the mobile job commands in the same order as CI**

```bash
cd mobile
npm ci
npm run typecheck
```

Expected: PASS.

- [x] **Step 3: Inspect the worktree for accidental scope growth**

```bash
git status --short
```

Expected: only `mobile/package.json`, `mobile/package-lock.json`, `backend/test/app.e2e-spec.ts`, and `backend/test/lxp-evaluations.e2e-spec.ts` are modified.

- [x] **Step 4: Push and watch the real CI run**

```bash
git push
gh run list -L 5
```

Expected: a new `CI` run appears for the branch.

- [x] **Step 5: Confirm the backend and mobile jobs are green**

```bash
gh run view --log-failed
```

Expected: no failed log output for the latest `CI` run.
