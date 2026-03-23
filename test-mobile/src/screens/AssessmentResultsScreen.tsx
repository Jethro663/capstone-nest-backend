import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { Card, GradientHeader, Pill, ScreenScroll } from "../components/ui/primitives";
import { useAssessmentResult } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentResults">;

export function AssessmentResultsScreen({ route }: Props) {
  const resultQuery = useAssessmentResult(route.params.attemptId);
  const result = resultQuery.data;

  return (
    <ScreenScroll>
      <GradientHeader colors={gradients.progress} eyebrow="Assessment Result" title={result ? `Attempt #${result.attemptNumber}` : "Loading..."}>
        <Text style={{ marginTop: 12, color: "rgba(255,255,255,0.88)", fontSize: 12 }}>
          Review your score, feedback, and the item-by-item outcome below.
        </Text>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        {result ? (
          <>
            <Card>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Score</Text>
              <Text style={{ marginTop: 4, fontSize: 32, fontWeight: "900", color: colors.text }}>{Math.round(result.score)}</Text>
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pill label={result.passed ? "Passed" : "Needs Review"} backgroundColor={result.passed ? colors.paleGreen : colors.paleRed} color={result.passed ? colors.green : colors.red} />
                <Pill label={result.isReturned ? "Returned" : "Recorded"} backgroundColor={colors.paleBlue} color={colors.blueDeep} />
              </View>
              {result.teacherFeedback ? (
                <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
                  Teacher feedback: {result.teacherFeedback}
                </Text>
              ) : null}
            </Card>

            {result.responses.map((response, index) => (
              <Card key={`${response.questionId}-${index}`}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Question {index + 1}</Text>
                <Text style={{ marginTop: 6, fontSize: 14, fontWeight: "800", color: colors.text }}>
                  {response.question?.content || "Question content unavailable"}
                </Text>
                <Text style={{ marginTop: 10, fontSize: 12, color: colors.textSecondary }}>
                  Your answer: {response.studentAnswer || response.selectedOptionId || response.selectedOptionIds?.join(", ") || "No recorded response"}
                </Text>
                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "700", color: response.isCorrect ? colors.green : colors.red }}>
                  {response.isCorrect ? "Correct enough" : "Needs correction"}
                </Text>
                {response.question?.explanation ? (
                  <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                    Explanation: {response.question.explanation}
                  </Text>
                ) : null}
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <Text style={{ color: colors.textSecondary }}>Loading attempt result...</Text>
          </Card>
        )}
      </View>
    </ScreenScroll>
  );
}
