import { mobileBrand } from "../theme/mobileBrand";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { queryKeys } from "../api/hooks";
import { mobileWorkspaceApi } from "../api/services/mobile-workspace";
import { peekAppError } from "../api/http";
import { StudentScreen } from "../components/student/StudentWorkspacePrimitives";
import type { RootStackParamList } from "../navigation/types";
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
import type { ClassItem } from "../types/class";
import type { Assessment } from "../types/assessment";
import type { Announcement } from "../types/announcement";
import type { SchoolEvent } from "../types/school-event";
import { useAuth } from "../providers/AuthProvider";
import { OfflineWorkspaceNotice } from "../components/offline/OfflineWorkspaceNotice";
import { MobileFilterSheet } from "../components/ui/MobileFilterSheet";

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

function getClassLabel(classId: string, classes: ClassItem[]) {
  const classItem = classes?.find((entry) => entry.id === classId);
  if (!classItem) return "Class";
  return `${classItem.subjectName} - ${classItem.section?.name || "Section"}`;
}

export function CalendarScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(
    route.params?.classId || "all",
  );
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date()),
  );

  const calendarRange = useMemo(() => {
    const cells = buildMonthCells(calendarMonth);
    const first = new Date(cells[0].date);
    first.setHours(0, 0, 0, 0);
    const last = new Date(cells[cells.length - 1].date);
    last.setHours(23, 59, 59, 999);
    return { from: first.toISOString(), to: last.toISOString() };
  }, [calendarMonth]);
  const workspaceQuery = useQuery({
    queryKey: [
      ...queryKeys.mobileCalendar(
        "student",
        calendarRange.from,
        calendarRange.to,
      ),
      user?.id,
    ],
    queryFn: () =>
      mobileWorkspaceApi.getCalendarForUser(user!.id, "student", calendarRange),
    enabled: !!user?.id,
  });
  const offlineState = workspaceQuery.data?.offlineState;
  const offline = !!offlineState;

  const classes = (workspaceQuery.data?.classes ?? []) as ClassItem[];
  const routeClass = classes.find(
    (entry) => entry.id === route.params?.classId,
  );
  const schoolEvents = (workspaceQuery.data?.schoolEvents ??
    []) as SchoolEvent[];
  const schoolYears = useMemo(
    () => buildSchoolYearList(classes, schoolEvents),
    [classes, schoolEvents],
  );
  const resolvedSchoolYear =
    selectedSchoolYear ||
    routeClass?.schoolYear ||
    classes[0]?.schoolYear ||
    schoolYears[0] ||
    "";

  useEffect(() => {
    if (selectedSchoolYear) return;
    setSelectedSchoolYear(
      routeClass?.schoolYear || classes[0]?.schoolYear || schoolYears[0] || "",
    );
  }, [classes, routeClass?.schoolYear, schoolYears, selectedSchoolYear]);

  useEffect(() => {
    if (selectedClassId === "all") return;
    const matchingClass = classes.find((entry) => entry.id === selectedClassId);
    if (
      !matchingClass ||
      (resolvedSchoolYear && matchingClass.schoolYear !== resolvedSchoolYear)
    ) {
      setSelectedClassId("all");
    }
  }, [classes, resolvedSchoolYear, selectedClassId]);

  const scopedClasses = useMemo(
    () =>
      classes.filter(
        (classItem) =>
          !resolvedSchoolYear || classItem.schoolYear === resolvedSchoolYear,
      ),
    [classes, resolvedSchoolYear],
  );
  const scopedClassIds = scopedClasses.map((entry) => entry.id);

  const assessmentsByClass = useMemo(
    () =>
      Object.fromEntries(
        scopedClassIds.map((classId) => [
          classId,
          (workspaceQuery.data?.assessments ?? []).filter(
            (assessment) => assessment.classId === classId,
          ) as Assessment[],
        ]),
      ),
    [scopedClassIds, workspaceQuery.data?.assessments],
  );
  const announcementsByClass = useMemo(
    () =>
      Object.fromEntries(
        scopedClassIds.map((classId) => [
          classId,
          (workspaceQuery.data?.announcements ?? []).filter(
            (announcement) => announcement.classId === classId,
          ) as Announcement[],
        ]),
      ),
    [scopedClassIds, workspaceQuery.data?.announcements],
  );

  const feedItems = useMemo(
    () =>
      normalizeCalendarFeed({
        classes,
        schoolEvents,
        assessmentsByClass,
        announcementsByClass,
        selectedSchoolYear: resolvedSchoolYear,
        selectedClassId,
        month: calendarMonth,
      }),
    [
      announcementsByClass,
      assessmentsByClass,
      calendarMonth,
      classes,
      resolvedSchoolYear,
      schoolEvents,
      selectedClassId,
    ],
  );
  const dayIndex = useMemo(() => buildCalendarDayIndex(feedItems), [feedItems]);
  const monthCells = useMemo(
    () => buildMonthCells(calendarMonth),
    [calendarMonth],
  );
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
    dayIndex[selectedDateKey]?.length || !fallbackDateKey
      ? selectedDateKey
      : fallbackDateKey;
  const selectedDayItems = dayIndex[activeDateKey] ?? [];

  useEffect(() => {
    if (feedItems.length === 0) return;
    if (selectedDayItems.length > 0) return;

    if (fallbackDateKey && fallbackDateKey !== selectedDateKey) {
      setSelectedDateKey(fallbackDateKey);
    }
  }, [
    fallbackDateKey,
    feedItems.length,
    selectedDateKey,
    selectedDayItems.length,
  ]);
  const unavailableSection = Object.entries(
    workspaceQuery.data?.sections ?? {},
  ).find(([, status]) => status === "unavailable")?.[0];
  const primaryError =
    workspaceQuery.error ||
    (unavailableSection
      ? new Error(`${unavailableSection} are temporarily unavailable.`)
      : null);
  const refreshing = workspaceQuery.isRefetching;
  const handleRefresh = () => workspaceQuery.refetch();

  const openFeedItem = (item: CalendarFeedItem) => {
    if (offline) return;
    if (item.kind === "assessment" && item.classId) {
      const assessmentId = item.id.replace(/^assessment-/, "");
      navigation.navigate("AssessmentDetail", {
        assessmentId,
        classId: item.classId,
        source: "calendar",
      });
      return;
    }

    if (item.kind === "announcement" && item.classId) {
      navigation.navigate("ClassDetail", {
        classId: item.classId,
        initialTab: "announcements",
        source: "calendar",
      });
      return;
    }

    if (item.kind === "class_schedule" && item.classId) {
      navigation.navigate("ClassDetail", {
        classId: item.classId,
        initialTab: "calendar",
        source: "calendar",
      });
    }
  };

  return (
    <StudentScreen
      title="Calendar"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={refreshing}
      onRefresh={() => void handleRefresh()}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 14 }}>
        {offlineState ? (
          <OfflineWorkspaceNotice lastSyncedAt={offlineState.lastSyncedAt} />
        ) : null}
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
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
            >
              Calendar data is partially unavailable
            </Text>
            <Text
              style={{
                marginTop: 5,
                fontSize: 12,
                lineHeight: 18,
                color: theme.muted,
              }}
            >
              {peekAppError(primaryError).message}
            </Text>
          </View>
        ) : null}

        {schoolYears.length > 1 ? (
          <MobileFilterSheet
            label="School year"
            activeKey={resolvedSchoolYear}
            options={schoolYears.map((schoolYear) => ({ key: schoolYear, label: schoolYear }))}
            onSelect={setSelectedSchoolYear}
            icon="calendar-range"
          />
        ) : null}

        <MobileFilterSheet
          label="Class filter"
          activeKey={selectedClassId}
          options={[
            { key: "all", label: "All classes" },
            ...scopedClasses.map((classItem) => ({ key: classItem.id, label: classItem.subjectCode || classItem.subjectName })),
          ]}
          onSelect={setSelectedClassId}
          icon="book-open-variant"
        />

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
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: theme.text }}
            >
              {formatMonthLabel(calendarMonth)}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() =>
                  setCalendarMonth((current) => shiftMonth(current, -1))
                }
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.active,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={16}
                  color={theme.text}
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  setCalendarMonth((current) => shiftMonth(current, 1))
                }
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.active,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color={theme.text}
                />
              </Pressable>
            </View>
          </View>

          <View
            style={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 }}
          >
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
                        width: 44,
                        minHeight: 44,
                        borderRadius: isToday || isSelected ? 14 : 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected
                          ? theme.blueSoft
                          : isToday
                            ? theme.red
                            : "transparent",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected
                          ? theme.blueLine
                          : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          color: isToday
                            ? mobileBrand.white
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
                        <View
                          style={{ flexDirection: "row", gap: 2, marginTop: 3 }}
                        >
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "700", color: theme.text }}
            >
              {formatDateLabel(activeDateKey)}
            </Text>
            <Tone
              label={`${selectedDayItems.length} item${selectedDayItems.length === 1 ? "" : "s"}`}
            />
          </View>

          {selectedDayItems.length === 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: theme.text }}
              >
                Nothing scheduled
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  lineHeight: 18,
                  color: theme.muted,
                }}
              >
                Choose another day or switch the class filter to see more
                activity.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 10, gap: 8 }}>
              {selectedDayItems.map((item) => {
                const actionable =
                  item.kind === "assessment" ||
                  item.kind === "announcement" ||
                  item.kind === "class_schedule";
                return (
                  <Pressable
                    key={item.id}
                    accessibilityState={{ disabled: !actionable || offline }}
                    disabled={!actionable || offline}
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: MARKER_COLORS[item.kind],
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: theme.text,
                            }}
                          >
                            {item.title}
                          </Text>
                          <View
                            style={{
                              borderRadius: 4,
                              backgroundColor: theme.surface,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.muted,
                              }}
                            >
                              {CALENDAR_KIND_LABEL[item.kind]}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: theme.muted,
                          }}
                        >
                          {formatTimeWindow(item)}
                          {item.classId
                            ? ` - ${getClassLabel(item.classId, classes)}`
                            : ""}
                        </Text>
                        <Text
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            lineHeight: 18,
                            color: theme.subtext,
                          }}
                        >
                          {getSupportingCopy(item)}
                        </Text>
                      </View>
                      {actionable ? (
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={16}
                          color={theme.dim}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </StudentScreen>
  );
}

function Tone({ label }: { label: string }) {
  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: theme.blueSoft,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.blue }}>
        {label}
      </Text>
    </View>
  );
}
