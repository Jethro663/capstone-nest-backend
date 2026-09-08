import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueries } from "@tanstack/react-query";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { queryKeys, useTeacherClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import { performanceApi } from "../api/services/performance";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { boundAcademicPercentage } from "../lib/academicScore";
import { useLiveNotifications } from "../providers/LiveNotificationContext";
import {
  TeacherActionButton,
  TeacherAccordionSection,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
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

type HomeSection =
  | "attention"
  | "classes"
  | "intervention"
  | "assessments"
  | "announcements";

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
          subjectName:
            classItem.subjectName ||
            classItem.className ||
            classItem.name ||
            "Class",
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
            subjectName:
              classItem.subjectName ||
              classItem.className ||
              classItem.name ||
              "Class",
          }));
        })
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 3),
    [announcementQueries, classesQuery.data],
  );

  const upcomingAssessments = useMemo(
    () =>
      flattenedAssessments
        .filter((assessment) => Boolean(assessment.isPublished))
        .sort(
          (left, right) =>
            new Date(left.dueDate || 0).getTime() -
            new Date(right.dueDate || 0).getTime(),
        )
        .slice(0, 4),
    [flattenedAssessments],
  );

  const interventionClasses = useMemo(
    () =>
      (classesQuery.data ?? [])
        .map((classItem, index) => {
          const students = atRiskQueries[index]?.data?.students ?? [];
          const scores = students
            .map((student) =>
              typeof student.blendedScore === "number"
                ? boundAcademicPercentage(student.blendedScore)
                : null,
            )
            .filter((score): score is number => score !== null);
          const threshold = students.find(
            (student) => typeof student.thresholdApplied === "number",
          )?.thresholdApplied;

          return {
            classItem,
            count: students.length,
            lowestScore: scores.length ? Math.round(Math.min(...scores)) : null,
            threshold:
              typeof threshold === "number" ? Math.round(threshold) : null,
          };
        })
        .filter((entry) => entry.count > 0),
    [atRiskQueries, classesQuery.data],
  );

  const draftCount = flattenedAssessments.filter(
    (assessment) => !assessment.isPublished,
  ).length;
  const attentionCount = upcomingAssessments.length + draftCount;
  const firstClassId = classesQuery.data?.[0]?.id;
  const [expandedSection, setExpandedSection] =
    useState<HomeSection | null>("attention");
  const toggleSection = (section: HomeSection) => {
    setExpandedSection((current) => (current === section ? null : section));
  };
  const refreshing =
    classesQuery.isRefetching ||
    assessmentQueries.some((query) => query.isRefetching) ||
    announcementQueries.some((query) => query.isRefetching) ||
    atRiskQueries.some((query) => query.isRefetching);

  return (
    <TeacherScreen
      title="Teacher Home"
      subtitle="Review classes, upcoming work, and quick links without leaving the current mobile theme."
      icon="view-dashboard-outline"
      rightAction={
        <Pressable
          accessibilityLabel="Open notifications"
          onPress={() => navigation.navigate("Notifications")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.active,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={18}
            color={theme.text}
          />
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
              <Text
                style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "900" }}
              >
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
      <View style={{ marginTop: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          <TeacherActionButton
            label="Updates"
            icon="bullhorn-outline"
            tone="red"
            disabled={!firstClassId}
            onPress={() => {
              if (!firstClassId) return;
              navigation.navigate("TeacherClassDetail", {
                classId: firstClassId,
                initialTab: "announcements",
              });
            }}
          />
          <TeacherActionButton
            label="Calendar"
            icon="calendar-month-outline"
            onPress={() => navigation.navigate("TeacherCalendar")}
          />
          <TeacherActionButton
            label="Classes"
            icon="book-open-variant-outline"
            tone="red"
            onPress={() => navigation.navigate("Classes")}
          />
          <TeacherActionButton
            label="Assessments"
            icon="clipboard-text-outline"
            tone="red"
            onPress={() => navigation.navigate("Assessments")}
          />
          <TeacherActionButton
            label="Profile"
            icon="account-circle-outline"
            tone="red"
            onPress={() => navigation.navigate("Profile")}
          />
          <TeacherActionButton
            label="More"
            icon="dots-horizontal-circle-outline"
            tone="red"
            onPress={() => navigation.navigate("TeacherMore")}
          />
        </ScrollView>
      </View>

      <TeacherAccordionSection
        title="Needs attention"
        subtitle="Due work and drafts that need a decision."
        icon="alert-circle-outline"
        count={attentionCount}
        accent="amber"
        expanded={expandedSection === "attention"}
        onToggle={() => toggleSection("attention")}
      >
        <TeacherRow
          title={`${upcomingAssessments.length} upcoming assessment${upcomingAssessments.length === 1 ? "" : "s"}`}
          subtitle="Published work students can reach soon."
          onPress={() => navigation.navigate("Assessments")}
          right={
            <Text
              style={{ fontSize: 18, fontWeight: "900", color: theme.amber }}
            >
              {upcomingAssessments.length}
            </Text>
          }
        />
        <TeacherRow
          title={`${draftCount} draft assessment${draftCount === 1 ? "" : "s"}`}
          subtitle="Finish drafts before class deadlines."
          onPress={() => navigation.navigate("Assessments")}
          right={
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.red }}>
              {draftCount}
            </Text>
          }
        />
      </TeacherAccordionSection>

      <TeacherAccordionSection
        title="My classes"
        subtitle="Open an assigned class and continue teaching work."
        icon="book-open-variant-outline"
        count={classesQuery.data?.length ?? 0}
        expanded={expandedSection === "classes"}
        onToggle={() => toggleSection("classes")}
      >
        {classesQuery.data?.length ? (
          classesQuery.data.slice(0, 3).map((classItem) => (
            <TeacherRow
              key={classItem.id}
              title={`${classItem.subjectCode} · ${classItem.subjectName}`}
              subtitle={`${classItem.section?.name || "Section pending"} · ${classItem.schoolYear}`}
              onPress={() =>
                navigation.navigate("TeacherClassDetail", {
                  classId: classItem.id,
                })
              }
              right={
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: theme.blue,
                    }}
                  >
                    {classItem.enrollmentCount ??
                      classItem.enrollments?.length ??
                      0}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.muted }}>
                    students
                  </Text>
                </View>
              }
            />
          ))
        ) : (
          <TeacherEmpty
            title="No teacher classes"
            subtitle="Classes assigned to this teacher account will appear here."
          />
        )}
      </TeacherAccordionSection>

      <TeacherAccordionSection
        title="Intervention focus"
        subtitle="Learners currently flagged for extra support."
        icon="account-heart-outline"
        count={interventionClasses.reduce((total, entry) => total + entry.count, 0)}
        expanded={expandedSection === "intervention"}
        onToggle={() => toggleSection("intervention")}
      >
        {interventionClasses.length ? (
          interventionClasses
            .slice(0, 4)
            .map(({ classItem, count, lowestScore, threshold }) => (
              <TeacherRow
                key={classItem.id}
                title={`${classItem.subjectCode} · ${classItem.subjectName}`}
                subtitle={`${classItem.section?.name || "Section pending"} · ${count} learner${count === 1 ? "" : "s"} need intervention${lowestScore !== null ? ` · lowest ${lowestScore}%` : ""}${threshold !== null ? ` · threshold ${threshold}%` : ""}`}
                onPress={() =>
                  navigation.navigate("TeacherInterventions", {
                    classId: classItem.id,
                  })
                }
                right={
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "900",
                        color: theme.red,
                      }}
                    >
                      {count}
                    </Text>
                    <Text style={{ fontSize: 10, color: theme.muted }}>
                      flagged
                    </Text>
                  </View>
                }
              />
            ))
        ) : (
          <TeacherEmpty
            title={
              classesQuery.data?.length
                ? "No urgent intervention flags"
                : "No classes available"
            }
            subtitle={
              classesQuery.data?.length
                ? "Classes with intervention needs will appear here once performance data crosses the threshold."
                : "Assigned classes are required before intervention data can appear."
            }
            icon="account-heart-outline"
          />
        )}
      </TeacherAccordionSection>

      <TeacherAccordionSection
        title="Upcoming assessments"
        subtitle="Published work students can reach soon."
        icon="clipboard-clock-outline"
        count={upcomingAssessments.length}
        expanded={expandedSection === "assessments"}
        onToggle={() => toggleSection("assessments")}
      >
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
                    backgroundColor: assessment.isPublished
                      ? theme.greenSoft
                      : theme.amberSoft,
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
      </TeacherAccordionSection>

      <TeacherAccordionSection
        title="Recent announcements"
        subtitle="Latest updates across your teaching load."
        icon="bullhorn-outline"
        count={recentAnnouncements.length}
        expanded={expandedSection === "announcements"}
        onToggle={() => toggleSection("announcements")}
      >
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
      </TeacherAccordionSection>
    </TeacherScreen>
  );
}
