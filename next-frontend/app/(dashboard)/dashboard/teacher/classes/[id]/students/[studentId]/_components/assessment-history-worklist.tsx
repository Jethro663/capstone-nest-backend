"use client";

import { useEffect, useMemo, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  TeacherClassStudentOverview,
  TeacherStudentAssessmentHistoryItem,
} from "@/types/class";
import { presentAcademicScore } from "@/lib/academic-score";

const PAGE_SIZE = 10;

export type AssessmentHistoryView = "attention" | "finished" | "all";
type HistoryTone = "finished" | "late" | "pending" | "overdue";
type PageChangeMode = "push" | "replace";

interface AssessmentHistoryWorklistProps {
  history: TeacherClassStudentOverview["history"];
  activeView: AssessmentHistoryView;
  requestedPage: number;
  onViewChange: (view: AssessmentHistoryView) => void;
  onPageChange: (page: number, mode: PageChangeMode) => void;
}

interface HistoryRow {
  item: TeacherStudentAssessmentHistoryItem;
  tone: HistoryTone;
}

const EMPTY_MESSAGES: Record<AssessmentHistoryView, string> = {
  attention: "No assessments need attention.",
  finished: "No finished assessments yet.",
  all: "No assessments found.",
};

function timestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDate(value?: string | null) {
  const parsed = timestamp(value);
  if (parsed === null) return "--";
  return new Date(parsed).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettifyType(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getTone(item: TeacherStudentAssessmentHistoryItem): HistoryTone {
  if (item.status === "finished") return "finished";
  if (item.status === "late" || item.isLate) return "late";

  const dueAt = timestamp(item.dueDate);
  if (!item.submittedAt && dueAt !== null && dueAt < Date.now()) {
    return "overdue";
  }

  return "pending";
}

function dueTime(row: HistoryRow) {
  return timestamp(row.item.dueDate);
}

function sortAttention(left: HistoryRow, right: HistoryRow) {
  const priority: Record<HistoryTone, number> = {
    overdue: 0,
    late: 1,
    pending: 2,
    finished: 3,
  };
  const priorityDifference = priority[left.tone] - priority[right.tone];
  if (priorityDifference !== 0) return priorityDifference;

  const leftDue = dueTime(left);
  const rightDue = dueTime(right);
  if (leftDue === null) return rightDue === null ? 0 : 1;
  if (rightDue === null) return -1;
  return leftDue - rightDue;
}

function sortNewest(left: HistoryRow, right: HistoryRow) {
  const leftDue = dueTime(left);
  const rightDue = dueTime(right);
  if (leftDue === null) return rightDue === null ? 0 : 1;
  if (rightDue === null) return -1;
  return rightDue - leftDue;
}

function pageNumbers(currentPage: number, totalPages: number) {
  const visibleCount = Math.min(5, totalPages);
  const start = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - visibleCount + 1),
  );
  return Array.from({ length: visibleCount }, (_, index) => start + index);
}

function scoreLabel(item: TeacherStudentAssessmentHistoryItem) {
  const score = presentAcademicScore(item);
  return score.scorePercent === null ? "--" : score.compactLabel;
}

