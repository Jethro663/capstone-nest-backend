import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { peekAppError } from "../api/http";
import { queryKeys } from "../api/hooks";
import { mobileWorkspaceApi } from "../api/services/mobile-workspace";
import { useAuth } from "../providers/AuthProvider";
import type { RootStackParamList } from "../navigation/types";
import { colors, gradients, shadow } from "../theme/tokens";
import { OfflineWorkspaceNotice } from "../components/offline/OfflineWorkspaceNotice";

type Props = NativeStackScreenProps<RootStackParamList, "Courses">;

export function CoursesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const overviewQuery = useQuery({
    queryKey: [...queryKeys.mobileStudentOverview, user?.id],
    queryFn: () => mobileWorkspaceApi.getStudentOverviewForUser(user!.id),
    enabled: !!user?.id,
  });
  const courseCards = overviewQuery.data?.courses ?? [];
  const offlineState = overviewQuery.data?.offlineState;

  const filteredCourses = courseCards.filter((course) =>
    `${course.subjectName} ${course.sectionName}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
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

  const refreshing = overviewQuery.isRefetching;
  const primaryError = overviewQuery.error;
  const handleRefresh = () => void overviewQuery.refetch();

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <GradientHeader
        colors={gradients.classes}
        eyebrow={`Welcome, ${user?.firstName || "Student"}`}
        title="My Courses"
        rightContent={
          <FloatingIconButton
            icon="chevron-left"
            onPress={() => navigation.goBack()}
          />
        }
      >
        <View style={{ marginTop: 16, flexDirection: "row", gap: 12 }}>
          <StatCard
            icon="book-open-page-variant-outline"
            iconColor={colors.white}
            value={courseCards.length}
            label="Enrolled"
            translucent
          />
          <StatCard
            icon="clipboard-text-outline"
            iconColor={colors.white}
            value={totals.assessments}
            label="Tasks"
            translucent
          />
          <StatCard
            icon="account-group-outline"
            iconColor={colors.white}
            value={totals.classmates}
            label="Classmates"
            translucent
          />
        </View>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your courses..."
        />
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 18 }}>
        {offlineState ? (
          <OfflineWorkspaceNotice lastSyncedAt={offlineState.lastSyncedAt} />
        ) : null}
        <Card>
          <SectionTitle
            title="Overview"
            right={
              <Pill
                label={`${totals.lessons} lessons`}
                backgroundColor={colors.paleAmber}
                color={colors.orange}
              />
            }
          />
          <Text
            style={{
              fontSize: 12,
              lineHeight: 18,
              color: colors.textSecondary,
            }}
          >
            Open any enrolled course to review modules, assignments,
            announcements, classmates, grades, and calendar details.
          </Text>
        </Card>

        {primaryError ? (
          <Card>
            <Text
              style={{ fontSize: 14, fontWeight: "800", color: colors.text }}
            >
              Course data is partially unavailable
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 18,
                color: colors.textSecondary,
              }}
            >
              {peekAppError(primaryError).message}
            </Text>
          </Card>
        ) : null}

        {overviewQuery.isLoading && courseCards.length === 0 ? (
          <EmptyState
            emoji=".."
            title="Loading courses"
            subtitle="Pulling your enrolled classes now."
          />
        ) : !primaryError && filteredCourses.length === 0 ? (
          <EmptyState
            emoji=".."
            title="No courses found"
            subtitle="Try a different course keyword."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {filteredCourses.map((course, index) => (
              <AnimatedEntrance key={course.id} delay={index * 60}>
                <Pressable
                  accessibilityState={{ disabled: !!offlineState }}
                  disabled={!!offlineState}
                  onPress={() =>
                    navigation.navigate("ClassDetail", {
                      classId: course.id,
                      source: "courses",
                    })
                  }
                  style={[
                    {
                      borderRadius: 24,
                      backgroundColor: colors.white,
                      padding: 18,
                      opacity: offlineState ? 0.72 : 1,
                    },
                    shadow.card,
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "900",
                          color: colors.text,
                        }}
                      >
                        {course.subjectName}
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: colors.textSecondary,
                        }}
                      >
                        {course.sectionName} • {course.teacherName}
                      </Text>
                    </View>
                    <Pill
                      label={`${course.progress}%`}
                      backgroundColor={colors.paleIndigo}
                      color={colors.indigo}
                    />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <ProgressBar
                      value={course.progress}
                      color={colors.indigo}
                      trackColor={colors.paleIndigo}
                    />
                  </View>

                  <View
                    style={{ marginTop: 12, flexDirection: "row", gap: 10 }}
                  >
                    <Pill
                      label={`${course.completedLessonCount}/${course.totalLessons} lessons`}
                      backgroundColor={colors.paleBlue}
                      color={colors.blueDeep}
                    />
                    <Pill
                      label={`${course.totalAssessments} tasks`}
                      backgroundColor={colors.paleAmber}
                      color={colors.orange}
                    />
                    <Pill
                      label={`${course.classmateCount} classmates`}
                      backgroundColor={colors.paleGreen}
                      color={colors.greenDeep}
                    />
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
