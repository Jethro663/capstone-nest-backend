import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
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
  SectionTitle,
  StatCard,
} from "../components/ui/primitives";
import {
  queryKeys,
  useAnnouncements,
  useAssessments,
  useClassDetail,
  useClassModules,
  useLessonCompletions,
  useLessons,
} from "../api/hooks";
import { toAppError } from "../api/http";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";
import { assessmentsApi } from "../api/services/assessments";
import type { Assessment, AssessmentAttempt } from "../types/assessment";
import type { Announcement } from "../types/announcement";
import type { ClassItem } from "../types/class";
import type { ClassModule } from "../types/module";

type Props = NativeStackScreenProps<RootStackParamList, "ClassDetail">;
type DetailNavigation = NativeStackNavigationProp<RootStackParamList>;
type DetailTab = "modules" | "assignments" | "announcements" | "classmates" | "grades" | "calendar";

const tabs: DetailTab[] = ["modules", "assignments", "announcements", "classmates", "grades", "calendar"];

function formatDate(value?: string | null) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "TBA";
  const [hoursValue = "0", minutesValue = "00"] = value.split(":");
  const hours = Number.parseInt(hoursValue, 10);
  if (!Number.isFinite(hours)) return value;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${normalized}:${minutesValue} ${meridiem}`;
}

function formatTeacher(classItem?: ClassItem) {
  const teacher = classItem?.teacher;
  const fullName = [teacher?.firstName, teacher?.lastName].filter(Boolean).join(" ").trim();
  return fullName || "Teacher not assigned";
}

function summarizeModule(moduleEntry: ClassModule) {
  return moduleEntry.sections.reduce(
    (summary, section) => {
      section.items.forEach((item) => {
        if (item.itemType === "lesson") summary.lessons += 1;
        if (item.itemType === "assessment") summary.assessments += 1;
      });
      return summary;
    },
    { lessons: 0, assessments: 0 },
  );
}

function resolveNextLessonId(
  lessons: Array<{ id: string }>,
  completions: Array<{ lessonId: string; completed: boolean }>,
) {
  const completedIds = new Set(completions.filter((entry) => entry.completed).map((entry) => entry.lessonId));
  return lessons.find((lesson) => !completedIds.has(lesson.id))?.id ?? lessons[0]?.id;
}

function getLatestSubmittedAttempt(attempts: AssessmentAttempt[]) {
  return [...attempts]
    .filter((attempt) => attempt.isSubmitted || Boolean(attempt.submittedAt))
    .sort((left, right) => {
      const leftTime = new Date(left.submittedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.submittedAt || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    })[0];
}

function getAttemptErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Attempt history unavailable";
}

function sortAttemptsByNewest(attempts: AssessmentAttempt[]) {
  return [...attempts].sort((left, right) => {
    const leftTime = new Date(left.submittedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.submittedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function buildCalendarRows(classItem: ClassItem | undefined, assessments: Assessment[]) {
  const scheduleRows = (classItem?.schedules ?? []).map((schedule) => ({
    id: `schedule-${schedule.id}`,
    title: schedule.days.join("/"),
    subtitle: `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`,
    dateLabel: "Weekly schedule",
    sortValue: `${schedule.days.join("-")}-${schedule.startTime}`,
  }));

  const assessmentRows = assessments
    .filter((assessment) => assessment.dueDate)
    .map((assessment) => ({
      id: `assessment-${assessment.id}`,
      title: assessment.title,
      subtitle: `${assessment.totalPoints ?? 0} pts`,
      dateLabel: formatDate(assessment.dueDate),
      sortValue: assessment.dueDate ?? "",
    }));

  return [...assessmentRows, ...scheduleRows].sort((left, right) => left.sortValue.localeCompare(right.sortValue));
}

function renderAnnouncement(entry: Announcement, index: number) {
  return (
    <AnimatedEntrance key={entry.id} delay={index * 60}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{entry.title}</Text>
            <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
              {entry.author?.firstName || "Teacher"} {entry.author?.lastName || ""} • {formatDate(entry.createdAt)}
            </Text>
          </View>
          {entry.isPinned ? <Pill label="Pinned" backgroundColor={colors.paleAmber} color={colors.orange} /> : null}
        </View>
        <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>{entry.content}</Text>
      </Card>
    </AnimatedEntrance>
  );
}

export function StudentClassDetailContent({
  classId,
  navigation,
}: {
  classId: string;
  navigation: Pick<DetailNavigation, "goBack" | "navigate">;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("modules");
  const classQuery = useClassDetail(classId);
  const modulesQuery = useClassModules(classId);
  const lessonsQuery = useLessons(classId);
  const lessonCompletionsQuery = useLessonCompletions(classId);
  const assessmentsQuery = useAssessments(classId);
  const announcementsQuery = useAnnouncements(classId);

  const classItem = classQuery.data;
  const modules = useMemo(() => [...(modulesQuery.data ?? [])].sort((left, right) => left.order - right.order), [modulesQuery.data]);
  const lessons = useMemo(() => [...(lessonsQuery.data ?? [])].sort((left, right) => left.order - right.order), [lessonsQuery.data]);
  const lessonCompletions = lessonCompletionsQuery.data ?? [];
  const assessments = useMemo(() => [...(assessmentsQuery.data ?? [])].filter((entry) => entry.isPublished), [assessmentsQuery.data]);
  const attemptQueries = useQueries({
    queries: assessments.map((assessment) => ({
      queryKey: queryKeys.assessmentAttempts(assessment.id),
      queryFn: () => assessmentsApi.getStudentAttempts(assessment.id),
      enabled: assessments.length > 0,
    })),
  });
  const announcements = useMemo(
    () =>
      [...(announcementsQuery.data ?? [])].sort((left, right) => {
        if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
        return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
      }),
    [announcementsQuery.data],
  );

  const completedLessonCount = lessonCompletions.filter((entry) => entry.completed).length;
  const lessonProgress = lessons.length > 0 ? Math.round((completedLessonCount / lessons.length) * 100) : 0;
  const nextLessonId = resolveNextLessonId(lessons, lessonCompletions);
  const gradeRows = useMemo(
    () =>
      assessments.map((assessment, index) => {
        const attemptQuery = attemptQueries[index];
        const attempts = attemptQuery?.data ?? [];
        const latestSubmittedAttempt = getLatestSubmittedAttempt(attempts);
        const possiblePoints = latestSubmittedAttempt?.totalPoints ?? assessment.totalPoints ?? 0;
        const hasScore = typeof latestSubmittedAttempt?.score === "number";
        const percent =
          hasScore && possiblePoints > 0 ? Math.round(((latestSubmittedAttempt?.score as number) / possiblePoints) * 100) : null;

        const newestAttempt = sortAttemptsByNewest(attempts)[0];
        const hasOnlyInProgressAttempts = Boolean(newestAttempt) && !latestSubmittedAttempt;
        const isAttemptStateUnresolved = typeof attemptQuery?.data === "undefined" || Boolean(attemptQuery?.isRefetching);
        const hasAttemptError = Boolean(attemptQuery?.error);

        let scoreText = "Pending";
        let metaText = `${assessment.totalPoints ?? 0} pts • ${formatDate(assessment.dueDate)}`;
        let pending = true;

        if (hasScore) {
          scoreText = `${latestSubmittedAttempt?.score}/${possiblePoints}`;
          metaText = `${percent}% • ${formatDate(latestSubmittedAttempt?.submittedAt || assessment.dueDate)}`;
          pending = false;
        } else if (hasAttemptError && !hasOnlyInProgressAttempts) {
          scoreText = getAttemptErrorMessage(attemptQuery?.error);
        } else if (isAttemptStateUnresolved && !hasOnlyInProgressAttempts) {
          scoreText = "Checking submissions";
          metaText = "Latest submitted score is still loading";
        }

        return {
          id: assessment.id,
          title: assessment.title,
          scoreText,
          metaText,
          pending,
        };
      }),
    [assessments, attemptQueries],
  );
  const calendarRows = buildCalendarRows(classItem, assessments);
  const classmates = classItem?.enrollments ?? [];
  const refreshing =
    classQuery.isRefetching ||
    modulesQuery.isRefetching ||
    lessonsQuery.isRefetching ||
    lessonCompletionsQuery.isRefetching ||
    assessmentsQuery.isRefetching ||
    announcementsQuery.isRefetching ||
    attemptQueries.some((query) => query.isRefetching);
  const primaryError =
    classQuery.error ||
    modulesQuery.error ||
    lessonsQuery.error ||
    lessonCompletionsQuery.error ||
    assessmentsQuery.error ||
    announcementsQuery.error ||
    attemptQueries.find((query) => query.error)?.error;

  const handleRefresh = () => {
    void Promise.all([
      classQuery.refetch(),
      modulesQuery.refetch(),
      lessonsQuery.refetch(),
      lessonCompletionsQuery.refetch(),
      assessmentsQuery.refetch(),
      announcementsQuery.refetch(),
      ...attemptQueries.map((query) => query.refetch()),
    ]);
  };

  if (!classItem && classQuery.isLoading) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji=".." title="Loading class detail" subtitle="Preparing the student class view." />
        </View>
      </ScreenScroll>
    );
  }

  if (!classItem && primaryError) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Class data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(primaryError).message}
            </Text>
          </Card>
        </View>
      </ScreenScroll>
    );
  }

  if (!classItem) {
    return (
      <ScreenScroll>
        <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
          <EmptyState emoji="?" title="Class not found" subtitle="This class is unavailable right now." />
        </View>
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
      <GradientHeader
        colors={gradients.classes}
        eyebrow={`${classItem.subjectCode || "CLASS"} • ${classItem.section?.name || "Section"}`}
        title={classItem.subjectName || "Class Detail"}
        rightContent={<FloatingIconButton icon="chevron-left" onPress={() => navigation.goBack()} />}
      >
        <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.88)", fontSize: 12 }}>
          {formatTeacher(classItem)} • {classItem.room || "Room TBA"}
        </Text>
        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          <StatCard icon="folder-outline" iconColor={colors.white} value={modules.length} label="Modules" translucent />
          <StatCard icon="book-open-page-variant-outline" iconColor={colors.white} value={lessons.length} label="Lessons" translucent />
          <StatCard icon="clipboard-text-outline" iconColor={colors.white} value={assessments.length} label="Tasks" translucent />
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 18 }}>
        {primaryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Class data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        <Card>
          <SectionTitle title="Class Snapshot" right={<Pill label={`${lessonProgress}% progress`} backgroundColor={colors.paleAmber} color={colors.orange} />} />
          <ProgressBar value={lessonProgress} color={colors.orange} trackColor={colors.paleAmber} />
          <Text style={{ marginTop: 10, fontSize: 12, color: colors.textSecondary }}>
            {completedLessonCount}/{lessons.length} lessons completed • {classmates.length} classmates
          </Text>
        </Card>

        {nextLessonId ? (
          <Pressable onPress={() => navigation.navigate("LessonDetail", { lessonId: nextLessonId, classId })}>
            <Card style={shadow.card}>
              <SectionTitle
                title="Continue Lesson"
                right={<Pill label="Resume" backgroundColor={colors.paleIndigo} color={colors.indigo} />}
              />
              <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>
                {lessons.find((entry) => entry.id === nextLessonId)?.title || "Next lesson"}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }}>
                Open the next lesson directly, or browse the rest of the class tabs below.
              </Text>
            </Card>
          </Pressable>
        ) : null}

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
          <View style={{ gap: 12 }}>
            {modules.length === 0 ? (
              <EmptyState emoji=".." title="No modules yet" subtitle="Your teacher has not published any class modules." />
            ) : (
              modules.map((moduleEntry, index) => {
                const summary = summarizeModule(moduleEntry);
                return (
                  <AnimatedEntrance key={moduleEntry.id} delay={index * 60}>
                    <Pressable
                      onPress={() => navigation.navigate("ModuleDetail", { classId, moduleId: moduleEntry.id })}
                      style={[
                        {
                          borderRadius: 24,
                          backgroundColor: colors.white,
                          padding: 18,
                        },
                        shadow.card,
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>{moduleEntry.title}</Text>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                            {moduleEntry.description || "Lessons and activities will appear inside this module."}
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: colors.paleIndigo,
                          }}
                        >
                          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.indigo} />
                        </View>
                      </View>
                      <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                        <Pill label={`${summary.lessons} lessons`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />
                        <Pill label={`${summary.assessments} tasks`} backgroundColor={colors.paleAmber} color={colors.orange} />
                        <Pill
                          label={`${moduleEntry.progressPercent ?? 0}%`}
                          backgroundColor={colors.paleGreen}
                          color={colors.greenDeep}
                        />
                      </View>
                    </Pressable>
                  </AnimatedEntrance>
                );
              })
            )}
          </View>
        ) : null}

        {activeTab === "assignments" ? (
          <Card>
            <SectionTitle title="Assignments" right={<Pill label={`${assessments.length}`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />} />
            {assessments.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No published assessments are available for this class.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {assessments.map((assessment) => (
                  <Pressable
                    key={assessment.id}
                    onPress={() => navigation.navigate("AssessmentDetail", { assessmentId: assessment.id, classId })}
                    style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{assessment.title}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      {assessment.type.replaceAll("_", " ")} • Due {formatDate(assessment.dueDate)} • {assessment.totalPoints ?? 0} pts
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        ) : null}

        {activeTab === "announcements" ? <View style={{ gap: 12 }}>{announcements.map(renderAnnouncement)}</View> : null}

        {activeTab === "classmates" ? (
          <Card>
            <SectionTitle title="Classmates" right={<Pill label={`${classmates.length}`} backgroundColor={colors.paleAmber} color={colors.orange} />} />
            {classmates.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Classmate details are unavailable right now.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {classmates.map((entry) => (
                  <View key={entry.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.paleIndigo,
                      }}
                    >
                      <MaterialCommunityIcons name="account" size={16} color={colors.indigo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                        {entry.student?.firstName || "Student"} {entry.student?.lastName || ""}
                      </Text>
                      <Text style={{ marginTop: 2, fontSize: 11, color: colors.textSecondary }}>
                        {entry.student?.email || "Email unavailable"}
                      </Text>
                    </View>
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
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No graded assessments are available yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {gradeRows.map((grade) => (
                  <View
                    key={grade.id}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: grade.pending ? colors.white : colors.paleGreen,
                      padding: 12,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{grade.title}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      {grade.scoreText} • {grade.metaText}
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
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No upcoming class schedule items were found.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {calendarRows.map((row) => (
                  <View key={row.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: colors.text }}>{row.title}</Text>
                    <Text style={{ marginTop: 4, fontSize: 11, color: colors.textSecondary }}>
                      {row.subtitle} • {row.dateLabel}
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

export function ClassDetailScreen({ route, navigation }: Props) {
  return <StudentClassDetailContent classId={route.params.classId} navigation={navigation} />;
}
