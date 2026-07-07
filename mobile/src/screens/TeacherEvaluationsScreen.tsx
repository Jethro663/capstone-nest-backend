import { useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { useTeacherClasses, useTeacherEvaluationSummary } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import type { TeacherEvaluationType } from "../types/teacher";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherEvaluations">;

type GradingFilter = "all" | "Q1" | "Q2" | "Q3" | "Q4";

const evaluationTypes: Array<{ label: string; value: TeacherEvaluationType }> = [
  { label: "Teacher Class", value: "teacher_class" },
  { label: "JA Hub", value: "ja_hub" },
  { label: "Learners Path", value: "learners_path" },
];

export function TeacherEvaluationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);

  const [evaluationType, setEvaluationType] = useState<TeacherEvaluationType>("teacher_class");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [gradingPeriod, setGradingPeriod] = useState<GradingFilter>("all");

  const summaryQuery = useTeacherEvaluationSummary(evaluationType, {
    classId: selectedClassId === "all" ? undefined : selectedClassId,
    gradingPeriod: gradingPeriod === "all" ? undefined : gradingPeriod,
  });

  const classAverages = summaryQuery.data?.classAverages ?? [];
  const gradingBreakdown = summaryQuery.data?.gradingPeriodBreakdown ?? [];

  const selectedClass = useMemo(
    () => classesQuery.data?.find((entry) => entry.id === selectedClassId),
    [classesQuery.data, selectedClassId],
  );

  return (
    <TeacherScreen
      title="Evaluations"
      subtitle="Interactive evaluation summaries with type, class, and quarter filters aligned to teacher web analytics."
      icon="clipboard-check-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={summaryQuery.isRefetching || classesQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([summaryQuery.refetch(), classesQuery.refetch()]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Responses", value: summaryQuery.data?.responseCount ?? 0, tone: "red" },
          {
            label: "Overall avg",
            value:
              typeof summaryQuery.data?.overallAverage === "number"
                ? summaryQuery.data.overallAverage.toFixed(2)
                : "N/A",
            tone: "blue",
          },
          { label: "Class rows", value: classAverages.length, tone: "green" },
        ]}
      />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {evaluationTypes.map((entry) => (
          <TeacherChip
            key={entry.value}
            label={entry.label}
            active={evaluationType === entry.value}
            onPress={() => setEvaluationType(entry.value)}
          />
        ))}
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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

      <View style={{ marginHorizontal: 16, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["all", "Q1", "Q2", "Q3", "Q4"] as GradingFilter[]).map((entry) => (
          <TeacherChip
            key={entry}
            label={entry === "all" ? "All quarters" : entry}
            active={gradingPeriod === entry}
            onPress={() => setGradingPeriod(entry)}
          />
        ))}
      </View>

      <TeacherPanel
        title="Evaluation actions"
        subtitle={
          selectedClass
            ? `Focused class: ${selectedClass.subjectCode} | ${selectedClass.subjectName}`
            : "All classes selected"
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="Open reports"
            icon="chart-box-outline"
            tone="purple"
            onPress={() => navigation.navigate("TeacherReports")}
          />
          <TeacherActionButton
            label="Open performance"
            icon="chart-line"
            tone="blue"
            onPress={() => navigation.navigate("TeacherPerformance")}
          />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Class averages" subtitle="Average evaluation scores by class for the selected filters.">
        {classAverages.length ? (
          classAverages.map((entry) => (
            <TeacherRow
              key={`${entry.classId}-${entry.classCode || "class"}`}
              title={entry.classCode || entry.className || entry.classId}
              subtitle={`Average: ${entry.averageScore ?? "N/A"} | Responses: ${entry.responseCount ?? 0}`}
            />
          ))
        ) : (
          <TeacherEmpty
            title="No evaluation summaries"
            subtitle="No evaluation submissions found for this filter combination."
            icon="clipboard-alert-outline"
          />
        )}
      </TeacherPanel>

      <TeacherPanel title="Quarter breakdown" subtitle="Quarter-specific averages from teacher evaluation analytics.">
        {gradingBreakdown.length ? (
          gradingBreakdown.map((entry) => (
            <TeacherRow
              key={`${entry.gradingPeriod}`}
              title={entry.gradingPeriod}
              subtitle={`Average: ${entry.averageScore ?? "N/A"} | Responses: ${entry.responseCount ?? 0}`}
            />
          ))
        ) : (
          <TeacherEmpty
            title="No quarter breakdown"
            subtitle="Quarter breakdown appears when evaluation data exists for the chosen filters."
            icon="timeline-text-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
