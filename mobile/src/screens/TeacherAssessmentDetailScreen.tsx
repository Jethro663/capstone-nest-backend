import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Modal, Text, View } from "react-native";
import { AppAlert as Alert } from "../components/ui/AppAlert";
import {
  useAssessmentDetail,
  useTeacherAssessmentSubmissions,
  useTeacherAssessmentUpdateMutation,
  useTeacherDeleteAssessmentMutation,
} from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import type { AssessmentQuestionAnalytics } from "../types/assessment";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherSelectMenu,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherActionSheet,
  TeacherFlatSection,
  TeacherSegmentedTabs,
  TeacherSummaryStrip,
} from "../components/teacher/TeacherWorkspacePrimitives";
import { MobileFilterSheet } from "../components/ui/MobileFilterSheet";
import { MobileScoreState } from "../components/ui/MobileScoreState";
import { mobileBrand } from "../theme/mobileBrand";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherAssessmentDetail"
>;

type AssessmentTab = "overview" | "submissions" | "analytics";
type SubmissionFilter = "all" | "turned_in" | "missing" | "not_started" | "returned";
type SubmissionSort = "recent" | "name" | "status";

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeleteConfirmModal({
  visible,
  title,
  deleting,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: mobileBrand.scrimStrong,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: theme.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 20,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.redSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color={theme.red}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "800", color: theme.text }}
              >
                Delete Assessment?
              </Text>
              <Text style={{ fontSize: 11, color: theme.muted }}>
                This action cannot be undone
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 13, color: theme.text, lineHeight: 18 }}>
            Are you sure you want to delete{" "}
            <Text style={{ fontWeight: "800" }}>"{title}"</Text>? All student
            responses, attempts, and grades linked to this assessment will be
            permanently removed.
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 4,
            }}
          >
            <TeacherActionButton
              label="Cancel"
              tone="neutral"
              disabled={deleting}
              onPress={onClose}
            />
            <TeacherActionButton
              label={deleting ? "Deleting..." : "Delete Assessment"}
              icon="trash-can-outline"
              tone="red"
              disabled={deleting}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function TeacherAssessmentDetailScreen({ navigation, route }: Props) {
  const { assessmentId, classId } = route.params;
  const assessmentQuery = useAssessmentDetail(assessmentId);
  const submissionsQuery = useTeacherAssessmentSubmissions(assessmentId);
  const statsQuery = useQuery({
    queryKey: ["teacher-assessment-stats", assessmentId],
    queryFn: () => assessmentsApi.getStats(assessmentId),
  });
  const analyticsQuery = useQuery({
    queryKey: ["teacher-assessment-question-analytics", assessmentId],
    queryFn: () => assessmentsApi.getQuestionAnalytics(assessmentId),
  });
  const updateMutation = useTeacherAssessmentUpdateMutation(assessmentId);
  const deleteMutation = useTeacherDeleteAssessmentMutation(assessmentId);
  const [activeTab, setActiveTab] = useState<AssessmentTab>("overview");
  const [submissionFilter, setSubmissionFilter] =
    useState<SubmissionFilter>("all");
  const [submissionSort, setSubmissionSort] =
    useState<SubmissionSort>("recent");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [manageVisible, setManageVisible] = useState(false);
  const [releasingGrades, setReleasingGrades] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<AssessmentQuestionAnalytics | null>(null);

  const assessment = assessmentQuery.data;
  const submissions = submissionsQuery.data;
  const dueTimestamp = assessment?.dueDate
    ? new Date(assessment.dueDate).getTime()
    : Number.NaN;
  const dueHasPassed =
    Number.isFinite(dueTimestamp) && dueTimestamp < Date.now();
  const submissionBucket = (status: string): SubmissionFilter => {
    if (status === "returned") return "returned";
    if (status === "turned_in") return "turned_in";
    return dueHasPassed ? "missing" : "not_started";
  };

  const visibleSubmissions = useMemo(() => {
    const query = submissionSearch.trim().toLowerCase();
    return (submissions?.submissions ?? [])
      .filter((submission) => {
        if (
          submissionFilter !== "all" &&
          submissionBucket(submission.status) !== submissionFilter
        ) {
          return false;
        }
        return (
          !query ||
          (submission.studentName + " " + (submission.studentEmail ?? ""))
            .toLowerCase()
            .includes(query)
        );
      })
      .slice()
      .sort((left, right) => {
        if (submissionSort === "name") {
          return left.studentName.localeCompare(right.studentName);
        }
        if (submissionSort === "status") {
          return submissionBucket(left.status).localeCompare(
            submissionBucket(right.status),
          );
        }
        return (
          new Date(right.latestAttemptSubmittedAt || 0).getTime() -
          new Date(left.latestAttemptSubmittedAt || 0).getTime()
        );
      });
  }, [
    dueHasPassed,
    submissionFilter,
    submissionSearch,
    submissionSort,
    submissions?.submissions,
  ]);

  const submissionRows = submissions?.submissions ?? [];
  const submissionCounts: Record<SubmissionFilter, number> = {
    all: submissionRows.length,
    turned_in: submissionRows.filter(
      (entry) => submissionBucket(entry.status) === "turned_in",
    ).length,
    missing: submissionRows.filter(
      (entry) => submissionBucket(entry.status) === "missing",
    ).length,
    not_started: submissionRows.filter(
      (entry) => submissionBucket(entry.status) === "not_started",
    ).length,
    returned: submissionRows.filter(
      (entry) => submissionBucket(entry.status) === "returned",
    ).length,
  };

  const openEditor = () => {
    if (!assessment) return;
    navigation.navigate("TeacherAssessmentEditor", {
      assessmentId: assessment.id,
      classId: assessment.classId || classId,
    });
  };

  const handleBatchReleaseGrades = async () => {
    if (!submissions?.submissions || releasingGrades) return;
    const unreturnedSubmissions = submissions.submissions.filter(
      (submission) =>
        submission.latestAttemptId && !submission.latestAttemptReturnedAt,
    );
    if (!unreturnedSubmissions.length) {
      Alert.alert(
        "No unreturned grades",
        "All submitted attempts have already been released.",
      );
      return;
    }
    try {
      setReleasingGrades(true);
      await assessmentsApi.bulkReturnGrades({
        attemptIds: unreturnedSubmissions.flatMap((submission) =>
          submission.latestAttemptId ? [submission.latestAttemptId] : [],
        ),
      });
      await submissionsQuery.refetch();
      Alert.alert(
        "Success",
        "Released grades for " +
          unreturnedSubmissions.length +
          " student submission(s).",
      );
    } catch (error) {
      Alert.alert("Unable to release grades", toAppError(error).message);
    } finally {
      setReleasingGrades(false);
    }
  };

  const togglePublished = async () => {
    if (!assessment) return;
    if (
      !assessment.academicCapabilities?.canPrepare ||
      (!assessment.isPublished &&
        !assessment.academicCapabilities?.canRelease)
    ) {
      Alert.alert(
        "Academic period restriction",
        assessment.academicCapabilities?.readOnlyReason ||
          "Release requires the active editable period.",
      );
      return;
    }
    if (
      !assessment.isPublished &&
      assessment.type !== "file_upload" &&
      (!assessment.questions || assessment.questions.length === 0)
    ) {
      Alert.alert(
        "Cannot publish assessment",
        "Please add at least 1 question to the assessment before publishing.",
      );
      return;
    }
    try {
      await updateMutation.mutateAsync({
        isPublished: !assessment.isPublished,
      });
      Alert.alert(
        "Publish status updated",
        assessment.isPublished
          ? "Assessment moved to draft mode."
          : "Assessment published successfully! Students can now view it.",
      );
    } catch (error) {
      Alert.alert("Unable to update assessment", toAppError(error).message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync();
      setShowDeleteConfirmModal(false);
      Alert.alert(
        "Assessment Deleted",
        "The assessment has been deleted successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              const targetClassId = classId || assessment?.classId;
              if (targetClassId) {
                navigation.navigate("TeacherClassDetail", {
                  classId: targetClassId,
                  initialTab: "assessments",
                });
              } else {
                navigation.goBack();
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Unable to delete assessment", toAppError(error).message);
    }
  };

  const filterItems: Array<[SubmissionFilter, string]> = [
    ["all", "All"],
    ["turned_in", "Turned in"],
    ...(assessment?.dueDate
      ? ([["missing", "Missing"]] as Array<[SubmissionFilter, string]>)
      : []),
    ["not_started", "Not turned in"],
    ["returned", "Returned"],
  ];

  return (
    <TeacherScreen
      title={assessment?.title || "Assessment"}
      subtitle="Review learner work, evidence, and lifecycle controls."
      icon="clipboard-check-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={
        assessmentQuery.isRefetching ||
        submissionsQuery.isRefetching ||
        statsQuery.isRefetching ||
        analyticsQuery.isRefetching
      }
      onRefresh={() => {
        void Promise.all([
          assessmentQuery.refetch(),
          submissionsQuery.refetch(),
          statsQuery.refetch(),
          analyticsQuery.refetch(),
        ]);
      }}
    >
      {assessment ? (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", gap: 8 }}>
            <TeacherActionButton label="Preview" icon="eye-outline" tone="neutral" onPress={openEditor} />
            <TeacherActionButton label="Manage assessment" icon="tune-variant" tone="red" onPress={() => setManageVisible(true)} />
          </View>
          <TeacherSegmentedTabs
            accessibilityLabel="Assessment sections"
            activeKey={activeTab}
            onSelect={setActiveTab}
            items={[
              { key: "overview", label: "Overview" },
              { key: "submissions", label: "Submissions", count: submissions?.summary.total ?? 0 },
              { key: "analytics", label: "Analytics" },
            ]}
          />

          {activeTab === "overview" ? (
            <TeacherFlatSection
              title="Overview"
              subtitle={
                assessment.description
                  ? stripRichText(assessment.description)
                  : "Core assessment details visible to this class."
              }
            >
              <View testID="assessment-overview-callout" style={{ margin: 14, borderRadius: 16, backgroundColor: mobileBrand.navy, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7, color: mobileBrand.inverseMuted }}>{assessment.type.replace(/_/g, " ")}</Text>
                    <Text style={{ marginTop: 5, fontSize: 18, fontWeight: "900", color: mobileBrand.white }}>{assessment.isPublished ? "Ready for learners" : "Draft in preparation"}</Text>
                  </View>
                  <View style={{ borderRadius: 999, backgroundColor: assessment.isPublished ? mobileBrand.success : mobileBrand.warning, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", color: mobileBrand.white }}>{assessment.isPublished ? "PUBLISHED" : "DRAFT"}</Text>
                  </View>
                </View>
                <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: mobileBrand.inverseMuted }}>Due {formatDate(assessment.dueDate)} · {assessment.totalPoints ?? 0} points · {assessment.questions?.length ?? 0} questions</Text>
              </View>
              <TeacherRow title="Assessment type" subtitle={assessment.type.replace(/_/g, " ")} />
              <TeacherRow title="Due date" subtitle={formatDate(assessment.dueDate)} />
              <TeacherRow title="Passing score" subtitle={assessment.passingScore != null ? assessment.passingScore + "%" : "Not set"} />
              <TeacherRow title="Questions" subtitle={(assessment.questions?.length ?? 0) + " question" + ((assessment.questions?.length ?? 0) === 1 ? "" : "s")} />
            </TeacherFlatSection>
          ) : null}

          {activeTab === "submissions" ? (
            <>
              <TeacherSearch value={submissionSearch} onChangeText={setSubmissionSearch} placeholder="Search learner name or email" />
              <View style={{ marginHorizontal: 16, marginTop: 10 }}>
                <MobileFilterSheet
                  label="Filter submissions"
                  activeKey={submissionFilter}
                  options={filterItems.map(([key, label]) => ({ key, label, count: submissionCounts[key] }))}
                  onSelect={setSubmissionFilter}
                  resultCount={visibleSubmissions.length}
                  compact
                />
              </View>
              <TeacherSelectMenu
                label="Sort submissions"
                selectedValue={submissionSort}
                options={[
                  { value: "recent", label: "Recent activity" },
                  { value: "name", label: "Learner name" },
                  { value: "status", label: "Submission status" },
                ]}
                onSelect={(value) => setSubmissionSort(value as SubmissionSort)}
              />
              <TeacherFlatSection
                title="Submissions"
                subtitle={visibleSubmissions.length + " learner" + (visibleSubmissions.length === 1 ? "" : "s") + " match the current view."}
              >
                {visibleSubmissions.length ? (
                  visibleSubmissions.map((submission) => {
                    const displayStatus = submissionBucket(submission.status);
                    const canOpen =
                      Boolean(submission.latestAttemptId) &&
                      (submission.status === "turned_in" ||
                        submission.status === "returned");
                    return (
                      <TeacherRow
                        key={[submission.studentId, submission.latestAttemptId || submission.studentEmail || submission.studentName].join("-")}
                        title={submission.studentName}
                        subtitle={
                          displayStatus.replace(/_/g, " ") +
                          (submission.latestAttemptSubmittedAt
                            ? " · " + formatDate(submission.latestAttemptSubmittedAt)
                            : " · No submitted attempt")
                        }
                        onPress={
                          canOpen
                            ? () =>
                                navigation.navigate("TeacherAssessmentAttemptResult", {
                                  attemptId: submission.latestAttemptId as string,
                                  assessmentId,
                                  classId,
                                })
                            : undefined
                        }
                        right={
                          <MobileScoreState
                            score={submission.directScore ?? submission.latestAttemptScore}
                            maximum={assessment.totalPoints}
                            state={displayStatus}
                            label={displayStatus.replace(/_/g, " ")}
                          />
                        }
                      />
                    );
                  })
                ) : (
                  <TeacherEmpty title="No learners match this view" subtitle="Change the status filter or search to review another group." icon="account-search-outline" />
                )}
              </TeacherFlatSection>
            </>
          ) : null}

          {activeTab === "analytics" ? (
            <>
              <TeacherSummaryStrip
                items={[
                  { label: "Completion", value: (statsQuery.data?.completionRate ?? 0) + "%", tone: "blue" },
                  { label: "Average", value: (statsQuery.data?.averageScore ?? 0) + "%", tone: "red" },
                  { label: "Pass rate", value: (statsQuery.data?.passRate ?? 0) + "%", tone: "green" },
                ]}
              />
              <TeacherFlatSection
                title="Question analytics"
                subtitle={(analyticsQuery.data?.uniqueSubmitterCount ?? analyticsQuery.data?.totalResponses ?? 0) + " learners represented in current server evidence."}
              >
                {statsQuery.isError || analyticsQuery.isError ? (
                  <TeacherRow title="Analytics unavailable" subtitle={toAppError(statsQuery.error || analyticsQuery.error).message} />
                ) : analyticsQuery.data?.questions.length ? (
                  analyticsQuery.data.questions.map((question, index) => (
                    <TeacherRow
                      key={question.questionId}
                      title={"Q" + (index + 1) + ": " + stripRichText(question.content)}
                      subtitle={question.correctPercent + "% correct · " + question.correctCount + "/" + question.totalResponses + " responses · " + question.averagePoints + "/" + question.points + " average points"}
                      onPress={() => setSelectedQuestion(question)}
                    />
                  ))
                ) : (
                  <TeacherEmpty title="No question evidence yet" subtitle="Analytics will appear after learners submit attempts." icon="chart-box-outline" />
                )}
              </TeacherFlatSection>
            </>
          ) : null}

          <TeacherActionSheet
            visible={Boolean(selectedQuestion)}
            title="Question analysis"
            subtitle="Server-confirmed response evidence for this question."
            onClose={() => setSelectedQuestion(null)}
          >
            {selectedQuestion ? (
              <View testID="question-analytics-detail" style={{ paddingBottom: 20, gap: 14 }}>
                <View style={{ borderRadius: 16, backgroundColor: mobileBrand.navy, padding: 16 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "900", color: mobileBrand.white }}>{stripRichText(selectedQuestion.content)}</Text>
                  <View style={{ marginTop: 12, flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 22, fontWeight: "900", color: mobileBrand.white }}>{selectedQuestion.correctPercent}%</Text><Text style={{ fontSize: 10, color: mobileBrand.inverseMuted }}>Correct</Text></View>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 22, fontWeight: "900", color: mobileBrand.white }}>{selectedQuestion.correctCount}</Text><Text style={{ fontSize: 10, color: mobileBrand.inverseMuted }}>Right answers</Text></View>
                    <View style={{ flex: 1 }}><Text style={{ fontSize: 22, fontWeight: "900", color: mobileBrand.white }}>{selectedQuestion.totalResponses - selectedQuestion.correctCount}</Text><Text style={{ fontSize: 10, color: mobileBrand.inverseMuted }}>Wrong answers</Text></View>
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: mobileBrand.text }}>Answer distribution</Text>
                  {selectedQuestion.options.length ? selectedQuestion.options.map((option) => (
                    <View key={option.optionId} style={{ minHeight: 52, borderBottomWidth: 1, borderBottomColor: mobileBrand.border, flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialCommunityIcons name={option.isCorrect ? "check-circle" : "circle-outline"} size={19} color={option.isCorrect ? mobileBrand.success : mobileBrand.muted} />
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: option.isCorrect ? "800" : "600", color: mobileBrand.text }}>{option.text}</Text>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: mobileBrand.navy }}>{option.selectionCount} · {option.selectionPercent}%</Text>
                    </View>
                  )) : <Text style={{ marginTop: 8, fontSize: 12, color: mobileBrand.muted }}>No option distribution is available for this question type.</Text>}
                </View>
                {selectedQuestion.textAnswers.length ? (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: mobileBrand.text }}>Submitted text answers</Text>
                    {selectedQuestion.textAnswers.map((answer, index) => <View key={`${index}-${answer}`} style={{ marginTop: 8, borderRadius: 12, backgroundColor: mobileBrand.surfaceMuted, padding: 12 }}><Text style={{ fontSize: 12, lineHeight: 18, color: mobileBrand.text }}>{answer}</Text></View>)}
                  </View>
                ) : null}
                <Text style={{ fontSize: 11, color: mobileBrand.muted }}>Average points: {selectedQuestion.averagePoints}/{selectedQuestion.points} from {selectedQuestion.totalResponses} responses.</Text>
              </View>
            ) : null}
          </TeacherActionSheet>

          <TeacherActionSheet
            visible={manageVisible}
            title="Manage assessment"
            subtitle={assessment.academicCapabilities?.readOnlyReason || "Lifecycle actions use the existing academic rules."}
            onClose={() => setManageVisible(false)}
          >
            <View style={{ paddingBottom: 18, gap: 8 }}>
              <TeacherActionButton
                label={assessment.academicCapabilities?.canPrepare ? "Edit details and questions" : "Review restrictions"}
                icon="pencil-outline"
                tone="blue"
                onPress={() => {
                  setManageVisible(false);
                  openEditor();
                }}
              />
              <TeacherActionButton
                label={assessment.isPublished ? "Move to draft" : "Publish assessment"}
                icon={assessment.isPublished ? "file-hidden" : "publish"}
                tone={assessment.isPublished ? "amber" : "green"}
                onPress={() => void togglePublished()}
                disabled={updateMutation.isPending || !assessment.academicCapabilities?.canPrepare || (!assessment.isPublished && !assessment.academicCapabilities?.canRelease)}
              />
              <TeacherActionButton
                label={releasingGrades ? "Releasing..." : "Release grades"}
                icon="send-outline"
                tone="green"
                onPress={() => void handleBatchReleaseGrades()}
                disabled={releasingGrades || !assessment.academicCapabilities?.canGrade}
              />
              {assessment.teacherAttachmentFile ? (
                <TeacherActionButton
                  label="Open teacher attachment"
                  icon="paperclip"
                  tone="blue"
                  onPress={() => void assessmentsApi.openTeacherAttachment(assessment.id, assessment.teacherAttachmentFile?.originalName || "teacher-attachment")}
                />
              ) : null}
              <TeacherActionButton
                label="Delete assessment"
                icon="trash-can-outline"
                tone="red"
                onPress={() => {
                  setManageVisible(false);
                  setShowDeleteConfirmModal(true);
                }}
                disabled={deleteMutation.isPending}
              />
            </View>
          </TeacherActionSheet>
        </>
      ) : (
        <TeacherFlatSection
          title="Assessment unavailable"
          subtitle={assessmentQuery.error ? toAppError(assessmentQuery.error).message : "Loading assessment"}
        />
      )}

      <DeleteConfirmModal
        visible={showDeleteConfirmModal}
        title={assessment?.title || "Assessment"}
        deleting={deleteMutation.isPending}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => setShowDeleteConfirmModal(false)}
      />
    </TeacherScreen>
  );
}
