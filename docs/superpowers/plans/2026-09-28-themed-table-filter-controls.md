# Themed Table Filter Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fourteen native table-filter dropdowns from the September 28 table-control hotfix with one accessible, role-aware Nexora filter control and release the verified web change.

**Architecture:** Add a presentation-only `TableFilterSelect` around the existing Radix select primitives, while leaving every page as the owner of its filter state and domain logic. Extend the base trigger with an admin variant, keep route-local layout classes at each call site, and use source coverage to prevent native table filters from returning.

**Tech Stack:** Next.js 16, React 19, TypeScript, Radix Select, Tailwind 4, Jest, Testing Library, GitHub Actions, Railway.

## Global Constraints

- Stay in the current `developement` checkout and create no worktree.
- Preserve `docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` as user-owned unrelated work.
- Change only the fourteen table filters listed in the approved design; leave form, mutation, class-selection, extraction, destination, source, school-year, and grading-period selects unchanged.
- Preserve filter values, search pairing, result calculations, APIs, permissions, routes, tabs, empty states, and academic procedures.
- Use existing role tokens, add no dependency, touch no mobile source, and skip APK packaging.

---

### Task 1: Build the role-aware primitive with TDD

**Files:**
- Create: `next-frontend/src/components/ui/table-filter-select.test.tsx`
- Create: `next-frontend/src/components/ui/table-filter-select.tsx`
- Modify: `next-frontend/src/components/ui/select.tsx:12-34`
- Modify: `next-frontend/app/globals.css`

**Interfaces:**
- Consumes: the existing `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, and `SelectValue` exports.
- Produces: `TableFilterOption`, `TableFilterRole`, and `TableFilterSelect({ ariaLabel, value, onValueChange, options, role, className?, disabled? })`.

- [x] **Step 1: Write the failing component tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { TableFilterSelect } from './table-filter-select';

const options = [
  { value: 'all', label: 'All classmates' },
  { value: 'with_photo', label: 'With profile photo' },
];

it.each(['student', 'teacher', 'admin'] as const)(
  'renders a themed %s trigger',
  (role) => {
    render(
      <TableFilterSelect
        ariaLabel="Filter classmates"
        value="all"
        onValueChange={jest.fn()}
        options={options}
        role={role}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Filter classmates' });
    expect(trigger).toHaveAttribute('data-filter-role', role);
    expect(trigger).toHaveClass('table-filter-select');
    expect(screen.getByTestId('table-filter-icon')).toBeInTheDocument();
  },
);

it('reports option selection and forwards disabled state', () => {
  const onValueChange = jest.fn();
  const { rerender } = render(
    <TableFilterSelect
      ariaLabel="Filter classmates"
      value="all"
      onValueChange={onValueChange}
      options={options}
      role="student"
    />,
  );
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter classmates' }));
  fireEvent.click(screen.getByRole('option', { name: 'With profile photo' }));
  expect(onValueChange).toHaveBeenCalledWith('with_photo');
  rerender(
    <TableFilterSelect
      ariaLabel="Filter classmates"
      value="all"
      onValueChange={onValueChange}
      options={options}
      role="student"
      disabled
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Filter classmates' })).toBeDisabled();
});
```

- [x] **Step 2: Run the test and verify RED**

```bash
cd next-frontend && npm test -- --runInBand src/components/ui/table-filter-select.test.tsx
```

Expected: FAIL because `./table-filter-select` does not exist.

- [x] **Step 3: Implement the typed component**

