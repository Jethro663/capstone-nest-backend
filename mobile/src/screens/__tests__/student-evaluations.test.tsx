import React from "react";
// react-test-renderer is bundled for Jest but does not ship local declarations.
// Keep the harness deliberately small instead of disabling checks for this file.
const TestRenderer = require("react-test-renderer") as any;
const act = TestRenderer.act as (callback: () => void | Promise<void>) => void | Promise<void>;
import { StudentEvaluationsScreen } from "../StudentEvaluationsScreen";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockAlert = jest.fn();
const mockSubmitTeacherEvaluation = jest.fn();
const mockSubmitSystemEvaluation = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockAddBackHandlerListener = jest.fn();
const mockRefetch = jest.fn();
const mountedRenderers: any[] = [];
let mockQueriesLoading = false;
let mockQueriesError = false;

const teacherDashboard = {
  currentAcademicState: { schoolYear: "2025-2026", quarter: "Q2" },
  pending: [
    {
      classId: "class-1",
      gradingPeriod: "Q2",
      schoolYear: "2025-2026",
      evaluationType: "teacher_class",
      title: "Teacher and Class Evaluation",
      description: "Rate the teaching and learning experience.",
      class: {
        id: "class-1",
        subjectCode: "MATH-7",
        subjectName: "Mathematics 7",
      },
      questions: [
        { key: "teaching_clarity", label: "Lessons are explained clearly." },
        { key: "teacher_support", label: "The teacher provides support." },
      ],
    },
  ],
  completed: [
    {
      id: "teacher-completed-1",
      classId: "class-1",
      gradingPeriod: "Q1",
      evaluationType: "teacher_class",
      title: "Completed Teacher Evaluation",
      submittedAt: "2026-04-01T00:00:00.000Z",
      class: {
        id: "class-1",
        subjectCode: "MATH-7",
        subjectName: "Mathematics 7",
      },
    },
  ],
};

const systemDashboard = {
  pending: [
    {
      id: "assignment-system",
      campaignId: "campaign-1",
      formType: "system",
      targetModule: "overall",
      title: "System Pulse",
      description: "Rate the LMS experience.",
      audienceRole: "student",
      classId: null,
      class: null,
      startsAt: "2026-05-01T00:00:00.000Z",
      endsAt: "2026-05-20T00:00:00.000Z",
      status: "pending",
      questions: [
        { key: "system_navigation", label: "The system is easy to navigate." },
        { key: "system_features", label: "The features work correctly." },
      ],
    },
  ],
  completed: [],
};

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: any) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  return {
    BackHandler: {
      addEventListener: (...args: unknown[]) => mockAddBackHandlerListener(...args),
    },
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    Modal: component("Modal"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View"),
    Platform: { OS: "ios" },
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("Icon", props),
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[0] === "student-evaluations-inbox"
        ? teacherDashboard
        : systemDashboard,
    isError: mockQueriesError,
    isLoading: mockQueriesLoading,
    isRefetching: false,
    error: mockQueriesError ? new Error("Please try again.") : null,
    refetch: mockRefetch,
  }),
  useMutation: (options: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess: () => void;
    onError: (error: unknown) => void;
  }) => ({
    isPending: false,
    mutate: (variables: unknown) => {
      void options.mutationFn(variables).then(options.onSuccess).catch(options.onError);
    },
  }),
}));

jest.mock("../../api/hooks", () => ({
  useStudentClasses: () => ({ data: [] }),
}));

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "student-1", userId: "student-1" } }),
}));

jest.mock("../../api/services/evaluations", () => ({
  evaluationsApi: {
    getStudentInbox: jest.fn(),
    getMySystemEvaluations: jest.fn(),
    submitEvaluation: (...args: unknown[]) => mockSubmitTeacherEvaluation(...args),
    submitAssignedSystemEvaluation: (...args: unknown[]) =>
      mockSubmitSystemEvaluation(...args),
  },
}));

jest.mock("../../api/http", () => ({
  toAppError: (error: { message?: string }) => ({
    message: error?.message ?? "Unknown error",
  }),
}));

jest.mock("../../components/ui/AppAlert", () => ({
  AppAlert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

jest.mock("../../components/ui/primitives", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    ScreenScroll: ({ children, ...props }: any) =>
      ReactRuntime.createElement("ScreenScroll", props, children),
    Refreshable: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("Refreshable", props),
  };
});

jest.mock("../../components/navigation/RoleNavigationDrawer", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    RoleHeaderNavigationButton: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("RoleHeaderNavigationButton", props),
  };
});

function renderScreen() {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(
      <StudentEvaluationsScreen navigation={{ goBack: jest.fn() } as never} route={{} as never} />,
    );
  });
  mountedRenderers.push(renderer!);
  return renderer!;
}

