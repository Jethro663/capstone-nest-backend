import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import {
  FloatingIconButton,
  GradientHeader,
  Pill,
  ProgressBar,
  ScreenScroll,
  SearchField,
  SectionTitle,
  Card,
} from "../components/ui/primitives";
import { lessons, subjects } from "../data/mockData";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Lessons">,
  NativeStackScreenProps<RootStackParamList>
>;

export function LessonsScreen({ navigation }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const ongoingLessons = useMemo(
    () => Object.values(lessons).flat().filter((lesson) => lesson.status === "ongoing").slice(0, 2),
    []
  );
  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <ScreenScroll>
      <GradientHeader
        colors={gradients.lessons}
        eyebrow="Good morning! 👋"
        title="My Lessons"
        rightContent={
          <FloatingIconButton
            icon="bell-outline"
            badge={
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: "#EF4444",
                }}
              />
            }
          />
        }
      >
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search subjects..."
        />
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        {ongoingLessons.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <SectionTitle
              title="Continue Learning 🎯"
              right={<Text style={{ color: colors.amber, fontSize: 12, fontWeight: "800" }}>See all</Text>}
            />
            <View style={{ gap: 12 }}>
              {ongoingLessons.map((lesson) => {
                const subject = subjects.find((entry) => entry.id === lesson.subjectId);
                if (!subject) {
                  return null;
                }

                return (
                  <Pressable
                    key={lesson.id}
                    onPress={() => navigation.navigate("SubjectLessons", { subjectId: lesson.subjectId })}
                    style={[
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        backgroundColor: colors.white,
                        borderRadius: 22,
                        padding: 16,
                      },
                      shadow.card,
                    ]}
                  >
                    <View
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: subject.bgColor,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{subject.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>{subject.name}</Text>
                      <Text style={{ marginTop: 2, fontSize: 14, fontWeight: "800", color: colors.text }}>
                        {lesson.title}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                        <View style={{ flex: 1 }}>
                          <ProgressBar value={60} color={subject.color} trackColor="#EEF2F7" height={6} />
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: subject.color }}>60%</Text>
                      </View>
                    </View>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        backgroundColor: subject.color,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialCommunityIcons name="play" size={16} color={colors.white} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <SectionTitle
          title="All Subjects 📚"
          right={<Pill label={`${subjects.length} subjects`} backgroundColor="#FFB83020" color={colors.orange} />}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          {filteredSubjects.map((subject) => (
            <Pressable
              key={subject.id}
              onPress={() => navigation.navigate("SubjectLessons", { subjectId: subject.id })}
              style={{ width: "48%" }}
            >
              <Card style={{ padding: 14, minHeight: 170 }}>
                <View
                  style={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    backgroundColor: `${subject.color}22`,
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                  <MaterialCommunityIcons name="star" size={12} color={colors.amber} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
                    {subject.completedLessons}/{subject.totalLessons} done
                  </Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <ProgressBar value={subject.progress} color={subject.color} trackColor="#EEF2F7" height={6} />
                </View>
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: subject.color }}>
                    {subject.progress}%
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.muted} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenScroll>
  );
}
