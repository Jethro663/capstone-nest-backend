import { render, screen } from "@testing-library/react";
import { useAdminDemoMode } from "@/providers/AdminDemoModeProvider";
import { AdminDemoModeBanner } from "./AdminDemoModeBanner";

jest.mock("@/providers/AdminDemoModeProvider", () => ({
  useAdminDemoMode: jest.fn(),
}));

describe("AdminDemoModeBanner", () => {
  it("shows one compact active notice with route-backed management", () => {
    (useAdminDemoMode as jest.Mock).mockReturnValue({
      status: {
        active: true,
        state: "active",
        expiresAt: "2026-09-12T00:15:00.000Z",
        reason: "School defense rehearsal",
      },
    });

    render(<AdminDemoModeBanner />);

    expect(screen.getByRole("status")).toHaveTextContent("Demo mode is active");
    expect(
      screen.getByRole("link", { name: "Manage Demo mode" }),
    ).toHaveAttribute("href", "/dashboard/admin/system-settings/demo-mode");
  });

  it.each(["disabled", "expired", "unavailable"])(
    "renders no global notice for %s",
    (state) => {
      (useAdminDemoMode as jest.Mock).mockReturnValue({
        status: { active: false, state },
      });
      const { container } = render(<AdminDemoModeBanner />);
      expect(container).toBeEmptyDOMElement();
    },
  );
});
