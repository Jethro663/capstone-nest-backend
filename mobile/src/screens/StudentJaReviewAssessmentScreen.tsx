import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { jaApi } from "../api/services/ja";
import { toAppError } from "../api/http";
import { GradientHeader, ProgressBar, Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import { colors, gradients, shadow } from "../theme/tokens";
import type { JaPracticeSessionItem, JaPracticeSessionResponse, JaReviewAttemptSummary } from "../types/ja";
import { cleanJaClueText } from "../utils/cleanJaClue";

type Props = NativeStackScreenProps<RootStackParamList, "StudentJaReviewAssessment">;
type AnswerState = Record<string, string[]>;

const REVIEW_MAX_TRIES = 3;

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function normalizeAnswerIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  }
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
}

function getResponseAnswerIds(item: JaPracticeSessionItem) {
  const answer = item.response?.studentAnswer ?? {};
  return normalizeAnswerIds(answer.selectedOptionIds).concat(normalizeAnswerIds(answer.selectedOptionId));
}

function getCorrectOptionIds(item: JaPracticeSessionItem) {
  return Array.isArray(item.correctOptionIds) ? item.correctOptionIds : [];
}

function formatOptionNames(item: JaPracticeSessionItem, ids: string[]) {
  const options = item.options ?? [];
  const labels = ids.map((id) => options.find((option) => option.id === id)?.text ?? id).map(stripRichText);
  return labels.length ? labels.join(", ") : "No answer";
}

function getAttemptCount(attempt: JaReviewAttemptSummary) {
  return Math.max(0, Number(attempt.reviewSessionCount ?? 0));
}

function getAttemptLimit(attempt: JaReviewAttemptSummary) {
  return Math.max(1, Number(attempt.maxReviewSessions ?? REVIEW_MAX_TRIES));
}

function isAttemptLocked(attempt: JaReviewAttemptSummary) {
  return Boolean(attempt.locked) || (!attempt.activeReviewSessionId && getAttemptCount(attempt) >= getAttemptLimit(attempt));
}

