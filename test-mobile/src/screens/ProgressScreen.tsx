import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import {
  Card,
  GradientHeader,
  Pill,
  Refreshable,
  ScreenScroll,
  SectionTitle,
  SimpleBarChart,
  StatCard,
} from "../components/ui/primitives";
import { queryKeys, useLxpPlaylist, usePerformanceSummary, useStudentClasses } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { lessonsApi } from "../api/services/lessons";
import { buildAchievements, toAssessmentCard, toSubjectCard, toUserProfileSummary } from "../data/mappers";
import type { MainTabParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Progress">;

export function ProgressScreen(_: Props) {
  const { user } = useAuth();
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const performanceQuery = usePerformanceSummary();
  const classIds = classesQuery.data?.map((classItem) => classItem.id) ?? [];

  const lessonQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.lessons(classId),
      queryFn: () => lessonsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const completionQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.lessonCompletions(classId),
      queryFn: () => lessonsApi.getCompletedByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const assessmentQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.assessments(classId),
      queryFn: () => assessmentsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const subjects = useMemo(
    () =>
      (classesQuery.data ?? []).map((classItem, index) =>
        toSubjectCard(
          classItem,
          lessonQueries[index]?.data ?? [],
          completionQueries[index]?.data ?? [],
          performanceQuery.data?.classes.find((entry) => entry.classId === classItem.id),
        ),
      ),
    [classesQuery.data, completionQueries, lessonQueries, performanceQuery.data?.classes],
  );

  const assessments = useMemo(
    () =>
      assessmentQueries.flatMap((query, index) => {
        const subject = subjects[index];
        if (!subject || !query.data) return [];
        return query.data.map((assessment) => toAssessmentCard(assessment, subject, []));
      }),
    [assessmentQueries, subjects],
  );

  const playlistQuery = useLxpPlaylist(classIds[0]);
  const profileSummary = toUserProfileSummary(user ?? null, null, subjects, performanceQuery.data, assessments, playlistQuery.data);
  const chartData = useMemo(
    () =>
      subjects.map((subject) => ({
        label: subject.name.split(" ")[0],
        value: subject.progress,
        color: subject.color,
      })),
    [subjects],
  );
  const achievements = buildAchievements(performanceQuery.data, subjects, assessments, playlistQuery.data);

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={classesQuery.isRefetching || performanceQuery.isRefetching}
          onRefresh={() => {
            void Promise.all([classesQuery.refetch(), performanceQuery.refetch(), playlistQuery.refetch()]);
          }}
        />
      }
    >
      <GradientHeader colors={gradients.progress} eyebrow="Keep it up! 📈" title="My Progress">
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
          <StatCard icon="book-open-page-variant" iconColor="#A5D6A7" value={profileSummary.totalLessonsCompleted} label="Lessons" translucent />
          <StatCard icon="star" iconColor="#FFF176" value={`${profileSummary.averageScore}%`} label="Avg Score" translucent />
          <StatCard icon="fire" iconColor="#FF8A65" value={profileSummary.streak} label="Streak" translucent />
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
            <SectionTitle title="Performance Snapshot" />
            <Pill
              label={performanceQuery.data?.overall.atRiskClasses ? `${performanceQuery.data.overall.atRiskClasses} at risk` : "Stable"}
              backgroundColor={performanceQuery.data?.overall.atRiskClasses ? colors.paleRed : colors.paleGreen}
              color={performanceQuery.data?.overall.atRiskClasses ? colors.red : colors.green}
            />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text }}>
            {Math.round(performanceQuery.data?.overall.averageBlendedScore ?? 0)}%
          </Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }}>
            Derived from current performance snapshots and backend class data.
          </Text>
        </Card>

        <View style={{ marginBottom: 8 }}>
          <SectionTitle
            title="Achievements 🏆"
            right={<Pill label={`${achievements.filter((entry) => entry.earned).length}/${achievements.length}`} backgroundColor={colors.paleAmber} color={colors.amber} />}
          />
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
                  <Text style={{ fontSize: 32 }}>{achievement.emoji}</Text>
                  <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "900", color: colors.text }}>{achievement.title}</Text>
                  <Text style={{ marginTop: 4, fontSize: 10, lineHeight: 15, color: colors.muted }}>{achievement.description}</Text>
                  {achievement.earnedDate ? (
                    <Text style={{ marginTop: 6, fontSize: 9, fontWeight: "800", color: colors.green }}>{achievement.earnedDate}</Text>
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
