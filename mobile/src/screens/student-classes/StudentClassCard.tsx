import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { studentDarkTheme as theme } from "../../theme/studentDark";

type MetricIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export type StudentClassRow = {
  id: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
  sectionName: string;
  teacherName: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  classmatesCount: number;
  totalAssessments: number;
  pendingCount: number;
  status: "inProgress" | "completed";
};

function Metric({
  icon,
  value,
  label,
}: {
  icon: MetricIcon;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.redText} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function StudentClassCard({
  classItem,
  index,
  onOpenClass,
  onOpenTasks,
  onOpenSchedule,
}: {
  classItem: StudentClassRow;
  index: number;
  onOpenClass: () => void;
  onOpenTasks: () => void;
  onOpenSchedule: () => void;
}) {
  const isComplete = classItem.status === "completed";
  const statusLabel = isComplete
    ? "Completed"
    : classItem.totalLessons === 0
      ? "Ready"
      : "In progress";
  const heroColor = index % 2 === 0 ? theme.deepNavy : theme.redText;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${classItem.subjectName}`}
        onPress={onOpenClass}
        style={({ pressed }) => [styles.hero, { backgroundColor: heroColor }, pressed ? styles.heroPressed : null]}
      >
        <View style={styles.heroTopRow}>
          <Text style={styles.subjectCode}>{classItem.subjectCode}</Text>
          <View style={[styles.statusPill, isComplete ? styles.statusPillComplete : null]}>
            <View style={[styles.statusDot, isComplete ? styles.statusDotComplete : null]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.subjectName}>{classItem.subjectName}</Text>
        <View style={styles.classMetaList}>
          <View style={styles.classMetaRow}>
            <MaterialCommunityIcons name="school-outline" size={16} color="#E2E8F0" />
            <Text style={styles.classMetaText}>Grade {classItem.subjectGradeLevel} · {classItem.sectionName}</Text>
          </View>
          <View style={styles.classMetaRow}>
            <MaterialCommunityIcons name="account-tie-outline" size={16} color="#E2E8F0" />
            <Text numberOfLines={1} style={styles.classMetaText}>{classItem.teacherName}</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.metricsRow}>
          <Metric icon="account-group-outline" value={classItem.classmatesCount} label="Classmates" />
          <View style={styles.metricDivider} />
          <Metric icon="book-open-page-variant-outline" value={classItem.totalLessons} label="Lessons" />
          <View style={styles.metricDivider} />
          <Metric icon="clipboard-clock-outline" value={classItem.pendingCount} label="Pending" />
        </View>

        <View style={styles.progressPanel}>
          <View style={styles.progressHeading}>
            <View>
              <Text style={styles.progressLabel}>Learning progress</Text>
              <Text style={styles.progressMeta}>
                {classItem.completedLessons} of {classItem.totalLessons} lessons complete
              </Text>
            </View>
            <Text style={styles.progressValue}>{classItem.progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, classItem.progress))}%` }]} />
          </View>
        </View>

        <View style={styles.contextRow}>
          <View style={styles.contextChip}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={theme.redText} />
            <Text style={styles.contextText}>
              {classItem.totalAssessments} {classItem.totalAssessments === 1 ? "task" : "tasks"}
            </Text>
          </View>
          <View style={styles.contextChip}>
            <MaterialCommunityIcons name="account-group-outline" size={14} color={theme.blue} />
            <Text style={styles.contextText}>{classItem.sectionName}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenTasks}
            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
          >
            <MaterialCommunityIcons name="clipboard-text-outline" size={17} color={theme.redText} />
            <Text style={styles.secondaryButtonText}>View Tasks</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenClass}
            style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.primaryButtonText}>{isComplete ? "Open Class" : "Continue Learning"}</Text>
            <MaterialCommunityIcons name="arrow-right" size={17} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenSchedule}
          style={({ pressed }) => [styles.scheduleButton, pressed ? styles.pressed : null]}
        >
          <MaterialCommunityIcons name="calendar-blank-outline" size={17} color={theme.subtext} />
          <Text style={styles.scheduleButtonText}>View Schedule</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.dim} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  hero: { minHeight: 190, padding: 18, justifyContent: "space-between" },
  heroPressed: { opacity: 0.9 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  subjectCode: { color: "#FECACA", fontSize: 10, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  statusPill: { minHeight: 28, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  statusPillComplete: { backgroundColor: "rgba(220,252,231,0.18)" },
  statusDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: "#FDE68A" },
  statusDotComplete: { backgroundColor: "#86EFAC" },
  statusText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },
  subjectName: { color: "#FFFFFF", fontSize: 27, lineHeight: 33, fontWeight: "900" },
  classMetaList: { gap: 7 },
  classMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  classMetaText: { flex: 1, color: "#E2E8F0", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  body: { padding: 15 },
  metricsRow: { minHeight: 62, flexDirection: "row", alignItems: "stretch" },
  metric: { flex: 1, alignItems: "center", justifyContent: "center" },
  metricDivider: { width: 1, marginVertical: 8, backgroundColor: theme.border },
  metricValue: { marginTop: 2, color: theme.text, fontSize: 18, fontWeight: "900" },
  metricLabel: { marginTop: 1, color: theme.muted, fontSize: 9, fontWeight: "800" },
  progressPanel: { marginTop: 13, borderRadius: 15, backgroundColor: theme.bg, padding: 13 },
  progressHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  progressLabel: { color: theme.text, fontSize: 12, fontWeight: "900" },
  progressMeta: { marginTop: 3, color: theme.muted, fontSize: 9, lineHeight: 13 },
  progressValue: { color: theme.redText, fontSize: 16, fontWeight: "900" },
  progressTrack: { height: 7, marginTop: 11, overflow: "hidden", borderRadius: 999, backgroundColor: theme.border },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: theme.red },
  contextRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  contextChip: { minHeight: 30, borderRadius: 999, backgroundColor: theme.bg, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  contextText: { color: theme.subtext, fontSize: 9, fontWeight: "800" },
  actionRow: { marginTop: 14, flexDirection: "row", gap: 9 },
  secondaryButton: { flex: 0.85, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  secondaryButtonText: { color: theme.redText, fontSize: 11, fontWeight: "900" },
  primaryButton: { flex: 1.15, minHeight: 46, borderRadius: 13, backgroundColor: theme.redText, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  scheduleButton: { minHeight: 46, marginTop: 8, borderRadius: 13, backgroundColor: theme.bg, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  scheduleButtonText: { flex: 1, color: theme.subtext, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
