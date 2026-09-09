import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { peekAppError } from "../api/http";
import { usePerformanceSummary } from "../api/hooks";
import {
  StudentContextStrip,
  StudentFlatSection,
  StudentInlineNotice,
  StudentListRow,
  StudentScreen,
} from "../components/student/StudentWorkspacePrimitives";
import type { RootStackParamList } from "../navigation/types";
import { boundAcademicPercentage } from "../lib/academicScore";

type Props = NativeStackScreenProps<RootStackParamList, "Performance">;

function formatScore(value: number | null | undefined) {
  if (typeof value !== "number") return "--";
  return `${Math.round(boundAcademicPercentage(value))}%`;
}

function formatComputedAt(value: string | Date | undefined) {
  if (!value) return "Awaiting performance sync";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Awaiting performance sync";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PerformanceScreen({ navigation }: Props) {
  const performanceQuery = usePerformanceSummary();
  const classes = performanceQuery.data?.classes ?? [];
  const averageScore = performanceQuery.data?.overall.averageBlendedScore ?? null;
  const atRiskClasses = performanceQuery.data?.overall.atRiskClasses ?? 0;
  const classesWithData = performanceQuery.data?.overall.classesWithData ?? 0;
  const totalClasses = performanceQuery.data?.overall.totalClasses ?? classes.length;

  return (
    <StudentScreen
      title="Performance"
      showBackButton
      onBackPress={() => navigation.goBack()}
      refreshing={performanceQuery.isRefetching}
      onRefresh={() => void performanceQuery.refetch()}
    >
      <StudentContextStrip
        title="Overall average"
        subtitle={`${classesWithData}/${totalClasses} subjects synced`}
        status={formatScore(averageScore)}
        icon="chart-line"
      />
      {performanceQuery.error ? <StudentInlineNotice title="Performance data is partially unavailable" description={peekAppError(performanceQuery.error).message} tone="amber" /> : null}
      {atRiskClasses > 0 ? <StudentInlineNotice title={`${atRiskClasses} ${atRiskClasses === 1 ? "class needs" : "classes need"} attention`} description="Open the subject breakdown to review the latest official standing." icon="alert-circle-outline" tone="amber" /> : null}
      <StudentFlatSection title="Subject breakdown" subtitle="Official standing with assessment and class-record references.">
        {classes.length === 0 ? (
          <StudentListRow title="No class performance yet" subtitle="Your subject breakdown will appear once performance is computed." icon="chart-box-outline" />
        ) : classes.map((entry) => (
          <StudentListRow
            key={entry.classId}
            title={entry.class?.subjectName || entry.class?.subjectCode || entry.classId}
            subtitle={`${entry.class?.subjectCode || "Subject code unavailable"} · Assessment ${formatScore(entry.assessmentAverage)} · Class record ${formatScore(entry.classRecordAverage)}\nLast computed ${formatComputedAt(entry.lastComputedAt)}`}
            icon={entry.isAtRisk ? "alert-circle-outline" : "check-circle-outline"}
            status={formatScore(entry.blendedScore)}
            tone={entry.isAtRisk ? "amber" : "green"}
          />
        ))}
      </StudentFlatSection>
      <View style={{ height: 24 }} />
    </StudentScreen>
  );
}
