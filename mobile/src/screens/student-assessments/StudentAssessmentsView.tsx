import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  StudentFlatSection,
  StudentInlineNotice,
  StudentListRow,
  StudentScreen,
  StudentSegmentedControl,
} from "../../components/student/StudentWorkspacePrimitives";
import { studentDarkTheme as theme } from "../../theme/studentDark";

export type StudentAssessmentFilter = "pending" | "past_due" | "completed" | "allAssessments";
export type StudentAssessmentRow = {
  id: string;
  classId: string;
  title: string;
  subjectName: string;
  subjectCode: string;
  typeLabel: string;
  status: "pending" | "completed" | "past_due";
  statusLabel: string;
  dueLabel: string;
  totalPoints: number;
};

export function StudentAssessmentsView({
  navigation,
  assessments,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchQueryChange,
  refreshing,
  onRefresh,
  loading,
  errorMessage,
  emptySubtitle,
}: {
  navigation: { navigate(...args: any[]): void };
  assessments: StudentAssessmentRow[];
  activeFilter: StudentAssessmentFilter;
  onFilterChange: (filter: StudentAssessmentFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  loading: boolean;
  errorMessage?: string;
  emptySubtitle: string;
}) {
  return (
    <StudentScreen
      title="Assessments"
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable accessibilityRole="button" accessibilityLabel="Open assessment history" onPress={() => navigation.navigate("AssessmentHistory")} style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="history" size={20} color={theme.redText} />
        </Pressable>
      }
    >
      <StudentSegmentedControl
        accessibilityLabel="Assessment status"
        activeKey={activeFilter}
        items={[
          { key: "pending", label: "Pending" },
          { key: "past_due", label: "Past Due" },
          { key: "completed", label: "Completed" },
          { key: "allAssessments", label: "All Assessments" },
        ]}
        onSelect={onFilterChange}
      />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, paddingHorizontal: 12 }}>
          <MaterialCommunityIcons name="magnify" size={19} color={theme.muted} />
          <TextInput accessibilityLabel="Search assessments" value={searchQuery} onChangeText={onSearchQueryChange} placeholder="Search title, class, or type" placeholderTextColor={theme.muted} style={{ flex: 1, color: theme.text, fontSize: 13, paddingVertical: 0 }} />
        </View>
      </View>
      {errorMessage ? <StudentInlineNotice title="Some assessment data could not load" description={errorMessage} tone="amber" /> : null}
      <StudentFlatSection title="Assessment work" subtitle={`${assessments.length} ${assessments.length === 1 ? "assessment" : "assessments"}`}>
        {loading && assessments.length === 0 ? (
          <StudentListRow title="Loading assessments" subtitle="Pulling your published work now." icon="sync" tone="blue" />
        ) : assessments.length === 0 ? (
          <StudentListRow title="No assessments found" subtitle={emptySubtitle} icon="clipboard-check-outline" />
        ) : assessments.map((assessment) => (
          <StudentListRow
            key={assessment.id}
            title={assessment.title}
            subtitle={`${assessment.subjectName} · ${assessment.typeLabel} · Due ${assessment.dueLabel} · ${assessment.totalPoints} pts`}
            icon="clipboard-text-outline"
            status={assessment.statusLabel}
            tone={assessment.status === "completed" ? "green" : assessment.status === "past_due" ? "amber" : "red"}
            onPress={() => navigation.navigate("AssessmentDetail", { assessmentId: assessment.id, classId: assessment.classId, source: "assessments" })}
          />
        ))}
      </StudentFlatSection>
      <View style={{ height: 24 }} />
    </StudentScreen>
  );
}
