import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { queryKeys, useSchoolEvents, useTeacherClasses } from "../api/hooks";
import { announcementsApi } from "../api/services/announcements";
import { assessmentsApi } from "../api/services/assessments";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherCalendar">;
type FeedItemKind = "assessment" | "announcement" | "school_event" | "class_schedule";
type FeedItem = {
  id: string;
  dateKey: string;
  title: string;
  subtitle: string;
  kind: FeedItemKind;
  action?: () => void;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayMap: Record<string, number> = {
  SU: 0,
  SUN: 0,
  M: 1,
  MON: 1,
  T: 2,
  TU: 2,
  TUE: 2,
  W: 3,
  WED: 3,
  TH: 4,
  THU: 4,
  F: 5,
  FRI: 5,
  SA: 6,
  SAT: 6,
};

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatShortDate(value?: string | null) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildMonthCells(value: Date) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: toDateKey(date),
      label: date.getDate(),
      inMonth: date.getMonth() === value.getMonth(),
      date,
    };
  });
}

function getScheduleDates(month: Date, days: string[]) {
  const targetMonth = month.getMonth();
  const cursor = new Date(month.getFullYear(), month.getMonth(), 1);
  const dates: string[] = [];
  while (cursor.getMonth() === targetMonth) {
    const dayIndex = cursor.getDay();
    const matches = days.some((entry) => dayMap[entry.trim().toUpperCase()] === dayIndex);
    if (matches) {
      dates.push(toDateKey(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function TeacherCalendarScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedClassId, setSelectedClassId] = useState<string>(route.params?.classId || "all");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()));
  const schoolEventsQuery = useSchoolEvents();

  const classIds = (classesQuery.data ?? [])
    .filter((entry) => selectedClassId === "all" || entry.id === selectedClassId)
    .map((entry) => entry.id);

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

  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    (classesQuery.data ?? [])
      .filter((entry) => selectedClassId === "all" || entry.id === selectedClassId)
      .forEach((classItem) => {
        (classItem.schedules ?? []).forEach((slot) => {
          getScheduleDates(month, slot.days).forEach((dateKey) => {
            items.push({
              id: `schedule-${classItem.id}-${slot.id}-${dateKey}`,
              dateKey,
              title: `${classItem.subjectCode} class`,
              subtitle: `${slot.startTime} - ${slot.endTime}${classItem.room ? ` | ${classItem.room}` : ""}`,
              kind: "class_schedule",
              action: () => navigation.navigate("TeacherClassDetail", { classId: classItem.id, initialTab: "calendar" }),
            });
          });
        });
      });

    assessmentQueries.forEach((query, index) => {
      const classItem = classesQuery.data?.find((entry) => entry.id === classIds[index]);
      if (!classItem || !query.data) return;
      query.data.forEach((assessment) => {
        if (!assessment.dueDate) return;
        const date = new Date(assessment.dueDate);
        items.push({
          id: `assessment-${assessment.id}`,
          dateKey: toDateKey(date),
          title: assessment.title,
          subtitle: `${classItem.subjectCode} | Assessment`,
          kind: "assessment",
          action: () =>
            navigation.navigate("TeacherAssessmentDetail", { assessmentId: assessment.id, classId: classItem.id }),
        });
      });
    });

    announcementQueries.forEach((query, index) => {
      const classItem = classesQuery.data?.find((entry) => entry.id === classIds[index]);
      if (!classItem || !query.data) return;
      query.data.forEach((announcement) => {
        const createdAt = announcement.scheduledAt || announcement.createdAt;
        if (!createdAt) return;
        items.push({
          id: `announcement-${announcement.id}`,
          dateKey: toDateKey(new Date(createdAt)),
          title: announcement.title,
          subtitle: `${classItem.subjectCode} | Announcement`,
          kind: "announcement",
          action: () => navigation.getParent()?.navigate("Announcements" as never),
        });
      });
    });

    (schoolEventsQuery.data ?? []).forEach((entry) => {
      items.push({
        id: `school-event-${entry.id}`,
        dateKey: toDateKey(new Date(entry.startsAt)),
        title: entry.title,
        subtitle: entry.eventType === "holiday_break" ? "Holiday break" : "School event",
        kind: "school_event",
      });
    });

    return items;
  }, [announcementQueries, assessmentQueries, classIds, classesQuery.data, month, navigation, schoolEventsQuery.data, selectedClassId]);

  const feedByDate = useMemo(
    () =>
      feedItems.reduce<Record<string, FeedItem[]>>((accumulator, item) => {
        accumulator[item.dateKey] = [...(accumulator[item.dateKey] ?? []), item];
        return accumulator;
      }, {}),
    [feedItems],
  );

  const monthCells = useMemo(() => buildMonthCells(month), [month]);
  const selectedItems = feedByDate[selectedDateKey] ?? [];

  return (
    <TeacherScreen
      title="Calendar"
      subtitle="Unified feed from class schedules, assessments, announcements, and school events."
      icon="calendar-month-outline"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={classesQuery.isRefetching || schoolEventsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          schoolEventsQuery.refetch(),
          ...assessmentQueries.map((query) => query.refetch()),
          ...announcementQueries.map((query) => query.refetch()),
        ]);
      }}
    >
      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        <TeacherChip label="All classes" active={selectedClassId === "all"} onPress={() => setSelectedClassId("all")} />
        {(classesQuery.data ?? []).slice(0, 5).map((entry) => (
          <TeacherChip key={entry.id} label={entry.subjectCode} active={selectedClassId === entry.id} onPress={() => setSelectedClassId(entry.id)} />
        ))}
      </View>

      <TeacherPanel
        title={formatDateLabel(month)}
        subtitle="Select a day to inspect the mixed feed."
        action={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
              <Text style={{ color: theme.red, fontSize: 16 }}>{"<"}</Text>
            </Pressable>
            <Pressable onPress={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
              <Text style={{ color: theme.red, fontSize: 16 }}>{">"}</Text>
            </Pressable>
          </View>
        }
      >
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            {weekdayLabels.map((label) => (
              <Text key={label} style={{ width: `${100 / 7}%`, textAlign: "center", fontSize: 10, color: theme.muted }}>
                {label}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {monthCells.map((cell) => {
              const hasItems = Boolean(feedByDate[cell.key]?.length);
              const active = selectedDateKey === cell.key;
              return (
                <Pressable
                  key={cell.key}
                  onPress={() => setSelectedDateKey(cell.key)}
                  style={{
                    width: `${100 / 7}%`,
                    aspectRatio: 1,
                    padding: 4,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: active ? "rgba(232,41,78,0.4)" : theme.border,
                      backgroundColor: active ? theme.redSoft : theme.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: cell.inMonth ? theme.text : theme.dim, fontSize: 12, fontWeight: active ? "800" : "600" }}>
                      {cell.label}
                    </Text>
                    {hasItems ? <View style={{ marginTop: 4, width: 6, height: 6, borderRadius: 999, backgroundColor: theme.red }} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </TeacherPanel>

      <TeacherPanel title={`Selected day | ${formatShortDate(selectedDateKey)}`} subtitle="Tap a feed item to open the linked mobile route when it exists.">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <TeacherRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              onPress={item.action}
              right={
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor:
                      item.kind === "assessment"
                        ? theme.blueSoft
                        : item.kind === "announcement"
                          ? theme.amberSoft
                          : item.kind === "school_event"
                            ? theme.purpleSoft
                            : theme.greenSoft,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color:
                        item.kind === "assessment"
                          ? theme.blue
                          : item.kind === "announcement"
                            ? theme.amber
                            : item.kind === "school_event"
                              ? theme.purple
                              : theme.green,
                    }}
                  >
                    {item.kind.replace(/_/g, " ")}
                  </Text>
                </View>
              }
            />
          ))
        ) : (
          <TeacherEmpty title="No scheduled items" subtitle="This day does not currently have linked classes, assessments, announcements, or school events." icon="calendar-remove-outline" />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}

