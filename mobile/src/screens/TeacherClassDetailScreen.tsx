import { TeacherAnnouncementRow } from "../components/teacher/TeacherAnnouncementRow";
import { useMemo, useRef, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  useAnnouncements,
  useAssessments,
  useClassDetail,
  useClassModules,
  useSchoolEvents,
  useTeacherEnrollments,
  useTeacherModuleDeleteMutation,
  useTeacherModuleReorderMutation,
} from "../api/hooks";
import { classesApi } from "../api/services/classes";
import { assessmentsApi } from "../api/services/assessments";
import { announcementsApi } from "../api/services/announcements";
import { modulesApi } from "../api/services/modules";
import { toAppError } from "../api/http";
import type { RootStackParamList, TeacherClassDetailTab } from "../navigation/types";
import { confirmAction } from "../utils/confirmAction";
import { formatStudentIdentityLine } from "../utils/studentIdentity";
import { TeacherClassRecordBoard } from "../components/teacher/TeacherClassRecordBoard";
import { TeacherDiscussionBoard } from "../components/teacher/TeacherDiscussionBoard";
import { TeacherExtractionBoard } from "../components/teacher/TeacherExtractionBoard";
import { TeacherConfirmModal } from "../components/teacher/TeacherConfirmModal";
import { TeacherAnnouncementEditorModal } from "../components/teacher/TeacherAnnouncementEditorModal";
import { TeacherAddModuleModal } from "../components/teacher/TeacherAddModuleModal";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherClassDetail">;

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CLASS_TABS: Array<{ key: TeacherClassDetailTab; label: string }> = [
  { key: "modules", label: "Modules" },
  { key: "assessments", label: "Assessments" },
  { key: "announcements", label: "Announcements" },
  { key: "extraction", label: "Extraction" },
  { key: "discussion", label: "Discussion Board" },
  { key: "classRecord", label: "Class Record" },
  { key: "calendar", label: "Calendar" },
  { key: "students", label: "Students" },
];

