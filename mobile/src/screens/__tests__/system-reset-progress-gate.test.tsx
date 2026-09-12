import React from "react";
const { create, act } = require("react-test-renderer");
import { SystemResetProgressGate } from "../SystemResetProgressGate";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock("react-native", () => ({
  Modal: "Modal",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 16 }),
}));
jest.mock("../../hooks/useAdminNetworkStatus", () => ({
  useAdminNetworkStatus: () => ({ isOffline: false }),
}));
let authenticated = true;
let roles = ["admin"];
jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: authenticated, user: { roles } }),
}));
jest.mock("../../navigation/navigation-ref", () => ({
  rootNavigationRef: { isReady: () => true, navigate: jest.fn() },
}));
const reset = {
  operationId: "known-operation",
  visible: true,
  progress: "running",
  status: { phase: "cleanup", retrying: true },
  clearing: false,
  signedOut: false,
  error: null,
  forget: jest.fn().mockResolvedValue(undefined),
  refresh: jest.fn(),
  hide: jest.fn(),
  show: jest.fn(),
};
jest.mock("../../providers/SystemResetProvider", () => ({
  useSystemReset: () => reset,
}));
const navigation = jest.requireMock(
  "../../navigation/navigation-ref",
).rootNavigationRef;
let renderer: any;
beforeEach(async () => {
  jest.clearAllMocks();
  reset.forget.mockResolvedValue(undefined);
  authenticated = true;
  roles = ["admin"];
  reset.progress = "running";
  reset.clearing = false;
  reset.signedOut = false;
  await act(async () => {
    renderer = create(
      <SystemResetProgressGate>
        <>{"Authenticated navigation"}</>
      </SystemResetProgressGate>,
    );
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
});
it("keeps public progress visible after auth changes and ignores native Back while running", async () => {
  authenticated = false;
  await act(async () =>
    renderer.update(
      <SystemResetProgressGate>
        <>{"Sign in navigation"}</>
      </SystemResetProgressGate>,
    ),
  );
  expect(renderer.root.findByType("Modal").props.visible).toBe(true);
  expect(JSON.stringify(renderer.toJSON())).toContain(
    "Clearing school data and files",
  );
  await act(async () =>
    renderer.root.findByType("Modal").props.onRequestClose(),
  );
  expect(reset.hide).not.toHaveBeenCalled();
  expect(reset.forget).not.toHaveBeenCalled();
});
it("offers settings on an abort and navigates there after restored app launch", async () => {
  reset.progress = "aborted";
  await act(async () => renderer.update(<SystemResetProgressGate />));
  const back = renderer.root
    .findAllByType("Pressable")
    .find(
      (node: any) =>
        node.findByType("Text").children.join("") === "Return to settings",
    );
  await act(async () => back.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith("MainTabs", {
    screen: "AdminSettings",
  });
  expect(reset.forget).toHaveBeenCalled();
});
it("cannot dismiss completed progress into sign in until local session cleanup finishes", async () => {
  reset.progress = "completed";
  await act(async () => renderer.update(<SystemResetProgressGate />));
  const signIn = renderer.root
    .findAllByType("Pressable")
    .find(
      (node: any) =>
        node.findByType("Text").children.join("") === "Sign in again",
    );
  expect(signIn.props.disabled).toBe(true);
  await act(async () =>
    renderer.root.findByType("Modal").props.onRequestClose(),
  );
  expect(reset.forget).not.toHaveBeenCalled();
  expect(reset.hide).not.toHaveBeenCalled();
  reset.signedOut = true;
  await act(async () => renderer.update(<SystemResetProgressGate />));
  expect(signIn.props.disabled).toBe(false);
});

it("resolves completed progress through native Back after local cleanup", async () => {
  reset.progress = "completed";
  reset.signedOut = true;
  await act(async () => renderer.update(<SystemResetProgressGate />));
  await act(async () =>
    renderer.root.findByType("Modal").props.onRequestClose(),
  );
  expect(reset.forget).toHaveBeenCalledTimes(1);
  expect(reset.hide).not.toHaveBeenCalled();
});

it("forgets an aborted receipt before native Back returns to settings", async () => {
  reset.progress = "aborted";
  await act(async () => renderer.update(<SystemResetProgressGate />));
  await act(async () =>
    renderer.root.findByType("Modal").props.onRequestClose(),
  );
  expect(reset.forget).toHaveBeenCalledTimes(1);
  expect(reset.forget.mock.invocationCallOrder[0]).toBeLessThan(
    navigation.navigate.mock.invocationCallOrder[0],
  );
  expect(navigation.navigate).toHaveBeenCalledWith("MainTabs", {
    screen: "AdminSettings",
  });
});

it("keeps terminal recovery visible when native Back cannot clear saved storage", async () => {
  reset.progress = "aborted";
  reset.forget.mockRejectedValueOnce(new Error("Storage unavailable"));
  await act(async () => renderer.update(<SystemResetProgressGate />));
  await act(async () =>
    renderer.root.findByType("Modal").props.onRequestClose(),
  );
  expect(reset.refresh).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(reset.hide).not.toHaveBeenCalled();
});

it("does not navigate a changed non-admin session into admin settings after abort", async () => {
  roles = ["teacher"];
  reset.progress = "aborted";
  await act(async () => renderer.update(<SystemResetProgressGate />));
  const back = renderer.root
    .findAllByType("Pressable")
    .find(
      (node: any) =>
        node.findByType("Text").children.join("") === "Return to app",
    );
  expect(back).toBeDefined();
  await act(async () => back.props.onPress());
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it("opens an unknown saved request for recovery without forgetting its identity", async () => {
  reset.progress = "unknown";
  await act(async () => renderer.update(<SystemResetProgressGate />));
  const recover = renderer.root
    .findAllByType("Pressable")
    .find(
      (node: any) =>
        node.props.accessibilityLabel === "Review saved reset in settings",
    );
  await act(async () => recover.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(
    "AdminSettingsResetSchoolData",
  );
  expect(reset.hide).toHaveBeenCalledTimes(1);
  expect(reset.forget).not.toHaveBeenCalled();
});
