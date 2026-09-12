import React from "react";
const { act, create } = require("react-test-renderer");
import { SystemResetProvider, useSystemReset } from "../SystemResetProvider";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-native", () => ({
  AppState: { addEventListener: () => ({ remove: jest.fn() }) },
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("../../api/services/system-reset", () => ({
  systemResetApi: { maintenance: jest.fn(), operation: jest.fn() },
}));
jest.mock("../../api/client", () => ({
  clearAuthSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../api/queryClient", () => ({
  queryClient: {
    clear: jest.fn(),
    cancelQueries: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../features/assessment-editor/recovery", () => ({
  clearAllSchoolDataRecovery: jest.fn().mockResolvedValue(undefined),
}));
const updateLocalUser = jest.fn().mockResolvedValue(undefined);
jest.mock("../AuthProvider", () => ({
  useAuth: () => ({ updateLocalUser, loading: false, isAuthenticated: true }),
}));
jest.mock("../../hooks/useAdminNetworkStatus", () => ({
  useAdminNetworkStatus: () => ({ isOffline: false }),
}));
const storage = jest.requireMock(
  "@react-native-async-storage/async-storage",
).default;
const api = jest.requireMock("../../api/services/system-reset").systemResetApi;
const client = jest.requireMock("../../api/client");
const queries = jest.requireMock("../../api/queryClient").queryClient;
const recovery = jest.requireMock("../../features/assessment-editor/recovery");
let current: ReturnType<typeof useSystemReset>;
function Probe() {
  current = useSystemReset();
  return null;
}
const id = "709de236-c128-4f6a-a4e3-e193ce605f3c";
let renderer: ReturnType<typeof create>;
beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  api.maintenance.mockResolvedValue({
    active: true,
    operationId: id,
    status: "running",
    phase: "draining",
    retrying: false,
  });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});

it("persists only operation ID before following public progress and retains it when hidden", async () => {
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  await act(async () => {
    await current.begin(id);
  });
  expect(storage.setItem).toHaveBeenCalledWith(
    "nexora.system-reset.operation",
    id,
  );
  expect(current.operationId).toBe(id);
  expect(current.visible).toBe(true);
  await act(async () => current.hide());
  expect(current.visible).toBe(false);
  expect(current.operationId).toBe(id);
  expect(storage.removeItem).not.toHaveBeenCalled();
});

it("restores pending progress without adopting another operation's completion", async () => {
  storage.getItem.mockResolvedValue(id);
  api.maintenance.mockResolvedValue({
    active: false,
    operationId: "other",
    status: "completed",
    phase: "complete",
    retrying: false,
  });
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  expect(current.operationId).toBe(id);
  expect(current.progress).toBe("unknown");
  expect(client.clearAuthSession).not.toHaveBeenCalled();
});

it("clears local auth and query caches on matching completion without calling logout", async () => {
  storage.getItem.mockResolvedValue(id);
  api.maintenance.mockResolvedValue({
    active: false,
    operationId: id,
    status: "completed",
    phase: "complete",
    retrying: false,
  });
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  expect(current.progress).toBe("completed");
  expect(client.clearAuthSession).toHaveBeenCalledTimes(1);
  expect(updateLocalUser).toHaveBeenCalledWith(null);
  expect(recovery.clearAllSchoolDataRecovery).toHaveBeenCalledTimes(1);
  expect(queries.clear).toHaveBeenCalledTimes(1);
  expect(current.visible).toBe(true);
  expect(storage.removeItem).not.toHaveBeenCalled();
});

it("keeps completion recovery retryable when local school-data cleanup fails", async () => {
  storage.getItem.mockResolvedValue(id);
  api.maintenance.mockResolvedValue({
    active: false,
    operationId: id,
    status: "completed",
    phase: "complete",
    retrying: false,
  });
  recovery.clearAllSchoolDataRecovery.mockRejectedValueOnce(
    new Error("Storage unavailable"),
  );
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  expect(current.operationId).toBe(id);
  expect(current.signedOut).toBe(false);
  expect(current.error).toContain("local sign-out could not finish");
  expect(queries.clear).not.toHaveBeenCalled();
  expect(storage.removeItem).not.toHaveBeenCalled();

  await act(async () => current.refresh());

  expect(recovery.clearAllSchoolDataRecovery).toHaveBeenCalledTimes(2);
  expect(queries.clear).toHaveBeenCalledTimes(1);
  expect(current.signedOut).toBe(true);
  expect(current.operationId).toBe(id);
  expect(storage.removeItem).not.toHaveBeenCalled();
});

it("leaves auth intact for an abort before clearing records", async () => {
  storage.getItem.mockResolvedValue(id);
  api.maintenance.mockResolvedValue({
    active: false,
    operationId: id,
    status: "aborted",
    phase: "aborted",
    retrying: false,
  });
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  expect(current.progress).toBe("aborted");
  expect(client.clearAuthSession).not.toHaveBeenCalled();
});

it("does not permit submission when operation ID persistence fails", async () => {
  storage.setItem.mockRejectedValueOnce(new Error("Storage unavailable"));
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  await expect(current.begin(id)).rejects.toThrow("Storage unavailable");
  expect(current.operationId).toBeNull();
});

it("retains an already verified terminal receipt if another operation later becomes public", async () => {
  storage.getItem.mockResolvedValue(id);
  api.maintenance.mockResolvedValueOnce({
    active: false,
    operationId: id,
    status: "completed",
    phase: "complete",
    retrying: false,
  });
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  expect(current.progress).toBe("completed");
  api.maintenance.mockResolvedValue({
    active: true,
    operationId: "later-operation",
    status: "running",
    phase: "cleanup",
    retrying: false,
  });
  await act(async () => current.refresh());
  expect(current.progress).toBe("completed");
});

it("resolves an older exact owned terminal receipt after public status moves on", async () => {
  storage.getItem.mockResolvedValue(id);
  api.maintenance.mockResolvedValue({
    active: false,
    operationId: "later",
    status: "completed",
    phase: "complete",
    retrying: false,
  });
  api.operation.mockResolvedValue({
    operationId: id,
    status: "completed",
    phase: "complete",
    retrying: false,
  });
  await act(async () => {
    renderer = create(
      <SystemResetProvider>
        <Probe />
      </SystemResetProvider>,
    );
  });
  expect(current.progress).toBe("unknown");
  await act(async () => current.checkOwnedOperation());
  expect(api.operation).toHaveBeenCalledWith(id);
  expect(current.progress).toBe("completed");
  expect(client.clearAuthSession).toHaveBeenCalledTimes(1);
});

it.each(["missing", "mismatched"])(
  "retains tracking and auth for %s owned lookup",
  async (kind) => {
    storage.getItem.mockResolvedValue(id);
    api.maintenance.mockResolvedValue({
      active: false,
      operationId: null,
      status: "idle",
      phase: null,
      retrying: false,
    });
    if (kind === "missing")
      api.operation.mockRejectedValueOnce({ response: { status: 404 } });
    else
      api.operation.mockResolvedValueOnce({
        operationId: "other",
        status: "completed",
        phase: "complete",
        retrying: false,
      });
    await act(async () => {
      renderer = create(
        <SystemResetProvider>
          <Probe />
        </SystemResetProvider>,
      );
    });
    await expect(current.checkOwnedOperation()).rejects.toBeDefined();
    expect(current.operationId).toBe(id);
    expect(current.progress).toBe("unknown");
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(client.clearAuthSession).not.toHaveBeenCalled();
  },
);
