import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { lxpApi } from "../api/services/lxp";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import { colors, gradients, shadow } from "../theme/tokens";
import type { GuidedAssessmentQuestion, GuidedAssessmentResultResponse, GuidedAssessmentSessionResponse } from "../types/lxp";
import { GradientHeader, ProgressBar, Refreshable, ScreenScroll } from "../components/ui/primitives";

type Props = NativeStackScreenProps<RootStackParamList, "StudentGuidedAssessment">;

function normalizeAnswer(answer: string | string[] | undefined) {
  if (Array.isArray(answer)) return answer;
  return answer ? [answer] : [];
}

function formatAnswer(question: GuidedAssessmentQuestion, answer: string | string[] | undefined) {
  const labels = normalizeAnswer(answer)
    .map((id) => question.options.find((option) => option.id === id)?.text ?? id)
    .map((value) => stripRichText(value));
  return labels.length ? labels.join(", ") : "No answer";
}

function formatCorrectAnswer(question: GuidedAssessmentQuestion) {
  const labels = question.options.filter((option) => option.isCorrect).map((option) => stripRichText(option.text));
  return labels.length ? labels.join(", ") : "Answer key unavailable";
}

function isSelected(answer: string | string[] | undefined, optionId: string) {
  return normalizeAnswer(answer).includes(optionId);
}

function isCorrectAnswer(question: GuidedAssessmentQuestion, answer: string | string[] | undefined) {
  const correct = question.options.filter((option) => option.isCorrect).map((option) => option.id).sort();
  const selected = normalizeAnswer(answer).sort();
  return correct.length > 0 && correct.length === selected.length && correct.every((id, index) => id === selected[index]);
}

function scoreTone(passed?: boolean) {
  return passed ? { bg: "#DCFCE7", line: "#86EFAC", text: "#166534" } : { bg: "#FFF7ED", line: "#FDBA74", text: "#9A3412" };
}