export function AssessmentHistoryWorklist({
  history,
  activeView,
  requestedPage,
  onViewChange,
  onPageChange,
}: AssessmentHistoryWorklistProps) {
  const collections = useMemo(() => {
    const finished = history.finished.map((item) => ({
      item,
      tone: getTone(item),
    }));
    const attention = [...history.pending, ...history.late]
      .map((item) => ({ item, tone: getTone(item) }))
      .sort(sortAttention);
    const all = [...attention, ...finished].sort(sortNewest);

    return { attention, finished: finished.sort(sortNewest), all };
  }, [history]);

  const rows = collections[activeView];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleRows = rows.slice(startIndex, startIndex + PAGE_SIZE);
  const endIndex = Math.min(startIndex + PAGE_SIZE, rows.length);

  useEffect(() => {
    if (requestedPage !== safePage) {
      onPageChange(safePage, "replace");
    }
  }, [onPageChange, requestedPage, safePage]);

  const tabs: Array<{
    value: AssessmentHistoryView;
    label: string;
    count: number;
  }> = [
    {
      value: "attention",
      label: "Needs attention",
      count: collections.attention.length,
    },
    {
      value: "finished",
      label: "Finished",
      count: collections.finished.length,
    },
    { value: "all", label: "All", count: collections.all.length },
  ];

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight")
      nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex];
    nextTab?.focus();
    onViewChange(tabs[nextIndex].value);
  }

  return (
    <section
      className="teacher-student-overview__history-panel"
      aria-labelledby="assessment-history-heading"
    >
      <header className="teacher-student-overview__history-heading">
        <div>
          <p>Student work</p>
          <h2 id="assessment-history-heading">Assessment History</h2>
        </div>
        <span>{collections.all.length} total</span>
      </header>

      <div
        className="teacher-student-overview__history-tabs"
        role="tablist"
        aria-label="Assessment history views"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            id={`history-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-controls="assessment-history-panel"
            aria-selected={activeView === tab.value}
            tabIndex={activeView === tab.value ? 0 : -1}
            onClick={() => onViewChange(tab.value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span>{tab.label}</span>
            <strong>{tab.count}</strong>
          </button>
        ))}
      </div>

      <div
        id="assessment-history-panel"
        className="teacher-student-overview__history-content"
        role="tabpanel"
        aria-labelledby={`history-tab-${activeView}`}
      >
        {rows.length === 0 ? (
          <div className="teacher-student-overview__empty-state">
            <p>{EMPTY_MESSAGES[activeView]}</p>
            <span>
              Choose another history view to review this student&apos;s work.
            </span>
          </div>
        ) : (
          <>
            <div className="teacher-student-overview__table-wrap">
              <table className="teacher-student-overview__history-table">
                <thead>
                  <tr>
                    <th scope="col">Assessment</th>
                    <th scope="col">Due</th>
                    <th scope="col">Submission</th>
                    <th scope="col">Status</th>
                    <th scope="col">Score</th>
                    <th scope="col">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ item, tone }) => (
                    <tr key={`${tone}-${item.assessmentId}`} data-tone={tone}>
                      <td data-label="Assessment">
                        <strong>{item.title}</strong>
                        <small>{prettifyType(item.type)}</small>
                      </td>
                      <td data-label="Due">{formatDate(item.dueDate)}</td>
                      <td data-label="Submission">
                        {item.submittedAt
                          ? formatDate(item.submittedAt)
                          : "Not submitted"}
                      </td>
                      <td data-label="Status">
                        <span
                          className="teacher-student-overview__history-status"
                          data-tone={tone}
                        >
                          {tone === "overdue" ? "Overdue" : item.statusLabel}
                        </span>
                      </td>
                      <td data-label="Score">
                        <strong>{scoreLabel(item)}</strong>
                      </td>
                      <td data-label="Action">
                        <Link
                          href={`/dashboard/teacher/assessments/${item.assessmentId}`}
                          className="teacher-student-overview__history-action"
                          aria-label="Open assessment"
                        >
                          Open
                          <ArrowUpRight aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="teacher-student-overview__pagination">
              <p>
                Showing {startIndex + 1}–{endIndex} of {rows.length}
              </p>
              <div className="teacher-student-overview__pagination-controls">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => onPageChange(safePage - 1, "push")}
                >
                  <ChevronLeft aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <div
                  className="teacher-student-overview__page-numbers"
                  aria-label="Pages"
                >
                  {pageNumbers(safePage, totalPages).map((page) => (
                    <button
                      key={page}
                      type="button"
                      aria-label={`Page ${page}`}
                      aria-current={page === safePage ? "page" : undefined}
                      onClick={() => onPageChange(page, "push")}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <span className="teacher-student-overview__mobile-page">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage >= totalPages}
                  onClick={() => onPageChange(safePage + 1, "push")}
                >
                  <span>Next</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}
