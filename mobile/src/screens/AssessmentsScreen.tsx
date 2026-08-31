import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  AnimatedEntrance,
  Refreshable,
  ScreenScroll,
} from "../components/ui/primitives";
import { peekAppError } from "../api/http";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { assessmentsApi } from "../api/services/assessments";
import { useAuth } from "../providers/AuthProvider";
import type { MainTabParamList } from "../navigation/types";
import type { Assessment, AssessmentAttempt, AssessmentType } from "../types/assessment";
import type { ClassItem } from "../types/class";
import { studentDarkTheme } from "../theme/studentDark";
import { shadow } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Assessments">;
type AssessmentFilterKey = "allAssessments" | "pending" | "completed" | "past_due";
type AssessmentStatus = Exclude<AssessmentRecord["status"], never>;
type AssessmentActionKey = "details" | "history" | "results" | "class";

type AssessmentRecord = {
  id: string;
  classId: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  typeLabel: string;
  badgeText: string;
  badgeColor: string;
  status: "pending" | "completed" | "past_due";
  statusLabel: string;
  dueLabel: string;
  dueTime: number | null;
  totalPoints: number;
  attemptCount: number;
  latestAttempt: AssessmentAttempt | null;
};

const darkTheme = studentDarkTheme;

const filterTabs: Array<{ key: AssessmentFilterKey; label: string }> = [
  { key: "allAssessments", label: "All Assessments" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "past_due", label: "Past Due" },
];

const assessmentTypeBadge: Record<AssessmentType, string> = {
  quiz: "QZ",
  exam: "EX",
  assignment: "AS",
  written_work: "WW",
  performance_task: "PT",
  quarterly_assessment: "QA",
  file_upload: "FU",
};

const statusPriority: Record<AssessmentRecord["status"], number> = {
  past_due: 0,
  pending: 2,
  completed: 3,
};

const statusProgress: Record<AssessmentRecord["status"], number> = {
  past_due: 28,
  pending: 68,
  completed: 100,
};

const actionConfig: Record<
  AssessmentActionKey,
  {
    defaultLabel: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    background: string;
    color: string;
  }
> = {
  details: {
    defaultLabel: "Open Assessment",
    icon: "clipboard-text-outline",
    background: darkTheme.blueSoft,
    color: darkTheme.blue,
  },
  history: {
    defaultLabel: "Assessment History",
    icon: "history",
    background: darkTheme.purpleSoft,
    color: darkTheme.purple,
  },
  results: {
    defaultLabel: "Latest Status",
    icon: "chart-box-outline",
    background: darkTheme.amberSoft,
    color: darkTheme.amber,
  },
  class: {
    defaultLabel: "Open Class",
    icon: "book-open-page-variant-outline",
    background: darkTheme.greenSoft,
    color: darkTheme.green,
  },
};

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function resolveSubjectName(classItem?: ClassItem) {
  return classItem?.subjectName || classItem?.className || classItem?.name || "Class";
}

function resolveSubjectCode(classItem?: ClassItem) {
  return classItem?.subjectCode || "CLASS";
}

function resolveAssessmentTypeLabel(type?: AssessmentType) {
  return (type || "assignment")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function resolveAssessmentBadge(type?: AssessmentType) {
  if (!type) {
    return "AS";
  }

  return assessmentTypeBadge[type] || "AS";
}

function resolveBadgeColor(status: AssessmentRecord["status"]) {
  switch (status) {
    case "completed":
      return darkTheme.green;
    case "past_due":
      return darkTheme.red;
    case "pending":
    default:
      return darkTheme.blue;
  }
}

function resolveStatusLabel(status: AssessmentRecord["status"]) {
  switch (status) {
    case "completed":
      return "Completed";
    case "past_due":
      return "Past Due";
    case "pending":
    default:
      return "Pending";
  }
}

function resolveUserInitials(firstName?: string, lastName?: string, email?: string) {
  const fromNames = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value?.trim()?.[0] ?? "")
    .join("")
    .toUpperCase();

  if (fromNames.length >= 2) {
    return fromNames.slice(0, 2);
  }

  if (fromNames.length === 1) {
    return `${fromNames}S`;
  }

  return (email?.slice(0, 2) || "ST").toUpperCase();
}

