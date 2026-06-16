import React from "react";
import { Text } from "react-native";
import { useStudentInterventionAlerts } from "../../api/hooks";
import { rootNavigationRef } from "../../navigation/navigation-ref";
import { useAuth } from "../AuthProvider";
import { StudentInterventionAlertProvider } from "../StudentInterventionAlertProvider";

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    Modal: ({ visible, children }: Record<string, unknown>) =>
      visible ? ReactRuntime.createElement("Modal", null, children) : null,
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("../../api/hooks", () => ({
  useStudentInterventionAlerts: jest.fn(),
}));

jest.mock("../../navigation/navigation-ref", () => ({
  rootNavigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
  },
}));

jest.mock("../AuthProvider", () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseStudentInterventionAlerts = useStudentInterventionAlerts as jest.Mock;
const mockedRootNavigationRef = rootNavigationRef as jest.Mocked<typeof rootNavigationRef>;
const TestRenderer = require("react-test-renderer");
const act = TestRenderer.act;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function flattenText(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  const children = Array.isArray(node.children)
    ? node.children.map((child: any) => (typeof child === "string" ? child : flattenText(child))).join(" ")
    : "";
  return children;
}

function renderProvider() {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(
      <StudentInterventionAlertProvider>
        <Text>Child content</Text>
      </StudentInterventionAlertProvider>,
    );
  });
  return renderer!;
}

describe("StudentInterventionAlertProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: "student-1", roles: ["student"] },
    });
    mockedUseStudentInterventionAlerts.mockReturnValue({
      data: {
        count: 1,
        alerts: [
          {
            caseId: "case-1",
            classId: "class-1",
            status: "pending",
            subjectName: "Mathematics",
            subjectCode: "MATH-7",
            section: { id: "section-1", name: "Ruby", gradeLevel: "7" },
            triggerScore: 71.5,
            thresholdApplied: 74,
            openedAt: "2026-05-01T00:00:00.000Z",
            hasAssignedPath: false,
          },
          {
            caseId: "case-2",
            classId: "class-2",
            status: "active",
            subjectName: "English",
            subjectCode: "ENG-7",
            section: { id: "section-1", name: "Grade 7 - Section A", gradeLevel: "7" },
            triggerScore: 70,
            thresholdApplied: 74,
            openedAt: "2026-05-01T00:00:00.000Z",
            hasAssignedPath: true,
          },
          {
            caseId: "case-3",
            classId: "class-3",
            status: "pending",
            subjectName: "Science",
            subjectCode: "SCI-7",
            section: { id: "section-2", name: "Ruby", gradeLevel: "7" },
            triggerScore: null,
            thresholdApplied: 74,
            openedAt: "2026-05-01T00:00:00.000Z",
            hasAssignedPath: false,
          },
        ],
      },
    });
    mockedRootNavigationRef.isReady.mockReturnValue(true);
  });

  it("shows all intervention subjects without aggregate or grade-section text", () => {
    const renderer = renderProvider();

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Intervention Alerts");
    expect(text).toContain("MATH-7");
    expect(text).toContain("ENG-7");
    expect(text).toContain("SCI-7");
    expect(text).toContain("Mathematics");
    expect(text).toContain("English");
    expect(text).toContain("Science");
    expect(text).not.toContain("classes need attention");
    expect(text).not.toMatch(/Grade\s+7\s+-\s+Ruby/);
    expect(text).not.toMatch(/Grade\s+7\s+-\s+Grade\s+7\s+-\s+Section A/);
  });

  it("does not show a popup when the student has no open intervention alerts", () => {
    mockedUseStudentInterventionAlerts.mockReturnValue({
      data: { count: 0, alerts: [] },
    });

    const renderer = renderProvider();

    expect(flattenText(renderer.toJSON())).not.toContain("Intervention Alerts");
  });

  it("does not re-open the popup after dismissal in the same session", () => {
    const renderer = renderProvider();
    const dismissButton = renderer.root
      .findAllByType("Pressable")
      .find((node: any) => flattenText(node).includes("Dismiss"));

    act(() => {
      dismissButton?.props.onPress();
    });
    act(() => {
      renderer.update(
        <StudentInterventionAlertProvider>
          <Text>Child content</Text>
        </StudentInterventionAlertProvider>,
      );
    });

    expect(flattenText(renderer.toJSON())).not.toContain("Intervention Alerts");
  });
});