export function StudentGuidedAssessmentScreen({ navigation, route }: Props) {
  const { classId, assignmentId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<GuidedAssessmentSessionResponse | null>(null);
  const [result, setResult] = useState<GuidedAssessmentResultResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [hintedQuestionIds, setHintedQuestionIds] = useState<string[]>([]);
  const questions = session?.guidedAssessment.questions ?? result?.guidedAssessment?.questions ?? [];
  const activeQuestion = questions[currentIndex];
  const summary = result?.attemptSummary ?? session?.attemptSummary;
  const bestScoreLabel =
    typeof summary?.bestScorePercent === "number" ? `${summary.bestScorePercent}%` : "No score yet";

  const hydrate = useCallback(async (forceNewAttempt = false) => {
    const nextSession = await lxpApi.startGuidedAssessment(classId, assignmentId, forceNewAttempt);
    setSession(nextSession);
    setCurrentIndex(nextSession.attempt.currentQuestionIndex ?? 0);
    setResponses(
      Object.fromEntries(
        (nextSession.attempt.responses ?? []).map((entry) => [entry.questionId, entry.answer as string | string[]]),
      ),
    );
    setHintedQuestionIds(nextSession.attempt.hintedQuestionIds ?? []);

    if (nextSession.attempt.status === "submitted") {
      const nextResult = await lxpApi.getGuidedAssessmentResult(classId, assignmentId);
      setResult(nextResult);
    } else {
      setResult(null);
    }
  }, [assignmentId, classId]);

  useEffect(() => {
    hydrate()
      .catch((error) => Alert.alert("Unable to load AI quiz", toAppError(error).message))
      .finally(() => setLoading(false));
  }, [hydrate]);

  const answeredCount = useMemo(
    () => questions.filter((question) => normalizeAnswer(responses[question.id]).length > 0).length,
    [questions, responses],
  );

  const chooseOption = (question: GuidedAssessmentQuestion, optionId: string) => {
    setResponses((current) => {
      if (question.type === "multiple_select") {
        const selected = new Set(normalizeAnswer(current[question.id]));
        if (selected.has(optionId)) selected.delete(optionId);
        else selected.add(optionId);
        return { ...current, [question.id]: Array.from(selected) };
      }
      return { ...current, [question.id]: optionId };
    });
  };

  const submit = async () => {
    if (!session || submitting) return;
    try {
      setSubmitting(true);
      const nextResult = await lxpApi.submitGuidedAssessment(classId, assignmentId, {
        hintedQuestionIds,
        responses: questions.map((question) => ({
          questionId: question.id,
          answer: responses[question.id],
          explanationShown: true,
        })),
      });
      setResult(nextResult);
      Alert.alert(
        nextResult.passed ? "AI quiz completed" : "Attempt submitted",
        nextResult.passed
          ? "You met the passing score. This checkpoint is now completed."
          : "Your score is below the passing score. Review the answer key and retry if attempts remain.",
      );
    } catch (error) {
      Alert.alert("Unable to submit", toAppError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const retry = async () => {
    try {
      setLoading(true);
      await hydrate(true);
    } catch (error) {
      Alert.alert("Retry unavailable", toAppError(error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 10, color: theme.muted, fontWeight: "800" }}>Preparing AI quiz...</Text>
      </View>
    );
  }

  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const activeAnswer = activeQuestion ? responses[activeQuestion.id] : undefined;
  const answerCorrect = activeQuestion ? isCorrectAnswer(activeQuestion, activeAnswer) : false;
  const tone = scoreTone(result?.passed ?? summary?.passed);

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            hydrate().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <GradientHeader
        colors={gradients.lxp}
        eyebrow="Learners Path AI Quiz"
        title={session?.guidedAssessment.title ?? result?.guidedAssessment?.title ?? "Guided assessment"}
        rightContent={
          <Pressable onPress={() => navigation.goBack()} style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: colors.white, fontSize: 12, fontWeight: "900" }}>Back</Text>
          </Pressable>
        }
      >
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: "800" }}>
            Passing score: {summary?.passingScore ?? result?.passingScore ?? 60}% | Best: {bestScoreLabel}
          </Text>
          <ProgressBar value={progress} color="#FACC15" trackColor="rgba(255,255,255,0.24)" height={10} />
        </View>
      </GradientHeader>

      <View style={{ padding: 18, gap: 14 }}>
        {summary ? (
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: tone.line, backgroundColor: tone.bg, padding: 14 }}>
            <Text style={{ color: tone.text, fontSize: 13, fontWeight: "900" }}>
              {summary.passed ? "Completed" : summary.isLocked ? "Locked after 3 attempts" : "Needs passing score"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
              {Array.from({ length: summary.maxAttempts }).map((_, index) => {
                const attempt = summary.attempts.find((item) => item.attemptNumber === index + 1);
                return (
                  <View key={index} style={{ borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: theme.text, fontSize: 11, fontWeight: "900" }}>Try {index + 1}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "700" }}>{attempt?.scorePercent ?? "--"}%</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {result ? (
          <View style={{ gap: 12 }}>
            <View style={[{ borderRadius: 28, backgroundColor: colors.white, padding: 18 }, shadow.card]}>
              <Text style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>{result.scorePercent}%</Text>
              <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, fontWeight: "800" }}>
                Attempt {result.attemptNumber ?? summary?.attemptsUsed ?? 1} | {result.correctCount}/{result.totalQuestions ?? questions.length} correct
              </Text>
              {summary?.canRetry && !summary.isLocked ? (
                <Pressable onPress={retry} style={{ marginTop: 12, alignSelf: "flex-start", borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: "900" }}>Retry AI quiz</Text>
                </Pressable>
              ) : null}
            </View>

            {questions.map((question, index) => {
              const response = result.responses.find((item) => item.questionId === question.id);
              return (
                <View key={question.id} style={[{ borderRadius: 24, backgroundColor: colors.white, padding: 14 }, shadow.card]}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: "900" }}>Q{index + 1}. {stripRichText(question.stem)}</Text>
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {question.options.map((option) => {
                      const selected = isSelected(response?.answer, option.id);
                      const correct = Boolean(option.isCorrect);
                      const bg = correct ? "#DCFCE7" : selected ? "#FEE2E2" : "#F8FAFC";
                      const line = correct ? "#22C55E" : selected ? "#EF4444" : "#CBD5E1";
                      return (
                        <View key={option.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: line, backgroundColor: bg, padding: 11 }}>
                          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "800" }}>{stripRichText(option.text)}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={{ marginTop: 10, color: response?.isCorrect ? colors.green : colors.red, fontSize: 12, fontWeight: "900" }}>
                    Your previous answer: {formatAnswer(question, response?.answer)}
                  </Text>
                  <Text style={{ marginTop: 4, color: colors.green, fontSize: 12, fontWeight: "900" }}>
                    Correct answer: {formatCorrectAnswer(question)}
                  </Text>
                  <Text style={{ marginTop: 8, color: theme.muted, fontSize: 12, lineHeight: 18 }}>{stripRichText(question.explanation)}</Text>
                </View>
              );
            })}
          </View>
        ) : activeQuestion ? (
          <View style={[{ borderRadius: 30, backgroundColor: colors.white, padding: 18 }, shadow.card]}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>
              Question {currentIndex + 1} of {questions.length} | {answeredCount} answered
            </Text>
            <Text style={{ marginTop: 10, color: theme.text, fontSize: 18, lineHeight: 25, fontWeight: "900" }}>
              {stripRichText(activeQuestion.stem)}
            </Text>
            <View style={{ marginTop: 14, gap: 10 }}>
              {activeQuestion.options.map((option) => {
                const selected = isSelected(activeAnswer, option.id);
                return (
                  <Pressable key={option.id} onPress={() => chooseOption(activeQuestion, option.id)} style={{ borderRadius: 18, borderWidth: 1, borderColor: selected ? colors.primary : "#CBD5E1", backgroundColor: selected ? "#EEF2FF" : "#F8FAFC", padding: 13 }}>
                    <Text style={{ color: theme.text, fontSize: 13, fontWeight: "800" }}>{stripRichText(option.text)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {normalizeAnswer(activeAnswer).length ? (
              <View style={{ marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: answerCorrect ? "#86EFAC" : "#FDBA74", backgroundColor: answerCorrect ? "#F0FDF4" : "#FFF7ED", padding: 12 }}>
                <Text style={{ color: answerCorrect ? "#166534" : "#9A3412", fontSize: 12, fontWeight: "900" }}>
                  {answerCorrect ? "Correct" : "Review the explanation"}
                </Text>
                <Text style={{ marginTop: 5, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
                  Correct answer: {formatCorrectAnswer(activeQuestion)}. {stripRichText(activeQuestion.explanation)}
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <Pressable disabled={currentIndex === 0} onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))} style={{ flex: 1, borderRadius: 16, backgroundColor: currentIndex === 0 ? "#E2E8F0" : "#DBEAFE", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: currentIndex === 0 ? theme.muted : colors.blue, fontWeight: "900" }}>Previous</Text>
              </Pressable>
              {currentIndex < questions.length - 1 ? (
                <Pressable onPress={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))} style={{ flex: 1, borderRadius: 16, backgroundColor: colors.primary, paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ color: colors.white, fontWeight: "900" }}>Next</Text>
                </Pressable>
              ) : (
                <Pressable disabled={submitting} onPress={submit} style={{ flex: 1, borderRadius: 16, backgroundColor: colors.primary, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
                  <MaterialCommunityIcons name="send" size={14} color={colors.white} />
                  <Text style={{ color: colors.white, fontWeight: "900" }}>{submitting ? "Submitting" : "Submit"}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
