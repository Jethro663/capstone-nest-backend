import { academicExportRows } from "./academic-workbook-export";
import type { SpreadsheetData } from "@/types/class-record";
import type { AnnualSummary } from "@/types/academic-grading";

jest.mock("./download-xlsx-buffer", () => ({ downloadXlsxBuffer: jest.fn() }));
it("exports explicit zero, missing and excused evidence separately without inventing an annual grade", () => {
  const policy = {
    id: "deped-2026-v1",
    schoolYear: "2026-2027",
    gradeMethod: "adjusted_2026",
    passingGrade: 75,
    annualRounding: "half_up",
    examComponents: [],
    periods: [
      { key: "Q1", label: "Term 1" },
      { key: "Q2", label: "Term 2" },
      { key: "Q3", label: "Term 3" },
    ],
  };
  const sheet = {
    classRecord: { id: "record", status: "draft", revision: 2 },
    policy,
    header: { quarter: "Q1", periodLabel: "Term 1" },
    categories: [
      {
        id: "ww",
        name: "Written Works",
        weight: 20,
        items: [
          { id: "zero", title: "Zero" },
          { id: "missing", title: "Missing" },
          { id: "excused", title: "Excused" },
        ],
      },
    ],
    students: [
      {
        studentId: "learner",
        firstName: "Ana",
        lastName: "Cruz",
        eligibility: "eligible",
        categories: [
          {
            categoryId: "ww",
            scores: [0, null, null],
            scoreStatuses: ["recorded", "missing", "excused"],
            scoreReasons: [null, null, "Verified exemption"],
            total: null,
            ps: null,
            ws: null,
          },
        ],
        initialGrade: null,
        quarterlyGrade: null,
        remarks: "Incomplete",
        provisional: true,
      },
    ],
  } as unknown as SpreadsheetData;
  const annual = {
    classId: "class",
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
            sourceId: "revision-1",
            classId: "class",
          },
        ],
        blockers: [{ message: "Term 2 is missing" }],
        current: null,
        remediation: [],
      },
    ],
  } as unknown as AnnualSummary;
  const rows = academicExportRows(sheet, annual);
  expect(rows.period[1].slice(2, 5)).toEqual([0, null, "EXCUSED"]);
  expect(rows.annual[1].slice(1, 8)).toEqual([
    75,
    null,
    null,
    null,
    3,
    null,
    null,
  ]);
  expect(rows.annual[1]).toContain("period_revision:revision-1");
  expect(rows.evidence[3]).toEqual([
    "Cruz, Ana",
    "Excused",
    null,
    "excused",
    "Verified exemption",
    null,
    "Written Works",
    20,
    null,
  ]);
});
