import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Text, TextInput, View } from "react-native";
import { AppAlert as Alert } from "../components/ui/AppAlert";
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
  TeacherPanel,
  TeacherScreen,
  stripRichText,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import { MobileFilterSheet } from "../components/ui/MobileFilterSheet";
import { MobileScoreState } from "../components/ui/MobileScoreState";
import { MobileSegmentedTabs } from "../components/ui/MobileSegmentedTabs";
import { presentAcademicScore } from "../lib/academicScore";
import { mobileBrand } from "../theme/mobileBrand";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherAssessmentReview"
>;

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
    return stripRichText(
      optionLabel(response.studentAnswer) ?? response.studentAnswer,
    );
  }

  return "No captured answer";
}

function resolveExpectedAnswer(response: AttemptResult["responses"][number]) {
  const correctOptions = (response.question?.options ?? [])
    .filter((option) => option.isCorrect)
    .map((option) => stripRichText(option.text));
  return correctOptions.length
    ? correctOptions.join(", ")
    : "Manual review required for this response type";
}

export function TeacherAssessmentReviewScreen({ navigation, route }: Props) {
  const { attemptId, assessmentId } = route.params;
  const resultQuery = useAssessmentResult(attemptId);
  const result = resultQuery.data;
  const returnMutation = useTeacherReturnGradeMutation(assessmentId, attemptId);
  const unreturnMutation = useTeacherUnreturnGradeMutation(
    assessmentId,
    attemptId,
  );
  const [feedback, setFeedback] = useState("");
  const [directScore, setDirectScore] = useState("");
  const [gradingMode, setGradingMode] = useState<"evidence" | "direct">(
    "evidence",
  );
  const [manualScores, setManualScores] = useState<Record<string, string>>({});
  const [rubricScores, setRubricScores] = useState<
    Record<string, { points: string; feedback: string }>
  >({});
  const [bonusPoints, setBonusPoints] = useState("0");
  const [bonusReason, setBonusReason] = useState("");
  const [activeResponseIndex, setActiveResponseIndex] = useState(0);

  useEffect(() => {
    setFeedback(result?.teacherFeedback || "");
    setDirectScore(
      result?.directScore != null ? String(result.directScore) : "",
    );
    setGradingMode(result?.directScore != null ? "direct" : "evidence");
    setBonusPoints(String(result?.scoreBreakdown?.bonusPoints ?? 0));
    setBonusReason(result?.scoreBreakdown?.bonusReason ?? "");
    setManualScores(
      Object.fromEntries(
        (result?.responses ?? [])
          .filter((response) => response.isCorrect == null)
          .map((response) => [
            response.questionId,
            response.pointsEarned == null ? "" : String(response.pointsEarned),
          ]),
      ),
    );
    setRubricScores(
      Object.fromEntries(
        (result?.assessment?.rubricCriteria ?? []).map((criterion) => {
          const existing = result?.rubricScores?.find(
            (score) => score.criterionId === criterion.id,
          );
          return [
            criterion.id,
            {
              points: existing ? String(existing.pointsEarned) : "",
              feedback: existing?.feedback ?? "",
            },
          ];
        }),
      ),
    );
  }, [result]);

  const handleReturn = async () => {
    try {
      const parsedDirectScore = directScore.trim()
        ? Number(directScore)
        : undefined;
      if (
        gradingMode === "direct" &&
        (parsedDirectScore == null ||
          !Number.isInteger(parsedDirectScore) ||
          parsedDirectScore < 0 ||
          parsedDirectScore > 100)
      ) {
        Alert.alert(
          "Invalid direct score",
          "Enter a whole-number score from 0 to 100.",
        );
        return;
      }

      const manualResponseScores = Object.entries(manualScores)
        .filter(([, value]) => value.trim() !== "")
        .map(([questionId, value]) => ({
          questionId,
          pointsEarned: Number(value),
        }));
      const rubricScorePayload = (result?.assessment?.rubricCriteria ?? [])
        .filter((criterion) => rubricScores[criterion.id]?.points.trim() !== "")
        .map((criterion) => ({
          criterionId: criterion.id,
          pointsEarned: Number(rubricScores[criterion.id].points),
          feedback: rubricScores[criterion.id].feedback.trim() || undefined,
        }));

      const invalidManualScore = manualResponseScores.some(
        ({ questionId, pointsEarned }) => {
          const maxPoints =
            result?.responses.find(
              (response) => response.questionId === questionId,
            )?.question?.points ?? 0;
          return (
            !Number.isInteger(pointsEarned) ||
            pointsEarned < 0 ||
            pointsEarned > maxPoints
          );
        },
      );
      const invalidRubricScore = rubricScorePayload.some(
        ({ criterionId, pointsEarned }) => {
          const maxPoints =
            result?.assessment?.rubricCriteria?.find(
              (criterion) => criterion.id === criterionId,
            )?.points ?? 0;
          return (
            !Number.isInteger(pointsEarned) ||
            pointsEarned < 0 ||
            pointsEarned > maxPoints
          );
        },
      );
      if (invalidManualScore || invalidRubricScore) {
        Alert.alert(
          "Invalid grading evidence",
          "Each score must be a whole number within the question or criterion maximum.",
        );
        return;
      }
      const parsedBonusPoints = Number(bonusPoints || 0);
      if (!Number.isFinite(parsedBonusPoints) || parsedBonusPoints < 0) {
        Alert.alert("Invalid bonus", "Bonus points must be zero or greater.");
        return;
      }
      if (parsedBonusPoints > 0 && !bonusReason.trim()) {
        Alert.alert(
          "Bonus reason required",
          "Explain why the bonus points were added.",
        );
        return;
      }

      await returnMutation.mutateAsync({
        teacherFeedback: feedback.trim() || undefined,
        directScore: gradingMode === "direct" ? parsedDirectScore : undefined,
        manualResponseScores:
          gradingMode === "evidence" && manualResponseScores.length
            ? manualResponseScores
            : undefined,
        rubricScores:
          gradingMode === "evidence" && rubricScorePayload.length
            ? rubricScorePayload
            : undefined,
        bonusPoints: parsedBonusPoints,
        bonusReason: parsedBonusPoints > 0 ? bonusReason.trim() : undefined,
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

  const activeResponse =
    result?.responses[activeResponseIndex] ?? result?.responses[0];
  const scorePresentation = result ? presentAcademicScore(result) : null;
  const scoreValue =
    result?.scoreBreakdown?.effectivePoints ?? scorePresentation?.scorePercent;
  const scoreMaximum =
    result?.scoreBreakdown?.possiblePoints ??
    (scorePresentation?.scorePercent == null ? undefined : 100);

  return (
    <TeacherScreen
      title={result?.assessment?.title || "Attempt review"}
      subtitle={`Attempt #${result?.attemptNumber ?? "?"} · review answers, files, feedback, and direct score from mobile.`}
      icon="clipboard-check-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={resultQuery.isRefetching}
      onRefresh={() => {
        void resultQuery.refetch();
      }}
      stickyHeader={
        result ? (
          <View
            testID="review-control-panel"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: mobileBrand.border,
              backgroundColor: mobileBrand.surface,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <MobileScoreState
              score={scoreValue}
              maximum={scoreMaximum}
              state={result.isReturned ? "returned" : "submitted"}
              label={result.isReturned ? "Returned" : "In review"}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "900", color: mobileBrand.navy }}>
                Attempt #{result.attemptNumber ?? "?"}
              </Text>
              <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 10, color: mobileBrand.muted }}>
                {scorePresentation?.compactLabel} · {result.passed == null ? "Awaiting final grade" : result.passed ? "Passing result" : "Needs support"}
              </Text>
            </View>
            <TeacherActionButton
              label={result.isReturned ? "Update grade" : "Return grade"}
              icon="send-outline"
              tone="green"
              onPress={() => void handleReturn()}
              disabled={returnMutation.isPending}
            />
          </View>
        ) : undefined
      }
    >
      {result ? (
        <>
          <TeacherPanel
            title="Return controls"
            subtitle="Grade from response or rubric evidence, or choose an explicit direct-score override."
          >
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <MobileSegmentedTabs
                accessibilityLabel="Grading method"
                activeKey={gradingMode}
                onSelect={setGradingMode}
                items={[
                  { key: "evidence", label: "Response / rubric" },
                  { key: "direct", label: "Direct score" },
                ]}
              />

              {gradingMode === "direct" ? (
                <>
                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: 10,
                      fontWeight: "700",
                      color: theme.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                    }}
                  >
                    Direct score (0-100)
                  </Text>
                  <TextInput
                    value={directScore}
                    onChangeText={setDirectScore}
                    keyboardType="numeric"
                    placeholder="Required for direct override"
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
                </>
              ) : null}

              {gradingMode === "evidence" &&
              result.assessment?.rubricCriteria?.length ? (
                <View style={{ marginTop: 12, gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: theme.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                    }}
                  >
                    Rubric scoring
                  </Text>
                  {result.assessment.rubricCriteria.map((criterion) => (
                    <View
                      key={criterion.id}
                      style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.active,
                        padding: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: theme.text,
                        }}
                      >
                        {criterion.title} · {criterion.points} pts
                      </Text>
                      {criterion.description ? (
                        <Text
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: theme.muted,
                          }}
                        >
                          {criterion.description}
                        </Text>
                      ) : null}
                      <TextInput
                        value={rubricScores[criterion.id]?.points ?? ""}
                        onChangeText={(value) =>
                          setRubricScores((current) => ({
                            ...current,
                            [criterion.id]: {
                              points: value,
                              feedback: current[criterion.id]?.feedback ?? "",
                            },
                          }))
                        }
                        keyboardType="numeric"
                        placeholder={`Points earned (0-${criterion.points})`}
                        placeholderTextColor={theme.dim}
                        style={{
                          marginTop: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                          color: theme.text,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                        }}
                      />
                      <TextInput
                        value={rubricScores[criterion.id]?.feedback ?? ""}
                        onChangeText={(value) =>
                          setRubricScores((current) => ({
                            ...current,
                            [criterion.id]: {
                              points: current[criterion.id]?.points ?? "",
                              feedback: value,
                            },
                          }))
                        }
                        placeholder="Criterion feedback (optional)"
                        placeholderTextColor={theme.dim}
                        style={{
                          marginTop: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                          color: theme.text,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                        }}
                      />
                    </View>
                  ))}
                </View>
              ) : null}

              <Text
                style={{
                  marginTop: 12,
                  fontSize: 10,
                  fontWeight: "700",
                  color: theme.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
                Bonus points
              </Text>
              <TextInput
                value={bonusPoints}
                onChangeText={setBonusPoints}
                keyboardType="decimal-pad"
                placeholder="0"
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
              {Number(bonusPoints || 0) > 0 ? (
                <TextInput
                  value={bonusReason}
                  onChangeText={setBonusReason}
                  placeholder="Reason for bonus (required)"
                  placeholderTextColor={theme.dim}
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.amber,
                    backgroundColor: theme.active,
                    color: theme.text,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
              ) : null}
              <Text style={{ marginTop: 5, fontSize: 11, color: theme.muted }}>
                Bonus points are recorded separately and never raise the result
                above 100%.
              </Text>

              <Text
                style={{
                  marginTop: 12,
                  fontSize: 10,
                  fontWeight: "700",
                  color: theme.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                }}
              >
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
              {result.isReturned ? (
                <View style={{ marginTop: 10, alignItems: "flex-start" }}>
                  <TeacherActionButton
                    label="Unreturn grade"
                    icon="undo-variant"
                    tone="amber"
                    onPress={() => void handleUnreturn()}
                    disabled={unreturnMutation.isPending}
                  />
                </View>
              ) : null}

            </View>
          </TeacherPanel>

          {result.submittedFiles?.length || result.submittedFile ? (
            <TeacherPanel
              title="Submitted files"
              subtitle="Open or download student-uploaded evidence from this review screen."
            >
              {[
                ...(result.submittedFiles ?? []),
                ...(result.submittedFile ? [result.submittedFile] : []),
              ].map((file) => (
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
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: theme.text,
                      }}
                    >
                      {file.originalName || "Submitted file"}
                    </Text>
                    <Text
                      style={{ marginTop: 3, fontSize: 11, color: mobileBrand.dim }}
                    >
                      {file.mimeType || "File"}
                      {file.sizeBytes
                        ? ` · ${Math.round(file.sizeBytes / 1024)} KB`
                        : ""}
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

          <TeacherPanel
            title="Question review"
            subtitle="Move through one answer at a time, compare the expected evidence, and grade without losing your place."
          >
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <MobileFilterSheet
                label="Review question"
                activeKey={String(activeResponseIndex)}
                options={result.responses.map((response, index) => ({
                  key: String(index),
                  label: `Question ${index + 1}`,
                  count: response.pointsEarned ?? undefined,
                }))}
                onSelect={(key) => setActiveResponseIndex(Number(key))}
                resultCount={result.responses.length}
                icon="format-list-numbered"
              />
            </View>
            {activeResponse ? (
              <View
                key={activeResponse.questionId}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: theme.red,
                    }}
                  >
                    Question {activeResponseIndex + 1}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.muted }}>
                    {activeResponse.pointsEarned == null
                      ? "Ungraded"
                      : `${activeResponse.pointsEarned}/${activeResponse.question?.points ?? 0} pts`}
                  </Text>
                </View>
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 18,
                    color: theme.text,
                  }}
                >
                  {stripRichText(
                    activeResponse.question?.content || "No question content.",
                  )}
                </Text>
                {activeResponse.question?.imageUrl ? (
                  <Image
                    source={{ uri: activeResponse.question.imageUrl }}
                    resizeMode="contain"
                    style={{
                      marginTop: 10,
                      width: "100%",
                      height: 180,
                      borderRadius: 12,
                      backgroundColor: theme.active,
                    }}
                  />
                ) : null}
                <View
                  testID="learner-answer"
                  style={{
                    marginTop: 12,
                    borderLeftWidth: 4,
                    borderLeftColor:
                      activeResponse.isCorrect == null
                        ? mobileBrand.warning
                        : activeResponse.isCorrect
                          ? mobileBrand.success
                          : mobileBrand.danger,
                    borderRadius: 12,
                    backgroundColor: mobileBrand.surfaceMuted,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "900", color: mobileBrand.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>Learner answer</Text>
                  <Text style={{ marginTop: 5, fontSize: 17, lineHeight: 24, fontWeight: "900", color: mobileBrand.text }}>{resolveStudentAnswer(activeResponse)}</Text>
                </View>
                <View
                  testID="expected-answer"
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    backgroundColor: mobileBrand.successSoft,
                    padding: 14,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "900", color: mobileBrand.success, textTransform: "uppercase", letterSpacing: 0.6 }}>Expected answer</Text>
                  <Text style={{ marginTop: 5, fontSize: 15, lineHeight: 22, fontWeight: "800", color: mobileBrand.text }}>{resolveExpectedAnswer(activeResponse)}</Text>
                </View>
                <Text
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    fontWeight: "700",
                    color:
                      activeResponse.isCorrect == null
                        ? theme.amber
                        : activeResponse.isCorrect
                          ? theme.green
                          : theme.red,
                  }}
                >
                  {activeResponse.isCorrect == null
                    ? "Awaiting manual grading"
                    : activeResponse.isCorrect
                      ? "Correct"
                      : "Incorrect"}
                </Text>
                {activeResponse.hint ? (
                  <Text
                    style={{ marginTop: 5, fontSize: 11, color: theme.muted }}
                  >
                    Hint: {activeResponse.hint}
                  </Text>
                ) : null}
                {gradingMode === "evidence" && activeResponse.isCorrect == null ? (
                  <TextInput
                    value={manualScores[activeResponse.questionId] ?? ""}
                    onChangeText={(value) =>
                      setManualScores((current) => ({
                        ...current,
                        [activeResponse.questionId]: value,
                      }))
                    }
                    keyboardType="numeric"
                    placeholder={`Manual points (0-${activeResponse.question?.points ?? 0})`}
                    placeholderTextColor={theme.dim}
                    style={{
                      marginTop: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      color: theme.text,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  />
                ) : null}
              </View>
            ) : (
              <View style={{ paddingHorizontal: 14, paddingBottom: 16 }}>
                <Text style={{ fontSize: 12, color: mobileBrand.muted }}>No question responses were captured for this attempt.</Text>
              </View>
            )}
          </TeacherPanel>
        </>
      ) : (
        <TeacherPanel
          title="Attempt unavailable"
          subtitle={
            resultQuery.error
              ? toAppError(resultQuery.error).message
              : "Loading attempt review"
          }
        />
      )}
    </TeacherScreen>
  );
}
