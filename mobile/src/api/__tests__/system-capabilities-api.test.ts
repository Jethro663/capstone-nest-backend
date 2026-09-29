import { apiClient } from "../client";
import { adminApi } from "../services/admin";
import { systemCapabilitiesApi } from "../services/system-capabilities";

jest.mock("../client", () => ({
  apiClient: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;

describe("system safety contracts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unwraps the authenticated system capability snapshot", async () => {
    const snapshot = {
      version: 1,
      observedAt: "2026-09-29T03:00:00.000Z",
      roleScope: ["admin"],
      capabilities: {},
    };
    getMock.mockResolvedValue({
      data: { success: true, message: "ok", data: snapshot },
    });

    await expect(systemCapabilitiesApi.getSnapshot()).resolves.toBe(snapshot);
    expect(getMock).toHaveBeenCalledWith("/system/capabilities");
  });

  it("unwraps aggregate workflow diagnostics", async () => {
    const workflow = {
      observedAt: "2026-09-29T03:00:00.000Z",
      healthy: true,
      staleAfterSeconds: 900,
      totals: [],
      alerts: [],
    };
    getMock.mockResolvedValue({
      data: { success: true, message: "ok", data: workflow },
    });

    await expect(adminApi.getWorkflowDiagnostics()).resolves.toBe(workflow);
    expect(getMock).toHaveBeenCalledWith("/health/workflows");
  });
});
