import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import {
  useTeacherClasses,
  useTeacherReportAssessmentSummary,
  useTeacherReportClassEnrollment,
  useTeacherReportInterventionParticipation,
  useTeacherReportStudentPerformance,
  useTeacherReportSystemUsage,
} from "../api/hooks";
import type { TeacherPaginatedReportResponse, TeacherReportQuery } from "../types/report";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherReports">;
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

  return (
    <TeacherScreen
      title="Reports"
      subtitle="Interactive teacher report workspace with class filtering and live endpoint snapshots used on web."
      icon="chart-box-outline"
      showBackButton
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
      <TeacherStats
        items={[
          { label: "Enrollment", value: reportMeta[0]?.value ?? 0, tone: "red" },
          { label: "Performance", value: reportMeta[1]?.value ?? 0, tone: "blue" },
          { label: "Assessments", value: reportMeta[2]?.value ?? 0, tone: "green" },
          { label: "Rows shown", value: visibleRows.length, tone: "amber" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TeacherChip label="All classes" active={selectedClassId === "all"} onPress={() => setSelectedClassId("all")} />
        {(classesQuery.data ?? []).slice(0, 6).map((entry) => (
          <TeacherChip
            key={entry.id}
            label={entry.subjectCode}
            active={selectedClassId === entry.id}
            onPress={() => setSelectedClassId(entry.id)}
          />
        ))}
      </View>

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search report rows" />

      <TeacherPanel title="Report types" subtitle="Switch report stream without leaving the teacher workspace.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {reportMeta.map((entry) => (
            <TeacherChip
              key={entry.key}
              label={`${entry.label} (${entry.value})`}
              active={selectedReport === entry.key}
              onPress={() => setSelectedReport(entry.key)}
            />
          ))}
        </View>
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
      </TeacherPanel>

      <TeacherPanel
        title={`${reportMeta.find((entry) => entry.key === selectedReport)?.label || "Report"} snapshot`}
        subtitle="Top records from the selected teacher report endpoint."
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
      </TeacherPanel>
    </TeacherScreen>
  );
}
