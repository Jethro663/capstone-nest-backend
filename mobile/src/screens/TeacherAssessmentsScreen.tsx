import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { queryKeys, useTeacherAiJobs, useTeacherClasses } from "../api/hooks";
import { toAppError } from "../api/http";
import { assessmentsApi } from "../api/services/assessments";
import { aiApi } from "../api/services/ai";
import { clearTeacherAiDraftJobIdIfMatches } from "../api/teacher-ai-draft-jobs";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import { TeacherAiJobsPanel } from "./teacher-assessments/TeacherAiJobsPanel";
import type { TeacherAiJobSummary } from "../types/ai";
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
  const aiJobsQuery = useTeacherAiJobs();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [deletingAssessment, setDeletingAssessment] = useState<{ id: string; title: string } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);
  const [deletingAiJob, setDeletingAiJob] = useState<TeacherAiJobSummary | null>(null);
  const [isDeletingAiJob, setIsDeletingAiJob] = useState(false);

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

  const classNames = useMemo(
    () => Object.fromEntries(
      (classesQuery.data ?? []).map((classItem) => [
        classItem.id,
        `${classItem.subjectCode} · ${classItem.subjectName}`,
      ]),
    ),
    [classesQuery.data],
  );

  const toggleSelectAssessment = (id: string) => {
    setSelectedAssessmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAssessments = () => {
    const allIds = filteredRecords.map((a) => a.id);
    if (selectedAssessmentIds.length === allIds.length && allIds.length > 0) {
      setSelectedAssessmentIds([]);
    } else {
      setSelectedAssessmentIds(allIds);
    }
  };

  const refetchAllAssessments = async () => {
    await Promise.all([classesQuery.refetch(), ...assessmentQueries.map((query) => query.refetch())]);
  };

  const handleDeleteSingleAssessment = async () => {
    if (!deletingAssessment || isDeletingAssessment) return;
    try {
      setIsDeletingAssessment(true);
      await assessmentsApi.delete(deletingAssessment.id);
      setDeletingAssessment(null);
      setSelectedAssessmentIds((prev) => prev.filter((id) => id !== deletingAssessment.id));
      await refetchAllAssessments();
      Alert.alert("Assessment Deleted", "The assessment has been deleted successfully.");
    } catch (err) {
      Alert.alert("Unable to delete assessment", toAppError(err).message);
    } finally {
      setIsDeletingAssessment(false);
    }
  };

  const handleBulkDeleteAssessments = async () => {
    if (!selectedAssessmentIds.length || isDeletingAssessment) return;
    try {
      setIsDeletingAssessment(true);
      await Promise.all(selectedAssessmentIds.map((id) => assessmentsApi.delete(id)));
      setShowBulkDeleteConfirm(false);
      setSelectedAssessmentIds([]);
      await refetchAllAssessments();
      Alert.alert("Assessments Deleted", `${selectedAssessmentIds.length} assessment(s) deleted successfully.`);
    } catch (err) {
      Alert.alert("Unable to delete assessments", toAppError(err).message);
    } finally {
      setIsDeletingAssessment(false);
    }
  };

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

  const handleDeleteAiJob = async () => {
    if (!deletingAiJob || isDeletingAiJob) return;
    try {
      setIsDeletingAiJob(true);
      await aiApi.deleteTeacherJob(deletingAiJob.jobId);
      if (deletingAiJob.classId) {
        await clearTeacherAiDraftJobIdIfMatches(
          deletingAiJob.classId,
          deletingAiJob.jobId,
        );
      }
      setDeletingAiJob(null);
      await aiJobsQuery.refetch();
      Alert.alert("AI Draft Job Deleted", "The generation job was removed. Any approved assessment remains available.");
    } catch (error) {
      Alert.alert("Unable to delete AI draft job", toAppError(error).message);
    } finally {
      setIsDeletingAiJob(false);
    }
  };

  return (
    <TeacherScreen
      title="Assessments"
      subtitle="Open a class accordion to review its specific assessments and grading workflow."
      icon="clipboard-text-outline"
      refreshing={classesQuery.isRefetching || aiJobsQuery.isRefetching || assessmentQueries.some((query) => query.isRefetching)}
      onRefresh={() => {
        void Promise.all([classesQuery.refetch(), aiJobsQuery.refetch(), ...assessmentQueries.map((query) => query.refetch())]);
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

      <TeacherAiJobsPanel
        jobs={aiJobsQuery.data ?? []}
        classNames={classNames}
        loading={aiJobsQuery.isLoading}
        error={aiJobsQuery.isError}
        onRefresh={() => void aiJobsQuery.refetch()}
        onResume={(job) => {
          if (!job.classId) {
            Alert.alert("Class unavailable", "This AI draft job is not linked to an available class.");
            return;
          }
          navigation.navigate("TeacherAiDraft", {
            classId: job.classId,
            jobId: job.jobId,
          });
        }}
        onOpenAssessment={(job) => {
          if (!job.assessmentId) return;
          navigation.navigate("TeacherAssessmentEditor", {
            assessmentId: job.assessmentId,
            classId: job.classId ?? undefined,
          });
        }}
        onRequestDelete={setDeletingAiJob}
      />

      <TeacherPanel
        title="Classes with assessments"
        subtitle="Select assessments using checkboxes to bulk delete, or tap a class to expand."
        action={
          selectedAssessmentIds.length > 0 ? (
            <TeacherActionButton
              label={`Delete Selected (${selectedAssessmentIds.length})`}
              icon="trash-can-outline"
              tone="red"
              onPress={() => setShowBulkDeleteConfirm(true)}
            />
          ) : undefined
        }
      >
        {filteredRecords.length ? (
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: theme.surface2,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Pressable
              onPress={toggleSelectAllAssessments}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <MaterialCommunityIcons
                name={
                  selectedAssessmentIds.length === filteredRecords.length
                    ? "checkbox-marked"
                    : selectedAssessmentIds.length > 0
                    ? "checkbox-intermediate"
                    : "checkbox-blank-outline"
                }
                size={20}
                color={selectedAssessmentIds.length > 0 ? theme.red : theme.muted}
              />
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>
                {selectedAssessmentIds.length === filteredRecords.length ? "Deselect All" : "Select All"}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 11, color: theme.muted }}>
              {selectedAssessmentIds.length} of {filteredRecords.length} selected
            </Text>
          </View>
        ) : null}

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
                        left={
                          <Pressable
                            onPress={() => toggleSelectAssessment(assessment.id)}
                            hitSlop={8}
                            style={{ paddingRight: 4 }}
                          >
                            <MaterialCommunityIcons
                              name={selectedAssessmentIds.includes(assessment.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                              size={20}
                              color={selectedAssessmentIds.includes(assessment.id) ? theme.red : theme.dim}
                            />
                          </Pressable>
                        }
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
                            <View style={{ marginTop: 4, flexDirection: "row", gap: 6 }}>
                              <Pressable
                                onPress={() =>
                                  navigation.navigate("TeacherAssessmentEditor", {
                                    assessmentId: assessment.id,
                                    classId: assessment.classId,
                                  })
                                }
                                style={{ borderRadius: 6, backgroundColor: theme.active, paddingHorizontal: 8, paddingVertical: 4 }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.text }}>Edit</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => setDeletingAssessment({ id: assessment.id, title: assessment.title })}
                                style={{ borderRadius: 6, backgroundColor: theme.redSoft, borderWidth: 1, borderColor: theme.redLine, paddingHorizontal: 6, paddingVertical: 4 }}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={13} color={theme.red} />
                              </Pressable>
                            </View>
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

      <TeacherConfirmModal
        visible={Boolean(deletingAssessment)}
        title="Delete Assessment?"
        description={
          deletingAssessment
            ? `Are you sure you want to delete "${deletingAssessment.title}"? All student attempts, responses, and grades will be permanently removed.`
            : ""
        }
        loading={isDeletingAssessment}
        onCancel={() => setDeletingAssessment(null)}
        onConfirm={() => void handleDeleteSingleAssessment()}
      />

      <TeacherConfirmModal
        visible={showBulkDeleteConfirm}
        title="Delete Selected Assessments?"
        description={`Are you sure you want to delete ${selectedAssessmentIds.length} selected assessment(s)? This action cannot be undone and will permanently remove all linked student submissions.`}
        loading={isDeletingAssessment}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        onConfirm={() => void handleBulkDeleteAssessments()}
      />

      <TeacherConfirmModal
        visible={Boolean(deletingAiJob)}
        title="Delete AI Draft Job?"
        description={
          deletingAiJob
            ? `Delete "${deletingAiJob.title}" and its generated draft? An approved assessment already created from this job will not be deleted.`
            : ""
        }
        confirmLabel="Delete Job"
        loading={isDeletingAiJob}
        onCancel={() => setDeletingAiJob(null)}
        onConfirm={() => void handleDeleteAiJob()}
      />
    </TeacherScreen>
  );
}
