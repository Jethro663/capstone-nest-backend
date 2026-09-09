import { useMemo, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import { performanceApi } from "../api/services/performance";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { useLiveNotifications } from "../providers/LiveNotificationContext";
import {
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  buildTeacherHomeSchedule,
  formatTeacherHomeDate,
  selectTeacherHomePriority,
} from "./teacher-home/model";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function resolveGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function classTitle(classItem: {
  subjectCode?: string | null;
  subjectName?: string | null;
  className?: string | null;
  name?: string | null;
}) {
  const code = classItem.subjectCode?.trim();
  const name = classItem.subjectName || classItem.className || classItem.name || "Class";
  return code ? `${code} · ${name}` : name;
}

function isSameLocalDay(value: string | null | undefined, date: Date) {
  if (!value) return false;
  const candidate = new Date(value);
  return (
    !Number.isNaN(candidate.getTime()) &&
    candidate.getFullYear() === date.getFullYear() &&
    candidate.getMonth() === date.getMonth() &&
    candidate.getDate() === date.getDate()
  );
}

function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View
      style={{
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "900", color: theme.text }}>{title}</Text>
      {action}
    </View>
  );
}

function QuietMessage({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        minHeight: 58,
        justifyContent: "center",
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingVertical: 12,
      }}
    >
      <Text style={{ fontSize: 12, lineHeight: 18, color: theme.muted }}>{children}</Text>
    </View>
  );
}

