import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { useTeacherClasses } from "../api/hooks";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";
import type { ClassItem } from "../types/class";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Classes">,
  NativeStackScreenProps<RootStackParamList>
>;

type VisibilityFilter = "active" | "inactive" | "all";

function formatTime(value?: string) {
  if (!value) return "";
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText.padStart(2, "0")} ${period}`;
}

function formatSchedule(classItem: ClassItem) {
  const schedule = classItem.schedules?.[0];
  if (!schedule) return classItem.room ? `Room ${classItem.room}` : "Schedule TBA";
  return `${schedule.days.join("/")} · ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)}${classItem.room ? ` · ${classItem.room}` : ""}`;
}

export function TeacherClassesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<VisibilityFilter>("active");
  const classesQuery = useTeacherClasses(teacherId, filter);

  const filteredClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return classesQuery.data ?? [];
    return (classesQuery.data ?? []).filter((entry) =>
      `${entry.subjectCode} ${entry.subjectName} ${entry.section?.name || ""} ${entry.schoolYear}`.toLowerCase().includes(normalizedSearch),
    );
  }, [classesQuery.data, search]);

  const totalStudents = filteredClasses.reduce(
    (sum, entry) => sum + (entry.enrollmentCount ?? entry.enrollments?.length ?? 0),
    0,
  );

  return (
    <TeacherScreen
      title="Classes"
      subtitle="Browse your assigned classes, open the mobile class workspace, and jump into modules, assessments, announcements, and roster."
      icon="book-open-variant-outline"
      refreshing={classesQuery.isRefetching}
      onRefresh={() => {
        void classesQuery.refetch();
      }}
    >
      <TeacherStats
        items={[
          { label: "Classes", value: filteredClasses.length, tone: "red" },
          { label: "Students", value: totalStudents, tone: "blue" },
          { label: "School Year", value: filteredClasses[0]?.schoolYear || "--", tone: "purple" },
        ]}
      />

      <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search by subject, section, or school year" />

      <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", gap: 6 }}>
        {(["active", "inactive", "all"] as const).map((entry) => (
          <TeacherChip key={entry} label={entry[0].toUpperCase() + entry.slice(1)} active={filter === entry} onPress={() => setFilter(entry)} />
        ))}
      </View>

      <TeacherPanel title="Teaching load" subtitle="Your class load is shown as stacked cards for easier mobile scanning.">
        {filteredClasses.length ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
            {filteredClasses.map((classItem) => (
              <Pressable
                key={classItem.id}
                onPress={() => navigation.navigate("TeacherClassDetail", { classId: classItem.id })}
                style={{
                  minHeight: 144,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface2,
                  padding: 14,
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: theme.blue }}>{classItem.subjectCode}</Text>
                    <View style={{ borderRadius: 999, backgroundColor: classItem.isActive ? theme.greenSoft : theme.amberSoft, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: classItem.isActive ? theme.green : theme.amber }}>
                        {classItem.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={{ marginTop: 10, fontSize: 17, lineHeight: 22, fontWeight: "900", color: theme.text }}>
                    {classItem.subjectName}
                  </Text>
                  <Text numberOfLines={1} style={{ marginTop: 5, fontSize: 12, color: theme.subtext }}>
                    {classItem.section?.name || "Section pending"} · {formatSchedule(classItem)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
                  <View>
                    <Text style={{ fontSize: 22, fontWeight: "900", color: theme.red }}>
                      {classItem.enrollmentCount ?? classItem.enrollments?.length ?? 0}
                    </Text>
                    <Text style={{ fontSize: 10, color: theme.muted }}>learners</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.blue }}>Open →</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <TeacherEmpty
            title="No classes found"
            subtitle={search.trim() ? "Try another search term or status filter." : "Assigned teacher classes will appear here."}
            icon="book-remove-outline"
          />
        )}
      </TeacherPanel>
    </TeacherScreen>
  );
}
