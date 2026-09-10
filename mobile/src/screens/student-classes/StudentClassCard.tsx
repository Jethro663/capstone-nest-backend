import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  onOpenClass,
  onOpenTasks,
  onOpenSchedule,
}: {
  classItem: StudentClassRow;
  onOpenClass: () => void;
  onOpenTasks: () => void;
  onOpenSchedule: () => void;
}) {
  const isComplete = classItem.status === "completed";
  const statusLabel = isComplete
    ? "Completed"
    : classItem.progress > 0
      ? "In Progress"
      : "Ready";
  const isReady = statusLabel === "Ready";

  return (
    <View style={styles.card}>
      <LinearGradient
        testID="student-class-hero-surface"
        colors={["#0C1D3A", "#172944"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${classItem.subjectName}`}
          onPress={onOpenClass}
          style={({ pressed }) => [styles.heroPressTarget, pressed ? styles.heroPressed : null]}
        >
          <View style={styles.heroStatusRow}>
            <View
              style={[
                styles.statusPill,
                isComplete
                  ? styles.statusPillComplete
                  : isReady
                    ? styles.statusPillReady
                    : null,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isComplete
                    ? styles.statusTextComplete
                    : isReady
                      ? styles.statusTextReady
                      : null,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.heroIdentity}>
            <Text numberOfLines={2} style={styles.subjectName}>{classItem.subjectName}</Text>
            <Text numberOfLines={1} style={styles.gradeLine}>
              Grade {classItem.subjectGradeLevel} • {classItem.sectionName}
            </Text>
            <Text numberOfLines={1} style={styles.teacherLine}>
              with {classItem.teacherName}
            </Text>
          </View>
        </Pressable>
      </LinearGradient>

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
          <View style={[styles.actionSurface, styles.secondarySurface]}>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenTasks}
              style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
            >
              <MaterialCommunityIcons name="clipboard-text-outline" size={17} color={theme.redText} />
              <Text numberOfLines={2} style={styles.secondaryButtonText}>View Tasks</Text>
            </Pressable>
          </View>
          <View style={[styles.actionSurface, styles.primarySurface]}>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenClass}
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
            >
              <Text numberOfLines={2} style={styles.primaryButtonText}>{isComplete ? "Open Class" : "Continue Learning"}</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
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
  hero: {
    minHeight: 154,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  heroPressTarget: { flex: 1, justifyContent: "space-between" },
  heroPressed: { opacity: 0.9 },
  heroStatusRow: { flexDirection: "row", alignItems: "flex-start" },
  statusPill: {
    minHeight: 27,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillComplete: { borderColor: "#BBF7D0", backgroundColor: "#DCFCE7" },
  statusPillReady: { borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  statusText: { color: theme.redText, fontSize: 9, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  statusTextComplete: { color: "#166534" },
  statusTextReady: { color: theme.subtext },
  heroIdentity: { marginTop: 18 },
  subjectName: { color: "#FFFFFF", fontSize: 29, lineHeight: 32, fontWeight: "800", letterSpacing: -0.35 },
  gradeLine: { marginTop: 8, color: "rgba(255,255,255,0.92)", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  teacherLine: { marginTop: 2, color: "rgba(255,255,255,0.80)", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  body: { padding: 14 },
  metricsRow: { minHeight: 58, flexDirection: "row", alignItems: "stretch" },
  metric: { flex: 1, alignItems: "center", justifyContent: "center" },
  metricDivider: { width: 1, marginVertical: 8, backgroundColor: theme.border },
  metricValue: { marginTop: 2, color: theme.text, fontSize: 18, fontWeight: "900" },
  metricLabel: { marginTop: 1, color: theme.muted, fontSize: 9, fontWeight: "800" },
  progressPanel: { marginTop: 11, borderRadius: 14, backgroundColor: theme.bg, padding: 12 },
  progressHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  progressLabel: { color: theme.text, fontSize: 12, fontWeight: "900" },
  progressMeta: { marginTop: 3, color: theme.muted, fontSize: 9, lineHeight: 13 },
  progressValue: { color: theme.redText, fontSize: 16, fontWeight: "900" },
  progressTrack: { height: 7, marginTop: 11, overflow: "hidden", borderRadius: 999, backgroundColor: theme.border },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: theme.red },
  contextRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  contextChip: { minHeight: 30, borderRadius: 999, backgroundColor: theme.bg, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  contextText: { color: theme.subtext, fontSize: 9, fontWeight: "800" },
  actionRow: { marginTop: 13, flexDirection: "row", alignItems: "stretch", gap: 9 },
  actionSurface: { flex: 1, minWidth: 0, minHeight: 52, overflow: "hidden", borderRadius: 13 },
  secondarySurface: { borderWidth: 1, borderColor: theme.border2, backgroundColor: theme.surface },
  primarySurface: { backgroundColor: theme.redText },
  secondaryButton: { minHeight: 52, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secondaryButtonText: { flexShrink: 1, textAlign: "center", color: theme.redText, fontSize: 11, lineHeight: 14, fontWeight: "900" },
  primaryButton: { minHeight: 52, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  primaryButtonText: { flexShrink: 1, textAlign: "center", color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "900" },
  scheduleButton: { minHeight: 46, marginTop: 8, borderRadius: 13, backgroundColor: theme.bg, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  scheduleButtonText: { flex: 1, color: theme.subtext, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
