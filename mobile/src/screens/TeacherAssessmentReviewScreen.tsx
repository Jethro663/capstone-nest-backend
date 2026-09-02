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
import type { AttemptResult } from "../types/assessment";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherPanel,
  TeacherScreen,
  TeacherStats,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherAssessmentReview">;

function resolveStudentAnswer(response: AttemptResult["responses"][number]) {
  const options = response.question?.options ?? [];
  const optionLabel = (optionId?: string | null) => {
    if (!optionId) return null;
    return options.find((option) => option.id === optionId)?.text ?? null;
  };

  const selectedOptionIds = response.selectedOptionIds?.length
    ? response.selectedOptionIds
    : response.selectedOptionId
      ? [response.selectedOptionId]
      : [];

  const selectedLabels = selectedOptionIds
    .map(optionLabel)
    .filter((label): label is string => Boolean(label));

  if (selectedLabels.length) {
    return selectedLabels.map(stripRichText).join(", ");
  }

  if (response.studentAnswer) {
    return stripRichText(optionLabel(response.studentAnswer) ?? response.studentAnswer);
  }

  return "No captured answer";
}

export function TeacherAssessmentReviewScreen({ navigation, route }: Props) {
  const { attemptId, assessmentId } = route.params;
  const resultQuery = useAssessmentResult(attemptId);
  const result = resultQuery.data;
  const returnMutation = useTeacherReturnGradeMutation(assessmentId, attemptId);
  const unreturnMutation = useTeacherUnreturnGradeMutation(assessmentId, attemptId);
  const [feedback, setFeedback] = useState("");
  const [directScore, setDirectScore] = useState("");
  const [gradingMode, setGradingMode] = useState<"evidence" | "direct">("evidence");
  const [manualScores, setManualScores] = useState<Record<string, string>>({});
  const [rubricScores, setRubricScores] = useState<Record<string, { points: string; feedback: string }>>({});

  useEffect(() => {
    setFeedback(result?.teacherFeedback || "");
    setDirectScore(result?.directScore != null ? String(result.directScore) : "");
    setGradingMode(result?.directScore != null ? "direct" : "evidence");
    setManualScores(
      Object.fromEntries(
        (result?.responses ?? [])
          .filter((response) => response.isCorrect == null)
          .map((response) => [response.questionId, response.pointsEarned == null ? "" : String(response.pointsEarned)]),
      ),
    );
    setRubricScores(
      Object.fromEntries(
        (result?.assessment?.rubricCriteria ?? []).map((criterion) => {
          const existing = result?.rubricScores?.find((score) => score.criterionId === criterion.id);
          return [criterion.id, { points: existing ? String(existing.pointsEarned) : "", feedback: existing?.feedback ?? "" }];
        }),
      ),
    );
  }, [result]);

  const handleReturn = async () => {
    try {
      const parsedDirectScore = directScore.trim() ? Number(directScore) : undefined;
      if (gradingMode === "direct" && (parsedDirectScore == null || !Number.isInteger(parsedDirectScore) || parsedDirectScore < 0 || parsedDirectScore > 100)) {
        Alert.alert("Invalid direct score", "Enter a whole-number score from 0 to 100.");
        return;
      }

      const manualResponseScores = Object.entries(manualScores)
        .filter(([, value]) => value.trim() !== "")
        .map(([questionId, value]) => ({ questionId, pointsEarned: Number(value) }));
      const rubricScorePayload = (result?.assessment?.rubricCriteria ?? [])
        .filter((criterion) => rubricScores[criterion.id]?.points.trim() !== "")
        .map((criterion) => ({
          criterionId: criterion.id,
          pointsEarned: Number(rubricScores[criterion.id].points),
          feedback: rubricScores[criterion.id].feedback.trim() || undefined,
        }));

      const invalidManualScore = manualResponseScores.some(({ questionId, pointsEarned }) => {
        const maxPoints = result?.responses.find((response) => response.questionId === questionId)?.question?.points ?? 0;
        return !Number.isInteger(pointsEarned) || pointsEarned < 0 || pointsEarned > maxPoints;
      });
      const invalidRubricScore = rubricScorePayload.some(({ criterionId, pointsEarned }) => {
        const maxPoints = result?.assessment?.rubricCriteria?.find((criterion) => criterion.id === criterionId)?.points ?? 0;
        return !Number.isInteger(pointsEarned) || pointsEarned < 0 || pointsEarned > maxPoints;
      });
      if (invalidManualScore || invalidRubricScore) {
        Alert.alert("Invalid grading evidence", "Each score must be a whole number within the question or criterion maximum.");
        return;
      }

      await returnMutation.mutateAsync({
        teacherFeedback: feedback.trim() || undefined,
        directScore: gradingMode === "direct" ? parsedDirectScore : undefined,
        manualResponseScores: gradingMode === "evidence" && manualResponseScores.length ? manualResponseScores : undefined,
        rubricScores: gradingMode === "evidence" && rubricScorePayload.length ? rubricScorePayload : undefined,
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
          style={{ width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.redSoft }}
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
              { label: "Score", value: result.score == null ? "Pending" : `${result.score}%`, tone: result.score == null ? "amber" : result.passed ? "green" : "red" },
              { label: "Result", value: result.passed == null ? "Ungraded" : result.passed ? "Passed" : "Failed", tone: result.passed == null ? "amber" : result.passed ? "green" : "red" },
              { label: "Returned", value: result.isReturned ? "Yes" : "No", tone: result.isReturned ? "blue" : "purple" },
            ]}
          />

          <TeacherPanel title="Return controls" subtitle="Grade from response or rubric evidence, or choose an explicit direct-score override.">
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <TeacherChip label="Response / rubric scoring" active={gradingMode === "evidence"} onPress={() => setGradingMode("evidence")} />
                <TeacherChip label="Direct score override" active={gradingMode === "direct"} onPress={() => setGradingMode("direct")} />
              </View>

              {gradingMode === "direct" ? (
                <>
                  <Text style={{ marginTop: 12, fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                    Direct score (0-100)
                  </Text>
                  <TextInput
                    value={directScore}
                    onChangeText={setDirectScore}
                    keyboardType="numeric"
                    placeholder="Required for direct override"
                    placeholderTextColor={theme.dim}
                    style={{ marginTop: 6, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, color: theme.text, paddingHorizontal: 12, paddingVertical: 10 }}
                  />
                </>
              ) : null}

              {gradingMode === "evidence" && result.assessment?.rubricCriteria?.length ? (
                <View style={{ marginTop: 12, gap: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>Rubric scoring</Text>
                  {result.assessment.rubricCriteria.map((criterion) => (
                    <View key={criterion.id} style={{ borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, padding: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.text }}>{criterion.title} · {criterion.points} pts</Text>
                      {criterion.description ? <Text style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>{criterion.description}</Text> : null}
                      <TextInput
                        value={rubricScores[criterion.id]?.points ?? ""}
                        onChangeText={(value) => setRubricScores((current) => ({ ...current, [criterion.id]: { points: value, feedback: current[criterion.id]?.feedback ?? "" } }))}
                        keyboardType="numeric"
                        placeholder={`Points earned (0-${criterion.points})`}
                        placeholderTextColor={theme.dim}
                        style={{ marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border, color: theme.text, paddingHorizontal: 10, paddingVertical: 8 }}
                      />
                      <TextInput
                        value={rubricScores[criterion.id]?.feedback ?? ""}
                        onChangeText={(value) => setRubricScores((current) => ({ ...current, [criterion.id]: { points: current[criterion.id]?.points ?? "", feedback: value } }))}
                        placeholder="Criterion feedback (optional)"
                        placeholderTextColor={theme.dim}
                        style={{ marginTop: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.border, color: theme.text, paddingHorizontal: 10, paddingVertical: 8 }}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

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
                    {response.pointsEarned == null ? "Ungraded" : `${response.pointsEarned}/${response.question?.points ?? 0} pts`}
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
                  Student answer: {resolveStudentAnswer(response)}
                </Text>
                <Text style={{ marginTop: 5, fontSize: 11, fontWeight: "700", color: response.isCorrect == null ? theme.amber : response.isCorrect ? theme.green : theme.red }}>
                  {response.isCorrect == null ? "Awaiting manual grading" : response.isCorrect ? "Correct" : "Incorrect"}
                </Text>
                {response.hint ? <Text style={{ marginTop: 5, fontSize: 11, color: theme.muted }}>Hint: {response.hint}</Text> : null}
                {gradingMode === "evidence" && response.isCorrect == null ? (
                  <TextInput
                    value={manualScores[response.questionId] ?? ""}
                    onChangeText={(value) => setManualScores((current) => ({ ...current, [response.questionId]: value }))}
                    keyboardType="numeric"
                    placeholder={`Manual points (0-${response.question?.points ?? 0})`}
                    placeholderTextColor={theme.dim}
                    style={{ marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.active, color: theme.text, paddingHorizontal: 10, paddingVertical: 8 }}
                  />
                ) : null}
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
