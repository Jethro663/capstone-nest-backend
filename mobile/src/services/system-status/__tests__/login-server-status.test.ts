import { publicClient } from "../../../api/client";
import {
  checkLoginServerStatus,
  describeApiTarget,
} from "../login-server-status";

jest.mock("../../../api/client", () => ({
  publicClient: { get: jest.fn() },
}));

jest.mock("../../../api/config", () => ({
  API_BASE_URL:
    "https://capstone-backend-v2-production.up.railway.app/api",
}));

const mockedGet = publicClient.get as jest.MockedFunction<
  typeof publicClient.get
>;

describe("login server status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("labels the hosted Railway API without exposing the /api suffix", () => {
    expect(
      describeApiTarget(
        "https://capstone-backend-v2-production.up.railway.app/api",
      ),
    ).toEqual({
      label: "Hosted server",
      address: "capstone-backend-v2-production.up.railway.app",
    });
  });

  it("labels emulator and loopback APIs as local development", () => {
    expect(describeApiTarget("http://10.0.2.2:3000/api").label).toBe(
      "Local development",
    );
    expect(describeApiTarget("http://127.0.0.1:3000/api").label).toBe(
      "Local development",
    );
  });

  it("labels private network APIs as local development", () => {
    expect(describeApiTarget("http://192.168.1.44:3000/api").label).toBe(
      "Local development",
    );
    expect(describeApiTarget("http://172.16.4.10:3000/api").label).toBe(
      "Local development",
    );
  });

  it("preserves an invalid configured target without throwing", () => {
    expect(describeApiTarget("school-backend/api")).toEqual({
      label: "Configured server",
      address: "school-backend/api",
    });
  });

  it("reports online only after expected liveness and readiness", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: { status: "ok", service: { name: "backend" } },
      } as never)
      .mockResolvedValueOnce({ data: { success: true } } as never);

    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "online",
      headline: "Connected",
      label: "Hosted server",
    });
    expect(mockedGet).toHaveBeenNthCalledWith(1, "/health/live", {
      timeout: 5000,
    });
    expect(mockedGet).toHaveBeenNthCalledWith(2, "/health/ready", {
      timeout: 5000,
    });
  });

  it("reports limited when liveness succeeds but readiness fails", async () => {
    mockedGet
      .mockResolvedValueOnce({
        data: { status: "ok", service: { name: "backend" } },
      } as never)
      .mockRejectedValueOnce(new Error("readiness unavailable"));

    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "limited",
      headline: "Connected · limited",
    });
  });

  it("reports unexpected for a live but unrelated response", async () => {
    mockedGet.mockResolvedValueOnce({ data: { status: "ok" } } as never);

    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "unexpected",
      headline: "Unexpected server response",
    });
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("reports offline when liveness cannot be reached", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(checkLoginServerStatus()).resolves.toMatchObject({
      kind: "offline",
      headline: "Cannot reach server",
    });
  });
});