function scoreSummary(session: JaPracticeSessionResponse | null) {
  const total = session?.items.length ?? 0;
  const correct = session?.items.filter((item) => item.response?.isCorrect).length ?? 0;
  return {
    correct,
    total,
    percent: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

export function StudentJaReviewAssessmentScreen({ navigation, route }: Props) {
  const { classId, assessmentId, attemptId, title } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<JaReviewAttemptSummary[]>([]);
  const [session, setSession] = useState<JaPracticeSessionResponse | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredAttempts = useMemo(() => {
    const rows = attemptId
      ? attempts.filter((attempt) => attempt.attemptId === attemptId)
      : assessmentId
        ? attempts.filter((attempt) => attempt.assessmentId === assessmentId)
        : attempts;
    return rows.sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));
  }, [assessmentId, attemptId, attempts]);

  const activeItem = session?.items[currentIndex] ?? null;
  const answeredCount = session?.items.filter((item) => item.response || answers[item.id]?.length).length ?? 0;
  const progress = session?.items.length ? (answeredCount / session.items.length) * 100 : 0;
  const submitted = Boolean(session && session.items.length > 0 && session.items.every((item) => item.response));
  const score = scoreSummary(session);

  const loadAttempts = useCallback(async () => {
    const hub = await jaApi.getHub(classId);
    setAttempts(hub.review.eligibleAttempts ?? []);
  }, [classId]);

  useEffect(() => {
    loadAttempts()
      .catch((error) => Alert.alert("Unable to load replay quiz", toAppError(error).message))
      .finally(() => setLoading(false));
  }, [loadAttempts]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      await loadAttempts();
      if (session) {
        setSession(await jaApi.getReviewSession(session.session.id));
      }
    } catch (error) {
      Alert.alert("Unable to refresh", toAppError(error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const startAttempt = async (attempt: JaReviewAttemptSummary) => {
    if (isAttemptLocked(attempt)) {
      Alert.alert("Replay locked", "This assessment already used all 3 JA replay tries.");
      return;
    }

    try {
      setBusy(true);
      const nextSession = await jaApi.createReviewSession({ classId, attemptId: attempt.attemptId, questionCount: 10 });
      setSession(nextSession);
      setAnswers({});
      setCurrentIndex(0);
    } catch (error) {
      Alert.alert("Unable to start replay", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseOption = (item: JaPracticeSessionItem, optionId: string) => {
    if (item.response) return;
    setAnswers((current) => {
      if (item.itemType === "multiple_select") {
        const selected = new Set(current[item.id] ?? []);
        if (selected.has(optionId)) selected.delete(optionId);
        else selected.add(optionId);
        return { ...current, [item.id]: Array.from(selected) };
      }
      return { ...current, [item.id]: [optionId] };
    });
  };

  const submit = async () => {
    if (!session || busy) return;
    const unanswered = session.items.filter((item) => !item.response);
    const missing = unanswered.find((item) => !answers[item.id]?.length);

    if (missing) {
      Alert.alert("Complete the replay", "Answer every question before submitting this JA replay quiz.");
      setCurrentIndex(Math.max(0, session.items.findIndex((item) => item.id === missing.id)));
      return;
    }

    try {
      setBusy(true);
      for (const item of unanswered) {
        const selected = answers[item.id] ?? [];
        const answer =
          item.itemType === "multiple_select"
            ? { selectedOptionIds: selected }
            : { selectedOptionId: selected[0] };
        await jaApi.submitReviewResponse(session.session.id, { itemId: item.id, answer });
      }

      let refreshed = await jaApi.getReviewSession(session.session.id);
      if (refreshed.session.status === "active" && refreshed.items.every((item) => item.response)) {
        await jaApi.completeReviewSession(session.session.id);
        refreshed = await jaApi.getReviewSession(session.session.id);
      }

      setSession(refreshed);
      await loadAttempts();
      Alert.alert("Replay submitted", "JA saved your result, revealed the answer key, and synced this intervention checkpoint.");
    } catch (error) {
      Alert.alert("Unable to submit replay", toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ marginTop: 10, color: theme.muted, fontWeight: "900" }}>Loading JA replay...</Text>
      </View>
    );
  }

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={refresh} />}>
      <GradientHeader
        colors={gradients.lxp}
        eyebrow="Learners Path Replay"
        title={title || activeItem?.prompt || filteredAttempts[0]?.assessmentTitle || "JA replay quiz"}
        rightContent={
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ color: colors.white, fontSize: 12, fontWeight: "900" }}>Back</Text>
          </Pressable>
        }
      >
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "800" }}>
            3 tries maximum | correct answers appear after submitting
          </Text>
          <ProgressBar value={progress} color="#FACC15" trackColor="rgba(255,255,255,0.24)" height={10} />
        </View>
      </GradientHeader>

      <View style={{ padding: 18, gap: 14 }}>
        {!session ? (
          <View style={{ gap: 12 }}>
            <View style={[{ borderRadius: 26, backgroundColor: colors.white, padding: 16 }, shadow.card]}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>Choose the assessment attempt</Text>
              <Text style={{ marginTop: 6, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
                JA will build a focused replay from your submitted assessment. Each assessment can be replayed up to 3 times.
              </Text>
            </View>

            {filteredAttempts.length ? (
              filteredAttempts.map((attempt) => {
                const used = getAttemptCount(attempt);
                const max = getAttemptLimit(attempt);
                const locked = isAttemptLocked(attempt);
                const remaining = Math.max(0, Number(attempt.remainingReviewSessions ?? max - used));

                return (
                  <Pressable key={attempt.attemptId} disabled={busy || locked} onPress={() => startAttempt(attempt)}>
                    <View style={[{ borderRadius: 24, backgroundColor: colors.white, padding: 15, opacity: locked ? 0.65 : 1 }, shadow.card]}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                        <View style={{ width: 46, height: 46, borderRadius: 18, backgroundColor: locked ? "#F1F5F9" : "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                          <MaterialCommunityIcons name={locked ? "lock" : "robot-happy-outline"} size={23} color={locked ? theme.muted : colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontSize: 14, fontWeight: "900" }}>{stripRichText(attempt.assessmentTitle)}</Text>
                          <Text style={{ marginTop: 4, color: theme.muted, fontSize: 11, fontWeight: "800" }}>
                            Previous score: {attempt.score ?? "--"}% | {formatDate(attempt.submittedAt)}
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginTop: 10 }}>
                            {Array.from({ length: max }).map((_, index) => {
                              const filled = index < used;
                              return (
                                <View
                                  key={index}
                                  style={{
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: filled ? colors.primary : "#CBD5E1",
                                    backgroundColor: filled ? "#EEF2FF" : "#F8FAFC",
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                  }}
                                >
                                  <Text style={{ color: filled ? colors.primary : theme.muted, fontSize: 10, fontWeight: "900" }}>Try {index + 1}</Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                          <Text style={{ marginTop: 9, color: locked ? colors.red : colors.green, fontSize: 12, fontWeight: "900" }}>
                            {locked ? "Locked after 3 tries" : `${remaining} replay ${remaining === 1 ? "try" : "tries"} left`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={[{ borderRadius: 24, backgroundColor: colors.white, padding: 16 }, shadow.card]}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "900", textAlign: "center" }}>No submitted attempt found</Text>
                <Text style={{ marginTop: 6, color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: "center" }}>
                  Finish the original assessment first, then return here for a JA replay.
                </Text>
              </View>
            )}
          </View>
        ) : activeItem ? (
          <View style={{ gap: 14 }}>
            <View style={[{ borderRadius: 26, backgroundColor: submitted ? "#F0FDF4" : colors.white, borderWidth: 1, borderColor: submitted ? "#86EFAC" : "#E2E8F0", padding: 14 }, shadow.card]}>
              <Text style={{ color: submitted ? "#166534" : colors.primary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>
                {submitted ? "Done - replay submitted" : `Question ${currentIndex + 1} of ${session.items.length}`}
              </Text>
              <Text style={{ marginTop: 7, color: theme.text, fontSize: 18, lineHeight: 25, fontWeight: "900" }}>{stripRichText(activeItem.prompt)}</Text>
              {submitted ? (
                <Text style={{ marginTop: 7, color: "#166534", fontSize: 12, fontWeight: "900" }}>
                  Score: {score.percent}% ({score.correct}/{score.total})
                </Text>
              ) : null}
            </View>

            <View style={[{ borderRadius: 28, backgroundColor: colors.white, padding: 16 }, shadow.card]}>
              <View style={{ gap: 10 }}>
                {(activeItem.options ?? []).map((option) => {
                  const selectedIds = activeItem.response ? getResponseAnswerIds(activeItem) : answers[activeItem.id] ?? [];
                  const selected = selectedIds.includes(option.id);
                  const correct = activeItem.response ? getCorrectOptionIds(activeItem).includes(option.id) : false;
                  const wrongSelected = Boolean(activeItem.response && selected && !correct);
                  const bg = correct ? "#DCFCE7" : wrongSelected ? "#FEE2E2" : selected ? "#EEF2FF" : "#F8FAFC";
                  const line = correct ? "#22C55E" : wrongSelected ? "#EF4444" : selected ? colors.primary : "#CBD5E1";

                  return (
                    <Pressable
                      key={option.id}
                      disabled={Boolean(activeItem.response)}
                      onPress={() => chooseOption(activeItem, option.id)}
                      style={{ borderRadius: 18, borderWidth: 1.5, borderColor: line, backgroundColor: bg, padding: 13 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                        <MaterialCommunityIcons
                          name={correct ? "check-circle" : wrongSelected ? "close-circle" : selected ? "radiobox-marked" : "radiobox-blank"}
                          size={19}
                          color={correct ? "#16A34A" : wrongSelected ? "#DC2626" : selected ? colors.primary : theme.muted}
                        />
                        <Text style={{ flex: 1, color: theme.text, fontSize: 13, fontWeight: "800" }}>{stripRichText(option.text)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {activeItem.response ? (
                <View style={{ marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: activeItem.response.isCorrect ? "#86EFAC" : "#FCA5A5", backgroundColor: activeItem.response.isCorrect ? "#F0FDF4" : "#FFF1F2", padding: 13 }}>
                  <Text style={{ color: activeItem.response.isCorrect ? "#166534" : "#BE123C", fontSize: 12, fontWeight: "900" }}>
                    {activeItem.response.isCorrect ? "Your answer is correct" : "Your answer needs review"}
                  </Text>
                  <Text style={{ marginTop: 7, color: theme.text, fontSize: 12, lineHeight: 18, fontWeight: "800" }}>
                    Your answer: {formatOptionNames(activeItem, getResponseAnswerIds(activeItem))}
                  </Text>
                  <Text style={{ marginTop: 5, color: "#166534", fontSize: 12, lineHeight: 18, fontWeight: "900" }}>
                    Correct answer: {formatOptionNames(activeItem, getCorrectOptionIds(activeItem))}
                  </Text>
                  {activeItem.response.feedback || activeItem.explanation || activeItem.hint ? (
                    <View style={{ marginTop: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.7)", padding: 10 }}>
                      <Text style={{ color: "#0F3F56", fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>JA clue</Text>
                      <Text style={{ marginTop: 3, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
                        {cleanJaClueText(activeItem.hint || activeItem.explanation || activeItem.response.feedback)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Pressable
                  disabled={currentIndex === 0}
                  onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                  style={{ flex: 1, borderRadius: 16, backgroundColor: currentIndex === 0 ? "#E2E8F0" : "#DBEAFE", paddingVertical: 12, alignItems: "center" }}
                >
                  <Text style={{ color: currentIndex === 0 ? theme.muted : colors.blue, fontWeight: "900" }}>Previous</Text>
                </Pressable>
                {currentIndex < session.items.length - 1 ? (
                  <Pressable onPress={() => setCurrentIndex((value) => Math.min(session.items.length - 1, value + 1))} style={{ flex: 1, borderRadius: 16, backgroundColor: colors.primary, paddingVertical: 12, alignItems: "center" }}>
                    <Text style={{ color: colors.white, fontWeight: "900" }}>Next</Text>
                  </Pressable>
                ) : (
                  <Pressable disabled={busy || submitted} onPress={submit} style={{ flex: 1, borderRadius: 16, backgroundColor: submitted ? colors.green : colors.primary, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
                    <MaterialCommunityIcons name={submitted ? "check" : "send"} size={14} color={colors.white} />
                    <Text style={{ color: colors.white, fontWeight: "900" }}>{submitted ? "Submitted" : busy ? "Submitting" : "Submit"}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
