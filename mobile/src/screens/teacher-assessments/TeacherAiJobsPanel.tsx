import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { TeacherAiJobSummary } from "../../types/ai";
import {
  TeacherEmpty,
  TeacherPanel,
  teacherTheme as theme,
} from "../../components/teacher/TeacherMobilePrimitives";
import { getAiJobPresentation } from "./ai-job-presentation";

interface TeacherAiJobsPanelProps {
  jobs: TeacherAiJobSummary[];
  classNames: Record<string, string>;
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onResume: (job: TeacherAiJobSummary) => void;
  onOpenAssessment: (job: TeacherAiJobSummary) => void;
  onRequestDelete: (job: TeacherAiJobSummary) => void;
}

function JobAction({
  label,
  icon,
  accessibilityLabel,
  destructive = false,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accessibilityLabel: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        minHeight: 44,
        minWidth: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: destructive ? theme.redLine : theme.border,
        backgroundColor: destructive ? theme.redSoft : theme.active,
        paddingHorizontal: 9,
        paddingVertical: 7,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={14}
        color={destructive ? theme.red : theme.text}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          color: destructive ? theme.red : theme.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TeacherAiJobsPanel({
  jobs,
  classNames,
  loading,
  error,
  onRefresh,
  onResume,
  onOpenAssessment,
  onRequestDelete,
}: TeacherAiJobsPanelProps) {
  const activeCount = jobs.filter((job) =>
    ["queued", "pending", "running", "processing"].includes(job.status),
  ).length;

  return (
    <TeacherPanel
      title="AI draft jobs"
      subtitle={
        loading
          ? "Loading jobs created on web and mobile..."
          : `${jobs.length} recent job${jobs.length === 1 ? "" : "s"} · ${activeCount} active`
      }
    >
      {error ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ color: theme.red, fontSize: 12 }}>
            AI draft jobs could not be loaded. Your assessments are still available below.
          </Text>
          <View style={{ alignItems: "flex-start", marginTop: 8 }}>
            <JobAction
              label="Try again"
              icon="refresh"
              accessibilityLabel="Refresh AI draft jobs"
              onPress={onRefresh}
            />
          </View>
        </View>
      ) : null}

      {!loading && !error && jobs.length === 0 ? (
        <TeacherEmpty
          title="No AI draft jobs"
          subtitle="Quiz drafts started on the web or mobile will appear here."
          icon="creation-outline"
        />
      ) : null}

      {jobs.map((job) => {
        const presentation = getAiJobPresentation(job.status);
        const classLabel = job.classId
          ? classNames[job.classId] ?? "Assigned class"
          : "Class unavailable";
        const detail = job.errorMessage || job.statusMessage;
        return (
          <View
            key={job.jobId}
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              paddingHorizontal: 14,
              paddingVertical: 14,
              backgroundColor: theme.surface2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 14, fontWeight: "900", color: theme.text }}
                >
                  {job.title}
                </Text>
                <Text style={{ marginTop: 3, fontSize: 11, color: theme.subtext }}>
                  {classLabel} · {Math.round(job.progressPercent)}%
                </Text>
              </View>
              <View
                accessibilityLabel={`Status: ${presentation.label}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: presentation.borderColor,
                  backgroundColor: presentation.backgroundColor,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: presentation.color,
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "900",
                    color: presentation.color,
                  }}
                >
                  {presentation.label}
                </Text>
              </View>
            </View>

            {detail ? (
              <Text
                numberOfLines={2}
                style={{ marginTop: 7, fontSize: 11, lineHeight: 16, color: theme.muted }}
              >
                {detail}
              </Text>
            ) : null}

            <View style={{ marginTop: 11, flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              <JobAction
                label="Resume"
                icon="play-outline"
                accessibilityLabel={`Resume ${job.title}`}
                onPress={() => onResume(job)}
              />
              {job.assessmentId ? (
                <JobAction
                  label="Open assessment"
                  icon="open-in-new"
                  accessibilityLabel={`Open ${job.title} assessment`}
                  onPress={() => onOpenAssessment(job)}
                />
              ) : null}
              <JobAction
                label="Delete"
                icon="trash-can-outline"
                accessibilityLabel={`Delete ${job.title} job`}
                destructive
                onPress={() => onRequestDelete(job)}
              />
            </View>
          </View>
        );
      })}
    </TeacherPanel>
  );
}
