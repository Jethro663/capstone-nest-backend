import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
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
  StatCard,
} from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { modulesApi } from "../api/services/modules";
import { lessonsApi } from "../api/services/lessons";
import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";
import type { ClassModule, ModuleItem } from "../types/module";

type Props = NativeStackScreenProps<RootStackParamList, "Courses">;

type ModuleLessonItem = ModuleItem & {
  lessonId?: string;
  lesson?: { isDraft?: boolean | null } | null;
};

function getVisibleLessons(modules: ClassModule[]) {
  return modules.flatMap((moduleEntry) => {
    if (moduleEntry.isLocked) return [];

    return moduleEntry.sections
      .slice()
      .sort((left, right) => left.order - right.order)
      .flatMap((section) =>
        section.items
          .map((item) => item as ModuleLessonItem)
          .slice()
          .sort((left, right) => left.order - right.order)
          .flatMap((item) => {
            if (item.itemType !== "lesson" || !item.lessonId) return [];
            if (item.lesson?.isDraft) {
              return [];
            }

            return [{ id: item.lessonId }];
          }),
      );
  });
}

export function CoursesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const studentId = user?.userId || user?.id;
  const classesQuery = useStudentClasses(studentId);
  const classIds = useMemo(() => classesQuery.data?.map((entry) => entry.id) ?? [], [classesQuery.data]);

  const moduleQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.classModules(classId),
      queryFn: () => modulesApi.getByClass(classId),
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

  const courseCards = useMemo(
    () =>
      (classesQuery.data ?? []).map((classItem, index) => {
        const modules = moduleQueries[index]?.data ?? [];
        const visibleLessons = getVisibleLessons(modules);
        const visibleLessonIds = new Set(visibleLessons.map((lesson) => lesson.id));
        const completions = completionQueries[index]?.data ?? [];
        const assessments = assessmentQueries[index]?.data ?? [];
        const completedLessonCount = completions.filter((entry) => entry.completed && visibleLessonIds.has(entry.lessonId)).length;
        const totalLessons = visibleLessons.length;
        const progress = totalLessons > 0 ? Math.round((completedLessonCount / totalLessons) * 100) : 0;
        const classmateCount = classItem.enrollments?.length ?? classItem.enrollmentCount ?? 0;

        return {
          id: classItem.id,
          subjectName: classItem.subjectName || classItem.className || classItem.name || "Class",
          sectionName: classItem.section?.name || "Section",
          teacherName: [classItem.teacher?.firstName, classItem.teacher?.lastName].filter(Boolean).join(" ").trim() || "Teacher not assigned",
          totalLessons,
          completedLessonCount,
          totalAssessments: assessments.length,
          classmateCount,
          progress,
        };
      }),
    [assessmentQueries, classesQuery.data, completionQueries, moduleQueries],
  );

  const filteredCourses = courseCards.filter((course) =>
    `${course.subjectName} ${course.sectionName}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const totals = courseCards.reduce(
    (summary, course) => {
      summary.lessons += course.totalLessons;
      summary.assessments += course.totalAssessments;
      summary.classmates += course.classmateCount;
      return summary;
    },
    { lessons: 0, assessments: 0, classmates: 0 },
  );

  const refreshing =
    classesQuery.isRefetching ||
    moduleQueries.some((query) => query.isRefetching) ||
    completionQueries.some((query) => query.isRefetching) ||
    assessmentQueries.some((query) => query.isRefetching);
  const primaryError =
    classesQuery.error ||
    moduleQueries.find((query) => query.error)?.error ||
    completionQueries.find((query) => query.error)?.error ||
    assessmentQueries.find((query) => query.error)?.error;

  const handleRefresh = () => {
    void Promise.all([
      classesQuery.refetch(),
      ...moduleQueries.map((query) => query.refetch()),
      ...completionQueries.map((query) => query.refetch()),
      ...assessmentQueries.map((query) => query.refetch()),
    ]);
  };

  return (
    <ScreenScroll refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}>
      <GradientHeader
        colors={gradients.classes}
        eyebrow={`Welcome, ${user?.firstName || "Student"}`}
        title="My Courses"
        rightContent={<FloatingIconButton icon="chevron-left" onPress={() => navigation.goBack()} />}
      >
        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          <StatCard icon="book-open-page-variant-outline" iconColor={colors.white} value={courseCards.length} label="Enrolled" translucent />
          <StatCard icon="clipboard-text-outline" iconColor={colors.white} value={totals.assessments} label="Tasks" translucent />
          <StatCard icon="account-group-outline" iconColor={colors.white} value={totals.classmates} label="Classmates" translucent />
        </View>
        <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search your courses..." />
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 18 }}>
        <Card>
          <SectionTitle title="Overview" right={<Pill label={`${totals.lessons} lessons`} backgroundColor={colors.paleAmber} color={colors.orange} />} />
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
            Open any enrolled course to review modules, assignments, announcements, classmates, grades, and calendar details.
          </Text>
        </Card>

        {primaryError ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Course data is partially unavailable</Text>
            <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
              {toAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        {classesQuery.isLoading && courseCards.length === 0 ? (
          <EmptyState emoji=".." title="Loading courses" subtitle="Pulling your enrolled classes now." />
        ) : !primaryError && filteredCourses.length === 0 ? (
          <EmptyState emoji=".." title="No courses found" subtitle="Try a different course keyword." />
        ) : (
          <View style={{ gap: 12 }}>
            {filteredCourses.map((course, index) => (
              <AnimatedEntrance key={course.id} delay={index * 60}>
                <Pressable
                  onPress={() => navigation.navigate("ClassDetail", { classId: course.id })}
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
                      <Text style={{ fontSize: 15, fontWeight: "900", color: colors.text }}>{course.subjectName}</Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>
                        {course.sectionName} • {course.teacherName}
                      </Text>
                    </View>
                    <Pill label={`${course.progress}%`} backgroundColor={colors.paleIndigo} color={colors.indigo} />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <ProgressBar value={course.progress} color={colors.indigo} trackColor={colors.paleIndigo} />
                  </View>

                  <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
                    <Pill label={`${course.completedLessonCount}/${course.totalLessons} lessons`} backgroundColor={colors.paleBlue} color={colors.blueDeep} />
                    <Pill label={`${course.totalAssessments} tasks`} backgroundColor={colors.paleAmber} color={colors.orange} />
                    <Pill label={`${course.classmateCount} classmates`} backgroundColor={colors.paleGreen} color={colors.greenDeep} />
                  </View>
                </Pressable>
              </AnimatedEntrance>
            ))}
          </View>
        )}
      </View>
    </ScreenScroll>
  );
}
