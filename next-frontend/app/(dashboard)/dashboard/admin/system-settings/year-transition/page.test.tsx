import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    getImpactPreview: jest.fn(),
    notifyTeachers: jest.fn(),
    transition: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const current = {
  id: "state",
  schoolYear: "2026-2027",
  quarter: "Q3",
  version: 7,
  periods: [
    { key: "Q1", label: "Term 1" },
    { key: "Q2", label: "Term 2" },
    { key: "Q3", label: "Term 3" },
  ],
  policy: {
    id: "policy",
    schoolYear: "2026-2027",
    gradeMethod: "adjusted_2026",
    passingGrade: 75,
    conditionalPromotion: true,
    annualRounding: "half_up",
    periods: [
      { key: "Q1", label: "Term 1" },
      { key: "Q2", label: "Term 2" },
      { key: "Q3", label: "Term 3" },
    ],
    examComponents: [],
    transmutationBands: [],
  },
  updatedAt: "2026-09-05T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};

const blockedPreview = {
  current,
  target: { schoolYear: "2027-2028", quarter: "Q1" },
  transitionConfirmationText: "TRANSITION 2026-2027 TO 2027-2028",
  impact: {
    classesToArchive: 2,
    sectionsToArchive: 1,
    enrollmentsToComplete: 5,
    reusableClassesToCreate: 2,
    reusableSectionsToCreate: 1,
    assessmentPeriodSources: [],
    destinationPeriods: current.periods,
    promotionReadiness: {
      transitionBlocked: true,
      message: "Resolve academic blockers before transition.",
      expectedPeriodRecords: 12,
      finalizedPeriodRecords: 4,
      expectedAnnualGrades: 3,
      blockers: [
        {
          code: "missing_period_record",
          message: "Mathematics needs Term 2.",
          classId: "class-1",
          studentId: "student-secret-1",
        },
        {
          code: "missing_period_record",
          message: "Science needs Term 2.",
          classId: "class-1",
          studentId: "student-secret-2",
        },
      ],
      classReadiness: [],
    },
  },
};

describe("Year transition settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
    (academicStateService.getImpactPreview as jest.Mock).mockResolvedValue({
      data: blockedPreview,
    });
    (academicStateService.notifyTeachers as jest.Mock).mockResolvedValue({
      data: { message: "Teachers notified." },
    });
    (academicStateService.transition as jest.Mock).mockResolvedValue({
      data: {},
    });
  });

  it("keeps a valid active state visible when only the transition preview fails", async () => {
    (academicStateService.getImpactPreview as jest.Mock).mockRejectedValueOnce(
      new Error("Preview service unavailable"),
    );

    render(<Page />);

    expect(await screen.findByText("Current school year: 2026–2027")).toBeInTheDocument();
    expect(
      await screen.findByRole("alert", {
        name: "Preview service unavailable",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Term 3 is still active.")).toBeInTheDocument();
    expect(academicStateService.getCurrent).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Retry transition preview" }),
    );
    expect(
      await screen.findByText("Resolve academic blockers before transition."),
    ).toBeInTheDocument();
    expect(academicStateService.getCurrent).toHaveBeenCalledTimes(1);
    expect(academicStateService.getImpactPreview).toHaveBeenCalledTimes(2);
  });

  it("groups blockers without displaying raw learner identifiers", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(<Page />);

    expect(
      await screen.findByText("Resolve academic blockers before transition."),
    ).toBeInTheDocument();
    expect(screen.getByText("Missing period record")).toBeInTheDocument();
    expect(screen.getByText("2 issues")).toBeInTheDocument();
    expect(screen.queryByText("student-secret-1")).not.toBeInTheDocument();
    expect(screen.queryByText("student-secret-2")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open workbook" })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Review year transition" }),
    ).toBeDisabled();
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes("same key"),
      ),
    ).toBe(false);
    consoleError.mockRestore();
  });

  it("preserves destination mapping, password, and exact confirmation safeguards", async () => {
    const readyPreview = {
      ...blockedPreview,
      impact: {
        ...blockedPreview.impact,
        assessmentPeriodSources: ["Q4"],
        promotionReadiness: {
          ...blockedPreview.impact.promotionReadiness,
          transitionBlocked: false,
          message: "The school year is ready to transition.",
          blockers: [],
          studentsToPromote: 3,
          studentsToRetain: 0,
          studentsToGraduate: 1,
          studentsToConditionallyPromote: 0,
          studentsPendingCompletion: 0,
        },
      },
    };
    (academicStateService.getImpactPreview as jest.Mock).mockResolvedValue({
      data: readyPreview,
    });

    render(<Page />);
    await screen.findByText("The school year is ready to transition.");
    fireEvent.click(
      screen.getByRole("button", { name: "Review year transition" }),
    );

    const confirm = screen.getByRole("button", {
      name: "Confirm year transition",
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Destination period for Q4"), {
      target: { value: "Q3" },
    });
    fireEvent.change(screen.getByLabelText("Admin password"), {
      target: { value: "invented-test-password" },
    });
    fireEvent.change(
      screen.getByLabelText(
        "Type TRANSITION 2026-2027 TO 2027-2028",
      ),
      {
        target: { value: "TRANSITION 2026-2027 TO 2027-2028" },
      },
    );
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(academicStateService.transition).toHaveBeenCalledWith({
        schoolYear: "2027-2028",
        expectedSchoolYear: "2026-2027",
        expectedQuarter: "Q3",
        expectedVersion: 7,
        currentPassword: "invented-test-password",
        confirmationText: "TRANSITION 2026-2027 TO 2027-2028",
        assessmentPeriodMapping: { Q4: "Q3" },
      });
    });
  });
});
