import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TeacherClassRecordWorkbook } from "./TeacherClassRecordWorkbook";
import type { TeacherClassRecordState } from "@/hooks/use-teacher-class-record";
import { modernPolicy, openCapabilities } from "@/test/academic-fixtures";
import { CLASS_RECORD_DENSITY_STORAGE_KEY } from "./class-record-visuals";
jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ role: "teacher" }),
}));
jest.mock("./AcademicAnnualSummary", () => ({
  AcademicAnnualSummary: () => <div>Annual evidence</div>,
}));

beforeEach(() => {
  window.localStorage.clear();
});

function createState(): TeacherClassRecordState {
  const record = {
    id: "record",
    classId: "class",
    gradingPeriod: "Q1" as const,
    status: "draft" as const,
    revision: 0,
  };
  return {
    classId: "class",
    policy: modernPolicy,
    classRecords: [record],
    selectedRecord: record,
    spreadsheet: {
      classRecord: record,
      policy: modernPolicy,
      academicCapabilities: openCapabilities,
      canReopen: false,
      header: {
        quarter: "Q1",
        periodLabel: "Term 1",
        subject: "Mathematics 8",
      },
      categories: [
        {
          id: "exam",
          name: "Quarterly Assessment",
          weight: 30,
          items: modernPolicy.examComponents.map((c, i) => ({
            id: c.key,
            title: c.key,
            hps: 20,
            order: i + 1,
            assessmentId: c.key === "TE" ? "assessment" : undefined,
            examComponent: c.key,
          })),
        },
      ],
      students: [
        {
          studentId: "ana",
          firstName: "Ana",
          lastName: "Santos",
          eligibility: "eligible",
          categories: [
            {
              categoryId: "exam",
              scores: [0, null, null],
              scoreStatuses: ["recorded", "missing", "excused"],
              scoreReasons: [null, null, "Medical evidence"],
              total: null,
              ps: null,
              ws: null,
            },
          ],
          initialGrade: null,
          quarterlyGrade: null,
          provisional: true,
          remarks: "Incomplete",
        },
      ],
    },
    readiness: {
      ready: false,
      classRecordId: "record",
      classId: "class",
      period: "Q1",
      eligibleStudentIds: ["ana"],
      blockers: [
        { code: "roster_unconfirmed", message: "Confirm eligibility" },
      ],
      counts: {},
    },
    roster: {
      classRecordId: "record",
      confirmedAt: null,
      confirmedBy: null,
      participants: [
        {
          studentId: "ana",
          firstName: "Ana",
          lastName: "Santos",
          eligibility: "eligible",
          reason: null,
          source: "observed",
          currentlyEnrolled: true,
        },
      ],
    },
    history: null,
    annualSummary: null,
    recordsStatus: "ready",
    spreadsheetStatus: "ready",
    quarters: ["Q1", "Q2", "Q3"],
    periodLabel: (p) =>
      modernPolicy.periods.find((v) => v.key === p)?.label ?? p,
    generating: false,
    finalizing: false,
    reopening: false,
    savingRoster: false,
    syncingItemId: null,
    editingCell: null,
    editValue: "",
    editBonusPoints: "",
    editBonusReason: "",
    editingHpsItemId: null,
    hpsValue: "",
    editRef: { current: null },
    hpsEditRef: { current: null },
    setSelectedRecordId: jest.fn(),
    setEditValue: jest.fn(),
    setEditBonusPoints: jest.fn(),
    setEditBonusReason: jest.fn(),
    setHpsValue: jest.fn(),
    setEditingCell: jest.fn(),
    refresh: jest.fn(),
    refreshEvidence: jest.fn(),
    loadHistory: jest.fn(),
    loadAnnual: jest.fn(),
    confirmRoster: jest.fn(),
    excuseScore: jest.fn(),
    restoreAssessmentEvidence: jest.fn().mockResolvedValue(true),
    generateQuarter: jest.fn(),
    finalizeQuarter: jest.fn(),
    reopenQuarter: jest.fn().mockResolvedValue(true),
    handleCellClick: jest.fn(),
    handleCellSave: jest.fn(),
    handleCellKeyDown: jest.fn(),
    handleHpsClick: jest.fn(),
    handleHpsSave: jest.fn(),
    handleHpsKeyDown: jest.fn(),
    syncItem: jest.fn(),
    exportSpreadsheet: jest.fn(),
  };
}
it("renders all three examination components and separates zero, missing and exemptions", () => {
  render(<TeacherClassRecordWorkbook state={createState()} />);
  expect(
    screen.getByRole("button", { name: "Ana Santos, ST1: 0" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Ana Santos, ST2: Missing" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Ana Santos, TE: Excused" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Finalize Term 1" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: /Q4|Term 4/ }),
  ).not.toBeInTheDocument();
});
it("restores an exempt linked result with evidence instead of overwriting it through ordinary sync", async () => {
  const state = createState();
  render(<TeacherClassRecordWorkbook state={state} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Ana Santos, TE: Excused" }),
  );
  fireEvent.change(screen.getByLabelText("Score status"), {
    target: { value: "recorded" },
  });
  fireEvent.change(screen.getByLabelText("Correction reason"), {
    target: { value: "Verified submitted quiz" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Restore assessment evidence" }),
  );
  await waitFor(() =>
    expect(state.restoreAssessmentEvidence).toHaveBeenCalledWith(
      "TE",
      "ana",
      "Verified submitted quiz",
    ),
  );
  expect(state.syncItem).not.toHaveBeenCalled();
});
it("requires a reason before reopening and disables writes when evidence is stale", async () => {
  const state = createState();
  state.spreadsheet!.canReopen = true;
  render(<TeacherClassRecordWorkbook state={state} />);
  fireEvent.click(screen.getByRole("button", { name: "Reopen with reason" }));
  expect(
    screen.getByRole("button", {
      name: "Reopen and invalidate dependent results",
    }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Correction reason"), {
    target: { value: "Correct verified score" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Reopen and invalidate dependent results",
    }),
  );
  await waitFor(() =>
    expect(state.reopenQuarter).toHaveBeenCalledWith("Correct verified score"),
  );
});
it("requires explicit bonus evidence before saving a manual score", () => {
  const state = createState();
  state.editValue = "0";
  state.editBonusPoints = "2";
  const { rerender } = render(<TeacherClassRecordWorkbook state={state} />);

  fireEvent.click(screen.getByRole("button", { name: "Ana Santos, ST1: 0" }));
  expect(screen.getByLabelText("Bonus points")).toHaveValue(2);
  expect(
    screen.getByRole("button", { name: "Save score evidence" }),
  ).toBeDisabled();

  state.editBonusReason = "Corrected teacher scoring omission";
  rerender(<TeacherClassRecordWorkbook state={state} />);
  expect(screen.getByLabelText("Bonus reason")).toHaveValue(
    "Corrected teacher scoring omission",
  );
  expect(
    screen.getByRole("button", { name: "Save score evidence" }),
  ).toBeEnabled();
});
it("disables scoring and HPS mutations after a failed readiness refresh", () => {
  const state = createState();
  state.spreadsheetStatus = "error";
  render(<TeacherClassRecordWorkbook state={state} />);
  expect(
    screen.getByRole("button", { name: "Ana Santos, ST1: 0" }),
  ).toBeDisabled();
  for (const button of screen.getAllByRole("button", { name: "20" }))
    expect(button).toBeDisabled();
});

it("presents readable workbook metadata, policy-aware navigation and semantic grade labels", () => {
  render(<TeacherClassRecordWorkbook state={createState()} />);

  expect(
    screen.getByRole("heading", { name: "Mathematics 8" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Term 1")).toHaveLength(2);
  expect(screen.getByText("Draft")).toBeInTheDocument();
  expect(screen.getByText("Revision 0")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Term 1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.queryByRole("button", { name: /Q4|Term 4/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Grades" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    screen.getByRole("tab", { name: "Review & Finalize (1)" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Record details")).toBeInTheDocument();

  const examHeading = screen.getByRole("columnheader", {
    name: /Examination · 30%/,
  });
  expect(examHeading).toHaveAttribute("data-category-tone", "exam");
  expect(
    screen.getByRole("button", { name: "Ana Santos, ST2: Missing" }),
  ).toHaveAttribute("data-score-status", "missing");
  expect(
    screen.getByRole("button", { name: "Ana Santos, TE: Excused" }),
  ).toHaveAttribute("data-score-status", "excused");

  const learnerCell = screen.getByRole("rowheader", {
    name: /Santos\s*, Ana.*Eligible/i,
  });
  expect(learnerCell).toHaveAttribute("data-surname-band", "sz");
  const learnerCard = learnerCell.querySelector("[data-learner-card]");
  expect(learnerCard).toBeInTheDocument();
  expect(learnerCard).toContainElement(learnerCell.querySelector("strong"));
});

it("supports content-only embedding without repeating workbook controls", () => {
  render(
    <TeacherClassRecordWorkbook
      state={createState()}
      presentation="content-only"
    />,
  );

  expect(
    screen.queryByRole("heading", { name: "Mathematics 8" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Refresh workbook" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Grades" })).toBeInTheDocument();
});

it("filters the loaded grade grid by learner evidence and search text", () => {
  const state = createState();
  state.spreadsheet!.students.push({
    studentId: "bea",
    firstName: "Bea",
    lastName: "Abad",
    lrn: "LRN-2002",
    eligibility: "eligible",
    categories: [
      {
        categoryId: "exam",
        scores: [18, 19, 20],
        scoreStatuses: ["recorded", "recorded", "recorded"],
        scoreReasons: [null, null, null],
        total: 57,
        ps: 95,
        ws: 28.5,
      },
    ],
    initialGrade: 93,
    quarterlyGrade: 94,
    provisional: true,
    remarks: "Passed",
  });

  render(<TeacherClassRecordWorkbook state={state} />);

  fireEvent.change(screen.getByRole("searchbox", { name: "Search learners" }), {
    target: { value: "LRN-2002" },
  });
  expect(screen.getByText("Abad")).toBeInTheDocument();
  expect(screen.queryByText("Santos")).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search learners" }), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("Filter learners"), {
    target: { value: "missing" },
  });
  expect(screen.getByText("Santos")).toBeInTheDocument();
  expect(screen.queryByText("Abad")).not.toBeInTheDocument();
  expect(screen.getByText("1 of 2 learners")).toBeInTheDocument();
});

it("defaults to comfortable density and persists a compact preference safely", async () => {
  const { unmount } = render(
    <TeacherClassRecordWorkbook state={createState()} />,
  );
  const grid = screen.getByTestId("class-record-grade-grid");
  expect(grid).toHaveAttribute("data-density", "comfortable");

  fireEvent.click(screen.getByRole("button", { name: "Use compact rows" }));
  expect(grid).toHaveAttribute("data-density", "compact");
  expect(window.localStorage.getItem(CLASS_RECORD_DENSITY_STORAGE_KEY)).toBe(
    "compact",
  );

  unmount();
  render(<TeacherClassRecordWorkbook state={createState()} />);
  await waitFor(() =>
    expect(screen.getByTestId("class-record-grade-grid")).toHaveAttribute(
      "data-density",
      "compact",
    ),
  );
});

it("resets search and filters when the selected record changes", async () => {
  const state = createState();
  state.spreadsheet!.students.push({
    ...state.spreadsheet!.students[0],
    studentId: "bea",
    firstName: "Bea",
    lastName: "Abad",
    lrn: "LRN-2002",
  });
  const { rerender } = render(<TeacherClassRecordWorkbook state={state} />);

  fireEvent.change(screen.getByRole("searchbox", { name: "Search learners" }), {
    target: { value: "LRN-2002" },
  });
  fireEvent.change(screen.getByLabelText("Filter learners"), {
    target: { value: "missing" },
  });

  const nextState = createState();
  const nextRecord = {
    ...nextState.selectedRecord!,
    id: "record-2",
    gradingPeriod: "Q2" as const,
  };
  nextState.selectedRecord = nextRecord;
  nextState.classRecords = [nextRecord];
  nextState.spreadsheet = {
    ...nextState.spreadsheet!,
    classRecord: nextRecord,
    header: {
      ...nextState.spreadsheet!.header,
      quarter: "Q2",
      periodLabel: "Term 2",
    },
  };
  rerender(<TeacherClassRecordWorkbook state={nextState} />);

  await waitFor(() =>
    expect(
      screen.getByRole("searchbox", { name: "Search learners" }),
    ).toHaveValue(""),
  );
  expect(screen.getByLabelText("Filter learners")).toHaveValue("all");
});

it("falls back safely when browser preference storage is unavailable", async () => {
  const readPreference = jest
    .spyOn(Storage.prototype, "getItem")
    .mockImplementation(() => {
      throw new Error("storage blocked");
    });
  render(<TeacherClassRecordWorkbook state={createState()} />);
  expect(screen.getByTestId("class-record-grade-grid")).toHaveAttribute(
    "data-density",
    "comfortable",
  );
  await waitFor(() => expect(readPreference).toHaveBeenCalled());
  readPreference.mockRestore();

  const savePreference = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("storage blocked");
    });
  fireEvent.click(screen.getByRole("button", { name: "Use compact rows" }));
  expect(screen.getByTestId("class-record-grade-grid")).toHaveAttribute(
    "data-density",
    "compact",
  );
  savePreference.mockRestore();
});

it("keeps ineligible scores unavailable and preserves assessment sync", () => {
  const ineligibleState = createState();
  ineligibleState.spreadsheet!.students[0].eligibility = "transferred";
  const { unmount } = render(
    <TeacherClassRecordWorkbook state={ineligibleState} />,
  );
  expect(
    screen.getByRole("button", { name: "Ana Santos, ST1: Unavailable" }),
  ).toBeDisabled();
  unmount();

  const syncState = createState();
  render(<TeacherClassRecordWorkbook state={syncState} />);
  fireEvent.click(screen.getByRole("button", { name: "Sync result" }));
  expect(syncState.syncItem).toHaveBeenCalledWith("TE");
});

it("keeps readiness-gated finalization and visible provisional and legacy states", async () => {
  const finalizeState = createState();
  finalizeState.readiness = {
    ...finalizeState.readiness!,
    ready: true,
    blockers: [],
  };
  const { unmount } = render(
    <TeacherClassRecordWorkbook state={finalizeState} />,
  );
  const provisional = screen
    .getByText(/Provisional · Incomplete/)
    .closest("td");
  expect(provisional).toHaveAttribute("data-grade-status", "provisional");
  fireEvent.click(screen.getByRole("button", { name: "Finalize Term 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Finalize period" }));
  await waitFor(() => expect(finalizeState.finalizeQuarter).toHaveBeenCalled());
  unmount();

  const legacyState = createState();
  legacyState.spreadsheet!.students[0].provisional = false;
  legacyState.spreadsheet!.students[0].gradeProvenance = "legacy_unverified";
  legacyState.spreadsheet!.students[0].quarterlyGrade = 82;
  legacyState.spreadsheet!.students[0].remarks = "Passed";
  legacyState.spreadsheet!.classRecord.status = "finalized";
  render(<TeacherClassRecordWorkbook state={legacyState} />);
  expect(
    screen.getByText(/Legacy unverified · Passed/).closest("td"),
  ).toHaveAttribute("data-grade-status", "legacy");
});

it("labels finalized grades and eligibility states without relying on color", () => {
  const finalizedState = createState();
  finalizedState.spreadsheet!.students[0].provisional = false;
  finalizedState.spreadsheet!.students[0].gradeProvenance = "verified_revision";
  finalizedState.spreadsheet!.students[0].quarterlyGrade = 82;
  finalizedState.spreadsheet!.students[0].remarks = "Passed";
  finalizedState.spreadsheet!.classRecord.status = "finalized";
  finalizedState.spreadsheet!.classRecord.revision = 1;
  render(<TeacherClassRecordWorkbook state={finalizedState} />);

  expect(screen.getByText(/Finalized · Passed/).closest("td")).toHaveAttribute(
    "data-grade-status",
    "verified",
  );

  fireEvent.click(screen.getByRole("tab", { name: "Eligibility" }));
  expect(screen.getByLabelText("Eligibility for Ana Santos")).toHaveAttribute(
    "data-eligibility-status",
    "eligible",
  );
});
