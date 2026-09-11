import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { classRecordApi } from "../api/services/class-record";
import { classesApi } from "../api/services/classes";
import { reportsApi } from "../api/services/reports";
import { toAppError } from "../api/http";
import {
  AdminButton,
  AdminChip,
  AdminDataRow,
  AdminEmpty,
  AdminNotice,
  AdminScreen,
  AdminSection,
  adminTheme as theme,
} from "../components/admin/AdminMobilePrimitives";
import type { MainTabParamList } from "../navigation/types";
import type {
  AdminReportKey,
  AdminReportQuery,
  TeacherPaginatedReportResponse,
} from "../types/report";

type Props = BottomTabScreenProps<MainTabParamList, "AdminReports">;
type BackendReportKey = Exclude<AdminReportKey, "class-record">;
type DateField = "from" | "to";

const reportOptions: Array<{ key: AdminReportKey; label: string }> = [
  { key: "class-record", label: "Class Record" },
  { key: "student-master-list", label: "Master List" },
  { key: "class-enrollment", label: "Enrollment" },
  { key: "student-performance", label: "Performance" },
  { key: "intervention-participation", label: "Interventions" },
  { key: "assessment-summary", label: "Assessments" },
  { key: "system-usage", label: "System Usage" },
];

async function reportRequest(
  report: BackendReportKey,
  query: AdminReportQuery,
): Promise<TeacherPaginatedReportResponse<unknown>> {
  if (report === "student-master-list")
    return reportsApi.getStudentMasterList(query);
  if (report === "class-enrollment")
    return reportsApi.getClassEnrollment(query);
  if (report === "student-performance")
    return reportsApi.getStudentPerformance(query);
  if (report === "intervention-participation")
    return reportsApi.getInterventionParticipation(query);
  if (report === "assessment-summary")
    return reportsApi.getAssessmentSummary(query);
  return reportsApi.getSystemUsage(query);
}

