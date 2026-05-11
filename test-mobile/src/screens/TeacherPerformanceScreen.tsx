import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import {
  useTeacherClassAtRisk,
  useTeacherClassPerformanceSummary,
  useTeacherClasses,
  useTeacherInterventionQuizComparison,
} from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherPerformance">;

function toPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";
}

function toDelta(value: number | null | undefined) {
  if (typeof value !== "number") return "N/A";
  if (value > 0) return `+${value.toFixed(1)} pts`;
  return `${value.toFixed(1)} pts`;
}

function trendLabel(trend: string | undefined) {
  switch (trend) {
    case "improved":
      return "Improved";
    case "declined":
      return "Declined";
    case "unchanged":
      return "Unchanged";
    default:
      return "Awaiting Retry";
  }
}

function trendColor(trend: string | undefined) {
  switch (trend) {
    case "improved":
      return teacherTheme.green;
    case "declined":
      return teacherTheme.red;
    case "unchanged":
      return teacherTheme.muted;
    default:
      return teacherTheme.amber;
  }
}

export function TeacherPerformanceScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  useEffect(() => {
    if (!selectedClassId && classesQuery.data?.length) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  const summaryQuery = useTeacherClassPerformanceSummary(selectedClassId || undefined);
  const atRiskQuery = useTeacherClassAtRisk(selectedClassId || undefined);
  const comparisonQuery = useTeacherInterventionQuizComparison(selectedClassId || undefined);

  const selectedClass = useMemo(
    () => classesQuery.data?.find((entry) => entry.id === selectedClassId),
    [classesQuery.data, selectedClassId],
  );

  const atRiskStudents = atRiskQuery.data?.students ?? [];
  const comparisonRows = comparisonQuery.data?.comparisons ?? [];
  const latestComparisonByStudent = useMemo(() => {
    const map = new Map<string, (typeof comparisonRows)[number]>();

    comparisonRows.forEach((row) => {
      const current = map.get(row.studentId);
      if (!current) {
        map.set(row.studentId, row);
        return;
      }

      const currentAfter = current.afterSubmittedAt
        ? new Date(current.afterSubmittedAt).getTime()
        : 0;
      const nextAfter = row.afterSubmittedAt
        ? new Date(row.afterSubmittedAt).getTime()
        : 0;

      if (nextAfter > currentAfter) {
        map.set(row.studentId, row);
      }
    });

    return map;
  }, [comparisonRows]);

  return (
    <TeacherScreen
      title="Performance"
      subtitle="Class-level performance metrics and at-risk students from teacher analytics endpoints."
      icon="chart-line"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={
        classesQuery.isRefetching ||
        summaryQuery.isRefetching ||
        atRiskQuery.isRefetching ||
        comparisonQuery.isRefetching
      }
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          summaryQuery.refetch(),
          atRiskQuery.refetch(),
          comparisonQuery.refetch(),
        ]);
      }}
    >
      <TeacherStats
        items={[
          {
            label: "Avg score",
            value:
              typeof summaryQuery.data?.averageBlendedScore === "number"
                ? summaryQuery.data.averageBlendedScore.toFixed(1)
                : "N/A",
            tone: "blue",
          },
          { label: "At-risk", value: atRiskStudents.length, tone: "amber" },
          { label: "Improved", value: comparisonQuery.data?.improvedCount ?? 0, tone: "green" },
          { label: "Students", value: summaryQuery.data?.totalStudents ?? "N/A", tone: "red" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(classesQuery.data ?? []).map((classItem) => (
          <TeacherChip
            key={classItem.id}
            label={classItem.subjectCode}
            active={selectedClassId === classItem.id}
            onPress={() => setSelectedClassId(classItem.id)}
          />
        ))}
      </View>

      <TeacherPanel
        title="Class summary"
        subtitle={selectedClass ? `${selectedClass.subjectCode} - ${selectedClass.subjectName}` : "Select a class"}
      >
        <TeacherRow
          title="Threshold"
          subtitle={
            typeof summaryQuery.data?.thresholdApplied === "number"
              ? `${summaryQuery.data.thresholdApplied}%`
              : "Not available"
          }
        />
        <TeacherRow
          title="Average blended score"
          subtitle={
            typeof summaryQuery.data?.averageBlendedScore === "number"
              ? `${summaryQuery.data.averageBlendedScore.toFixed(2)}`
              : "Not available"
          }
        />
      </TeacherPanel>

      <TeacherPanel title="At-risk learners" subtitle="Students below threshold for the selected class.">
        {atRiskStudents.length ? (
          atRiskStudents.map((entry, index) => {
            const name = [entry.firstName, entry.lastName].filter(Boolean).join(" ").trim() || entry.studentId || "Student";
            const comparison = entry.studentId ? latestComparisonByStudent.get(entry.studentId) : undefined;
            return (
              <TeacherRow
                key={`${entry.studentId || index}`}
                title={name}
                subtitle={`Blended: ${entry.blendedScore ?? "N/A"} | Threshold: ${entry.thresholdApplied ?? "N/A"} | Before: ${toPercent(comparison?.beforeScorePercent)} | After: ${toPercent(comparison?.afterScorePercent)} | Delta: ${toDelta(comparison?.deltaScorePercent)}`}
                right={
                  comparison ? (
                    <View
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: teacherTheme.border,
                        backgroundColor: teacherTheme.active,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: trendColor(comparison.trend) }}>
                        {trendLabel(comparison.trend)}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
            );
          })
        ) : (
          <TeacherEmpty title="No at-risk learners" subtitle="No students are currently flagged for the selected class." icon="check-circle-outline" />
        )}
      </TeacherPanel>

      <TeacherPanel
        title="Intervention quiz comparison"
        subtitle="Before and after score on the same quiz for intervention retry checkpoints."
      >
        {comparisonRows.length ? (
          comparisonRows.map((row) => {
            const studentName =
              [row.student?.firstName, row.student?.lastName].filter(Boolean).join(" ").trim() || row.studentId;
            return (
              <TeacherRow
                key={`${row.caseId}-${row.assignmentId}-${row.assessmentId}`}
                title={`${studentName} - ${row.assessmentTitle}`}
                subtitle={`Before: ${toPercent(row.beforeScorePercent)} | After: ${toPercent(row.afterScorePercent)} | Delta: ${toDelta(row.deltaScorePercent)}`}
                right={
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: teacherTheme.border,
                      backgroundColor: teacherTheme.active,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: trendColor(row.trend) }}>
                      {trendLabel(row.trend)}
                    </Text>
                  </View>
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title="No quiz retries yet"
            subtitle="Retry results will appear here after students complete intervention quiz checkpoints."
            icon="chart-timeline-variant"
          />
        )}
      </TeacherPanel>

      <TeacherPanel title="Performance actions" subtitle="Jump to adjacent teacher tabs without leaving this context.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherChip label="Open Interventions" onPress={() => navigation.navigate("TeacherInterventions")} />
          <TeacherChip label="Open Reports" onPress={() => navigation.navigate("TeacherReports")} />
        </View>
      </TeacherPanel>
    </TeacherScreen>
  );
}
