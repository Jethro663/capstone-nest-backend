import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";
import { queryKeys, useSchoolEvents, useStudentClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import { peekAppError } from "../api/http";
import { Refreshable, ScreenScroll } from "../components/ui/primitives";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { studentDarkTheme as theme, stripRichText } from "../theme/studentDark";
import {
  buildCalendarDayIndex,
  buildMonthCells,
  buildSchoolYearList,
  CALENDAR_KIND_LABEL,
  formatMonthLabel,
  getMarkerKindsForDay,
  normalizeCalendarFeed,
  shiftMonth,
  toDateKey,
  type CalendarFeedItem,
  type CalendarFeedKind,
} from "../utils/calendarFeed";

type Props = NativeStackScreenProps<RootStackParamList, "Calendar">;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MARKER_COLORS: Record<CalendarFeedKind, string> = {
  assessment: theme.red,
  announcement: theme.amber,
  school_event: theme.blue,
  holiday_break: theme.green,
  class_schedule: theme.purple,
};

function formatDateLabel(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Selected day";
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeWindow(item: CalendarFeedItem) {
  if (item.allDay) return "All day";
  const startsAt = new Date(item.startsAt);
  const endsAt = new Date(item.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "Time unavailable";
  }
  return `${startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} - ${endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getSupportingCopy(item: CalendarFeedItem) {
  const text = stripRichText(item.description);
  if (text) return text;
  if (item.kind === "assessment") return "Assessment deadline";
  if (item.kind === "announcement") return "Class update";
  if (item.kind === "holiday_break") return "School holiday or break";
  if (item.kind === "class_schedule") return "Scheduled class meeting";
  return "School event";
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "rgba(232,41,78,0.55)" : theme.border,
        backgroundColor: active ? theme.redSoft : theme.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: active ? theme.red : theme.text }}>{label}</Text>
    </Pressable>
  );
}

function getClassLabel(classId: string, classes: ReturnType<typeof useStudentClasses>["data"]) {
  const classItem = classes?.find((entry) => entry.id === classId);
  if (!classItem) return "Class";
  return `${classItem.subjectName} - ${classItem.section?.name || "Section"}`;
}

export function CalendarScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const studentId = user?.userId || user?.id;
  const classesQuery = useStudentClasses(studentId);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(route.params?.classId || "all");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const classes = classesQuery.data ?? [];
  const routeClass = classes.find((entry) => entry.id === route.params?.classId);
  const tentativeSchoolYear = selectedSchoolYear || routeClass?.schoolYear || classes[0]?.schoolYear || "";
  const schoolEventsQuery = useSchoolEvents(tentativeSchoolYear ? { schoolYear: tentativeSchoolYear } : undefined);
  const schoolYears = useMemo(
    () => buildSchoolYearList(classes, schoolEventsQuery.data ?? []),
    [classes, schoolEventsQuery.data],
  );
  const resolvedSchoolYear =
    selectedSchoolYear || routeClass?.schoolYear || classes[0]?.schoolYear || schoolYears[0] || "";

  useEffect(() => {
    if (selectedSchoolYear) return;
    setSelectedSchoolYear(routeClass?.schoolYear || classes[0]?.schoolYear || schoolYears[0] || "");
  }, [classes, routeClass?.schoolYear, schoolYears, selectedSchoolYear]);

  useEffect(() => {
    if (selectedClassId === "all") return;
    const matchingClass = classes.find((entry) => entry.id === selectedClassId);
    if (!matchingClass || (resolvedSchoolYear && matchingClass.schoolYear !== resolvedSchoolYear)) {
      setSelectedClassId("all");
    }
  }, [classes, resolvedSchoolYear, selectedClassId]);

  const scopedClasses = useMemo(
    () => classes.filter((classItem) => !resolvedSchoolYear || classItem.schoolYear === resolvedSchoolYear),
    [classes, resolvedSchoolYear],
  );
  const scopedClassIds = scopedClasses.map((entry) => entry.id);

  const assessmentQueries = useQueries({
    queries: scopedClassIds.map((classId) => ({
      queryKey: queryKeys.assessments(classId),
      queryFn: () => assessmentsApi.getByClass(classId),
      enabled: scopedClassIds.length > 0,
    })),
  });

  const announcementQueries = useQueries({
    queries: scopedClassIds.map((classId) => ({
      queryKey: queryKeys.announcements(classId),
      queryFn: () => announcementsApi.getByClass(classId),
      enabled: scopedClassIds.length > 0,
    })),
  });

  const assessmentsByClass = useMemo(
    () =>
      Object.fromEntries(scopedClassIds.map((classId, index) => [classId, assessmentQueries[index]?.data ?? []])),
    [assessmentQueries, scopedClassIds],
  );
  const announcementsByClass = useMemo(
    () =>
      Object.fromEntries(scopedClassIds.map((classId, index) => [classId, announcementQueries[index]?.data ?? []])),
    [announcementQueries, scopedClassIds],
  );

  const feedItems = useMemo(
    () =>
      normalizeCalendarFeed({
        classes,
        schoolEvents: schoolEventsQuery.data ?? [],
        assessmentsByClass,
        announcementsByClass,
        selectedSchoolYear: resolvedSchoolYear,
        selectedClassId,
        month: calendarMonth,
      }),
    [announcementsByClass, assessmentsByClass, calendarMonth, classes, resolvedSchoolYear, schoolEventsQuery.data, selectedClassId],
  );
  const dayIndex = useMemo(() => buildCalendarDayIndex(feedItems), [feedItems]);
  const monthCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth]);
  const fallbackDateKey = useMemo(() => {
    if (feedItems.length === 0) return null;

    const firstMonthItem =
      feedItems.find((item) => {
        const itemDate = new Date(item.startsAt);
        return (
          itemDate.getFullYear() === calendarMonth.getFullYear() &&
          itemDate.getMonth() === calendarMonth.getMonth()
        );
      }) ?? feedItems[0];

    return toDateKey(firstMonthItem.startsAt);
  }, [calendarMonth, feedItems]);
  const activeDateKey =
    dayIndex[selectedDateKey]?.length || !fallbackDateKey ? selectedDateKey : fallbackDateKey;
  const selectedDayItems = dayIndex[activeDateKey] ?? [];

  useEffect(() => {
    if (feedItems.length === 0) return;
    if (selectedDayItems.length > 0) return;

    if (fallbackDateKey && fallbackDateKey !== selectedDateKey) {
      setSelectedDateKey(fallbackDateKey);
    }
  }, [fallbackDateKey, feedItems.length, selectedDateKey, selectedDayItems.length]);
  const refreshing =
    classesQuery.isRefetching ||
    schoolEventsQuery.isRefetching ||
    assessmentQueries.some((query) => query.isRefetching) ||
    announcementQueries.some((query) => query.isRefetching);
  const primaryError =
    classesQuery.error ||
    schoolEventsQuery.error ||
    assessmentQueries.find((query) => query.error)?.error ||
    announcementQueries.find((query) => query.error)?.error;

  const handleRefresh = () =>
    Promise.all([
      classesQuery.refetch(),
      schoolEventsQuery.refetch(),
      ...assessmentQueries.map((query) => query.refetch()),
      ...announcementQueries.map((query) => query.refetch()),
    ]);

  const openFeedItem = (item: CalendarFeedItem) => {
    if (item.kind === "assessment" && item.classId) {
      const assessmentId = item.id.replace(/^assessment-/, "");
      navigation.navigate("AssessmentDetail", { assessmentId, classId: item.classId });
      return;
    }

    if (item.kind === "announcement" && item.classId) {
      navigation.navigate("ClassDetail", { classId: item.classId, initialTab: "announcements" });
      return;
    }

    if (item.kind === "class_schedule" && item.classId) {
      navigation.navigate("ClassDetail", { classId: item.classId, initialTab: "calendar" });
    }
  };

  return (
    <ScreenScroll
      backgroundColor={theme.bg}
      refreshControl={<Refreshable refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
    >
      <View style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.red,
              }}
            >
              <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", color: theme.muted }}>
                Student Planner
              </Text>
              <Text style={{ marginTop: 4, fontSize: 24, fontWeight: "800", color: theme.text }}>Calendar</Text>
            </View>
            <Pressable
              onPress={() => navigation.goBack()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.active,
              }}
            >
              <MaterialCommunityIcons name="chevron-left" size={18} color={theme.text} />
            </Pressable>
          </View>
          <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 18, color: "#999999" }}>
            Review class schedules, assessment deadlines, announcements, and school-wide events in one timeline.
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 14 }}>
        {primaryError ? (
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>Calendar data is partially unavailable</Text>
            <Text style={{ marginTop: 5, fontSize: 12, lineHeight: 18, color: "#999999" }}>{peekAppError(primaryError).message}</Text>
          </View>
        ) : null}

        {schoolYears.length > 1 ? (
          <View>
            <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
              School year
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
              {schoolYears.map((schoolYear) => (
                <FilterChip
                  key={schoolYear}
                  label={schoolYear}
                  active={selectedSchoolYear === schoolYear}
                  onPress={() => setSelectedSchoolYear(schoolYear)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.7, textTransform: "uppercase", color: theme.muted }}>
            Class filter
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
            <FilterChip label="All classes" active={selectedClassId === "all"} onPress={() => setSelectedClassId("all")} />
            {scopedClasses.map((classItem) => (
              <FilterChip
                key={classItem.id}
                label={classItem.subjectCode || classItem.subjectName}
                active={selectedClassId === classItem.id}
                onPress={() => setSelectedClassId(classItem.id)}
              />
            ))}
          </ScrollView>
        </View>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>{formatMonthLabel(calendarMonth)}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.active,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={16} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.active,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 }}>
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              {WEEKDAY_LABELS.map((label) => (
                <Text
                  key={label}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: theme.dim,
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {label}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {monthCells.map((cell) => {
                const dayItems = dayIndex[cell.dateKey] ?? [];
                const markerKinds = getMarkerKindsForDay(dayItems);
                const isSelected = activeDateKey === cell.dateKey;
                const isToday = cell.dateKey === toDateKey(new Date());

                return (
                  <Pressable
                    key={cell.dateKey}
                    onPress={() => setSelectedDateKey(cell.dateKey)}
                    style={{
                      width: "14.2857%",
                      paddingVertical: 4,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        minHeight: 40,
                        borderRadius: isToday || isSelected ? 14 : 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? theme.blueSoft : isToday ? theme.red : "transparent",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected ? "rgba(74,140,247,0.45)" : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: isToday
                            ? "#FFFFFF"
                            : cell.inMonth
                              ? theme.text
                              : theme.dim,
                          fontSize: 11,
                          fontWeight: isSelected || isToday ? "800" : "600",
                        }}
                      >
                        {cell.date.getDate()}
                      </Text>
                      {markerKinds.length > 0 ? (
                        <View style={{ flexDirection: "row", gap: 2, marginTop: 3 }}>
                          {markerKinds.slice(0, 3).map((kind) => (
                            <View
                              key={`${cell.dateKey}-${kind}`}
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: 999,
                                backgroundColor: MARKER_COLORS[kind],
                              }}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{formatDateLabel(activeDateKey)}</Text>
            <Tone
              label={`${selectedDayItems.length} item${selectedDayItems.length === 1 ? "" : "s"}`}
            />
          </View>

          {selectedDayItems.length === 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>Nothing scheduled</Text>
              <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: "#999999" }}>
                Choose another day or switch the class filter to see more activity.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 10, gap: 8 }}>
              {selectedDayItems.map((item) => {
                const actionable = item.kind === "assessment" || item.kind === "announcement" || item.kind === "class_schedule";
                return (
                  <Pressable
                    key={item.id}
                    disabled={!actionable}
                    onPress={() => openFeedItem(item)}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.active,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      opacity: actionable ? 1 : 0.9,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: MARKER_COLORS[item.kind],
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text }}>{item.title}</Text>
                          <View
                            style={{
                              borderRadius: 4,
                              backgroundColor: theme.surface,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.muted }}>
                              {CALENDAR_KIND_LABEL[item.kind]}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
                          {formatTimeWindow(item)}{item.classId ? ` - ${getClassLabel(item.classId, classes)}` : ""}
                        </Text>
                        <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 18, color: "#BDBDBD" }}>
                          {getSupportingCopy(item)}
                        </Text>
                      </View>
                      {actionable ? <MaterialCommunityIcons name="chevron-right" size={16} color={theme.dim} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScreenScroll>
  );
}

function Tone({ label }: { label: string }) {
  return (
    <View style={{ borderRadius: 999, backgroundColor: theme.blueSoft, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.blue }}>{label}</Text>
    </View>
  );
}