function formatDate(value: Date | null) {
  if (!value) return undefined;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rowPresentation(row: Record<string, unknown>) {
  const title =
    [row.lastName, row.firstName].filter(Boolean).join(", ") ||
    String(
      row.title ??
        row.subjectName ??
        row.studentName ??
        row.action ??
        "Report record",
    );
  const subtitle = String(
    row.email ??
      row.subjectCode ??
      row.sectionName ??
      row.status ??
      "Official backend record",
  );
  const metaKeys = [
    "gradeLevel",
    "lrn",
    "schoolYear",
    "enrollmentCount",
    "blendedScore",
    "completionRate",
    "averageScore",
    "total",
  ];
  const meta = metaKeys
    .flatMap((key) =>
      row[key] === undefined || row[key] === null
        ? []
        : [`${humanize(key)}: ${String(row[key])}`],
    )
    .join(" · ");
  return { title, subtitle, meta };
}

function printableRows(value: unknown) {
  const rows = Array.isArray(value)
    ? (value as Array<Record<string, unknown>>)
    : value && typeof value === "object"
      ? [value as Record<string, unknown>]
      : [];
  if (!rows.length)
    return '<p class="empty">No records match these filters.</p>';
  return rows
    .map((row) => {
      const item = rowPresentation(row);
      const details = Object.entries(row)
        .filter(([, field]) =>
          ["string", "number", "boolean"].includes(typeof field),
        )
        .slice(0, 10)
        .map(
          ([key, field]) =>
            `<span><b>${escapeHtml(humanize(key))}:</b> ${escapeHtml(field)}</span>`,
        )
        .join("");
      return `<article><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.subtitle)}</p><div>${details}</div></article>`;
    })
    .join("");
}

function reportHtml(input: {
  title: string;
  filterSummary: string;
  content: unknown;
}) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 32px; } body { color:#231f20; font-family:Arial,sans-serif; }
    header { border-bottom:4px solid #b91c1c; padding-bottom:16px; margin-bottom:20px; }
    h1 { margin:0 0 6px; font-size:24px; } header p,.empty { color:#655f61; }
    article { border:1px solid #ded8da; border-radius:10px; margin:0 0 12px; padding:12px; break-inside:avoid; }
    h2 { font-size:15px; margin:0 0 4px; } article p { color:#655f61; font-size:12px; margin:0 0 8px; }
    article div { display:flex; flex-wrap:wrap; gap:8px 16px; font-size:11px; }
  </style></head><body><header><h1>${escapeHtml(input.title)}</h1><p>${escapeHtml(input.filterSummary)}</p></header>${printableRows(input.content)}</body></html>`;
}

async function shareFile(
  fileUri: string,
  options: { mimeType: string; dialogTitle: string; UTI?: string },
) {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert(
      "Sharing unavailable",
      "This device cannot open a share sheet.",
    );
    return;
  }
  await Sharing.shareAsync(fileUri, options);
}

export function AdminReportsScreen(_props: Props) {
  const [report, setReport] = useState<AdminReportKey>("class-record");
  const [page, setPage] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [datePicker, setDatePicker] = useState<DateField | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const classes = useQuery({
    queryKey: ["admin-report-classes"],
    queryFn: () => classesApi.getPage({ page: 1, limit: 100 }),
  });
  const effectiveClassId = selectedClassId || classes.data?.data[0]?.id || "";
  const selectedClass = classes.data?.data.find(
    (entry) => entry.id === effectiveClassId,
  );

  const records = useQuery({
    queryKey: ["admin-report-class-records", effectiveClassId],
    queryFn: () => classRecordApi.getByClass(effectiveClassId),
    enabled: Boolean(effectiveClassId),
  });
  const effectiveRecordId = selectedRecordId || records.data?.[0]?.id || "";
  const selectedRecord = records.data?.find(
    (entry) => entry.id === effectiveRecordId,
  );

  const classRecordSummary = useQuery({
    queryKey: ["admin-class-record-report", effectiveRecordId],
    queryFn: async () => {
      const [average, distribution, interventions] = await Promise.all([
        classRecordApi.getClassAverageReport(effectiveRecordId),
        classRecordApi.getDistributionReport(effectiveRecordId),
        classRecordApi.getInterventionReport(effectiveRecordId),
      ]);
      return { average, distribution, interventions };
    },
    enabled: report === "class-record" && Boolean(effectiveRecordId),
  });

  const queryInput = useMemo<AdminReportQuery>(
    () => ({
      classId: effectiveClassId || undefined,
      dateFrom: formatDate(dateFrom),
      dateTo: formatDate(dateTo),
      page,
      limit: 25,
    }),
    [dateFrom, dateTo, effectiveClassId, page],
  );
  const reportQuery = useQuery<TeacherPaginatedReportResponse<unknown>>({
    queryKey: ["admin-report", report, queryInput],
    queryFn: () => reportRequest(report as BackendReportKey, queryInput),
    enabled: report !== "class-record",
  });

  const response = reportQuery.data;
  const rows = Array.isArray(response?.data)
    ? (response.data as Array<Record<string, unknown>>)
    : [];
  const summary =
    !Array.isArray(response?.data) && response?.data
      ? (response.data as Record<string, unknown>)
      : null;
  const totalPages = response?.totalPages ?? 1;
  const classLabel = selectedClass
    ? `${selectedClass.subjectName} (${selectedClass.subjectCode}) · ${selectedClass.section?.name ?? "No section"}`
    : "All classes";
  const filterSummary = `${classLabel} · ${selectedRecord ? `${selectedRecord.gradingPeriod} ${selectedRecord.status}` : "All periods"} · ${formatDate(dateFrom) ?? "Any start"} to ${formatDate(dateTo) ?? "Any end"}`;

  const exportCsv = async () => {
    try {
      setExporting("csv");
      const result = await reportsApi.exportCsv(report, queryInput);
      const FileSystem = await import("expo-file-system/legacy");
      const fileUri = `${FileSystem.cacheDirectory}${result.fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, result.csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await shareFile(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Share official audited report",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error) {
      Alert.alert("Export failed", toAppError(error).message);
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    try {
      setExporting("pdf");
      let content: unknown;
      if (report === "class-record") {
        content = [
          {
            title: "Class record summary",
            average: classRecordSummary.data?.average.average ?? "Unavailable",
            studentCount: classRecordSummary.data?.average.count ?? 0,
            interventionCount:
              classRecordSummary.data?.average.interventionCount ?? 0,
          },
          ...Object.entries(
            classRecordSummary.data?.distribution.distribution ?? {},
          ).map(([band, count]) => ({ title: `Grade band ${band}`, count })),
          ...(classRecordSummary.data?.interventions ?? []).map((entry) => ({
            title:
              [entry.student?.lastName, entry.student?.firstName]
                .filter(Boolean)
                .join(", ") ||
              entry.student?.email ||
              entry.studentId,
            finalPercentage: entry.finalPercentage,
            remarks: entry.remarks,
            computedAt: new Date(entry.computedAt).toLocaleString(),
          })),
        ];
      } else {
        const printable = await reportRequest(report, {
          ...queryInput,
          page: 1,
          limit: 200,
        });
        content = printable.data;
      }
      const printed = await Print.printToFileAsync({
        html: reportHtml({
          title: `${reportOptions.find((option) => option.key === report)?.label ?? "Admin"} Report`,
          filterSummary,
          content,
        }),
      });
      await shareFile(printed.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share official audited PDF report",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert("PDF export failed", toAppError(error).message);
    } finally {
      setExporting(null);
    }
  };

  const changeDate = (_event: DateTimePickerEvent, value?: Date) => {
    if (!datePicker || !value) {
      setDatePicker(null);
      return;
    }
    if (datePicker === "from") setDateFrom(value);
    else setDateTo(value);
    setDatePicker(null);
    setPage(1);
  };

  const loading =
    classes.isPending ||
    (records.isPending && Boolean(effectiveClassId)) ||
    (report === "class-record"
      ? classRecordSummary.isPending && Boolean(effectiveRecordId)
      : reportQuery.isPending);
  const activeError =
    classes.error ??
    records.error ??
    (report === "class-record" ? classRecordSummary.error : reportQuery.error);

  return (
    <AdminScreen
      title="Reports"
      subtitle="The same seven evidence views, filters, and exports as the web admin"
      refreshing={reportQuery.isRefetching || classRecordSummary.isRefetching}
      onRefresh={() => {
        void classes.refetch();
        void records.refetch();
        if (report === "class-record") void classRecordSummary.refetch();
        else void reportQuery.refetch();
      }}
    >
      <AdminSection
        title="Report chooser"
        subtitle="Switch views without leaving the governed reporting flow"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        >
          {reportOptions.map((option) => (
            <AdminChip
              key={option.key}
              label={option.label}
              active={report === option.key}
              onPress={() => {
                setReport(option.key);
                setPage(1);
              }}
            />
          ))}
        </ScrollView>
      </AdminSection>

      <AdminSection
        title="Filters and export"
        subtitle="Class and date boundaries apply to the same backend contracts as web"
      >
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.text, fontWeight: "900" }}>Class</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {(classes.data?.data ?? []).map((entry) => (
              <AdminChip
                key={entry.id}
                label={`${entry.subjectCode} · ${entry.section?.name ?? "No section"}`}
                active={effectiveClassId === entry.id}
                onPress={() => {
                  setSelectedClassId(entry.id);
                  setSelectedRecordId("");
                  setPage(1);
                }}
              />
            ))}
          </ScrollView>
          <Text style={{ color: theme.text, fontWeight: "900" }}>
            Class-record period
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(records.data ?? []).map((entry) => (
              <AdminChip
                key={entry.id}
                label={`${entry.gradingPeriod} · ${humanize(entry.status)}`}
                active={effectiveRecordId === entry.id}
                onPress={() => setSelectedRecordId(entry.id)}
              />
            ))}
          </View>
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            From: {dateFrom?.toLocaleDateString() ?? "Any date"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <AdminButton
              label="Choose from date"
              onPress={() => setDatePicker("from")}
            />
            <AdminButton
              label="Clear from"
              disabled={!dateFrom}
              onPress={() => {
                setDateFrom(null);
                setPage(1);
              }}
            />
          </View>
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            To: {dateTo?.toLocaleDateString() ?? "Any date"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <AdminButton
              label="Choose to date"
              onPress={() => setDatePicker("to")}
            />
            <AdminButton
              label="Clear to"
              disabled={!dateTo}
              onPress={() => {
                setDateTo(null);
                setPage(1);
              }}
            />
          </View>
          {datePicker ? (
            <DateTimePicker
              value={
                datePicker === "from"
                  ? (dateFrom ?? new Date())
                  : (dateTo ?? new Date())
              }
              mode="date"
              onChange={changeDate}
            />
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <AdminButton
              label={exporting === "csv" ? "Exporting CSV…" : "Export CSV"}
              icon="download"
              disabled={Boolean(exporting)}
              onPress={() => void exportCsv()}
            />
            <AdminButton
              label={exporting === "pdf" ? "Exporting PDF…" : "Export PDF"}
              icon="file-pdf-box"
              tone="green"
              variant="solid"
              disabled={Boolean(exporting)}
              onPress={() => void exportPdf()}
            />
          </View>
        </View>
      </AdminSection>

      {activeError ? (
        <AdminNotice
          title="Report unavailable"
          description={toAppError(activeError).message}
          tone="red"
        />
      ) : null}
      {loading ? (
        <AdminSection title="Loading report evidence">
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading administrator report"
            style={{ minHeight: 120, justifyContent: "center", gap: 10 }}
          >
            <ActivityIndicator color={theme.primary} />
            <Text style={{ textAlign: "center", color: theme.subtext }}>
              Reading the latest official records…
            </Text>
          </View>
        </AdminSection>
      ) : report === "class-record" ? (
        <>
          <AdminSection title="Class-record summary" subtitle={filterSummary}>
            {classRecordSummary.data ? (
              <>
                <AdminDataRow
                  title="Class average"
                  meta={`${Number(classRecordSummary.data.average.average).toFixed(2)}%`}
                />
                <AdminDataRow
                  title="Students included"
                  meta={String(classRecordSummary.data.average.count)}
                />
                <AdminDataRow
                  title="For intervention"
                  meta={String(
                    classRecordSummary.data.average.interventionCount,
                  )}
                  status={
                    classRecordSummary.data.average.interventionCount > 0
                      ? "Attention"
                      : "Clear"
                  }
                  statusTone={
                    classRecordSummary.data.average.interventionCount > 0
                      ? "red"
                      : "green"
                  }
                />
              </>
            ) : (
              <AdminEmpty
                title="Choose a class-record period"
                subtitle="Select a class with an available grading record."
              />
            )}
          </AdminSection>
          <AdminSection
            title="Grade distribution"
            subtitle="Readable score bands for the selected period"
          >
            {Object.entries(
              classRecordSummary.data?.distribution.distribution ?? {},
            ).map(([band, count]) => (
              <AdminDataRow
                key={band}
                title={`Grade band ${band}`}
                meta={`${count} student${count === 1 ? "" : "s"}`}
              />
            ))}
            {!classRecordSummary.data?.distribution.total ? (
              <AdminEmpty
                title="No finalized distribution"
                subtitle="Distribution bands appear after scores are computed."
              />
            ) : null}
          </AdminSection>
          <AdminSection
            title="Intervention list"
            subtitle="Students below the selected record threshold"
          >
            {(classRecordSummary.data?.interventions ?? []).map((entry) => (
              <AdminDataRow
                key={entry.id}
                title={
                  [entry.student?.lastName, entry.student?.firstName]
                    .filter(Boolean)
                    .join(", ") ||
                  entry.student?.email ||
                  entry.studentId
                }
                subtitle={`${Number(entry.finalPercentage).toFixed(2)}% · ${entry.remarks}`}
                meta={new Date(entry.computedAt).toLocaleString()}
                status="Intervention"
                statusTone="red"
              />
            ))}
            {!classRecordSummary.data?.interventions.length ? (
              <AdminEmpty
                title="No students need intervention"
                subtitle="No intervention rows exist for this record."
              />
            ) : null}
          </AdminSection>
        </>
      ) : (
        <AdminSection
          title={reportOptions.find((option) => option.key === report)?.label}
          subtitle={`${response?.total ?? rows.length} records · generated ${response?.generatedAt ? new Date(response.generatedAt).toLocaleString() : "on request"}`}
        >
          {rows.map((row, index) => {
            const item = rowPresentation(row);
            return (
              <AdminDataRow
                key={String(
                  row.id ??
                    row.enrollmentId ??
                    row.caseId ??
                    `${page}-${index}`,
                )}
                title={item.title}
                subtitle={item.subtitle}
                meta={item.meta}
                status={
                  row.isAtRisk === true
                    ? "At risk"
                    : row.isPublished === false
                      ? "Draft"
                      : undefined
                }
                statusTone={row.isAtRisk === true ? "red" : "neutral"}
              />
            );
          })}
          {summary ? (
            <View style={{ padding: 16, gap: 8 }}>
              {Object.entries(summary)
                .filter(([, value]) => typeof value !== "object")
                .map(([key, value]) => (
                  <Text key={key} style={{ color: theme.text, fontSize: 13 }}>
                    <Text style={{ fontWeight: "900" }}>{humanize(key)}: </Text>
                    {String(value)}
                  </Text>
                ))}
              {Array.isArray(summary.topActions)
                ? summary.topActions.map((entry, index) => {
                    const value = entry as { action?: string; total?: number };
                    return (
                      <AdminDataRow
                        key={`${value.action}-${index}`}
                        title={value.action ?? "Action"}
                        meta={String(value.total ?? 0)}
                      />
                    );
                  })
                : null}
            </View>
          ) : null}
          {!rows.length && !summary ? (
            <AdminEmpty
              title="No report rows"
              subtitle="No records match this report page."
            />
          ) : null}
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <AdminButton
              label="Previous"
              disabled={page <= 1}
              onPress={() => setPage((value) => Math.max(1, value - 1))}
            />
            <Text style={{ color: theme.subtext }}>
              Page {page} of {totalPages}
            </Text>
            <AdminButton
              label="Next"
              disabled={page >= totalPages}
              onPress={() => setPage((value) => value + 1)}
            />
          </View>
        </AdminSection>
      )}
    </AdminScreen>
  );
}
