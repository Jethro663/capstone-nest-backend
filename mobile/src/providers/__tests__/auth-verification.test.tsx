import React from "react";
// @ts-expect-error React Native test renderer typings are not installed in this workspace.
import TestRenderer, { act } from "react-test-renderer";
import { AuthProvider, useAuth } from "../AuthProvider";
import { authApi } from "../../api/services/auth";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  refreshSession,
  subscribeAuthSessionExpired,
} from "../../api/client";
import { readSessionSnapshot, writeSessionSnapshot } from "../../api/storage";
import type { AuthSession } from "../../types/auth";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("../UpdateProvider", () => ({
  useUpdate: () => ({ state: { access: "allowed" } }),
}));
jest.mock("../../api/services/auth", () => ({
  authApi: { login: jest.fn(), logout: jest.fn(), getCurrentUser: jest.fn() },
}));
jest.mock("../../services/notifications/push-registration.runtime", () => ({
  revokeCurrentPushInstallation: jest.fn(),
}));
jest.mock("../../services/offline/workspace-snapshot", () => ({
  workspaceSnapshotStore: { purgeUser: jest.fn() },
}));
jest.mock("../../features/assessment-editor/recovery", () => ({
  clearAllEditorRecovery: jest.fn(),
}));
jest.mock("../../api/client", () => ({
  clearAuthSession: jest.fn(),
  refreshSession: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  subscribeAuthSessionExpired: jest.fn(),
}));
jest.mock("../../api/storage", () => ({
  readSessionSnapshot: jest.fn(),
  writeSessionSnapshot: jest.fn(),
}));

const session = (role: string, verified: boolean): AuthSession => ({
  accessToken: "access",
  refreshToken: "refresh",
  user: {
    id: "user-1",
    email: `${role}@example.invalid`,
    firstName: "Test",
    lastName: "User",
    status: "ACTIVE",
    isEmailVerified: verified,
    roles: [{ name: role }],
  } as AuthSession["user"],
});
let auth: ReturnType<typeof useAuth>;
let renderer: { unmount: () => void };
let sessionExpiredListener: (() => void) | undefined;
function Probe() {
  auth = useAuth();
  return null;
}
async function mount() {
  await act(async () => {
    renderer = TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
}
beforeEach(() => {
  jest.resetAllMocks();
  sessionExpiredListener = undefined;
  jest.mocked(refreshSession).mockResolvedValue(null);
  jest.mocked(getAccessToken).mockReturnValue("access");
  jest.mocked(getRefreshToken).mockReturnValue("refresh");
  jest.mocked(subscribeAuthSessionExpired).mockImplementation((listener) => {
    sessionExpiredListener = listener;
    return jest.fn();
  });
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
});

it.each(["student", "teacher"])(
  "does not authenticate an unverified %s even if login returns tokens",
  async (role) => {
    await mount();
    jest.mocked(authApi.login).mockResolvedValue(session(role, false));
    await act(async () => {
      await expect(
        auth.login(`${role}@example.invalid`, "temporary-password"),
      ).rejects.toThrow("Email not verified");
    });
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(clearAuthSession).toHaveBeenCalled();
    expect(writeSessionSnapshot).not.toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ isEmailVerified: false }),
      }),
    );
  },
);

