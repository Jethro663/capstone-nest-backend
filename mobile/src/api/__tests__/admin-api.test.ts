import { apiClient } from "../client";
import { adminApi } from "../services/admin";
import { evaluationsApi } from "../services/evaluations";

jest.mock("../client", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const getMock = apiClient.get as jest.Mock;

describe("administrator contracts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads every user page and preserves authoritative totals", async () => {
    getMock
      .mockResolvedValueOnce({ data: { success: true, users: Array.from({ length: 100 }, (_, index) => ({ id: `u-${index}` })), page: 1, limit: 100, total: 101, totalPages: 2 } })
      .mockResolvedValueOnce({ data: { success: true, users: [{ id: "u-100" }], page: 2, limit: 100, total: 101, totalPages: 2 } });
    const result = await adminApi.getAllUsers();
    expect(result.data).toHaveLength(101);
    expect(result.total).toBe(101);
  });

  it("uses dedicated system-evaluation campaign create and status routes", async () => {
    const payload = { formType: "system" as const, audienceRole: "student" as const, title: "Usability", startsAt: "2026-09-02T00:00:00Z", endsAt: "2026-09-09T00:00:00Z", status: "active" as const };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "campaign" } } });
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({ data: { data: { id: "campaign", status: "closed" } } });
    await evaluationsApi.createCampaign(payload);
    await evaluationsApi.updateCampaignStatus("campaign", "closed");
    expect(apiClient.post).toHaveBeenCalledWith("/lxp/system-evaluation-campaigns", payload);
    expect(apiClient.patch).toHaveBeenCalledWith("/lxp/system-evaluation-campaigns/campaign/status", { status: "closed" });
  });

  it("propagates administrator lifecycle failures", async () => {
    (apiClient.patch as jest.Mock).mockRejectedValueOnce(new Error("forbidden"));
    await expect(adminApi.setUserLifecycle("u", "suspend")).rejects.toThrow("forbidden");
  });
});
