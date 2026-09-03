"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardStatePanel } from "@/components/layout/DashboardStatePanel";
import { TeacherClassRecordWorkbook } from "@/components/teacher/class-record/TeacherClassRecordWorkbook";
import { dashboardService } from "@/services/dashboard-service";
import { useTeacherClassRecord } from "@/hooks/use-teacher-class-record";
import type { ClassItem } from "@/types/class";
import type { GradingPeriod } from "@/utils/constants";

export default function ClassRecordPage() {
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get("classId") || "";

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(preselectedClassId);
  const [classListStatus, setClassListStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const classRecordState = useTeacherClassRecord(selectedClassId || undefined);

  const selectedClass = useMemo(
    () => classes.find((classItem) => classItem.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const selectedRecord = classRecordState.selectedRecord;
  const spreadsheet = classRecordState.spreadsheet;

  const sectionLabel = selectedClass
    ? `${selectedClass.section?.gradeLevel ? `Grade ${selectedClass.section.gradeLevel}` : "Grade level not set"} - ${selectedClass.section?.name || "Section not set"}`
    : "Grade and section will appear here";

  const quarterMap: Partial<
    Record<GradingPeriod, (typeof classRecordState.classRecords)[number]>
  > = {};
  for (const record of classRecordState.classRecords) {
    quarterMap[record.gradingPeriod] = record;
  }

  const categoryWeights = useMemo(() => {
    if (!spreadsheet) return [];

    return spreadsheet.categories.slice(0, 3).map((category) => ({
      key: category.id,
      label: category.name,
      value: `${Math.round(category.weight)}%`,
    }));
  }, [spreadsheet]);

  const statusLabel = selectedRecord?.status
    ? `${selectedRecord.status[0].toUpperCase()}${selectedRecord.status.slice(1)}`
    : "Waiting";

  const fetchClasses = useCallback(() => {
    const request = dashboardService.getTeacherClasses();
    void Promise.resolve().then(() => setClassListStatus("loading"));

    void request
      .then((response) => {
        const nextClasses = response.data || [];
        setClasses(nextClasses);
        setSelectedClassId(
          (current) =>
            current || preselectedClassId || nextClasses[0]?.id || "",
        );
        setClassListStatus("ready");
      })
      .catch(() => setClassListStatus("error"));
  }, [preselectedClassId]);

  useEffect(() => {
    void fetchClasses();
  }, [fetchClasses]);

  if (classListStatus === "loading" && classes.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-[30rem] rounded-xl" />
      </div>
    );
  }

  const handleQuarterSelect = async (quarter: GradingPeriod) => {
    const quarterRecord = quarterMap[quarter];
    if (quarterRecord) {
      classRecordState.setSelectedRecordId(quarterRecord.id);
      return;
    }

    await classRecordState.generateQuarter(quarter);
  };

  const hasWorkbook = Boolean(selectedRecord && spreadsheet);
  const refreshFailed =
    hasWorkbook &&
    (classRecordState.recordsStatus === "error" ||
      classRecordState.spreadsheetStatus === "error");

  return (
    <main className="teacher-class-record-page space-y-3 pb-4">
      <header className="teacher-class-record-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1>Class Record</h1>
            {classRecordState.policy && (
              <span className="text-sm">
                {classRecordState.policy.id} ·{" "}
                {classRecordState.policy.gradeMethod}
              </span>
            )}
          </div>
          <p>
            Review grades, manage period records, and export grades with their
            evidence status.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void classRecordState.exportSpreadsheet()}
          disabled={!hasWorkbook}
          className="teacher-button-outline"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Export workbook
        </Button>
      </header>

      {classListStatus === "error" && classes.length === 0 ? (
        <DashboardStatePanel
          kind="error"
          title="Classes couldn't be loaded"
          description="Your class list is temporarily unavailable. Try loading it again."
          primaryAction={{
            label: "Try again",
            onClick: () => void fetchClasses(),
          }}
        />
      ) : classListStatus === "ready" && classes.length === 0 ? (
        <DashboardStatePanel
          kind="empty"
          title="No classes assigned yet"
          description="Class records will appear here after a class is assigned to you."
        />
      ) : (
        <>
          {classListStatus === "error" ? (
            <DashboardStatePanel
              kind="unavailable"
              title="Class list refresh failed"
              description="The last loaded class list is still available while you retry."
              primaryAction={{
                label: "Retry class list",
                onClick: () => void fetchClasses(),
              }}
            />
          ) : null}

          <section
            className="teacher-class-record-toolbar"
            aria-label="Class record controls"
          >
            <label className="teacher-class-record-field">
              <span>Class</span>
              <select
                aria-label="Class"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="teacher-class-record-select"
              >
                <option value="">Choose a class</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.subjectName} -{" "}
                    {classItem.section?.name || "Section not set"}
                  </option>
                ))}
              </select>
            </label>

            <div className="teacher-class-record-field">
              <span>Grading period</span>
              <div
                className="teacher-class-record-quarters"
                aria-label="Grading period"
              >
                {classRecordState.quarters.map((quarter) => {
                  const quarterRecord = quarterMap[quarter];
                  const isActive = selectedRecord?.gradingPeriod === quarter;
                  const isLoadingQuarter =
                    classRecordState.generating && !quarterRecord;

                  return (
                    <button
                      key={quarter}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => void handleQuarterSelect(quarter)}
                      disabled={!selectedClass || isLoadingQuarter}
                      className="teacher-class-record-quarter"
                    >
                      {isLoadingQuarter
                        ? "..."
                        : classRecordState.periodLabel(quarter)}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void classRecordState.refresh()}
              disabled={!selectedClass}
              className="teacher-button-outline teacher-class-record-refresh"
            >
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              Refresh
            </Button>
          </section>

          {!selectedClass ? (
            <DashboardStatePanel
              kind="empty"
              title="Choose a class to open its record"
              description="Select one of your assigned classes to load its period records."
            />
          ) : classRecordState.recordsStatus === "loading" &&
            !selectedRecord ? (
            <Skeleton className="h-[30rem] rounded-xl" />
          ) : classRecordState.recordsStatus === "error" && !selectedRecord ? (
            <DashboardStatePanel
              kind="error"
              title="Class record couldn't be loaded"
              description="No record data was replaced. Retry when the service is available."
              primaryAction={{
                label: "Retry class record",
                onClick: () => void classRecordState.refresh(),
              }}
            />
          ) : classRecordState.recordsStatus === "ready" && !selectedRecord ? (
            <DashboardStatePanel
              kind="empty"
              title="No class record exists for this class yet"
              description="Choose a period above to create the first class record."
            />
          ) : classRecordState.spreadsheetStatus === "loading" &&
            !spreadsheet ? (
            <Skeleton className="h-[30rem] rounded-xl" />
          ) : classRecordState.spreadsheetStatus === "error" && !spreadsheet ? (
            <DashboardStatePanel
              kind="error"
              title="Workbook couldn't be loaded"
              description="The period record is available, but its workbook data is not."
              primaryAction={{
                label: "Retry class record",
                onClick: () => void classRecordState.refresh(),
              }}
            />
          ) : hasWorkbook ? (
            <section
              className="teacher-class-record-workbook"
              aria-label="Class record workbook"
            >
              <div className="teacher-class-record-summary">
                <div>
                  <h2>{selectedClass.subjectName || "Class record"}</h2>
                  <p>
                    {sectionLabel} ·{" "}
                    {classRecordState.periodLabel(
                      selectedRecord?.gradingPeriod ?? "",
                    )}
                  </p>
                </div>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>{statusLabel}</dd>
                  </div>
                  {categoryWeights.map((category) => (
                    <div key={category.key}>
                      <dt>{category.label}</dt>
                      <dd>{category.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {refreshFailed ? (
                <DashboardStatePanel
                  kind="unavailable"
                  title="Class record refresh failed"
                  description="The last complete workbook remains available while you retry."
                  primaryAction={{
                    label: "Retry class record",
                    onClick: () => void classRecordState.refresh(),
                  }}
                />
              ) : null}

              <TeacherClassRecordWorkbook
                state={classRecordState}
                emptyMessage="No workbook rows are available for this period."
                presentation="content-only"
              />
            </section>
          ) : (
            <Skeleton className="h-[30rem] rounded-xl" />
          )}
        </>
      )}
    </main>
  );
}
