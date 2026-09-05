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
  AcademicBackSubjectsPanel: () => <p>Learner completion panel</p>,
}));

jest.mock("@/components/admin/AcademicRecoveryPanel", () => ({
  AcademicRecoveryPanel: () => <p>Recovery panel</p>,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const current = {
  id: "state",
  schoolYear: "2026-2027",
  quarter: "Q3",
  version: 4,
  periods: [
    { key: "Q1", label: "Quarter 1" },
    { key: "Q2", label: "Quarter 2" },
    { key: "Q3", label: "Quarter 3" },
    { key: "Q4", label: "Quarter 4" },
  ],
  policy: {
    id: "deped-2026-q4-v2",
    gradeMethod: "adjusted_2026",
    periods: [
      { key: "Q1", label: "Quarter 1" },
      { key: "Q2", label: "Quarter 2" },
      { key: "Q3", label: "Quarter 3" },
      { key: "Q4", label: "Quarter 4" },
    ],
  },
  updatedAt: "2026-09-05T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};

describe("Admin system settings overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
  });

  it("makes the active state and current-period assessment rule explicit without loading advanced panels", async () => {
    render(<Page />);

    expect(await screen.findByText("Active school year")).toBeInTheDocument();
    expect(screen.getByText("2026–2027")).toBeInTheDocument();
    expect(screen.getByText("Active grading period")).toBeInTheDocument();
    expect(screen.getByText("Quarter 3")).toBeInTheDocument();
    expect(
      screen.getByText(/new student attempts must use quarter 3/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review assessment rules" }),
    ).toHaveAttribute(
      "href",
      "/dashboard/admin/system-settings/assessments-grading",
    );
    expect(academicStateService.getImpactPreview).not.toHaveBeenCalled();
    expect(screen.queryByText("Learner completion panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Recovery panel")).not.toBeInTheDocument();
  });

  it("ends loading after a current-state failure and retries only that request", async () => {
    (academicStateService.getCurrent as jest.Mock)
      .mockRejectedValueOnce(new Error("Academic state unavailable"))
      .mockResolvedValueOnce({ data: current });

    render(<Page />);

    expect(
      await screen.findByRole("alert", { name: "Academic state unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Loading the academic state…"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry current state" }),
    );

    expect(await screen.findByText("Active school year")).toBeInTheDocument();
    await waitFor(() => {
      expect(academicStateService.getCurrent).toHaveBeenCalledTimes(2);
    });
    expect(academicStateService.getImpactPreview).not.toHaveBeenCalled();
  });
});
