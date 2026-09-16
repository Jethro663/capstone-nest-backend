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
          { id: "excused-scored", title: "Excused with score", hps: 20 },
        ],
      },
    ],
    students: [
      {
        studentId: "learner",
        firstName: "Ana",
        lastName: "Cruz",
        eligibility: "eligible",
        accountState: "archived",
        categories: [
          {
            categoryId: "ww",
            scores: [0, null, null, 18],
            scoreStatuses: [
              "recorded",
              "missing",
              "excused",
              "excused_with_score",
            ],
            scoreReasons: [
              null,
              null,
              "Verified exemption",
              "Winner of the Division Science Fair",
            ],
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
        accountState: "archived",
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
  expect(rows.period[0].slice(0, 3)).toEqual([
    "Learner",
    "Eligibility",
    "Account state",
  ]);
  expect(rows.period[1].slice(0, 3)).toEqual([
    "Cruz, Ana",
    "eligible",
    "Archived account",
  ]);
  expect(rows.annual[0].slice(0, 2)).toEqual(["Learner", "Account state"]);
  expect(rows.annual[1].slice(0, 2)).toEqual(["Cruz, Ana", "Archived account"]);
  expect(rows.period[1].slice(3, 7)).toEqual([
    0,
    null,
    "EXCUSED",
    "18 (EXCUSED)",
  ]);
  expect(rows.annual[1].slice(2, 9)).toEqual([
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
    "Archived account",
    "Excused",
    null,
    "excused",
    "Verified exemption",
    null,
    "Written Works",
    20,
    null,
  ]);
  expect(rows.evidence[4]).toEqual([
    "Cruz, Ana",
    "Archived account",
    "Excused with score",
    18,
    "excused_with_score",
    "Winner of the Division Science Fair",
    20,
    "Written Works",
    20,
    null,
  ]);
});
