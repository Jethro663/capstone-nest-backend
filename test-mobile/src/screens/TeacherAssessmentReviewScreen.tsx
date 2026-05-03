import { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  useAssessmentResult,
  useTeacherReturnGradeMutation,
  useTeacherUnreturnGradeMutation,
} from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import {
  TeacherActionButton,
  TeacherPanel,
  TeacherScreen,
  TeacherStats,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherAssessmentReview">;

export function TeacherAssessmentReviewScreen({ navigation, route }: Props) {
  const { attemptId, assessmentId } = route.params;
  const resultQuery = useAssessmentResult(attemptId);
  const result = resultQuery.data;
  const returnMutation = useTeacherReturnGradeMutation(assessmentId, attemptId);
  const unreturnMutation = useTeacherUnreturnGradeMutation(assessmentId, attemptId);
  const [feedback, setFeedback] = useState("");
  const [directScore, setDirectScore] = useState("");

  useEffect(() => {
    setFeedback(result?.teacherFeedback || "");
    setDirectScore(result?.directScore != null ? String(result.directScore) : "");
  }, [result?.directScore, result?.teacherFeedback]);

  const handleReturn = async () => {
    try {
      await returnMutation.mutateAsync({
        teacherFeedback: feedback.trim() || undefined,
        directScore: directScore.trim() ? Number(directScore) : undefined,
      });
    } catch (error) {
      Alert.alert("Unable to return grade", toAppError(error).message);
    }
  };

  const handleUnreturn = async () => {
    try {
      await unreturnMutation.mutateAsync();
    } catch (error) {
      Alert.alert("Unable to unreturn grade", toAppError(error).message);
    }
  };

  return (
    <TeacherScreen
      title={result?.assessment?.title || "Attempt review"}
      subtitle={`Attempt #${result?.attemptNumber ?? "?"} · review answers, files, feedback, and direct score from mobile.`}
      icon="clipboard-check-outline"
      rightAction={
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.red} />
        </Pressable>
      }
      refreshing={resultQuery.isRefetching}
      onRefresh={() => {
        void resultQuery.refetch();
      }}
    >
      {result ? (
        <>
          <TeacherStats
            items={[
              { label: "Score", value: `${result.score}%`, tone: result.passed ? "green" : "red" },
              { label: "Result", value: result.passed ? "Passed" : "Failed", tone: result.passed ? "green" : "amber" },
              { label: "Returned", value: result.isReturned ? "Yes" : "No", tone: result.isReturned ? "blue" : "purple" },
            ]}
          />

          <TeacherPanel title="Return controls" subtitle="The grading action here is direct score plus teacher feedback, not the full web analytics suite.">
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                Direct score
              </Text>
              <TextInput
                value={directScore}
                onChangeText={setDirectScore}
                keyboardType="numeric"
                placeholder="Leave blank to keep computed score"
                placeholderTextColor={theme.dim}
                style={{
                  marginTop: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  color: theme.text,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              />

              <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                Teacher feedback
              </Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                multiline
                placeholder="Leave concise feedback for the learner"
                placeholderTextColor={theme.dim}
                style={{
                  marginTop: 6,
                  minHeight: 92,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.active,
                  color: theme.text,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  textAlignVertical: "top",
                }}
              />

              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <TeacherActionButton
                  label={result.isReturned ? "Update returned grade" : "Return grade"}
                  icon="send-outline"
                  tone="green"
                  onPress={() => void handleReturn()}
                  disabled={returnMutation.isPending}
                />
                {result.isReturned ? (
                  <TeacherActionButton
                    label="Unreturn"
                    icon="undo-variant"
                    tone="amber"
                    onPress={() => void handleUnreturn()}
                    disabled={unreturnMutation.isPending}
                  />
                ) : null}
              </View>
            </View>
          </TeacherPanel>

          {result.submittedFiles?.length || result.submittedFile ? (
            <TeacherPanel title="Submitted files" subtitle="Open or download student-uploaded evidence from this review screen.">
              {[...(result.submittedFiles ?? []), ...(result.submittedFile ? [result.submittedFile] : [])].map((file) => (
                <View
                  key={file.id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>
                      {file.originalName || "Submitted file"}
                    </Text>
                    <Text style={{ marginTop: 3, fontSize: 11, color: "#9D9D9D" }}>
                      {file.mimeType || "File"}{file.sizeBytes ? ` · ${Math.round(file.sizeBytes / 1024)} KB` : ""}
                    </Text>
                  </View>
                  <TeacherActionButton
                    label="Open"
                    tone="blue"
                    onPress={() =>
                      void assessmentsApi.openAttemptSubmissionAttachmentFile(
                        attemptId,
                        file.id,
                        file.originalName || "submission-file",
                      )
                    }
                  />
                  <TeacherActionButton
                    label="Download"
                    tone="neutral"
                    onPress={() =>
                      void assessmentsApi.downloadAttemptSubmissionAttachmentFile(
                        attemptId,
                        file.id,
                        file.originalName || "submission-file",
                      )
                    }
                  />
                </View>
              ))}
            </TeacherPanel>
          ) : null}

          <TeacherPanel title="Question review" subtitle="Keep the review flow visually aligned with the updated student results screen, but with teacher grading controls.">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <View style={{ width: 1 }} />
            </ScrollView>
            {result.responses.map((response, index) => (
              <View
                key={response.questionId}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: theme.red }}>Question {index + 1}</Text>
                  <Text style={{ fontSize: 11, color: theme.muted }}>
                    {response.pointsEarned ?? 0}/{response.question?.points ?? 0} pts
                  </Text>
                </View>
                <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: theme.text }}>
                  {stripRichText(response.question?.content || "No question content.")}
                </Text>
                {response.question?.imageUrl ? (
                  <Image
                    source={{ uri: response.question.imageUrl }}
                    resizeMode="contain"
                    style={{ marginTop: 10, width: "100%", height: 180, borderRadius: 12, backgroundColor: theme.active }}
                  />
                ) : null}
                <Text style={{ marginTop: 8, fontSize: 11, lineHeight: 17, color: "#9D9D9D" }}>
                  Student answer: {response.studentAnswer || response.selectedOptionId || response.selectedOptionIds?.join(", ") || "No captured answer"}
                </Text>
              </View>
            ))}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel title="Attempt unavailable" subtitle={resultQuery.error ? toAppError(resultQuery.error).message : "Loading attempt review"} />
      )}
    </TeacherScreen>
  );
}
