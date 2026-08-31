import type { SpreadsheetData } from "../types/class-record";
import type { AnnualSummary } from "../types/academic-grading";

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

export async function exportAcademicCsv(
  spreadsheet: SpreadsheetData,
  annual: AnnualSummary,
) {
  const rows = academicExportRows(spreadsheet, annual);
  const escape = (value: Cell) => {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text))
      text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const csv = Object.entries(rows)
    .map(([name, values]) =>
      [[name], ...values].map((row) => row.map(escape).join(",")).join("\r\n"),
    )
    .join("\r\n\r\n");
  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!base) throw new Error("Local export storage is unavailable");
  const file = `${base}academic-record-${spreadsheet.classRecord.id}.csv`;
  await FileSystem.writeAsStringAsync(file, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(file, {
      mimeType: "text/csv",
      dialogTitle: "Academic workbook and annual evidence",
    });
  else {
    const { openLocalFile } = await import("../api/services/protected-files");
    await openLocalFile(file);
  }
}
