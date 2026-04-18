import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, TextInput, View } from "react-native";
import { assessmentsApi } from "../api/services/assessments";
import { useAssessmentDetail, useAssessmentSubmitMutation } from "../api/hooks";
import { toAppError } from "../api/http";
import { Card, GradientHeader, Pill, Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentTake">;

type DraftResponse = {
  questionId: string;
  studentAnswer?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
};

function restoreDraftResponses(draftResponses: DraftResponse[] | undefined) {
  const restored: Record<string, string | string[]> = {};

  for (const response of draftResponses ?? []) {
    if (response.selectedOptionIds?.length) {
      restored[response.questionId] = response.selectedOptionIds;
      continue;
    }

    if (response.selectedOptionId) {
      restored[response.questionId] = response.selectedOptionId;
      continue;
    }

    if (typeof response.studentAnswer === "string") {
      restored[response.questionId] = response.studentAnswer;
    }
  }

  return restored;
}

function getAttemptTime(attempt: {
  submittedAt?: string;
  startedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  return new Date(
    attempt.submittedAt || attempt.updatedAt || attempt.startedAt || attempt.createdAt || 0,
  ).getTime();
}

export function AssessmentTakeScreen({ route, navigation }: Props) {
  const { assessmentId } = route.params;
  const detailQuery = useAssessmentDetail(assessmentId);
  const submitMutation = useAssessmentSubmitMutation(assessmentId);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [attemptReady, setAttemptReady] = useState(false);

  useEffect(() => {
    let active = true;

    const prepareAttempt = async () => {
      try {
        setAttemptReady(false);
        setError("");

        const ongoingAttempt = await assessmentsApi.getOngoingAttempt(assessmentId);
        const currentAttempt = ongoingAttempt ?? (await assessmentsApi.startAttempt(assessmentId));

        if (!active) {
          return;
        }

        setStartedAt(
          currentAttempt?.attempt?.startedAt
            ? new Date(currentAttempt.attempt.startedAt).getTime()
            : Date.now(),
        );
        setAnswers(
          restoreDraftResponses(
            (currentAttempt?.attempt as { draftResponses?: DraftResponse[] } | undefined)?.draftResponses,
          ),
        );
      } catch (rawError) {
        if (!active) {
          return;
        }

        setError(toAppError(rawError).message);
      } finally {
        if (active) {
          setAttemptReady(true);
        }
      }
    };

    void prepareAttempt();

    return () => {
      active = false;
    };
  }, [assessmentId]);

  const questions = detailQuery.data?.questions ?? [];
  const canSubmit = questions.length > 0 && attemptReady;
  const assessmentType = String((detailQuery.data as { type?: string } | undefined)?.type || "");

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
        .filter((attempt) => attempt.isSubmitted !== false)
        .sort((left, right) => getAttemptTime(right as never) - getAttemptTime(left as never))[0];

      if (latestAttempt) {
        navigation.replace("AssessmentResults", { attemptId: latestAttempt.id, assessmentId } as never);
      } else {
        navigation.goBack();
      }
    } catch (rawError) {
      setError(toAppError(rawError).message);
    }
  };

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={detailQuery.isRefetching || submitMutation.isPending || !attemptReady}
          onRefresh={() => {
            void detailQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader colors={gradients.assessments} eyebrow="Take Assessment" title={detailQuery.data?.title || "Loading..."}>
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
          Answer the items below and submit when you are ready.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        {assessmentType === "file_upload" ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              File upload assessments are not supported in this mobile flow yet.
            </Text>
            <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              This attempt is visible in the mobile navigation stack, but submission file controls still need the web student dashboard.
            </Text>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                marginTop: 14,
                alignSelf: "flex-start",
                borderRadius: 16,
                backgroundColor: colors.text,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Back to Assessment</Text>
            </Pressable>
          </Card>
        ) : null}

        {!attemptReady && !error ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>Preparing your attempt...</Text>
          </Card>
        ) : null}

        {assessmentType !== "file_upload"
          ? questions.map((question, index) => (
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
                                const activeSelections = new Set((current[question.id] as string[] | undefined) ?? []);
                                if (activeSelections.has(option.id)) {
                                  activeSelections.delete(option.id);
                                } else {
                                  activeSelections.add(option.id);
                                }
                                return { ...current, [question.id]: [...activeSelections] };
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
            ))
          : null}

        {!!error && (
          <View style={{ borderRadius: 16, backgroundColor: colors.paleRed, padding: 12 }}>
            <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>{error}</Text>
          </View>
        )}

        {assessmentType !== "file_upload" ? (
          <Pressable
            onPress={() => void handleSubmit()}
            style={{
              borderRadius: 18,
              backgroundColor: colors.text,
              alignItems: "center",
              paddingVertical: 15,
              marginBottom: 10,
              opacity: submitMutation.isPending || !attemptReady ? 0.7 : 1,
            }}
          >
            <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>
              {submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
