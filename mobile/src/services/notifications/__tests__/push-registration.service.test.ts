import { syncPushRegistration } from "../push-registration.service";

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    platform: "android" as const,
    isPhysicalDevice: true,
    projectId: "project-1",
    appVersion: "0.1.45",
    buildNumber: 46,
    getStoredInstallationId: jest.fn().mockResolvedValue(null),
    storeInstallationId: jest.fn().mockResolvedValue(undefined),
    createInstallationId: jest.fn(() => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    getPermissions: jest.fn().mockResolvedValue({
      status: "granted",
      canAskAgain: true,
    }),
    requestPermissions: jest.fn(),
    getExpoPushToken: jest
      .fn()
      .mockResolvedValue("ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]"),
    registerDevice: jest.fn().mockResolvedValue(undefined),
    revokeDevice: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("syncPushRegistration", () => {
  it("creates a stable installation id and registers a granted physical device", async () => {
    const deps = dependencies();

    await expect(syncPushRegistration(deps)).resolves.toEqual({
      status: "registered",
      installationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    expect(deps.storeInstallationId).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(deps.registerDevice).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      {
        platform: "android",
        provider: "expo",
        pushToken: "ExponentPushToken[abcdefghijklmnopqrstuvwxyz123456]",
        notificationsEnabled: true,
        appVersion: "0.1.45",
        buildNumber: 46,
      },
    );
    expect(JSON.stringify(await syncPushRegistration(deps))).not.toContain(
      "ExponentPushToken",
    );
  });

  it("revokes an existing installation when permission is denied", async () => {
    const deps = dependencies({
      getStoredInstallationId: jest
        .fn()
        .mockResolvedValue("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      getPermissions: jest.fn().mockResolvedValue({
        status: "denied",
        canAskAgain: false,
      }),
    });

    await expect(syncPushRegistration(deps)).resolves.toEqual({
      status: "permission_denied",
      installationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(deps.revokeDevice).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(deps.getExpoPushToken).not.toHaveBeenCalled();
  });

  it("does nothing on simulators and unsupported platforms", async () => {
    const deps = dependencies({ isPhysicalDevice: false });

    await expect(syncPushRegistration(deps)).resolves.toEqual({
      status: "unsupported",
      installationId: null,
    });
    expect(deps.getPermissions).not.toHaveBeenCalled();
    expect(deps.registerDevice).not.toHaveBeenCalled();
  });

  it("returns a retryable result without exposing the token", async () => {
    const deps = dependencies({
      registerDevice: jest.fn().mockRejectedValue(new Error("offline")),
    });

    await expect(syncPushRegistration(deps)).resolves.toEqual({
      status: "retryable_error",
      installationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });
});
