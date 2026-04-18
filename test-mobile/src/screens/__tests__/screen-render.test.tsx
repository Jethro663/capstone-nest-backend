// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../../api/services/ai";
import { useAuth } from "../../providers/AuthProvider";
import {
  useAnnouncements,
  useClassDetail,
  useClassModules,
  useSchoolEvents,
  useLessons,
  useLessonDetail,
  useLessonCompletionStatus,
  useLessonCompletions,
  useLessonCompleteMutation,
  useModuleDetail,
  useAssessments,
  useAssessmentAttempts,
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
    Platform: {
      OS: "ios",
    },
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

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    hostUri: "localhost:3000",
  },
}));

jest.mock("expo-linear-gradient", () => {
  const ReactRuntime = require("react") as typeof React;
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      ReactRuntime.createElement("LinearGradient", props, props.children),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
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
    FloatingIconButton: component("FloatingIconButton"),
    Pill: ({ label }: { label: string }) =>
      ReactRuntime.createElement("Pill", null, ReactRuntime.createElement(Text, null, label)),
    ProgressBar: component("ProgressBar"),
    Refreshable: component("Refreshable"),
    SearchField: component("SearchField"),
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
  useQueryClient: jest.fn(),
}));

jest.mock("../../api/hooks", () => ({
  queryKeys: {
    lessons: (classId: string) => ["lessons", classId],
    lessonCompletions: (classId: string) => ["lesson-completions", classId],
    lessonCompletionStatus: (lessonId: string) => ["lesson-completion-status", lessonId],
    assessments: (classId: string) => ["assessments", classId],
    assessmentAttempts: (assessmentId: string) => ["assessment-attempts", assessmentId],
    announcements: (classId: string) => ["announcements", classId],
  },
  useStudentClasses: jest.fn(),
  useClassDetail: jest.fn(),
  useClassModules: jest.fn(),
  useLxpEligibility: jest.fn(),
  useTutorBootstrap: jest.fn(),
  useLxpPlaylist: jest.fn(),
  useLxpCheckpointMutation: jest.fn(),
  useTutorSession: jest.fn(),
  useProfile: jest.fn(),
  useProfileUpdateMutation: jest.fn(),
  useProfileAvatarMutation: jest.fn(),
  usePerformanceSummary: jest.fn(),
  useSchoolEvents: jest.fn(),
  useAnnouncements: jest.fn(),
  useLessons: jest.fn(),
  useLessonDetail: jest.fn(),
  useLessonCompletionStatus: jest.fn(),
  useLessonCompletions: jest.fn(),
  useLessonCompleteMutation: jest.fn(),
  useModuleDetail: jest.fn(),
  useAssessments: jest.fn(),
  useAssessmentAttempts: jest.fn(),
}));