function renderedText(renderer: any) {
  const flattenText = (value: unknown): string => {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(flattenText).join(" ");
    return "";
  };
  return renderer.root
    .findAll((node: any) => node.type === "Text")
    .map((node: any) => flattenText(node.props.children))
    .join(" ");
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("StudentEvaluationsScreen", () => {
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
    jest.clearAllMocks();
    mockSubmitTeacherEvaluation.mockResolvedValue({ id: "teacher-evaluation-1" });
    mockSubmitSystemEvaluation.mockResolvedValue({ id: "system-evaluation-1" });
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockAddBackHandlerListener.mockReturnValue({ remove: jest.fn() });
    mockQueriesLoading = false;
    mockQueriesError = false;
    mockRefetch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      mountedRenderers.splice(0).forEach((renderer) => renderer.unmount());
    });
    jest.restoreAllMocks();
  });

  it("shows an explicit loading state instead of a completed-empty state", () => {
    mockQueriesLoading = true;

    const renderer = renderScreen();

    expect(renderedText(renderer)).toContain("Loading evaluations");
    expect(renderedText(renderer)).not.toContain("No pending evaluations");
    expect(renderedText(renderer)).not.toContain(
      "You have completed all pending evaluation forms!",
    );
  });

  it("shows an in-page query error and retries both evaluation inboxes", () => {
    mockQueriesError = true;
    const renderer = renderScreen();

    expect(renderedText(renderer)).toContain("Evaluations unavailable");
    expect(renderedText(renderer)).not.toContain("No pending evaluations");

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Retry loading evaluations" })
        .props.onPress();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });

  it("keeps teacher ratings blank, submits an intentional zero, and preserves the form on failure", async () => {
    mockSubmitTeacherEvaluation.mockRejectedValue(new Error("Please try again."));
    const renderer = renderScreen();

    expect(renderedText(renderer)).toContain("Not observed");
    expect(renderedText(renderer)).toContain("Excellent");

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Start Teacher and Class Evaluation" })
        .props.onPress();
    });

    expect(renderer.root.findByType("KeyboardAvoidingView").props.behavior).toBe("padding");
    expect(renderer.root.findByType("ScreenScroll").props.keyboardShouldPersistTaps).toBe("handled");
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "0 stars, Not observed, for Lessons are explained clearly.",
      }).props.accessibilityHint,
    ).toBe("The behavior or result was not demonstrated.");

    const submitButton = renderer.root.findByProps({
      accessibilityLabel: "Submit Evaluation",
    });
    expect(submitButton.props.disabled).toBe(true);
    expect(mockSubmitTeacherEvaluation).not.toHaveBeenCalled();

    act(() => {
      renderer.root
        .findByProps({
          accessibilityLabel: "0 stars, Not observed, for Lessons are explained clearly.",
        })
        .props.onPress();
      renderer.root
        .findByProps({
          accessibilityLabel: "5 stars, Excellent, for The teacher provides support.",
        })
        .props.onPress();
    });
    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Submit Evaluation" })
        .props.onPress();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mockSubmitTeacherEvaluation).toHaveBeenCalledWith({
      classId: "class-1",
      gradingPeriod: "Q2",
      evaluationType: "teacher_class",
      ratings: { teaching_clarity: 0, teacher_support: 5 },
      comment: undefined,
    });
    expect(renderedText(renderer)).toMatch(/0\s+·\s+Not observed/);
    expect(renderedText(renderer)).toContain("Teacher and Class Evaluation");
    expect(mockAlert).toHaveBeenCalledWith("Submission Failed", "Please try again.");
  });

  it("uses hardware Back to leave the form without submitting", () => {
    const renderer = renderScreen();

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Start Teacher and Class Evaluation" })
        .props.onPress();
    });
    const hardwareBackHandler = mockAddBackHandlerListener.mock.calls.at(-1)?.[1] as
      | (() => boolean)
      | undefined;

    expect(hardwareBackHandler).toBeDefined();
    act(() => {
      expect(hardwareBackHandler?.()).toBe(true);
    });

    expect(
      renderer.root.findByProps({ accessibilityLabel: "Start Teacher and Class Evaluation" }),
    ).toBeDefined();
    expect(mockSubmitTeacherEvaluation).not.toHaveBeenCalled();
  });

  it("renders submitted history as static content instead of a dead View button", () => {
    const renderer = renderScreen();

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Show submitted evaluations" })
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({ accessibilityLabel: "Submitted Completed Teacher Evaluation" }).props.accessibilityRole,
    ).toBeUndefined();
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: "View Completed Teacher Evaluation" }),
    ).toHaveLength(0);
  });

  it("submits the identical zero-to-five contract for an assigned system evaluation", async () => {
    const renderer = renderScreen();

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: "Start System Pulse" })
        .props.onPress();
    });
    act(() => {
      renderer.root
        .findByProps({
          accessibilityLabel: "0 stars, Not observed, for The system is easy to navigate.",
        })
        .props.onPress();
      renderer.root
        .findByProps({
          accessibilityLabel: "5 stars, Excellent, for The features work correctly.",
        })
        .props.onPress();
    });
    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Submit Evaluation" })
        .props.onPress();
      await Promise.resolve();
    });
    await flushPromises();

    expect(mockSubmitSystemEvaluation).toHaveBeenCalledWith(
      "assignment-system",
      {
        questionRatings: { system_navigation: 0, system_features: 5 },
        feedback: undefined,
      },
    );
  });
});
