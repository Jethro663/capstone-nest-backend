// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useQueries } from "@tanstack/react-query";
import { aiApi } from "../../api/services/ai";
import { useAuth } from "../../providers/AuthProvider";
import {
  useLxpCheckpointMutation,
  useLxpEligibility,
  useLxpPlaylist,
  usePerformanceSummary,
  useProfile,
  useProfileAvatarMutation,
  useProfileUpdateMutation,
  useStudentClasses,
  useTutorBootstrap,
  useTutorSession,
} from "../../api/hooks";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };

  class AnimatedValue {
    constructor(public value: number) {}
  }

  return {
    View: component("View"),
    Text: component("Text"),
    Pressable: component("Pressable"),
    ScrollView: component("ScrollView"),
    TextInput: component("TextInput"),
    Image: component("Image"),
    RefreshControl: component("RefreshControl"),
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Animated: {
      Value: AnimatedValue,
      View: component("AnimatedView"),
      parallel: () => ({ start: () => undefined }),
      timing: () => ({ start: () => undefined }),
    },
  };
});

jest.mock("@expo/vector-icons", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    MaterialCommunityIcons: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("MaterialCommunityIcons", props, null),
  };
});

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    hostUri: "localhost:3000",
  },
}));

jest.mock("../../components/ui/primitives", () => {
  const ReactRuntime = require("react") as typeof React;
  const component = (name: string) =>
    function MockComponent(props: Record<string, unknown>) {
      return ReactRuntime.createElement(name, props, props.children);
    };
  const Text = component("Text");

  return {
    AnimatedEntrance: component("AnimatedEntrance"),
    Card: component("Card"),
    EmptyState: ({ title, subtitle }: { title: string; subtitle: string }) =>
      ReactRuntime.createElement(
        "EmptyState",
        null,
        ReactRuntime.createElement(Text, null, title),
        ReactRuntime.createElement(Text, null, subtitle),
      ),
    GradientHeader: ({
      eyebrow,
      title,
      children,
    }: {
      eyebrow?: string;
      title: string;
      children?: React.ReactNode;
    }) =>
      ReactRuntime.createElement(
        "GradientHeader",
        null,
        eyebrow ? ReactRuntime.createElement(Text, null, eyebrow) : null,
        title ? ReactRuntime.createElement(Text, null, title) : null,
        children,
      ),
    Pill: ({ label }: { label: string }) =>
      ReactRuntime.createElement("Pill", null, ReactRuntime.createElement(Text, null, label)),
    ProgressBar: component("ProgressBar"),
    Refreshable: component("Refreshable"),
    ScreenScroll: component("ScreenScroll"),
    SectionTitle: ({ title }: { title: string }) =>
      ReactRuntime.createElement("SectionTitle", null, ReactRuntime.createElement(Text, null, title)),
    SimpleBarChart: component("SimpleBarChart"),
    StatCard: ({ value, label }: { value: string | number; label: string }) =>
      ReactRuntime.createElement(
        "StatCard",
        null,
        ReactRuntime.createElement(Text, null, String(value)),
        ReactRuntime.createElement(Text, null, label),
      ),
  };
});

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../api/services/ai", () => ({
  aiApi: {
    startTutorSession: jest.fn(),
    sendTutorMessage: jest.fn(),
    submitTutorAnswers: jest.fn(),
  },
}));

jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: {
    getByClass: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../../api/services/lessons", () => ({
  lessonsApi: {
    getByClass: jest.fn().mockResolvedValue([]),
    getCompletedByClass: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQueries: jest.fn(),
}));

jest.mock("../../api/hooks", () => ({
  queryKeys: {
    lessons: (classId: string) => ["lessons", classId],
    lessonCompletions: (classId: string) => ["lesson-completions", classId],
    assessments: (classId: string) => ["assessments", classId],
    assessmentAttempts: (assessmentId: string) => ["assessment-attempts", assessmentId],
    announcements: (classId: string) => ["announcements", classId],
  },
  useStudentClasses: jest.fn(),
  useLxpEligibility: jest.fn(),
  useTutorBootstrap: jest.fn(),
  useLxpPlaylist: jest.fn(),
  useLxpCheckpointMutation: jest.fn(),
  useTutorSession: jest.fn(),
  useProfile: jest.fn(),
  useProfileUpdateMutation: jest.fn(),
  useProfileAvatarMutation: jest.fn(),
  usePerformanceSummary: jest.fn(),
}));

