"use client";

import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { assessmentService } from "@/services/assessment-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/helpers";
import { PreviewModal } from "@/components/teacher/assessment/preview-modal";
import { downloadXlsxBuffer } from "@/lib/download-xlsx-buffer";
import type {
  Assessment,
  SubmissionStatus,
  SubmissionsResponse,
} from "@/types/assessment";
import {
  presentAcademicScore,
  type AcademicScoreBreakdown,
} from "@/lib/academic-score";

interface PostScoresTabProps {
  assessmentId: string;
  assessment: Assessment;
  submissions: SubmissionsResponse | null;
  onDataChanged: () => void;
}

type ExportRow = Record<string, string | number>;
type ScoreFilter = "all" | "pending" | "posted" | "no_submission";
type ScoreBucket = Exclude<ScoreFilter, "all">;

type SubmissionRow = {
  studentId: string;
  fullName: string;
  email?: string;
  status: SubmissionStatus;
  bucket: ScoreBucket;
  attemptId: string | null;
  totalAttempts: number;
  score: number | null;
  scorePercent: number | null;
  scoreBreakdown: AcademicScoreBreakdown | null;
  submittedAt?: string;
  timeSpentSeconds?: number | null;
  teacherFeedback?: string | null;
};

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; badgeColor: string }
> = {
  not_started: {
    label: "Not started",
    badgeColor: "bg-slate-100 text-slate-600",
  },
  in_progress: { label: "In progress", badgeColor: "bg-sky-100 text-sky-700" },
  turned_in: {
    label: "Awaiting release",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  returned: {
    label: "Released",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
};

const FILTER_COPY: Record<ScoreFilter, { label: string; description: string }> =
  {
    all: {
      label: "All students",
      description: "See the full roster with the latest score state.",
    },
    pending: {
      label: "Awaiting release",
      description: "Students who submitted and still need score release.",
    },
    posted: {
      label: "Released",
      description: "Students whose scores are already visible.",
    },
    no_submission: {
      label: "No submission",
      description: "Students who have not turned in a submission yet.",
    },
  };

function toErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function getRowBucket(status: SubmissionStatus): ScoreBucket {
  if (status === "returned") return "posted";
  if (status === "turned_in") return "pending";
  return "no_submission";
}

export function PostScoresTab({
  assessment,
  submissions,
  onDataChanged,
}: PostScoresTabProps) {
  const [postSelectedOpen, setPostSelectedOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [postingSelected, setPostingSelected] = useState(false);
  const [previewAttemptId, setPreviewAttemptId] = useState<string | null>(null);
  const [selectedAttemptIds, setSelectedAttemptIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ScoreFilter>("all");

  const rows = useMemo<SubmissionRow[]>(
    () =>
      (submissions?.submissions ?? []).map((submission) => ({
        studentId: submission.studentId,
        fullName: `${submission.lastName}, ${submission.firstName}`,
        email: submission.email,
        status: submission.status,
        bucket: getRowBucket(submission.status),
        attemptId: submission.attempt?.isSubmitted
          ? submission.attempt.id
          : null,
        totalAttempts:
          submission.totalAttempts ??
          submission.attempts?.length ??
          (submission.attempt ? 1 : 0),
        score: submission.attempt?.score ?? null,
        scorePercent:
          submission.attempt?.scorePercent ?? submission.attempt?.score ?? null,
        scoreBreakdown: submission.attempt?.scoreBreakdown ?? null,
        submittedAt: submission.attempt?.submittedAt,
        timeSpentSeconds: submission.attempt?.timeSpentSeconds ?? null,
        teacherFeedback: submission.attempt?.teacherFeedback ?? null,
      })),
    [submissions?.submissions],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((row) => row.bucket === "pending").length,
      posted: rows.filter((row) => row.bucket === "posted").length,
      no_submission: rows.filter((row) => row.bucket === "no_submission")
        .length,
    }),
    [rows],
  );

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) => activeFilter === "all" || row.bucket === activeFilter,
      ),
    [activeFilter, rows],
  );

  const selectableVisibleAttemptIds = visibleRows
    .filter((row) => row.bucket === "pending" && row.attemptId)
    .map((row) => row.attemptId as string);

  const allVisibleSelected =
    selectableVisibleAttemptIds.length > 0 &&
    selectableVisibleAttemptIds.every((attemptId) =>
      selectedAttemptIds.includes(attemptId),
    );

  const selectedCount = selectedAttemptIds.length;

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedAttemptIds((current) =>
        current.filter(
          (attemptId) => !selectableVisibleAttemptIds.includes(attemptId),
        ),
      );
      return;
    }

    setSelectedAttemptIds((current) => [
      ...current,
      ...selectableVisibleAttemptIds.filter(
        (attemptId) => !current.includes(attemptId),
      ),
    ]);
  };

  const toggleAttemptSelection = (attemptId: string) => {
    setSelectedAttemptIds((current) =>
      current.includes(attemptId)
        ? current.filter((currentAttemptId) => currentAttemptId !== attemptId)
        : [...current, attemptId],
    );
  };

  const handlePostSelected = async () => {
    if (selectedAttemptIds.length === 0) return;

    try {
      setPostingSelected(true);
      await assessmentService.bulkReturnGrades({
        attemptIds: selectedAttemptIds,
        teacherFeedback: feedback || undefined,
      });
      toast.success(
        `${selectedAttemptIds.length} score${selectedAttemptIds.length === 1 ? "" : "s"} released to students`,
      );
      setSelectedAttemptIds([]);
      setFeedback("");
      setPostSelectedOpen(false);
      onDataChanged();
    } catch (error: unknown) {
      toast.error(toErrorMessage(error, "Failed to release selected scores"));
    } finally {
      setPostingSelected(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const { default: ExcelJS } = await import("exceljs");
      const exportRows: ExportRow[] = rows.map((row) => {
        const score = presentAcademicScore(row);
        return {
          "Student Name": row.fullName,
          Email: row.email ?? "",
          "Submission Status": STATUS_CONFIG[row.status].label,
          "Score (%)": score.scorePercent ?? "",
          "Base Points": row.scoreBreakdown?.basePoints ?? "",
          "Bonus Points": row.scoreBreakdown?.bonusPoints ?? "",
          "Effective Points": row.scoreBreakdown?.effectivePoints ?? "",
          "Total Points":
            row.scoreBreakdown?.possiblePoints ?? assessment.totalPoints ?? 0,
          Attempts: row.totalAttempts,
          Submitted: row.submittedAt ? formatDate(row.submittedAt) : "",
          Feedback: row.teacherFeedback ?? "",
        };
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        (assessment.title || "Assessment").slice(0, 31),
      );
      const headers = Object.keys(
        exportRows[0] || {
          "Student Name": "",
          Email: "",
          "Submission Status": "",
          "Score (%)": "",
          "Base Points": "",
          "Bonus Points": "",
          "Effective Points": "",
          "Total Points": "",
          Attempts: "",
          Submitted: "",
          Feedback: "",
        },
      );

      worksheet.addRow(headers);
      exportRows.forEach((row) => {
        worksheet.addRow(headers.map((header) => row[header] ?? ""));
      });
      worksheet.columns = headers.map((header) => {
        const maxLen = Math.max(
          header.length,
          ...exportRows.map(
            (row) => String(row[header as keyof ExportRow]).length,
          ),
        );
        return { width: Math.min(maxLen + 2, 42) };
      });

      const output = await workbook.xlsx.writeBuffer();
      downloadXlsxBuffer(
        output,
        `${assessment.title || "assessment"}_scores.xlsx`,
      );
      toast.success("Excel file downloaded");
    } catch {
      toast.error("Failed to export scores.");
    }
  };

  if (!submissions) {
    return (
      <Card className="border-slate-200 bg-white shadow-none">
        <CardContent className="py-16 text-center text-slate-600">
          <p className="mb-1 text-lg font-semibold text-slate-800">
            Scores are temporarily unavailable
          </p>
          <p className="text-sm">Use Retry above to load the score roster.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-lg border-slate-200 shadow-none">
        <CardContent className="p-0">
          <div className="space-y-4 border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Score release
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  Select reviewed submissions and release their scores in bulk.
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {FILTER_COPY[activeFilter].label}: {visibleRows.length}{" "}
                  student{visibleRows.length === 1 ? "" : "s"} in this view.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  className="min-h-10 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  Export Excel
                </Button>
                <Button
                  onClick={() => setPostSelectedOpen(true)}
                  disabled={selectedCount === 0}
                  className="min-h-10 rounded-md bg-red-700 text-white hover:bg-red-800"
                >
                  Release selected ({selectedCount})
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", counts.all],
                    ["pending", counts.pending],
                    ["posted", counts.posted],
                    ["no_submission", counts.no_submission],
                  ] as const
                ).map(([filter, count]) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                      activeFilter === filter
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span>{FILTER_COPY[filter].label}</span>
                    <span
                      className={cn(
                        "rounded-md px-2.5 py-1 text-sm font-semibold",
                        activeFilter === filter
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {selectableVisibleAttemptIds.length > 0 ? (
                <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                  />
                  Select visible awaiting-release students
                </label>
              ) : null}
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No students match this score filter yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead className="bg-slate-50/70">
                  <tr className="border-b border-slate-200">
                    <th className="w-12 px-4 py-3 text-left text-sm font-semibold text-slate-500">
                      Select
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-500">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-500">
                      Submission
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-500">
                      Latest Score
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const isSelectable =
                      row.bucket === "pending" && Boolean(row.attemptId);
                    const isSelected = row.attemptId
                      ? selectedAttemptIds.includes(row.attemptId)
                      : false;
                    const score = presentAcademicScore(row);
                    return (
                      <tr
                        key={row.studentId}
                        className="border-b border-slate-200 bg-white last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 align-top">
                          {isSelectable && row.attemptId ? (
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                              checked={isSelected}
                              onChange={() =>
                                toggleAttemptSelection(row.attemptId as string)
                              }
                              aria-label={`Select ${row.fullName}`}
                            />
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-slate-900">
                            {row.fullName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.email ?? "No email available"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {row.totalAttempts} attempt
                            {row.totalAttempts === 1 ? "" : "s"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              "inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-sm font-semibold",
                              STATUS_CONFIG[row.status].badgeColor,
                            )}
                          >
                            {STATUS_CONFIG[row.status].label}
                          </span>
                          <p className="mt-2 text-sm text-slate-500">
                            {row.submittedAt
                              ? formatDate(row.submittedAt)
                              : "No submitted timestamp"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-700">
                          {row.bucket === "pending"
                            ? "Awaiting release"
                            : row.bucket === "posted"
                              ? "Released"
                              : "No score yet"}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {score.scorePercent != null ? (
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                score.scorePercent >= 70
                                  ? "text-emerald-600"
                                  : score.scorePercent >= 40
                                    ? "text-amber-600"
                                    : "text-rose-600",
                              )}
                            >
                              {score.compactLabel}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {row.attemptId ? (
                            <Button
                              variant="outline"
                              className="min-h-10 rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              onClick={() => setPreviewAttemptId(row.attemptId)}
                            >
                              Preview
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={postSelectedOpen} onOpenChange={setPostSelectedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release selected scores</DialogTitle>
            <DialogDescription>
              Release scores for {selectedCount} selected submission
              {selectedCount === 1 ? "" : "s"}. Students will be able to see
              these scores immediately.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add shared feedback for the selected students (optional)"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPostSelectedOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePostSelected}
              disabled={postingSelected || selectedCount === 0}
            >
              {postingSelected
                ? "Releasing..."
                : `Release selected (${selectedCount})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewModal
        attemptId={previewAttemptId}
        open={!!previewAttemptId}
        onClose={() => setPreviewAttemptId(null)}
      />
    </div>
  );
}
