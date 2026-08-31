import { academicExportRows } from "../academic-workbook-export";
import type { SpreadsheetData } from "../../types/class-record";
import type { AnnualSummary } from "../../types/academic-grading";
it("keeps zero, missing and excused separate and exports policy denominator and annual provenance", () => {
  const policy = {
    id: "policy-2026",
    annualRounding: "half_up",
    passingGrade: 75,
    gradeMethod: "adjusted_2026",
    examComponents: [],
    periods: [
      { key: "Q1", label: "Term 1" },
      { key: "Q2", label: "Term 2" },
      { key: "Q3", label: "Term 3" },
    ],
  };
  const workbook = {
    classRecord: { id: "record", status: "draft", revision: 0 },
    policy,
    header: { quarter: "Q1", periodLabel: "Term 1" },
    categories: [
      {
        id: "ww",
        name: "Written Works",
        weight: 20,
        items: [
          { id: "a", title: "A", hps: 20 },
          { id: "b", title: "B", hps: 10 },
          { id: "c", title: "C", hps: 5 },
        ],
      },
    ],
    students: [
      {
        studentId: "learner",
        firstName: "Ana",
        lastName: "Cruz",
        eligibility: "eligible",
        initialGrade: null,
        quarterlyGrade: null,
        provisional: true,
        remarks: "Incomplete",
        categories: [
          {
            categoryId: "ww",
            scores: [0, null, null],
            scoreStatuses: ["recorded", "missing", "excused"],
            scoreReasons: [null, null, "Verified reason"],
            total: null,
            ps: null,
            ws: null,
          },
        ],
      },
    ],
  } as unknown as SpreadsheetData;
  const annual = {
    schoolYear: "2026-2027",
    subjectCode: "MATH-8",
    policy,
    periods: policy.periods,
    students: [
      {
        studentId: "learner",
        firstName: "Ana",
        lastName: "Cruz",
        components: [
          {
            period: "Q1",
            grade: 75,
            sourceType: "period_revision",
            sourceId: "rev-1",
          },
        ],
        current: null,
        remediation: [],
        blockers: [{ message: "Term 2 missing" }],
      },
    ],
  } as unknown as AnnualSummary;
  const rows = academicExportRows(workbook, annual);
  expect(rows.period[1].slice(2, 5)).toEqual([0, null, "EXCUSED"]);
  expect(rows.evidence[3]).toEqual([
    "Cruz, Ana",
    "C",
    null,
    "excused",
    "Verified reason",
    5,
    "Written Works",
    20,
    null,
  ]);
  expect(rows.annual[1].slice(1, 8)).toEqual([
    75,
    null,
    null,
    null,
    3,
    null,
    null,
  ]);
  expect(rows.annual[1]).toContain("period_revision:rev-1");
});
