import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { studentDarkTheme as theme } from "../../theme/studentDark";
import {
  StudentInlineNotice,
  StudentListRow,
  StudentScreen,
} from "../../components/student/StudentWorkspacePrimitives";
import {
  StudentClassCard,
  type StudentClassRow,
} from "./StudentClassCard";

export type StudentClassFilter = "inProgress" | "completed";
export type { StudentClassRow } from "./StudentClassCard";

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
  const heading = activeFilter === "completed" ? "Completed classes" : "Current classes";

  return (
    <StudentScreen
      title="My Classes"
      refreshing={refreshing}
      onRefresh={onRefresh}
      showRefreshAction={false}
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>My learning spaces</Text>
        <Text style={styles.introTitle}>Choose where to learn</Text>
        <Text style={styles.introSubtitle}>
          Open a class to see its lessons, tasks, announcements, and schedule.
        </Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={19} color={theme.muted} />
          <TextInput
            accessibilityLabel="Search classes"
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Search subject, section, or teacher"
            placeholderTextColor={theme.muted}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear class search"
              onPress={() => onSearchQueryChange("")}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons name="close" size={17} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>

        <View accessibilityLabel="Class status" style={styles.segmentedControl}>
          {([
            { key: "inProgress", label: "Current" },
            { key: "completed", label: "Completed" },
          ] as const).map((item) => {
            const active = activeFilter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onFilterChange(item.key)}
                style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
              >
                <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {errorMessage ? (
        <StudentInlineNotice title="Some class data could not load" description={errorMessage} tone="amber" />
      ) : null}

      <View style={styles.classesSection}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>{heading}</Text>
            <Text style={styles.sectionSubtitle}>Everything you need for each class, all in one place</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{classes.length} {classes.length === 1 ? "class" : "classes"}</Text>
          </View>
        </View>

        {loading && classes.length === 0 ? (
          <View style={styles.emptyCard}>
            <StudentListRow title="Loading classes" subtitle="Pulling your enrolled classes now." icon="sync" tone="blue" />
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.emptyCard}>
            <StudentListRow title="No classes found" subtitle="Try another search term or switch the class status." icon="book-search-outline" />
          </View>
        ) : (
          <View style={styles.cardList}>
            {classes.map((classItem) => (
              <StudentClassCard
                key={classItem.id}
                classItem={classItem}
                onOpenClass={() => navigation.navigate("ClassDetail", {
                  classId: classItem.id,
                  source: "classes",
                })}
                onOpenTasks={() => navigation.navigate("ClassDetail", {
                  classId: classItem.id,
                  initialTab: "assignments",
                  source: "classes",
                })}
                onOpenSchedule={() => navigation.navigate("ClassDetail", {
                  classId: classItem.id,
                  initialTab: "calendar",
                  source: "classes",
                })}
              />
            ))}
          </View>
        )}
      </View>
      <View style={{ height: 28 }} />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  intro: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 15 },
  eyebrow: { color: theme.redText, fontSize: 10, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  introTitle: { marginTop: 5, color: theme.text, fontSize: 24, lineHeight: 30, fontWeight: "900" },
  introSubtitle: { marginTop: 5, color: theme.subtext, fontSize: 12, lineHeight: 18 },
  toolbar: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, padding: 10, gap: 9 },
  searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 13, backgroundColor: theme.bg, paddingLeft: 12, paddingRight: 4 },
  searchInput: { flex: 1, color: theme.text, fontSize: 13, paddingVertical: 0 },
  clearButton: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  segmentedControl: { minHeight: 46, borderRadius: 13, backgroundColor: theme.bg, padding: 4, flexDirection: "row", gap: 4 },
  segmentButton: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  segmentButtonActive: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  segmentText: { color: theme.muted, fontSize: 11, fontWeight: "800" },
  segmentTextActive: { color: theme.redText },
  classesSection: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeading: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 11 },
  sectionTitle: { color: theme.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  sectionSubtitle: { marginTop: 3, color: theme.muted, fontSize: 10, lineHeight: 14 },
  countPill: { minHeight: 30, borderRadius: 999, backgroundColor: theme.redSoft, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  countText: { color: theme.redText, fontSize: 9, fontWeight: "900" },
  cardList: { gap: 14 },
  emptyCard: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
});
