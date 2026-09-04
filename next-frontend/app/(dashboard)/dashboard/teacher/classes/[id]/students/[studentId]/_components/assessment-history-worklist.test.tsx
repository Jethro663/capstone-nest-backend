"use client";

import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  TeacherClassStudentOverview,
  TeacherStudentAssessmentHistoryItem,
} from "@/types/class";
import {
  AssessmentHistoryWorklist,
  type AssessmentHistoryView,
} from "./assessment-history-worklist";

function makeHistoryItem(
  id: string,
  overrides: Partial<TeacherStudentAssessmentHistoryItem> = {},
): TeacherStudentAssessmentHistoryItem {
  return {
    assessmentId: id,
    title: `Assessment ${id}`,
    type: "quiz",
    dueDate: "2026-09-20T00:00:00.000Z",
    status: "not_started",
    statusLabel: "Not Started",
    submittedAt: null,
    returnedAt: null,
    isLate: false,
    lateByMinutes: 0,
    score: null,
    directScore: null,
    totalPoints: 10,
    passed: null,
    isReturned: false,
    ...overrides,
  };
}

function makeHistory(): TeacherClassStudentOverview["history"] {
  return {
    pending: Array.from({ length: 12 }, (_, index) =>
      makeHistoryItem(`pending-${index + 1}`, {
        title: `Pending assessment ${index + 1}`,
        dueDate: new Date(Date.UTC(2026, 8, 10 + index)).toISOString(),
      }),
    ),
    late: [
      makeHistoryItem("late-1", {
        title: "Late assessment",
        status: "late",
        statusLabel: "Late",
        submittedAt: "2026-09-08T00:00:00.000Z",
        dueDate: "2026-09-07T00:00:00.000Z",
        isLate: true,
      }),
    ],
    finished: [
      makeHistoryItem("finished-1", {
        title: "Older finished assessment",
        status: "finished",
        statusLabel: "Returned",
        submittedAt: "2026-08-20T00:00:00.000Z",
        dueDate: "2026-08-21T00:00:00.000Z",
        score: 80,
        scorePercent: 80,
        scoreBreakdown: {
          basePoints: 8,
          bonusPoints: 0,
          awardedPoints: 8,
          possiblePoints: 10,
          effectivePoints: 8,
          scorePercent: 80,
          wasCapped: false,
          bonusReason: null,
        },
        isReturned: true,
      }),
      makeHistoryItem("finished-2", {
        title: "Newest finished assessment",
        status: "finished",
        statusLabel: "Submitted",
        submittedAt: "2026-08-29T00:00:00.000Z",
        dueDate: "2026-08-30T00:00:00.000Z",
        score: 90,
        scorePercent: 90,
        scoreBreakdown: {
          basePoints: 9,
          bonusPoints: 0,
          awardedPoints: 9,
          possiblePoints: 10,
          effectivePoints: 9,
          scorePercent: 90,
          wasCapped: false,
          bonusReason: null,
        },
      }),
    ],
  };
}

function renderWorklist({
  history = makeHistory(),
  activeView = "attention",
  requestedPage = 1,
  onViewChange = jest.fn(),
  onPageChange = jest.fn(),
}: {
  history?: TeacherClassStudentOverview["history"];
  activeView?: AssessmentHistoryView;
  requestedPage?: number;
  onViewChange?: jest.Mock;
  onPageChange?: jest.Mock;
} = {}) {
  render(
    <AssessmentHistoryWorklist
      history={history}
      activeView={activeView}
      requestedPage={requestedPage}
      onViewChange={onViewChange}
      onPageChange={onPageChange}
    />,
  );

  return { onViewChange, onPageChange };
}

describe("AssessmentHistoryWorklist", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-15T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("defaults to a ten-row needs-attention page ordered by urgency", () => {
    renderWorklist();

    expect(
      screen.getByRole("tab", { name: /Needs attention 13/i }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("Showing 1–10 of 13")).toBeInTheDocument();
    expect(screen.getByText("Pending assessment 1")).toBeInTheDocument();
    expect(screen.queryByText("Pending assessment 12")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Newest finished assessment"),
    ).not.toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      within(rows[0]).getByText("Pending assessment 1"),
    ).toBeInTheDocument();
    expect(within(rows[0]).getByText("Overdue")).toBeInTheDocument();
    expect(within(rows[5]).getByText("Late assessment")).toBeInTheDocument();
  });

  it("shows the second attention page and emits page changes", () => {
    const { onPageChange } = renderWorklist({ requestedPage: 2 });

    expect(screen.getByText("Showing 11–13 of 13")).toBeInTheDocument();
    expect(screen.getByText("Pending assessment 10")).toBeInTheDocument();
    expect(screen.getByText("Pending assessment 12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1, "push");
  });

  it("changes views, resets pagination, and sorts finished work newest first", () => {
    const { onViewChange } = renderWorklist({ activeView: "finished" });

    const rows = screen.getAllByRole("row").slice(1);
    expect(
      within(rows[0]).getByText("Newest finished assessment"),
    ).toBeInTheDocument();
    expect(within(rows[0]).getByText("9/10 · 90%")).toBeInTheDocument();
    expect(
      within(rows[0]).getByRole("link", { name: "Open assessment" }),
    ).toHaveAttribute("href", "/dashboard/teacher/assessments/finished-2");

    fireEvent.click(screen.getByRole("tab", { name: /All 15/i }));
    expect(onViewChange).toHaveBeenCalledWith("all");
  });

  it("supports arrow-key navigation between tabs", () => {
    const { onViewChange } = renderWorklist();
    const attentionTab = screen.getByRole("tab", { name: /Needs attention/ });
    const finishedTab = screen.getByRole("tab", { name: /Finished/ });

    attentionTab.focus();
    fireEvent.keyDown(attentionTab, { key: "ArrowRight" });

    expect(onViewChange).toHaveBeenCalledWith("finished");
    expect(finishedTab).toHaveFocus();
  });

  it("canonicalizes an out-of-range page", () => {
    const { onPageChange } = renderWorklist({ requestedPage: 99 });

    expect(onPageChange).toHaveBeenCalledWith(2, "replace");
    expect(screen.getByText("Showing 11–13 of 13")).toBeInTheDocument();
  });

  it.each([
    ["attention", "No assessments need attention."],
    ["finished", "No finished assessments yet."],
    ["all", "No assessments found."],
  ] as const)("shows the %s empty state", (activeView, message) => {
    renderWorklist({
      history: { finished: [], late: [], pending: [] },
      activeView,
    });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
