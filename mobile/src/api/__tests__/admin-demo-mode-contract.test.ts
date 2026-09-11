import { apiClient } from "../client";
import { adminDemoModeApi } from "../services/admin-demo-mode";
import type {
  ActivateAdminDemoMode,
  DeactivateAdminDemoMode,
} from "../../types/admin-demo-mode";

jest.mock("../client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

describe("administrator Demo mode API", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses the authenticated status, activate, and deactivate endpoints", async () => {
    const activate: ActivateAdminDemoMode = {
      currentPassword: "Current@123",
      confirmation: "ENABLE DEMO MODE",
      reason: "Prepare the complete evaluator walkthrough.",
      durationMinutes: 30,
      expectedVersion: 4,
      acknowledgements: [
        "SHARED_DATA_CAN_CHANGE",
        "ACTIONS_REMAIN_AUDITED",
        "HARD_SAFEGUARDS_REMAIN",
      ],
    };
    const deactivate: DeactivateAdminDemoMode = {
      confirmation: "DISABLE DEMO MODE",
      expectedVersion: 5,
    };
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: { state: "disabled" } },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: { state: "active" } },
    });

    await adminDemoModeApi.getStatus();
    await adminDemoModeApi.activate(activate);
    await adminDemoModeApi.deactivate(deactivate);

    expect(apiClient.get).toHaveBeenCalledWith("/admin/demo-mode");
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/admin/demo-mode/activate",
      activate,
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/admin/demo-mode/deactivate",
      deactivate,
    );
  });
});
