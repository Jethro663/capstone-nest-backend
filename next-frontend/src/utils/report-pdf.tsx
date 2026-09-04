"use client";

import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type {
  ClassAverageReport,
  GradeDistributionReport,
  InterventionReportRow,
} from "@/types/class-record";
import type {
  AssessmentSummaryRow,
  ClassEnrollmentRow,
  InterventionParticipationRow,
  ReportQuery,
  ReportTab,
  StudentMasterListRow,
  StudentPerformanceReportRow,
  SystemUsageReport,
} from "@/types/report";
import { boundAcademicPercentage } from "@/lib/academic-score";

type ReportPdfData = {
  classRecord: {
    average: ClassAverageReport | null;
    distribution: GradeDistributionReport | null;
    interventions: InterventionReportRow[];
  };
  studentMasterList: StudentMasterListRow[];
  classEnrollment: ClassEnrollmentRow[];
  studentPerformance: StudentPerformanceReportRow[];
  interventionParticipation: InterventionParticipationRow[];
  assessmentSummary: AssessmentSummaryRow[];
  systemUsage: SystemUsageReport | null;
};

export type ReportPdfInput = {
  tab: ReportTab;
  heading: string;
  scopeLabel: string;
  filters: ReportQuery;
  classLabel?: string | null;
  recordLabel?: string | null;
  generatedAt?: Date;
  data: ReportPdfData;
};

export type ReportPdfDescriptor = {
  title: string;
  scopeLabel: string;
  generatedLabel: string;
  filterRows: Array<[string, string]>;
  summaryRows: Array<[string, string]>;
  columns: string[];
  rows: string[][];
};

const TAB_TITLE: Record<ReportTab, string> = {
  classRecord: "Class Record",
  studentMasterList: "Student Master List",
  classEnrollment: "Class Enrollment",
  studentPerformance: "Student Performance",
  interventionParticipation: "Intervention Participation",
  assessmentSummary: "Assessment Summary",
  systemUsage: "System Usage",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#475569",
  },
  generated: {
    marginTop: 4,
    fontSize: 9,
    color: "#64748b",
  },
  section: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    color: "#0f172a",
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 3,
    borderBottom: "1 solid #f1f5f9",
  },
  kvLabel: {
    color: "#475569",
  },
  kvValue: {
    color: "#0f172a",
    fontWeight: 700,
    textAlign: "right",
  },
  table: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    border: "1 solid #e2e8f0",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
  },
  headerCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    color: "#f8fafc",
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderTop: "1 solid #e2e8f0",
  },
  cell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    color: "#0f172a",
    fontSize: 9,
  },
  empty: {
    padding: 14,
    color: "#64748b",
  },
});

