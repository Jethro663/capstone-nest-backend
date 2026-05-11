// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useQueries } from "@tanstack/react-query";
import { TeacherAssessmentDetailScreen } from "../TeacherAssessmentDetailScreen";
import { TeacherHomeScreen } from "../TeacherHomeScreen";
import { TeacherProfileScreen } from "../TeacherProfileScreen";
import { useAuth } from "../../providers/AuthProvider";
import {
  useAssessmentDetail,
  useTeacherAssessmentUpdateMutation,
  useTeacherAssessmentSubmissions,
  useTeacherClasses,
  useTeacherProfile,
  useTeacherProfileAvatarMutation,
  useTeacherProfileUpdateMutation,
} from "../../api/hooks";

jest.mock("@tanstack/react-query", () => ({
  useQueries: jest.fn(),
}));

jest.mock("react-native", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);

  return {
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    TextInput: component("TextInput"),
    Image: component("Image"),
    Alert: { alert: jest.fn() },
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react");
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("../../components/ui/primitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  return {
    Refreshable: component("Refreshable"),
    ScreenScroll: component("ScreenScroll"),
  };
});

jest.mock("../../components/teacher/TeacherMobilePrimitives", () => {
  const ReactRuntime = require("react");
  const component = (name: string) => (props: Record<string, unknown>) =>
    ReactRuntime.createElement(name, props, props.children);
  const Text = component("Text");

  return {
    teacherTheme: {
      red: "#00288E",
      green: "#166534",
      amber: "#B45309",
      blue: "#1E40AF",
      muted: "#64748B",
      dim: "#757684",
      text: "#191C1E",
      border: "#E2E8F0",
      border2: "#C4C5D5",
      surface: "#FFFFFF",
      surface2: "#F2F4F6",
      redSoft: "#DDE1FF",
      redLine: "rgba(0,40,142,0.22)",
      greenSoft: "#DCFCE7",
      greenLine: "rgba(22,101,52,0.22)",
      amberSoft: "#FEF3C7",
      blueSoft: "#D0E1FB",
      purpleSoft: "#DAE2FD",
      active: "#F2F4F6",
      header: "#FFFFFF",
    },
    stripRichText: (value?: string) => value || "",
    TeacherScreen: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement("TeacherScreen", null, ReactRuntime.createElement(Text, null, title), subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, children),
    TeacherPanel: ({ title, subtitle, children }: any) =>
      ReactRuntime.createElement("TeacherPanel", null, title ? ReactRuntime.createElement(Text, null, title) : null, subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, children),
    TeacherStats: ({ items }: any) =>
      ReactRuntime.createElement("TeacherStats", null, items.map((item: any) => ReactRuntime.createElement(Text, { key: item.label }, `${item.label}:${item.value}`))),
    TeacherChip: ({ label }: any) => ReactRuntime.createElement(Text, null, label),
    TeacherActionButton: ({ label }: any) => ReactRuntime.createElement(Text, null, label),
    TeacherEmpty: ({ title, subtitle }: any) => ReactRuntime.createElement("TeacherEmpty", null, ReactRuntime.createElement(Text, null, title), ReactRuntime.createElement(Text, null, subtitle)),
    TeacherRow: ({ title, subtitle, right }: any) => ReactRuntime.createElement("TeacherRow", null, ReactRuntime.createElement(Text, null, title), subtitle ? ReactRuntime.createElement(Text, null, subtitle) : null, right),
    TeacherSearch: component("TeacherSearch"),
    TeacherInlineField: ({ label, value }: any) => ReactRuntime.createElement("TeacherInlineField", null, ReactRuntime.createElement(Text, null, label), ReactRuntime.createElement(Text, null, value)),
  };
});

jest.mock("../../api/config", () => ({
  API_BASE_URL: "http://localhost:3000/api",
}));

jest.mock("../../api/services/announcements", () => ({
  announcementsApi: {
    getByClass: jest.fn(),
  },
}));

jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: {
    getByClass: jest.fn(),
    openTeacherAttachment: jest.fn(),
  },
}));

jest.mock("../../api/services/performance", () => ({
  performanceApi: {
    getClassAtRisk: jest.fn(),
  },
}));

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../api/hooks", () => ({
  queryKeys: {
    assessments: (classId: string) => ["assessments", classId],
    announcements: (classId: string) => ["announcements", classId],
    teacherClassAtRisk: (classId: string) => ["teacher-class-at-risk", classId],
  },
  useTeacherClasses: jest.fn(),
  useAssessmentDetail: jest.fn(),
  useTeacherAssessmentUpdateMutation: jest.fn(),
  useTeacherAssessmentSubmissions: jest.fn(),
  useTeacherProfile: jest.fn(),
  useTeacherProfileUpdateMutation: jest.fn(),
  useTeacherProfileAvatarMutation: jest.fn(),
}));

