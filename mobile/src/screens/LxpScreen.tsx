import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  AnimatedEntrance,
  Card,
  EmptyState,
  GradientHeader,
  Pill,
  ProgressBar,
  Refreshable,
  ScreenScroll,
  SectionTitle,
} from "../components/ui/primitives";
import { peekAppError, toAppError } from "../api/http";
import { useLxpCheckpointMutation, useLxpEligibility, useLxpPlaylist, useStudentClasses, useTutorBootstrap } from "../api/hooks";
import { toTutorRecommendationCards, toSubjectCard } from "../data/mappers";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { resolveInitialLxpClassId } from "./screen-flow";
import { colors, gradients, shadow } from "../theme/tokens";
import { stripRichText } from "../theme/studentDark";
import type { GuidedAssessmentAttemptSummary, LxpCheckpoint } from "../types/lxp";

type Props = BottomTabScreenProps<MainTabParamList, "LXP">;

const confettiColors = [colors.amber, colors.green, colors.blue, colors.red, colors.purple];

function formatScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : "No score";
}

function getGuidedAttemptSlots(summary?: GuidedAssessmentAttemptSummary | null) {
  const maxAttempts = summary?.maxAttempts ?? 3;
  return Array.from({ length: maxAttempts }, (_, index) => {
    const attemptNumber = index + 1;
    const attempt = summary?.attempts.find((item) => item.attemptNumber === attemptNumber) ?? null;
    return { attemptNumber, attempt };
  });
}

function getGuidedStatus(checkpoint: LxpCheckpoint) {
  const summary = checkpoint.guidedAttemptSummary;
  const hasSubmitted = Boolean(summary?.attempts.some((attempt) => attempt.status === "submitted"));

  if (checkpoint.isCompleted || summary?.passed) return { label: "Done", color: colors.green, bg: "#DCFCE7" };
  if (summary?.isLocked) return { label: "Locked", color: colors.textSecondary, bg: "#E5E7EB" };
  if (hasSubmitted && summary?.canRetry) return { label: "Retry available", color: colors.amber, bg: "#FEF3C7" };
  if (hasSubmitted) return { label: "Submitted", color: colors.indigo, bg: colors.paleIndigo };
  return { label: "Not yet taken", color: colors.red, bg: colors.paleRed };
}

function getGuidedButtonLabel(checkpoint: LxpCheckpoint) {
  const summary = checkpoint.guidedAttemptSummary;
  const hasSubmitted = Boolean(summary?.attempts.some((attempt) => attempt.status === "submitted"));

  if (checkpoint.isCompleted || summary?.passed) return "View result";
  if (summary?.isLocked) return "View locked result";
  if (hasSubmitted && summary?.canRetry) return "Retry AI quiz";
  if (hasSubmitted) return "View result";
  return "Open AI quiz";
}