```tsx
'use client';

import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type TableFilterRole = 'student' | 'teacher' | 'admin';
export interface TableFilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}
interface TableFilterSelectProps {
  ariaLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly TableFilterOption[];
  role: TableFilterRole;
  className?: string;
  disabled?: boolean;
}

export function TableFilterSelect({
  ariaLabel,
  value,
  onValueChange,
  options,
  role,
  className,
  disabled,
}: TableFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        variant={role}
        data-filter-role={role}
        className={cn('table-filter-select', className)}
      >
        <span className="table-filter-select__value">
          <Filter data-testid="table-filter-icon" aria-hidden="true" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent
        className={cn(
          'table-filter-select__content',
          `table-filter-select__content--${role}`,
        )}
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

Extend `SelectTrigger`'s variant union with `admin` and map it to `admin-input`. Add shared geometry, icon, truncation, role border/background/focus, portal-content, selected-item, disabled, and narrow-width CSS using current tokens.

- [x] **Step 4: Run the component test and verify GREEN**

Run the same focused Jest command. Expected: all tests pass without console errors.

- [x] **Step 5: Commit the primitive**

```bash
git add next-frontend/src/components/ui/table-filter-select.tsx next-frontend/src/components/ui/table-filter-select.test.tsx next-frontend/src/components/ui/select.tsx next-frontend/app/globals.css
git commit -m "feat: add themed table filter select"
```

### Task 2: Lock the fourteen call sites with RED coverage

**Files:**
- Modify: `next-frontend/src/lib/table-control-coverage.test.ts`

**Interfaces:**
- Consumes: the test file's existing source-reading helper.
- Produces: a regression requiring `TableFilterSelect` at every approved label.

- [x] **Step 1: Add the failing source-coverage matrix**

```ts
const THEMED_FILTERS = [
  ['app/(dashboard)/dashboard/admin/roster-import/page.tsx', ['Filter import rows', 'Filter import history']],
  ['app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx', ['Filter roster by grade']],
  ['app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx', ['Filter roster by grade']],
  ['app/(dashboard)/dashboard/student/classes/[id]/page.tsx', ['Filter classmates', 'Filter gradebook records']],
  ['app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx', ['Filter students by grade availability']],
  ['app/(dashboard)/dashboard/teacher/performance/page.tsx', ['Assessment focus', 'Filter performance records', 'Filter concept records', 'Filter recent changes']],
  ['app/(dashboard)/dashboard/teacher/sections/[id]/roster/page.tsx', ['Filter roster by grade']],
  ['src/components/admin/AcademicBackSubjectsPanel.tsx', ['Filter back subjects']],
  ['src/components/teacher/assessment/assessment-overview.tsx', ['Filter assessment roster']],
] as const;

it('uses the shared themed control for every filter added by the table audit', () => {
  for (const [path, labels] of THEMED_FILTERS) {
    const contents = source(path);
    for (const label of labels) {
      expect(contents).toMatch(
        new RegExp(`<TableFilterSelect[\\s\\S]*?ariaLabel=["']${label}["']`),
      );
    }
  }
});
```

- [x] **Step 2: Run coverage and verify RED**

```bash
cd next-frontend && npm test -- --runInBand src/lib/table-control-coverage.test.ts
```

Expected: FAIL because the owners still render native selects.

### Task 3: Convert admin and student filters

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/roster-import/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/student/classes/[id]/page.tsx`
- Modify: `next-frontend/src/components/admin/AcademicBackSubjectsPanel.tsx`

**Interfaces:**
- Consumes: `TableFilterSelect` and existing state setters.
- Produces: five admin and two student themed controls with unchanged option values.

- [x] **Step 1: Replace only the approved filters**

Use this classmates conversion shape and equivalent inline option arrays:

```tsx
<TableFilterSelect
  ariaLabel="Filter classmates"
  value={classmateFilter}
  onValueChange={(value) =>
    setClassmateFilter(value as 'all' | 'with_photo' | 'without_photo')
  }
  options={[
    { value: 'all', label: 'All classmates' },
    { value: 'with_photo', label: 'With profile photo' },
    { value: 'without_photo', label: 'Without profile photo' },
  ]}
  role="student"
  className="w-full sm:w-[15rem]"
/>
```

