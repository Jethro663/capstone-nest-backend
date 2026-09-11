// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AdminDemoModeSettingsScreen } from "../AdminDemoModeSettingsScreen";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const alert = jest.fn();
let appStateListener: ((state: string) => void) | undefined;
jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    Alert: { alert: (...args: unknown[]) => alert(...args) },
    AppState: {
      addEventListener: (_event: string, listener: (state: string) => void) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      },
    },
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("../../components/admin/AdminMobilePrimitives", () => {
  const ReactRuntime = require("react") as typeof React;
  const view = (name: string) =>
    function MockView(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    AdminScreen: view("AdminScreen"),
    AdminSection: view("AdminSection"),
    AdminNotice: (props: Record<string, unknown>) =>
      ReactRuntime.createElement(
        "AdminNotice",
        props,
        `${props.title}: ${props.description}`,
      ),
    AdminDataRow: view("AdminDataRow"),
    AdminField: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("AdminField", props),
    AdminChip: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("AdminChip", props),
    AdminButton: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("AdminButton", props),
  };
});

jest.mock("../../api/errors", () => ({
  normalizeApiError: (error: { message?: string }) => ({
    message: error.message || "Rejected",
  }),
}));

const baseStatus = {
  available: true,
  active: false,
  state: "disabled",
  version: 4,
  serverTime: "2026-09-12T01:00:00.000Z",
  activatedAt: null,
  expiresAt: null,
  reason: null,
  activatedBy: null,
  relaxedRules: [],
  protectedRules: [],
};

let demoMode = {
  status: baseStatus,
  isLoading: false,
  isFetching: false,
  error: null,
  isOffline: false,
  isCachedOffline: false,
  isMutating: false,
  refresh: jest.fn().mockResolvedValue(undefined),
  activate: jest.fn().mockResolvedValue(undefined),
  deactivate: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../../hooks/useAdminDemoMode", () => ({
  useAdminDemoMode: () => demoMode,
}));

function text(root: TestRenderer.ReactTestInstance) {
  return root.findAllByType("AdminNotice").flatMap((node) => node.children).join(" ");
}

function renderScreen() {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <AdminDemoModeSettingsScreen navigation={{ goBack: jest.fn() } as never} route={{} as never} />,
    );
  });
  return renderer!;
}

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  const originalConsoleError = console.error;
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("react-test-renderer is deprecated")
      )
        return;
      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
});

afterAll(() => consoleErrorSpy.mockRestore());

describe("AdminDemoModeSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    demoMode = {
      ...demoMode,
      status: { ...baseStatus },
      isLoading: false,
      isFetching: false,
      error: null,
      isOffline: false,
      isCachedOffline: false,
      isMutating: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      activate: jest.fn().mockResolvedValue(undefined),
      deactivate: jest.fn().mockResolvedValue(undefined),
    };
  });

  it.each([
    ["unavailable", { ...baseStatus, available: false, state: "unavailable" }, /unavailable/i],
    ["expired", { ...baseStatus, state: "expired" }, /expired/i],
    ["active", { ...baseStatus, active: true, state: "active", expiresAt: "2099-09-12T02:00:00.000Z" }, /active/i],
  ])("renders %s state", (_label, status, expected) => {
    demoMode.status = status;
    const renderer = renderScreen();
    expect(text(renderer.root)).toMatch(expected);
  });

  it("requires every activation field and sends the exact contract after native confirmation", async () => {
    const renderer = renderScreen();
    const root = renderer.root;
    const button = root.findByProps({ label: "Review and activate" });
    expect(button.props.disabled).toBe(true);

    act(() => {
      root.findByProps({ label: "Reason" }).props.onChangeText(
        "Prepare evaluator walkthrough.",
      );
      root.findByProps({ label: "Current password" }).props.onChangeText(
        "Current@123",
      );
      root.findByProps({ label: "Type ENABLE DEMO MODE" }).props.onChangeText(
        "ENABLE DEMO MODE",
      );
      for (const title of [
        "Shared demonstration data can change",
        "Every action remains attributed and audited",
        "Hard integrity and evidence safeguards remain",
      ])
        root.findByProps({ title }).props.onPress();
    });

    expect(root.findByProps({ label: "Review and activate" }).props.disabled).toBe(false);
    act(() => root.findByProps({ label: "Review and activate" }).props.onPress());
    expect(alert).toHaveBeenCalledWith(
      "Activate Demo mode?",
      expect.any(String),
      expect.any(Array),
    );
    const actions = alert.mock.calls.at(-1)?.[2];
    await act(async () => actions[1].onPress());
    expect(demoMode.activate).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPassword: "Current@123",
        confirmation: "ENABLE DEMO MODE",
        durationMinutes: 30,
        expectedVersion: 4,
        acknowledgements: expect.arrayContaining([
          "SHARED_DATA_CAN_CHANGE",
          "ACTIONS_REMAIN_AUDITED",
          "HARD_SAFEGUARDS_REMAIN",
        ]),
      }),
    );
    expect(root.findByProps({ label: "Current password" }).props.value).toBe("");
  });

  it("clears the password and refreshes status after a rejected activation", async () => {
    demoMode.activate.mockRejectedValueOnce(new Error("Wrong password"));
    const renderer = renderScreen();
    const root = renderer.root;
    act(() => {
      root.findByProps({ label: "Reason" }).props.onChangeText("Evaluator walkthrough.");
      root.findByProps({ label: "Current password" }).props.onChangeText("wrong");
      root.findByProps({ label: "Type ENABLE DEMO MODE" }).props.onChangeText("ENABLE DEMO MODE");
      for (const title of [
        "Shared demonstration data can change",
        "Every action remains attributed and audited",
        "Hard integrity and evidence safeguards remain",
      ])
        root.findByProps({ title }).props.onPress();
    });
    act(() =>
      root.findByProps({ label: "Review and activate" }).props.onPress(),
    );
    const actions = alert.mock.calls.at(-1)?.[2];
    await act(async () => actions[1].onPress());
    expect(demoMode.refresh).toHaveBeenCalled();
    expect(root.findByProps({ label: "Current password" }).props.value).toBe("");
    expect(text(root)).toMatch(/Wrong password/);
  });

  it("disables writes offline and clears secrets when the app backgrounds", () => {
    demoMode.isOffline = true;
    const renderer = renderScreen();
    const root = renderer.root;
    act(() =>
      root.findByProps({ label: "Current password" }).props.onChangeText("secret"),
    );
    expect(root.findByProps({ label: "Review and activate" }).props.disabled).toBe(true);
    act(() => appStateListener?.("background"));
    expect(root.findByProps({ label: "Current password" }).props.value).toBe("");
    expect(text(root)).toMatch(/never queued/i);
  });
});
