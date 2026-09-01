import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    getImpactPreview: jest.fn(),
    previewActivation: jest.fn(),
    activatePeriod: jest.fn(),
    transition: jest.fn(),
    notifyTeachers: jest.fn(),
  },
}));
jest.mock("@/components/admin/AcademicBackSubjectsPanel", () => ({
  AcademicBackSubjectsPanel: () => null,
}));
jest.mock("@/components/admin/AcademicRecoveryPanel", () => ({
  AcademicRecoveryPanel: () => null,
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const current = {
  id: "state",
  schoolYear: "2026-2027",
  quarter: "Q1",
  version: 4,
  periods: [
    { key: "Q1", label: "Quarter 1" },
    { key: "Q2", label: "Quarter 2" },
    { key: "Q3", label: "Quarter 3" },
    { key: "Q4", label: "Quarter 4" },
  ],
  policy: { id: "deped-2026-q4-v2", gradeMethod: "adjusted_2026" },
  updatedAt: "2026-08-31T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};
beforeEach(() => {
  jest.clearAllMocks();
  (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
    data: current,
  });
  (academicStateService.getImpactPreview as jest.Mock).mockResolvedValue({
    data: {
      current,
      target: { schoolYear: "2027-2028", quarter: "Q1" },
      transitionConfirmationText: "TRANSITION",
      impact: {
        classesToArchive: 1,
        sectionsToArchive: 1,
        enrollmentsToComplete: 1,
        reusableClassesToCreate: 1,
        reusableSectionsToCreate: 1,
        promotionReadiness: {
          transitionBlocked: true,
          message: "Resolve missing grades",
          expectedPeriodRecords: 4,
          finalizedPeriodRecords: 1,
          expectedAnnualGrades: 1,
          blockers: [
            {
              code: "missing_period_record",
              message: "Mathematics: Quarter 2 requires one class record.",
              classId: "class-1",
            },
          ],
          classReadiness: [{ classId: "class-1", subjectName: "Mathematics" }],
        },
      },
    },
  });
  (academicStateService.previewActivation as jest.Mock).mockResolvedValue({
    data: {
      state: current,
      target: current.periods[1],
      overrideRequired: false,
      alreadyActive: false,
      currentOpenRecords: 1,
      targetMissingRecords: 1,
      ongoingAttempts: 2,
      details: [],
      message: "No record is automatically finalized.",
    },
  });
});
it("shows Quarter 1-4 and keeps a blocked transition unavailable with an actionable destination", async () => {
  render(<Page />);
  expect(await screen.findByLabelText("Target period")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Quarter 4" })).toBeInTheDocument();
  await screen.findByText("Mathematics: Quarter 2 requires one class record.");
  expect(
    screen.getByRole("button", { name: "Review year transition" }),
  ).toBeDisabled();
  expect(screen.getByRole("link", { name: "Open workbook" })).toHaveAttribute(
    "href",
    "/dashboard/admin/academic-records/class-1",
  );
  expect(academicStateService.getImpactPreview).toHaveBeenCalledWith({
    schoolYear: "2027-2028",
  });
  expect(academicStateService.activatePeriod).not.toHaveBeenCalled();
});
it("requires preview and password, then submits the exact observed activation version", async () => {
  (academicStateService.activatePeriod as jest.Mock).mockResolvedValue({
    data: { ...current, quarter: "Q2", version: 5 },
  });
  render(<Page />);
  await screen.findByLabelText("Target period");
  fireEvent.click(
    screen.getByRole("button", { name: "Preview period change" }),
  );
  await screen.findByText("No record is automatically finalized.");
  expect(
    screen.getByRole("button", { name: "Activate Quarter 2" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Password for period activation"), {
    target: { value: "invented-test-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Activate Quarter 2" }));
  await waitFor(() =>
    expect(academicStateService.activatePeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedSchoolYear: "2026-2027",
        expectedQuarter: "Q1",
        expectedVersion: 4,
        targetQuarter: "Q2",
        requestId: expect.any(String),
      }),
    ),
  );
  expect(academicStateService.transition).not.toHaveBeenCalled();
});
