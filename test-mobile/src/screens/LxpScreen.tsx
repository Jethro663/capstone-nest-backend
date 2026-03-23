import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  AnimatedEntrance,
  Card,
  GradientHeader,
  Pill,
  ProgressBar,
  Refreshable,
  ScreenScroll,
  SectionTitle,
} from "../components/ui/primitives";
import { useLxpCheckpointMutation, useLxpEligibility, useLxpPlaylist, useStudentClasses, useTutorBootstrap } from "../api/hooks";
import { toTutorRecommendationCards, toSubjectCard } from "../data/mappers";
import { lessonsApi } from "../api/services/lessons";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { colors, gradients, shadow } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "LXP">;

const confettiColors = [colors.amber, colors.green, colors.blue, colors.red, colors.purple];

export function LxpScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [showConfetti, setShowConfetti] = useState(false);
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const eligibilityQuery = useLxpEligibility();
  const tutorBootstrapQuery = useTutorBootstrap(selectedClassId);
  const playlistQuery = useLxpPlaylist(selectedClassId);
  const checkpointMutation = useLxpCheckpointMutation(selectedClassId);

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedClassId(
        eligibilityQuery.data?.eligibleClasses[0]?.classId || tutorBootstrapQuery.data?.selectedClassId || classesQuery.data?.[0]?.id,
      );
    }
  }, [classesQuery.data, eligibilityQuery.data, selectedClassId, tutorBootstrapQuery.data?.selectedClassId]);

  const selectedClass = classesQuery.data?.find((classItem) => classItem.id === selectedClassId);
  const selectedSubject = selectedClass
    ? toSubjectCard(selectedClass, [], [], eligibilityQuery.data?.eligibleClasses.find((entry) => entry.classId === selectedClass.id) as any)
    : undefined;

  const recommendations = useMemo(
    () => toTutorRecommendationCards(playlistQuery.data, selectedSubject),
    [playlistQuery.data, selectedSubject],
  );

  const refreshing =
    eligibilityQuery.isRefetching || playlistQuery.isRefetching || tutorBootstrapQuery.isRefetching || classesQuery.isRefetching;

  const handleCompleteCheckpoint = async (assignmentId: string) => {
    await checkpointMutation.mutateAsync({ assignmentId });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1800);
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
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220, zIndex: 30 }}>
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
          <View
            style={{
              borderRadius: 18,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="fire" size={16} color="#FFD700" />
              <Text style={{ color: colors.white, fontSize: 18, fontWeight: "900" }}>
                {playlistQuery.data?.progress.streakDays ?? 0}
              </Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700" }}>Day Streak</Text>
          </View>
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
          <Pressable
            onPress={() => (navigation as any).navigate("AiTutor", { classId: selectedClassId })}
            style={{
              marginTop: 14,
              alignSelf: "flex-start",
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
        </Card>

        <View>
          <SectionTitle title="Eligible Classes" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {(eligibilityQuery.data?.eligibleClasses.length
              ? eligibilityQuery.data.eligibleClasses
              : (classesQuery.data ?? []).map((classItem) => ({
                  classId: classItem.id,
                  class: { id: classItem.id, subjectName: classItem.subjectName, subjectCode: classItem.subjectCode, section: classItem.section },
                } as any))
            ).map((entry) => (
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
        </View>

        <View>
          <SectionTitle title="Recommended for You 🎯" />
          <View style={{ gap: 12 }}>
            {recommendations.map((recommendation, index) => (
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
                          onPress={() => void handleCompleteCheckpoint(recommendation.id)}
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
            ))}
          </View>
        </View>

        <Card style={{ backgroundColor: "#F4F5FF", marginBottom: 12 }}>
          <SectionTitle title="Checkpoint Progress" />
          <View style={{ gap: 14 }}>
            {(playlistQuery.data?.checkpoints ?? []).map((checkpoint) => (
              <View key={checkpoint.id}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{selectedSubject?.emoji || "📘"}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>{checkpoint.label}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: checkpoint.isCompleted ? colors.green : colors.indigo }}>
                    {checkpoint.isCompleted ? "Done" : `+${checkpoint.xpAwarded} XP`}
                  </Text>
                </View>
                <ProgressBar value={checkpoint.isCompleted ? 100 : 0} color={checkpoint.isCompleted ? colors.green : colors.indigo} trackColor="rgba(255,255,255,0.7)" height={8} />
              </View>
            ))}
          </View>
        </Card>
      </View>
    </ScreenScroll>
  );
}