export function LxpScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkpointActionError, setCheckpointActionError] = useState<string | null>(null);
  const [tutorLaunchError, setTutorLaunchError] = useState<string | null>(null);
  const [showRationaleModal, setShowRationaleModal] = useState(false);
  const [showProgressStatusModal, setShowProgressStatusModal] = useState(false);
  const [selectedRetryCheckpoint, setSelectedRetryCheckpoint] = useState<LxpCheckpoint | null>(null);

  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const eligibilityQuery = useLxpEligibility();
  const tutorBootstrapQuery = useTutorBootstrap(selectedClassId);
  const playlistQuery = useLxpPlaylist(selectedClassId);
  const checkpointMutation = useLxpCheckpointMutation(selectedClassId);

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedClassId(
        resolveInitialLxpClassId({
          selectedClassId,
          eligibleClassId: eligibilityQuery.data?.eligibleClasses[0]?.classId,
          tutorSelectedClassId: tutorBootstrapQuery.data?.selectedClassId,
          fallbackClassId: classesQuery.data?.[0]?.id,
        }),
      );
    }
  }, [classesQuery.data, eligibilityQuery.data, selectedClassId, tutorBootstrapQuery.data?.selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      setTutorLaunchError(null);
    }
  }, [selectedClassId]);

  const selectedClass = classesQuery.data?.find((classItem) => classItem.id === selectedClassId);
  const selectedEligibility = eligibilityQuery.data?.eligibleClasses.find((entry) => entry.classId === selectedClass?.id);
  const selectedSubject = selectedClass ? toSubjectCard(selectedClass, [], [], selectedEligibility as never) : undefined;

  const recommendations = useMemo(
    () => toTutorRecommendationCards(playlistQuery.data, selectedSubject),
    [playlistQuery.data, selectedSubject],
  );

  const refreshing =
    eligibilityQuery.isRefetching || playlistQuery.isRefetching || tutorBootstrapQuery.isRefetching || classesQuery.isRefetching;
  const primaryError =
    classesQuery.error || eligibilityQuery.error || playlistQuery.error || checkpointMutation.error;
  const eligibleClassCards =
    eligibilityQuery.data?.eligibleClasses.length
      ? eligibilityQuery.data.eligibleClasses
      : (classesQuery.data ?? []).map((classItem) => ({
          classId: classItem.id,
          class: {
            id: classItem.id,
            subjectName: classItem.subjectName || classItem.className || classItem.name || "Untitled Subject",
            subjectCode: classItem.subjectCode || "CLASS",
            section: classItem.section ?? null,
          },
          interventionCaseId: null,
          isAtRisk: false,
          blendedScore: null,
          thresholdApplied: 0,
          openedAt: null,
        }));

  const handleCompleteCheckpoint = async (assignmentId: string) => {
    try {
      await checkpointMutation.mutateAsync({ assignmentId });
      setCheckpointActionError(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1800);
    } catch (error) {
      setCheckpointActionError(toAppError(error).message);
    }
  };

  const handleOpenTutor = () => {
    if (!selectedClassId) {
      setTutorLaunchError("Select a class before opening the tutor");
      return;
    }
    setTutorLaunchError(null);
    (navigation as any).navigate("AiTutor", { classId: selectedClassId });
  };

  const handleOpenCheckpoint = (
    checkpointId: string,
    type?: string,
    options?: { assessmentId?: string; title?: string },
  ) => {
    if (!selectedClassId) return;
    if (type === "guided_assessment") {
      (navigation as any).navigate("StudentGuidedAssessment", {
        classId: selectedClassId,
        assignmentId: checkpointId,
      });
      return;
    }
    if (type === "assessment_retry") {
      (navigation as any).navigate("StudentJaReviewAssessment", {
        classId: selectedClassId,
        assessmentId: options?.assessmentId,
        title: options?.title,
      });
    }
  };

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([
              classesQuery.refetch(),
              eligibilityQuery.refetch(),
              tutorBootstrapQuery.refetch(),
              playlistQuery.refetch(),
            ]);
          }}
        />
      }
    >
      {showConfetti ? (
        <View style={{ pointerEvents: "none", position: "absolute", top: 0, left: 0, right: 0, height: 220, zIndex: 30 }}>
          {Array.from({ length: 16 }).map((_, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                top: 12 + (index % 5) * 22,
                left: 18 + (index % 4) * 78 + (index % 2) * 14,
                width: index % 2 === 0 ? 8 : 10,
                height: index % 2 === 0 ? 16 : 10,
                borderRadius: index % 3 === 0 ? 999 : 3,
                backgroundColor: confettiColors[index % confettiColors.length],
                opacity: 0.9,
              }}
            />
          ))}
        </View>
      ) : null}

      <GradientHeader
        colors={gradients.lxp}
        eyebrow="Learning Experience ✨"
        title="LXP Dashboard"
        rightContent={
          <Pressable
            onPress={() => setShowProgressStatusModal(true)}
            style={{
              borderRadius: 18,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: "rgba(255,255,255,0.22)",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="fire" size={16} color="#FFD700" />
              <Text style={{ color: colors.white, fontSize: 16, fontWeight: "900" }}>
                {playlistQuery.data?.progress.streakDays ?? 0}
              </Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: "800", marginTop: 2 }}>
              Support Status 📊
            </Text>
          </Pressable>
        }
      >
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialCommunityIcons name="flash" size={14} color="#FFD700" />
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
                {playlistQuery.data?.progress.xpTotal ?? 0} XP
              </Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" }}>
              {playlistQuery.data?.progress.checkpointsCompleted ?? 0} checkpoints done
            </Text>
          </View>
          <ProgressBar
            value={playlistQuery.data?.progress.completionPercent ?? 0}
            color="#FFD700"
            trackColor="rgba(255,255,255,0.28)"
            height={10}
          />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 20 }}>
        {primaryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>LXP data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {peekAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        {checkpointActionError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Checkpoint update failed
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {checkpointActionError}
            </Text>
          </Card>
        ) : null}

        {tutorLaunchError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>
              Tutor unavailable
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {tutorLaunchError}
            </Text>
          </Card>
        ) : null}
        <Card style={{ backgroundColor: "#FFF8E7" }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FDE68A",
              }}
            >
              <Text style={{ fontSize: 28 }}>🤖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#92400E" }}>AI Tutor</Text>
                <Pill label="Live" backgroundColor={colors.amber} color={colors.white} />
              </View>
              <Text style={{ fontSize: 13, lineHeight: 20, fontWeight: "700", color: "#92400E" }}>
                {tutorBootstrapQuery.data?.recommendations[0]?.reason ||
                  "The student tutor is ready with grounded recommendations from your weak topics."}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Pressable
              onPress={handleOpenTutor}
              style={{
                borderRadius: 999,
                backgroundColor: colors.amber,
                paddingHorizontal: 16,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MaterialCommunityIcons name="message-text" size={14} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Open Tutor</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowRationaleModal(true)}
              style={{
                borderRadius: 999,
                backgroundColor: "rgba(146, 64, 14, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(146, 64, 14, 0.25)",
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MaterialCommunityIcons name="information-outline" size={14} color="#92400E" />
              <Text style={{ color: "#92400E", fontSize: 12, fontWeight: "800" }}>Why This Path Opened?</Text>
            </Pressable>
          </View>
        </Card>

        <View>
          <SectionTitle title="Eligible Classes" />
          {eligibleClassCards.length === 0 ? (
            <EmptyState emoji="📘" title="No classes ready" subtitle="Your account has no classes available for LXP yet." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {eligibleClassCards.map((entry) => (
                <Pressable key={entry.classId} onPress={() => setSelectedClassId(entry.classId)}>
                  <Card
                    style={{
                      width: 176,
                      borderWidth: 2,
                      borderColor: entry.classId === selectedClassId ? colors.indigo : `${colors.indigo}22`,
                    }}
                  >
                    <Text style={{ fontSize: 30 }}>{selectedSubject?.emoji || "📘"}</Text>
                    <Text style={{ marginTop: 10, fontSize: 13, fontWeight: "800", color: colors.text }}>
                      {entry.class.subjectName}
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      {entry.class.subjectCode}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View>
          <SectionTitle title="Recommended for You 🎯" />
          <View style={{ gap: 12 }}>
            {recommendations.length === 0 ? (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>No LXP recommendations yet</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                  Once checkpoints are available for a class, they will show up here.
                </Text>
              </Card>
            ) : (
              recommendations.map((recommendation, index) => (
                <AnimatedEntrance key={recommendation.id} delay={index * 80}>
                  <Card style={{ opacity: recommendation.completed ? 0.7 : 1 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: recommendation.type === "retry" ? colors.paleRed : colors.paleIndigo,
                        }}
                      >
                        <Text style={{ fontSize: 28 }}>{recommendation.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Pill
                          label={recommendation.type === "retry" ? "Retry" : "Lesson"}
                          backgroundColor={recommendation.type === "retry" ? colors.paleRed : colors.paleIndigo}
                          color={recommendation.type === "retry" ? colors.red : colors.indigo}
                        />
                        <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "800", color: colors.text }}>
                          {recommendation.title}
                        </Text>
                        <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>{recommendation.reason}</Text>
                      </View>
                      <View style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialCommunityIcons name="flash" size={12} color={colors.amber} />
                          <Text style={{ fontSize: 12, fontWeight: "900", color: colors.amber }}>+{recommendation.xp}</Text>
                        </View>
                        {recommendation.completed ? (
                          <Text style={{ fontSize: 18 }}>✅</Text>
                        ) : (
                          <Pressable
                            onPress={() => {
                              if (recommendation.type === "retry") {
                                handleOpenCheckpoint(recommendation.id, "assessment_retry", { title: recommendation.title });
                                return;
                              }
                              void handleCompleteCheckpoint(recommendation.id);
                            }}
                            style={[
                              {
                                width: 34,
                                height: 34,
                                borderRadius: 999,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: recommendation.type === "retry" ? colors.red : colors.indigo,
                              },
                              shadow.card,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={recommendation.type === "retry" ? "refresh" : "chevron-right"}
                              size={16}
                              color={colors.white}
                            />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Card>
                </AnimatedEntrance>
              ))
            )}
          </View>
        </View>

        <Card style={{ backgroundColor: "#F4F5FF", marginBottom: 12 }}>
          <SectionTitle title="Checkpoint Progress" />
          <View style={{ gap: 14 }}>
            {(playlistQuery.data?.checkpoints ?? []).length === 0 ? (
              <EmptyState emoji="🚀" title="No checkpoints yet" subtitle="This class has not opened any LXP checkpoint progress." />
            ) : (
              (playlistQuery.data?.checkpoints ?? []).map((checkpoint) => {
                const guidedSummary = checkpoint.guidedAttemptSummary ?? null;
                const guidedStatus = checkpoint.type === "guided_assessment" ? getGuidedStatus(checkpoint) : null;
                const guidedSlots = checkpoint.type === "guided_assessment" ? getGuidedAttemptSlots(guidedSummary) : [];

                return (
                  <View key={checkpoint.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ fontSize: 14 }}>{selectedSubject?.emoji || "📘"}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                          {stripRichText(checkpoint.guidedAssessment?.title || checkpoint.generatedLesson?.title || checkpoint.label)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: guidedStatus?.color ?? (checkpoint.isCompleted ? colors.green : colors.indigo) }}>
                        {guidedStatus?.label ?? (checkpoint.isCompleted ? "Done" : `+${checkpoint.xpAwarded} XP`)}
                      </Text>
                    </View>
                    {checkpoint.type === "guided_assessment" ? (
                      <View style={{ marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: "#D7E3FF", backgroundColor: "#F8FBFF", padding: 10, gap: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: "900", color: colors.indigo }}>AI Plan tries</Text>
                          <Text style={{ fontSize: 11, fontWeight: "900", color: colors.text }}>
                            {guidedSummary ? `${guidedSummary.attemptsUsed}/${guidedSummary.maxAttempts} submitted` : "0/3 submitted"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {guidedSlots.map(({ attemptNumber, attempt }) => {
                            const submitted = attempt?.status === "submitted";
                            const passed =
                              submitted &&
                              typeof attempt?.scorePercent === "number" &&
                              typeof guidedSummary?.passingScore === "number" &&
                              attempt.scorePercent >= guidedSummary.passingScore;
                            const color = !attempt ? colors.textSecondary : passed ? colors.green : submitted ? colors.red : colors.indigo;
                            const bg = !attempt ? colors.white : passed ? "#DCFCE7" : submitted ? colors.paleRed : colors.paleIndigo;
                            return (
                              <View key={attemptNumber} style={{ borderRadius: 999, borderWidth: 1, borderColor: `${color}44`, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 5 }}>
                                <Text style={{ color, fontSize: 10, fontWeight: "900" }}>
                                  Try {attemptNumber}: {attempt ? formatScore(attempt.scorePercent) : "Not taken"}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: colors.textSecondary }}>
                          Best {formatScore(guidedSummary?.bestScorePercent)} - Passing {formatScore(guidedSummary?.passingScore)}
                        </Text>
                      </View>
                    ) : null}
                    <ProgressBar
                      value={checkpoint.isCompleted ? 100 : 0}
                      color={checkpoint.isCompleted ? colors.green : colors.indigo}
                      trackColor={colors.border}
                      height={8}
                    />
                    {checkpoint.type === "guided_assessment" || checkpoint.type === "assessment_retry" ? (
                      <Pressable
                        onPress={() =>
                          handleOpenCheckpoint(checkpoint.id, checkpoint.type, {
                            assessmentId: checkpoint.assessment?.id,
                            title:
                              checkpoint.guidedAssessment?.title ||
                              checkpoint.assessment?.title ||
                              checkpoint.generatedLesson?.title ||
                              checkpoint.label,
                          })
                        }
                        style={{
                          marginTop: 8,
                          alignSelf: "flex-start",
                          borderRadius: 999,
                          backgroundColor: checkpoint.isCompleted ? colors.green : colors.indigo,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: colors.white, fontSize: 11, fontWeight: "900" }}>
                          {checkpoint.type === "guided_assessment" ? getGuidedButtonLabel(checkpoint) : checkpoint.isCompleted ? "View result" : "Open assessment"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </Card>
      </View>

      {/* 1. Rationale Modal: Why This Path Opened */}
      <Modal visible={showRationaleModal} transparent animationType="slide" onRequestClose={() => setShowRationaleModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 24 }}>💡</Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Why This Path Opened</Text>
              </View>
              <Pressable onPress={() => setShowRationaleModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ borderRadius: 16, backgroundColor: colors.paleRed, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.red, textTransform: "uppercase" }}>Intervention Trigger Score</Text>
                <Text style={{ marginTop: 4, fontSize: 22, fontWeight: "900", color: colors.red }}>
                  62.5% <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textSecondary }}>(Threshold: 75.0%)</Text>
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.text }}>
                  This personalized support path was generated because your score on the recent assessment was below the class mastery threshold.
                </Text>
              </View>

              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text, marginBottom: 8 }}>Target Weak Concepts:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {["Algebraic Expressions", "Polynomial Long Division", "Factoring Quadratics"].map((concept) => (
                  <View key={concept} style={{ borderRadius: 999, backgroundColor: colors.paleIndigo, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: colors.indigo }}>🎯 {concept}</Text>
                  </View>
                ))}
              </View>

              <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text, marginBottom: 6 }}>AI Recommendation Rationale:</Text>
              <Text style={{ fontSize: 12, lineHeight: 20, color: colors.textSecondary, marginBottom: 20 }}>
                Complete the recommended checkpoint lessons and AI guided quizzes below to strengthen your understanding. Earning 75%+ on retries will mark this intervention completed and boost your class grade!
              </Text>
            </ScrollView>
            <Pressable
              onPress={() => setShowRationaleModal(false)}
              style={{ borderRadius: 12, backgroundColor: colors.indigo, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>Got it, return to path</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 2. Progress & Support Status Modal */}
      <Modal visible={showProgressStatusModal} transparent animationType="slide" onRequestClose={() => setShowProgressStatusModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="chart-donut" size={24} color={colors.indigo} />
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Progress & Support Status</Text>
              </View>
              <Pressable onPress={() => setShowProgressStatusModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.paleIndigo, padding: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: colors.indigo, textTransform: "uppercase" }}>Checkpoints</Text>
                  <Text style={{ marginTop: 4, fontSize: 20, fontWeight: "900", color: colors.indigo }}>
                    {playlistQuery.data?.progress.checkpointsCompleted ?? 0} / {playlistQuery.data?.checkpoints.length ?? 0}
                  </Text>
                </View>
                <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#FEF3C7", padding: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#92400E", textTransform: "uppercase" }}>XP Points</Text>
                  <Text style={{ marginTop: 4, fontSize: 20, fontWeight: "900", color: "#92400E" }}>
                    {playlistQuery.data?.progress.xpTotal ?? 0}
                  </Text>
                </View>
              </View>

              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>Support Path Status</Text>
                  <Pill label="Active Intervention" backgroundColor={colors.paleRed} color={colors.red} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Day Streak</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.amber }}>🔥 {playlistQuery.data?.progress.streakDays ?? 0} Days</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Completion Progress</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.green }}>
                    {playlistQuery.data?.progress.completionPercent?.toFixed(0) ?? 0}%
                  </Text>
                </View>
              </View>
            </ScrollView>
            <Pressable
              onPress={() => setShowProgressStatusModal(false)}
              style={{ borderRadius: 12, backgroundColor: colors.indigo, paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: "800" }}>Close Status</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenScroll>
  );
}
