import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  useClassRecordAverageReport,
  useClassRecordDistributionReport,
  useClassRecordFinalizeMutation,
  useClassRecordGenerateMutation,
  useClassRecordInterventionReport,
  useClassRecordPreviewGrades,
  useClassRecordReopenMutation,
  useClassRecordSpreadsheet,
  useClassRecordsByClass,
} from "../../api/hooks";
import { peekAppError, toAppError } from "../../api/http";
import type { ClassRecord, GradingPeriod } from "../../types/class-record";
import {
  TeacherActionButton,
  TeacherChip,
  TeacherEmpty,
  TeacherPanel,
  TeacherRow,
  TeacherSearch,
  TeacherStats,
  teacherTheme as theme,
} from "./TeacherMobilePrimitives";

type StudentFilter = "all" | "passed" | "intervention";

type Props = {
  classId: string;
  registerRefetch?: (refetcher: () => Promise<unknown>) => void;
};

const QUARTERS: GradingPeriod[] = ["Q1", "Q2", "Q3", "Q4"];

function resolveQuarterTitle(quarter: GradingPeriod) {
  if (quarter === "Q1") return "First Quarter";
  if (quarter === "Q2") return "Second Quarter";
  if (quarter === "Q3") return "Third Quarter";
  return "Fourth Quarter";
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toFixed(digits);
}

function buildRecordSubtitle(record: ClassRecord) {
  const createdAt = record.createdAt ? new Date(record.createdAt) : null;
  const createdLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "No date";
  return `${resolveQuarterTitle(record.gradingPeriod)} - ${record.status.toUpperCase()} - ${createdLabel}`;
}

