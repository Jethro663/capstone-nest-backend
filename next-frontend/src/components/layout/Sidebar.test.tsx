import { render, screen, waitFor } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const mockUseAuth = jest.fn();
const mockGetPendingCount = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/student",
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/services/lxp-service", () => ({
  lxpService: {
    getTeacherPendingInterventionCount: () => mockGetPendingCount(),
  },
}));

describe("Sidebar", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      role: "student",
      user: {
        id: "student-1",
        firstName: "Liam",
        lastName: "Navarro",
        email: "liam@example.com",
      },
    });
    mockGetPendingCount.mockResolvedValue({ data: { pendingCount: 0 } });
  });

  it("shows both LXP and JA in student navigation", () => {
    render(<Sidebar open />);

    expect(screen.getByRole("button", { name: "LXP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JA" })).toBeInTheDocument();
  });

  it("shows intervention badge count for teacher shell", async () => {
    mockUseAuth.mockReturnValue({
      role: "teacher",
      user: {
        id: "teacher-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
    });
    mockGetPendingCount.mockResolvedValue({ data: { pendingCount: 4 } });

    render(<Sidebar open shellRole="teacher" />);

    const interventionsButton = await screen.findByRole("button", {
      name: /Interventions/i,
    });

    await waitFor(() => {
      expect(interventionsButton).toHaveTextContent("4");
    });
  });
});
