// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useQuery } from "@tanstack/react-query";
import { AdminDiagnosticsScreen } from "../AdminDiagnosticsScreen";
import { AdminSettingsOverviewScreen } from "../AdminSettingsOverviewScreen";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return { Pressable: component("Pressable"), Text: component("Text"), View: component("View") };
});

jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn() }));

jest.mock("../../api/services/admin", () => ({
  adminApi: {
    getLiveness: jest.fn(),
    getReadiness: jest.fn(),
    getWorkflowDiagnostics: jest.fn(),
  },
}));

jest.mock("../../api/services/academic-state", () => ({
  academicStateService: {
    getCurrent: jest.fn(),
    getReadiness: jest.fn(),
  },
}));

jest.mock("../../api/services/system-capabilities", () => ({
  systemCapabilitiesApi: { getSnapshot: jest.fn() },
}));

jest.mock("../../components/admin/AdminMobilePrimitives", () => {
  const ReactRuntime = require("react") as typeof React;
  const wrap = (name: string) => ({ children, title, subtitle, status, description }: Record<string, unknown>) =>
    ReactRuntime.createElement(name, null,
      title ? ReactRuntime.createElement("Text", null, title) : null,
      subtitle ? ReactRuntime.createElement("Text", null, subtitle) : null,
      status ? ReactRuntime.createElement("Text", null, status) : null,
      description ? ReactRuntime.createElement("Text", null, description) : null,
      children,
    );
  return {
    AdminAdaptiveColumns: ({ primary, secondary }: Record<string, unknown>) => ReactRuntime.createElement("View", null, primary, secondary),
    AdminDataRow: wrap("View"),
    AdminEmpty: wrap("View"),
    AdminNotice: wrap("View"),
    AdminScreen: wrap("View"),
    AdminSection: wrap("View"),
  };
});

jest.mock("../../components/admin/AdminAsyncState", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    AdminAsyncState: ({ hasData, error, children }: Record<string, unknown>) =>
      ReactRuntime.createElement("View", null,
        error ? ReactRuntime.createElement("Text", null, error) : null,
        hasData ? children : null,
      ),
  };
});

const refetch = jest.fn();
const common = { isLoading: false, isRefetching: false, isError: false, error: null, refetch };

function queryState(key: string) {
  if (key === "academic,current") return { ...common, data: { schoolYear: "2026-2027", quarter: "Q3", periods: [{ key: "Q3", label: "Quarter 3" }] } };
  if (key === "academic,readiness") return { ...common, data: { blockers: [] } };
  if (key === "system,capabilities") return {
    ...common,
    data: {
      capabilities: {
        academicOperations: { state: "active", reasonCode: null },
        maintenanceAccess: { state: "inactive", reasonCode: "MAINTENANCE_INACTIVE" },
        systemReadiness: { state: "ready", reasonCode: null },
        workflowDiagnostics: { state: "degraded", reasonCode: "WORKFLOW_ALERTS_PRESENT" },
      },
    },
  };
  if (key === "admin-diagnostics,live") return { ...common, data: { status: "ok", timestamp: "2026-09-29T03:00:00.000Z" } };
  if (key === "admin-diagnostics,ready") return { ...common, data: { dependencies: { database: { ok: true, message: "Database connected" } } } };
  if (key === "admin-diagnostics,workflows") return {
    ...common,
    data: {
      totals: [{ status: "pending", count: 2, oldestAgeSeconds: 1200 }],
      alerts: [{ code: "oldest_nonterminal_exceeded", severity: "warning", message: "Oldest nonterminal workflow is 1200 seconds old." }],
    },
  };
  throw new Error(`Unexpected query: ${key}`);
}

function renderedText(root: TestRenderer.ReactTestInstance) {
  return root.findAllByType("Text").flatMap((node) => node.children).join(" ");
}

describe("admin system safety screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => queryState(queryKey.join(",")));
  });

  it("shows semantic capabilities while retaining all settings destinations", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminSettingsOverviewScreen navigation={{ getParent: () => ({ navigate: jest.fn() }) }} />,
      );
    });
    const text = renderedText(renderer!.root);
    expect(text).toMatch(/Live system capabilities.*Academic operations.*Active/);
    expect(text).toContain("WORKFLOW_ALERTS_PRESENT");
    expect(text).toContain("Reset school data");
  });

  it("keeps settings destinations visible when capabilities fail", () => {
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      const key = queryKey.join(",");
      if (key === "system,capabilities") return { ...common, isError: true, error: new Error("Capability snapshot unavailable") };
      return queryState(key);
    });
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AdminSettingsOverviewScreen navigation={{ getParent: () => ({ navigate: jest.fn() }) }} />,
      );
    });
    const text = renderedText(renderer!.root);
    expect(text).toContain("Capability snapshot unavailable");
    expect(text).toContain("Academic Year");
    expect(text).toContain("Reset school data");
  });

  it("shows aggregate workflow evidence and preserves dependencies on workflow failure", () => {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<AdminDiagnosticsScreen />);
    });
    const initialText = renderedText(renderer!.root);
    expect(initialText).toMatch(/Workflow queues.*Pending/);
    expect(initialText).toContain("2 jobs");
    expect(initialText).toContain("Oldest: 20m");

    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      const key = queryKey.join(",");
      if (key === "admin-diagnostics,workflows") return { ...common, isError: true, error: new Error("Workflow diagnostics unavailable") };
      return queryState(key);
    });
    act(() => renderer!.update(<AdminDiagnosticsScreen />));
    const text = renderedText(renderer!.root);
    expect(text).toContain("Database connected");
    expect(text).toContain("Workflow diagnostics unavailable");
  });
});
