// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AdminEvaluationsScreen } from "../AdminEvaluationsScreen";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockAlert = jest.fn();
const mockCreateCampaign = jest.fn();
const mockInvalidateQueries = jest.fn();
const mountedRenderers: TestRenderer.ReactTestRenderer[] = [];

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
    Text: component("Text"),
    View: component("View"),
  };
});

jest.mock("@react-native-community/datetimepicker", () => {
  const ReactRuntime = require("react") as typeof React;
  return function MockDateTimePicker(props: Record<string, unknown>) {
    return ReactRuntime.createElement("DateTimePicker", props);
  };
});

jest.mock("../../components/admin/AdminMobilePrimitives", () => {
  const ReactRuntime = require("react") as typeof React;
  const view = (name: string) =>
    function MockView(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    adminTheme: {
      text: "#111",
      subtext: "#555",
      border: "#ddd",
    },
    AdminScreen: ({ rightAction, children, ...props }) =>
      ReactRuntime.createElement("AdminScreen", props, rightAction, children),
    AdminSection: view("AdminSection"),
    AdminButton: view("AdminButton"),
    AdminChip: view("AdminChip"),
    AdminDataRow: view("AdminDataRow"),
    AdminEmpty: view("AdminEmpty"),
    AdminField: view("AdminField"),
    AdminMetricStrip: view("AdminMetricStrip"),
    AdminNotice: view("AdminNotice"),
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const common = {
      isLoading: false,
      isError: false,
      isRefetching: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    };
    if (queryKey[0] === "admin-evaluation-campaigns") {
      return {
        ...common,
        data: { campaigns: [], count: 0, total: 0, page: 1, totalPages: 1 },
      };
    }
    if (queryKey[0] === "admin-evaluation-class-options") {
      return { ...common, data: { data: [] } };
    }
    return {
      ...common,
      data: {
        rows: [],
        count: 0,
        summary: {
          averages: { satisfactionScore: 0, usabilityScore: 0 },
          feedbackCount: 0,
        },
      },
    };
  },
}));

jest.mock("../../api/services/evaluations", () => ({
  evaluationsApi: {
    createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
    getCampaigns: jest.fn(),
    getEvaluations: jest.fn(),
    updateCampaignStatus: jest.fn(),
  },
}));

jest.mock("../../api/services/classes", () => ({
  classesApi: { getPage: jest.fn() },
}));

jest.mock("../../api/http", () => ({
  toAppError: (error: unknown) => error,
}));

function renderScreen() {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <AdminEvaluationsScreen navigation={{} as never} route={{} as never} />,
    );
  });
  mountedRenderers.push(renderer!);
  return renderer!;
}

async function fillAndSubmit(renderer: TestRenderer.ReactTestRenderer) {
  act(() =>
    renderer.root.findByProps({ label: "New campaign" }).props.onPress(),
  );
  act(() =>
    renderer.root
      .findByProps({ label: "Campaign title" })
      .props.onChangeText("Quarterly learner pulse"),
  );
  const createButton = renderer.root.findByProps({
    label: "Create and activate",
  });
  await act(async () => {
    createButton.props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("AdminEvaluationsScreen campaign creation", () => {
  const now = Date.parse("2026-09-14T04:00:00.000Z");

  beforeEach(() => {
    const originalConsoleError = console.error;
    jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("react-test-renderer is deprecated")
      )
        return;
      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(now);
    mockCreateCampaign.mockResolvedValue({ id: "campaign-1" });
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      mountedRenderers.splice(0).forEach((renderer) => renderer.unmount());
    });
    jest.restoreAllMocks();
  });

  it("sends the exact backend contract and confirms an active campaign", async () => {
    const renderer = renderScreen();
    await fillAndSubmit(renderer);

    expect(mockCreateCampaign).toHaveBeenCalledWith({
      formType: "system",
      audienceRole: "student",
      classId: undefined,
      title: "Quarterly learner pulse",
      startsAt: new Date(now + 86_400_000).toISOString(),
      endsAt: new Date(now + 7 * 86_400_000).toISOString(),
      status: "active",
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["admin-evaluation-campaigns"],
    });
    expect(mockAlert).toHaveBeenCalledWith(
      "Campaign active",
      expect.stringContaining("Quarterly learner pulse"),
    );
  });

  it("explains when an outdated APK blocks campaign creation", async () => {
    mockCreateCampaign.mockRejectedValue({
      code: "APP_UPDATE_REQUIRED",
      message: "Update Nexora to continue.",
    });
    const renderer = renderScreen();
    await fillAndSubmit(renderer);

    expect(mockAlert).toHaveBeenCalledWith(
      "Update required",
      "Update Nexora to continue.",
    );
  });
});