const mockedUseQueries = useQueries as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedUseTeacherClasses = useTeacherClasses as jest.Mock;
const mockedUseAssessmentDetail = useAssessmentDetail as jest.Mock;
const mockedUseTeacherAssessmentUpdateMutation = useTeacherAssessmentUpdateMutation as jest.Mock;
const mockedUseTeacherAssessmentSubmissions = useTeacherAssessmentSubmissions as jest.Mock;
const mockedUseTeacherProfile = useTeacherProfile as jest.Mock;
const mockedUseTeacherProfileUpdateMutation = useTeacherProfileUpdateMutation as jest.Mock;
const mockedUseTeacherProfileAvatarMutation = useTeacherProfileAvatarMutation as jest.Mock;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function flattenText(node: TestRenderer.ReactTestRendererJSON | TestRenderer.ReactTestRendererJSON[] | null): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  const children = Array.isArray(node.children) ? node.children.map((child) => (typeof child === "string" ? child : flattenText(child))).join(" ") : "";
  return children;
}

describe("teacher mobile screens", () => {
  beforeEach(() => {
    mockedUseQueries.mockReturnValue([]);
    mockedUseAuth.mockReturnValue({
      user: {
        id: "teacher-1",
        userId: "teacher-1",
        email: "teacher@nexora.test",
        firstName: "Teacher",
        lastName: "One",
      },
      logout: jest.fn(),
    });
  });

  it("renders the teacher home overview with class-centric content", () => {
    mockedUseTeacherClasses.mockReturnValue({
      data: [
        {
          id: "class-1",
          subjectCode: "INF234",
          subjectName: "Capstone",
          section: { name: "12-A" },
          schoolYear: "2025-2026",
          enrollmentCount: 32,
        },
      ],
      isRefetching: false,
      refetch: jest.fn(),
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherHomeScreen
          navigation={{ navigate: jest.fn() } as never}
          route={{ key: "Home", name: "Home" } as never}
        />,
      );
    });

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Teacher Home");
    expect(text).toContain("Capstone");
    expect(text).toContain("Open Calendar");
  });

  it("renders teacher assessment detail with submissions", () => {
    mockedUseAssessmentDetail.mockReturnValue({
      data: {
        id: "assessment-1",
        classId: "class-1",
        title: "Quarter Quiz",
        type: "quiz",
        isPublished: true,
        dueDate: "2026-05-08T08:00:00.000Z",
        questions: [{ id: "q1" }],
      },
      isRefetching: false,
      refetch: jest.fn(),
    });
    mockedUseTeacherAssessmentSubmissions.mockReturnValue({
      data: {
        summary: { total: 1, notStarted: 0, inProgress: 0, turnedIn: 1, returned: 0 },
        submissions: [
          {
            studentId: "student-1",
            studentName: "Student One",
            status: "turned_in",
            latestAttemptId: "attempt-1",
          },
        ],
      },
      isRefetching: false,
      refetch: jest.fn(),
    });
    mockedUseTeacherAssessmentUpdateMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherAssessmentDetailScreen
          navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
          route={{ key: "TeacherAssessmentDetail", name: "TeacherAssessmentDetail", params: { assessmentId: "assessment-1", classId: "class-1" } } as never}
        />,
      );
    });

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Quarter Quiz");
    expect(text).toContain("Submissions");
    expect(text).toContain("Student One");
  });

  it("renders the teacher profile screen against teacher profile data", () => {
    mockedUseTeacherProfile.mockReturnValue({
      data: {
        id: "profile-1",
        userId: "teacher-1",
        department: "ICT",
        specialization: "Software",
        employeeId: "EMP-001",
        phone: "09123456789",
        address: "Manila",
      },
      isRefetching: false,
      refetch: jest.fn(),
    });
    mockedUseTeacherProfileUpdateMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockedUseTeacherProfileAvatarMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TeacherProfileScreen
          navigation={{ navigate: jest.fn() } as never}
          route={{ key: "Profile", name: "Profile" } as never}
        />,
      );
    });

    const text = flattenText(renderer.toJSON());
    expect(text).toContain("Teacher One");
    expect(text).toContain("ICT");
    expect(text).toContain("Employee ID");
  });
});