export function TeacherClassRecordBoard({ classId, registerRefetch }: Props) {
  const recordsQuery = useClassRecordsByClass(classId);
  const classRecords = Array.isArray(recordsQuery.data) ? recordsQuery.data : [];
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () => classRecords.find((record) => record.id === selectedRecordId) ?? null,
    [classRecords, selectedRecordId],
  );

  useEffect(() => {
    if (!classRecords.length) {
      setSelectedRecordId(null);
      return;
    }
    setSelectedRecordId((current) => {
      if (current && classRecords.some((record) => record.id === current)) {
        return current;
      }
      return classRecords[0]?.id ?? null;
    });
  }, [classRecords]);

  const spreadsheetQuery = useClassRecordSpreadsheet(selectedRecordId ?? undefined);
  const previewGradesQuery = useClassRecordPreviewGrades(selectedRecordId ?? undefined);
  const averageReportQuery = useClassRecordAverageReport(selectedRecordId ?? undefined);
  const distributionQuery = useClassRecordDistributionReport(selectedRecordId ?? undefined);
  const interventionQuery = useClassRecordInterventionReport(selectedRecordId ?? undefined);

  const generateMutation = useClassRecordGenerateMutation(classId);
  const finalizeMutation = useClassRecordFinalizeMutation(classId, selectedRecordId ?? undefined);
  const reopenMutation = useClassRecordReopenMutation(classId, selectedRecordId ?? undefined);

  useEffect(() => {
    registerRefetch?.(async () => {
      const tasks: Array<Promise<unknown>> = [recordsQuery.refetch()];
      if (selectedRecordId) {
        tasks.push(spreadsheetQuery.refetch());
        tasks.push(previewGradesQuery.refetch());
        tasks.push(averageReportQuery.refetch());
        tasks.push(distributionQuery.refetch());
        tasks.push(interventionQuery.refetch());
      }
      return Promise.all(tasks);
    });
  }, [
    averageReportQuery,
    distributionQuery,
    interventionQuery,
    previewGradesQuery,
    recordsQuery,
    registerRefetch,
    selectedRecordId,
    spreadsheetQuery,
  ]);

  const workbook = spreadsheetQuery.data;
  const students = workbook?.students ?? [];

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return students.filter((student) => {
      const isIntervention = student.remarks === "For Intervention" || student.quarterlyGrade < 75;
      if (studentFilter === "intervention" && !isIntervention) return false;
      if (studentFilter === "passed" && isIntervention) return false;
      if (!normalizedSearch) return true;
      const searchable = `${student.firstName} ${student.lastName} ${student.lrn || ""} ${student.email || ""}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [search, studentFilter, students]);

  const passedCount = students.filter(
    (student) => student.remarks !== "For Intervention" && student.quarterlyGrade >= 75,
  ).length;
  const interventionCount = students.length - passedCount;
  const nextMissingQuarter = QUARTERS.find(
    (quarter) => !classRecords.some((record) => record.gradingPeriod === quarter),
  );

  const generateQuarter = async (quarter: GradingPeriod) => {
    try {
      setActionError(null);
      await generateMutation.mutateAsync({ classId, gradingPeriod: quarter });
      const refreshedResult = await recordsQuery.refetch();
      const refreshed = refreshedResult.data ?? [];
      const quarterRecord = refreshed.find((record) => record.gradingPeriod === quarter);
      if (quarterRecord) {
        setSelectedRecordId(quarterRecord.id);
      }
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const finalizeQuarter = async () => {
    if (!selectedRecordId) return;
    try {
      setActionError(null);
      await finalizeMutation.mutateAsync();
      await Promise.all([recordsQuery.refetch(), spreadsheetQuery.refetch(), previewGradesQuery.refetch()]);
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  const reopenQuarter = async () => {
    if (!selectedRecordId) return;
    try {
      setActionError(null);
      await reopenMutation.mutateAsync();
      await Promise.all([recordsQuery.refetch(), spreadsheetQuery.refetch(), previewGradesQuery.refetch()]);
    } catch (error) {
      setActionError(toAppError(error).message);
    }
  };

  return (
    <View>
      <TeacherPanel title="Class Record Quarters" subtitle="Generate quarter workbooks, review grades, and finalize records.">
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {classRecords.length ? (
              classRecords.map((record) => (
                <TeacherChip
                  key={record.id}
                  label={`${record.gradingPeriod} (${record.status})`}
                  active={selectedRecordId === record.id}
                  onPress={() => setSelectedRecordId(record.id)}
                />
              ))
            ) : (
              <Text style={{ fontSize: 12, lineHeight: 18, color: theme.subtext }}>
                No quarter workbooks created yet.
              </Text>
            )}
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <TeacherActionButton
              label={generateMutation.isPending ? "Creating..." : "Add Quarter"}
              icon="plus"
              tone="red"
              disabled={!nextMissingQuarter || generateMutation.isPending}
              onPress={() => {
                if (!nextMissingQuarter) return;
                void generateQuarter(nextMissingQuarter);
              }}
            />
            <TeacherActionButton
              label={finalizeMutation.isPending ? "Finalizing..." : "Finalize"}
              icon="check-decagram-outline"
              tone="green"
              disabled={!selectedRecordId || selectedRecord?.status !== "draft" || finalizeMutation.isPending}
              onPress={() => void finalizeQuarter()}
            />
            <TeacherActionButton
              label={reopenMutation.isPending ? "Reopening..." : "Reopen"}
              icon="refresh"
              tone="purple"
              disabled={!selectedRecordId || selectedRecord?.status !== "finalized" || reopenMutation.isPending}
              onPress={() => void reopenQuarter()}
            />
            <TeacherActionButton
              label="Refresh"
              icon="refresh-circle"
              tone="blue"
              onPress={() => {
                const tasks: Array<Promise<unknown>> = [recordsQuery.refetch()];
                if (selectedRecordId) {
                  tasks.push(spreadsheetQuery.refetch());
                  tasks.push(previewGradesQuery.refetch());
                  tasks.push(averageReportQuery.refetch());
                  tasks.push(distributionQuery.refetch());
                  tasks.push(interventionQuery.refetch());
                }
                void Promise.all(tasks);
              }}
            />
          </View>
        </View>
      </TeacherPanel>

      {actionError ? (
        <TeacherPanel title="Class record action failed" subtitle={actionError}>
          <View />
        </TeacherPanel>
      ) : null}

      {recordsQuery.error ? (
        <TeacherPanel title="Class records unavailable" subtitle={peekAppError(recordsQuery.error).message}>
          <View />
        </TeacherPanel>
      ) : null}

      {selectedRecord ? (
        <TeacherPanel title="Selected Record" subtitle={buildRecordSubtitle(selectedRecord)}>
          <TeacherStats
            items={[
              { label: "Students", value: students.length, tone: "blue" },
              { label: "Passed", value: passedCount, tone: "green" },
              { label: "Intervention", value: interventionCount, tone: "amber" },
              { label: "Average", value: formatNumber(averageReportQuery.data?.average, 1), tone: "red" },
            ]}
          />
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Text style={{ fontSize: 12, color: "#9D9D9D" }}>
              Quarter: {workbook?.header?.quarter || selectedRecord.gradingPeriod}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: "#9D9D9D" }}>
              Subject: {workbook?.header?.subject || workbook?.header?.subjectCode || "Class subject"}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: "#9D9D9D" }}>
              Section: {workbook?.header?.gradeLevel ? `Grade ${workbook.header.gradeLevel}` : "Grade ?"}
              {workbook?.header?.section ? ` - ${workbook.header.section}` : ""}
            </Text>
          </View>
        </TeacherPanel>
      ) : (
        <TeacherPanel title="No class record selected" subtitle="Create a quarter workbook to start recording grades.">
          <TeacherEmpty
            title="No quarter workbook yet"
            subtitle="Generate Q1 to Q4 records and switch between them using the quarter chips."
            icon="file-document-plus-outline"
          />
        </TeacherPanel>
      )}

      {selectedRecord ? (
        <>
          <TeacherSearch value={search} onChangeText={setSearch} placeholder="Search student name, LRN, or email" />
          <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(["all", "passed", "intervention"] as const).map((entry) => (
              <TeacherChip
                key={entry}
                label={entry === "all" ? "All" : entry === "passed" ? "Passed" : "For Intervention"}
                active={studentFilter === entry}
                onPress={() => setStudentFilter(entry)}
              />
            ))}
          </View>

          <TeacherPanel title={`Student Grades (${filteredStudents.length})`} subtitle="Filter and inspect each learner's computed quarterly grade.">
            {filteredStudents.length ? (
              filteredStudents.map((student) => {
                const fullName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || "Learner";
                const tone = student.quarterlyGrade >= 75 ? theme.green : theme.amber;
                return (
                  <TeacherRow
                    key={student.studentId}
                    title={fullName}
                    subtitle={`${student.lrn ? `LRN ${student.lrn} - ` : ""}${student.email || "No email"} - Initial ${formatNumber(student.initialGrade, 1)}%`}
                    right={
                      <Text style={{ fontSize: 12, fontWeight: "800", color: tone }}>
                        {formatNumber(student.quarterlyGrade, 1)}%
                      </Text>
                    }
                  />
                );
              })
            ) : (
              <TeacherEmpty
                title="No students in this filter"
                subtitle="Try another search value or switch between passed and intervention filters."
                icon="account-search-outline"
              />
            )}
          </TeacherPanel>

          <TeacherPanel title="Class Reports" subtitle="Summary reports from the class record backend endpoints.">
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <Text style={{ fontSize: 12, color: "#A2A2A2" }}>
                Grade Distribution: {distributionQuery.data ? JSON.stringify(distributionQuery.data.distribution) : "--"}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#A2A2A2" }}>
                Intervention Report Rows: {interventionQuery.data?.length ?? 0}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#A2A2A2" }}>
                Preview Grades Count: {previewGradesQuery.data?.length ?? 0}
              </Text>
            </View>
          </TeacherPanel>
        </>
      ) : null}
    </View>
  );
}
