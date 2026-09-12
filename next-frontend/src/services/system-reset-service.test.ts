import { api } from "@/lib/api-client";
import { systemResetService } from "./system-reset-service";

jest.mock("@/lib/api-client", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
const client = api as jest.Mocked<typeof api>;

describe("system reset contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.get.mockResolvedValue({
      data: { success: true, data: { active: false } },
    });
    client.post.mockResolvedValue({ data: { success: true, data: {} } });
  });
  it("loads policy without calling academic-state initialization", async () => {
    await systemResetService.getPolicy("2026-2027");
    expect(client.get).toHaveBeenCalledWith("/admin/system-reset/policy", {
      params: { schoolYear: "2026-2027" },
    });
  });
  it("reads public progress without refreshing or redirecting an expired session", async () => {
    await systemResetService.getPublicStatus();
    expect(client.get).toHaveBeenCalledWith(
      "/system-maintenance",
      expect.objectContaining({
        skipAuthRefresh: true,
        skipSessionExpiredRedirect: true,
      }),
    );
  });
  it("does not redirect or automatically retry an uncertain execute", async () => {
    const payload = {
      previewToken: "token",
      idempotencyKey: "key",
      reason: "Testing reset",
      currentPassword: "secret",
      confirmation: "RESET EXACT",
      acknowledgements: ["SIGN_IN_AGAIN"],
    };
    await systemResetService.execute(payload);
    expect(client.post).toHaveBeenCalledWith(
      "/admin/system-reset/execute",
      payload,
      { skipAuthRefresh: true, skipSessionExpiredRedirect: true },
    );
  });
});
