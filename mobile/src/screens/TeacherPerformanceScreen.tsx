import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  useTeacherClassAtRisk,
  useTeacherClassDiagnostics,
  useTeacherClassPerformanceSummary,
  useTeacherClasses,
  useTeacherInterventionQuizComparison,
} from "../api/hooks";
import type { TeacherDrawerScreenProps } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { boundAcademicPercentage } from "../lib/academicScore";
import {
  TeacherActionButton,
  TeacherEmpty,
  TeacherRow,
  TeacherScreen,
  TeacherSelectMenu,
  teacherTheme,
  stripRichText,
} from "../components/teacher/TeacherMobilePrimitives";
import {
  TeacherFlatSection,
  TeacherSegmentedTabs,
  TeacherSummaryStrip,
} from "../components/teacher/TeacherWorkspacePrimitives";

type Props = TeacherDrawerScreenProps<"TeacherPerformance">;

function toPercent(value: number | null | undefined) {
  return typeof value === "number"
    ? `${boundAcademicPercentage(value).toFixed(1)}%`
    : "N/A";
}

function toDelta(value: number | null | undefined) {
  if (typeof value !== "number") return "N/A";
  if (value > 0) return `+${value.toFixed(1)} pts`;
  return `${value.toFixed(1)} pts`;
}

function evidenceDate(value: string | Date | null | undefined) {
  if (!value) return "date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleDateString();
}

function evidenceSampleSize(count: number | null | undefined, kind: string) {
  return typeof count === "number" && Number.isFinite(count)
    ? `${count} ${kind}${count === 1 ? "" : "s"}`
    : "sample size unavailable";
}

function trendLabel(trend: string | undefined) {
  switch (trend) {
    case "improved":
      return "Improved";
    case "declined":
      return "Declined";
    case "unchanged":
      return "Unchanged";
    default:
      return "Awaiting follow-up";
  }
}

function trendColor(trend: string | undefined) {
  switch (trend) {
    case "improved":
      return teacherTheme.green;
    case "declined":
      return teacherTheme.red;
    case "unchanged":
      return teacherTheme.muted;
    default:
      return teacherTheme.amber;
  }
}

