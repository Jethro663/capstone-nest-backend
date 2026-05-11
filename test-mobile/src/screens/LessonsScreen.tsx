import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  AnimatedEntrance,
  Refreshable,
  ScreenScroll,
} from "../components/ui/primitives";
import { peekAppError } from "../api/http";
import { queryKeys, useStudentClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import { lessonsApi } from "../api/services/lessons";
import { modulesApi } from "../api/services/modules";
import { useAuth } from "../providers/AuthProvider";
import type {
  ClassDetailInitialTab,
  MainTabParamList,
  RootStackParamList,
} from "../navigation/types";
import type { Assessment } from "../types/assessment";
import type { Announcement } from "../types/announcement";
import type { ClassItem } from "../types/class";
import type { LessonCompletion } from "../types/lesson";
import type { ClassModule, ModuleItem } from "../types/module";
import { studentDarkTheme } from "../theme/studentDark";
import { shadow } from "../theme/tokens";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Classes">,
  NativeStackScreenProps<RootStackParamList>
>;

type ClassFilterKey = "allClasses" | "inProgress" | "completed" | "hidden";
type ChannelKey = "modules" | "assignments" | "announcements" | "calendar";

type ModuleLessonItem = ModuleItem & {
  lessonId?: string;
  lesson?: { title?: string; isDraft?: boolean | null } | null;
};

type DerivedClassItem = {
  id: string;
  subjectName: string;
  subjectCode: string;
  sectionName: string;
  teacherName: string;
  badgeText: string;
  avatarColor: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  assessmentsCount: number;
  announcementsCount: number;
  calendarCount: number;
  status: "inProgress" | "completed";
};

const darkTheme = studentDarkTheme;

const avatarColors = ["#1D4ED8", "#15803D", "#6D28D9"] as const;

const filterTabs: Array<{ key: ClassFilterKey; label: string }> = [
  { key: "allClasses", label: "All Classes" },
  { key: "inProgress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "hidden", label: "Hidden" },
];

const channelConfig: Record<
  ChannelKey,
  {
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    background: string;
    color: string;
  }
> = {
  modules: {
    label: "Modules",
    icon: "book-open-page-variant-outline",
    background: darkTheme.blueSoft,
    color: darkTheme.blue,
  },
  assignments: {
    label: "Assignments",
    icon: "file-document-outline",
    background: darkTheme.amberSoft,
    color: darkTheme.amber,
  },
  announcements: {
    label: "Announcements",
    icon: "bell-outline",
    background: darkTheme.redSoft,
    color: darkTheme.red,
  },
  calendar: {
    label: "Calendar",
    icon: "calendar-blank-outline",
    background: darkTheme.greenSoft,
    color: darkTheme.green,
  },
};

function getVisibleLessons(modules: ClassModule[]) {
  return modules.flatMap((moduleEntry) => {
    if (moduleEntry.isLocked) return [];

    const sections = Array.isArray(moduleEntry.sections) ? moduleEntry.sections : [];

    return sections
      .slice()
      .sort((left, right) => left.order - right.order)
      .flatMap((section) =>
        section.items
          .map((item) => item as ModuleLessonItem)
          .slice()
          .sort((left, right) => left.order - right.order)
          .flatMap((item) => {
            if (item.itemType !== "lesson" || !item.lessonId || item.lesson?.isDraft) {
              return [];
            }

            return [{ id: item.lessonId }];
          }),
      );
  });
}

function resolveSubjectName(classItem: ClassItem) {
  return classItem.subjectName || classItem.className || classItem.name || "Class";
}

function resolveSubjectCode(classItem: ClassItem) {
  return classItem.subjectCode || "CLASS";
}

function resolveSectionName(classItem: ClassItem) {
  return classItem.section?.name || classItem.className || classItem.name || "Section";
}

function resolveTeacherName(classItem: ClassItem) {
  return (
    [classItem.teacher?.firstName, classItem.teacher?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Teacher not assigned"
  );
}

function resolveBadgeText(classItem: ClassItem, index: number) {
  const subjectCode = resolveSubjectCode(classItem)
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  if (subjectCode.length >= 2) {
    return subjectCode.slice(0, 2);
  }

  const subjectName = resolveSubjectName(classItem)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (subjectName.length >= 2) {
    return subjectName.slice(0, 2);
  }

  return `C${index + 1}`;
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
    return `${fromNames}N`;
  }

  return (email?.slice(0, 2) || "NR").toUpperCase();
}

function formatLessonCount(count: number) {
  return `${count} ${count === 1 ? "lesson" : "lessons"}`;
}

function formatEventCount(count: number) {
  return `${count} ${count === 1 ? "event" : "events"}`;
}

function buildSubtitle(item: DerivedClassItem) {
  return `${item.subjectCode} · ${item.sectionName} · ${item.teacherName}`;
}

function buildChannelBadge(item: DerivedClassItem, key: ChannelKey) {
  switch (key) {
    case "modules":
      return formatLessonCount(item.totalLessons);
    case "assignments":
      return `${item.assessmentsCount} pending`;
    case "announcements":
      return `${item.announcementsCount} new`;
    case "calendar":
      return formatEventCount(item.calendarCount);
  }
}

function navigateToChannel(navigation: Props["navigation"], classId: string, channel: ChannelKey) {
  if (channel === "modules") {
    navigation.navigate("ClassDetail", { classId });
    return;
  }

  const initialTabMap: Record<Exclude<ChannelKey, "modules">, ClassDetailInitialTab> = {
    assignments: "assignments",
    announcements: "announcements",
    calendar: "calendar",
  };

  navigation.navigate("ClassDetail", {
    classId,
    initialTab: initialTabMap[channel],
  });
}

function DarkNotice({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: darkTheme.border,
        backgroundColor: darkTheme.surface,
        padding: 16,
      }}
    >
      <Text style={{ color: darkTheme.text, fontSize: 14, fontWeight: "800" }}>{title}</Text>
      <Text style={{ marginTop: 6, color: darkTheme.muted, fontSize: 12, lineHeight: 18 }}>
        {subtitle}
      </Text>
    </View>
  );
}