export function TeacherHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { unreadCount } = useLiveNotifications();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const classIds = classesQuery.data?.map((entry) => entry.id) ?? [];

  const assessmentQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.assessments(classId),
      queryFn: () => assessmentsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });
  const announcementQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
      enabled: classIds.length > 0,
    })),
  });
  const atRiskQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.teacherClassAtRisk(classId),
      queryFn: () => performanceApi.getClassAtRisk(classId),
      enabled: classIds.length > 0,
    })),
  });

  const flattenedAssessments = useMemo(
    () =>
      assessmentQueries.flatMap((query, index) => {
        const classItem = classesQuery.data?.[index];
        if (!classItem || !query.data) return [];
        return query.data.map((assessment) => ({
          ...assessment,
          subjectName: classItem.subjectName || classItem.className || classItem.name || "Class",
        }));
      }),
    [assessmentQueries, classesQuery.data],
  );
  const recentAnnouncements = useMemo(
    () =>
      announcementQueries
        .flatMap((query, index) => {
          const classItem = classesQuery.data?.[index];
          if (!classItem || !query.data) return [];
          return query.data.map((announcement) => ({
            ...announcement,
            subjectName: classItem.subjectName || classItem.className || classItem.name || "Class",
          }));
        })
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 1),
    [announcementQueries, classesQuery.data],
  );

  const now = new Date();
  const upcomingAssessments = flattenedAssessments
    .filter((assessment) => {
      if (!assessment.isPublished || !assessment.dueDate) return false;
      const due = new Date(assessment.dueDate).getTime();
      return Number.isFinite(due) && due >= now.getTime();
    })
    .sort(
      (left, right) =>
        new Date(left.dueDate || 0).getTime() - new Date(right.dueDate || 0).getTime(),
    );
  const todayAssessments = upcomingAssessments.filter((assessment) =>
    isSameLocalDay(assessment.dueDate, now),
  );
  const schedule = buildTeacherHomeSchedule(classesQuery.data ?? [], now);
  const nextClass = schedule.find((item) => item.isNext);
  const interventionClasses = (classesQuery.data ?? [])
    .map((classItem, index) => {
      const students = atRiskQueries[index]?.data?.students ?? [];
      return {
        classItem,
        count: students.length,
      };
    })
    .filter((entry) => entry.count > 0);
  const interventionCount = interventionClasses.reduce((total, entry) => total + entry.count, 0);
  const draftCount = flattenedAssessments.filter((assessment) => !assessment.isPublished).length;
  const priority = selectTeacherHomePriority(
    {
      interventionCount,
      interventionClassId: interventionClasses[0]?.classItem.id,
      draftCount,
      upcomingAssessments,
    },
    now,
  );
  const refreshing =
    classesQuery.isRefetching ||
    assessmentQueries.some((query) => query.isRefetching) ||
    announcementQueries.some((query) => query.isRefetching) ||
    atRiskQueries.some((query) => query.isRefetching);

  const openPriority = () => {
    if (priority.kind === "intervention") {
      navigation.navigate("TeacherInterventions", { classId: priority.classId });
    } else if (priority.kind === "assessment" && priority.assessmentId) {
      navigation.navigate("TeacherAssessmentDetail", {
        assessmentId: priority.assessmentId,
        classId: priority.classId,
      });
    } else if (priority.kind === "draft") {
      navigation.navigate("Assessments");
    }
  };

  return (
    <TeacherScreen
      title="Teacher Home"
      rightAction={
        <Pressable
          accessibilityLabel="Open notifications"
          onPress={() => navigation.navigate("Notifications")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name="bell-outline" size={19} color={theme.text} />
          {unreadCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                minWidth: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: theme.red,
                borderWidth: 2,
                borderColor: theme.topbar,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "900" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      }
      refreshing={refreshing}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          ...assessmentQueries.map((query) => query.refetch()),
          ...announcementQueries.map((query) => query.refetch()),
          ...atRiskQueries.map((query) => query.refetch()),
        ]);
      }}
    >
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 26, gap: 18 }}>
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: theme.redText,
            }}
          >
            {formatTeacherHomeDate(now)}
          </Text>
          <Text style={{ marginTop: 5, fontSize: 24, fontWeight: "900", color: theme.text }}>
            {resolveGreeting(now.getHours())}, {user?.firstName || "Teacher"}
          </Text>
        </View>

        <View>
          <SectionHeading title="Next up" />
          {nextClass ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open class ${nextClass.classItem.subjectCode}`}
              onPress={() => navigation.navigate("TeacherClassDetail", { classId: nextClass.classItem.id, source: "home" })}
              style={{
                minHeight: 112,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.redSoft,
                  }}
                >
                  <MaterialCommunityIcons name="clock-outline" size={19} color={theme.redText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: theme.redText }}>
                    {nextClass.timeLabel}
                  </Text>
                  <Text style={{ marginTop: 3, fontSize: 16, fontWeight: "900", color: theme.text }}>
                    {classTitle(nextClass.classItem)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.dim} />
              </View>
              <Text style={{ marginTop: 10, fontSize: 12, color: theme.muted }}>
                {nextClass.classItem.section?.name || "Section pending"}
                {nextClass.classItem.room ? ` · ${nextClass.classItem.room}` : ""}
              </Text>
            </Pressable>
          ) : (
            <QuietMessage>{schedule.length ? "No more classes are scheduled today." : "No classes are scheduled today."}</QuietMessage>
          )}
        </View>

        <View>
          <SectionHeading title="Today" />
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
            {schedule.length || todayAssessments.length ? (
              <>
                {schedule.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open class ${item.classItem.subjectCode}`}
                    onPress={() => navigation.navigate("TeacherClassDetail", { classId: item.classItem.id, source: "home" })}
                    style={{
                      minHeight: 64,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ width: 70 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: item.isNext ? theme.redText : theme.muted }}>
                        {item.timeLabel.split("–")[0]}
                      </Text>
                    </View>
                    <View style={{ width: 4, height: 34, borderRadius: 999, backgroundColor: item.isNext ? theme.red : theme.border }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{classTitle(item.classItem)}</Text>
                      <Text style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>
                        {item.isInProgress ? "In progress" : item.classItem.room || item.classItem.section?.name || "Scheduled class"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {todayAssessments.map((assessment) => (
                  <Pressable
                    key={assessment.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open assessment ${assessment.title}`}
                    onPress={() => navigation.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId: assessment.classId })}
                    style={{
                      minHeight: 64,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ width: 70 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.muted }}>Due today</Text>
                    </View>
                    <View style={{ width: 4, height: 34, borderRadius: 999, backgroundColor: theme.amber }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{assessment.title}</Text>
                      <Text style={{ marginTop: 3, fontSize: 11, color: theme.muted }}>{assessment.subjectName}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            ) : (
              <QuietMessage>Your teaching agenda is clear for today.</QuietMessage>
            )}
          </View>
        </View>

        <View>
          <SectionHeading title="Priority" />
          <Pressable
            accessibilityRole={priority.kind === "clear" ? undefined : "button"}
            accessibilityLabel={priority.kind === "clear" ? undefined : "Open priority item"}
            disabled={priority.kind === "clear"}
            onPress={openPriority}
            style={{
              minHeight: 88,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              borderLeftWidth: 4,
              borderLeftColor: theme.red,
              backgroundColor: theme.surface,
              paddingHorizontal: 14,
              paddingVertical: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: theme.text }}>{priority.title}</Text>
              <Text style={{ marginTop: 5, fontSize: 11, lineHeight: 17, color: theme.muted }}>{priority.detail}</Text>
            </View>
            {priority.kind !== "clear" ? <MaterialCommunityIcons name="arrow-right" size={20} color={theme.redText} /> : null}
          </Pressable>
        </View>

        <View>
          <SectionHeading
            title="Your classes"
            action={
              <Pressable accessibilityRole="button" accessibilityLabel="View all classes" onPress={() => navigation.navigate("Classes")}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.redText }}>View all</Text>
              </Pressable>
            }
          />
          <View style={{ gap: 10 }}>
            {(classesQuery.data ?? []).slice(0, 2).map((classItem) => (
              <Pressable
                key={classItem.id}
                accessibilityRole="button"
                accessibilityLabel={`Open class ${classItem.subjectCode}`}
                onPress={() => navigation.navigate("TeacherClassDetail", { classId: classItem.id, source: "home" })}
                style={{
                  minHeight: 72,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  padding: 13,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.blueSoft,
                  }}
                >
                  <MaterialCommunityIcons name="book-open-variant-outline" size={20} color={theme.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: theme.text }}>{classTitle(classItem)}</Text>
                  <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
                    {classItem.section?.name || "Section pending"} · {classItem.enrollmentCount ?? classItem.enrollments?.length ?? 0} students
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.dim} />
              </Pressable>
            ))}
            {!classesQuery.data?.length ? <QuietMessage>Assigned classes will appear here.</QuietMessage> : null}
          </View>
        </View>

        <View>
          <SectionHeading title="Recent update" />
          {recentAnnouncements[0] ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open announcement ${recentAnnouncements[0].title}`}
              onPress={() =>
                navigation.navigate("TeacherClassDetail", {
                  classId: recentAnnouncements[0].classId,
                  initialTab: "announcements",
                  source: "home",
                })
              }
              style={{
                minHeight: 72,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <MaterialCommunityIcons name="bullhorn-outline" size={20} color={theme.redText} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.text }}>{recentAnnouncements[0].title}</Text>
                <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
                  {recentAnnouncements[0].subjectName} · {formatDate(recentAnnouncements[0].createdAt)}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.dim} />
            </Pressable>
          ) : (
            <QuietMessage>No recent class announcements.</QuietMessage>
          )}
        </View>
      </View>
    </TeacherScreen>
  );
}
