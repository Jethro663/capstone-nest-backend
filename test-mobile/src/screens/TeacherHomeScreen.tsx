import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TeacherHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
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
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
        .slice(0, 3),
    [announcementQueries, classesQuery.data],
  );

  const upcomingAssessments = useMemo(
    () =>
      flattenedAssessments
        .filter((assessment) => Boolean(assessment.isPublished))
        .sort((left, right) => new Date(left.dueDate || 0).getTime() - new Date(right.dueDate || 0).getTime())
        .slice(0, 4),
    [flattenedAssessments],
  );

  const draftCount = flattenedAssessments.filter((assessment) => !assessment.isPublished).length;
  const publishedCount = flattenedAssessments.length - draftCount;
  const firstClassId = classesQuery.data?.[0]?.id;
  const refreshing =
    classesQuery.isRefetching ||
    assessmentQueries.some((query) => query.isRefetching) ||
    announcementQueries.some((query) => query.isRefetching);

  return (
    <TeacherScreen
      title="Teacher Home"
      subtitle="Review classes, upcoming work, and quick links without leaving the current mobile theme."
      icon="view-dashboard-outline"
      refreshing={refreshing}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          ...assessmentQueries.map((query) => query.refetch()),
          ...announcementQueries.map((query) => query.refetch()),
        ]);
      }}
    >
      <TeacherStats
        items={[
          { label: "Active Classes", value: classesQuery.data?.length ?? 0, tone: "red" },
          { label: "Published", value: publishedCount, tone: "green" },
          { label: "Drafts", value: draftCount, tone: "amber" },
          { label: "Updates", value: recentAnnouncements.length, tone: "blue" },
        ]}
      />

      <TeacherPanel
        title="Updates and more"
        subtitle="Moved high-frequency actions out of the bottom bar for a cleaner teacher navigation."
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton
            label="Updates"
            icon="bullhorn-outline"
            tone="amber"
            disabled={!firstClassId}
            onPress={() => {
              if (!firstClassId) return;
              navigation.navigate("TeacherClassDetail", { classId: firstClassId, initialTab: "announcements" });
            }}
          />
          <TeacherActionButton label="Calendar" icon="calendar-month-outline" onPress={() => navigation.navigate("TeacherCalendar")} />
          <TeacherActionButton label="More" icon="dots-horizontal-circle-outline" tone="blue" onPress={() => navigation.navigate("TeacherMore")} />
        </View>
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TeacherActionButton label="Classes" icon="book-open-variant-outline" tone="blue" onPress={() => navigation.navigate("Classes")} />
          <TeacherActionButton label="Assessments" icon="clipboard-text-outline" tone="green" onPress={() => navigation.navigate("Assessments")} />
          <TeacherActionButton label="Profile" icon="account-circle-outline" tone="red" onPress={() => navigation.navigate("Profile")} />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Active classes" subtitle="Your current class load and section count.">
        {classesQuery.data?.length ? (
          classesQuery.data.slice(0, 4).map((classItem) => (
            <TeacherRow
              key={classItem.id}
              title={`${classItem.subjectCode} · ${classItem.subjectName}`}
              subtitle={`${classItem.section?.name || "Section pending"} · ${classItem.schoolYear}`}
              onPress={() => navigation.navigate("TeacherClassDetail", { classId: classItem.id })}
              right={
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.red }}>
                    {classItem.enrollmentCount ?? classItem.enrollments?.length ?? 0}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.muted }}>students</Text>
                </View>
              }
            />
          ))
        ) : (
          <TeacherEmpty title="No teacher classes" subtitle="Classes assigned to this teacher account will appear here." />
        )}
      </TeacherPanel>

      <TeacherPanel title="Upcoming assessments" subtitle="Published items that students can reach soon.">
        {upcomingAssessments.length ? (
          upcomingAssessments.map((assessment) => (
            <TeacherRow
              key={assessment.id}
              title={assessment.title}
              subtitle={`${assessment.subjectName} · ${assessment.questions?.length ?? 0} questions · Due ${formatDate(assessment.dueDate)}`}
              onPress={() =>
                navigation.navigate("TeacherAssessmentDetail", {
                  assessmentId: assessment.id,
                  classId: assessment.classId,
                })
              }
              right={
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: assessment.isPublished ? theme.greenSoft : theme.amberSoft,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: assessment.isPublished ? theme.green : theme.amber,
                    }}
                  >
                    {assessment.isPublished ? "Published" : "Draft"}
                  </Text>
                </View>
              }
            />
          ))
        ) : (
          <TeacherEmpty
            title="No upcoming assessments"
            subtitle="Once class assessments are created or published, they will appear in this overview."
            icon="clipboard-clock-outline"
          />
        )}
      </TeacherPanel>

      <TeacherPanel title="Recent announcements" subtitle="Latest class updates across your teaching load.">
        {recentAnnouncements.length ? (
          recentAnnouncements.map((announcement) => (
            <TeacherRow
              key={announcement.id}
              title={announcement.title}
              subtitle={`${announcement.subjectName} · ${announcement.isPinned ? "Pinned" : "Post"}${announcement.createdAt ? ` · ${formatDate(announcement.createdAt)}` : ""}`}
              onPress={() => {
                const targetClassId = announcement.classId || firstClassId;
                if (!targetClassId) return;
                navigation.navigate("TeacherClassDetail", {
                  classId: targetClassId,
                  initialTab: "announcements",
                });
              }}
            />
          ))
        ) : (
          <TeacherEmpty
            title="No recent updates"
            subtitle="Announcements created in class spaces will surface here."
            icon="bullhorn-outline"
          />
        )}
      </TeacherPanel>

      {classesQuery.data?.length ? (
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Pressable
            onPress={() => navigation.navigate("TeacherCalendar")}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 14,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text }}>Open Calendar</Text>
              <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: "#999999" }}>
                Review schedules, announcements, school events, and due assessments in one feed.
              </Text>
            </View>
            <Text style={{ fontSize: 22, color: theme.red }}>›</Text>
          </Pressable>
        </View>
      ) : null}
    </TeacherScreen>
  );
}