Use `role="admin"` for admin routes and retain layout widths. Do not convert target/destination section, support year, or support period selectors.

- [x] **Step 2: Run coverage and affected page tests**

```bash
cd next-frontend && npm test -- --runInBand src/lib/table-control-coverage.test.ts app/\(dashboard\)/dashboard/admin/sections/\[id\]/roster/page.test.tsx
```

Expected: admin page tests pass; coverage fails only for remaining teacher owners.

- [x] **Step 3: Commit admin/student conversion**

```bash
git add next-frontend/app/\(dashboard\)/dashboard/admin next-frontend/app/\(dashboard\)/dashboard/student/classes/\[id\]/page.tsx next-frontend/src/components/admin/AcademicBackSubjectsPanel.tsx
git commit -m "refactor: theme admin and student table filters"
```

### Task 4: Convert teacher filters and make coverage GREEN

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/sections/[id]/roster/page.tsx`
- Modify: `next-frontend/src/components/teacher/assessment/assessment-overview.tsx`
- Modify: `next-frontend/src/lib/table-control-coverage.test.ts`

**Interfaces:**
- Consumes: `TableFilterSelect` and current teacher state setters.
- Produces: seven teacher controls and a green fourteen-control regression.

- [ ] **Step 1: Replace the seven approved teacher filters**

Use `role="teacher"`, preserve every option value/label and width class, and leave class, extraction, and lesson-source selectors unchanged.

- [ ] **Step 2: Run focused tests and verify GREEN**

```bash
cd next-frontend && npm test -- --runInBand src/components/ui/table-filter-select.test.tsx src/lib/table-control-coverage.test.ts
```

Expected: both suites pass and cover all fourteen controls.

- [ ] **Step 3: Commit the teacher conversion**

```bash
git add next-frontend/app/\(dashboard\)/dashboard/teacher next-frontend/src/components/teacher/assessment/assessment-overview.tsx next-frontend/src/lib/table-control-coverage.test.ts
git commit -m "refactor: theme teacher table filters"
```

### Task 5: Verify, ship, and observe

**Files:**
- Review everything changed since design commit `1d4ffb2f`.
- Do not modify backend or mobile files unless a separately proven release blocker requires a narrowly scoped repair.

**Interfaces:**
- Consumes: final implementation and established release workflows.
- Produces: a pushed exact SHA with CI, Railway, and live-bundle evidence.

- [ ] **Step 1: Run focused and static checks**

```bash
cd next-frontend
npm test -- --runInBand src/components/ui/table-filter-select.test.tsx src/lib/table-control-coverage.test.ts
npm run audit:student-palette
npm run lint
npm run typecheck
```

- [ ] **Step 2: Run complete frontend verification**

```bash
cd next-frontend
npm test -- --runInBand
npm run build
```

Expected: zero test/type/palette failures, lint within the repository warning ceiling, and a successful production build.

- [ ] **Step 3: Verify browser behavior**

Inspect at least one student, teacher, and admin filter at desktop and narrow widths. Confirm open/select/focus behavior and unchanged filtered results. If authenticated roles are unavailable, record that boundary and do not claim authenticated production visuals.

- [ ] **Step 4: Review scope and outgoing history**

```bash
git diff --check
git status --short --branch
git log --oneline origin/developement..HEAD
git rev-list --left-right --count origin/developement...HEAD
```

Confirm the user-owned analysis file remains unstaged and review every outgoing commit.

- [ ] **Step 5: Push and observe exact revision**

Push `developement`, discover CI with `gh run list --commit <sha>`, wait for terminal success, correlate the Railway workflow to that tested SHA, confirm the frontend deployment is successful, and verify the live JavaScript bundle contains the final SHA.

- [ ] **Step 6: Complete the goal after the evidence audit**

Verify every design acceptance check against source, tests, browser/runtime evidence, CI, deployment, and live bundle. Mark the goal complete only when all required outcomes are proven.