jest.mock("../../data/mappers", () => ({
  toTutorRecommendationCards: jest.fn(() => [
    {
      id: "checkpoint-1",
      type: "lesson",
      emoji: "📘",
      title: "Fractions Foundation",
      reason: "Low mastery in fraction comparisons",
      xp: 20,
      completed: false,
    },
  ]),
  toSubjectCard: jest.fn((classItem: { id: string; subjectName: string }) => ({
    id: classItem.id,
    name: classItem.subjectName,
    emoji: "📘",
    progress: 78,
    color: "#4f46e5",
  })),
  toAssessmentCard: jest.fn((assessment: { id: string }) => ({
    id: assessment.id,
    raw: assessment,
    classId: "class-1",
    subjectId: "class-1",
    title: `Assessment ${assessment.id}`,
    subject: "Mathematics",
    dueDate: "Tomorrow",
    status: "pending",
    emoji: "📝",
    totalScore: 100,
  })),
  toUserProfileSummary: jest.fn(() => ({
    totalLessonsCompleted: 7,
    averageScore: 86,
    streak: 3,
  })),
  buildAchievements: jest.fn(() => [
    {
      id: "achievement-1",
      title: "Consistency",
      description: "Completed 3 checkpoints this week",
      emoji: "🏅",
      earned: true,
      earnedDate: "Today",
    },
  ]),
}));

type QueryState<T> = {
  data: T;
  error: unknown;
  isRefetching: boolean;
  refetch: jest.Mock<Promise<unknown>>;
};

