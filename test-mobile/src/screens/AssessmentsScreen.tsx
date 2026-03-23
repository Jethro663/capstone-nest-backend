import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  AnimatedEntrance,
  Card,
  EmptyState,
  FloatingIconButton,
  GradientHeader,
  Pill,
  Refreshable,
  ScreenScroll,
} from "../components/ui/primitives";
import { toAppError } from "../api/http";
import { queryKeys, usePerformanceSummary, useStudentClasses } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { lessonsApi } from "../api/services/lessons";
import { toAssessmentCard, toSubjectCard } from "../data/mappers";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import { colors, gradients } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;
type FilterType = "all" | "pending" | "late" | "missing" | "completed";

const filterColors: Record<FilterType, { bg: string; text: string; border: string }> = {
  all: { bg: colors.amber, text: colors.white, border: colors.amber },
  pending: { bg: colors.blue, text: colors.white, border: colors.blue },
  late: { bg: colors.red, text: colors.white, border: colors.red },
  missing: { bg: colors.orange, text: colors.white, border: colors.orange },
  completed: { bg: colors.green, text: colors.white, border: colors.green },
};

const statusConfig = {
  pending: { icon: "clock-outline", color: colors.blue, bg: colors.paleBlue, label: "Pending" },
  late: { icon: "alert-circle", color: colors.red, bg: colors.paleRed, label: "Late" },
  missing: { icon: "close-circle", color: colors.orange, bg: colors.paleOrange, label: "Missing" },
  completed: { icon: "check-circle", color: colors.green, bg: colors.paleGreen, label: "Completed" },
} as const;

