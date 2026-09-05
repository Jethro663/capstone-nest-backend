import { fireEvent, render, screen } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    getReadiness: jest.fn(),
  },
}));

jest.mock("@/components/admin/AcademicRecoveryPanel", () => ({
  AcademicRecoveryPanel: ({ schoolYear }: { schoolYear?: string }) => (
    <p>Recovery operations for {schoolYear}</p>
  ),
}));

const current = {
  id: "state",
  schoolYear: "2026-2027",
  quarter: "Q3",
  version: 4,
  periods: [{ key: "Q3", label: "Quarter 3" }],
  policy: {
    id: "policy",
    schoolYear: "2026-2027",
    gradeMethod: "adjusted_2026",
    passingGrade: 75,
    conditionalPromotion: true,
    annualRounding: "half_up",
    periods: [{ key: "Q3", label: "Quarter 3" }],
    examComponents: [],
    transmutationBands: [],
  },
  updatedAt: "2026-09-05T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};

const readiness = {
  schoolYear: "2026-2027",
  activePeriod: "Q3",
  version: 4,
  transitionBlocked: true,
  message: "Resolve blockers",
  blockers: [],
  classReadiness: [{ classId: "class-1", subjectName: "Mathematics" }],
};

describe("Audit and recovery settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
    (academicStateService.getReadiness as jest.Mock).mockResolvedValue({
      data: readiness,
    });
  });

  it("mounts recovery operations only after current state and readiness load", async () => {
    render(<Page />);

    expect(await screen.findByText("Audit & recovery")).toBeInTheDocument();
    expect(
      screen.getByText(/advanced operations can change official academic evidence/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Recovery operations for 2026-2027"),
    ).toBeInTheDocument();
    expect(academicStateService.getReadiness).toHaveBeenCalledTimes(1);
  });

  it("keeps the current state visible and retries a readiness-only failure", async () => {
    (academicStateService.getReadiness as jest.Mock)
      .mockRejectedValueOnce(new Error("Readiness unavailable"))
      .mockResolvedValueOnce({ data: readiness });

    render(<Page />);

    expect(await screen.findByText("School year 2026–2027")).toBeInTheDocument();
    expect(
      await screen.findByRole("alert", { name: "Readiness unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Recovery operations for 2026-2027"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry readiness" }));
    expect(
      await screen.findByText("Recovery operations for 2026-2027"),
    ).toBeInTheDocument();
    expect(academicStateService.getCurrent).toHaveBeenCalledTimes(1);
    expect(academicStateService.getReadiness).toHaveBeenCalledTimes(2);
  });
});
