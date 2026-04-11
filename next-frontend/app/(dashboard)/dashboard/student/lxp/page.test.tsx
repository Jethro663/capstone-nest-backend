import { render, screen } from "@testing-library/react";
import StudentLxpPage from "./page";

jest.mock("@/components/student/lxp/StudentLxpExperience", () => ({
  __esModule: true,
  default: () => <div data-testid="student-lxp-experience">LXP Experience</div>,
}));

describe("StudentLxpPage", () => {
  it("renders the dedicated LXP experience page", () => {
    render(<StudentLxpPage />);

    expect(screen.getByTestId("student-lxp-experience")).toBeInTheDocument();
    expect(screen.getByText("LXP Experience")).toBeInTheDocument();
  });
});

