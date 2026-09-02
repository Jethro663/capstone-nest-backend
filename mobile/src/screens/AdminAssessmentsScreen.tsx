import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { classesApi } from "../api/services/classes";
import { assessmentsApi } from "../api/services/assessments";
import type { MainTabParamList } from "../navigation/types";
import { View } from "react-native";
import { TeacherActionButton, TeacherEmpty, TeacherPanel, TeacherRow, TeacherScreen, TeacherStats } from "../components/teacher/TeacherMobilePrimitives";

type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;

export function AdminAssessmentsScreen({ navigation }: Props) {
  const classes = useQuery({ queryKey: ["admin-assessment-classes"], queryFn: () => classesApi.getAll() });
  const queries = useQueries({ queries: (classes.data ?? []).map((entry) => ({ queryKey: ["admin-assessments", entry.id], queryFn: () => assessmentsApi.getByClass(entry.id), enabled: Boolean(classes.data) })) });
  const records = useMemo(() => queries.flatMap((query, index) => (query.data ?? []).map((assessment) => ({ assessment, classItem: classes.data?.[index] }))), [classes.data, queries]);
  const published = records.filter(({ assessment }) => assessment.isPublished).length;
  const refreshing = classes.isRefetching || queries.some((query) => query.isRefetching);
  return (
    <TeacherScreen title="Assessment administration" workspaceLabel="Admin workspace" subtitle="Cross-class assessment inventory with teacher-equivalent detail, grading, analytics, and lifecycle controls." icon="clipboard-text-outline" refreshing={refreshing} onRefresh={() => void Promise.all([classes.refetch(), ...queries.map((query) => query.refetch())])}>
      <TeacherStats items={[{ label: "Classes", value: classes.data?.length ?? 0, tone: "blue" }, { label: "Assessments", value: records.length, tone: "red" }, { label: "Published", value: published, tone: "green" }, { label: "Draft", value: records.length - published, tone: "amber" }]} />
      <TeacherPanel title="Create assessment" subtitle="Choose the target class before opening the complete assessment editor."><View style={{ padding: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(classes.data ?? []).map((entry) => <TeacherActionButton key={entry.id} label={`New in ${entry.subjectCode}`} icon="plus" tone="green" onPress={() => (navigation.getParent() as unknown as { navigate: (name: string, params?: unknown) => void })?.navigate("TeacherAssessmentEditor", { classId: entry.id })} />)}</View></TeacherPanel>
      <TeacherPanel title="All assessments" subtitle="Every class page is loaded before the inventory is presented.">
        {records.map(({ assessment, classItem }) => <TeacherRow key={assessment.id} title={assessment.title} subtitle={`${classItem?.subjectCode ?? "Class"} · ${assessment.type.replace(/_/g, " ")} · ${assessment.isPublished ? "Published" : "Draft"}`} onPress={() => (navigation.getParent() as unknown as { navigate: (name: string, params?: unknown) => void })?.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId: assessment.classId })} />)}
        {!records.length ? <TeacherEmpty title={refreshing ? "Loading assessments" : "No assessments found"} subtitle="Create assessments from the selected class workspace." icon="clipboard-search-outline" /> : null}
      </TeacherPanel>
    </TeacherScreen>
  );
}