it("ends the local session before captured-token remote logout cleanup settles", async () => {
  const pushRuntime = jest.requireMock(
    "../../services/notifications/push-registration.runtime",
  );
  let resolvePush!: () => void;
  let resolveServerLogout!: () => void;
  const pushCleanup = new Promise<void>((resolve) => {
    resolvePush = resolve;
  });
  const serverCleanup = new Promise<void>((resolve) => {
    resolveServerLogout = resolve;
  });
  await mount();
  jest.mocked(authApi.login).mockResolvedValue(session("student", true));
  pushRuntime.revokeCurrentPushInstallation.mockReturnValue(pushCleanup);
  jest.mocked(authApi.logout).mockReturnValue(serverCleanup);
  await act(async () => {
    await auth.login("student@example.invalid", "password");
  });
  expect(auth.isAuthenticated).toBe(true);

  let logoutPromise!: Promise<void>;
  await act(async () => {
    logoutPromise = auth.logout();
    await Promise.resolve();
  });

  expect(auth.isAuthenticated).toBe(false);
  expect(clearAuthSession).toHaveBeenCalled();
  expect(pushRuntime.revokeCurrentPushInstallation).toHaveBeenCalledWith(
    "access",
  );
  expect(authApi.logout).toHaveBeenCalledWith("refresh");

  resolvePush();
  resolveServerLogout();
  await act(async () => {
    await logoutPromise;
  });

  const offlineStore = jest.requireMock(
    "../../services/offline/workspace-snapshot",
  );
  expect(offlineStore.workspaceSnapshotStore.purgeUser).toHaveBeenCalledWith(
    "user-1",
  );
});

it("keeps the user logged out when remote cleanup rejects", async () => {
  const pushRuntime = jest.requireMock(
    "../../services/notifications/push-registration.runtime",
  );
  await mount();
  jest.mocked(authApi.login).mockResolvedValue(session("student", true));
  pushRuntime.revokeCurrentPushInstallation.mockRejectedValue(
    new Error("push revoke unavailable"),
  );
  jest.mocked(authApi.logout).mockRejectedValue(
    new Error("server revoke unavailable"),
  );
  await act(async () => {
    await auth.login("student@example.invalid", "password");
    await auth.logout();
  });

  expect(auth.isAuthenticated).toBe(false);
  expect(clearAuthSession).toHaveBeenCalled();
  expect(writeSessionSnapshot).toHaveBeenLastCalledWith(null);
});

it("clears the rendered session when refresh credentials expire", async () => {
  await mount();
  jest.mocked(authApi.login).mockResolvedValue(session("student", true));
  await act(async () => {
    await auth.login("student@example.invalid", "password");
  });
  expect(auth.isAuthenticated).toBe(true);
  expect(subscribeAuthSessionExpired).toHaveBeenCalledTimes(1);

  await act(async () => {
    sessionExpiredListener?.();
    await Promise.resolve();
  });

  expect(auth.isAuthenticated).toBe(false);
  expect(auth.user).toBeNull();
  expect(writeSessionSnapshot).toHaveBeenLastCalledWith(null);
});

it("purges the previous account snapshot when a different account signs in", async () => {
  const offlineStore = jest.requireMock(
    "../../services/offline/workspace-snapshot",
  );
  await mount();
  jest
    .mocked(authApi.login)
    .mockResolvedValueOnce(session("student", true))
    .mockResolvedValueOnce({
      ...session("teacher", true),
      user: { ...session("teacher", true).user, id: "user-2" },
    });

  await act(async () => {
    await auth.login("student@example.invalid", "password");
    await auth.login("teacher@example.invalid", "password");
  });

  expect(offlineStore.workspaceSnapshotStore.purgeUser).toHaveBeenCalledWith(
    "user-1",
  );
});

it.each(["student", "teacher"])(
  "rejects restoring an unverified %s session",
  async (role) => {
    jest.mocked(readSessionSnapshot).mockResolvedValue(session(role, false));
    jest.mocked(refreshSession).mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    jest
      .mocked(authApi.getCurrentUser)
      .mockResolvedValue(session(role, false).user);
    await mount();
    expect(auth.loading).toBe(false);
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(clearAuthSession).toHaveBeenCalled();
    const offlineStore = jest.requireMock(
      "../../services/offline/workspace-snapshot",
    );
    expect(offlineStore.workspaceSnapshotStore.purgeUser).toHaveBeenCalledWith(
      "user-1",
    );
  },
);

it.each(["student", "teacher"])(
  "allows a verified %s to sign in",
  async (role) => {
    await mount();
    jest.mocked(authApi.login).mockResolvedValue(session(role, true));
    await act(async () => {
      await auth.login(`${role}@example.invalid`, "password");
    });
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user?.isEmailVerified).toBe(true);
  },
);
