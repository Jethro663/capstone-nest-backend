import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import {
  useAssessmentDetail,
  useTeacherAssessmentSubmissions,
  useTeacherAssessmentUpdateMutation,
  useTeacherDeleteAssessmentMutation,
} from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherAssessmentDetail"
>;

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
          backgroundColor: "rgba(0,0,0,0.65)",
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
  const statsQuery = useQuery({ queryKey: ["teacher-assessment-stats", assessmentId], queryFn: () => assessmentsApi.getStats(assessmentId) });
  const analyticsQuery = useQuery({ queryKey: ["teacher-assessment-question-analytics", assessmentId], queryFn: () => assessmentsApi.getQuestionAnalytics(assessmentId) });
  const updateMutation = useTeacherAssessmentUpdateMutation(assessmentId);
  const [releasingGrades, setReleasingGrades] = useState(false);
  const assessment = assessmentQuery.data;
  const submissions = submissionsQuery.data;

  const turnedIn = submissions?.summary.turnedIn ?? 0;
  const returned = submissions?.summary.returned ?? 0;

  const handleBatchReleaseGrades = async () => {
    if (!submissions?.submissions || releasingGrades) return;
    const unreturnedSubmissions = submissions.submissions.filter(
      (s) => s.latestAttemptId && !s.latestAttemptReturnedAt,
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
      await assessmentsApi.bulkReturnGrades({ attemptIds: unreturnedSubmissions.flatMap((submission) => submission.latestAttemptId ? [submission.latestAttemptId] : []) });
      await submissionsQuery.refetch();
      Alert.alert(
        "Success",
        `Released grades for ${unreturnedSubmissions.length} student submission(s).`,
      );
    } catch (err) {
      Alert.alert("Unable to release grades", toAppError(err).message);
    } finally {
      setReleasingGrades(false);
    }
  };

  const togglePublished = async () => {
    if (!assessment) return;
    if (
      !assessment.academicCapabilities?.canPrepare ||
      (!assessment.isPublished && !assessment.academicCapabilities?.canRelease)
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

  const deleteMutation = useTeacherDeleteAssessmentMutation(assessmentId);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

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

  const latestSubmissions = useMemo(
    () =>
      submissions?.submissions
        .slice()
        .sort(
          (left, right) =>
            new Date(right.latestAttemptSubmittedAt || 0).getTime() -
            new Date(left.latestAttemptSubmittedAt || 0).getTime(),
        ) ?? [],
    [submissions?.submissions],
  );

  return (
    <TeacherScreen
      title={assessment?.title || "Assessment detail"}
      subtitle={
        assessment?.description
          ? stripRichText(assessment.description)
          : "Review submissions and return grades from the current mobile shell."
      }
      icon="clipboard-check-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.redSoft,
          }}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={18}
            color={theme.red}
          />
        </Pressable>
      }
      refreshing={assessmentQuery.isRefetching || submissionsQuery.isRefetching}
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
          <TeacherStats
            items={[
              {
                label: "Questions",
                value: assessment.questions?.length ?? 0,
                tone: "red",
              },
              { label: "Turned In", value: turnedIn, tone: "amber" },
              { label: "Returned", value: returned, tone: "green" },
              {
                label: "Due",
                value: formatDate(assessment.dueDate),
                tone: "blue",
              },
            ]}
          />

          <TeacherPanel
            title="Assessment controls"
            subtitle={assessment.academicCapabilities?.canPrepare ? "Edit content in the assessment editor. Review submissions below." : assessment.academicCapabilities?.readOnlyReason || "Academic settings must be loaded before editing."}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingBottom: 14,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <TeacherActionButton
                label={assessment.academicCapabilities?.canPrepare ? "Edit assessment" : "Review assessment and restrictions"}
                icon="pencil-outline"
                tone="blue"
                onPress={() =>
                  navigation.navigate("TeacherAssessmentEditor", {
                    assessmentId: assessment.id,
                    classId: assessment.classId || classId,
                  })
                }
              />
              <TeacherActionButton
                label={
                  assessment.isPublished
                    ? "Move to draft"
                    : "Publish assessment"
                }
                icon={assessment.isPublished ? "file-hidden" : "publish"}
                tone={assessment.isPublished ? "amber" : "green"}
                onPress={() => void togglePublished()}
                disabled={
                  updateMutation.isPending ||
                  !assessment.academicCapabilities?.canPrepare ||
                  (!assessment.isPublished &&
                    !assessment.academicCapabilities?.canRelease)
                }
              />
              <TeacherActionButton
                label={releasingGrades ? "Releasing..." : "Release grades"}
                icon="send-outline"
                tone="green"
                onPress={() => void handleBatchReleaseGrades()}
                disabled={
                  releasingGrades || !assessment.academicCapabilities?.canGrade
                }
              />
              <TeacherActionButton
                label="Delete assessment"
                icon="trash-can-outline"
                tone="red"
                onPress={() => setShowDeleteConfirmModal(true)}
                disabled={deleteMutation.isPending}
              />
              {assessment.teacherAttachmentFile ? (
                <TeacherActionButton
                  label="Teacher attachment"
                  icon="paperclip"
                  tone="blue"
                  onPress={() =>
                    void assessmentsApi.openTeacherAttachment(
                      assessment.id,
                      assessment.teacherAttachmentFile?.originalName ||
                        "teacher-attachment",
                    )
                  }
                />
              ) : null}
            </View>
          </TeacherPanel>

          <TeacherPanel
            title="Overview"
            subtitle="Core assessment details students are also reacting to on their mobile side."
          >
            <TeacherRow
              title="Status"
              subtitle={
                assessment.isPublished
                  ? "Published and visible to students."
                  : "Draft only; students cannot open it yet."
              }
            />
            <TeacherRow
              title="Assessment type"
              subtitle={assessment.type.replace(/_/g, " ")}
            />
            <TeacherRow
              title="Due date"
              subtitle={formatDate(assessment.dueDate)}
            />
            <TeacherRow
              title="Passing score"
              subtitle={
                assessment.passingScore != null
                  ? `${assessment.passingScore}%`
                  : "Not set"
              }
            />
          </TeacherPanel>

          <TeacherPanel title="Statistics and question analytics" subtitle="Live server summaries for all attempts, including ongoing and returned work.">
            {statsQuery.isError || analyticsQuery.isError ? (
              <TeacherRow title="Analytics unavailable" subtitle={toAppError(statsQuery.error || analyticsQuery.error).message} />
            ) : (
              <>
                <TeacherRow title="Attempt completion" subtitle={`${statsQuery.data?.submittedAttempts ?? 0}/${statsQuery.data?.totalAttempts ?? 0} submitted · ${statsQuery.data?.completionRate ?? 0}% of ${statsQuery.data?.totalEnrolled ?? 0} enrolled`} />
                <TeacherRow title="Score distribution" subtitle={`${statsQuery.data?.averageScore ?? 0}% average · ${statsQuery.data?.lowestScore ?? 0}-${statsQuery.data?.highestScore ?? 0}% range · ${statsQuery.data?.passRate ?? 0}% pass`} />
                <TeacherRow title="Response coverage" subtitle={`${analyticsQuery.data?.uniqueSubmitterCount ?? analyticsQuery.data?.totalResponses ?? 0} learners · ${analyticsQuery.data?.questions.length ?? 0} questions analyzed`} />
                {(analyticsQuery.data?.questions ?? []).map((question, index) => (
                  <TeacherRow key={question.questionId} title={`Q${index + 1}: ${stripRichText(question.content)}`} subtitle={`${question.correctPercent}% correct · ${question.correctCount}/${question.totalResponses} correct · ${question.averagePoints}/${question.points} average points`} />
                ))}
              </>
            )}
          </TeacherPanel>

          <TeacherPanel
            title="Submissions"
            subtitle="Open an attempt to review answers, give feedback, and return or unreturn grades."
          >
            {latestSubmissions.length ? (
              latestSubmissions.map((submission) => (
                <TeacherRow
                  key={`${submission.studentId}-${submission.latestAttemptId || submission.studentEmail || submission.studentName}`}
                  title={submission.studentName}
                  subtitle={`${submission.status.replace(/_/g, " ")}${submission.latestAttemptSubmittedAt ? ` · ${formatDate(submission.latestAttemptSubmittedAt)}` : ""}`}
                  onPress={
                    submission.latestAttemptId
                      ? () =>
                          navigation.navigate(
                            "TeacherAssessmentAttemptResult",
                            {
                              attemptId: submission.latestAttemptId!,
                              assessmentId,
                              classId,
                            },
                          )
                      : undefined
                  }
                  right={
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color:
                            submission.status === "returned"
                              ? theme.green
                              : submission.status === "turned_in"
                                ? theme.amber
                                : theme.muted,
                        }}
                      >
                        {submission.status.replace(/_/g, " ")}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.muted }}>
                        {submission.directScore ??
                          submission.latestAttemptScore ??
                          "--"}
                      </Text>
                    </View>
                  }
                />
              ))
            ) : (
              <TeacherEmpty
                title="No submissions yet"
                subtitle="Students have not started or turned in attempts for this assessment yet."
                icon="file-document-outline"
              />
            )}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel
          title="Assessment unavailable"
          subtitle={
            assessmentQuery.error
              ? toAppError(assessmentQuery.error).message
              : "Loading assessment"
          }
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
