import { useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, Text, View } from "react-native";
import {
  useAssessmentDetail,
  useTeacherAssessmentSubmissions,
  useTeacherAssessmentUpdateMutation,
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

type Props = NativeStackScreenProps<RootStackParamList, "TeacherAssessmentDetail">;

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TeacherAssessmentDetailScreen({ navigation, route }: Props) {
  const { assessmentId, classId } = route.params;
  const assessmentQuery = useAssessmentDetail(assessmentId);
  const submissionsQuery = useTeacherAssessmentSubmissions(assessmentId);
  const updateMutation = useTeacherAssessmentUpdateMutation(assessmentId);
  const assessment = assessmentQuery.data;
  const submissions = submissionsQuery.data;

  const turnedIn = submissions?.summary.turnedIn ?? 0;
  const returned = submissions?.summary.returned ?? 0;

  const togglePublished = async () => {
    if (!assessment) return;
    try {
      await updateMutation.mutateAsync({ isPublished: !assessment.isPublished });
    } catch (error) {
      Alert.alert("Unable to update assessment", toAppError(error).message);
    }
  };

  const latestSubmissions = useMemo(
    () => submissions?.submissions.slice().sort((left, right) => new Date(right.latestAttemptSubmittedAt || 0).getTime() - new Date(left.latestAttemptSubmittedAt || 0).getTime()) ?? [],
    [submissions?.submissions],
  );

  return (
    <TeacherScreen
      title={assessment?.title || "Assessment detail"}
      subtitle={assessment?.description ? stripRichText(assessment.description) : "Review submissions and return grades from the current mobile shell."}
      icon="clipboard-check-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={assessmentQuery.isRefetching || submissionsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([assessmentQuery.refetch(), submissionsQuery.refetch()]);
      }}
    >
      {assessment ? (
        <>
          <TeacherStats
            items={[
              { label: "Questions", value: assessment.questions?.length ?? 0, tone: "red" },
              { label: "Turned In", value: turnedIn, tone: "amber" },
              { label: "Returned", value: returned, tone: "green" },
              { label: "Due", value: formatDate(assessment.dueDate), tone: "blue" },
            ]}
          />

          <TeacherPanel title="Assessment controls" subtitle="Keep publish state management available at the top of the teacher detail page.">
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <TeacherActionButton
                label="Edit assessment"
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
                label={assessment.isPublished ? "Move to draft" : "Publish assessment"}
                icon={assessment.isPublished ? "file-hidden" : "publish"}
                tone={assessment.isPublished ? "amber" : "green"}
                onPress={() => void togglePublished()}
                disabled={updateMutation.isPending}
              />
              {assessment.teacherAttachmentFile ? (
                <TeacherActionButton
                  label="Teacher attachment"
                  icon="paperclip"
                  tone="blue"
                  onPress={() =>
                    void assessmentsApi.openTeacherAttachment(
                      assessment.id,
                      assessment.teacherAttachmentFile?.originalName || "teacher-attachment",
                    )
                  }
                />
              ) : null}
            </View>
          </TeacherPanel>

          <TeacherPanel title="Overview" subtitle="Core assessment details students are also reacting to on their mobile side.">
            <TeacherRow title="Status" subtitle={assessment.isPublished ? "Published and visible to students." : "Draft only; students cannot open it yet."} />
            <TeacherRow title="Assessment type" subtitle={assessment.type.replace(/_/g, " ")} />
            <TeacherRow title="Due date" subtitle={formatDate(assessment.dueDate)} />
            <TeacherRow title="Passing score" subtitle={assessment.passingScore != null ? `${assessment.passingScore}%` : "Not set"} />
          </TeacherPanel>

          <TeacherPanel title="Submissions" subtitle="Open an attempt to review answers, give feedback, and return or unreturn grades.">
            {latestSubmissions.length ? (
              latestSubmissions.map((submission) => (
                <TeacherRow
                  key={`${submission.studentId}-${submission.latestAttemptId || submission.studentEmail || submission.studentName}`}
                  title={submission.studentName}
                  subtitle={`${submission.status.replace(/_/g, " ")}${submission.latestAttemptSubmittedAt ? ` · ${formatDate(submission.latestAttemptSubmittedAt)}` : ""}`}
                  onPress={
                    submission.latestAttemptId
                      ? () =>
                          navigation.navigate("TeacherAssessmentReview", {
                            attemptId: submission.latestAttemptId!,
                            assessmentId,
                            classId,
                          })
                      : undefined
                  }
                  right={
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: submission.status === "returned" ? theme.green : submission.status === "turned_in" ? theme.amber : theme.muted }}>
                        {submission.status.replace(/_/g, " ")}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.muted }}>
                        {submission.directScore ?? submission.latestAttemptScore ?? "--"}
                      </Text>
                    </View>
                  }
                />
              ))
            ) : (
              <TeacherEmpty title="No submissions yet" subtitle="Students have not started or turned in attempts for this assessment yet." icon="file-document-outline" />
            )}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title="Assessment unavailable" subtitle={assessmentQuery.error ? toAppError(assessmentQuery.error).message : "Loading assessment"} />
      )}
    </TeacherScreen>
  );
}
