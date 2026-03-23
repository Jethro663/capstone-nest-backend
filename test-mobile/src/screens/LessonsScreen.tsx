import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  AnimatedEntrance,
  Card,
  EmptyState,
  FloatingIconButton,
  GradientHeader,
  Pill,
  ProgressBar,
  Refreshable,
  ScreenScroll,
  SearchField,
  SectionTitle,
} from "../components/ui/primitives";
import { queryKeys, usePerformanceSummary, useStudentClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { lessonsApi } from "../api/services/lessons";
import { findContinueLearning, toAnnouncementPreview, toLessonCards, toSubjectCard } from "../data/mappers";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Lessons">,
  NativeStackScreenProps<RootStackParamList>
>;

export function LessonsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const performanceQuery = usePerformanceSummary();

  const classIds = useMemo(() => classesQuery.data?.map((classItem) => classItem.id) ?? [], [classesQuery.data]);

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

  const announcementQueries = useQueries({
    queries: classIds.slice(0, 3).map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });

  const subjectCards = useMemo(() => {
    if (!classesQuery.data) return [];

    return classesQuery.data.map((classItem, index) =>
      toSubjectCard(
        classItem,
        lessonQueries[index]?.data ?? [],
        completionQueries[index]?.data ?? [],
        performanceQuery.data?.classes.find((entry) => entry.classId === classItem.id),
      ),
    );
  }, [classesQuery.data, completionQueries, lessonQueries, performanceQuery.data?.classes]);

  const lessonMap = useMemo(
    () =>
      Object.fromEntries(
        subjectCards.map((subject, index) => [
          subject.id,
          toLessonCards(lessonQueries[index]?.data ?? [], completionQueries[index]?.data ?? [], subject),
        ]),
      ),
    [completionQueries, lessonQueries, subjectCards],
  );

  const announcements = useMemo(
    () =>
      announcementQueries.flatMap((query, index) => {
        const subject = subjectCards[index];
        if (!subject || !query.data) return [];
        return query.data.map((announcement) => toAnnouncementPreview(announcement, subject));
      }),
    [announcementQueries, subjectCards],
  );

  const continueLearning = useMemo(() => findContinueLearning(subjectCards, lessonMap), [lessonMap, subjectCards]);
  const filteredSubjects = subjectCards.filter((subject) =>
    `${subject.name} ${subject.subjectCode || ""}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const overallProgress =
    subjectCards.length > 0
      ? Math.round(subjectCards.reduce((total, subject) => total + subject.progress, 0) / subjectCards.length)
      : 0;

  const refreshing =
    classesQuery.isRefetching ||
    performanceQuery.isRefetching ||
    lessonQueries.some((query) => query.isRefetching) ||
    completionQueries.some((query) => query.isRefetching) ||
    announcementQueries.some((query) => query.isRefetching);

  const handleRefresh = () => {
    void Promise.all([
      classesQuery.refetch(),
      performanceQuery.refetch(),
      ...classIds.flatMap((classId) => [
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons(classId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessonCompletions(classId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.announcements(classId) }),
      ]),
    ]);
  };

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
      <GradientHeader
        colors={gradients.lessons}
        eyebrow={`Welcome back, ${user?.firstName || "Student"} 👋`}
        title="Student Home"
        rightContent={<FloatingIconButton icon="refresh" onPress={handleRefresh} />}
      >
        <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "700" }}>Daily progress target</Text>
              <Text style={{ marginTop: 3, color: colors.white, fontSize: 22, fontWeight: "900" }}>
                {overallProgress}% learning rhythm
              </Text>
            </View>
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.22)",
              }}
            >
              <MaterialCommunityIcons name="rocket-launch" size={28} color={colors.white} />
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={overallProgress} color={colors.white} trackColor="rgba(255,255,255,0.26)" height={10} />
          </View>
          <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.86)", fontSize: 12 }}>
            Continue lessons, review new announcements, and finish the next due assessment from one place.
          </Text>
        </View>

        <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search classes or subjects..." />
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 22 }}>
        {classesQuery.isLoading ? (
          <EmptyState emoji="⏳" title="Loading workspace" subtitle="Pulling your classes and student data now." />
        ) : (
          <>
            <View>
              <SectionTitle
                title="Continue Learning 🎯"
                right={<Pill label={`${continueLearning.length} live`} backgroundColor={colors.paleAmber} color={colors.amber} />}
              />
              {continueLearning.length === 0 ? (
                <Card>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>No active lesson yet.</Text>
                  <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 12 }}>
                    Open one of your classes below to start the next recommended lesson.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: 12 }}>
                  {continueLearning.map(({ lesson, subject }, index) => (
                    <AnimatedEntrance key={lesson.id} delay={index * 80}>
                      <Pressable
                        onPress={() => navigation.navigate("SubjectLessons", { classId: subject.id })}
                        style={[
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 14,
                            borderRadius: 24,
                            backgroundColor: colors.white,
                            padding: 16,
                          },
                          shadow.card,
                        ]}
                      >
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: subject.bgColor,
                          }}
                        >
                          <Text style={{ fontSize: 28 }}>{subject.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>{subject.name}</Text>
                          <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "900", color: colors.text }}>{lesson.title}</Text>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{lesson.description}</Text>
                        </View>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: subject.color,
                          }}
                        >
                          <MaterialCommunityIcons name="play" size={18} color={colors.white} />
                        </View>
                      </Pressable>
                    </AnimatedEntrance>
                  ))}
                </View>
              )}
            </View>

            <View>
              <SectionTitle
                title="Announcements 📢"
                right={<Pill label={`${announcements.length} updates`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />}
              />
              {announcements.length === 0 ? (
                <Card>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    No recent class announcements were returned by the backend.
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: 12 }}>
                  {announcements.slice(0, 3).map((announcement, index) => (
                    <AnimatedEntrance key={announcement.id} delay={index * 90}>
                      <Card>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Text style={{ fontSize: 24 }}>{announcement.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{announcement.title}</Text>
                            <Text style={{ marginTop: 2, fontSize: 11, color: colors.textSecondary }}>
                              {announcement.subject} • {announcement.createdAt}
                            </Text>
                          </View>
                          {announcement.isPinned ? (
                            <Pill label="Pinned" backgroundColor={colors.paleAmber} color={colors.orange} />
                          ) : null}
                        </View>
                        <Text style={{ marginTop: 10, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                          {announcement.content}
                        </Text>
                      </Card>
                    </AnimatedEntrance>
                  ))}
                </View>
              )}
            </View>

            <View>
              <SectionTitle
                title="My Classes 📚"
                right={<Pill label={`${subjectCards.length} classes`} backgroundColor={colors.paleIndigo} color={colors.indigo} />}
              />
              {filteredSubjects.length === 0 ? (
                <EmptyState emoji="🔎" title="No matches found" subtitle="Try a different class or subject keyword." />
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                  {filteredSubjects.map((subject, index) => (
                    <AnimatedEntrance key={subject.id} delay={index * 70} style={{ width: "48%" }}>
                      <Pressable onPress={() => navigation.navigate("SubjectLessons", { classId: subject.id })}>
                        <Card style={{ minHeight: 190 }}>
                          <View
                            style={{
                              position: "absolute",
                              top: -16,
                              right: -16,
                              width: 72,
                              height: 72,
                              borderRadius: 999,
                              backgroundColor: `${subject.color}24`,
                            }}
                          />
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 16,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: subject.bgColor,
                            }}
                          >
                            <Text style={{ fontSize: 28 }}>{subject.emoji}</Text>
                          </View>
                          <Text style={{ marginTop: 14, fontSize: 14, fontWeight: "900", color: colors.text }}>
                            {subject.name}
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                            {subject.subjectCode} • {subject.section}
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>{subject.teacherName}</Text>
                          <View style={{ marginTop: 12 }}>
                            <ProgressBar value={subject.progress} color={subject.color} trackColor="#EEF2F7" height={7} />
                          </View>
                          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontSize: 11, fontWeight: "800", color: subject.color }}>{subject.progress}%</Text>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary }}>
                              {subject.completedLessons}/{subject.totalLessons} lessons
                            </Text>
                          </View>
                        </Card>
                      </Pressable>
                    </AnimatedEntrance>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </ScreenScroll>
  );
}