function formatDueDate(value?: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getAttemptTimestamp(attempt: AssessmentAttempt) {
  return new Date(attempt.submittedAt || attempt.startedAt || attempt.createdAt || 0).getTime();
}

function resolveAssessmentStatus(assessment: Assessment, attempts: AssessmentAttempt[]) {
  const latestAttempt =
    [...attempts].sort((left, right) => getAttemptTimestamp(right) - getAttemptTimestamp(left))[0] || null;
  const dueTime = assessment.dueDate ? new Date(assessment.dueDate).getTime() : null;
  let status: AssessmentRecord["status"] = "pending";

  if (latestAttempt?.isSubmitted) {
    status = "completed";
  } else if (dueTime && dueTime < Date.now()) {
    status = "past_due";
  }

  return { latestAttempt, dueTime, status };
}

function buildAssessmentSubtitle(item: AssessmentRecord) {
  return `${item.subjectCode} - ${item.typeLabel} - Due ${item.dueLabel}`;
}

function buildEmptyStateSubtitle(activeFilter: AssessmentFilterKey, searchQuery: string) {
  if (searchQuery.trim()) {
    return "Try another search term or switch the current filter.";
  }

  if (activeFilter === "allAssessments") {
    return "No published assessments are available right now.";
  }

  const filterLabel = filterTabs.find((tab) => tab.key === activeFilter)?.label.toLowerCase() || "assessments";
  const normalizedLabel = filterLabel.includes("assessment") ? filterLabel : `${filterLabel} assessments`;
  return `No ${normalizedLabel} match this view.`;
}

function buildActionLabel(item: AssessmentRecord, action: AssessmentActionKey) {
  if (action === "results") {
    if (item.latestAttempt?.isSubmitted && item.latestAttempt.isReturned) {
      return "View Results";
    }

    if (item.latestAttempt && !item.latestAttempt.isSubmitted) {
      return "Continue Attempt";
    }

    if (item.latestAttempt?.isSubmitted) {
      return "Submission Status";
    }
  }

  return actionConfig[action].defaultLabel;
}

function buildActionBadge(item: AssessmentRecord, action: AssessmentActionKey) {
  switch (action) {
    case "details":
      return item.statusLabel;
    case "history":
      return `${item.attemptCount} ${pluralize(item.attemptCount, "attempt", "attempts")}`;
    case "results":
      if (item.latestAttempt?.isSubmitted && item.latestAttempt.isReturned && item.latestAttempt.score !== undefined) {
        return `${Math.round(item.latestAttempt.score)}/${item.totalPoints}`;
      }

      if (item.latestAttempt?.isSubmitted) {
        return "Checking";
      }

      if (item.latestAttempt && !item.latestAttempt.isSubmitted) {
        return `Attempt ${item.latestAttempt.attemptNumber || item.attemptCount}`;
      }

      return "Not started";
    case "class":
      return item.subjectCode;
  }
}

function navigateToAction(
  navigation: Props["navigation"],
  item: AssessmentRecord,
  action: AssessmentActionKey,
) {
  const nextNavigation = navigation as any;

  switch (action) {
    case "details":
      nextNavigation.navigate("AssessmentDetail", {
        assessmentId: item.id,
        classId: item.classId,
      });
      return;
    case "history":
      nextNavigation.navigate("AssessmentHistory", {
        assessmentId: item.id,
        classId: item.classId,
      });
      return;
    case "results":
      if (item.latestAttempt?.isSubmitted && item.latestAttempt.isReturned) {
        nextNavigation.navigate("AssessmentResults", {
          attemptId: item.latestAttempt.id,
          assessmentId: item.id,
        });
        return;
      }

      if (item.latestAttempt && !item.latestAttempt.isSubmitted) {
        nextNavigation.navigate("AssessmentTake", {
          assessmentId: item.id,
        });
        return;
      }

      nextNavigation.navigate("AssessmentDetail", {
        assessmentId: item.id,
        classId: item.classId,
      });
      return;
    case "class":
      nextNavigation.navigate("ClassDetail", {
        classId: item.classId,
        initialTab: "assignments",
      });
  }
}

function DarkNotice({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View
      style={{
        backgroundColor: darkTheme.surface,
        borderColor: darkTheme.border,
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
      }}
    >
      <Text style={{ color: darkTheme.text, fontSize: 14, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: darkTheme.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
        {subtitle}
      </Text>
    </View>
  );
}

export function AssessmentsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AssessmentFilterKey>("allAssessments");
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);
  const classesQuery = useStudentClasses(user?.userId || user?.id);

  const publishedAssessmentQueries = useQueries({
    queries: (classesQuery.data ?? []).map((classItem) => ({
      queryKey: queryKeys.assessments(classItem.id),
      queryFn: () => assessmentsApi.getByClass(classItem.id),
      enabled: !!classItem.id,
    })),
  });

  const baseAssessments = useMemo(
    () =>
      publishedAssessmentQueries.flatMap((query, index) => {
        const classItem = (classesQuery.data ?? [])[index];
        const items = (query.data ?? []) as Assessment[];

        return items
          .filter((assessment) => assessment.isPublished !== false)
          .map((assessment) => ({ assessment, classItem }));
      }),
    [classesQuery.data, publishedAssessmentQueries],
  );

  const attemptQueries = useQueries({
    queries: baseAssessments.map(({ assessment }) => ({
      queryKey: queryKeys.assessmentAttempts(assessment.id),
      queryFn: () => assessmentsApi.getStudentAttempts(assessment.id),
      enabled: !!assessment.id,
    })),
  });

  const derivedAssessments = useMemo<AssessmentRecord[]>(() => {
    return baseAssessments
      .map(({ assessment, classItem }, index) => {
        const attempts = (attemptQueries[index]?.data ?? []) as AssessmentAttempt[];
        const { latestAttempt, dueTime, status } = resolveAssessmentStatus(assessment, attempts);

        return {
          id: assessment.id,
          classId: assessment.classId,
          title: assessment.title || "Untitled assessment",
          subjectName: resolveSubjectName(classItem),
          subjectCode: resolveSubjectCode(classItem),
          typeLabel: resolveAssessmentTypeLabel(assessment.type),
          badgeText: resolveAssessmentBadge(assessment.type),
          badgeColor: resolveBadgeColor(status),
          status,
          statusLabel: resolveStatusLabel(status),
          dueLabel: formatDueDate(assessment.dueDate),
          dueTime,
          totalPoints: assessment.totalPoints ?? 100,
          attemptCount: attempts.length,
          latestAttempt,
        };
      })
      .sort((left, right) => {
        const statusGap = statusPriority[left.status] - statusPriority[right.status];
        if (statusGap !== 0) {
          return statusGap;
        }

        const dueGap = (left.dueTime ?? Number.MAX_SAFE_INTEGER) - (right.dueTime ?? Number.MAX_SAFE_INTEGER);
        if (dueGap !== 0) {
          return dueGap;
        }

        return left.title.localeCompare(right.title);
      });
  }, [attemptQueries, baseAssessments]);

  const filteredAssessments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return derivedAssessments.filter((assessment) => {
      const matchesFilter =
        activeFilter === "allAssessments" ? true : assessment.status === activeFilter;

      const matchesSearch =
        normalizedQuery.length === 0
          ? true
          : [assessment.title, assessment.subjectName, assessment.subjectCode, assessment.typeLabel, assessment.statusLabel]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, derivedAssessments, searchQuery]);

  const refreshing =
    classesQuery.isRefetching ||
    publishedAssessmentQueries.some((query) => query.isRefetching) ||
    attemptQueries.some((query) => query.isRefetching);

  const primaryError =
    classesQuery.error ||
    publishedAssessmentQueries.find((query) => query.error)?.error ||
    attemptQueries.find((query) => query.error)?.error;

  const handleRefresh = () => {
    void Promise.all([
      classesQuery.refetch(),
      ...publishedAssessmentQueries.map((query) => query.refetch()),
      ...attemptQueries.map((query) => query.refetch()),
    ]);
  };

  const userInitials = resolveUserInitials(user?.firstName, user?.lastName, user?.email);

  return (
    <ScreenScroll
      backgroundColor={darkTheme.bg}
      refreshControl={<Refreshable refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={{ backgroundColor: darkTheme.bg }}>
        <View
          style={{
            backgroundColor: darkTheme.topbar,
            borderBottomColor: darkTheme.border,
            borderBottomWidth: 1,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ alignItems: "center", flexDirection: "row", gap: 9 }}>
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: darkTheme.red,
                  borderRadius: 8,
                  height: 28,
                  justifyContent: "center",
                  width: 28,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>N</Text>
              </View>
              <Text style={{ color: darkTheme.text, fontSize: 17, fontWeight: "600" }}>Assessments</Text>
            </View>

            <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
              <Pressable
                accessibilityLabel="Open assessment search"
                onPress={() => setSearchOpen((current) => !current)}
                style={{
                  alignItems: "center",
                  backgroundColor: darkTheme.surface,
                  borderWidth: 1,
                  borderColor: darkTheme.border,
                  borderRadius: 999,
                  height: 44,
                  justifyContent: "center",
                  width: 44,
                }}
              >
                <MaterialCommunityIcons color={darkTheme.text} name="magnify" size={18} />
              </Pressable>

              <Pressable
                accessibilityLabel="Open assessment history"
                onPress={() => (navigation as any).navigate("AssessmentHistory")}
                style={{
                  alignItems: "center",
                  backgroundColor: darkTheme.surface,
                  borderWidth: 1,
                  borderColor: darkTheme.border,
                  borderRadius: 999,
                  height: 44,
                  justifyContent: "center",
                  width: 44,
                }}
              >
                <MaterialCommunityIcons color={darkTheme.text} name="history" size={18} />
              </Pressable>

              <View
                style={{
                  alignItems: "center",
                  backgroundColor: darkTheme.red,
                  borderRadius: 999,
                  height: 44,
                  justifyContent: "center",
                  width: 44,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{userInitials}</Text>
              </View>
            </View>
          </View>

          <Text style={{ color: darkTheme.subtext, fontSize: 11, paddingBottom: 10 }}>
            Stay on top, <Text style={{ color: darkTheme.text, fontWeight: "600" }}>{user?.firstName || "Student"}</Text>
          </Text>

          {searchOpen || searchQuery ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: darkTheme.bg,
                borderColor: darkTheme.border,
                borderRadius: 14,
                borderWidth: 1,
                flexDirection: "row",
                gap: 10,
                marginBottom: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <MaterialCommunityIcons color={darkTheme.muted} name="magnify" size={16} />
              <TextInput
                onChangeText={setSearchQuery}
                placeholder="Search assessments"
                placeholderTextColor={darkTheme.muted}
                style={{ color: darkTheme.text, flex: 1, fontSize: 13, padding: 0 }}
                value={searchQuery}
              />
            </View>
          ) : null}

          <View style={{ flexDirection: "row" }}>
            {filterTabs.map((tab) => {
              const focused = activeFilter === tab.key;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  style={{
                    borderBottomColor: focused ? darkTheme.red : "transparent",
                    borderBottomWidth: 2,
                    paddingHorizontal: 13,
                    minHeight: 44,
                    justifyContent: "center",
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: focused ? darkTheme.red : darkTheme.muted,
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingBottom: 76 }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
              paddingBottom: 6,
              paddingHorizontal: 16,
              paddingTop: 14,
            }}
          >
            <Text
              style={{
                color: darkTheme.muted,
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 0.7,
                textTransform: "uppercase",
              }}
            >
              Assessments & Actions
            </Text>
            <Text style={{ color: darkTheme.red, fontSize: 10, fontWeight: "600" }}>
              {filteredAssessments.length} {pluralize(filteredAssessments.length, "assessment", "assessments")}
            </Text>
          </View>

          <View style={{ gap: 0 }}>
            {primaryError ? (
              <View style={{ paddingBottom: 14, paddingHorizontal: 16 }}>
                <DarkNotice title="Some assessment data could not load" subtitle={peekAppError(primaryError).message} />
              </View>
            ) : null}

            {classesQuery.isLoading && derivedAssessments.length === 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <DarkNotice title="Loading assessments" subtitle="Pulling your published work now." />
              </View>
            ) : filteredAssessments.length === 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <DarkNotice
                  title="No assessments found"
                  subtitle={buildEmptyStateSubtitle(activeFilter, searchQuery)}
                />
              </View>
            ) : (
              filteredAssessments.map((assessment, index) => {
                const expanded = expandedAssessmentId === assessment.id;
                const attemptBadge = assessment.attemptCount > 0 ? assessment.attemptCount : null;

                return (
                  <AnimatedEntrance key={assessment.id} delay={index * 50}>
                    <View>
                      <Pressable
                        onPress={() =>
                          setExpandedAssessmentId((current) =>
                            current === assessment.id ? null : assessment.id,
                          )
                        }
                        style={{
                          alignItems: "center",
                          backgroundColor: expanded ? darkTheme.surface : darkTheme.bg,
                          borderColor: darkTheme.border,
                          borderRadius: 16,
                          borderWidth: 1,
                          flexDirection: "row",
                          gap: 12,
                          marginHorizontal: 16,
                          marginBottom: 10,
                          minHeight: 72,
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                          ...shadow.card,
                        }}
                      >
                        <View
                          style={{
                            alignItems: "center",
                            backgroundColor: assessment.badgeColor,
                            borderRadius: 14,
                            height: 48,
                            justifyContent: "center",
                            width: 48,
                          }}
                        >
                          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
                            {assessment.badgeText}
                          </Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={{ color: darkTheme.text, fontSize: 14, fontWeight: "500" }}
                          >
                            {assessment.title}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{ color: darkTheme.muted, fontSize: 11, marginTop: 2 }}
                          >
                            {buildAssessmentSubtitle(assessment)}
                          </Text>
                        </View>

                        <View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
                          <View
                            style={{
                              backgroundColor: darkTheme.active,
                              borderRadius: 2,
                              height: 5,
                              overflow: "hidden",
                              width: 46,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: assessment.badgeColor,
                                borderRadius: 2,
                                height: "100%",
                                width: `${statusProgress[assessment.status]}%`,
                              }}
                            />
                          </View>

                          {attemptBadge ? (
                            <View
                              style={{
                                alignItems: "center",
                                backgroundColor: darkTheme.purple,
                                borderRadius: 999,
                                height: 18,
                                justifyContent: "center",
                                width: 18,
                              }}
                            >
                              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                                {attemptBadge}
                              </Text>
                            </View>
                          ) : null}

                          <MaterialCommunityIcons
                            color={darkTheme.dim}
                            name={expanded ? "chevron-down" : "chevron-right"}
                            size={14}
                          />
                          <MaterialCommunityIcons
                            color={darkTheme.muted}
                            name="dots-horizontal"
                            size={16}
                          />
                        </View>
                      </Pressable>

                      {expanded ? (
                        <View
                          style={{
                            backgroundColor: darkTheme.channel,
                            borderColor: darkTheme.border,
                            borderBottomLeftRadius: 16,
                            borderBottomRightRadius: 16,
                            borderTopWidth: 0,
                            borderWidth: 1,
                            marginHorizontal: 16,
                            marginTop: -10,
                            marginBottom: 10,
                            overflow: "hidden",
                          }}
                        >
                          {(["details", "history", "results", "class"] as AssessmentActionKey[]).map(
                            (action, actionIndex, actions) => {
                              const config = actionConfig[action];

                              return (
                                <Pressable
                                  key={action}
                                  onPress={() => navigateToAction(navigation, assessment, action)}
                                  style={{
                                    alignItems: "center",
                                    borderBottomColor:
                                      actionIndex === actions.length - 1
                                        ? "transparent"
                                        : darkTheme.border,
                                    borderBottomWidth: actionIndex === actions.length - 1 ? 0 : 1,
                                    flexDirection: "row",
                                    gap: 10,
                                    paddingBottom: 10,
                                    paddingLeft: 58,
                                    paddingRight: 16,
                                    paddingTop: 10,
                                  }}
                                >
                                  <MaterialCommunityIcons
                                    color={darkTheme.text}
                                    name={config.icon}
                                    size={15}
                                    style={{ opacity: 0.55 }}
                                  />
                                  <Text
                                    style={{
                                      color: darkTheme.subtext,
                                      flex: 1,
                                      fontSize: 13,
                                    }}
                                  >
                                    {buildActionLabel(assessment, action)}
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor: config.background,
                                      borderRadius: 4,
                                      paddingHorizontal: 8,
                                      paddingVertical: 2,
                                    }}
                                  >
                                    <Text style={{ color: config.color, fontSize: 10, fontWeight: "500" }}>
                                      {buildActionBadge(assessment, action)}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            },
                          )}
                        </View>
                      ) : null}
                    </View>
                  </AnimatedEntrance>
                );
              })
            )}
          </View>
        </View>
      </View>
    </ScreenScroll>
  );
}
