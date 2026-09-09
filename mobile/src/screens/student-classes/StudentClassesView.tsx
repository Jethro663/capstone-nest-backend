import { TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { studentDarkTheme as theme } from "../../theme/studentDark";
import {
  StudentFlatSection,
  StudentInlineNotice,
  StudentListRow,
  StudentScreen,
  StudentSegmentedControl,
} from "../../components/student/StudentWorkspacePrimitives";

export type StudentClassFilter = "inProgress" | "completed";

export type StudentClassRow = {
  id: string;
  subjectName: string;
  subjectCode: string;
  sectionName: string;
  teacherName: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
};

export function StudentClassesView({
  navigation,
  classes,
  searchQuery,
  onSearchQueryChange,
  activeFilter,
  onFilterChange,
  refreshing,
  onRefresh,
  loading,
  errorMessage,
}: {
  navigation: { navigate(...args: any[]): void };
  classes: StudentClassRow[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  activeFilter: StudentClassFilter;
  onFilterChange: (value: StudentClassFilter) => void;
  refreshing: boolean;
  onRefresh: () => void;
  loading: boolean;
  errorMessage?: string;
}) {
  return (
    <StudentScreen title="My Classes" refreshing={refreshing} onRefresh={onRefresh}>
      <StudentSegmentedControl
        accessibilityLabel="Class status"
        activeKey={activeFilter}
        items={[
          { key: "inProgress", label: "Current" },
          { key: "completed", label: "Completed" },
        ]}
        onSelect={onFilterChange}
      />

      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="magnify" size={19} color={theme.muted} />
          <TextInput
            accessibilityLabel="Search classes"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Search subject, section, or teacher"
            placeholderTextColor={theme.muted}
            style={{ flex: 1, color: theme.text, fontSize: 13, paddingVertical: 0 }}
          />
        </View>
      </View>

      {errorMessage ? (
        <StudentInlineNotice title="Some class data could not load" description={errorMessage} tone="amber" />
      ) : null}

      <StudentFlatSection
        title={activeFilter === "completed" ? "Completed classes" : "Current classes"}
        subtitle={`${classes.length} ${classes.length === 1 ? "class" : "classes"}`}
      >
        {loading && classes.length === 0 ? (
          <StudentListRow title="Loading classes" subtitle="Pulling your enrolled classes now." icon="sync" tone="blue" />
        ) : classes.length === 0 ? (
          <StudentListRow title="No classes found" subtitle="Try another search term or switch the class status." icon="book-search-outline" />
        ) : classes.map((classItem) => (
          <StudentListRow
            key={classItem.id}
            title={classItem.subjectName}
            subtitle={`${classItem.subjectCode} · ${classItem.sectionName} · ${classItem.teacherName}\n${classItem.totalLessons} ${classItem.totalLessons === 1 ? "lesson" : "lessons"} · ${classItem.completedLessons} completed`}
            icon="google-classroom"
            status={`${classItem.progress}%`}
            tone={classItem.progress >= 100 ? "green" : "red"}
            onPress={() => navigation.navigate("ClassDetail", {
              classId: classItem.id,
              source: "classes",
            })}
          />
        ))}
      </StudentFlatSection>
      <View style={{ height: 24 }} />
    </StudentScreen>
  );
}