function formatSourceLabel(value: string | null | undefined) {
  if (!value) return "";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFilterLabel(filter: {
  id: string;
  label: string;
  assessmentType?: string | null;
  classRecordCategory?: string | null;
}) {
  if (filter.id === "all") return filter.label;
  const category = formatSourceLabel(
    filter.classRecordCategory ?? filter.assessmentType,
  );
  return category ? `${filter.label} - ${category}` : filter.label;
}

function conceptLabel(value: string) {
  const cleaned = stripRichText(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || /^(unknown|unlabeled|concept)$/i.test(cleaned)) return "Unlabeled concept";
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function conceptAction(score: number, evidenceCount: number) {
  if (evidenceCount < 3) return "Review more work before deciding";
  if (score < 70) return "Check missed items and plan guided reteaching";
  if (score < 85) return "Reinforce and monitor the next task";
  return "Maintain with light review";
}

export function TeacherPerformanceScreen({ navigation }: Props) {
  const { user } = useAuth();
  const teacherId = user?.userId || user?.id;
  const classesQuery = useTeacherClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedComparisonFilterId, setSelectedComparisonFilterId] =
    useState<string>("all");
  const [viewMode, setViewMode] = useState<"overview" | "at_risk" | "compare" | "concepts">("overview");

  useEffect(() => {
    if (!selectedClassId && classesQuery.data?.length) {
      setSelectedClassId(classesQuery.data[0].id);
    }
  }, [classesQuery.data, selectedClassId]);

  const summaryQuery = useTeacherClassPerformanceSummary(
    selectedClassId || undefined,
  );
  const atRiskQuery = useTeacherClassAtRisk(selectedClassId || undefined);
  const diagnosticsQuery = useTeacherClassDiagnostics(
    viewMode === "concepts" ? selectedClassId || undefined : undefined,
  );
  const comparisonQuery = useTeacherInterventionQuizComparison(
    selectedClassId || undefined,
  );

  const selectedClass = useMemo(
    () => classesQuery.data?.find((entry) => entry.id === selectedClassId),
    [classesQuery.data, selectedClassId],
  );

  const atRiskStudents = atRiskQuery.data?.students ?? [];
  const comparisonRows = comparisonQuery.data?.comparisons ?? [];
  const summary = summaryQuery.data;
  const classAverage = summary?.averages?.blended ?? summary?.averageBlendedScore;
  const supportThreshold = summary?.threshold ?? summary?.thresholdApplied;
  const scoreCoverage = summary?.studentsWithData;
  const conceptRows = useMemo(
    () => [...(diagnosticsQuery.data?.conceptHotspots ?? [])]
      .sort((left, right) => left.masteryScore - right.masteryScore),
    [diagnosticsQuery.data?.conceptHotspots],
  );
  const comparisonFilters = comparisonQuery.data?.filterOptions?.length
    ? comparisonQuery.data.filterOptions
    : [
        {
          id: "all",
          label: "All assessments",
          assessmentId: null,
          assessmentTitle: null,
          assessmentType: null,
          classRecordCategory: null,
        },
      ];
  const filteredComparisonRows = useMemo(
    () =>
      comparisonRows.filter(
        (row) =>
          (row.filterId ?? row.assessmentId) === selectedComparisonFilterId,
      ),
    [comparisonRows, selectedComparisonFilterId],
  );
  const filteredComparisonCounts = useMemo(
    () => ({
      improved: filteredComparisonRows.filter((row) => row.trend === "improved")
        .length,
      declined: filteredComparisonRows.filter((row) => row.trend === "declined")
        .length,
      unchanged: filteredComparisonRows.filter(
        (row) => row.trend === "unchanged",
      ).length,
      awaiting: filteredComparisonRows.filter(
        (row) => row.trend === "awaiting_retry",
      ).length,
    }),
    [filteredComparisonRows],
  );
  const latestComparisonByStudent = useMemo(() => {
    const map = new Map<string, (typeof comparisonRows)[number]>();

    comparisonRows
      .filter(
        (row) =>
          (row.comparisonScope ?? "class_average") === "class_average" ||
          row.filterId === "all",
      )
      .forEach((row) => {
        const current = map.get(row.studentId);
        if (!current) {
          map.set(row.studentId, row);
          return;
        }

        const currentAfter = current.afterSubmittedAt
          ? new Date(current.afterSubmittedAt).getTime()
          : 0;
        const nextAfter = row.afterSubmittedAt
          ? new Date(row.afterSubmittedAt).getTime()
          : 0;

        if (nextAfter > currentAfter) {
          map.set(row.studentId, row);
        }
      });

    return map;
  }, [comparisonRows]);

  useEffect(() => {
    setSelectedComparisonFilterId("all");
  }, [selectedClassId]);

  return (
    <TeacherScreen
      title="Performance"
      subtitle="Review evidence, identify learners needing support, and monitor follow-up work."
      icon="chart-line"
      onBackPress={() => navigation.goBack()}
      refreshing={
        classesQuery.isRefetching ||
        summaryQuery.isRefetching ||
        atRiskQuery.isRefetching ||
        diagnosticsQuery.isRefetching ||
        comparisonQuery.isRefetching
      }
      onRefresh={() => {
        void Promise.all([
          classesQuery.refetch(),
          summaryQuery.refetch(),
          atRiskQuery.refetch(),
          ...(viewMode === "concepts" && selectedClassId ? [diagnosticsQuery.refetch()] : []),
          comparisonQuery.refetch(),
        ]);
      }}
    >
      <TeacherSelectMenu
        label="Class"
        selectedValue={selectedClassId}
        options={(classesQuery.data ?? []).map((entry) => ({ value: entry.id, label: `${entry.subjectCode} · ${entry.subjectName}` }))}
        onSelect={setSelectedClassId}
      />
      <TeacherSegmentedTabs
        accessibilityLabel="Performance views"
        activeKey={viewMode}
        items={[
          { key: "overview", label: "Overview" },
          { key: "at_risk", label: "At risk", count: atRiskStudents.length },
          { key: "compare", label: "Response", count: comparisonRows.length },
          { key: "concepts", label: "Concepts", count: viewMode === "concepts" ? conceptRows.length : undefined },
        ]}
        onSelect={setViewMode}
      />

      {viewMode === "overview" ? (
      <>
      <TeacherSummaryStrip
        items={[
          {
            label: "Average",
            value: typeof classAverage === "number" ? `${boundAcademicPercentage(classAverage).toFixed(1)}%` : "N/A",
            tone: "blue",
          },
          { label: "Needs support", value: summary?.atRiskCount ?? atRiskStudents.length, tone: "amber" },
          { label: "Score coverage", value: scoreCoverage === undefined ? "N/A" : `${scoreCoverage}/${summary?.totalStudents ?? 0}`, tone: "blue" },
        ]}
      />
      <TeacherFlatSection
        title="Class summary"
        subtitle={
          selectedClass
            ? `${selectedClass.subjectCode} - ${selectedClass.subjectName}`
            : "Select a class"
        }
      >
        <TeacherRow
          title="Threshold"
          subtitle={
            typeof supportThreshold === "number"
              ? toPercent(supportThreshold)
              : "Not available"
          }
        />
        <TeacherRow
          title="Average current standing"
          subtitle={
            typeof classAverage === "number"
              ? toPercent(classAverage)
              : "Not available"
          }
        />
        <TeacherRow
          title="Learners with score data"
          subtitle={scoreCoverage === undefined ? "Not available" : `${scoreCoverage} of ${summary?.totalStudents ?? 0}`}
        />
      </TeacherFlatSection>
      </>
      ) : null}

      {viewMode === "at_risk" ? (
      <TeacherFlatSection
        title="At-risk learners"
        subtitle="Students below threshold for the selected class."
      >
        {atRiskStudents.length ? (
          atRiskStudents.map((entry, index) => {
            const name =
              [entry.firstName, entry.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              entry.studentId ||
              "Student";
            const comparison = entry.studentId
              ? latestComparisonByStudent.get(entry.studentId)
              : undefined;
            return (
              <TeacherRow
                key={`${entry.studentId || index}`}
                title={name}
                subtitle={`Current standing ${toPercent(entry.blendedScore)} · support threshold ${toPercent(entry.thresholdApplied)}${comparison ? `\nLatest response: ${trendLabel(comparison.trend)} · ${toDelta(comparison.deltaScorePercent)}` : "\nNo intervention follow-up evidence yet"}`}
                onPress={comparison ? () => setViewMode("compare") : undefined}
                right={
                  comparison ? (
                    <View
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: teacherTheme.border,
                        backgroundColor: teacherTheme.active,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: trendColor(comparison.trend),
                        }}
                      >
                        {trendLabel(comparison.trend)}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
            );
          })
        ) : (
          <TeacherEmpty
            title="No at-risk learners"
            subtitle="No students are currently flagged for the selected class."
            icon="check-circle-outline"
          />
        )}
      </TeacherFlatSection>
      ) : null}

      {viewMode === "compare" ? (
      <TeacherFlatSection
        title="Intervention response"
        subtitle="Baseline and follow-up describe observed assessment work. A score change alone does not prove the intervention caused it."
      >
        {comparisonRows.length ? (
          <>
            <TeacherSelectMenu
              label="Comparison group"
              selectedValue={selectedComparisonFilterId}
              options={comparisonFilters.map((filter) => ({
                value: filter.id,
                label: formatFilterLabel(filter),
              }))}
              onSelect={setSelectedComparisonFilterId}
            />
            <TeacherSummaryStrip
              items={[
                {
                  label: "Improved",
                  value: filteredComparisonCounts.improved,
                  tone: "green",
                },
                {
                  label: "Declined",
                  value: filteredComparisonCounts.declined,
                  tone: "red",
                },
                {
                  label: "Unchanged",
                  value: filteredComparisonCounts.unchanged,
                  tone: "blue",
                },
                {
                  label: "Pending",
                  value: filteredComparisonCounts.awaiting,
                  tone: "amber",
                },
              ]}
            />
            {filteredComparisonRows.length ? (
              filteredComparisonRows.map((row) => {
                const studentName =
                  [row.student?.firstName, row.student?.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || row.studentId;
                return (
                  <TeacherRow
                    key={`${row.caseId}-${row.assignmentId}-${row.assessmentId}`}
                    title={`${studentName} · ${row.assessmentTitle}`}
                    subtitle={`Baseline ${toPercent(row.beforeScorePercent)} · ${evidenceSampleSize(row.beforeSampleSize, "assessment")} · ${evidenceDate(row.beforeSubmittedAt)}\nFollow-up ${toPercent(row.afterScorePercent)} · ${evidenceSampleSize(row.afterSampleSize, "AI-plan assessment")} · ${evidenceDate(row.afterSubmittedAt)}\nChange ${toDelta(row.deltaScorePercent)} · ${row.comparisonScope === "class_average" ? "class average" : row.comparisonScope === "assessment" ? "selected assessment" : "scope unavailable"}`}
                    right={
                      <View
                        style={{
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: teacherTheme.border,
                          backgroundColor: teacherTheme.active,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: trendColor(row.trend),
                          }}
                        >
                          {trendLabel(row.trend)}
                        </Text>
                      </View>
                    }
                  />
                );
              })
            ) : (
              <TeacherEmpty
                title="No rows for this filter"
                subtitle="Try All assessments or another quiz/performance-task filter."
                icon="filter-outline"
              />
            )}
          </>
        ) : (
          <TeacherEmpty
            title="No intervention quiz data yet"
            subtitle="Baseline appears after class assessments. Follow-up appears after learners complete AI-plan assessments."
            icon="chart-timeline-variant"
          />
        )}
      </TeacherFlatSection>
      ) : null}

      {viewMode === "concepts" ? (
        <TeacherFlatSection
          title="Concept evidence"
          subtitle="Start with low mastery signals. Review the missed work and evidence count before changing instruction; these are review aids, not official grades."
        >
          {diagnosticsQuery.isLoading ? (
            <TeacherEmpty title="Loading concept evidence" subtitle="Gathering recent assessment signals." icon="chart-box-outline" />
          ) : diagnosticsQuery.isError ? (
            <TeacherEmpty title="Concept evidence unavailable" subtitle="Pull to refresh this class and try again." icon="alert-circle-outline" />
          ) : conceptRows.length ? (
            conceptRows.map((concept) => (
              <TeacherRow
                key={concept.concept}
                title={conceptLabel(concept.concept)}
                subtitle={`Mastery signal ${toPercent(concept.masteryScore)} · ${concept.wrongCount} misses · ${concept.evidenceCount} observations\n${conceptAction(concept.masteryScore, concept.evidenceCount)}`}
              />
            ))
          ) : (
            <TeacherEmpty title="No concept evidence yet" subtitle="Run assessments and refresh this class to surface concept signals." icon="chart-box-outline" />
          )}
        </TeacherFlatSection>
      ) : null}

      <TeacherFlatSection
        title="Performance actions"
        subtitle="Jump to adjacent teacher tabs without leaving this context."
      >
        <View
          style={{
            paddingHorizontal: 14,
            paddingBottom: 14,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <TeacherActionButton
            label="Open Interventions"
            icon="account-heart-outline"
            tone="blue"
            onPress={() => navigation.navigate("TeacherInterventions")}
          />
          <TeacherActionButton
            label="Open Reports"
            icon="file-chart-outline"
            tone="neutral"
            onPress={() => navigation.navigate("TeacherReports")}
          />
        </View>
      </TeacherFlatSection>
    </TeacherScreen>
  );
}
