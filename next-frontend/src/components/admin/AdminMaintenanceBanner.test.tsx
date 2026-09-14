import { render, screen } from "@testing-library/react";
import { AdminMaintenanceBanner } from "./AdminMaintenanceBanner";

let mockStatus: Record<string, unknown> | null = null;

jest.mock("@/providers/AdminMaintenanceProvider", () => ({
  useAdminMaintenance: () => ({ status: mockStatus }),
}));

describe("AdminMaintenanceBanner", () => {
  beforeEach(() => {
    mockStatus = null;
  });

  it("stays visible for an active manual switch with no expiry", () => {
    mockStatus = {
      active: true,
      mode: "manual",
      expiresAt: null,
    };

    render(<AdminMaintenanceBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /remains on until you turn it off, sign out, or change the account password/i,
    );
  });

  it("remains hidden while Maintenance Access is off", () => {
    mockStatus = { active: false, mode: null, expiresAt: null };

    render(<AdminMaintenanceBanner />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
