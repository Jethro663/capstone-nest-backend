import { useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { useTeacherClasses } from "../api/hooks";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import {
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherScreen,
  TeacherSearch,
  TeacherStats,
  teacherTheme as theme,
} from "../components/teacher/TeacherMobilePrimitives";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Classes">,
  NativeStackScreenProps<RootStackParamList>
>;

type VisibilityFilter = "active" | "inactive" | "all";

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

      <TeacherPanel title="Teaching load" subtitle="Tap any class to open the reduced mobile management shell.">
        {filteredClasses.length ? (
          filteredClasses.map((classItem) => (
            <TeacherRow
              key={classItem.id}
              title={`${classItem.subjectCode} · ${classItem.subjectName}`}
              subtitle={`${classItem.section?.name || "Section pending"} · ${classItem.room || "Room TBA"} · ${classItem.schoolYear}`}
              onPress={() => navigation.navigate("TeacherClassDetail", { classId: classItem.id })}
              right={
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: classItem.isActive ? theme.green : theme.amber }}>
                    {classItem.isActive ? "Active" : "Inactive"}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.muted }}>
                    {classItem.enrollmentCount ?? classItem.enrollments?.length ?? 0} learners
                  </Text>
                </View>
              }
            />
          ))
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
