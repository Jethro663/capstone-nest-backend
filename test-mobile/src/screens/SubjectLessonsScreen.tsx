import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  AnimatedEntrance,
  EmptyState,
  GradientHeader,
  Pill,
  ProgressBar,
  Refreshable,
  ScreenScroll,
} from "../components/ui/primitives";
import { useClassDetail, useLessonCompleteMutation, useLessonCompletions, useLessons } from "../api/hooks";
import { toLessonCards, toSubjectCard } from "../data/mappers";
import type { RootStackParamList } from "../navigation/types";
import { colors, hexToRgba, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SubjectLessons">;

export function SubjectLessonsScreen({ route, navigation }: Props) {
  const { classId } = route.params;
  const [completedLessonId, setCompletedLessonId] = useState<string | null>(null);
  const classQuery = useClassDetail(classId);
  const lessonsQuery = useLessons(classId);
  const completionsQuery = useLessonCompletions(classId);
  const completeMutation = useLessonCompleteMutation(classId);

  const subject = useMemo(() => {
    if (!classQuery.data) return null;
    return toSubjectCard(classQuery.data, lessonsQuery.data ?? [], completionsQuery.data ?? [], undefined);
  }, [classQuery.data, completionsQuery.data, lessonsQuery.data]);

  const lessonCards = useMemo(
    () => (subject ? toLessonCards(lessonsQuery.data ?? [], completionsQuery.data ?? [], subject) : []),
    [completionsQuery.data, lessonsQuery.data, subject],
  );

  const completedCount = lessonCards.filter((lesson) => lesson.status === "completed").length;
  const refreshControl = (
    <Refreshable
      refreshing={classQuery.isRefetching || lessonsQuery.isRefetching || completionsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([classQuery.refetch(), lessonsQuery.refetch(), completionsQuery.refetch()]);
      }}
    />
  );

  if (!subject) {
    return (
      <ScreenScroll refreshControl={refreshControl}>
        <View style={{ paddingHorizontal: 20, paddingTop: 40 }}>
          <EmptyState emoji="😕" title="Class not found" subtitle="This class could not be loaded from the backend." />
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              alignSelf: "center",
              marginTop: 12,
              borderRadius: 999,
              backgroundColor: colors.amber,
              paddingHorizontal: 18,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: "800" }}>Go back</Text>
          </Pressable>
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll refreshControl={refreshControl}>
      <GradientHeader
        colors={[hexToRgba(subject.color, 0.82), subject.color]}
        title={subject.name}
        eyebrow={`${completedCount} of ${lessonCards.length} lessons completed`}
        rightContent={
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <Text style={{ fontSize: 28 }}>{subject.emoji}</Text>
          </View>
        }
      >
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
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.86)" }}>Class Progress</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.white }}>{subject.progress}%</Text>
          </View>
          <ProgressBar value={subject.progress} color={colors.white} trackColor="rgba(255,255,255,0.3)" height={10} />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Lesson Path 📘</Text>
        {lessonCards.map((lesson, index) => {
          const isCompleted = lesson.status === "completed";
          const isOngoing = lesson.status === "ongoing";
          const accentColor = isCompleted ? subject.color : isOngoing ? colors.amber : "#D1D5DB";
          const iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = isCompleted
            ? "check-circle"
            : isOngoing
              ? "book-open-page-variant"
              : "lock-outline";

          return (
            <AnimatedEntrance key={lesson.id} delay={index * 80}>
              <View
                style={[
                  {
                    position: "relative",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    borderRadius: 22,
                    padding: 16,
                    backgroundColor: lesson.status === "locked" ? "#F3F4F6" : colors.white,
                    opacity: lesson.status === "locked" ? 0.76 : 1,
                  },
                  lesson.status !== "locked" ? shadow.card : null,
                ]}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    borderTopLeftRadius: 22,
                    borderBottomLeftRadius: 22,
                    backgroundColor: accentColor,
                  }}
                />
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isCompleted ? subject.bgColor : isOngoing ? colors.paleAmber : "#E5E7EB",
                  }}
                >
                  <MaterialCommunityIcons name={iconName} size={24} color={accentColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{lesson.title}</Text>
                    {isOngoing ? <Pill label="Current" backgroundColor={colors.paleAmber} color={colors.amber} /> : null}
                    {completedLessonId === lesson.id ? <Pill label="Nice work" backgroundColor={subject.bgColor} color={subject.color} /> : null}
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{lesson.description}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MaterialCommunityIcons name="clock-outline" size={12} color={colors.muted} />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>{lesson.duration}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <MaterialCommunityIcons name="flash" size={12} color={colors.amber} />
                      <Text style={{ fontSize: 11, fontWeight: "800", color: colors.amber }}>+{lesson.xp} XP</Text>
                    </View>
                  </View>
                </View>
                {isCompleted ? (
                  <Pill label="Done ✓" backgroundColor={subject.bgColor} color={subject.color} />
                ) : isOngoing ? (
                  <Pressable
                    disabled={completeMutation.isPending}
                    onPress={() => {
                      setCompletedLessonId(lesson.id);
                      void completeMutation.mutateAsync(lesson.id);
                    }}
                    style={{
                      borderRadius: 999,
                      backgroundColor: colors.amber,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>
                      {completeMutation.isPending ? "Saving..." : "Complete"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pill label="Locked" backgroundColor="#E5E7EB" color={colors.muted} />
                )}
              </View>
            </AnimatedEntrance>
          );
        })}
      </View>
    </ScreenScroll>
  );
}
