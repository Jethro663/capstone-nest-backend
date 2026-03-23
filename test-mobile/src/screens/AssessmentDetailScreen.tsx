import { useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { Card, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { useAssessmentAttempts, useAssessmentDetail } from "../api/hooks";
import { formatDisplayDate } from "../data/mappers";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentDetail">;

export function AssessmentDetailScreen({ route, navigation }: Props) {
  const { assessmentId } = route.params;
  const detailQuery = useAssessmentDetail(assessmentId);
  const attemptsQuery = useAssessmentAttempts(assessmentId);

  const latestAttempt = useMemo(
    () =>
      [...(attemptsQuery.data ?? [])].sort(
        (left, right) =>
          new Date(right.submittedAt || right.startedAt || 0).getTime() -
          new Date(left.submittedAt || left.startedAt || 0).getTime(),
      )[0],
    [attemptsQuery.data],
  );

  const assessment = detailQuery.data;

  if (!assessment) {
    return (
      <ScreenScroll refreshControl={<Refreshable refreshing={detailQuery.isRefetching} onRefresh={() => void detailQuery.refetch()} />}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.textSecondary }}>Loading assessment...</Text>
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={detailQuery.isRefetching || attemptsQuery.isRefetching}
          onRefresh={() => {
            void Promise.all([detailQuery.refetch(), attemptsQuery.refetch()]);
          }}
        />
      }
    >
      <GradientHeader colors={gradients.assessments} eyebrow="Assessment Detail" title={assessment.title}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 10,
            width: 36,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.white} />
        </Pressable>
        <View style={{ marginTop: 16, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pill label={assessment.type.replaceAll("_", " ")} backgroundColor="rgba(255,255,255,0.18)" color={colors.white} />
          <Pill label={`${assessment.questions?.length ?? 0} questions`} backgroundColor="rgba(255,255,255,0.18)" color={colors.white} />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        <Card>
          <SectionTitle title="What to expect" />
          <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
            {assessment.description || "No description was provided for this assessment."}
          </Text>
          <View style={{ marginTop: 14, gap: 8 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Due date: <Text style={{ color: colors.text, fontWeight: "800" }}>{formatDisplayDate(assessment.dueDate)}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Passing score: <Text style={{ color: colors.text, fontWeight: "800" }}>{assessment.passingScore ?? "Not set"}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              Time limit: <Text style={{ color: colors.text, fontWeight: "800" }}>{assessment.timeLimitMinutes ?? "Self-paced"} min</Text>
            </Text>
          </View>
        </Card>

        <Card>
          <SectionTitle title="Latest attempt" />
          {latestAttempt ? (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Attempt #{latestAttempt.attemptNumber ?? 1}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                {latestAttempt.isSubmitted ? `${Math.round(latestAttempt.score ?? 0)} points submitted` : "In progress"}
              </Text>
              {latestAttempt.isSubmitted ? (
                <Pressable
                  onPress={() => navigation.navigate("AssessmentResults", { attemptId: latestAttempt.id })}
                  style={{
                    marginTop: 8,
                    borderRadius: 16,
                    backgroundColor: colors.text,
                    paddingVertical: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.white, fontWeight: "800" }}>View Result</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>No attempt has been started yet.</Text>
          )}
        </Card>

        <Pressable
          onPress={() => navigation.navigate("AssessmentTake", { assessmentId })}
          style={{
            borderRadius: 18,
            backgroundColor: colors.amber,
            alignItems: "center",
            paddingVertical: 15,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>
            {latestAttempt?.isSubmitted ? "Retake / Review" : "Start Assessment"}
          </Text>
        </Pressable>
      </View>
    </ScreenScroll>
  );
}
