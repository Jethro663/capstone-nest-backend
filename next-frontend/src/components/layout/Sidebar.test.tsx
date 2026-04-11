import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/student",
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    role: "student",
    user: {
      firstName: "Liam",
      lastName: "Navarro",
      email: "liam@example.com",
    },
  }),
}));

describe("Sidebar", () => {
  it("shows both LXP and JA in student navigation", () => {
    render(<Sidebar open />);

    expect(screen.getByRole("button", { name: "LXP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JA" })).toBeInTheDocument();
  });
});

