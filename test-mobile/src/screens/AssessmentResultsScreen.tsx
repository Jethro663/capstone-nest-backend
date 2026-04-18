import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { Card, GradientHeader, Pill, Refreshable, ScreenScroll } from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { useAssessmentResult } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentResults">;

function formatAnswer(response: {
  studentAnswer?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  question?: {
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  };
}) {
  const options = response.question?.options ?? [];

  if (response.selectedOptionId) {
    return options.find((option) => option.id === response.selectedOptionId)?.text || response.selectedOptionId;
  }

  if (response.selectedOptionIds?.length) {
    return response.selectedOptionIds
      .map((optionId) => options.find((option) => option.id === optionId)?.text || optionId)
      .join(", ");
  }

  if (response.studentAnswer?.trim()) {
    return response.studentAnswer;
  }

  return "No recorded response";
}

export function AssessmentResultsScreen({ route, navigation }: Props) {
  const resultQuery = useAssessmentResult(route.params.attemptId);
  const result = resultQuery.data;
  const resultAssessment = (result as { assessment?: { id?: string } } | undefined)?.assessment;
  const assessmentId =
    (route.params as { assessmentId?: string }).assessmentId ||
    result?.attempt?.assessmentId;

  const openAssessment = () => {
    if (!assessmentId) {
      navigation.goBack();
      return;
    }

    navigation.navigate("AssessmentDetail", {
      assessmentId,
    } as never);
  };

  const openHistory = () => {
    navigation.navigate("AssessmentHistory", assessmentId ? { assessmentId } : undefined);
  };

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={resultQuery.isRefetching}
          onRefresh={() => {
            void resultQuery.refetch();
          }}
        />
      }
    >
      <GradientHeader
        colors={gradients.progress}
        eyebrow="Assessment Result"
        title={result ? `Attempt #${result.attemptNumber ?? result.attempt?.attemptNumber ?? "?"}` : "Loading..."}
      >
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.88)", fontSize: 12 }}>
          Review your score, feedback, and next steps.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        {resultQuery.error ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Unable to load this attempt
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(resultQuery.error).message}
            </Text>
          </Card>
        ) : null}

        {!result ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>Loading attempt result...</Text>
          </Card>
        ) : result.isReturned === false ? (
          <Card>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Submission Status</Text>
            <Text style={{ marginTop: 6, fontSize: 24, fontWeight: "900", color: colors.text }}>
              Awaiting Teacher Review
            </Text>
            <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
              Your submission is recorded. Results and teacher feedback will appear here once they are returned.
            </Text>
            <View style={{ marginTop: 14, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Pressable
                onPress={openAssessment}
                style={{
                  borderRadius: 16,
                  backgroundColor: colors.text,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Back to Assessment</Text>
              </Pressable>
              <Pressable
                onPress={openHistory}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.white,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>Open History</Text>
              </Pressable>
            </View>
          </Card>
        ) : (
          <>
            <Card>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Score</Text>
              <Text style={{ marginTop: 4, fontSize: 32, fontWeight: "900", color: colors.text }}>
                {Math.round(result.score ?? 0)}
              </Text>
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Pill
                  label={result.passed ? "Passed" : "Needs Review"}
                  backgroundColor={result.passed ? colors.paleGreen : colors.paleRed}
                  color={result.passed ? colors.green : colors.red}
                />
                <Pill
                  label={result.isReturned ? "Returned" : "Recorded"}
                  backgroundColor={colors.paleBlue}
                  color={colors.blueDeep}
                />
              </View>
              {result.teacherFeedback ? (
                <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                  Teacher feedback: {result.teacherFeedback}
                </Text>
              ) : null}
              <View style={{ marginTop: 14, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Pressable
                  onPress={openAssessment}
                  style={{
                    borderRadius: 16,
                    backgroundColor: colors.text,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Back to Assessment</Text>
                </Pressable>
                <Pressable
                  onPress={openHistory}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.white,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>Open History</Text>
                </Pressable>
              </View>
            </Card>

            {result.responses.map((response, index) => {
              const correctAnswer = response.question?.options
                ?.filter((option) => option.isCorrect)
                .map((option) => option.text)
                .join(", ");

              return (
                <Card key={`${response.questionId}-${index}`}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Question {index + 1}</Text>
                  <Text style={{ marginTop: 6, fontSize: 14, fontWeight: "800", color: colors.text }}>
                    {response.question?.content || "Question content unavailable"}
                  </Text>
                  <Text style={{ marginTop: 10, fontSize: 12, color: colors.textSecondary }}>
                    Your answer: {formatAnswer(response)}
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: "700",
                      color: response.isCorrect ? colors.green : colors.red,
                    }}
                  >
                    {response.isCorrect ? "Correct enough" : "Needs correction"}
                  </Text>
                  {!response.isCorrect && correctAnswer ? (
                    <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary }}>
                      Correct answer: {correctAnswer}
                    </Text>
                  ) : null}
                  {response.question?.explanation ? (
                    <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                      Explanation: {response.question.explanation}
                    </Text>
                  ) : null}
                </Card>
              );
            })}
          </>
        )}
      </View>
    </ScreenScroll>
  );
}
