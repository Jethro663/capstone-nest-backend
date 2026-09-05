import { render, screen } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    getImpactPreview: jest.fn(),
    getReadiness: jest.fn(),
  },
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
    examComponents: [
      { key: "ST1", weight: 30 },
      { key: "ST2", weight: 30 },
      { key: "TE", weight: 40 },
    ],
    transmutationBands: [],
  },
  updatedAt: "2026-09-05T00:00:00Z",
  transitionConfirmationText: "TRANSITION",
};

describe("Assessment and grading settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
  });

  it("explains the active-period assessment path and renders the server policy", async () => {
    render(<Page />);

    expect(await screen.findByText("Assessment testing is available for Term 2")).toBeInTheDocument();
    expect(screen.getByText("Term 1")).toBeInTheDocument();
    expect(screen.getAllByText("Term 2").length).toBeGreaterThan(0);
    expect(screen.getByText("Term 3")).toBeInTheDocument();
    expect(screen.queryByText("Quarter 4")).not.toBeInTheDocument();
    expect(screen.getByText("Passing grade")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(
      screen.getByText(/sign in with a teacher account assigned to an active class/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Review active classes" }),
    ).toHaveAttribute("href", "/dashboard/admin/classes");
    expect(academicStateService.getImpactPreview).not.toHaveBeenCalled();
    expect(academicStateService.getReadiness).not.toHaveBeenCalled();
  });
});
