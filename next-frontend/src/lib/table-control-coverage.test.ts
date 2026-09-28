import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const COVERAGE_CASES = [
  [
    "admin section roster",
    "app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx",
    "Search section roster",
    "Filter roster by grade",
  ],
  [
    "admin section edit roster",
    "app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx",
    "Search section roster",
    "Filter roster by grade",
  ],
  [
    "teacher section roster",
    "app/(dashboard)/dashboard/teacher/sections/[id]/roster/page.tsx",
    "Search section roster",
    "Filter roster by grade",
  ],
  [
    "assessment history",
    "app/(dashboard)/dashboard/teacher/classes/[id]/students/[studentId]/_components/assessment-history-worklist.tsx",
    "Search assessment history",
    "Assessment history views",
  ],
  [
    "assessment overview",
    "src/components/teacher/assessment/assessment-overview.tsx",
    "Search assessment roster",
    "Filter assessment roster",
  ],
  [
    "score release",
    "src/components/teacher/assessment/post-scores-tab.tsx",
    "Search score roster",
    "Score release filters",
  ],
  [
    "system evaluations",
    "src/components/evaluations/system-evaluations-page.tsx",
    "Search evaluation responses",
    "Filter evaluations by module",
  ],
  [
    "roster import",
    "app/(dashboard)/dashboard/admin/roster-import/page.tsx",
    "Search import rows",
    "Filter import rows",
  ],
  [
    "teacher performance",
    "app/(dashboard)/dashboard/teacher/performance/page.tsx",
    "Search performance records",
    "Filter performance records",
  ],
  [
    "academic back subjects",
    "src/components/admin/AcademicBackSubjectsPanel.tsx",
    "Search back subjects",
    "Filter back subjects",
  ],
  [
    "admin reports",
    "src/components/reports/class-record-reports-page.tsx",
    "Search ${title}",
    "Filters & Export Controls",
  ],
  [
    "teacher reports",
    "src/components/teacher/TeacherReportsFigmaPage.tsx",
    "Search teacher report rows",
    "Filters",
  ],
  [
    "teacher interventions",
    "app/(dashboard)/dashboard/teacher/interventions/page.tsx",
    "Search intervention records",
    "Filter interventions by class",
  ],
  [
    "teacher class roster",
    "app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx",
    "Search students by name, LRN, or email",
    "Filter students by grade availability",
  ],
  [
    "student classmates",
    "app/(dashboard)/dashboard/student/classes/[id]/page.tsx",
    "Search classmates",
    "Filter classmates",
  ],
  [
    "student gradebook",
    "app/(dashboard)/dashboard/student/classes/[id]/page.tsx",
    "Search gradebook records",
    "Filter gradebook records",
  ],
] as const;

const THEMED_FILTER_CASES = [
  [
    "app/(dashboard)/dashboard/admin/roster-import/page.tsx",
    ["Filter import rows", "Filter import history"],
  ],
  [
    "app/(dashboard)/dashboard/admin/sections/[id]/edit/page.tsx",
    ["Filter roster by grade"],
  ],
  [
    "app/(dashboard)/dashboard/admin/sections/[id]/roster/page.tsx",
    ["Filter roster by grade"],
  ],
  [
    "app/(dashboard)/dashboard/student/classes/[id]/page.tsx",
    ["Filter classmates", "Filter gradebook records"],
  ],
  [
    "app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx",
    ["Filter students by grade availability"],
  ],
  [
    "app/(dashboard)/dashboard/teacher/performance/page.tsx",
    [
      "Assessment focus",
      "Filter performance records",
      "Filter concept records",
      "Filter recent changes",
    ],
  ],
  [
    "app/(dashboard)/dashboard/teacher/sections/[id]/roster/page.tsx",
    ["Filter roster by grade"],
  ],
  [
    "src/components/admin/AcademicBackSubjectsPanel.tsx",
    ["Filter back subjects"],
  ],
  [
    "src/components/teacher/assessment/assessment-overview.tsx",
    ["Filter assessment roster"],
  ],
] as const;

describe("page-level table controls", () => {
  it.each(COVERAGE_CASES)(
    "%s has paired search and filter controls",
    (_label, path, searchLabel, filterLabel) => {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");

      expect(source).toContain(searchLabel);
      expect(source).toContain(filterLabel);
    },
  );

  it.each(THEMED_FILTER_CASES)(
    "%s uses themed controls for the filters added by the table audit",
    (path, filterLabels) => {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      const missingThemedFilters = filterLabels.filter(
        (filterLabel) =>
          !new RegExp(
            `<TableFilterSelect\\s+ariaLabel=["']${filterLabel}["']`,
          ).test(source),
      );

      expect(missingThemedFilters).toEqual([]);
    },
  );
});
