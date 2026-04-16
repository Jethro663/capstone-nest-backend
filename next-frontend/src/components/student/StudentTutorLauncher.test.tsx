import { fireEvent, render, screen } from "@testing-library/react";
import { StudentTutorLauncher } from "./StudentTutorLauncher";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/student/classes/class-1",
  useRouter: () => ({ push }),
}));

describe("StudentTutorLauncher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts collapsed and expands into quick actions", () => {
    render(<StudentTutorLauncher />);

    expect(screen.queryByText("Continue with Ja")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Expand AI tutor launcher" }),
    );

    expect(screen.getByText("Continue with Ja")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open JA Hub" })).toBeInTheDocument();
  });

  it("navigates to student ja when open button is clicked", () => {
    render(<StudentTutorLauncher />);

    fireEvent.click(
      screen.getByRole("button", { name: "Expand AI tutor launcher" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Open JA Hub" }));

    expect(push).toHaveBeenCalledWith("/dashboard/student/ja");
  });
});
