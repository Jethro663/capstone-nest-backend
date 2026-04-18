import { useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { Card, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { useAssessmentAttempts, useAssessmentDetail } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentDetail">;

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

function formatDisplayDate(value?: string | null) {
  if (!value) return "No due date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AssessmentDetailScreen({ route, navigation }: Props) {
  const { assessmentId, classId } = route.params;
  const detailQuery = useAssessmentDetail(assessmentId);
  const attemptsQuery = useAssessmentAttempts(assessmentId);
  const assessment = detailQuery.data;

  const attempts = useMemo(
    () =>
      [...(attemptsQuery.data ?? [])].sort(
        (left, right) => getAttemptTime(right as never) - getAttemptTime(left as never),
      ),
    [attemptsQuery.data],
  );

  const latestAttempt = attempts[0] ?? null;
  const submittedAttempts = attempts.filter((attempt) => attempt.isSubmitted !== false);
  const latestSubmittedAttempt = submittedAttempts[0] ?? null;
  const latestAttemptNumber =
    latestAttempt?.attemptNumber ?? submittedAttempts.length ?? 1;
  const attemptsRemaining = Math.max(
    0,
    (assessment?.maxAttempts ?? 1) - submittedAttempts.length,
  );
  const latestStatusLabel = latestAttempt
    ? latestAttempt.isSubmitted === false
      ? "In Progress"
      : latestAttempt.isReturned
        ? "Returned"
        : "Awaiting Review"
    : "Not Started";
  const hasQueryError = detailQuery.error || attemptsQuery.error;

  const openAssessment = () => {
    navigation.navigate("AssessmentTake", { assessmentId });
  };

  const openResults = (attemptId: string) => {
    navigation.navigate("AssessmentResults", { attemptId, assessmentId } as never);
  };

  const openHistory = () => {
    navigation.navigate("AssessmentHistory", { assessmentId, classId });
  };

  if (!assessment && !hasQueryError) {
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
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors.textSecondary }}>Loading assessment...</Text>
        </View>
      </ScreenScroll>
    );
  }

  if (!assessment) {
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
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
          <Card>
            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
              Assessment unavailable
            </Text>
            <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>
              {toAppError(hasQueryError).message}
            </Text>
          </Card>
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
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
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
          <Pressable
            onPress={openHistory}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <MaterialCommunityIcons name="history" size={18} color={colors.white} />
          </Pressable>
        </View>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pill
            label={String(assessment.type || "assessment").replaceAll("_", " ")}
            backgroundColor="rgba(255,255,255,0.18)"
            color={colors.white}
          />
          <Pill
            label={`${assessment.questions?.length ?? 0} questions`}
            backgroundColor="rgba(255,255,255,0.18)"
            color={colors.white}
          />
          <Pill
            label={`${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left`}
            backgroundColor="rgba(255,255,255,0.18)"
            color={colors.white}
          />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 14 }}>
        {hasQueryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Some assessment data is unavailable
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(hasQueryError).message}
            </Text>
          </Card>
        ) : null}

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
          <SectionTitle title="Attempt status" />
          {latestAttempt ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Attempt #{latestAttemptNumber}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: colors.text }}>
                    {latestStatusLabel}
                  </Text>
                </View>
                <Pill
                  label={latestStatusLabel}
                  backgroundColor={
                    latestAttempt.isSubmitted === false
                      ? colors.paleBlue
                      : latestAttempt.isReturned
                        ? colors.paleGreen
                        : colors.paleAmber
                  }
                  color={
                    latestAttempt.isSubmitted === false
                      ? colors.blueDeep
                      : latestAttempt.isReturned
                        ? colors.green
                        : colors.orange
                  }
                />
              </View>
              <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                {latestAttempt.isSubmitted === false
                  ? "You still have an open draft for this assessment."
                  : latestAttempt.isReturned
                    ? `Latest score: ${Math.round(latestAttempt.score ?? 0)}`
                    : "Your teacher has not returned this attempt yet."}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {latestAttempt.isSubmitted === false ? (
                  <Pressable
                    onPress={openAssessment}
                    style={{
                      borderRadius: 16,
                      backgroundColor: colors.text,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Continue Attempt</Text>
                  </Pressable>
                ) : latestSubmittedAttempt ? (
                  <Pressable
                    onPress={() => openResults(latestSubmittedAttempt.id)}
                    style={{
                      borderRadius: 16,
                      backgroundColor: colors.text,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>View Results</Text>
                  </Pressable>
                ) : null}
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
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                No attempt has been started yet.
              </Text>
              <Pressable
                onPress={openAssessment}
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 16,
                  backgroundColor: colors.text,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Start Assessment</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <Card>
          <SectionTitle title="Next action" />
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
            {latestAttempt?.isSubmitted === false
              ? "Resume your active draft to keep working without creating a new attempt."
              : latestSubmittedAttempt
                ? "Review your latest submitted work or start another attempt if you still have attempts left."
                : "Start this assessment when you are ready."}
          </Text>
          <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {latestAttempt?.isSubmitted === false ? null : attemptsRemaining > 0 ? (
              <Pressable
                onPress={openAssessment}
                style={{
                  borderRadius: 16,
                  backgroundColor: colors.amber,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
                  {latestSubmittedAttempt ? "Retake Assessment" : "Start Assessment"}
                </Text>
              </Pressable>
            ) : (
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: colors.border,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>No attempts remaining</Text>
              </View>
            )}
          </View>
        </Card>
      </View>
    </ScreenScroll>
  );
}
