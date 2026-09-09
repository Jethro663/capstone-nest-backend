import { useEffect, useMemo, useRef, useState } from "react";
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
import { filterTeacherAssessments } from "./teacher-assessments/model";
import {
  TeacherAccordionSection,
  TeacherActionButton,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSelectMenu,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Assessments">,
  NativeStackScreenProps<RootStackParamList>
>;

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
  const [classFilter, setClassFilter] = useState("all");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [aiJobsExpanded, setAiJobsExpanded] = useState(false);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [deletingAssessment, setDeletingAssessment] = useState<{ id: string; title: string } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);
  const [deletingAiJob, setDeletingAiJob] = useState<TeacherAiJobSummary | null>(null);
  const [isDeletingAiJob, setIsDeletingAiJob] = useState(false);
  const initializedExpansion = useRef(false);
  const classIds = classesQuery.data?.map((entry) => entry.id) ?? [];
  const assessmentQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.assessments(classId),
      queryFn: () => assessmentsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });
  const assessmentLoadFailed = classesQuery.isError || assessmentQueries.some(query => query.isError);
  const assessmentsLoading = classesQuery.isLoading || assessmentQueries.some(query => query.isLoading);

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
    return filterTeacherAssessments(records, {
      period: "all",
      status: "all",
      classId: classFilter,
      search: "",
    });
  }, [classFilter, records]);

  const classGroups = useMemo(
    () =>
      (classesQuery.data ?? [])
        .filter((classItem) => classFilter === "all" || classItem.id === classFilter)
        .map((classItem) => ({
          classItem,
          assessments: filteredRecords.filter((assessment) => assessment.classId === classItem.id),
        })),
    [classFilter, classesQuery.data, filteredRecords],
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

  useEffect(() => {
    if (initializedExpansion.current || !classesQuery.data?.length) return;
    initializedExpansion.current = true;
    setExpandedClassId(classesQuery.data[0].id);
  }, [classesQuery.data]);

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
      navigation.navigate("TeacherCreateAssessment", { classId });
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
      {assessmentLoadFailed ? (
        <TeacherPanel
          title="Assessments could not fully load"
          subtitle="This is a loading problem, not an empty class. Retry to restore the list."
        >
          <View style={{ padding: 14 }}>
            <TeacherActionButton
              label="Retry assessment loading"
              icon="refresh"
              onPress={() => void refetchAllAssessments()}
            />
          </View>
        </TeacherPanel>
      ) : null}

      <TeacherSelectMenu
        label="Class"
        selectedValue={classFilter}
        options={[
          { label: "All classes", value: "all" },
          ...(classesQuery.data ?? []).map((classItem) => ({
            label: `${classItem.subjectCode} · ${classItem.subjectName}`,
            value: classItem.id,
          })),
        ]}
        onSelect={(value) => {
          setClassFilter(value);
          setExpandedClassId(value === "all" ? null : value);
          setSelectedAssessmentIds([]);
        }}
      />

      <View
        style={{
          marginHorizontal: 16,
          marginTop: 20,
          marginBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>
            Assessments by class
          </Text>
          <Text style={{ marginTop: 3, fontSize: 12, color: theme.subtext }}>
            Open a class to review, edit, or create its work.
          </Text>
        </View>
        {selectedAssessmentIds.length > 0 ? (
          <TeacherActionButton
            label={`Delete (${selectedAssessmentIds.length})`}
            icon="trash-can-outline"
            tone="red"
            onPress={() => setShowBulkDeleteConfirm(true)}
          />
        ) : null}
      </View>

      {filteredRecords.length ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 4,
            minHeight: 46,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedAssessmentIds.length === filteredRecords.length }}
            onPress={toggleSelectAllAssessments}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}
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
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.text }}>
              {selectedAssessmentIds.length === filteredRecords.length ? "Deselect all" : "Select all"}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 11, color: theme.muted }}>
            {selectedAssessmentIds.length} of {filteredRecords.length}
          </Text>
        </View>
      ) : null}

      {classGroups.length ? (
        classGroups.map(({ classItem, assessments }) => {
          const expanded = expandedClassId === classItem.id;
          return (
            <TeacherAccordionSection
              key={classItem.id}
              title={`${classItem.subjectCode} · ${classItem.subjectName}`}
              subtitle={`${classItem.section?.name || "Section pending"} · ${classItem.schoolYear}`}
              icon="book-open-variant-outline"
              count={assessments.length}
              expanded={expanded}
              onToggle={() =>
                setExpandedClassId((current) =>
                  current === classItem.id ? null : classItem.id,
                )
              }
              action={
                <TeacherActionButton
                  label="New"
                  icon="plus"
                  tone="red"
                  disabled={creatingAssessment}
                  onPress={() => void handleCreateAssessment(classItem.id)}
                />
              }
            >
              {assessments.length ? (
                assessments.map((assessment) => (
                      <TeacherRow
                        key={assessment.id}
                        title={assessment.title}
                        subtitle={`${assessment.academicCapabilities?.periodLabel || assessment.quarter || "Unassigned period"} · ${assessment.totalPoints ?? 0} points · Due ${formatDate(assessment.dueDate)}${assessment.academicCapabilities?.readOnlyReason ? " · " + assessment.academicCapabilities.readOnlyReason : ""}`}
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
                              {assessment.isPublished ? "Ready to give" : "Draft"}
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
                                accessibilityRole="button"
                                style={{ minHeight: 44, borderRadius: 6, backgroundColor: theme.active, paddingHorizontal: 12, paddingVertical: 12 }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.text }}>{assessment.academicCapabilities?.canPrepare ? "Edit" : "Review"}</Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`More actions for ${assessment.title}`}
                                onPress={() => Alert.alert(assessment.title, "Assessment actions", [
                                  { text: "Details and submissions", onPress: () => navigation.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id }) },
                                  ...(assessment.academicCapabilities?.canPrepare ? [{ text: "Delete assessment", style: "destructive" as const, onPress: () => setDeletingAssessment({ id: assessment.id, title: assessment.title }) }] : []),
                                  { text: "Cancel", style: "cancel" },
                                ])}
                                style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 1, borderColor: theme.border }}
                              >
                                <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.text} />
                              </Pressable>
                            </View>
                          </View>
                        }
                      />
                ))
              ) : (
                <>
                  <TeacherEmpty
                    title={assessmentsLoading ? "Loading assessments…" : "No assessments yet"}
                    subtitle={
                      assessmentsLoading
                        ? "Loading class work."
                        : "Use Create first assessment to begin this class record."
                    }
                    icon="clipboard-plus-outline"
                  />
                  {!assessmentsLoading ? (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14, alignItems: "center" }}>
                      <TeacherActionButton
                        label="Create first assessment"
                        icon="plus"
                        tone="red"
                        disabled={creatingAssessment}
                        onPress={() => void handleCreateAssessment(classItem.id)}
                      />
                    </View>
                  ) : null}
                </>
              )}
            </TeacherAccordionSection>
          );
        })
      ) : (
        <TeacherEmpty
          title={assessmentsLoading ? "Loading classes…" : "No assigned classes"}
          subtitle={
            assessmentsLoading
              ? "Loading your assessment workspace."
              : "Assigned classes will appear here without hiding empty class records."
          }
          icon="book-alert-outline"
        />
      )}

      <TeacherAccordionSection
        title="AI Draft Jobs"
        subtitle="Generated draft activity stays separate from official class work."
        icon="creation-outline"
        count={aiJobsQuery.data?.length ?? 0}
        accent="amber"
        expanded={aiJobsExpanded}
        onToggle={() => setAiJobsExpanded((current) => !current)}
      >
        <TeacherAiJobsPanel
          embedded
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
              source: "assessments",
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
      </TeacherAccordionSection>

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