function formatDateValue(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTimeValue(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function asPercent(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "--";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return `${boundAcademicPercentage(numeric).toFixed(1)}%`;
}

function asCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return String(value);
}

function formatInterventionStudent(row: InterventionReportRow) {
  const first = row.student?.firstName?.trim() ?? "";
  const last = row.student?.lastName?.trim() ?? "";
  if (first && last) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return row.student?.email ?? row.studentId;
}

function buildSummaryRows(input: ReportPdfInput): Array<[string, string]> {
  if (input.tab === "classRecord") {
    return [
      ["Class", input.classLabel || "--"],
      ["Record", input.recordLabel || "--"],
      ["Average", asPercent(input.data.classRecord.average?.average ?? null)],
      [
        "Students for intervention",
        asCount(input.data.classRecord.average?.interventionCount ?? null),
      ],
    ];
  }

  if (input.tab === "systemUsage") {
    const usage = input.data.systemUsage;
    return [
      ["Lesson completions", asCount(usage?.lessonCompletions)],
      ["Assessment submissions", asCount(usage?.assessmentSubmissions)],
      ["Intervention opens", asCount(usage?.interventionOpens)],
      ["Intervention closures", asCount(usage?.interventionClosures)],
    ];
  }

  return [["Class", input.classLabel || "--"]];
}

function buildColumns(input: ReportPdfInput): string[] {
  switch (input.tab) {
    case "classRecord":
      return ["Student", "Final Percentage", "Remarks", "Computed At"];
    case "studentMasterList":
      return ["Student", "Email", "LRN", "Class", "Section"];
    case "classEnrollment":
      return ["Class", "Section", "Teacher", "Enrollment"];
    case "studentPerformance":
      return ["Student", "Class", "Current Standing", "At Risk", "Threshold"];
    case "interventionParticipation":
      return ["Student", "Class", "Status", "Completion", "XP"];
    case "assessmentSummary":
      return ["Title", "Class", "Quarter", "Submissions", "Average"];
    case "systemUsage":
      return ["Metric", "Value"];
    default:
      return ["Value"];
  }
}

function buildRows(input: ReportPdfInput): string[][] {
  switch (input.tab) {
    case "classRecord":
      return input.data.classRecord.interventions.map((row) => [
        formatInterventionStudent(row),
        asPercent(row.finalPercentage),
        row.remarks,
        formatDateTimeValue(row.computedAt),
      ]);
    case "studentMasterList":
      return input.data.studentMasterList.map((row) => [
        `${row.lastName}, ${row.firstName}`,
        row.email,
        row.lrn ?? "--",
        row.subjectCode ?? "--",
        row.sectionName ?? "--",
      ]);
    case "classEnrollment":
      return input.data.classEnrollment.map((row) => [
        `${row.subjectName} (${row.subjectCode})`,
        row.section?.name ?? "--",
        row.teacher
          ? `${row.teacher.lastName ?? ""}, ${row.teacher.firstName ?? ""}`.trim()
          : "--",
        asCount(row.enrollmentCount),
      ]);
    case "studentPerformance":
      return input.data.studentPerformance.map((row) => [
        `${row.lastName}, ${row.firstName}`,
        row.subjectCode,
        asPercent(row.blendedScore),
        row.isAtRisk ? "Yes" : "No",
        asPercent(row.thresholdApplied),
      ]);
    case "interventionParticipation":
      return input.data.interventionParticipation.map((row) => [
        row.studentName || row.email || row.studentId,
        row.subjectCode ?? "--",
        row.status,
        `${row.completionRate}%`,
        asCount(row.xpTotal),
      ]);
    case "assessmentSummary":
      return input.data.assessmentSummary.map((row) => [
        row.title,
        row.subjectCode ?? "--",
        row.quarter ?? "--",
        asCount(row.submittedAttempts),
        asPercent(row.averageScore),
      ]);
    case "systemUsage": {
      const usage = input.data.systemUsage;
      const baseRows = [
        ["Lesson completions", asCount(usage?.lessonCompletions)],
        ["Assessment submissions", asCount(usage?.assessmentSubmissions)],
        ["Intervention opens", asCount(usage?.interventionOpens)],
        ["Intervention closures", asCount(usage?.interventionClosures)],
      ];
      const actionRows =
        usage?.topActions.map((row) => [
          `Top action: ${row.action}`,
          asCount(row.total),
        ]) ?? [];
      return [...baseRows, ...actionRows];
    }
    default:
      return [];
  }
}

export function buildReportPdfDescriptor(
  input: ReportPdfInput,
): ReportPdfDescriptor {
  const generatedAt = input.generatedAt ?? new Date();

  return {
    title: `${input.heading} - ${TAB_TITLE[input.tab]}`,
    scopeLabel: input.scopeLabel,
    generatedLabel: `Generated ${generatedAt.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    filterRows: [
      ["Class", input.classLabel || "--"],
      ["Record", input.recordLabel || "--"],
      ["Date from", formatDateValue(input.filters.dateFrom)],
      ["Date to", formatDateValue(input.filters.dateTo)],
    ],
    summaryRows: buildSummaryRows(input),
    columns: buildColumns(input),
    rows: buildRows(input),
  };
}

function ReportPdfDocument({
  descriptor,
}: {
  descriptor: ReportPdfDescriptor;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{descriptor.title}</Text>
        <Text style={styles.subtitle}>{descriptor.scopeLabel}</Text>
        <Text style={styles.generated}>{descriptor.generatedLabel}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filters</Text>
          {descriptor.filterRows.map(([label, value]) => (
            <View key={label} style={styles.kvRow}>
              <Text style={styles.kvLabel}>{label}</Text>
              <Text style={styles.kvValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          {descriptor.summaryRows.map(([label, value]) => (
            <View key={label} style={styles.kvRow}>
              <Text style={styles.kvLabel}>{label}</Text>
              <Text style={styles.kvValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {descriptor.columns.map((column) => (
              <Text key={column} style={styles.headerCell}>
                {column}
              </Text>
            ))}
          </View>
          {descriptor.rows.length === 0 ? (
            <Text style={styles.empty}>No data available</Text>
          ) : (
            descriptor.rows.map((row, rowIndex) => (
              <View key={`${descriptor.title}-${rowIndex}`} style={styles.row}>
                {row.map((cell, cellIndex) => (
                  <Text
                    key={`${descriptor.title}-${rowIndex}-${cellIndex}`}
                    style={styles.cell}
                  >
                    {cell}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      </Page>
    </Document>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadReportPdf(input: ReportPdfInput) {
  const descriptor = buildReportPdfDescriptor(input);
  const blob = await pdf(
    <ReportPdfDocument descriptor={descriptor} />,
  ).toBlob();
  triggerDownload(blob, `${input.tab}-report.pdf`);
}
