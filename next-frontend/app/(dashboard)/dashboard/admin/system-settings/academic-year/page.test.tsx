import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    previewActivation: jest.fn(),
    activatePeriod: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const current = {
  id: "state",
  schoolYear: "2026-2027",
  quarter: "Q2",
  version: 7,
  periods: [
    { key: "Q1", label: "Term 1" },
    { key: "Q2", label: "Term 2" },
    { key: "Q3", label: "Term 3" },
  ],
  policy: {
    id: "deped-2026-term-v1",
    gradeMethod: "adjusted_2026",
    periods: [
      { key: "Q1", label: "Term 1" },
      { key: "Q2", label: "Term 2" },
      { key: "Q3", label: "Term 3" },
    ],
  },
  updatedAt: "2026-09-05T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};

describe("Academic year settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
    (academicStateService.previewActivation as jest.Mock).mockResolvedValue({
      data: {
        state: current,
        target: current.periods[2],
        overrideRequired: false,
        alreadyActive: false,
        currentOpenRecords: 2,
        targetMissingRecords: 3,
        ongoingAttempts: 1,
        details: [],
        message: "No record is automatically finalized or reopened.",
      },
    });
    (academicStateService.activatePeriod as jest.Mock).mockResolvedValue({
      data: { ...current, quarter: "Q3", version: 8 },
    });
  });

  it("uses only the server-provided periods and preserves preview and password safeguards", async () => {
    render(<Page />);

    expect(await screen.findByText("Active period: Term 2")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Term 3" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Quarter 4" })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Preview period change" }),
    );
    expect(
      await screen.findByText("No record is automatically finalized or reopened."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activate Term 3" }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Password for period activation"), {
      target: { value: "invented-test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Activate Term 3" }));

    await waitFor(() => {
      expect(academicStateService.activatePeriod).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedSchoolYear: "2026-2027",
          expectedQuarter: "Q2",
          expectedVersion: 7,
          targetQuarter: "Q3",
          currentPassword: "invented-test-password",
          requestId: expect.any(String),
        }),
      );
    });
  });

  it("requires an explicit authorization and reason for a backward correction", async () => {
    (academicStateService.previewActivation as jest.Mock).mockResolvedValue({
      data: {
        state: current,
        target: current.periods[0],
        overrideRequired: true,
        alreadyActive: false,
        currentOpenRecords: 2,
        targetMissingRecords: 0,
        ongoingAttempts: 0,
        details: [],
        message: "This is a backward period correction.",
      },
    });

    render(<Page />);
    await screen.findByText("Active period: Term 2");
    fireEvent.change(screen.getByLabelText("Target period"), {
      target: { value: "Q1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Preview period change" }),
    );

    expect(
      await screen.findByText("This is a backward period correction."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Password for period activation"), {
      target: { value: "invented-test-password" },
    });
    expect(
      screen.getByRole("button", { name: "Activate Term 1" }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(/authorize this backward or skipped-period correction/i),
    );
    fireEvent.change(screen.getByLabelText("Correction reason"), {
      target: { value: "Official calendar correction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Activate Term 1" }));

    await waitFor(() => {
      expect(academicStateService.activatePeriod).toHaveBeenCalledWith(
        expect.objectContaining({
          override: true,
          reason: "Official calendar correction",
          targetQuarter: "Q1",
        }),
      );
    });
  });
});
