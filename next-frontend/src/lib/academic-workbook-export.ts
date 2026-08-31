import type { SpreadsheetData } from "@/types/class-record";
import type { AnnualSummary } from "@/types/academic-grading";
import { downloadXlsxBuffer } from "./download-xlsx-buffer";

type Cell = string | number | null;
export function academicExportRows(
  spreadsheet: SpreadsheetData,
  annual: AnnualSummary,
) {
  const periodHeaders: Cell[] = ["Learner", "Eligibility"];
  for (const category of spreadsheet.categories) {
    periodHeaders.push(
      ...category.items.map((item) => `${category.name}: ${item.title}`),
      `${category.name}: total`,
      `${category.name}: PS`,
      `${category.name}: WS`,
    );
  }
  periodHeaders.push(
    "Initial grade",
    `${spreadsheet.header.periodLabel ?? spreadsheet.header.quarter} grade`,
    "Status",
    "Record revision",
  );
  const period: Cell[][] = [
    periodHeaders,
    ...spreadsheet.students.map((student) => {
      const cells: Cell[] = [
        `${student.lastName}, ${student.firstName}`,
        student.eligibility ?? "Unconfirmed",
      ];
      for (const category of spreadsheet.categories) {
        const result = student.categories.find(
          (c) => c.categoryId === category.id,
        );
        category.items.forEach((_, index) =>
          cells.push(
            result?.scoreStatuses?.[index] === "excused"
              ? "EXCUSED"
              : (result?.scores[index] ?? null),
          ),
        );
        cells.push(
          result?.total ?? null,
          result?.ps ?? null,
          result?.ws ?? null,
        );
      }
      cells.push(
        student.initialGrade,
        student.quarterlyGrade,
        `${student.gradeProvenance === "legacy_unverified" ? "Legacy unverified: " : student.provisional ? "Provisional: " : ""}${student.remarks ?? "Incomplete"}`,
        spreadsheet.classRecord.revision ?? 0,
      );
      return cells;
    }),
  ];
  const annualRows: Cell[][] = [
    [
      "Learner",
      ...annual.periods.map((p) => p.label),
      "Sum",
      "Required divisor",
      "Raw annual average",
      "Official annual grade",
      "Status",
      "SRC mark",
      "Recomputed final grade",
      "SRC reference",
      ...annual.periods.map((p) => `${p.label} source revision`),
    ],
    ...annual.students.map((student) => {
      const current = student.current;
      const src = student.remediation.find(
        (r) => r.isCurrent && r.annualGradeId === current?.id,
      );
      return [
        `${student.lastName ?? ""}, ${student.firstName ?? ""}`,
        ...annual.periods.map(
          (p) =>
            student.components.find((c) => c.period === p.key)?.grade ?? null,
        ),
        current?.sum ?? null,
        annual.periods.length,
        current ? Number(current.rawAverage) : null,
        current?.officialGrade ?? null,
        current?.remarks ??
          (student.blockers.map((b) => b.message).join("; ") || "Incomplete"),
        src?.remedialClassMark ?? null,
        src?.recomputedGrade ?? null,
        src?.sourceReference ?? null,
        ...annual.periods.map((p) => {
          const c = student.components.find((c) => c.period === p.key);
          return c ? `${c.sourceType}:${c.sourceId}` : null;
        }),
      ] as Cell[];
    }),
  ];
  const evidence: Cell[][] = [
    [
      "Learner",
      "Item",
      "Score",
      "Status",
      "Reason",
      "Highest possible score",
      "Category",
      "Category weight",
      "Examination component",
    ],
  ];
  for (const student of spreadsheet.students)
    for (const category of spreadsheet.categories) {
      const result = student.categories.find(
        (c) => c.categoryId === category.id,
      );
      category.items.forEach((item, index) =>
        evidence.push([
          `${student.lastName}, ${student.firstName}`,
          item.title,
          result?.scores[index] ?? null,
          result?.scoreStatuses?.[index] ?? "missing",
          result?.scoreReasons?.[index] ?? null,
          item.hps ?? null,
          category.name,
          category.weight,
          item.examComponent ?? null,
        ]),
      );
    }
  const policy: Cell[][] = [
    ["Field", "Value"],
    ["School year", annual.schoolYear],
    ["Subject", annual.subjectCode],
    ["Policy", annual.policy.id],
    ["Grade method", annual.policy.gradeMethod],
    ["Required periods", annual.periods.map((p) => p.label).join(", ")],
    ["Passing grade", annual.policy.passingGrade],
    ["Annual rounding", annual.policy.annualRounding],
    ["Record ID", spreadsheet.classRecord.id],
    ["Record status", spreadsheet.classRecord.status],
    ["Record revision", spreadsheet.classRecord.revision ?? 0],
    [
      "Roster confirmed",
      spreadsheet.classRecord.rosterConfirmedAt ?? "Unconfirmed",
    ],
    ...annual.policy.examComponents.map(
      (c) => [`Examination ${c.key}`, `${c.weight}%`] as Cell[],
    ),
  ];
  return { period, annual: annualRows, evidence, policy };
}

export async function exportAcademicWorkbook(
  spreadsheet: SpreadsheetData,
  annual: AnnualSummary,
) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nexora";
  const rows = academicExportRows(spreadsheet, annual);
  for (const [key, title] of [
    ["period", spreadsheet.header.periodLabel ?? spreadsheet.header.quarter],
    ["annual", "Annual Summary"],
    ["evidence", "Score Evidence"],
    ["policy", "Policy and Revision"],
  ] as const) {
    const sheet = workbook.addWorksheet(title, {
      views: [{ state: "frozen", ySplit: 1, xSplit: key === "period" ? 2 : 1 }],
    });
    sheet.addRows(rows[key]);
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF142B4F" },
    };
    sheet.getRow(1).alignment = { wrapText: true, vertical: "middle" };
    sheet.getRow(1).height = 42;
    sheet.columns.forEach((column, index) => {
      column.width =
        index === 0 ? 30 : key === "policy" || key === "evidence" ? 34 : 18;
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: sheet.columnCount },
    };
    sheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
  }
  downloadXlsxBuffer(
    await workbook.xlsx.writeBuffer(),
    `academic-record-${annual.subjectCode}-${annual.schoolYear}-${spreadsheet.header.quarter}.xlsx`,
  );
}
