import React from "react";
const TestRenderer = require("react-test-renderer");
const { act } = TestRenderer;
import { AuthProvider, useAuth } from "../AuthProvider";

let mockAccess = "allowed";
jest.mock("../UpdateProvider", () => ({
  useUpdate: () => ({ state: { access: mockAccess } }),
}));
jest.mock("../../features/assessment-editor/recovery", () => ({
  clearAllEditorRecovery: jest.fn(),
}));
jest.mock("../../api/client", () => ({
  clearAuthSession: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  refreshSession: jest.fn(),
}));
jest.mock("../../api/services/auth", () => ({
  authApi: { getCurrentUser: jest.fn() },
}));
jest.mock("../../api/storage", () => ({
  readSessionSnapshot: jest.fn(),
  writeSessionSnapshot: jest.fn(),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const client = jest.requireMock("../../api/client");
const storage = jest.requireMock("../../api/storage");
const authApi = jest.requireMock("../../api/services/auth").authApi;
const user = {
  id: "learner",
  email: "learner@example.com",
  isEmailVerified: true,
  status: "ACTIVE",
  roles: ["student"],
};
let current: ReturnType<typeof useAuth>;
function Probe() {
  current = useAuth();
  return null;
}

it("preserves stored login on update interruption and resumes bootstrap after admission", async () => {
  mockAccess = "allowed";
  storage.readSessionSnapshot.mockResolvedValue({
    accessToken: "access",
    refreshToken: "refresh",
    user,
  });
  client.refreshSession.mockImplementationOnce(async () => {
    mockAccess = "blocked";
    throw { response: { data: { code: "APP_UPDATE_REQUIRED" } } };
  });
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  expect(client.clearAuthSession).not.toHaveBeenCalled();
  expect(storage.writeSessionSnapshot).not.toHaveBeenCalledWith(null);
  expect(current!.user?.id).toBe("learner");

  mockAccess = "blocked";
  await act(async () => {
    renderer!.update(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  client.refreshSession.mockResolvedValue({
    accessToken: "new-access",
    refreshToken: "new-refresh",
  });
  authApi.getCurrentUser.mockResolvedValue(user);
  mockAccess = "allowed";
  await act(async () => {
    renderer!.update(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  expect(current!.session?.accessToken).toBe("new-access");
  await act(async () => {
    renderer!.unmount();
  });
});

it("resumes when the policy recheck finishes before the interrupted bootstrap", async () => {
  jest.clearAllMocks();
  mockAccess = "allowed";
  client.refreshSession
    .mockRejectedValueOnce({ code: "APP_UPDATE_CHECK_PENDING" })
    .mockResolvedValue({
      accessToken: "resumed-access",
      refreshToken: "refresh",
    });
  authApi.getCurrentUser.mockResolvedValue(user);
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  expect(client.refreshSession).toHaveBeenCalledTimes(2);
  expect(current!.session?.accessToken).toBe("resumed-access");
  expect(client.clearAuthSession).not.toHaveBeenCalled();
  await act(async () => {
    renderer!.unmount();
  });
});
