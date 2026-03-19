import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card, GradientHeader, Pill, ProgressBar, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { aiMentorMessages, lxpRecommendations, subjects, userProfile } from "../data/mockData";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "LXP">;

const confettiColors = [colors.amber, colors.green, colors.blue, colors.red, colors.purple];

export function LxpScreen(_: Props) {
  const [mentorMessageIdx, setMentorMessageIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedRecs, setCompletedRecs] = useState<string[]>([]);
  const weakSubjects = useMemo(() => subjects.filter((subject) => subject.progress < 40), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMentorMessageIdx((prev) => (prev + 1) % aiMentorMessages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleCompleteRec = (id: string) => {
    if (completedRecs.includes(id)) {
      return;
    }

    setCompletedRecs((prev) => [...prev, id]);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1800);
  };

  return (
    <ScreenScroll>
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
              <Text style={{ color: colors.white, fontSize: 18, fontWeight: "900" }}>{userProfile.streak}</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700" }}>Day Streak</Text>
          </View>
        }
      >
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialCommunityIcons name="flash" size={14} color="#FFD700" />
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Level {userProfile.level}</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" }}>
              {userProfile.xp} / 1500 XP
            </Text>
          </View>
          <ProgressBar value={(userProfile.xp / 1500) * 100} color="#FFD700" trackColor="rgba(255,255,255,0.28)" height={10} />
          <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 11 }}>250 XP to Level {userProfile.level + 1}</Text>
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Card style={{ backgroundColor: "#FFF8E7", marginBottom: 20 }}>
          <View
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: 999,
              backgroundColor: "#FFB83033",
            }}
          />
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
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#92400E" }}>AI Mentor</Text>
                <Pill label="Live" backgroundColor={colors.amber} color={colors.white} />
              </View>
              <Text style={{ fontSize: 13, lineHeight: 20, fontWeight: "700", color: "#92400E" }}>
                {aiMentorMessages[mentorMessageIdx]}
              </Text>
            </View>
          </View>
          <Pressable
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
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>Chat with Mentor</Text>
          </Pressable>
        </Card>

        {weakSubjects.length > 0 ? (
          <View style={{ marginBottom: 20 }}>
            <SectionTitle title="Needs Attention ⚠️" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {weakSubjects.map((subject) => (
                <Card
                  key={subject.id}
                  style={{
                    width: 148,
                    borderWidth: 2,
                    borderColor: `${subject.color}33`,
                  }}
                >
                  <Text style={{ fontSize: 30 }}>{subject.emoji}</Text>
                  <Text style={{ marginTop: 10, fontSize: 13, fontWeight: "800", color: colors.text }}>{subject.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={subject.progress} color={subject.color} trackColor="#EEF2F7" height={6} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: "900", color: colors.red }}>{subject.progress}%</Text>
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ marginBottom: 20 }}>
          <SectionTitle title="Recommended for You 🎯" />
          <View style={{ gap: 12 }}>
            {lxpRecommendations.map((recommendation) => {
              const isDone = completedRecs.includes(recommendation.id);
              return (
                <Card key={recommendation.id} style={{ opacity: isDone ? 0.65 : 1 }}>
                  {recommendation.urgent && !isDone ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: colors.red,
                      }}
                    />
                  ) : null}
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
                        label={recommendation.type === "retry" ? "🔄 Retry" : "📖 Lesson"}
                        backgroundColor={recommendation.type === "retry" ? colors.paleRed : colors.paleIndigo}
                        color={recommendation.type === "retry" ? colors.red : colors.indigo}
                      />
                      <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "800", color: colors.text }}>
                        {recommendation.title}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 11, color: colors.muted }}>{recommendation.reason}</Text>
                    </View>
                    <View style={{ alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MaterialCommunityIcons name="flash" size={12} color={colors.amber} />
                        <Text style={{ fontSize: 12, fontWeight: "900", color: colors.amber }}>+{recommendation.xp}</Text>
                      </View>
                      {isDone ? (
                        <Text style={{ fontSize: 18 }}>✅</Text>
                      ) : (
                        <Pressable
                          onPress={() => handleCompleteRec(recommendation.id)}
                          style={[
                            {
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                            },
                            shadow.card,
                            {
                              backgroundColor: recommendation.type === "retry" ? colors.red : colors.indigo,
                            },
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
              );
            })}
          </View>
        </View>

        <Card style={{ backgroundColor: "#F4F5FF", marginBottom: 12 }}>
          <SectionTitle title="Progress Recovery Tracker" />
          <View style={{ gap: 14 }}>
            {subjects.slice(0, 3).map((subject) => (
              <View key={subject.id}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{subject.emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>{subject.name}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: subject.color }}>{subject.progress}%</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ProgressBar value={subject.progress} color={subject.color} trackColor="rgba(255,255,255,0.7)" height={8} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.muted }}>target: 80%</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </ScreenScroll>
  );
}
