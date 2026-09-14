import { render, screen, waitFor } from "@testing-library/react";
import { adminMaintenanceService } from "@/services/admin-maintenance-service";
import {
  AdminMaintenanceProvider,
  useAdminMaintenance,
} from "./AdminMaintenanceProvider";

jest.mock("@/services/admin-maintenance-service", () => ({
  adminMaintenanceService: {
    getStatus: jest.fn(),
    open: jest.fn(),
    close: jest.fn(),
  },
}));
jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ role: "admin" }),
}));

function Consumer() {
  const { status, loading, error } = useAdminMaintenance();
  return (
    <p>
      {loading
        ? "loading"
        : !status
          ? "unknown"
          : status.active
            ? "active"
            : "inactive"}
      {error ? `:${error}` : ""}
    </p>
  );
}

describe("AdminMaintenanceProvider", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads the actor-bound server status without assuming access", async () => {
    (adminMaintenanceService.getStatus as jest.Mock).mockResolvedValue({
      available: true,
      active: true,
      state: "active",
      mode: "manual",
      sessionId: "session-1",
      serverTime: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      expiresAt: null,
      reason: "Prepare academic presentation data",
      scopeCodes: ["ACADEMIC_STRUCTURE", "ROSTER", "ACCOUNT_LIFECYCLE"],
      rules: [],
      protectedRules: [],
    });

    render(
      <AdminMaintenanceProvider>
        <Consumer />
      </AdminMaintenanceProvider>,
    );

    await waitFor(() => expect(screen.getByText("active")).toBeInTheDocument());
    expect(adminMaintenanceService.getStatus).toHaveBeenCalledTimes(1);
  });

  it("reports status read failure instead of assuming maintenance is inactive", async () => {
    (adminMaintenanceService.getStatus as jest.Mock).mockRejectedValue(
      new Error("offline"),
    );

    render(
      <AdminMaintenanceProvider>
        <Consumer />
      </AdminMaintenanceProvider>,
    );

    expect(await screen.findByText("unknown:offline")).toBeInTheDocument();
  });
});