function createQueryState<T>(data: T, overrides?: Partial<QueryState<T>>): QueryState<T> {
  return {
    data,
    error: null,
    isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function flattenText(node: TestRenderer.ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string"
        ? child
        : flattenText(child as TestRenderer.ReactTestInstance),
    )
    .join("");
}

function findPressableByText(root: TestRenderer.ReactTestInstance, text: string) {
  return root.find((node) => node.type === "Pressable" && flattenText(node).includes(text));
}

function findPressableByIcon(root: TestRenderer.ReactTestInstance, iconName: string) {
  return root.find((node) => {
    if (node.type !== "Pressable") return false;
    const icons = node.findAll(
      (child) => child.type === "MaterialCommunityIcons" && child.props.name === iconName,
    );
    return icons.length > 0;
  });
}

function findTextInputByPlaceholder(
  root: TestRenderer.ReactTestInstance,
  placeholder: string,
) {
  return root.find(
    (node) => node.type === "TextInput" && node.props.placeholder === placeholder,
  );
}

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseStudentClasses = useStudentClasses as jest.MockedFunction<typeof useStudentClasses>;
const mockedUseLxpEligibility = useLxpEligibility as jest.MockedFunction<typeof useLxpEligibility>;
const mockedUseTutorBootstrap = useTutorBootstrap as jest.MockedFunction<typeof useTutorBootstrap>;
const mockedUseLxpPlaylist = useLxpPlaylist as jest.MockedFunction<typeof useLxpPlaylist>;
const mockedUseLxpCheckpointMutation = useLxpCheckpointMutation as jest.MockedFunction<typeof useLxpCheckpointMutation>;
const mockedUseTutorSession = useTutorSession as jest.MockedFunction<typeof useTutorSession>;
const mockedUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockedUseProfileUpdateMutation = useProfileUpdateMutation as jest.MockedFunction<typeof useProfileUpdateMutation>;
const mockedUseProfileAvatarMutation = useProfileAvatarMutation as jest.MockedFunction<typeof useProfileAvatarMutation>;
const mockedUsePerformanceSummary = usePerformanceSummary as jest.MockedFunction<typeof usePerformanceSummary>;
const mockedUseQueries = useQueries as jest.Mock;
const mockedAiApi = aiApi as jest.Mocked<typeof aiApi>;
let checkpointMutateAsync: jest.Mock;
let profileUpdateMutateAsync: jest.Mock;
let consoleErrorSpy: jest.SpyInstance;

describe("mobile rendered screen flows", () => {
  beforeAll(() => {
    const originalConsoleError = console.error;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      const first = typeof args[0] === "string" ? args[0] : "";
      if (first.includes("react-test-renderer is deprecated")) return;
      if (first.includes("not wrapped in act")) return;
      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      user: {
        id: "student-1",
        userId: "student-1",
        firstName: "Alex",
        lastName: "Reyes",
        email: "alex@example.com",
        profilePicture: "",
      },
      logout: jest.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);

    mockedUseStudentClasses.mockReturnValue(
      createQueryState([{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }]) as ReturnType<typeof useStudentClasses>,
    );
    mockedUseLxpEligibility.mockReturnValue(
      createQueryState({
        eligibleClasses: [
          {
            classId: "class-1",
            class: {
              id: "class-1",
              subjectName: "Mathematics",
              subjectCode: "MATH-1",
              section: "A",
            },
            interventionCaseId: null,
            isAtRisk: false,
            blendedScore: 76,
            thresholdApplied: 60,
            openedAt: null,
          },
        ],
      }) as ReturnType<typeof useLxpEligibility>,
    );
    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }],
        selectedClassId: "class-1",
        recommendations: [
          {
            id: "rec-1",
            title: "Fractions Foundation",
            reason: "Rebuild fundamentals",
            focusText: "Fractions and equivalent values",
          },
        ],
        history: [],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseLxpPlaylist.mockReturnValue(
      createQueryState({
        progress: {
          streakDays: 3,
          xpTotal: 120,
          completionPercent: 60,
          checkpointsCompleted: 2,
        },
        checkpoints: [
          {
            id: "checkpoint-1",
            label: "Fractions lesson",
            xpAwarded: 20,
            isCompleted: false,
          },
        ],
      }) as ReturnType<typeof useLxpPlaylist>,
    );
    checkpointMutateAsync = jest.fn().mockResolvedValue(undefined);
    mockedUseLxpCheckpointMutation.mockReturnValue({
      mutateAsync: checkpointMutateAsync,
      error: null,
    } as ReturnType<typeof useLxpCheckpointMutation>);

    mockedUseTutorSession.mockReturnValue(
      createQueryState(undefined, {
        data: undefined,
      }) as ReturnType<typeof useTutorSession>,
    );

    mockedUseProfile.mockReturnValue(
      createQueryState({
        phone: "09170001111",
        address: "Sample address",
        familyName: "Parent",
        familyContact: "09990002222",
        profilePicture: "",
      }) as ReturnType<typeof useProfile>,
    );
    profileUpdateMutateAsync = jest.fn().mockResolvedValue(undefined);
    mockedUseProfileUpdateMutation.mockReturnValue({
      mutateAsync: profileUpdateMutateAsync,
      isPending: false,
    } as ReturnType<typeof useProfileUpdateMutation>);
    mockedUseProfileAvatarMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
    } as ReturnType<typeof useProfileAvatarMutation>);

    mockedUsePerformanceSummary.mockReturnValue(
      createQueryState({
        overall: {
          averageBlendedScore: 84,
          atRiskClasses: 0,
        },
        classes: [{ classId: "class-1", blendedScore: 84 }],
      }) as ReturnType<typeof usePerformanceSummary>,
    );

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      if (useQueriesCall === 1) {
        return queries.map(() => ({ data: [{ id: "lesson-1" }], error: null }));
      }
      if (useQueriesCall === 2) {
        return queries.map(() => ({ data: [{ id: "completed-1" }], error: null }));
      }
      return queries.map(() => ({ data: [{ id: "assessment-1" }], error: null }));
    });

    mockedAiApi.startTutorSession.mockResolvedValue({ sessionId: "session-1" } as Awaited<ReturnType<typeof aiApi.startTutorSession>>);
    mockedAiApi.sendTutorMessage.mockResolvedValue(undefined as never);
    mockedAiApi.submitTutorAnswers.mockResolvedValue(undefined as never);
  });

  it("renders LXP screen and routes to tutor from quick launcher", () => {
    const { LxpScreen } = require("../LxpScreen");
    const navigate = jest.fn();
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LxpScreen, {
          navigation: { navigate } as never,
          route: { key: "LXP", name: "LXP" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("LXP Dashboard")),
    ).toBeTruthy();

    const openTutorButton = findPressableByText(testRenderer!.root, "Open Tutor");
    act(() => {
      openTutorButton.props.onPress();
    });

    const renderedLxpText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");
    expect(renderedLxpText).not.toContain("ðŸ");
    expect(renderedLxpText).not.toContain("âœ");

    expect(navigate).toHaveBeenCalledWith("AiTutor", { classId: "class-1" });
  });

  it("blocks tutor launch when no class is selected and shows guidance", () => {
    mockedUseStudentClasses.mockReturnValue(
      createQueryState([]) as ReturnType<typeof useStudentClasses>,
    );
    mockedUseLxpEligibility.mockReturnValue(
      createQueryState({ eligibleClasses: [] }) as ReturnType<typeof useLxpEligibility>,
    );
    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [],
        selectedClassId: undefined,
        recommendations: [],
        history: [],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseLxpPlaylist.mockReturnValue(
      createQueryState({
        progress: {
          streakDays: 0,
          xpTotal: 0,
          completionPercent: 0,
          checkpointsCompleted: 0,
        },
        checkpoints: [],
      }) as ReturnType<typeof useLxpPlaylist>,
    );

    const { LxpScreen } = require("../LxpScreen");
    const navigate = jest.fn();
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LxpScreen, {
          navigation: { navigate } as never,
          route: { key: "LXP", name: "LXP" } as never,
        }),
      );
    });

    const openTutorButton = findPressableByText(testRenderer!.root, "Open Tutor");
    act(() => {
      openTutorButton.props.onPress();
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Select a class before opening the tutor"),
      ),
    ).toBeTruthy();
  });

  it("submits checkpoint completion from LXP recommendation action", async () => {
    jest.useFakeTimers();
    const { LxpScreen } = require("../LxpScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LxpScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "LXP", name: "LXP" } as never,
        }),
      );
    });

    const completeAction = findPressableByIcon(testRenderer!.root, "chevron-right");
    await act(async () => {
      completeAction.props.onPress();
      await Promise.resolve();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();

    expect(checkpointMutateAsync).toHaveBeenCalledWith({ assignmentId: "checkpoint-1" });
  });

  it("surfaces checkpoint completion error when recommendation action fails", async () => {
    checkpointMutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          message: "Unable to complete checkpoint right now",
        },
      },
      message: "Request failed",
    });

    const { LxpScreen } = require("../LxpScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LxpScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "LXP", name: "LXP" } as never,
        }),
      );
    });

    const completeAction = findPressableByIcon(testRenderer!.root, "chevron-right");
    await act(async () => {
      completeAction.props.onPress();
      await Promise.resolve();
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Unable to complete checkpoint right now"),
      ),
    ).toBeTruthy();
  });

  it("starts a tutor session from recommendation card in AI Tutor screen", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const recommendationCard = findPressableByText(testRenderer!.root, "Fractions Foundation");
    await act(async () => {
      await recommendationCard.props.onPress();
    });

    expect(mockedAiApi.startTutorSession).toHaveBeenCalledWith({
      classId: "class-1",
      recommendation: {
        id: "rec-1",
        title: "Fractions Foundation",
        reason: "Rebuild fundamentals",
        focusText: "Fractions and equivalent values",
      },
    });
  });

  it("shows tutor-start guidance when no class is selected", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");
    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [],
        selectedClassId: undefined,
        recommendations: [
          {
            id: "rec-1",
            title: "Fractions Foundation",
            reason: "Rebuild fundamentals",
            focusText: "Fractions and equivalent values",
          },
        ],
        history: [],
      }) as ReturnType<typeof useTutorBootstrap>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: {} } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const recommendationCard = findPressableByText(testRenderer!.root, "Fractions Foundation");
    await act(async () => {
      await recommendationCard.props.onPress();
    });

    expect(mockedAiApi.startTutorSession).not.toHaveBeenCalled();
    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Select a class before starting a tutor session"),
      ),
    ).toBeTruthy();
  });

  it("surfaces tutor-start errors when AI session bootstrap fails", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");
    mockedAiApi.startTutorSession.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          message: "Tutor service unavailable",
        },
      },
      message: "Request failed",
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const recommendationCard = findPressableByText(testRenderer!.root, "Fractions Foundation");
    await act(async () => {
      await recommendationCard.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Tutor service unavailable"),
      ),
    ).toBeTruthy();
  });

  it("gates tutor message send on non-empty text and active session", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");
    const tutorSessionRefetch = jest.fn().mockResolvedValue(undefined);

    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }],
        selectedClassId: "class-1",
        recommendations: [
          {
            id: "rec-1",
            title: "Fractions Foundation",
            reason: "Rebuild fundamentals",
            focusText: "Fractions and equivalent values",
          },
        ],
        history: [
          {
            sessionId: "session-1",
            title: "Recent tutor session",
            preview: "Continue fractions review",
          },
        ],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseTutorSession.mockImplementation((sessionId?: string) => {
      if (!sessionId) {
        return createQueryState(undefined, { data: undefined }) as ReturnType<typeof useTutorSession>;
      }

      return createQueryState(
        {
          state: {
            recommendation: { title: "Fractions Foundation" },
            lessonBody: "Review lesson",
            lessonPlan: [],
            questions: [],
          },
          messages: [],
        },
        { refetch: tutorSessionRefetch },
      ) as ReturnType<typeof useTutorSession>;
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const historyEntry = findPressableByText(testRenderer!.root, "Recent tutor session");
    await act(async () => {
      historyEntry.props.onPress();
    });

    const sendButton = findPressableByIcon(testRenderer!.root, "send");
    await act(async () => {
      await sendButton.props.onPress();
    });
    expect(mockedAiApi.sendTutorMessage).not.toHaveBeenCalled();

    const messageInput = findTextInputByPlaceholder(
      testRenderer!.root,
      "Ask a follow-up question",
    );
    await act(async () => {
      messageInput.props.onChangeText("Need help with fractions");
    });
    await act(async () => {
      await sendButton.props.onPress();
    });

    expect(mockedAiApi.sendTutorMessage).toHaveBeenCalledWith(
      "session-1",
      "Need help with fractions",
    );
    expect(tutorSessionRefetch).toHaveBeenCalled();
  });

  it("surfaces tutor message-send error when follow-up request fails", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");

    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }],
        selectedClassId: "class-1",
        recommendations: [],
        history: [
          {
            sessionId: "session-1",
            title: "Recent tutor session",
            preview: "Continue fractions review",
          },
        ],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseTutorSession.mockImplementation((sessionId?: string) => {
      if (!sessionId) {
        return createQueryState(undefined, { data: undefined }) as ReturnType<typeof useTutorSession>;
      }

      return createQueryState({
        state: {
          recommendation: { title: "Fractions Foundation" },
          lessonBody: "Review lesson",
          lessonPlan: [],
          questions: [],
        },
        messages: [],
      }) as ReturnType<typeof useTutorSession>;
    });
    mockedAiApi.sendTutorMessage.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          message: "Tutor message service is unavailable",
        },
      },
      message: "Request failed",
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const historyEntry = findPressableByText(testRenderer!.root, "Recent tutor session");
    await act(async () => {
      historyEntry.props.onPress();
    });

    const messageInput = findTextInputByPlaceholder(
      testRenderer!.root,
      "Ask a follow-up question",
    );
    await act(async () => {
      messageInput.props.onChangeText("Need another hint");
    });

    const sendButton = findPressableByIcon(testRenderer!.root, "send");
    await act(async () => {
      await sendButton.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Tutor message service is unavailable"),
      ),
    ).toBeTruthy();
  });

  it("surfaces tutor answer-check error when submit answers fails", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");

    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }],
        selectedClassId: "class-1",
        recommendations: [],
        history: [
          {
            sessionId: "session-1",
            title: "Recent tutor session",
            preview: "Continue fractions review",
          },
        ],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseTutorSession.mockImplementation((sessionId?: string) => {
      if (!sessionId) {
        return createQueryState(undefined, { data: undefined }) as ReturnType<typeof useTutorSession>;
      }

      return createQueryState({
        state: {
          recommendation: { title: "Fractions Foundation" },
          lessonBody: "Review lesson",
          lessonPlan: [],
          questions: [
            {
              id: "q-1",
              question: "What is 1/2 + 1/4?",
              hint: "Use common denominator",
            },
          ],
        },
        messages: [],
      }) as ReturnType<typeof useTutorSession>;
    });
    mockedAiApi.submitTutorAnswers.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          message: "Answer checking is unavailable right now",
        },
      },
      message: "Request failed",
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const historyEntry = findPressableByText(testRenderer!.root, "Recent tutor session");
    await act(async () => {
      historyEntry.props.onPress();
    });

    const answerInput = findTextInputByPlaceholder(
      testRenderer!.root,
      "Use common denominator",
    );
    await act(async () => {
      answerInput.props.onChangeText("3/4");
    });

    const checkAnswersButton = findPressableByText(testRenderer!.root, "Check Answers");
    await act(async () => {
      await checkAnswersButton.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Answer checking is unavailable right now"),
      ),
    ).toBeTruthy();
  });

  it("blocks tutor answer submit when all answers are empty", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");

    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" }],
        selectedClassId: "class-1",
        recommendations: [],
        history: [
          {
            sessionId: "session-1",
            title: "Recent tutor session",
            preview: "Continue fractions review",
          },
        ],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseTutorSession.mockImplementation((sessionId?: string) => {
      if (!sessionId) {
        return createQueryState(undefined, { data: undefined }) as ReturnType<typeof useTutorSession>;
      }

      return createQueryState({
        state: {
          recommendation: { title: "Fractions Foundation" },
          lessonBody: "Review lesson",
          lessonPlan: [],
          questions: [
            {
              id: "q-1",
              question: "What is 1/2 + 1/4?",
              hint: "Use common denominator",
            },
          ],
        },
        messages: [],
      }) as ReturnType<typeof useTutorSession>;
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const historyEntry = findPressableByText(testRenderer!.root, "Recent tutor session");
    await act(async () => {
      historyEntry.props.onPress();
    });

    const checkAnswersButton = findPressableByText(testRenderer!.root, "Check Answers");
    await act(async () => {
      await checkAnswersButton.props.onPress();
    });

    expect(mockedAiApi.submitTutorAnswers).not.toHaveBeenCalled();
    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Provide at least one answer before checking"),
      ),
    ).toBeTruthy();
  });

  it("clears active tutor session when switching selected class", async () => {
    const { AiTutorScreen } = require("../AiTutorScreen");

    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState({
        classes: [
          { id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1" },
          { id: "class-2", subjectName: "Science", subjectCode: "SCI-1" },
        ],
        selectedClassId: "class-1",
        recommendations: [],
        history: [
          {
            sessionId: "session-1",
            title: "Recent tutor session",
            preview: "Continue fractions review",
          },
        ],
      }) as ReturnType<typeof useTutorBootstrap>,
    );
    mockedUseTutorSession.mockImplementation((sessionId?: string) => {
      if (!sessionId) {
        return createQueryState(undefined, { data: undefined }) as ReturnType<typeof useTutorSession>;
      }

      return createQueryState({
        state: {
          recommendation: { title: "Fractions Foundation" },
          lessonBody: "Review lesson",
          lessonPlan: [],
          questions: [],
        },
        messages: [],
      }) as ReturnType<typeof useTutorSession>;
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AiTutorScreen, {
          route: { key: "AiTutor", name: "AiTutor", params: { classId: "class-1" } } as never,
          navigation: { goBack: jest.fn() } as never,
        }),
      );
    });

    const historyEntry = findPressableByText(testRenderer!.root, "Recent tutor session");
    await act(async () => {
      historyEntry.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Lesson packet"),
      ),
    ).toBeTruthy();

    const switchClass = findPressableByText(testRenderer!.root, "Science");
    await act(async () => {
      switchClass.props.onPress();
    });

    expect(
      testRenderer!.root.findAll(
        (node) => node.type === "Text" && flattenText(node).includes("Lesson packet"),
      ),
    ).toHaveLength(0);
  });

  it("renders Profile screen and saves profile details", async () => {
    const { ProfileScreen } = require("../ProfileScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(ProfileScreen, {
          navigation: {} as never,
          route: { key: "Profile", name: "Profile" } as never,
        }),
      );
    });
    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("Alex Reyes")),
    ).toBeTruthy();

    const saveButton = findPressableByText(testRenderer!.root, "Save Profile");
    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(profileUpdateMutateAsync).toHaveBeenCalledWith({
      phone: "09170001111",
      address: "Sample address",
      familyName: "Parent",
      familyContact: "09990002222",
    });
  });

  it("shows profile save error when update mutation fails", async () => {
    const { ProfileScreen } = require("../ProfileScreen");
    profileUpdateMutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          message: "Unable to save profile right now",
        },
      },
      message: "Request failed",
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(ProfileScreen, {
          navigation: {} as never,
          route: { key: "Profile", name: "Profile" } as never,
        }),
      );
    });

    const saveButton = findPressableByText(testRenderer!.root, "Save Profile");
    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Unable to save profile right now"),
      ),
    ).toBeTruthy();
  });

  it("renders Progress screen and surfaces backend error state", () => {
    const { ProgressScreen } = require("../ProgressScreen");
    mockedUsePerformanceSummary.mockReturnValue(
      createQueryState(
        {
          overall: { averageBlendedScore: 0, atRiskClasses: 0 },
          classes: [],
        },
        { error: { message: "Performance API unavailable" } },
      ) as ReturnType<typeof usePerformanceSummary>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ProgressScreen, {
          navigation: {} as never,
          route: { key: "Progress", name: "Progress" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Progress data is partially unavailable"),
      ),
    ).toBeTruthy();
  });

  it("renders Assessments screen and opens assessment details from a card", () => {
    const { AssessmentsScreen } = require("../AssessmentsScreen");
    const navigate = jest.fn();
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentsScreen, {
          navigation: { navigate } as never,
          route: { key: "Assessments", name: "Assessments" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Assessments"),
      ),
    ).toBeTruthy();

    const assessmentCard = findPressableByText(testRenderer!.root, "Assessment assessment-1");
    act(() => {
      assessmentCard.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentDetail", {
      assessmentId: "assessment-1",
      classId: "class-1",
    });
  });

  it("surfaces assessments backend error state in rendered screen flow", () => {
    const { AssessmentsScreen } = require("../AssessmentsScreen");
    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      if (useQueriesCall === 1) {
        return queries.map(() => ({ data: [{ id: "lesson-1" }], error: null }));
      }
      if (useQueriesCall === 2) {
        return queries.map(() => ({ data: [{ id: "completed-1" }], error: null }));
      }
      if (useQueriesCall === 3) {
        return queries.map(() => ({
          data: [],
          error: {
            isAxiosError: true,
            message: "Request failed with status code 503",
            response: {
              status: 503,
              data: {
                message: "Assessments API unavailable",
              },
            },
          },
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }
      return queries.map(() => ({ data: [], error: null }));
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentsScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Assessments", name: "Assessments" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Assessments are unavailable"),
      ),
    ).toBeTruthy();
    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Assessments API unavailable"),
      ),
    ).toBeTruthy();
  });

  it("updates assessments empty-state subtitle when filter changes", () => {
    const { AssessmentsScreen } = require("../AssessmentsScreen");
    const toAssessmentCard = require("../../data/mappers").toAssessmentCard as jest.Mock;
    toAssessmentCard.mockImplementation((assessment: { id: string }) => ({
      id: assessment.id,
      raw: assessment,
      classId: "class-1",
      subjectId: "class-1",
      title: `Assessment ${assessment.id}`,
      subject: "Mathematics",
      dueDate: "Tomorrow",
      status: "pending",
      emoji: "📝",
      totalScore: 100,
    }));

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentsScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Assessments", name: "Assessments" } as never,
        }),
      );
    });

    const completedFilter = findPressableByText(testRenderer!.root, "completed");
    act(() => {
      completedFilter.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("No completed assessments right now."),
      ),
    ).toBeTruthy();
  });
});