export function AssessmentsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const performanceQuery = usePerformanceSummary();
  const classIds = classesQuery.data?.map((classItem) => classItem.id) ?? [];

  const lessonQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.lessons(classId),
      queryFn: () => lessonsApi.getByClass(classId),
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

  const subjects = useMemo(
    () =>
      (classesQuery.data ?? []).map((classItem, index) =>
        toSubjectCard(
          classItem,
          lessonQueries[index]?.data ?? [],
          completionQueries[index]?.data ?? [],
          performanceQuery.data?.classes.find((entry) => entry.classId === classItem.id),
        ),
      ),
    [classesQuery.data, completionQueries, lessonQueries, performanceQuery.data?.classes],
  );

  const assessments = useMemo(
    () =>
      assessmentQueries.flatMap((query, index) => {
        const subject = subjects[index];
        if (!subject || !query.data) return [];
        return query.data.map((assessment) => toAssessmentCard(assessment, subject, []));
      }),
    [assessmentQueries, subjects],
  );

  const attemptQueries = useQueries({
    queries: assessments.map((assessment) => ({
      queryKey: queryKeys.assessmentAttempts(assessment.id),
      queryFn: () => assessmentsApi.getStudentAttempts(assessment.id),
      enabled: assessments.length > 0,
    })),
  });

  const assessmentCards = useMemo(
    () =>
      assessments.flatMap((assessment, index) => {
        const attempts = attemptQueries[index]?.data ?? [];
        const subject = subjects.find((entry) => entry.id === assessment.subjectId);

        if (!subject) {
          return [];
        }

        return {
          ...assessment,
          ...toAssessmentCard(assessment.raw as any, subject, attempts),
        };
      }),
    [assessments, attemptQueries, subjects],
  );

  const filters: FilterType[] = ["all", "pending", "late", "missing", "completed"];
  const pendingCount = assessmentCards.filter((entry) => entry.status === "pending").length;
  const lateCount = assessmentCards.filter((entry) => entry.status === "late").length;
  const missingCount = assessmentCards.filter((entry) => entry.status === "missing").length;
  const filtered =
    activeFilter === "all" ? assessmentCards : assessmentCards.filter((entry) => entry.status === activeFilter);

  const refreshing =
    classesQuery.isRefetching ||
    assessmentQueries.some((query) => query.isRefetching) ||
    attemptQueries.some((query) => query.isRefetching);
  const primaryError =
    classesQuery.error ||
    performanceQuery.error ||
    assessmentQueries.find((query) => query.error)?.error ||
    attemptQueries.find((query) => query.error)?.error;

  return (
    <ScreenScroll
      refreshControl={
        <Refreshable
          refreshing={refreshing}
          onRefresh={() => {
            void Promise.all([classesQuery.refetch(), ...assessmentQueries.map((query) => query.refetch())]);
          }}
        />
      }
    >
      <GradientHeader
        colors={gradients.assessments}
        eyebrow="Track your work ðŸ“"
        title="Assessments"
        rightContent={<FloatingIconButton icon="clipboard-check-outline" />}
      >
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {[
            { label: "Pending", count: pendingCount, color: colors.blue },
            { label: "Late", count: lateCount, color: colors.red },
            { label: "Missing", count: missingCount, color: colors.orange },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "rgba(255,255,255,0.24)",
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: item.color }} />
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: "800" }}>
                {item.count} {item.label}
              </Text>
            </View>
          ))}
        </View>
      </GradientHeader>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            const config = filterColors[filter];
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: isActive ? config.bg : colors.white,
                  borderWidth: 2,
                  borderColor: isActive ? config.border : colors.border,
                }}
              >
                <Text
                  style={{
                    color: isActive ? config.text : colors.muted,
                    fontSize: 13,
                    fontWeight: "800",
                    textTransform: "capitalize",
                  }}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: 8, gap: 12 }}>
          {primaryError ? (
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>Assessments are unavailable</Text>
              <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: colors.textSecondary }}>
                {toAppError(primaryError).message}
              </Text>
            </Card>
          ) : null}
          {filtered.length === 0 ? (
            <EmptyState emoji="ðŸŽ‰" title="All clear!" subtitle={`No ${activeFilter} assessments right now.`} />
          ) : (
            filtered.map((assessment, index) => {
              const config = statusConfig[assessment.status];
              const isUrgent = assessment.status === "late" || assessment.status === "missing";

              return (
                <AnimatedEntrance key={assessment.id} delay={index * 80}>
                  <Pressable
                    onPress={() =>
                      (navigation as any).navigate("AssessmentDetail", {
                        assessmentId: assessment.id,
                        classId: assessment.classId || assessment.subjectId,
                      })
                    }
                  >
                    <Card style={{ overflow: "hidden", padding: 0 }}>
                      {isUrgent ? <View style={{ height: 3, backgroundColor: config.color, width: "100%" }} /> : null}
                      <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
                        <View
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: config.bg,
                          }}
                        >
                          <Text style={{ fontSize: 28 }}>{assessment.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{assessment.title}</Text>
                            {isUrgent ? <Pill label={config.label} backgroundColor={config.bg} color={config.color} /> : null}
                          </View>
                          <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary }}>{assessment.subject}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <MaterialCommunityIcons name="clock-outline" size={12} color={colors.muted} />
                              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>
                                Due: {assessment.dueDate}
                              </Text>
                            </View>
                            {assessment.status === "completed" && assessment.score !== undefined ? (
                              <Pill
                                label={`${Math.round(assessment.score)}/${assessment.totalScore} âœ“`}
                                backgroundColor={colors.paleGreen}
                                color={colors.green}
                              />
                            ) : null}
                          </View>
                        </View>
                        <View style={{ alignItems: "center", justifyContent: "space-between" }}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: config.bg,
                            }}
                          >
                            <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
                          </View>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: assessment.status === "completed" ? colors.green : colors.amber,
                            }}
                          >
                            <MaterialCommunityIcons
                              name={assessment.status === "completed" ? "check" : "chevron-right"}
                              size={16}
                              color={colors.white}
                            />
                          </View>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                </AnimatedEntrance>
              );
            })
          )}
        </View>
      </View>
    </ScreenScroll>
  );
}
