import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { assessmentsApi } from "../api/services/assessments";
import { useAssessmentDetail, useAssessmentSubmitMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import { Card, GradientHeader, Pill, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentTake">;

export function AssessmentTakeScreen({ route, navigation }: Props) {
  const { assessmentId } = route.params;
  const detailQuery = useAssessmentDetail(assessmentId);
  const submitMutation = useAssessmentSubmitMutation(assessmentId);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    void assessmentsApi.startAttempt(assessmentId);
    setStartedAt(Date.now());
  }, [assessmentId]);

  const questions = detailQuery.data?.questions ?? [];
  const canSubmit = questions.length > 0;

  const payload = useMemo(
    () => ({
      assessmentId,
      responses: questions.map((question) => {
        const value = answers[question.id];
        if (Array.isArray(value)) {
          return { questionId: question.id, selectedOptionIds: value };
        }
        if (question.type === "multiple_choice" || question.type === "true_false" || question.type === "dropdown") {
          return { questionId: question.id, selectedOptionId: value as string | undefined };
        }
        return { questionId: question.id, studentAnswer: (value as string | undefined) || "" };
      }),
      timeSpentSeconds: startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 1,
    }),
    [answers, assessmentId, questions, startedAt],
  );

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("This assessment does not have any publishable questions yet.");
      return;
    }

    try {
      setError("");
      await submitMutation.mutateAsync(payload);
      const attempts = await assessmentsApi.getStudentAttempts(assessmentId);
      const latestAttempt = [...attempts]
        .filter((attempt) => attempt.isSubmitted)
        .sort(
          (left, right) =>
            new Date(right.submittedAt || right.startedAt || 0).getTime() -
            new Date(left.submittedAt || left.startedAt || 0).getTime(),
        )[0];

      if (latestAttempt) {
        navigation.replace("AssessmentResults", { attemptId: latestAttempt.id });
      } else {
        navigation.goBack();
      }
    } catch (rawError) {
      setError(toAppError(rawError).message);
    }
  };

  return (
    <ScreenScroll>
      <GradientHeader colors={gradients.assessments} eyebrow="Take Assessment" title={detailQuery.data?.title || "Loading..."}>
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
          Answer the items below and submit when you are ready.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        {questions.map((question, index) => (
          <Card key={question.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pill label={`Q${index + 1}`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{question.points} pts</Text>
            </View>
            <Text style={{ marginTop: 10, fontSize: 15, fontWeight: "800", color: colors.text }}>{question.content}</Text>

            {question.options?.length ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                {question.options.map((option) => {
                  const selected = Array.isArray(answers[question.id])
                    ? (answers[question.id] as string[]).includes(option.id)
                    : answers[question.id] === option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        setAnswers((current) => {
                          if (question.type === "multiple_select") {
                            const active = new Set((current[question.id] as string[] | undefined) ?? []);
                            if (active.has(option.id)) {
                              active.delete(option.id);
                            } else {
                              active.add(option.id);
                            }
                            return { ...current, [question.id]: [...active] };
                          }

                          return { ...current, [question.id]: option.id };
                        });
                      }}
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: selected ? colors.amber : colors.border,
                        backgroundColor: selected ? colors.paleAmber : colors.white,
                        padding: 14,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: "700" }}>{option.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                multiline
                value={(answers[question.id] as string | undefined) || ""}
                onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                placeholder="Write your answer here..."
                placeholderTextColor={colors.muted}
                style={{
                  minHeight: 110,
                  marginTop: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  textAlignVertical: "top",
                }}
              />
            )}
          </Card>
        ))}

        {!!error && (
          <View style={{ borderRadius: 16, backgroundColor: colors.paleRed, padding: 12 }}>
            <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={() => void handleSubmit()}
          style={{
            borderRadius: 18,
            backgroundColor: colors.text,
            alignItems: "center",
            paddingVertical: 15,
            marginBottom: 10,
            opacity: submitMutation.isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>
            {submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
          </Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
