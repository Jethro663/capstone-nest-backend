# Remove Student Theme Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the legacy theme changer from every production dashboard top bar.

**Architecture:** The visible control is owned by the student branch of the shared `TopBar`; the theme provider remains intact for stored-theme and internal diagnostic compatibility. A focused component regression test will prevent the control from being reintroduced for any dashboard role.

**Tech Stack:** Next.js 16, React 19, TypeScript, Jest, Testing Library

## Global Constraints

- Do not delete or modify `ThemeProvider`, stored-theme behavior, theme definitions, or `/dashboard/theme-test`.
- Keep the APK download, system information, notifications, profile actions, and all teacher/admin top-bar behavior unchanged.
- Work directly on `developement` and push normally to `origin/developement` after verification.

---

### Task 1: Remove the legacy top-bar control

**Files:**
- Modify: `next-frontend/src/components/layout/TopBar.test.tsx`
- Modify: `next-frontend/src/components/layout/TopBar.tsx:25,217`
- Test: `next-frontend/src/components/layout/TopBar.test.tsx`

**Interfaces:**
- Consumes: `TopBar({ onMenuToggle, shellRole })`
- Produces: dashboard top bars with no accessible control named `Select theme`

- [x] **Step 1: Write the failing regression test**

Replace the existing positive theme-selector test with:

```tsx
it.each(['student', 'teacher', 'admin'] as const)(
  'does not expose the legacy theme selector in the %s shell',
  (shellRole) => {
    render(<TopBar onMenuToggle={jest.fn()} shellRole={shellRole} />);

    expect(
      screen.queryByRole('button', { name: 'Select theme' }),
    ).not.toBeInTheDocument();
  },
);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd next-frontend
npm test -- --runInBand --runTestsByPath src/components/layout/TopBar.test.tsx
```

Expected: the student case fails because `StudentThemeSwitcher` still renders the mocked `Select theme` button.

- [x] **Step 3: Remove the production control**

Delete this import from `TopBar.tsx`:

```tsx
import { StudentThemeSwitcher } from './StudentThemeSwitcher';
```

Delete this element from the student action group:

```tsx
<StudentThemeSwitcher />
```

- [x] **Step 4: Run focused and frontend verification**

Run:

```bash
cd next-frontend
npm test -- --runInBand --runTestsByPath src/components/layout/TopBar.test.tsx
npm run lint
npm run build
```

Expected: the focused suite, lint, and production build all exit successfully.

- [x] **Step 5: Commit and push**

```bash
git add docs/superpowers/plans/2026-08-29-remove-student-theme-switcher.md \
  next-frontend/src/components/layout/TopBar.test.tsx \
  next-frontend/src/components/layout/TopBar.tsx
git commit -m "fix: remove legacy student theme switcher"
git push origin developement
```