export function TeacherClassDetailScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { classId, initialTab } = route.params;
  const [activeTab, setActiveTab] = useState<TeacherClassDetailTab>(initialTab ?? "modules");
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  const [deletingModule, setDeletingModule] = useState<{ id: string; title: string } | null>(null);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([]);
  const [deletingAssessment, setDeletingAssessment] = useState<{ id: string; title: string } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [creatingModule, setCreatingModule] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<{
    id?: string;
    title?: string;
    content?: string;
    isPinned?: boolean;
    scheduledAt?: string;
  } | null>(null);
  const [deletingAnnouncementModal, setDeletingAnnouncementModal] = useState<{ id: string; title: string } | null>(null);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  const tabRefetchersRef = useRef<Partial<Record<TeacherClassDetailTab, () => Promise<unknown>>>>({});
  const classQuery = useClassDetail(classId);
  const modulesQuery = useClassModules(classId);
  const assessmentsQuery = useAssessments(classId);
  const announcementsQuery = useAnnouncements(classId);
  const rosterQuery = useTeacherEnrollments(classId);
  const schoolEventsQuery = useSchoolEvents({ schoolYear: classQuery.data?.schoolYear });
  const moduleDeleteMutation = useTeacherModuleDeleteMutation(classId);
  const moduleReorderMutation = useTeacherModuleReorderMutation(classId);

  const toggleSelectAssessment = (id: string) => {
    setSelectedAssessmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAssessments = () => {
    const allIds = assessmentsQuery.data?.map((a) => a.id) ?? [];
    if (selectedAssessmentIds.length === allIds.length && allIds.length > 0) {
      setSelectedAssessmentIds([]);
    } else {
      setSelectedAssessmentIds(allIds);
    }
  };

  const handleDeleteSingleAssessment = async () => {
    if (!deletingAssessment || isDeletingAssessment) return;
    try {
      setIsDeletingAssessment(true);
      await assessmentsApi.delete(deletingAssessment.id);
      setDeletingAssessment(null);
      setSelectedAssessmentIds((prev) => prev.filter((id) => id !== deletingAssessment.id));
      await assessmentsQuery.refetch();
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
      await assessmentsQuery.refetch();
      Alert.alert("Assessments Deleted", `${selectedAssessmentIds.length} assessment(s) deleted successfully.`);
    } catch (err) {
      Alert.alert("Unable to delete assessments", toAppError(err).message);
    } finally {
      setIsDeletingAssessment(false);
    }
  };

  const handleSaveAnnouncement = async (payload: { title: string; content: string; isPinned: boolean; scheduledAt?: string }) => {
    try {
      setSavingAnnouncement(true);
      if (editingAnnouncement?.id) {
        await announcementsApi.update(classId, editingAnnouncement.id, payload);
        Alert.alert("Announcement Updated", "Your announcement changes have been saved.");
      } else {
        await announcementsApi.create(classId, payload);
        Alert.alert("Announcement Created", "Your announcement has been posted successfully.");
      }
      setShowAnnouncementModal(false);
      setEditingAnnouncement(null);
      await announcementsQuery.refetch();
    } catch (err) {
      Alert.alert("Unable to save announcement", toAppError(err).message);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncementConfirm = async () => {
    if (!deletingAnnouncementModal) return;
    try {
      await announcementsApi.delete(classId, deletingAnnouncementModal.id);
      setDeletingAnnouncementModal(null);
      await announcementsQuery.refetch();
      Alert.alert("Announcement Deleted", "The announcement was deleted successfully.");
    } catch (err) {
      Alert.alert("Unable to delete announcement", toAppError(err).message);
    }
  };

  const moveModule = async (index: number, direction: "up" | "down") => {
    const list = modulesQuery.data;
    if (!list) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const nextList = [...list];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);
    try {
      await moduleReorderMutation.mutateAsync(nextList.map((m) => m.id));
    } catch (err) {
      Alert.alert("Unable to reorder modules", toAppError(err).message);
    }
  };

  const upcomingItems = useMemo(() => {
    const assessmentItems = (assessmentsQuery.data ?? []).map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.title,
      subtitle: `Assessment - Due ${formatDate(assessment.dueDate)}`,
      sortAt: new Date(assessment.dueDate || 0).getTime(),
      action: () => navigation.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId }),
    }));

    const eventItems = (schoolEventsQuery.data ?? [])
      .filter((entry) => classQuery.data?.schoolYear && entry.schoolYear === classQuery.data.schoolYear)
      .slice(0, 4)
      .map((entry) => ({
        id: `event-${entry.id}`,
        title: entry.title,
        subtitle: `School event - ${formatDate(entry.startsAt)}`,
        sortAt: new Date(entry.startsAt).getTime(),
        action: () => navigation.navigate("TeacherCalendar", { classId }),
      }));

    return [...assessmentItems, ...eventItems]
      .sort((left, right) => left.sortAt - right.sortAt)
      .slice(0, 5);
  }, [assessmentsQuery.data, classQuery.data?.schoolYear, classId, navigation, schoolEventsQuery.data]);

  const topError = classQuery.error || modulesQuery.error || assessmentsQuery.error || announcementsQuery.error || rosterQuery.error;
  const registerTabRefetcher =
    (tab: TeacherClassDetailTab) =>
    (refetcher: () => Promise<unknown>) => {
      tabRefetchersRef.current[tab] = refetcher;
    };

  const handleCreateModule = async (payload: { title: string; description: string }) => {
    try {
      setCreatingModule(true);
      await modulesApi.create({
        classId,
        title: payload.title,
        description: payload.description || undefined,
      });
      setShowAddModuleModal(false);
      await modulesQuery.refetch();
      Alert.alert("Module Created", `"${payload.title}" has been added to this class.`);
    } catch (err) {
      Alert.alert("Unable to create module", toAppError(err).message);
    } finally {
      setCreatingModule(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (creatingAssessment) return;
    try {
      setCreatingAssessment(true);
      navigation.navigate("TeacherAssessmentEditor", { classId });
    } catch (error) {
      Alert.alert("Unable to create assessment", toAppError(error).message);
    } finally {
      setCreatingAssessment(false);
    }
  };

  return (
    <TeacherScreen
      title={classQuery.data ? `${classQuery.data.subjectCode} - ${classQuery.data.subjectName}` : "Class workspace"}
      subtitle={
        classQuery.data
          ? `${classQuery.data.section?.name || "Section pending"} - ${classQuery.data.schoolYear}`
          : "Teacher class shell"
      }
      icon="google-classroom"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={
        classQuery.isRefetching ||
        modulesQuery.isRefetching ||
        assessmentsQuery.isRefetching ||
        announcementsQuery.isRefetching ||
        rosterQuery.isRefetching
      }
      onRefresh={() => {
        const tasks: Array<Promise<unknown>> = [
          classQuery.refetch(),
          modulesQuery.refetch(),
          assessmentsQuery.refetch(),
          announcementsQuery.refetch(),
          rosterQuery.refetch(),
          schoolEventsQuery.refetch(),
        ];
        const activeTabRefetcher = tabRefetchersRef.current[activeTab];
        if (activeTabRefetcher) {
          tasks.push(activeTabRefetcher());
        }
        void Promise.all(tasks);
      }}
    >
      <TeacherStats
        items={[
          { label: "Modules", value: modulesQuery.data?.length ?? 0, tone: "red" },
          { label: "Assessments", value: assessmentsQuery.data?.length ?? 0, tone: "blue" },
          { label: "Announcements", value: announcementsQuery.data?.length ?? 0, tone: "amber" },
          { label: "Students", value: rosterQuery.data?.length ?? 0, tone: "green" },
        ]}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingRight: 20, gap: 6 }}
      >
        {CLASS_TABS.map((entry) => (
          <TeacherChip
            key={entry.key}
            label={entry.label}
            active={activeTab === entry.key}
            onPress={() => setActiveTab(entry.key)}
          />
        ))}
      </ScrollView>
      <Text style={{ marginTop: 6, marginHorizontal: 16, fontSize: 11, color: theme.muted }}>
        Swipe tabs to view all class tools, including Extraction, Discussion Board, and Class Record.
      </Text>

      <TeacherPanel title="Class actions" subtitle="Mobile shortcuts for web teacher deep workflows.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="AI draft"
            icon="robot-outline"
            tone="purple"
            onPress={() => navigation.navigate("TeacherAiDraft", { classId })}
          />
          <TeacherActionButton
            label="Add students"
            icon="account-multiple-plus-outline"
            tone="green"
            onPress={() => navigation.navigate("TeacherClassAddStudents", { classId })}
          />
        </View>
      </TeacherPanel>

      {topError ? (
        <TeacherPanel title="Class data issue" subtitle={toAppError(topError).message}>
          <TeacherEmpty title="Unable to render the full class" subtitle="Pull to refresh once the class APIs are stable again." />
        </TeacherPanel>
      ) : null}

      {activeTab === "modules" ? (
        <TeacherPanel
          title="Modules"
          subtitle="Open modules, inspect their content, and manage lock or visibility at the module level."
          action={
            <TeacherActionButton
              label="Add Module"
              icon="plus"
              tone="green"
              onPress={() => setShowAddModuleModal(true)}
            />
          }
        >
          {modulesQuery.data?.length ? (
            modulesQuery.data.map((module, index) => (
              <TeacherRow
                key={module.id}
                title={module.title}
                subtitle={`${module.sections?.length ?? 0} sections - ${module.isLocked ? "Locked" : "Unlocked"} - ${module.isVisible === false ? "Hidden" : "Visible"}`}
                onPress={() => navigation.navigate("TeacherModuleDetail", { classId, moduleId: module.id })}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    <Pressable
                      onPress={() => void moveModule(index, "up")}
                      disabled={index === 0 || moduleReorderMutation.isPending}
                      style={{ padding: 6, opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <MaterialCommunityIcons name="chevron-up" size={20} color={theme.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => void moveModule(index, "down")}
                      disabled={index === (modulesQuery.data?.length ?? 0) - 1 || moduleReorderMutation.isPending}
                      style={{ padding: 6, opacity: index === (modulesQuery.data?.length ?? 0) - 1 ? 0.3 : 1 }}
                    >
                      <MaterialCommunityIcons name="chevron-down" size={20} color={theme.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => setDeletingModule({ id: module.id, title: module.title })}
                      style={{ padding: 6 }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.red} />
                    </Pressable>
                  </View>
                }
              />
            ))
          ) : (
            <TeacherEmpty title="No modules yet" subtitle="Class modules will appear here once they are attached or published." icon="view-module-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "assessments" ? (
        <TeacherPanel
          title="Assessments"
          subtitle="Select assessments to bulk delete, or open one to review submissions, grade attempts, or edit."
          action={
            <View style={{ flexDirection: "row", gap: 8 }}>
              {selectedAssessmentIds.length > 0 ? (
                <TeacherActionButton
                  label={`Delete Selected (${selectedAssessmentIds.length})`}
                  icon="trash-can-outline"
                  tone="red"
                  onPress={() => setShowBulkDeleteConfirm(true)}
                />
              ) : null}
              <TeacherActionButton
                label={creatingAssessment ? "Creating..." : "Create"}
                icon="plus"
                tone="green"
                disabled={creatingAssessment}
                onPress={() => void handleCreateAssessment()}
              />
            </View>
          }
        >
          {assessmentsQuery.data?.length ? (
            <>
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
                      selectedAssessmentIds.length === (assessmentsQuery.data?.length ?? 0)
                        ? "checkbox-marked"
                        : selectedAssessmentIds.length > 0
                        ? "checkbox-intermediate"
                        : "checkbox-blank-outline"
                    }
                    size={20}
                    color={selectedAssessmentIds.length > 0 ? theme.red : theme.muted}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>
                    {selectedAssessmentIds.length === (assessmentsQuery.data?.length ?? 0)
                      ? "Deselect All"
                      : "Select All"}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 11, color: theme.muted }}>
                  {selectedAssessmentIds.length} of {assessmentsQuery.data.length} selected
                </Text>
              </View>

              {assessmentsQuery.data.map((assessment) => {
                const isSelected = selectedAssessmentIds.includes(assessment.id);
                return (
                  <TeacherRow
                    key={assessment.id}
                    title={assessment.title}
                    subtitle={`${assessment.isPublished ? "Published" : "Draft"} - ${assessment.type.replace(/_/g, " ")} - Due ${formatDate(assessment.dueDate)}`}
                    left={
                      <Pressable
                        onPress={() => toggleSelectAssessment(assessment.id)}
                        hitSlop={8}
                        style={{ paddingRight: 4 }}
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                          size={20}
                          color={isSelected ? theme.red : theme.dim}
                        />
                      </Pressable>
                    }
                    onPress={() =>
                      navigation.navigate("TeacherAssessmentDetail", {
                        assessmentId: assessment.id,
                        classId,
                      })
                    }
                    right={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${assessment.title}`}
                          onPress={() =>
                            navigation.navigate("TeacherAssessmentEditor", {
                              assessmentId: assessment.id,
                              classId,
                            })
                          }
                          style={{
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.border,
                            backgroundColor: theme.active,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            minWidth: 44,
                            minHeight: 44,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>Edit</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${assessment.title}`}
                          onPress={() => setDeletingAssessment({ id: assessment.id, title: assessment.title })}
                          style={{
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.redLine,
                            backgroundColor: theme.redSoft,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            minWidth: 44,
                            minHeight: 44,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color={theme.red} />
                        </Pressable>
                      </View>
                    }
                  />
                );
              })}
            </>
          ) : (
            <TeacherEmpty title="No assessments yet" subtitle="Assessments assigned to this class will appear here." icon="clipboard-text-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "announcements" ? (
        <TeacherPanel
          title="Announcements"
          subtitle="Publish class updates with rich formatting, pin posts, or schedule announcements."
          action={
            <TeacherActionButton
              label="Create Announcement"
              icon="plus"
              tone="green"
              onPress={() => {
                setEditingAnnouncement(null);
                setShowAnnouncementModal(true);
              }}
            />
          }
        >
          {announcementsQuery.data?.length ? (
            announcementsQuery.data.map((announcement) => (
              <TeacherAnnouncementRow
                key={announcement.id}
                announcement={announcement}
                onEdit={(entry) => {
                  setEditingAnnouncement({
                    id: entry.id,
                    title: entry.title,
                    content: entry.content,
                    isPinned: Boolean(entry.isPinned),
                    scheduledAt: entry.scheduledAt || "",
                  });
                  setShowAnnouncementModal(true);
                }}
                onDelete={(entry) => setDeletingAnnouncementModal({ id: entry.id, title: entry.title })}
              />
            ))
          ) : (
            <TeacherEmpty title="No announcements yet" subtitle="Tap 'Create Announcement' above to publish quick class updates." icon="bullhorn-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "extraction" ? (
        <TeacherExtractionBoard
          classId={classId}
          classItem={classQuery.data}
          registerRefetch={registerTabRefetcher("extraction")}
          onOpenExtraction={(extractionId) =>
            navigation.navigate("TeacherExtractionDetail", { extractionId, classId })
          }
        />
      ) : null}

      {activeTab === "discussion" ? (
        <TeacherDiscussionBoard
          classId={classId}
          registerRefetch={registerTabRefetcher("discussion")}
        />
      ) : null}

      {activeTab === "classRecord" ? (
        <TeacherClassRecordBoard
          classId={classId}
          registerRefetch={registerTabRefetcher("classRecord")}
        />
      ) : null}

      {activeTab === "calendar" ? (
        <TeacherPanel title="Class Calendar" subtitle="School events and assessment due dates mapped to this class section.">
          {upcomingItems.length ? (
            upcomingItems.map((item) => (
              <TeacherRow key={item.id} title={item.title} subtitle={item.subtitle} onPress={item.action} />
            ))
          ) : (
            <TeacherEmpty title="No upcoming items" subtitle="No events or assessment deadlines are currently scheduled." icon="calendar-blank-outline" />
          )}
        </TeacherPanel>
      ) : null}

      {activeTab === "students" ? (
        <TeacherPanel
          title="Students & Roster"
          subtitle="Learners enrolled in this class section."
          action={
            <TeacherActionButton
              label="Manage roster"
              icon="account-multiple-plus-outline"
              tone="blue"
              onPress={() =>
                navigation.navigate("TeacherClassAddStudents", {
                  classId,
                })
              }
            />
          }
        >
          {rosterQuery.data?.length ? (
            rosterQuery.data.map((entry) => {
              const studentId = entry.student?.id || entry.studentId;
              const name = [entry.student?.firstName, entry.student?.lastName].filter(Boolean).join(" ").trim() || entry.student?.email || "Student";
              return (
                <TeacherRow
                  key={entry.id}
                  title={name}
                  subtitle={formatStudentIdentityLine(entry.student, "No LRN or email available")}
                  right={
                    studentId ? (
                      <TeacherActionButton
                        label="Remove"
                        tone="red"
                        onPress={() => {
                          Alert.alert(
                            "Remove Student",
                            `Are you sure you want to remove ${name} from this class?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Remove",
                                style: "destructive",
                                onPress: async () => {
                                  try {
                                    await classesApi.unenrollStudent(classId, studentId);
                                    queryClient.setQueryData(
                                      queryKeys.teacherEnrollments(classId),
                                      (old: any) => (Array.isArray(old) ? old.filter((item: any) => (item.student?.id || item.studentId) !== studentId) : [])
                                    );
                                    await queryClient.invalidateQueries({ queryKey: queryKeys.teacherEnrollments(classId) });
                                    await rosterQuery.refetch();
                                    Alert.alert("Student removed", `${name} was removed from this class.`);
                                  } catch (err) {
                                    Alert.alert("Unable to remove student", toAppError(err).message);
                                  }
                                },
                              },
                            ],
                          );
                        }}
                      />
                    ) : undefined
                  }
                />
              );
            })
          ) : (
            <TeacherEmpty title="No roster loaded" subtitle="Enrolled learners will appear here when the class roster is available." icon="account-group-outline" />
          )}
        </TeacherPanel>
      ) : null}

      <TeacherConfirmModal
        visible={Boolean(deletingModule)}
        title="Delete Module"
        description={
          deletingModule
            ? `Are you sure you want to delete "${deletingModule.title}"? This action cannot be undone.`
            : ""
        }
        loading={moduleDeleteMutation.isPending}
        onCancel={() => setDeletingModule(null)}
        onConfirm={async () => {
          if (!deletingModule) return;
          try {
            await moduleDeleteMutation.mutateAsync(deletingModule.id);
            setDeletingModule(null);
          } catch (err) {
            Alert.alert("Error", toAppError(err).message);
          }
        }}
      />

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

      <TeacherAnnouncementEditorModal
        visible={showAnnouncementModal}
        className={classQuery.data?.subjectName}
        editingId={editingAnnouncement?.id}
        initialTitle={editingAnnouncement?.title ?? ""}
        initialContent={editingAnnouncement?.content ?? ""}
        initialPinned={editingAnnouncement?.isPinned ?? false}
        initialScheduledAt={editingAnnouncement?.scheduledAt ?? ""}
        saving={savingAnnouncement}
        onSave={(payload) => void handleSaveAnnouncement(payload)}
        onClose={() => {
          setShowAnnouncementModal(false);
          setEditingAnnouncement(null);
        }}
      />

      <TeacherAddModuleModal
        visible={showAddModuleModal}
        className={classQuery.data?.subjectName}
        saving={creatingModule}
        onSave={(payload) => void handleCreateModule(payload)}
        onClose={() => setShowAddModuleModal(false)}
      />

      <TeacherConfirmModal
        visible={Boolean(deletingAnnouncementModal)}
        title="Delete Announcement?"
        description={
          deletingAnnouncementModal
            ? `Are you sure you want to delete "${deletingAnnouncementModal.title}"? This action cannot be undone.`
            : ""
        }
        onCancel={() => setDeletingAnnouncementModal(null)}
        onConfirm={() => void handleDeleteAnnouncementConfirm()}
      />
    </TeacherScreen>
  );
}
