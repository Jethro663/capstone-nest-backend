import { render, screen } from "@testing-library/react";
import Page from "./page";
import { academicStateService } from "@/services/academic-state-service";

jest.mock("@/services/academic-state-service", () => ({
  academicStateService: { getCurrent: jest.fn() },
}));

jest.mock("@/components/admin/AcademicBackSubjectsPanel", () => ({
  AcademicBackSubjectsPanel: () => <p>Learner completion operations</p>,
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

describe("Learner completion settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (academicStateService.getCurrent as jest.Mock).mockResolvedValue({
      data: current,
    });
  });

  it("mounts learner operations only inside their dedicated route", async () => {
    render(<Page />);

    expect(await screen.findByText("Learner completion")).toBeInTheDocument();
    expect(
      screen.getByText(/back-subject evidence and grade 10 completion decisions/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Learner completion operations")).toBeInTheDocument();
    expect(academicStateService.getCurrent).toHaveBeenCalledTimes(1);
  });
});
