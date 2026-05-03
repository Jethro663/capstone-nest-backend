import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Assessments">,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterMode = "all" | "published" | "draft";

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TeacherAssessmentsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const classIds = classesQuery.data?.map((entry) => entry.id) ?? [];
  const assessmentQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.assessments(classId),
      queryFn: () => assessmentsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const records = useMemo(
    () =>
      assessmentQueries.flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!classItem || !query.data) return [];
        return query.data.map((assessment) => ({
          ...assessment,
          classLabel: `${classItem.subjectCode} · ${classItem.subjectName}`,
        }));
      }),
    [assessmentQueries, classesQuery.data],
  );

  const filtered = useMemo(() => {
    return records.filter((assessment) => {
      if (selectedClassId !== "all" && assessment.classId !== selectedClassId) return false;
      if (filter === "published" && !assessment.isPublished) return false;
      if (filter === "draft" && assessment.isPublished) return false;
      if (search.trim()) {
        const haystack = `${assessment.title} ${assessment.classLabel} ${assessment.type}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [filter, records, search, selectedClassId]);

  return (
    <TeacherScreen
      title="Assessments"
      subtitle="Review class assessments, filter by class, and open the grading detail flow."
      icon="clipboard-text-outline"
      refreshing={classesQuery.isRefetching || assessmentQueries.some((query) => query.isRefetching)}
      onRefresh={() => {
        void Promise.all([classesQuery.refetch(), ...assessmentQueries.map((query) => query.refetch())]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Assessments", value: filtered.length, tone: "red" },
          { label: "Published", value: records.filter((entry) => entry.isPublished).length, tone: "green" },
          { label: "Drafts", value: records.filter((entry) => !entry.isPublished).length, tone: "amber" },
        ]}
      />

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by class or assessment title" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {(["all", "published", "draft"] as const).map((entry) => (
          <TeacherChip key={entry} label={entry[0].toUpperCase() + entry.slice(1)} active={filter === entry} onPress={() => setFilter(entry)} />
        ))}
      </View>

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 6 }}>
        <TeacherChip label="All classes" active={selectedClassId === "all"} onPress={() => setSelectedClassId("all")} />
        {(classesQuery.data ?? []).slice(0, 4).map((entry) => (
          <TeacherChip
            key={entry.id}
            label={entry.subjectCode}
            active={selectedClassId === entry.id}
            onPress={() => setSelectedClassId(entry.id)}
          />
        ))}
      </View>

      <TeacherPanel title="Assessment list" subtitle="This is the mobile entry point for reviewing submissions and publish state.">
        {filtered.length ? (
          filtered.map((assessment) => (
            <TeacherRow
              key={assessment.id}
              title={assessment.title}
              subtitle={`${assessment.classLabel} · ${assessment.type.replace(/_/g, " ")} · Due ${formatDate(assessment.dueDate)}`}
              onPress={() =>
                navigation.navigate("TeacherAssessmentDetail", {
                  assessmentId: assessment.id,
                  classId: assessment.classId,
                })
              }
              right={
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: assessment.isPublished ? theme.green : theme.amber }}>
                    {assessment.isPublished ? "Published" : "Draft"}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.muted }}>
                    {assessment.questions?.length ?? 0} questions
                  </Text>
                </View>
              }
            />
          ))
        ) : (
          <TeacherEmpty title="No assessments found" subtitle="Adjust the class filter or search term to find the expected assessment." icon="clipboard-search-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
