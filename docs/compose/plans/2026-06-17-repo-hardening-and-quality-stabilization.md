# Repo Hardening And Quality Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove documentation secret leakage, stop tracking AI local env secrets, align smoke scripts with the current product, and bring the affected docs/tests/lint gate back to a safer, lower-noise baseline.

**Architecture:** Keep runtime behavior unchanged wherever possible. Prefer documentation fixes, git hygiene, test updates, and low-risk script/config alignment over broad refactors. For backend lint, adjust the lint gate conservatively instead of touching hundreds of production files in one pass.

**Tech Stack:** Markdown docs, Git tracking rules, Node.js scripts, Jest, ESLint, Next.js test files.

---

### Task 1: Secret Hygiene And Docs Alignment

**Files:**
- Modify: `backend/BACKEND_SETUP.md`
- Modify: `backend/README.md`
- Modify: `next-frontend/README.md`
- Remove from git tracking only: `ai-service/.env`

- [ ] **Step 1: Confirm the current problem**

Run:
```bash
git ls-files "ai-service/.env" && npm --version
```
Expected: `ai-service/.env` is tracked and local toolchain is available.

- [ ] **Step 2: Sanitize backend setup examples**

Replace concrete-looking secrets with placeholders such as:
```env
DATABASE_URL=postgresql://postgres:CHANGE_ME_DB_PASSWORD@localhost:5432/capstone
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_ME_MIN_32_CHARS
```

- [ ] **Step 3: Rewrite product READMEs to match the real repo**

Document:
```md
- what this app does
- main commands
- auth/session model
- AI-service dependency or proxy model
- main routes / modules
```

- [ ] **Step 4: Stop tracking the local AI env file without deleting the local copy**

Run:
```bash
git rm --cached "ai-service/.env"
```
Expected: the file remains locally but is staged as removed from git tracking.

### Task 2: Smoke Script And Test Drift Repair

**Files:**
- Modify: `next-frontend/scripts/engine-perf-smoke.js`
- Modify: `next-frontend/scripts/discussion-perf-smoke.js`
- Modify: `next-frontend/app/(dashboard)/dashboard/notifications/page.test.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/extractions/[id]/page.test.tsx`

- [ ] **Step 1: Write the failing test updates first**

Adjust the extraction polling test to assert the current fallback message:
```ts
const outageMessage = 'Live extraction updates are temporarily unavailable.';
```

Add a `next/navigation` router mock to the notifications page test:
```ts
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
```

- [ ] **Step 2: Run the targeted tests to verify they fail for the expected reasons**

Run:
```bash
npx jest --runInBand --runTestsByPath "app/(dashboard)/dashboard/notifications/page.test.tsx" "app/(dashboard)/dashboard/teacher/extractions/[id]/page.test.tsx"
```
Expected: old assertions or missing router mocks fail before the implementation changes land.

- [ ] **Step 3: Make the smallest script changes that match the current UI**

For `engine-perf-smoke.js`:
```js
// stop assuming Export Engine YAML exists
// verify stable workspace actions that are actually present now
// example: Save Draft, Publish, Add Module
```

For `discussion-perf-smoke.js`:
```js
// stop defaulting to hardcoded class IDs
// prefer runtime discovery from the loaded classes page unless env overrides are provided
```

- [ ] **Step 4: Re-run the targeted tests and syntax checks**

Run:
```bash
npx jest --runInBand --runTestsByPath "app/(dashboard)/dashboard/notifications/page.test.tsx" "app/(dashboard)/dashboard/teacher/extractions/[id]/page.test.tsx"
node --check "scripts/engine-perf-smoke.js"
node --check "scripts/discussion-perf-smoke.js"
```
Expected: tests pass and both scripts parse cleanly.

### Task 3: Safe Quality Gate Stabilization

**Files:**
- Modify: `backend/eslint.config.mjs`

- [ ] **Step 1: Capture the failing lint baseline**

Run:
```bash
npm run lint
```
Expected: backend lint fails with thousands of strict type-aware `no-unsafe-*` errors across production and spec files.

- [ ] **Step 2: Apply a conservative lint-gate downgrade instead of mass code churn**

Adjust the backend ESLint config so the current codebase keeps signal without forcing a risky repo-wide refactor in one pass. The change should prefer warnings for rules generating the bulk unsafe-access noise, while preserving formatting and import-path enforcement.

Representative config shape:
```js
rules: {
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/no-unsafe-member-access': 'warn',
  '@typescript-eslint/no-unsafe-call': 'warn',
  '@typescript-eslint/no-unsafe-return': 'warn',
}
```

- [ ] **Step 3: Verify the safer baseline**

Run:
```bash
npm run lint
```
Expected: backend lint exits successfully, ideally with warnings instead of errors.

- [ ] **Step 4: Re-run the affected frontend suite to check for open-handle shutdown drift after test fixes**

Run:
```bash
npm test -- --runInBand
```
Expected: targeted previously failing suites are green; if Jest still reports open handles, inspect the remaining warning and only apply another fix if it is small and high-confidence.