export function LessonsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ClassFilterKey>("allClasses");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const classesQuery = useStudentClasses(user?.userId || user?.id);
  const classIds = useMemo(
    () => classesQuery.data?.map((classItem) => classItem.id) ?? [],
    [classesQuery.data],
  );

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

  const announcementQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
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

  const derivedClasses = useMemo<DerivedClassItem[]>(() => {
    return (classesQuery.data ?? []).map((classItem, index) => {
      const visibleLessons = getVisibleLessons(moduleQueries[index]?.data ?? []);
      const visibleLessonIds = new Set(visibleLessons.map((lesson) => lesson.id));
      const completions = ((completionQueries[index]?.data ?? []) as LessonCompletion[]).filter((entry) =>
        visibleLessonIds.has(entry.lessonId),
      );
      const completedLessons = completions.filter((entry) => entry.completed).length;
      const totalLessons = visibleLessons.length;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const assessments = ((assessmentQueries[index]?.data ?? []) as Assessment[]).filter(
        (assessment) => assessment.isPublished !== false,
      );
      const announcements = (announcementQueries[index]?.data ?? []) as Announcement[];
      const calendarCount =
        (classItem.schedules?.length ?? 0) +
        assessments.filter((assessment) => Boolean(assessment.dueDate)).length;

      return {
        id: classItem.id,
        subjectName: resolveSubjectName(classItem),
        subjectCode: resolveSubjectCode(classItem),
        sectionName: resolveSectionName(classItem),
        teacherName: resolveTeacherName(classItem),
        badgeText: resolveBadgeText(classItem, index),
        avatarColor: avatarColors[index % avatarColors.length],
        progress,
        completedLessons,
        totalLessons,
        assessmentsCount: assessments.length,
        announcementsCount: announcements.length,
        calendarCount,
        status: totalLessons > 0 && progress >= 100 ? "completed" : "inProgress",
      };
    });
  }, [
    announcementQueries,
    assessmentQueries,
    classesQuery.data,
    completionQueries,
    moduleQueries,
  ]);

  const filteredClasses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return derivedClasses.filter((classItem) => {
      const matchesFilter =
        activeFilter === "allClasses"
          ? true
          : activeFilter === "hidden"
            ? false
            : classItem.status === activeFilter;

      const matchesSearch =
        normalizedQuery.length === 0
          ? true
          : [
              classItem.subjectName,
              classItem.subjectCode,
              classItem.sectionName,
              classItem.teacherName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, derivedClasses, searchQuery]);

  const refreshing =
    classesQuery.isRefetching ||
    moduleQueries.some((query) => query.isRefetching) ||
    completionQueries.some((query) => query.isRefetching) ||
    announcementQueries.some((query) => query.isRefetching) ||
    assessmentQueries.some((query) => query.isRefetching);

  const primaryError =
    classesQuery.error ||
    moduleQueries.find((query) => query.error)?.error ||
    completionQueries.find((query) => query.error)?.error ||
    announcementQueries.find((query) => query.error)?.error ||
    assessmentQueries.find((query) => query.error)?.error;

  const handleRefresh = () => {
    void Promise.all([
      classesQuery.refetch(),
      ...classIds.flatMap((classId) => [
        queryClient.invalidateQueries({ queryKey: queryKeys.classModules(classId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessonCompletions(classId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.announcements(classId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.assessments(classId) }),
      ]),
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
            paddingHorizontal: 16,
            paddingTop: 16,
            borderBottomWidth: 1,
            borderBottomColor: darkTheme.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: darkTheme.red,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>N</Text>
              </View>
              <Text style={{ color: darkTheme.text, fontSize: 17, fontWeight: "600" }}>My Classes</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                accessibilityLabel="Open class search"
                onPress={() => setSearchOpen((current) => !current)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: darkTheme.surface,
                  borderWidth: 1,
                  borderColor: darkTheme.border,
                }}
              >
                <MaterialCommunityIcons name="magnify" size={18} color={darkTheme.text} />
              </Pressable>

              <Pressable
                accessibilityLabel="Refresh class data"
                onPress={handleRefresh}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: darkTheme.surface,
                  borderWidth: 1,
                  borderColor: darkTheme.border,
                }}
              >
                <MaterialCommunityIcons name="refresh" size={18} color={darkTheme.text} />
              </Pressable>

              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: darkTheme.red,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{userInitials}</Text>
              </View>
            </View>
          </View>

          <Text style={{ color: darkTheme.subtext, fontSize: 11, paddingBottom: 10 }}>
            Welcome back, <Text style={{ color: darkTheme.text, fontWeight: "600" }}>{user?.firstName || "Student"}</Text>
          </Text>

          {searchOpen || searchQuery ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: darkTheme.border,
                backgroundColor: darkTheme.bg,
                marginBottom: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={16} color={darkTheme.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search classes"
                placeholderTextColor={darkTheme.muted}
                style={{ flex: 1, color: darkTheme.text, fontSize: 13, padding: 0 }}
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
                    paddingHorizontal: 13,
                    minHeight: 44,
                    justifyContent: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 2,
                    borderBottomColor: focused ? darkTheme.red : "transparent",
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
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 6,
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
              Courses & Channels
            </Text>
            <Text style={{ color: darkTheme.red, fontSize: 10, fontWeight: "600" }}>
              {filteredClasses.length} {filteredClasses.length === 1 ? "class" : "classes"}
            </Text>
          </View>

          <View style={{ gap: 0 }}>
            {primaryError ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                <DarkNotice title="Some class data could not load" subtitle={peekAppError(primaryError).message} />
              </View>
            ) : null}

            {classesQuery.isLoading && derivedClasses.length === 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <DarkNotice title="Loading classes" subtitle="Pulling your enrolled classes now." />
              </View>
            ) : filteredClasses.length === 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <DarkNotice
                  title="No classes found"
                  subtitle="Try another search term or switch the current filter."
                />
              </View>
            ) : (
              filteredClasses.map((classItem, index) => {
                const expanded = expandedClassId === classItem.id;
                const badgeCount =
                  classItem.progress >= 100 && classItem.completedLessons > 0
                    ? classItem.completedLessons
                    : null;

                return (
                  <AnimatedEntrance key={classItem.id} delay={index * 50}>
                    <View>
                      <Pressable
                        onPress={() =>
                          setExpandedClassId((current) => (current === classItem.id ? null : classItem.id))
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          marginHorizontal: 16,
                          marginBottom: 10,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: darkTheme.border,
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                          minHeight: 72,
                          backgroundColor: expanded ? darkTheme.surface : darkTheme.bg,
                          ...shadow.card,
                        }}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: classItem.avatarColor,
                          }}
                        >
                          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
                            {classItem.badgeText}
                          </Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            numberOfLines={1}
                            style={{ color: darkTheme.text, fontSize: 14, fontWeight: "500" }}
                          >
                            {classItem.subjectName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{ marginTop: 2, color: darkTheme.muted, fontSize: 11 }}
                          >
                            {buildSubtitle(classItem)}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View
                            style={{
                            width: 46,
                            height: 5,
                              borderRadius: 2,
                              overflow: "hidden",
                            backgroundColor: darkTheme.active,
                            }}
                          >
                            <View
                              style={{
                                width: `${Math.max(0, Math.min(100, classItem.progress))}%`,
                                height: "100%",
                                borderRadius: 2,
                                backgroundColor: darkTheme.green,
                              }}
                            />
                          </View>

                          {badgeCount ? (
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: darkTheme.purple,
                              }}
                            >
                              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>
                                {badgeCount}
                              </Text>
                            </View>
                          ) : null}

                          <MaterialCommunityIcons
                            name={expanded ? "chevron-down" : "chevron-right"}
                            size={14}
                            color={darkTheme.dim}
                          />
                          <MaterialCommunityIcons
                            name="dots-horizontal"
                            size={16}
                            color={darkTheme.muted}
                          />
                        </View>
                      </Pressable>

                      {expanded ? (
                        <View
                          style={{
                            marginHorizontal: 16,
                            marginTop: -10,
                            marginBottom: 10,
                            backgroundColor: darkTheme.channel,
                            borderWidth: 1,
                            borderTopWidth: 0,
                            borderColor: darkTheme.border,
                            borderBottomLeftRadius: 16,
                            borderBottomRightRadius: 16,
                            overflow: "hidden",
                          }}
                        >
                          {(["modules", "assignments", "announcements", "calendar"] as ChannelKey[]).map((channel, channelIndex, channels) => {
                            const config = channelConfig[channel];
                            const badge = buildChannelBadge(classItem, channel);

                            return (
                              <Pressable
                                key={channel}
                                onPress={() => navigateToChannel(navigation, classItem.id, channel)}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
                                  paddingTop: 10,
                                  paddingBottom: 10,
                                  paddingLeft: 58,
                                  paddingRight: 16,
                                  borderBottomWidth: channelIndex === channels.length - 1 ? 0 : 1,
                                  borderBottomColor: darkTheme.border,
                                }}
                              >
                                <MaterialCommunityIcons name={config.icon} size={16} color={darkTheme.text} style={{ opacity: 0.8 }} />
                                <Text
                                  style={{
                                    flex: 1,
                                    color: darkTheme.subtext,
                                    fontSize: 13,
                                  }}
                                >
                                  {config.label}
                                </Text>
                                <View
                                  style={{
                                    borderRadius: 4,
                                    backgroundColor: config.background,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text style={{ color: config.color, fontSize: 10, fontWeight: "500" }}>
                                    {badge}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
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
