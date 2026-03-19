import { useMemo } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { Card, GradientHeader, Pill, ScreenScroll, SectionTitle, SimpleBarChart, StatCard } from "../components/ui/primitives";
import { achievements, assessments, subjects, userProfile } from "../data/mockData";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Progress">;

const scoreData = [
  { label: "W1", value: 72, color: colors.amber },
  { label: "W2", value: 78, color: colors.amber },
  { label: "W3", value: 75, color: colors.amber },
  { label: "W4", value: 85, color: colors.amber },
  { label: "W5", value: 82, color: colors.amber },
  { label: "W6", value: 90, color: colors.amber },
];

export function ProgressScreen(_: Props) {
  const chartData = useMemo(
    () =>
      subjects.map((subject) => ({
        label: subject.name.split(" ")[0],
        value: subject.progress,
        color: subject.color,
      })),
    []
  );
  const earnedAchievements = achievements.filter((achievement) => achievement.earned);
  const completedAssessments = assessments.filter((assessment) => assessment.status === "completed");
  const averageAssessmentScore =
    completedAssessments.length > 0
      ? Math.round(
          completedAssessments.reduce(
            (total, assessment) => total + (((assessment.score ?? 0) / assessment.totalScore) * 100),
            0
          ) / completedAssessments.length
        )
      : userProfile.averageScore;

  return (
    <ScreenScroll>
      <GradientHeader colors={gradients.progress} eyebrow="Keep it up! 📈" title="My Progress">
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <StatCard icon="book-open-page-variant" iconColor="#A5D6A7" value={userProfile.totalLessonsCompleted} label="Lessons" translucent />
          <StatCard icon="star" iconColor="#FFF176" value={`${averageAssessmentScore}%`} label="Avg Score" translucent />
          <StatCard icon="fire" iconColor="#FF8A65" value={userProfile.streak} label="Streak" translucent />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 18 }}>
        <Card>
          <SectionTitle title="Subject Progress" />
          <SimpleBarChart data={chartData} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
            {subjects.map((subject) => (
              <View key={subject.id} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={{ fontSize: 12 }}>{subject.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>
                  {subject.name.split(" ")[0]}: {subject.progress}%
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <SectionTitle title="Assessment Scores" />
            <Pill label="↑ Improving!" backgroundColor={colors.paleGreen} color={colors.green} />
          </View>
          <SimpleBarChart data={scoreData} minValue={60} maxValue={100} height={150} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>Before (W1)</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: colors.red }}>72%</Text>
            </View>
            <Text style={{ fontSize: 20, color: colors.green }}>↗</Text>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>After (W6)</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: colors.green }}>90%</Text>
            </View>
          </View>
        </Card>

        <View style={{ marginBottom: 8 }}>
          <SectionTitle title="Achievements 🏆" right={<Pill label={`${earnedAchievements.length}/${achievements.length}`} backgroundColor={colors.paleAmber} color={colors.amber} />} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={{ width: "48.2%" }}>
                <Card
                  style={{
                    backgroundColor: achievement.earned ? colors.white : "#F9FAFB",
                    borderWidth: achievement.earned ? 0 : 2,
                    borderStyle: achievement.earned ? "solid" : "dashed",
                    borderColor: achievement.earned ? colors.white : colors.border,
                    opacity: achievement.earned ? 1 : 0.66,
                  }}
                >
                  {achievement.earned ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.amber,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: colors.white }}>✓</Text>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 32 }}>{achievement.emoji}</Text>
                  <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "900", color: colors.text }}>
                    {achievement.title}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 10, lineHeight: 15, color: colors.muted }}>
                    {achievement.description}
                  </Text>
                  {achievement.earnedDate ? (
                    <Text style={{ marginTop: 6, fontSize: 9, fontWeight: "800", color: colors.green }}>
                      Earned {achievement.earnedDate}
                    </Text>
                  ) : null}
                </Card>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScreenScroll>
  );
}
