import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { toAppError } from "../api/http";
import { reportsApi } from "../api/services/reports";
import {
  useTeacherClasses,
  useTeacherReportAssessmentSummary,
  useTeacherReportClassEnrollment,
  useTeacherReportInterventionParticipation,
  useTeacherReportStudentPerformance,
  useTeacherReportSystemUsage,
} from "../api/hooks";
import type { TeacherPaginatedReportResponse, TeacherReportQuery } from "../types/report";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherSelectMenu,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherFlatSection,
  TeacherSegmentedTabs,
  TeacherSummaryStrip,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = TeacherDrawerScreenProps<"TeacherReports">;
type ReportType = "enrollment" | "performance" | "assessment" | "intervention" | "usage";
type RowViewModel = { id: string; title: string; subtitle: string };

function countRows(payload?: TeacherPaginatedReportResponse<unknown>): number {
  if (!payload) return 0;
  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.count === "number") return payload.count;
  if (Array.isArray(payload.data)) return payload.data.length;
  if (payload.data && typeof payload.data === "object") return Object.keys(payload.data).length;
  return 0;
}

function toReadableLabel(raw: string) {
  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function toRowTitle(record: Record<string, unknown>, fallback: string) {
  const candidate =
    record.studentName ||
    record.className ||
    record.classCode ||
    record.subjectName ||
    record.subjectCode ||
    record.sectionName ||
    record.title ||
    record.name;

  if (typeof candidate === "string" && candidate.trim()) return candidate;
  return fallback;
}

function toRowSubtitle(record: Record<string, unknown>) {
  const pairs = Object.entries(record)
    .filter(([key, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (["id", "studentName", "className", "classCode", "subjectName", "subjectCode", "title", "name"].includes(key)) {
        return false;
      }
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    })
    .slice(0, 3)
    .map(([key, value]) => `${toReadableLabel(key)}: ${String(value)}`);

  return pairs.length ? pairs.join(" | ") : "No additional fields";
}

function buildRows(payload?: TeacherPaginatedReportResponse<unknown>): RowViewModel[] {
  if (!payload) return [];

  if (Array.isArray(payload.data)) {
    return payload.data
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return {
            id: `row-${index}`,
            title: `Row ${index + 1}`,
            subtitle: String(entry ?? "No value"),
          };
        }

        const record = entry as Record<string, unknown>;
        return {
          id: String(record.id ?? `row-${index}`),
          title: toRowTitle(record, `Row ${index + 1}`),
          subtitle: toRowSubtitle(record),
        };
      })
      .filter((entry) => entry.title || entry.subtitle);
  }

  if (payload.data && typeof payload.data === "object") {
    return Object.entries(payload.data as Record<string, unknown>).map(([key, value], index) => ({
      id: `metric-${index}-${key}`,
      title: toReadableLabel(key),
      subtitle: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
  }

  return [];
}

export function TeacherReportsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<ReportType>("enrollment");
  const [viewMode, setViewMode] = useState<"types" | "results">("types");
  const [search, setSearch] = useState("");

  const query = useMemo<TeacherReportQuery>(
    () => ({
      page: 1,
      limit: 200,
      classId: selectedClassId === "all" ? undefined : selectedClassId,
    }),
    [selectedClassId],
  );

  const classEnrollmentQuery = useTeacherReportClassEnrollment(query);
  const studentPerformanceQuery = useTeacherReportStudentPerformance(query);
  const assessmentSummaryQuery = useTeacherReportAssessmentSummary(query);
  const interventionQuery = useTeacherReportInterventionParticipation(query);
  const systemUsageQuery = useTeacherReportSystemUsage(query);

  const reportRows = useMemo(() => {
    const map: Record<ReportType, RowViewModel[]> = {
      enrollment: buildRows(classEnrollmentQuery.data),
      performance: buildRows(studentPerformanceQuery.data),
      assessment: buildRows(assessmentSummaryQuery.data),
      intervention: buildRows(interventionQuery.data),
      usage: buildRows(systemUsageQuery.data),
    };

    return map;
  }, [assessmentSummaryQuery.data, classEnrollmentQuery.data, interventionQuery.data, studentPerformanceQuery.data, systemUsageQuery.data]);

  const visibleRows = useMemo(() => {
    const currentRows = reportRows[selectedReport] ?? [];
    if (!search.trim()) return currentRows;
    const queryText = search.trim().toLowerCase();
    return currentRows.filter((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes(queryText));
  }, [reportRows, search, selectedReport]);

  const reportMeta = useMemo(
    () => [
      { key: "enrollment" as const, label: "Enrollment", value: countRows(classEnrollmentQuery.data) },
      { key: "performance" as const, label: "Performance", value: countRows(studentPerformanceQuery.data) },
      { key: "assessment" as const, label: "Assessments", value: countRows(assessmentSummaryQuery.data) },
      { key: "intervention" as const, label: "Interventions", value: countRows(interventionQuery.data) },
      { key: "usage" as const, label: "Usage", value: countRows(systemUsageQuery.data) },
    ],
    [assessmentSummaryQuery.data, classEnrollmentQuery.data, interventionQuery.data, studentPerformanceQuery.data, systemUsageQuery.data],
  );

  const isRefreshing =
    classEnrollmentQuery.isRefetching ||
    studentPerformanceQuery.isRefetching ||
    assessmentSummaryQuery.isRefetching ||
    interventionQuery.isRefetching ||
    systemUsageQuery.isRefetching ||
    classesQuery.isRefetching;

  const handleDownloadReport = async () => {
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const { openLocalFile } = await import("../api/services/protected-files");

      const endpointByReport: Record<ReportType, Parameters<typeof reportsApi.exportCsv>[0]> = {
        enrollment: "class-enrollment",
        performance: "student-performance",
        assessment: "assessment-summary",
        intervention: "intervention-participation",
        usage: "system-usage",
      };
      const { csv, fileName } = await reportsApi.exportCsv(endpointByReport[selectedReport], {
        classId: selectedClassId === "all" ? undefined : selectedClassId,
      });
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${baseDir}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const Sharing = await import("expo-sharing");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Share official audited report",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        await openLocalFile(fileUri);
      }

      Alert.alert("Official report exported", `${fileName} was generated by the backend and recorded in the audit log.`);
    } catch (err) {
      Alert.alert("Download Failed", toAppError(err).message);
    }
  };

  return (
    <TeacherScreen
      title="Reports"
      subtitle="Choose a report, then inspect or export its authoritative rows."
      icon="chart-box-outline"
      onBackPress={() => navigation.goBack()}
      refreshing={isRefreshing}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          classEnrollmentQuery.refetch(),
          studentPerformanceQuery.refetch(),
          assessmentSummaryQuery.refetch(),
          interventionQuery.refetch(),
          systemUsageQuery.refetch(),
        ]);
      }}
    >
      <TeacherSelectMenu
        label="Class filter"
        selectedValue={selectedClassId}
        options={[
          { value: "all", label: "All assigned classes" },
          ...(classesQuery.data ?? []).map((entry) => ({ value: entry.id, label: `${entry.subjectCode} · ${entry.subjectName}` })),
        ]}
        onSelect={setSelectedClassId}
      />
      <TeacherSegmentedTabs
        accessibilityLabel="Report workspace"
        activeKey={viewMode}
        items={[
          { key: "types", label: "Report types" },
          { key: "results", label: "Results", count: visibleRows.length },
        ]}
        onSelect={setViewMode}
      />

      {viewMode === "types" ? (
      <TeacherFlatSection title="Report types" subtitle="Select the endpoint-backed dataset you need.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {reportMeta.map((entry) => (
            <TeacherChip
              key={entry.key}
              label={`${entry.label} (${entry.value})`}
              active={selectedReport === entry.key}
              onPress={() => {
                setSelectedReport(entry.key);
                setViewMode("results");
              }}
            />
          ))}
        </View>
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="Official audited CSV"
            icon="download-outline"
            tone="green"
            onPress={() => void handleDownloadReport()}
          />
          <TeacherActionButton
            label="Open performance"
            icon="chart-line"
            tone="blue"
            onPress={() => navigation.navigate("TeacherPerformance")}
          />
          <TeacherActionButton
            label="Open interventions"
            icon="account-alert-outline"
            tone="amber"
            onPress={() => navigation.navigate("TeacherInterventions")}
          />
        </View>
      </TeacherFlatSection>
      ) : (
      <>
      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search report rows" />
      <TeacherSummaryStrip
        items={[
          { label: "Rows shown", value: visibleRows.length, tone: "blue" },
          { label: "Dataset", value: reportMeta.find((entry) => entry.key === selectedReport)?.value ?? 0, tone: "red" },
        ]}
      />
      <TeacherFlatSection
        title={`${reportMeta.find((entry) => entry.key === selectedReport)?.label || "Report"} snapshot`}
        subtitle="Current records from the selected teacher report endpoint."
        action={
          <TeacherActionButton
            label="Official CSV"
            icon="file-download-outline"
            tone="green"
            onPress={() => void handleDownloadReport()}
          />
        }
      >
        {visibleRows.length ? (
          visibleRows.slice(0, 30).map((row) => (
            <TeacherRow key={row.id} title={row.title} subtitle={row.subtitle} />
          ))
        ) : (
          <TeacherEmpty
            title="No report rows for this filter"
            subtitle="Change class or report type, then pull to refresh to fetch latest report data."
            icon="chart-line-variant"
          />
        )}
      </TeacherFlatSection>
      </>
      )}
    </TeacherScreen>
  );
}
