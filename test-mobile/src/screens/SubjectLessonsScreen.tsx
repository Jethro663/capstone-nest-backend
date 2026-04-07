import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AnimatedEntrance, Card, EmptyState, GradientHeader, Pill, Refreshable, ScreenScroll, SectionTitle } from "../components/ui/primitives";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import { useClassDetail, useClassModules } from "../api/hooks";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ClassWorkspace">;
type WorkspaceTab = "modules" | "assignments" | "announcements" | "classmates" | "grades" | "calendar";

const tabs: WorkspaceTab[] = ["modules", "assignments", "announcements", "classmates", "grades", "calendar"];

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value?: string) {
  if (!value) return "";
  const [h = "0", m = "00"] = value.split(":");
  const hours = Number.parseInt(h, 10);
  if (!Number.isFinite(hours)) return value;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${normalized}:${m} ${meridiem}`;
}

export function SubjectLessonsScreen({ route, navigation }: Props) {
  const { classId } = route.params;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("modules");
  const classQuery = useClassDetail(classId);
  const modulesQuery = useClassModules(classId);

  const assessmentsQuery = useQueries({
    queries: [
      {
        queryKey: ["class-assessments", classId],
        queryFn: () => assessmentsApi.getByClass(classId),
      },
      {
        queryKey: ["class-announcements", classId],
        queryFn: () => announcementsApi.getByClass(classId),
      },
    ],
  });

  const assessments = assessmentsQuery[0]?.data ?? [];
  const announcements = assessmentsQuery[1]?.data ?? [];

  const attemptQueries = useQueries({
    queries: assessments.map((assessment) => ({
      queryKey: ["class-assessment-attempts", assessment.id],
      queryFn: () => assessmentsApi.getStudentAttempts(assessment.id),
      enabled: assessments.length > 0,
    })),
  });

  const refreshing =
    classQuery.isRefetching ||
    modulesQuery.isRefetching ||
    assessmentsQuery.some((query) => query.isRefetching) ||
    attemptQueries.some((query) => query.isRefetching);

  const classmates = classQuery.data?.enrollments ?? [];
  const scheduleRows = classQuery.data?.schedules ?? [];

  const gradeRows = useMemo(
    () =>
      assessments.map((assessment, index) => {
        const attempts = attemptQueries[index]?.data ?? [];
        const latest = [...attempts].sort(
          (left, right) =>
            new Date(right.submittedAt || right.createdAt || 0).getTime() -
            new Date(left.submittedAt || left.createdAt || 0).getTime(),
        )[0];

        const possible = latest?.totalPoints ?? assessment.totalPoints ?? 0;
        const score = latest?.score;
        const percent = typeof score === "number" && possible > 0 ? Math.round((score / possible) * 100) : null;
        return {
          id: assessment.id,
          title: assessment.title,
          scoreText: typeof score === "number" ? `${score}/${possible}` : "Pending",
          percentText: percent != null ? `${percent}%` : "—",
          dateText: formatDate(latest?.submittedAt || assessment.dueDate),
          pending: typeof score !== "number",
        };
      }),
    [assessments, attemptQueries],
  );

  const calendarRows = useMemo(() => {
    const assessmentRows = assessments
      .filter((assessment) => assessment.dueDate)
      .map((assessment) => ({
        id: `assessment-${assessment.id}`,
        title: assessment.title,
        subtitle: "Assessment due",
        dateLabel: formatDate(assessment.dueDate),
      }));

    const scheduleItems = scheduleRows.map((schedule) => ({
      id: `schedule-${schedule.id}`,
      title: `${schedule.days.join("/")}`,
      subtitle: `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`,
      dateLabel: "Weekly schedule",
    }));

    return [...assessmentRows, ...scheduleItems];
  }, [assessments, scheduleRows]);

  if (!classQuery.data && classQuery.isLoading) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 42, paddingHorizontal: 20 }}>
          <EmptyState emoji="⏳" title="Loading class workspace" subtitle="Preparing your class data." />
        </View>
      </ScreenScroll>
    );
  }

  if (!classQuery.data) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 42, paddingHorizontal: 20 }}>
          <EmptyState emoji="😕" title="Class not found" subtitle="This class is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([
              classQuery.refetch(),
              modulesQuery.refetch(),
              ...assessmentsQuery.map((query) => query.refetch()),
              ...attemptQueries.map((query) => query.refetch()),
            ]);
          }}
        />
      }
    >
      <GradientHeader
        colors={gradients.classes}
        eyebrow={`${classQuery.data.subjectCode} • ${classQuery.data.section?.name || "Class section"}`}
        title={classQuery.data.subjectName || "Class"}
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
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: activeTab === tab ? colors.indigo : colors.border,
                backgroundColor: activeTab === tab ? colors.paleIndigo : colors.white,
              }}
            >
              <Text
                style={{
                  textTransform: "capitalize",
                  fontSize: 12,
                  fontWeight: "800",
                  color: activeTab === tab ? colors.indigo : colors.textSecondary,
                }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === "modules" ? (
          <Card>
            <SectionTitle title="Modules" right={<Pill label={`${modulesQuery.data?.length ?? 0}`} backgroundColor={colors.paleIndigo} color={colors.indigo} />} />
            {(modulesQuery.data ?? []).length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No modules published yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {(modulesQuery.data ?? []).map((module, index) => (
                  <AnimatedEntrance key={module.id} delay={index * 70}>
                    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{module.title}</Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                        {module.description || "Learning objectives and activities are inside this module."}
                      </Text>
                    </View>
                  </AnimatedEntrance>
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {activeTab === "assignments" ? (
          <Card>
            <SectionTitle title="Assignments" right={<Pill label={`${assessments.length}`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />} />
            {assessments.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No assignments available for this class.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {assessments.map((assessment) => (
                  <View key={assessment.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{assessment.title}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      Due {formatDate(assessment.dueDate)} • {assessment.totalPoints ?? 0} pts
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {activeTab === "announcements" ? (
          <Card>
            <SectionTitle title="Announcements" right={<Pill label={`${announcements.length}`} backgroundColor={colors.paleGreen} color={colors.green} />} />
            {announcements.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No class announcements yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {announcements.map((announcement) => (
                  <View key={announcement.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{announcement.title}</Text>
                    <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                      {announcement.content}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {activeTab === "classmates" ? (
          <Card>
            <SectionTitle title="Classmates" right={<Pill label={`${classmates.length}`} backgroundColor={colors.paleAmber} color={colors.orange} />} />
            {classmates.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Classmate data is currently unavailable.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {classmates.map((entry) => (
                  <View key={entry.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.paleIndigo,
                      }}
                    >
                      <MaterialCommunityIcons name="account" size={16} color={colors.indigo} />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {entry.student?.firstName || "Student"} {entry.student?.lastName || ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {activeTab === "grades" ? (
          <Card>
            <SectionTitle title="Grades" />
            {gradeRows.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No submitted attempts yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {gradeRows.map((grade) => (
                  <View
                    key={grade.id}
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: grade.pending ? colors.white : colors.paleGreen,
                      padding: 12,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{grade.title}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      {grade.scoreText} • {grade.percentText} • {grade.dateText}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {activeTab === "calendar" ? (
          <Card>
            <SectionTitle title="Calendar" />
            {calendarRows.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No upcoming schedule items.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {calendarRows.map((item) => (
                  <View key={item.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{item.title}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      {item.subtitle} • {item.dateLabel}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ) : null}
      </View>
    </ScreenScroll>
  );
}