jest.mock("../../data/mappers", () => ({
  findContinueLearning: jest.fn(
    (
      subjects: Array<{ id: string; name: string }>,
      lessonMap: Record<string, Array<{ id: string; title: string; description: string; duration: string }>>,
    ) =>
      subjects.flatMap((subject) =>
        (lessonMap[subject.id] ?? []).slice(0, 1).map((lesson) => ({ lesson, subject })),
      ),
  ),
  toLessonCards: jest.fn(() => [
    {
      id: "lesson-1",
      title: "Lesson 1",
      description: "Start with the newest lesson in class.",
      duration: "15 min",
      status: "ongoing",
    },
  ]),
  toAnnouncementPreview: jest.fn((announcement: { id: string; title?: string; content?: string }, subject: { name: string }) => ({
    id: announcement.id,
    title: announcement.title || "Announcement",
    content: announcement.content || "Announcement content",
    subject: subject.name,
    createdAt: "Today",
    isPinned: false,
    emoji: "!",
  })),
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
    bgColor: "#EEF2FF",
    section: "Section A",
    teacherName: "Teacher One",
    subjectCode: "MATH-1",
    totalLessons: 1,
    completedLessons: 0,
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
const mockedUseClassDetail = useClassDetail as jest.MockedFunction<typeof useClassDetail>;
const mockedUseClassModules = useClassModules as jest.MockedFunction<typeof useClassModules>;
const mockedUseLxpEligibility = useLxpEligibility as jest.MockedFunction<typeof useLxpEligibility>;
const mockedUseTutorBootstrap = useTutorBootstrap as jest.MockedFunction<typeof useTutorBootstrap>;
const mockedUseLxpPlaylist = useLxpPlaylist as jest.MockedFunction<typeof useLxpPlaylist>;
const mockedUseLxpCheckpointMutation = useLxpCheckpointMutation as jest.MockedFunction<typeof useLxpCheckpointMutation>;
const mockedUseTutorSession = useTutorSession as jest.MockedFunction<typeof useTutorSession>;
const mockedUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockedUseProfileUpdateMutation = useProfileUpdateMutation as jest.MockedFunction<typeof useProfileUpdateMutation>;
const mockedUseProfileAvatarMutation = useProfileAvatarMutation as jest.MockedFunction<typeof useProfileAvatarMutation>;
const mockedUsePerformanceSummary = usePerformanceSummary as jest.MockedFunction<typeof usePerformanceSummary>;
const mockedUseSchoolEvents = useSchoolEvents as jest.MockedFunction<typeof useSchoolEvents>;
const mockedUseAnnouncements = useAnnouncements as jest.MockedFunction<typeof useAnnouncements>;
const mockedUseLessons = useLessons as jest.MockedFunction<typeof useLessons>;
const mockedUseLessonDetail = useLessonDetail as jest.MockedFunction<typeof useLessonDetail>;
const mockedUseLessonCompletionStatus = useLessonCompletionStatus as jest.MockedFunction<typeof useLessonCompletionStatus>;
const mockedUseLessonCompletions = useLessonCompletions as jest.MockedFunction<typeof useLessonCompletions>;
const mockedUseLessonCompleteMutation = useLessonCompleteMutation as jest.MockedFunction<typeof useLessonCompleteMutation>;
const mockedUseModuleDetail = useModuleDetail as jest.MockedFunction<typeof useModuleDetail>;
const mockedUseAssessments = useAssessments as jest.MockedFunction<typeof useAssessments>;
const mockedUseAssessmentAttempts = useAssessmentAttempts as jest.MockedFunction<typeof useAssessmentAttempts>;
const mockedUseQueries = useQueries as jest.Mock;
const mockedUseQueryClient = useQueryClient as jest.Mock;
const mockedAiApi = aiApi as jest.Mocked<typeof aiApi>;
let checkpointMutateAsync: jest.Mock;
let lessonCompleteMutateAsync: jest.Mock;
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
      createQueryState([{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1", schoolYear: "2025-2026" }]) as ReturnType<typeof useStudentClasses>,
    );
    mockedUseClassDetail.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? {
                id: classId,
                subjectName: "Mathematics",
                subjectCode: "MATH-1",
                subjectGradeLevel: "10",
                sectionId: "section-1",
                section: { id: "section-1", name: "Section A", gradeLevel: "10" },
                teacherId: "teacher-1",
                teacher: { id: "teacher-1", firstName: "Teacher", lastName: "One" },
                schoolYear: "2025-2026",
                isActive: true,
                room: "Room 201",
                schedules: [{ id: "schedule-1", days: ["Mon", "Wed"], startTime: "08:00", endTime: "09:00" }],
                enrollments: [
                  { id: "enrollment-1", student: { id: "student-1", firstName: "Alex", lastName: "Reyes", email: "alex@example.com" } },
                  { id: "enrollment-2", student: { id: "student-2", firstName: "Jamie", lastName: "Cruz", email: "jamie@example.com" } },
                ],
              }
            : undefined,
        )) as ReturnType<typeof useClassDetail>,
    );
    mockedUseClassModules.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "module-1",
                  classId,
                  title: "Number Sense Module",
                  description: "Foundations for fractions and decimals",
                  order: 1,
                  progressPercent: 40,
                  sections: [
                    {
                      id: "section-1",
                      title: "Core Lessons",
                      order: 1,
                      items: [
                        {
                          id: "item-lesson-1",
                          itemType: "lesson",
                          order: 1,
                          lessonId: "lesson-1",
                          completed: false,
                          lessonPoints: 25,
                          lesson: { id: "lesson-1", title: "Lesson 1", isDraft: false },
                        },
                        {
                          id: "item-assessment-1",
                          itemType: "assessment",
                          order: 2,
                          assessmentId: "assessment-1",
                          assessment: { id: "assessment-1", title: "Assessment 1", totalPoints: 100, dueDate: "2026-04-20T09:00:00.000Z", isPublished: true },
                        },
                      ],
                    },
                  ],
                },
              ]
            : [],
        )) as ReturnType<typeof useClassModules>,
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
    mockedUseSchoolEvents.mockReturnValue(
      createQueryState([
        {
          id: "event-1",
          title: "Math remediation day",
          startsAt: "2026-04-21T08:00:00.000Z",
          endsAt: "2026-04-21T10:00:00.000Z",
          location: "Room 201",
          schoolYear: "2025-2026",
          eventType: "school_event",
          allDay: false,
        },
      ]) as ReturnType<typeof useSchoolEvents>,
    );
    mockedUseAnnouncements.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "announcement-1",
                  classId,
                  title: "Bring your notebook",
                  content: "We will use it for guided practice.",
                  isPinned: true,
                  isArchived: false,
                  author: { firstName: "Teacher", lastName: "One" },
                  createdAt: "2026-04-18T08:00:00.000Z",
                },
              ]
            : [],
        )) as ReturnType<typeof useAnnouncements>,
    );
    mockedUseLessons.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "lesson-1",
                  classId,
                  title: "Lesson 1",
                  description: "Start with number sense foundations.",
                  order: 1,
                  isDraft: false,
                },
              ]
            : [],
        )) as ReturnType<typeof useLessons>,
    );
    mockedUseLessonDetail.mockImplementation(
      ((lessonId?: string) =>
        createQueryState(
          lessonId
            ? {
                id: lessonId,
                classId: "class-1",
                title: "Lesson 1",
                description: "Start with number sense foundations.",
                order: 1,
                isDraft: false,
                contentBlocks: [
                  { id: "block-1", lessonId, type: "text", order: 1, content: "<p>Understand equivalent fractions.</p>" },
                  { id: "block-2", lessonId, type: "question", order: 2, content: { text: "What is 1/2 equal to?" } },
                ],
              }
            : undefined,
        )) as ReturnType<typeof useLessonDetail>,
    );
    mockedUseLessonCompletionStatus.mockImplementation(
      ((lessonId?: string) =>
        createQueryState(lessonId ? { completed: false } : { completed: false })) as ReturnType<typeof useLessonCompletionStatus>,
    );
    mockedUseLessonCompletions.mockImplementation(
      ((classId?: string) =>
        createQueryState(classId ? [{ lessonId: "lesson-1", completed: false }] : [])) as ReturnType<typeof useLessonCompletions>,
    );
    lessonCompleteMutateAsync = jest.fn().mockResolvedValue({ completed: true });
    mockedUseLessonCompleteMutation.mockReturnValue({
      mutateAsync: lessonCompleteMutateAsync,
      isPending: false,
      error: null,
    } as ReturnType<typeof useLessonCompleteMutation>);
    mockedUseModuleDetail.mockImplementation(
      ((classId?: string, moduleId?: string) =>
        createQueryState(
          classId && moduleId
            ? {
                id: moduleId,
                classId,
                title: "Number Sense Module",
                description: "Foundations for fractions and decimals",
                order: 1,
                progressPercent: 40,
                sections: [
                  {
                    id: "section-1",
                    title: "Core Lessons",
                    order: 1,
                    items: [
                      {
                        id: "item-lesson-1",
                        itemType: "lesson",
                        order: 1,
                        lessonId: "lesson-1",
                        completed: false,
                        lessonPoints: 25,
                        isRequired: true,
                        lesson: { id: "lesson-1", title: "Lesson 1", isDraft: false },
                      },
                      {
                        id: "item-assessment-1",
                        itemType: "assessment",
                        order: 2,
                        assessmentId: "assessment-1",
                        assessment: { id: "assessment-1", title: "Assessment 1", totalPoints: 100, dueDate: "2026-04-20T09:00:00.000Z", isPublished: true },
                      },
                    ],
                  },
                ],
              }
            : undefined,
        )) as ReturnType<typeof useModuleDetail>,
    );
    mockedUseAssessments.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [{ id: "assessment-1", classId, title: "Assessment 1", type: "quiz", isPublished: true, dueDate: "2026-04-20T09:00:00.000Z" }]
            : [],
        )) as ReturnType<typeof useAssessments>,
    );
    mockedUseAssessmentAttempts.mockImplementation(
      ((assessmentId?: string) =>
        createQueryState(assessmentId ? [] : [])) as ReturnType<typeof useAssessmentAttempts>,
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
    mockedUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
    });
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

  it("renders Dashboard screen shell with student home sections", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Student Home");
    expect(renderedText).toContain("Continue Learning");
    expect(renderedText).toContain("Today's Schedule");
    expect(renderedText).toContain("Pending Assessments");
    expect(renderedText).toContain("Recent Lessons");
    expect(renderedText).toContain("School Events");
    expect(mockedUseLessons).toHaveBeenCalledWith("class-1");
    expect(mockedUseLessonCompletions).toHaveBeenCalledWith("class-1");
    expect(mockedUseAssessments).toHaveBeenCalledWith("class-1");
  });

  it("renders Courses screen and opens class detail from a course card", () => {
    const { CoursesScreen } = require("../CoursesScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(CoursesScreen, {
          navigation: { navigate } as never,
          route: { key: "Courses", name: "Courses" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("My Courses");
    expect(renderedText).toContain("Mathematics");

    const courseCard = findPressableByText(testRenderer!.root, "Mathematics");
    act(() => {
      courseCard.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("ClassDetail", { classId: "class-1" });
  });

  it("refreshes course-derived lesson, completion, and assessment queries from pull-to-refresh", async () => {
    const { CoursesScreen } = require("../CoursesScreen");
    const classesRefetch = jest.fn().mockResolvedValue(undefined);
    const lessonRefetch = jest.fn().mockResolvedValue(undefined);
    const completionRefetch = jest.fn().mockResolvedValue(undefined);
    const assessmentRefetch = jest.fn().mockResolvedValue(undefined);

    mockedUseStudentClasses.mockReturnValue(
      createQueryState(
        [{ id: "class-1", subjectName: "Mathematics", subjectCode: "MATH-1", schoolYear: "2025-2026" }],
        { refetch: classesRefetch },
      ) as ReturnType<typeof useStudentClasses>,
    );

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      if (useQueriesCall === 1) {
        return queries.map(() => ({
          data: [{ id: "lesson-1" }],
          error: null,
          isRefetching: false,
          refetch: lessonRefetch,
        }));
      }
      if (useQueriesCall === 2) {
        return queries.map(() => ({
          data: [{ lessonId: "lesson-1", completed: false }],
          error: null,
          isRefetching: false,
          refetch: completionRefetch,
        }));
      }
      return queries.map(() => ({
        data: [{ id: "assessment-1" }],
        error: null,
        isRefetching: false,
        refetch: assessmentRefetch,
      }));
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(CoursesScreen, {
          navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
          route: { key: "Courses", name: "Courses" } as never,
        }),
      );
    });

    const screenScroll = testRenderer!.root.find((node) => node.type === "ScreenScroll");
    await act(async () => {
      await screenScroll.props.refreshControl.props.onRefresh();
    });

    expect(classesRefetch).toHaveBeenCalled();
    expect(lessonRefetch).toHaveBeenCalled();
    expect(completionRefetch).toHaveBeenCalled();
    expect(assessmentRefetch).toHaveBeenCalled();
  });

  it("renders Courses screen fetch errors without collapsing into the empty state", () => {
    const { CoursesScreen } = require("../CoursesScreen");
    mockedUseStudentClasses.mockReturnValue(
      createQueryState([], {
        error: {
          isAxiosError: true,
          response: {
            status: 503,
            data: {
              message: "Courses API unavailable",
            },
          },
          message: "Request failed",
        },
      }) as ReturnType<typeof useStudentClasses>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(CoursesScreen, {
          navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
          route: { key: "Courses", name: "Courses" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Course data is partially unavailable");
    expect(renderedText).toContain("Courses API unavailable");
    expect(renderedText).not.toContain("No courses found");
  });

  it("routes Lessons screen class actions into class detail parity", () => {
    const { LessonsScreen } = require("../LessonsScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LessonsScreen, {
          navigation: { navigate } as never,
          route: { key: "Classes", name: "Classes" } as never,
        }),
      );
    });

    const continueCard = findPressableByText(testRenderer!.root, "Lesson 1");
    act(() => {
      continueCard.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("ClassDetail", { classId: "class-1" });
  });

  it("renders Class detail screen and opens module detail", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate } as never,
          route: { key: "ClassDetail", name: "ClassDetail", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Mathematics");
    expect(renderedText).toContain("Number Sense Module");

    const moduleCard = findPressableByText(testRenderer!.root, "Number Sense Module");
    act(() => {
      moduleCard.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("ModuleDetail", { classId: "class-1", moduleId: "module-1" });
  });

  it("renders Class detail fetch errors without collapsing into not-found copy", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    mockedUseClassDetail.mockReturnValue(
      createQueryState(undefined, {
        error: {
          isAxiosError: true,
          response: {
            status: 503,
            data: {
              message: "Class detail unavailable",
            },
          },
          message: "Request failed",
        },
      }) as ReturnType<typeof useClassDetail>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "ClassDetail", name: "ClassDetail", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Class data is partially unavailable");
    expect(renderedText).toContain("Class detail unavailable");
    expect(renderedText).not.toContain("Class not found");
  });

  it("keeps the latest submitted score visible when a newer attempt is still in progress", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    mockedUseAssessments.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "assessment-1",
                  classId,
                  title: "Assessment 1",
                  type: "quiz",
                  totalPoints: 100,
                  isPublished: true,
                  dueDate: "2026-04-20T09:00:00.000Z",
                },
              ]
            : [],
        )) as ReturnType<typeof useAssessments>,
    );
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) =>
      queries.map(() => ({
        data: [
          {
            id: "attempt-3",
            assessmentId: "assessment-1",
            studentId: "student-1",
            score: undefined,
            totalPoints: 100,
            isSubmitted: false,
            createdAt: "2026-04-19T11:00:00.000Z",
          },
          {
            id: "attempt-2",
            assessmentId: "assessment-1",
            studentId: "student-1",
            score: 92,
            totalPoints: 100,
            isSubmitted: true,
            submittedAt: "2026-04-18T11:00:00.000Z",
          },
          {
            id: "attempt-1",
            assessmentId: "assessment-1",
            studentId: "student-1",
            score: 70,
            totalPoints: 100,
            submittedAt: "2026-04-17T11:00:00.000Z",
          },
        ],
        error: null,
        isRefetching: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      })),
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "ClassDetail", name: "ClassDetail", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const gradesTab = findPressableByText(testRenderer!.root, "grades");
    act(() => {
      gradesTab.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("92/100");
    expect(renderedText).not.toContain("Pending");
  });

  it("does not collapse unresolved attempt queries into a false pending grade", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    mockedUseAssessments.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "assessment-1",
                  classId,
                  title: "Assessment 1",
                  type: "quiz",
                  totalPoints: 100,
                  isPublished: true,
                  dueDate: "2026-04-20T09:00:00.000Z",
                },
              ]
            : [],
        )) as ReturnType<typeof useAssessments>,
    );
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) =>
      queries.map(() => ({
        data: undefined,
        error: null,
        isRefetching: true,
        refetch: jest.fn().mockResolvedValue(undefined),
      })),
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "ClassDetail", name: "ClassDetail", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const gradesTab = findPressableByText(testRenderer!.root, "grades");
    act(() => {
      gradesTab.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Checking submissions");
    expect(renderedText).not.toContain("Pending");
  });

  it("does not collapse failed attempt queries into a false pending grade", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    mockedUseAssessments.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "assessment-1",
                  classId,
                  title: "Assessment 1",
                  type: "quiz",
                  totalPoints: 100,
                  isPublished: true,
                  dueDate: "2026-04-20T09:00:00.000Z",
                },
              ]
            : [],
        )) as ReturnType<typeof useAssessments>,
    );
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) =>
      queries.map(() => ({
        data: undefined,
        error: {
          isAxiosError: true,
          response: {
            status: 503,
            data: {
              message: "Attempt history unavailable",
            },
          },
          message: "Request failed",
        },
        isRefetching: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      })),
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "ClassDetail", name: "ClassDetail", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const gradesTab = findPressableByText(testRenderer!.root, "grades");
    act(() => {
      gradesTab.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Attempt history unavailable");
    expect(renderedText).not.toContain("Pending");
  });

  it("renders legacy class workspace and routes lesson actions to lesson detail", () => {
    const { SubjectLessonsScreen } = require("../SubjectLessonsScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(SubjectLessonsScreen, {
          navigation: { goBack: jest.fn(), navigate } as never,
          route: { key: "ClassWorkspace", name: "ClassWorkspace", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const lessonAction = findPressableByText(testRenderer!.root, "Continue Lesson");
    act(() => {
      lessonAction.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("LessonDetail", { lessonId: "lesson-1", classId: "class-1" });
  });

  it("renders Module detail screen and opens lesson detail", () => {
    const { ModuleDetailScreen } = require("../ModuleDetailScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ModuleDetailScreen, {
          navigation: { goBack: jest.fn(), navigate } as never,
          route: { key: "ModuleDetail", name: "ModuleDetail", params: { classId: "class-1", moduleId: "module-1" } } as never,
        }),
      );
    });

    const lessonCard = findPressableByText(testRenderer!.root, "Lesson 1");
    act(() => {
      lessonCard.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("LessonDetail", { lessonId: "lesson-1", classId: "class-1" });
  });

  it("renders Module detail fetch errors without collapsing into not-found copy", () => {
    const { ModuleDetailScreen } = require("../ModuleDetailScreen");
    mockedUseModuleDetail.mockReturnValue(
      createQueryState(undefined, {
        error: {
          isAxiosError: true,
          response: {
            status: 503,
            data: {
              message: "Module detail unavailable",
            },
          },
          message: "Request failed",
        },
      }) as ReturnType<typeof useModuleDetail>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ModuleDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "ModuleDetail", name: "ModuleDetail", params: { classId: "class-1", moduleId: "module-1" } } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Module data is partially unavailable");
    expect(renderedText).toContain("Module detail unavailable");
    expect(renderedText).not.toContain("Module not found");
  });

  it("renders Lesson detail screen and completes the lesson", async () => {
    const { LessonDetailScreen } = require("../LessonDetailScreen");

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(LessonDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "LessonDetail", name: "LessonDetail", params: { lessonId: "lesson-1", classId: "class-1" } } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("Understand equivalent fractions.")),
    ).toBeTruthy();

    const completeButton = findPressableByText(testRenderer!.root, "Mark Complete");
    await act(async () => {
      await completeButton.props.onPress();
    });

    expect(lessonCompleteMutateAsync).toHaveBeenCalledWith("lesson-1");
  });

  it("renders Lesson detail fetch errors without collapsing into not-found copy", () => {
    const { LessonDetailScreen } = require("../LessonDetailScreen");
    mockedUseLessonDetail.mockReturnValue(
      createQueryState(undefined, {
        error: {
          isAxiosError: true,
          response: {
            status: 503,
            data: {
              message: "Lesson detail unavailable",
            },
          },
          message: "Request failed",
        },
      }) as ReturnType<typeof useLessonDetail>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LessonDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "LessonDetail", name: "LessonDetail", params: { lessonId: "lesson-1", classId: "class-1" } } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Lesson data is partially unavailable");
    expect(renderedText).toContain("Lesson detail unavailable");
    expect(renderedText).not.toContain("Lesson not found");
  });

  it("shows a recoverable lesson completion error when the mutation rejects", async () => {
    const { LessonDetailScreen } = require("../LessonDetailScreen");
    lessonCompleteMutateAsync.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          message: "Unable to mark lesson complete right now",
        },
      },
      message: "Request failed",
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(LessonDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "LessonDetail", name: "LessonDetail", params: { lessonId: "lesson-1", classId: "class-1" } } as never,
        }),
      );
    });

    const completeButton = findPressableByText(testRenderer!.root, "Mark Complete");
    await act(async () => {
      await completeButton.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Unable to mark lesson complete right now"),
      ),
    ).toBeTruthy();
  });

  it("excludes submitted assessments from dashboard pending work", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    const toAssessmentCard = require("../../data/mappers").toAssessmentCard as jest.Mock;
    toAssessmentCard.mockImplementation(
      (
        assessment: { id: string; classId?: string; title?: string },
        subject: { id: string; name: string; emoji?: string },
        attempts: Array<{ isSubmitted?: boolean }> = [],
      ) => ({
        id: assessment.id,
        raw: assessment,
        classId: assessment.classId || "class-1",
        subjectId: subject.id,
        title: assessment.title || `Assessment ${assessment.id}`,
        subject: subject.name,
        dueDate: "Tomorrow",
        status: attempts.some((attempt) => attempt.isSubmitted) ? "completed" : "pending",
        emoji: subject.emoji || "ðŸ“",
        totalScore: 100,
        attempts,
      }),
    );
    mockedUseAssessmentAttempts.mockImplementation(
      ((assessmentId?: string) =>
        createQueryState(
          assessmentId
            ? [
                {
                  id: "attempt-1",
                  assessmentId,
                  studentId: "student-1",
                  isSubmitted: true,
                  submittedAt: "2026-04-18T09:30:00.000Z",
                  score: 95,
                },
              ]
            : [],
        )) as ReturnType<typeof useAssessmentAttempts>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("0 tasks still need attention");
    expect(renderedText).toContain("No published assessments right now.");
    expect(mockedUseAssessmentAttempts).toHaveBeenCalledWith("assessment-1");
  });

  it("does not count assessments as pending until attempt data resolves", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseAssessmentAttempts.mockImplementation(
      ((assessmentId?: string) =>
        createQueryState(
          undefined,
          assessmentId
            ? {
                isRefetching: true,
              }
            : undefined,
        )) as ReturnType<typeof useAssessmentAttempts>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Checking 1 assessment status");
    expect(renderedText).toContain("Checking assessment submissions");
  });

  it("does not count assessments as pending when attempt loading fails", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseAssessmentAttempts.mockImplementation(
      ((assessmentId?: string) =>
        createQueryState(
          undefined,
          assessmentId
            ? {
                error: {
                  isAxiosError: true,
                  response: {
                    status: 503,
                    data: {
                      message: "Assessment attempts unavailable",
                    },
                  },
                  message: "Request failed",
                },
              }
            : undefined,
        )) as ReturnType<typeof useAssessmentAttempts>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Checking 1 assessment status");
    expect(renderedText).toContain("Checking assessment submissions");
    expect(mockedUseAssessmentAttempts).toHaveBeenCalledWith("assessment-1");
  });

  it("renders all-day school events without a midnight time label", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseSchoolEvents.mockReturnValue(
      createQueryState([
        {
          id: "event-2",
          title: "Foundation Day",
          startsAt: "2026-04-22T00:00:00.000Z",
          endsAt: "2026-04-22T23:59:59.000Z",
          location: "Main Campus",
          schoolYear: "2025-2026",
          eventType: "school_event",
          allDay: true,
        },
      ]) as ReturnType<typeof useSchoolEvents>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Foundation Day");
    expect(renderedText).toContain("Apr 22");
    expect(renderedText).not.toContain("12:00 AM");
  });

  it("does not query school events until a concrete school year is available", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseStudentClasses.mockReturnValue(
      createQueryState(undefined, { isRefetching: true }) as ReturnType<typeof useStudentClasses>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(mockedUseSchoolEvents).not.toHaveBeenCalled();
    expect(renderedText).toContain("Student Home");
  });

  it("does not query school events when the student has no classes", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseStudentClasses.mockReturnValue(
      createQueryState([]) as ReturnType<typeof useStudentClasses>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    expect(mockedUseSchoolEvents).not.toHaveBeenCalled();
  });

  it("scopes dashboard hooks to the active current classes", () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseStudentClasses.mockReturnValue(
      createQueryState([
        {
          id: "class-archived",
          subjectName: "History",
          subjectCode: "HIST-1",
          schoolYear: "2023-2024",
          isActive: false,
        },
        {
          id: "class-active",
          subjectName: "Mathematics",
          subjectCode: "MATH-1",
          schoolYear: "2025-2026",
          isActive: true,
        },
      ]) as ReturnType<typeof useStudentClasses>,
    );

    act(() => {
      TestRenderer.create(
        React.createElement(DashboardScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Dashboard", name: "Dashboard" } as never,
        }),
      );
    });

    expect(mockedUseLessons).toHaveBeenCalledWith("class-active");
    expect(mockedUseAssessments).toHaveBeenCalledWith("class-active");
    expect(mockedUseSchoolEvents).toHaveBeenCalledWith({ schoolYear: "2025-2026" });
  });

  it("renders the student dashboard tab as Home and keeps Dashboard route navigation", () => {
    const { BottomTabBar } = require("../../components/ui/BottomTabBar");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(BottomTabBar, {
          state: {
            index: 1,
            routes: [
              { key: "dashboard-key", name: "Dashboard" },
              { key: "classes-key", name: "Classes" },
            ],
          },
          descriptors: {
            "dashboard-key": { options: {} },
            "classes-key": { options: {} },
          },
          navigation: {
            emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
            navigate,
          },
        }),
      );
    });

    const homeTab = findPressableByText(testRenderer!.root, "Home");
    act(() => {
      homeTab.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Home");
    expect(navigate).toHaveBeenCalledWith("Dashboard");
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
