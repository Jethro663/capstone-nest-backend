// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AdminMaintenanceSettingsScreen } from "../AdminMaintenanceSettingsScreen";

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
  state: "inactive",
  mode: null,
  sessionId: null,
  serverTime: "2026-09-13T01:00:00.000Z",
  startedAt: null,
  expiresAt: null,
  reason: null,
  scopeCodes: [],
  rules: [],
  protectedRules: [],
};

let maintenance = {
  status: baseStatus,
  isLoading: false,
  isFetching: false,
  error: null,
  isOffline: false,
  isCachedOffline: false,
  isMutating: false,
  refresh: jest.fn().mockResolvedValue(undefined),
  open: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../../hooks/useAdminMaintenance", () => ({
  useAdminMaintenance: () => maintenance,
}));

function noticeText(root: TestRenderer.ReactTestInstance) {
  return root
    .findAllByType("AdminNotice")
    .flatMap((node) => node.children)
    .join(" ");
}

function renderScreen() {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <AdminMaintenanceSettingsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{} as never}
      />,
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

describe("AdminMaintenanceSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    maintenance = {
      ...maintenance,
      status: { ...baseStatus },
      isLoading: false,
      isFetching: false,
      error: null,
      isOffline: false,
      isCachedOffline: false,
      isMutating: false,
      refresh: jest.fn().mockResolvedValue(undefined),
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };
  });

  it("requires every field and sends the fixed server contract after native confirmation", async () => {
    const root = renderScreen().root;
    expect(
      root.findByProps({ label: "Review and turn ON" }).props.disabled,
    ).toBe(true);

    act(() => {
      root
        .findByProps({ label: "Reason" })
        .props.onChangeText("Prepare evaluator walkthrough.");
      root
        .findByProps({ label: "Current password" })
        .props.onChangeText("Current@123");
      root
        .findByProps({ label: "Type OPEN MAINTENANCE ACCESS" })
        .props.onChangeText("OPEN MAINTENANCE ACCESS");
      for (const title of [
        "Live classes, sections, rosters, and account state can change",
        "Finalized grades, submitted evidence, and audit history stay protected outside Full Reset",
      ])
        root.findByProps({ title }).props.onPress();
    });

    expect(
      root.findByProps({ label: "Review and turn ON" }).props.disabled,
    ).toBe(false);
    act(() =>
      root.findByProps({ label: "Review and turn ON" }).props.onPress(),
    );
    expect(alert).toHaveBeenCalledWith(
      "Turn on Maintenance Access?",
      expect.stringMatching(/until you turn it off/i),
      expect.any(Array),
    );
    const actions = alert.mock.calls.at(-1)?.[2];
    await act(async () => actions[1].onPress());
    expect(maintenance.open).toHaveBeenCalledWith({
      currentPassword: "Current@123",
      confirmation: "OPEN MAINTENANCE ACCESS",
      reason: "Prepare evaluator walkthrough.",
      acknowledgements: [
        "LIVE_ACADEMIC_STRUCTURE_CAN_CHANGE",
        "FINALIZED_AND_AUDIT_EVIDENCE_STAYS_PROTECTED",
      ],
    });
    expect(root.findByProps({ label: "Current password" }).props.value).toBe(
      "",
    );
  });

  it("clears the password and refreshes status after a rejected open", async () => {
    maintenance.open.mockRejectedValueOnce(new Error("Wrong password"));
    const root = renderScreen().root;
    act(() => {
      root
        .findByProps({ label: "Reason" })
        .props.onChangeText("Evaluator walkthrough.");
      root.findByProps({ label: "Current password" }).props.onChangeText("bad");
      root
        .findByProps({ label: "Type OPEN MAINTENANCE ACCESS" })
        .props.onChangeText("OPEN MAINTENANCE ACCESS");
      for (const title of [
        "Live classes, sections, rosters, and account state can change",
        "Finalized grades, submitted evidence, and audit history stay protected outside Full Reset",
      ])
        root.findByProps({ title }).props.onPress();
    });
    act(() =>
      root.findByProps({ label: "Review and turn ON" }).props.onPress(),
    );
    const actions = alert.mock.calls.at(-1)?.[2];
    await act(async () => actions[1].onPress());
    expect(maintenance.refresh).toHaveBeenCalled();
    expect(root.findByProps({ label: "Current password" }).props.value).toBe(
      "",
    );
    expect(noticeText(root)).toMatch(/Wrong password/);
  });

  it("disables writes offline and clears the password when the app backgrounds", () => {
    maintenance.isOffline = true;
    const root = renderScreen().root;
    act(() =>
      root
        .findByProps({ label: "Current password" })
        .props.onChangeText("secret"),
    );
    expect(
      root.findByProps({ label: "Review and turn ON" }).props.disabled,
    ).toBe(true);
    act(() => appStateListener?.("background"));
    expect(root.findByProps({ label: "Current password" }).props.value).toBe(
      "",
    );
    expect(noticeText(root)).toMatch(/never queued/i);
  });

  it("renders a manual switch as ON without an expiry and exposes immediate OFF", () => {
    maintenance.status = {
      ...baseStatus,
      active: true,
      state: "active",
      mode: "manual",
      sessionId: "session-1",
      startedAt: "2026-09-13T01:00:00.000Z",
      expiresAt: null,
    };

    const root = renderScreen().root;

    expect(
      root.findByProps({ title: "Maintenance Access is ON" }).props.subtitle,
    ).toMatch(/remains on until you turn it off, sign out, or change/i);
    expect(root.findByProps({ label: "Turn OFF now" })).toBeTruthy();
  });
});
