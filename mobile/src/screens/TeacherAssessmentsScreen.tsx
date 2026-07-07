import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { assessmentsApi } from "../api/services/assessments";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
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
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);

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
          classSection: classItem.section?.name || "Section pending",
          classSchoolYear: classItem.schoolYear,
        }));
      }),
    [assessmentQueries, classesQuery.data],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((assessment) => {
      if (filter === "published" && !assessment.isPublished) return false;
      if (filter === "draft" && assessment.isPublished) return false;
      if (search.trim()) {
        const haystack = `${assessment.title} ${assessment.classLabel} ${assessment.type}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [filter, records, search]);

  const classGroups = useMemo(
    () =>
      (classesQuery.data ?? [])
        .map((classItem) => ({
          classItem,
          assessments: filteredRecords.filter((assessment) => assessment.classId === classItem.id),
        }))
        .filter((group) => group.assessments.length > 0),
    [classesQuery.data, filteredRecords],
  );

  const handleCreateAssessment = async (targetClassId?: string) => {
    if (creatingAssessment) return;
    const classId = targetClassId || classesQuery.data?.[0]?.id;
    if (!classId) {
      Alert.alert("No class selected", "A class is required before creating an assessment.");
      return;
    }

    try {
      setCreatingAssessment(true);
      const created = await assessmentsApi.create({
        title: "Untitled Assessment",
        classId,
      });
      navigation.navigate("TeacherAssessmentEditor", {
        assessmentId: created.id,
        classId: created.classId,
      });
    } catch (error) {
      Alert.alert("Unable to create assessment", toAppError(error).message);
    } finally {
      setCreatingAssessment(false);
    }
  };

  return (
    <TeacherScreen
      title="Assessments"
      subtitle="Open a class accordion to review its specific assessments and grading workflow."
      icon="clipboard-text-outline"
      refreshing={classesQuery.isRefetching || assessmentQueries.some((query) => query.isRefetching)}
      onRefresh={() => {
        void Promise.all([classesQuery.refetch(), ...assessmentQueries.map((query) => query.refetch())]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Assessments", value: filteredRecords.length, tone: "red" },
          { label: "Classes", value: classGroups.length, tone: "blue" },
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

      <TeacherPanel
        title="Create and edit"
        subtitle="Create a draft in the first assigned class, or use a class accordion below to create in that class."
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label={creatingAssessment ? "Creating..." : "Create assessment"}
            icon="file-plus-outline"
            tone="green"
            disabled={creatingAssessment || !classesQuery.data?.length}
            onPress={() => void handleCreateAssessment()}
          />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Classes with assessments" subtitle="Tap a class to expand or collapse its assessment list.">
        {classGroups.length ? (
          classGroups.map(({ classItem, assessments }) => {
            const expanded = expandedClassId === classItem.id;
            return (
              <View key={classItem.id}>
                <Pressable
                  onPress={() => setExpandedClassId((current) => (current === classItem.id ? null : classItem.id))}
                  style={{
                    minHeight: 68,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: theme.text }}>
                      {classItem.subjectCode} · {classItem.subjectName}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 11, lineHeight: 17, color: theme.subtext }}>
                      {classItem.section?.name || "Section pending"} · {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <TeacherActionButton
                    label="New"
                    icon="plus"
                    tone="green"
                    disabled={creatingAssessment}
                    onPress={() => void handleCreateAssessment(classItem.id)}
                  />
                  <Text style={{ fontSize: 18, color: theme.dim }}>{expanded ? "⌃" : "⌄"}</Text>
                </Pressable>

                {expanded
                  ? assessments.map((assessment) => (
                      <TeacherRow
                        key={assessment.id}
                        title={assessment.title}
                        subtitle={`${assessment.type.replace(/_/g, " ")} · Due ${formatDate(assessment.dueDate)}`}
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
                            <Pressable
                              onPress={() =>
                                navigation.navigate("TeacherAssessmentEditor", {
                                  assessmentId: assessment.id,
                                  classId: assessment.classId,
                                })
                              }
                              style={{ marginTop: 4, borderRadius: 6, backgroundColor: theme.active, paddingHorizontal: 8, paddingVertical: 4 }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.text }}>Edit</Text>
                            </Pressable>
                          </View>
                        }
                      />
                    ))
                  : null}
              </View>
            );
          })
        ) : (
          <TeacherEmpty title="No classes with assessments" subtitle="Create or publish an assessment to make its class appear here." icon="clipboard-search-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
