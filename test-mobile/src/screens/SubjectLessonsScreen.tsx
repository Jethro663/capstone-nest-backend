import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { EmptyState, GradientHeader, Pill, ProgressBar, ScreenScroll } from "../components/ui/primitives";
import { lessons, subjects } from "../data/mockData";
import type { RootStackParamList } from "../navigation/types";
import { colors, hexToRgba, shadow } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "SubjectLessons">;

export function SubjectLessonsScreen({ route, navigation }: Props) {
  const subject = subjects.find((entry) => entry.id === route.params.subjectId);
  const subjectLessons = route.params.subjectId ? lessons[route.params.subjectId] ?? [] : [];

  if (!subject) {
    return (
      <ScreenScroll>
        <View style={{ paddingHorizontal: 20, paddingTop: 40 }}>
          <EmptyState emoji="😕" title="Subject not found" subtitle="Go back and choose another subject." />
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

  const completedCount = subjectLessons.filter((lesson) => lesson.status === "completed").length;

  return (
    <ScreenScroll>
      <GradientHeader
        colors={[hexToRgba(subject.color, 0.82), subject.color]}
        title={subject.name}
        eyebrow={`${completedCount} of ${subjectLessons.length} lessons completed`}
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
            <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.86)" }}>
              Overall Progress
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.white }}>{subject.progress}%</Text>
          </View>
          <ProgressBar value={subject.progress} color={colors.white} trackColor="rgba(255,255,255,0.3)" height={10} />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Lesson List 📖</Text>
        {subjectLessons.map((lesson) => {
          const isCompleted = lesson.status === "completed";
          const isOngoing = lesson.status === "ongoing";
          const isLocked = lesson.status === "locked";
          const accentColor = isCompleted ? subject.color : isOngoing ? colors.amber : "#D1D5DB";
          const iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = isCompleted
            ? "check-circle"
            : isOngoing
              ? "book-open-page-variant"
              : "lock-outline";

          return (
            <View
              key={lesson.id}
              style={[
                {
                  position: "relative",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderRadius: 22,
                  padding: 16,
                  backgroundColor: isLocked ? "#F3F4F6" : colors.white,
                  opacity: isLocked ? 0.76 : 1,
                },
                !isLocked ? shadow.card : null,
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
                  {isOngoing ? <Pill label="Ongoing" backgroundColor={colors.paleAmber} color={colors.amber} /> : null}
                </View>
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>{lesson.description}</Text>
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
                  style={{ borderRadius: 999, backgroundColor: colors.amber, paddingHorizontal: 14, paddingVertical: 8 }}
                >
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>Resume</Text>
                </Pressable>
              ) : (
                <Pill label="Locked" backgroundColor="#E5E7EB" color={colors.muted} />
              )}
            </View>
          );
        })}
      </View>
    </ScreenScroll>
  );
}
