// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "../../api/services/ai";
import { jaApi } from "../../api/services/ja";
import { useAuth } from "../../providers/AuthProvider";
import {
  useAnnouncements,
  useAssessmentDetail,
  useAssessmentHistory,
  useClassDetail,
  useClassModules,
  useDiscussionCommentMutation,
  useDiscussionDeleteCommentMutation,
  useDiscussionReactionMutation,
  useDiscussionThread,
  useDiscussionThreads,
  useSchoolEvents,
  useLessons,
  useLessonDetail,
  useLessonCompletionStatus,
  useLessonCompletions,
  useLessonCompleteMutation,
  useModuleDetail,
  useAssessments,
  useAssessmentAttempts,
  useAssessmentResult,
  useAssessmentSubmitMutation,
  useLxpCheckpointMutation,
  useLxpEligibility,
  useLxpOverview,
  useLxpPlaylist,
  useJaHub,
  usePerformanceSummary,
  useProfile,
  useProfileAvatarMutation,
  useProfileUpdateMutation,
  useStudentClasses,
  useTranscript,
  useTutorBootstrap,
  useTutorSession,
} from "../../api/hooks";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as Record<string, unknown>).__DEV__ = false;

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
    KeyboardAvoidingView: component("KeyboardAvoidingView"),
    ScrollView: component("ScrollView"),
    TextInput: component("TextInput"),
    Image: component("Image"),
    RefreshControl: component("RefreshControl"),
    Alert: { alert: jest.fn() },
    AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    Linking: {
      canOpenURL: jest.fn().mockResolvedValue(true),
      openURL: jest.fn().mockResolvedValue(undefined),
    },
    Platform: {
      OS: "ios",
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
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
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

jest.mock("expo-screen-capture", () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  addScreenshotListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///cache/",
  EncodingType: { Base64: "base64" },
  downloadAsync: jest.fn().mockResolvedValue({
    uri: "file:///documents/downloaded.pdf",
    status: 200,
    headers: {
      "content-disposition": 'inline; filename="downloaded.pdf"',
    },
  }),
  getContentUriAsync: jest.fn().mockResolvedValue("file:///documents/downloaded.pdf"),
  readAsStringAsync: jest.fn().mockResolvedValue(""),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
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
      rightContent,
      children,
    }: {
      eyebrow?: string;
      title: string;
      rightContent?: React.ReactNode;
      children?: React.ReactNode;
    }) =>
      ReactRuntime.createElement(
        "GradientHeader",
        null,
        eyebrow ? ReactRuntime.createElement(Text, null, eyebrow) : null,
        title ? ReactRuntime.createElement(Text, null, title) : null,
        rightContent,
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

jest.mock("../../api/services/ja", () => ({
  jaApi: {
    createAskThread: jest.fn(),
    getAskThread: jest.fn(),
    sendAskMessage: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    submitResponse: jest.fn(),
    completeSession: jest.fn(),
    createReviewSession: jest.fn(),
    getReviewSession: jest.fn(),
    submitReviewResponse: jest.fn(),
    completeReviewSession: jest.fn(),
  },
}));

jest.mock("../../api/services/assessments", () => ({
  assessmentsApi: {
    getByClass: jest.fn().mockResolvedValue([]),
    getOngoingAttempt: jest.fn().mockResolvedValue(null),
    startAttempt: jest.fn().mockResolvedValue({
      attempt: {
        id: "attempt-ongoing",
        assessmentId: "assessment-1",
        startedAt: "2026-04-18T09:00:00.000Z",
      },
    }),
    submit: jest.fn().mockResolvedValue(undefined),
    unsubmitFileUploadAssessment: jest.fn().mockResolvedValue({
      id: "attempt-ongoing",
      assessmentId: "assessment-1",
      isSubmitted: false,
    }),
    getStudentAttempts: jest.fn().mockResolvedValue([]),
    uploadSubmissionFile: jest.fn(),
    removeSubmissionFile: jest.fn(),
    openTeacherAttachment: jest.fn().mockResolvedValue(undefined),
    downloadTeacherAttachment: jest.fn().mockResolvedValue(undefined),
    openAttemptSubmissionAttachmentFile: jest.fn().mockResolvedValue(undefined),
    downloadAttemptSubmissionAttachmentFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../api/services/modules", () => ({
  modulesApi: {
    getByClass: jest.fn().mockResolvedValue([]),
    openAttachedFile: jest.fn().mockResolvedValue(undefined),
    downloadAttachedFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../api/services/discussion-board", () => ({
  discussionBoardApi: {
    uploadCommentImage: jest.fn().mockResolvedValue({ id: "discussion-upload-1" }),
    openAttachment: jest.fn().mockResolvedValue(undefined),
    downloadAttachment: jest.fn().mockResolvedValue(undefined),
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
    classModules: (classId: string) => ["class-modules", classId],
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
  useDiscussionThreads: jest.fn(),
  useDiscussionThread: jest.fn(),
  useDiscussionCommentMutation: jest.fn(),
  useDiscussionDeleteCommentMutation: jest.fn(),
  useDiscussionReactionMutation: jest.fn(),
  useLxpEligibility: jest.fn(),
  useLxpOverview: jest.fn(),
  useJaHub: jest.fn(),
  useTutorBootstrap: jest.fn(),
  useLxpPlaylist: jest.fn(),
  useLxpCheckpointMutation: jest.fn(),
  useTutorSession: jest.fn(),
  useProfile: jest.fn(),
  useProfileUpdateMutation: jest.fn(),
  useProfileAvatarMutation: jest.fn(),
  useTranscript: jest.fn(),
  usePerformanceSummary: jest.fn(),
  useSchoolEvents: jest.fn(),
  useAnnouncements: jest.fn(),
  useLessons: jest.fn(),
  useLessonDetail: jest.fn(),
  useLessonCompletionStatus: jest.fn(),
  useLessonCompletions: jest.fn(),
  useLessonCompleteMutation: jest.fn(),
  useModuleDetail: jest.fn(),
  useAssessmentDetail: jest.fn(),
  useAssessmentHistory: jest.fn(),
  useAssessments: jest.fn(),
  useAssessmentAttempts: jest.fn(),
  useAssessmentResult: jest.fn(),
  useAssessmentSubmitMutation: jest.fn(),
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
const mockedUseDiscussionThreads = useDiscussionThreads as jest.MockedFunction<typeof useDiscussionThreads>;
const mockedUseDiscussionThread = useDiscussionThread as jest.MockedFunction<typeof useDiscussionThread>;
const mockedUseDiscussionCommentMutation = useDiscussionCommentMutation as jest.MockedFunction<typeof useDiscussionCommentMutation>;
const mockedUseDiscussionDeleteCommentMutation = useDiscussionDeleteCommentMutation as jest.MockedFunction<typeof useDiscussionDeleteCommentMutation>;
const mockedUseDiscussionReactionMutation = useDiscussionReactionMutation as jest.MockedFunction<typeof useDiscussionReactionMutation>;
const mockedUseLxpEligibility = useLxpEligibility as jest.MockedFunction<typeof useLxpEligibility>;
const mockedUseLxpOverview = useLxpOverview as jest.MockedFunction<typeof useLxpOverview>;
const mockedUseJaHub = useJaHub as jest.MockedFunction<typeof useJaHub>;
const mockedUseTutorBootstrap = useTutorBootstrap as jest.MockedFunction<typeof useTutorBootstrap>;
const mockedUseLxpPlaylist = useLxpPlaylist as jest.MockedFunction<typeof useLxpPlaylist>;
const mockedUseLxpCheckpointMutation = useLxpCheckpointMutation as jest.MockedFunction<typeof useLxpCheckpointMutation>;
const mockedUseTutorSession = useTutorSession as jest.MockedFunction<typeof useTutorSession>;
const mockedUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockedUseProfileUpdateMutation = useProfileUpdateMutation as jest.MockedFunction<typeof useProfileUpdateMutation>;
const mockedUseProfileAvatarMutation = useProfileAvatarMutation as jest.MockedFunction<typeof useProfileAvatarMutation>;
const mockedUseTranscript = useTranscript as jest.MockedFunction<typeof useTranscript>;
const mockedUsePerformanceSummary = usePerformanceSummary as jest.MockedFunction<typeof usePerformanceSummary>;
const mockedUseSchoolEvents = useSchoolEvents as jest.MockedFunction<typeof useSchoolEvents>;
const mockedUseAnnouncements = useAnnouncements as jest.MockedFunction<typeof useAnnouncements>;
const mockedUseLessons = useLessons as jest.MockedFunction<typeof useLessons>;
const mockedUseLessonDetail = useLessonDetail as jest.MockedFunction<typeof useLessonDetail>;
const mockedUseLessonCompletionStatus = useLessonCompletionStatus as jest.MockedFunction<typeof useLessonCompletionStatus>;
const mockedUseLessonCompletions = useLessonCompletions as jest.MockedFunction<typeof useLessonCompletions>;
const mockedUseLessonCompleteMutation = useLessonCompleteMutation as jest.MockedFunction<typeof useLessonCompleteMutation>;
const mockedUseModuleDetail = useModuleDetail as jest.MockedFunction<typeof useModuleDetail>;
const mockedUseAssessmentDetail = useAssessmentDetail as jest.MockedFunction<typeof useAssessmentDetail>;
const mockedUseAssessmentHistory = useAssessmentHistory as jest.MockedFunction<typeof useAssessmentHistory>;
const mockedUseAssessments = useAssessments as jest.MockedFunction<typeof useAssessments>;
const mockedUseAssessmentAttempts = useAssessmentAttempts as jest.MockedFunction<typeof useAssessmentAttempts>;
const mockedUseAssessmentResult = useAssessmentResult as jest.MockedFunction<typeof useAssessmentResult>;
const mockedUseAssessmentSubmitMutation = useAssessmentSubmitMutation as jest.MockedFunction<
  typeof useAssessmentSubmitMutation
>;
const mockedUseQueries = useQueries as jest.Mock;
const mockedUseQueryClient = useQueryClient as jest.Mock;
const mockedAiApi = aiApi as jest.Mocked<typeof aiApi>;
const mockedJaApi = jaApi as jest.Mocked<typeof jaApi>;
const mockedAssessmentsApi = require("../../api/services/assessments").assessmentsApi as {
  getOngoingAttempt: jest.Mock;
  startAttempt: jest.Mock;
  submit: jest.Mock;
  unsubmitFileUploadAssessment: jest.Mock;
  getStudentAttempts: jest.Mock;
  uploadSubmissionFile: jest.Mock;
  removeSubmissionFile: jest.Mock;
  openTeacherAttachment: jest.Mock;
  downloadTeacherAttachment: jest.Mock;
  openAttemptSubmissionAttachmentFile: jest.Mock;
  downloadAttemptSubmissionAttachmentFile: jest.Mock;
};
const mockedModulesApi = require("../../api/services/modules").modulesApi as {
  openAttachedFile: jest.Mock;
  downloadAttachedFile: jest.Mock;
};
const mockedDiscussionBoardApi = require("../../api/services/discussion-board").discussionBoardApi as {
  uploadCommentImage: jest.Mock;
  openAttachment: jest.Mock;
  downloadAttachment: jest.Mock;
};
let checkpointMutateAsync: jest.Mock;
let lessonCompleteMutateAsync: jest.Mock;
let profileUpdateMutateAsync: jest.Mock;
let discussionCommentMutateAsync: jest.Mock;
let discussionDeleteMutateAsync: jest.Mock;
let discussionReactionMutateAsync: jest.Mock;
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
      login: jest.fn().mockResolvedValue(undefined),
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
    mockedUseDiscussionThreads.mockReturnValue(
      createQueryState({
        items: [],
        page: 1,
        limit: 50,
        total: 0,
      }) as ReturnType<typeof useDiscussionThreads>,
    );
    mockedUseDiscussionThread.mockReturnValue(
      createQueryState(undefined, { data: undefined }) as ReturnType<typeof useDiscussionThread>,
    );
    discussionCommentMutateAsync = jest.fn().mockResolvedValue(undefined);
    mockedUseDiscussionCommentMutation.mockReturnValue({
      mutateAsync: discussionCommentMutateAsync,
      isPending: false,
    } as ReturnType<typeof useDiscussionCommentMutation>);
    discussionDeleteMutateAsync = jest.fn().mockResolvedValue(undefined);
    mockedUseDiscussionDeleteCommentMutation.mockReturnValue({
      mutateAsync: discussionDeleteMutateAsync,
      isPending: false,
    } as ReturnType<typeof useDiscussionDeleteCommentMutation>);
    discussionReactionMutateAsync = jest.fn().mockResolvedValue(undefined);
    mockedUseDiscussionReactionMutation.mockReturnValue({
      mutateAsync: discussionReactionMutateAsync,
      isPending: false,
    } as ReturnType<typeof useDiscussionReactionMutation>);
    mockedUseLxpEligibility.mockReturnValue(
      createQueryState({
        threshold: 60,
        paths: [
          {
            classId: "class-1",
            class: {
              id: "class-1",
              subjectName: "Mathematics",
              subjectCode: "MATH-1",
              section: { id: "section-1", name: "Section A", gradeLevel: "10" },
            },
            interventionCaseId: "case-1",
            status: "active",
            isAtRisk: false,
            blendedScore: 76,
            thresholdApplied: 60,
            openedAt: "2026-04-18T08:00:00.000Z",
            closedAt: null,
            counts: { steps: 1, replays: 1, pending: 2, total: 2, completed: 0 },
            progress: { totalCheckpoints: 2, completedCheckpoints: 0, completionPercent: 0 },
          },
        ],
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
    mockedUseLxpOverview.mockReturnValue(
      createQueryState({
        selectedClass: {
          classId: "class-1",
          subjectName: "Mathematics",
          subjectCode: "MATH-1",
          section: { id: "section-1", name: "Section A", gradeLevel: "10" },
          blendedScore: 76,
          thresholdApplied: 60,
          lastComputedAt: null,
        },
        interventionStatus: {
          caseId: "case-1",
          status: "active",
          code: "needs_attention",
          label: "Needs attention",
          message: "Keep moving through the assigned path.",
          openedAt: "2026-04-18T08:00:00.000Z",
          closedAt: null,
          triggerScore: 76,
          thresholdApplied: 60,
        },
        progress: {
          xpTotal: 120,
          starsTotal: 2,
          streakDays: 3,
          checkpointsCompleted: 0,
          totalCheckpoints: 2,
          completionPercent: 0,
          lastActivityAt: null,
        },
        subjectMastery: [],
        recommendedAction: null,
        upcomingAssessments: [],
        recentActivity: [],
        weakFocusItems: [
          {
            id: "focus-1",
            source: "performance",
            title: "Fractions",
            subtitle: "Practice equivalent values",
            masteryPercent: 48,
            href: "/dashboard/student/ja",
          },
        ],
      }) as ReturnType<typeof useLxpOverview>,
    );
    mockedUseJaHub.mockReturnValue(
      createQueryState({
        classes: [
          {
            id: "class-1",
            subjectName: "Mathematics",
            subjectCode: "MATH-1",
            sectionName: "Section A",
            gradeLevel: "10",
          },
        ],
        selectedClassId: "class-1",
        progress: { xpTotal: 120, streakDays: 3, sessionsCompleted: 2, lastActivityAt: null },
        mastery: { classId: "class-1", percent: 72, label: "Building" },
        badges: [],
        practice: {
          classes: [],
          selectedClassId: "class-1",
          recommendations: [
            {
              id: "rec-1",
              title: "Fractions Foundation",
              reason: "Rebuild fundamentals",
              focusText: "Fractions and equivalent values",
            },
          ],
          recentLessons: [],
          recentAttempts: [],
          sessions: [
            {
              id: "practice-1",
              status: "completed",
              currentIndex: 10,
              questionCount: 10,
              strikeCount: 0,
              rewardState: "awarded",
              groundingStatus: "grounded",
              startedAt: "2026-04-18T08:00:00.000Z",
              completedAt: "2026-04-18T08:20:00.000Z",
            },
          ],
        },
        ask: {
          threads: [],
          lessonContexts: [
            {
              lessonId: "lesson-1",
              title: "Fractions Lesson",
              moduleTitle: "Number Sense Module",
              sectionTitle: "Core Lessons",
            },
          ],
          guidelines: ["Ask for concept help."],
        },
        review: {
          eligibleAttempts: [
            {
              attemptId: "attempt-1",
              assessmentId: "assessment-1",
              assessmentTitle: "Fractions Quiz",
              submittedAt: "2026-04-18T08:30:00.000Z",
              score: 55,
              passed: false,
            },
          ],
          sessions: [],
        },
      }) as ReturnType<typeof useJaHub>,
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
            type: "lesson_review",
            label: "Fractions lesson",
            order: 1,
            xpAwarded: 20,
            isCompleted: false,
            completedAt: null,
            lesson: { id: "lesson-1", title: "Fractions Lesson", description: "Compare fractions", order: 1 },
          },
          {
            id: "checkpoint-2",
            type: "assessment_retry",
            label: "Fractions Quiz replay",
            order: 2,
            xpAwarded: 20,
            isCompleted: false,
            completedAt: null,
            assessment: { id: "assessment-1", title: "Fractions Quiz", passingScore: 75 },
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
        familyRelationship: "Guardian",
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
    mockedUseTranscript.mockReturnValue(
      createQueryState({
        data: [
          {
            id: "transcript-1",
            studentId: "student-1",
            classId: "class-1",
            sectionId: "section-1",
            status: "enrolled",
            enrolledAt: "2026-04-18T08:00:00.000Z",
            class: {
              id: "class-1",
              subjectName: "Mathematics",
              subjectCode: "MATH-1",
              schoolYear: "2025-2026",
            },
            section: {
              id: "section-1",
              name: "Section A",
              gradeLevel: "10",
              schoolYear: "2025-2026",
            },
          },
        ],
        page: 1,
        limit: 15,
        total: 1,
        totalPages: 1,
        success: true,
      }) as ReturnType<typeof useTranscript>,
    );

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
    mockedUseAssessmentDetail.mockImplementation(
      ((assessmentId?: string) =>
        createQueryState(
          assessmentId
            ? {
                id: assessmentId,
                classId: "class-1",
                title: "Assessment 1",
                description: "Show your work before submitting.",
                type: "quiz",
                isPublished: true,
                totalPoints: 100,
                passingScore: 75,
                maxAttempts: 2,
                timeLimitMinutes: 30,
                dueDate: "2026-04-20T09:00:00.000Z",
                questions: [
                  {
                    id: "question-1",
                    assessmentId,
                    type: "multiple_choice",
                    content: "What is 2 + 2?",
                    points: 5,
                    order: 1,
                    options: [
                      { id: "option-1", text: "4", isCorrect: true, order: 1 },
                      { id: "option-2", text: "5", isCorrect: false, order: 2 },
                    ],
                  },
                ],
              }
            : undefined,
        )) as ReturnType<typeof useAssessmentDetail>,
    );
    mockedUseAssessmentHistory.mockReturnValue(
      createQueryState({
        data: [
          {
            id: "attempt-returned",
            assessmentId: "assessment-1",
            attemptNumber: 1,
            score: 92,
            isSubmitted: true,
            submittedAt: "2026-04-18T08:00:00.000Z",
            startedAt: "2026-04-18T07:30:00.000Z",
            assessment: {
              id: "assessment-1",
              title: "Assessment 1",
              classId: "class-1",
              dueDate: "2026-04-20T09:00:00.000Z",
              type: "quiz",
              totalPoints: 100,
              class: {
                id: "class-1",
                subjectName: "Mathematics",
                subjectCode: "MATH-1",
              },
            },
          },
          {
            id: "attempt-draft",
            assessmentId: "assessment-2",
            attemptNumber: 2,
            score: null,
            isSubmitted: false,
            startedAt: "2026-04-18T10:00:00.000Z",
            assessment: {
              id: "assessment-2",
              title: "Assessment 2",
              classId: "class-1",
              dueDate: "2026-04-22T09:00:00.000Z",
              type: "quiz",
              totalPoints: 50,
              class: {
                id: "class-1",
                subjectName: "Mathematics",
                subjectCode: "MATH-1",
              },
            },
          },
        ],
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      }) as ReturnType<typeof useAssessmentHistory>,
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
    mockedUseAssessmentSubmitMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(undefined),
      isPending: false,
      error: null,
    } as ReturnType<typeof useAssessmentSubmitMutation>);
    mockedUseAssessmentResult.mockImplementation(
      ((attemptId?: string) =>
        createQueryState(
          attemptId
            ? {
                attempt: {
                  id: attemptId,
                  assessmentId: "assessment-1",
                  isSubmitted: true,
                  isReturned: true,
                },
                score: 92,
                passed: true,
                isReturned: true,
                attemptNumber: 1,
                teacherFeedback: "Strong work.",
                responses: [],
                assessment: {
                  id: "assessment-1",
                  title: "Assessment 1",
                  type: "quiz",
                  totalPoints: 100,
                },
              }
            : undefined,
        )) as ReturnType<typeof useAssessmentResult>,
    );

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      const phase = ((useQueriesCall - 1) % 4) + 1;

      if (phase === 1) {
        return queries.map(() => ({
          data: [
            {
              id: "module-1",
              classId: "class-1",
              title: "Number Sense Module",
              order: 1,
              isLocked: false,
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
                      lesson: { id: "lesson-1", title: "Lesson 1", isDraft: false },
                    },
                  ],
                },
              ],
            },
          ],
          error: null,
        }));
      }
      if (useQueriesCall === 2) {
        return queries.map(() => ({ data: [{ id: "completed-1" }], error: null }));
      }
      return queries.map(() => ({ data: [{ id: "assessment-1" }], error: null }));
    });

    mockedAiApi.startTutorSession.mockResolvedValue({ sessionId: "session-1" } as Awaited<ReturnType<typeof aiApi.startTutorSession>>);
    mockedAiApi.sendTutorMessage.mockResolvedValue(undefined as never);
    mockedAiApi.submitTutorAnswers.mockResolvedValue(undefined as never);
    mockedJaApi.createAskThread.mockResolvedValue({
      thread: {
        id: "thread-1",
        classId: "class-1",
        title: "Explain the lesson",
        status: "active",
      },
      messages: [],
    } as never);
    mockedJaApi.sendAskMessage.mockResolvedValue({
      thread: {
        id: "thread-1",
        classId: "class-1",
        title: "Explain the lesson",
      },
      message: {
        id: "message-1",
        role: "assistant",
        content: "<p><strong>Here is a grounded explanation.</strong></p><ul><li>Review the equivalent values first.</li></ul>",
        blocked: false,
      },
      blocked: false,
    } as never);
    mockedJaApi.createSession.mockResolvedValue({
      session: {
        id: "practice-live",
        classId: "class-1",
        mode: "practice",
        status: "active",
        currentIndex: 0,
        questionCount: 1,
        strikeCount: 0,
        rewardState: "pending",
        groundingStatus: "grounded",
        startedAt: "2026-04-27T08:00:00.000Z",
      },
      items: [
        {
          id: "practice-item-1",
          orderIndex: 0,
          itemType: "single_choice",
          prompt: "Which fraction is larger?",
          options: [
            { id: "option-1", text: "1/2", order: 1 },
            { id: "option-2", text: "1/3", order: 2 },
          ],
          response: null,
        },
      ],
    } as never);
    mockedJaApi.createReviewSession.mockResolvedValue({
      session: {
        id: "review-live",
        classId: "class-1",
        mode: "review",
        status: "active",
        currentIndex: 0,
        questionCount: 1,
        strikeCount: 0,
        rewardState: "pending",
        groundingStatus: "grounded",
        startedAt: "2026-04-27T08:00:00.000Z",
      },
      items: [
        {
          id: "review-item-1",
          orderIndex: 0,
          itemType: "single_choice",
          prompt: "Replay question",
          options: [{ id: "option-1", text: "Answer", order: 1 }],
          response: null,
        },
      ],
    } as never);
    mockedJaApi.getSession.mockImplementation(async () => mockedJaApi.createSession.mock.results[0]?.value ?? {
      session: { id: "practice-live", status: "active", currentIndex: 0, questionCount: 1 },
      items: [],
    } as never);
    mockedJaApi.getReviewSession.mockImplementation(async () => mockedJaApi.createReviewSession.mock.results[0]?.value ?? {
      session: { id: "review-live", status: "active", currentIndex: 0, questionCount: 1 },
      items: [],
    } as never);
    mockedJaApi.submitResponse.mockResolvedValue({
      sessionId: "practice-live",
      itemId: "practice-item-1",
      isCorrect: true,
      feedback: "Correct",
      currentIndex: 1,
      answeredCount: 1,
      questionCount: 1,
    } as never);
    mockedJaApi.submitReviewResponse.mockResolvedValue({
      sessionId: "review-live",
      itemId: "review-item-1",
      isCorrect: true,
      feedback: "Correct",
      currentIndex: 1,
      answeredCount: 1,
      questionCount: 1,
    } as never);
    mockedJaApi.completeSession.mockResolvedValue({
      sessionId: "practice-live",
      totalScore: 1,
      questionCount: 1,
      awardedNow: true,
      xpAwarded: 20,
    } as never);
    mockedJaApi.completeReviewSession.mockResolvedValue({
      sessionId: "review-live",
      totalScore: 1,
      questionCount: 1,
      awardedNow: true,
      xpAwarded: 20,
    } as never);
    mockedUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("renders the redesigned login screen and blocks empty submissions", async () => {
    const { LoginScreen } = require("../LoginScreen");
    const login = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      login,
      logout: jest.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LoginScreen, {
          navigation: {} as never,
          route: { key: "Login", name: "Login" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Welcome back"),
      ),
    ).toBeTruthy();

    const signInButton = findPressableByText(testRenderer!.root, "Sign in");
    await act(async () => {
      await signInButton.props.onPress();
    });

    expect(login).not.toHaveBeenCalled();
    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Email and password are required."),
      ),
    ).toBeTruthy();
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

  it("keeps LXP usable when tutor bootstrap is unavailable", () => {
    mockedUseTutorBootstrap.mockReturnValue(
      createQueryState(undefined, {
        error: new Error("Tutor bootstrap offline"),
      }) as ReturnType<typeof useTutorBootstrap>,
    );

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

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("LXP Dashboard");
    expect(renderedText).toContain("Open Tutor");
    expect(renderedText).not.toContain("LXP data is partially unavailable");
  });

  it("renders the JA hub as an ask-first dark workspace with Learners Path embedded", () => {
    const { JaScreen } = require("../JaScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(JaScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "JA", name: "JA", params: undefined } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("JA Hub");
    expect(renderedText).toContain("Activity History");
    expect(renderedText).toContain("Ask");
    expect(renderedText).toContain("Replay");
    expect(renderedText).toContain("Learners Path");
    expect(renderedText).not.toContain("Practice");
    expect(renderedText).not.toContain("Generate Practice Run");
  });

  it("renders JA Ask with the fixed prompt picker and requires lesson context before sending", async () => {
    const { JaScreen } = require("../JaScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(JaScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "JA", name: "JA", params: { panel: "ask" } } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Pick a visible lesson"),
      ),
    ).toBeTruthy();
    expect(testRenderer!.root.findAll((node) => node.type === "TextInput")).toHaveLength(0);

    const promptButton = findPressableByText(testRenderer!.root, "Ask JA about this lesson");
    await act(async () => {
      promptButton.props.onPress();
    });

    [
      "Explain the lesson",
      "Summarize main idea",
      "What should I study next?",
      "Give me a question",
      "Quiz me on this lesson",
      "Unclear parts check",
      "Key concepts review",
      "Make a study plan",
      "Vocabulary review",
    ].forEach((label) => {
      expect(findPressableByText(testRenderer!.root, label)).toBeTruthy();
    });

    const explainAction = findPressableByText(testRenderer!.root, "Explain the lesson");
    await act(async () => {
      await explainAction.props.onPress();
      await Promise.resolve();
    });

    expect(mockedJaApi.sendAskMessage).not.toHaveBeenCalled();
    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Select a visible lesson first"),
      ),
    ).toBeTruthy();

    const lessonChip = findPressableByText(testRenderer!.root, "Fractions Lesson");
    await act(async () => {
      lessonChip.props.onPress();
    });
    await act(async () => {
      promptButton.props.onPress();
    });
    await act(async () => {
      const explainActionWithLesson = findPressableByText(testRenderer!.root, "Explain the lesson");
      await explainActionWithLesson.props.onPress();
      await Promise.resolve();
    });

    expect(mockedJaApi.sendAskMessage).toHaveBeenCalledWith("thread-1", {
      message: "Explain the lesson",
      quickAction: "Explain the lesson",
      lessonId: "lesson-1",
    });
    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");
    expect(renderedText).toContain("Here is a grounded explanation.");
    expect(renderedText).toContain("Review the equivalent values first.");
    expect(renderedText).not.toContain("<p>");
  });

  it("switches JA classes from the header and clears ask state", async () => {
    mockedUseJaHub.mockReturnValue(
      createQueryState({
        classes: [
          {
            id: "class-1",
            subjectName: "Mathematics",
            subjectCode: "MATH-1",
            sectionName: "Section A",
            gradeLevel: "10",
          },
          {
            id: "class-2",
            subjectName: "Science",
            subjectCode: "SCI-1",
            sectionName: "Section B",
            gradeLevel: "10",
          },
        ],
        selectedClassId: "class-1",
        progress: { xpTotal: 120, streakDays: 3, sessionsCompleted: 2, lastActivityAt: null },
        mastery: { classId: "class-1", percent: 72, label: "Building" },
        badges: [],
        practice: {
          classes: [],
          selectedClassId: "class-1",
          recommendations: [
            {
              id: "rec-1",
              title: "Fractions Foundation",
              reason: "Rebuild fundamentals",
              focusText: "Fractions and equivalent values",
            },
          ],
          recentLessons: [],
          recentAttempts: [],
          sessions: [],
        },
        ask: {
          threads: [],
          lessonContexts: [
            {
              lessonId: "lesson-1",
              title: "Fractions Lesson",
              moduleTitle: "Number Sense Module",
              sectionTitle: "Core Lessons",
            },
          ],
          guidelines: ["Ask for concept help."],
        },
        review: {
          eligibleAttempts: [],
          sessions: [],
        },
      }) as ReturnType<typeof useJaHub>,
    );

    const { JaScreen } = require("../JaScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(JaScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "JA", name: "JA", params: { panel: "ask", classId: "class-1" } } as never,
        }),
      );
    });

    const lessonChip = findPressableByText(testRenderer!.root, "Fractions Lesson");
    await act(async () => {
      lessonChip.props.onPress();
    });

    let promptButton = findPressableByText(testRenderer!.root, "Ask JA about this lesson");
    await act(async () => {
      promptButton.props.onPress();
    });
    const explainAction = findPressableByText(testRenderer!.root, "Explain the lesson");
    await act(async () => {
      await explainAction.props.onPress();
      await Promise.resolve();
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Here is a grounded explanation."),
      ),
    ).toBeTruthy();

    const classSelector = findPressableByText(testRenderer!.root, "Mathematics (MATH-1)");
    await act(async () => {
      classSelector.props.onPress();
    });

    const scienceOption = findPressableByText(testRenderer!.root, "Science (SCI-1)");
    await act(async () => {
      scienceOption.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Science (SCI-1)");
    expect(renderedText).not.toContain("Here is a grounded explanation.");

    promptButton = findPressableByText(testRenderer!.root, "Ask JA about this lesson");
    await act(async () => {
      promptButton.props.onPress();
    });
    const explainAgain = findPressableByText(testRenderer!.root, "Explain the lesson");
    await act(async () => {
      await explainAgain.props.onPress();
      await Promise.resolve();
    });

    expect(mockedJaApi.sendAskMessage).toHaveBeenCalledTimes(1);
    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Select a visible lesson first so JA can keep the answer grounded."),
      ),
    ).toBeTruthy();
  });

  it("opens Learners Path list and drills into the class-style detail shell", () => {
    const { JaScreen } = require("../JaScreen");
    const navigate = jest.fn();
    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(JaScreen, {
          navigation: { navigate } as never,
          route: { key: "JA", name: "JA", params: { panel: "lxp" } } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("My Paths")),
    ).toBeTruthy();

    const pathButton = findPressableByText(testRenderer!.root, "Mathematics");
    act(() => {
      pathButton.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Assigned Steps");
    expect(renderedText).toContain("Replays");
    expect(renderedText).toContain("Case File");
    expect(renderedText).toContain("Overview");

    const openLesson = findPressableByText(testRenderer!.root, "Open Lesson");
    act(() => {
      openLesson.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("LessonDetail", {
      lessonId: "lesson-1",
      classId: "class-1",
    });
  });

  it("renders Dashboard screen shell with the dark student home sections", () => {
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
    expect(renderedText).toContain("Weekly Progress");
    expect(renderedText).toContain("Continue Learning");
    expect(renderedText).toContain("Day Schedule");
    expect(renderedText).toContain("Pending Tasks");
    expect(renderedText).toContain("Recent Lessons");
    expect(renderedText).toContain("Student Tools");
    expect(mockedUseLessons).toHaveBeenCalledWith("class-1");
    expect(mockedUseLessonCompletions).toHaveBeenCalledWith("class-1");
    expect(mockedUseAssessments).toHaveBeenCalledWith("class-1");
  });

  it("routes dashboard hero secondary action to My Courses", () => {
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

    const myCoursesButton = findPressableByText(testRenderer!.root, "My Courses");
    act(() => {
      myCoursesButton.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("Courses");
  });

  it("routes dashboard stat cards and profile nudge to the expected screens", () => {
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

    const classesShortcut = findPressableByText(testRenderer!.root, "Classes");
    const performanceShortcut = findPressableByText(testRenderer!.root, "Average");
    const profileShortcut = findPressableByText(testRenderer!.root, "Complete your learner profile");

    act(() => {
      classesShortcut.props.onPress();
    });
    act(() => {
      performanceShortcut.props.onPress();
    });
    act(() => {
      profileShortcut.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("Classes");
    expect(navigate).toHaveBeenCalledWith("Performance");
    expect(navigate).toHaveBeenCalledWith("Profile");
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
    const moduleRefetch = jest.fn().mockResolvedValue(undefined);
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
      const phase = ((useQueriesCall - 1) % 4) + 1;

      if (phase === 1) {
        return queries.map(() => ({
          data: [
            {
              id: "module-1",
              classId: "class-1",
              title: "Number Sense Module",
              order: 1,
              isLocked: false,
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
                      lesson: { id: "lesson-1", title: "Lesson 1", isDraft: false },
                    },
                  ],
                },
              ],
            },
          ],
          error: null,
          isRefetching: false,
          refetch: moduleRefetch,
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
    expect(moduleRefetch).toHaveBeenCalled();
    expect(completionRefetch).toHaveBeenCalled();
    expect(assessmentRefetch).toHaveBeenCalled();
  });

  it("derives course progress from visible module lessons instead of locked module content", () => {
    const { CoursesScreen } = require("../CoursesScreen");

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      const phase = ((useQueriesCall - 1) % 4) + 1;

      if (phase === 1) {
        return queries.map(() => ({
          data: [
            {
              id: "module-open",
              classId: "class-1",
              title: "Open Module",
              order: 1,
              isLocked: false,
              sections: [
                {
                  id: "section-open",
                  title: "Visible Lessons",
                  order: 1,
                  items: [
                    {
                      id: "item-visible-lesson",
                      itemType: "lesson",
                      order: 1,
                      lessonId: "lesson-visible",
                      lesson: { id: "lesson-visible", title: "Visible Lesson", isDraft: false },
                    },
                  ],
                },
              ],
            },
            {
              id: "module-locked",
              classId: "class-1",
              title: "Locked Module",
              order: 2,
              isLocked: true,
              sections: [
                {
                  id: "section-locked",
                  title: "Locked Lessons",
                  order: 1,
                  items: [
                    {
                      id: "item-locked-lesson",
                      itemType: "lesson",
                      order: 1,
                      lessonId: "lesson-locked",
                      lesson: { id: "lesson-locked", title: "Locked Lesson", isDraft: false },
                    },
                  ],
                },
              ],
            },
          ],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }
      if (useQueriesCall === 2) {
        return queries.map(() => ({
          data: [{ lessonId: "lesson-locked", completed: true }],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }
      return queries.map(() => ({
        data: [{ id: "assessment-1" }],
        error: null,
        isRefetching: false,
        refetch: jest.fn().mockResolvedValue(undefined),
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

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("0/1 lessons");
    expect(renderedText).not.toContain("1/2 lessons");
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

  it("renders Lessons screen as a single-open class accordion and routes channel actions into class detail tabs", () => {
    const { LessonsScreen } = require("../LessonsScreen");
    const navigate = jest.fn();

    mockedUseStudentClasses.mockReturnValue(
      createQueryState([
        {
          id: "class-1",
          subjectName: "Mathematics",
          subjectCode: "MATH-1",
          schoolYear: "2025-2026",
          section: { id: "section-1", name: "Section A", gradeLevel: "10" },
          teacher: { id: "teacher-1", firstName: "Teacher", lastName: "One" },
          schedules: [{ id: "schedule-1", days: ["Mon"], startTime: "08:00", endTime: "09:00" }],
        },
        {
          id: "class-2",
          subjectName: "English",
          subjectCode: "ENG-1",
          schoolYear: "2025-2026",
          section: { id: "section-2", name: "Section B", gradeLevel: "10" },
          teacher: { id: "teacher-2", firstName: "Teacher", lastName: "Two" },
        },
      ]) as ReturnType<typeof useStudentClasses>,
    );

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      const phase = ((useQueriesCall - 1) % 4) + 1;

      if (phase === 1) {
        return [
          {
            data: [
              {
                id: "module-1",
                classId: "class-1",
                title: "Number Sense Module",
                order: 1,
                isLocked: false,
                sections: [
                  {
                    id: "section-1",
                    title: "Lessons",
                    order: 1,
                    items: [
                      {
                        id: "item-lesson-1",
                        itemType: "lesson",
                        order: 1,
                        lessonId: "lesson-1",
                        lesson: { id: "lesson-1", title: "Lesson 1", isDraft: false },
                      },
                    ],
                  },
                ],
              },
            ],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
          {
            data: [
              {
                id: "module-2",
                classId: "class-2",
                title: "Reading Module",
                order: 1,
                isLocked: false,
                sections: [
                  {
                    id: "section-2",
                    title: "Lessons",
                    order: 1,
                    items: [
                      {
                        id: "item-lesson-2",
                        itemType: "lesson",
                        order: 1,
                        lessonId: "lesson-2",
                        lesson: { id: "lesson-2", title: "Lesson 2", isDraft: false },
                      },
                      {
                        id: "item-lesson-3",
                        itemType: "lesson",
                        order: 2,
                        lessonId: "lesson-3",
                        lesson: { id: "lesson-3", title: "Lesson 3", isDraft: false },
                      },
                    ],
                  },
                ],
              },
            ],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
        ];
      }
      if (phase === 2) {
        return [
          {
            data: [{ lessonId: "lesson-1", completed: false }],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
          {
            data: [
              { lessonId: "lesson-2", completed: true },
              { lessonId: "lesson-3", completed: true },
            ],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
        ];
      }
      if (phase === 3) {
        return [
          {
            data: [{ id: "announcement-1", title: "Notebook", content: "Bring it tomorrow." }],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
          {
            data: [],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
        ];
      }

      return [
        {
          data: [{ id: "assessment-1", classId: "class-1", title: "Assessment 1", isPublished: true, dueDate: "2026-04-20T09:00:00.000Z" }],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        },
        {
          data: [],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        },
      ];
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LessonsScreen, {
          navigation: { navigate } as never,
          route: { key: "Classes", name: "Classes" } as never,
        }),
      );
    });

    let renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("My Classes");
    expect(renderedText).toContain("2 classes");
    expect(renderedText).toContain("All");
    expect(renderedText).toContain("In Progress");
    expect(renderedText).toContain("Completed");
    expect(renderedText).toContain("Mathematics");
    expect(renderedText).toContain("English");
    expect(renderedText).not.toContain("Continue Learning");

    const continueCard = findPressableByText(testRenderer!.root, "Mathematics");
    act(() => {
      continueCard.props.onPress();
    });

    renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Modules");
    expect(renderedText).toContain("Assignments");
    expect(renderedText).toContain("Announcements");
    expect(renderedText).toContain("Calendar");
    expect(renderedText).toContain("1 lesson");
    expect(renderedText).toContain("1 pending");
    expect(renderedText).toContain("1 new");
    expect(renderedText).toContain("2 events");

    const announcementsAction = findPressableByText(testRenderer!.root, "Announcements");
    act(() => {
      announcementsAction.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("ClassDetail", {
      classId: "class-1",
      initialTab: "announcements",
    });

    const englishRow = findPressableByText(testRenderer!.root, "English");
    act(() => {
      englishRow.props.onPress();
    });

    renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("2 lessons");
    expect(renderedText).not.toContain("1 pending");
    expect(renderedText).not.toContain("1 new");
  });

  it("excludes locked module lessons from class accordion progress and channel counts", () => {
    const { LessonsScreen } = require("../LessonsScreen");
    const mappers = require("../../data/mappers");
    const originalToSubjectCard = mappers.toSubjectCard.getMockImplementation();
    const originalToLessonCards = mappers.toLessonCards.getMockImplementation();
    const originalFindContinueLearning = mappers.findContinueLearning.getMockImplementation();

    mappers.toSubjectCard.mockImplementation(
      (classItem: { id: string; subjectName: string; subjectCode: string }, lessons: Array<{ id: string }>, completions: Array<{ lessonId: string; completed: boolean }>) => {
        const completedIds = new Set(completions.filter((entry) => entry.completed).map((entry) => entry.lessonId));
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          id: classItem.id,
          name: classItem.subjectName,
          emoji: "📘",
          progress,
          color: "#4f46e5",
          bgColor: "#EEF2FF",
          section: "Section A",
          teacherName: "Teacher One",
          subjectCode: classItem.subjectCode,
          totalLessons,
          completedLessons,
        };
      },
    );
    mappers.toLessonCards.mockImplementation(
      (
        lessons: Array<{ id: string; title: string; description?: string; order?: number }>,
        completions: Array<{ lessonId: string; completed: boolean }>,
        subject: { id: string },
      ) => {
        const completedIds = new Set(completions.filter((entry) => entry.completed).map((entry) => entry.lessonId));
        const ordered = [...lessons].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
        const firstIncompleteIndex = ordered.findIndex((lesson) => !completedIds.has(lesson.id));

        return ordered.map((lesson, index) => ({
          id: lesson.id,
          subjectId: subject.id,
          title: lesson.title,
          description: lesson.description || "Lesson content is available in the class module.",
          duration: "15 min",
          status: completedIds.has(lesson.id) ? "completed" : firstIncompleteIndex === -1 || index === firstIncompleteIndex ? "ongoing" : "locked",
        }));
      },
    );
    mappers.findContinueLearning.mockImplementation(
      (
        subjects: Array<{ id: string }>,
        lessonMap: Record<string, Array<{ status: string }>>,
      ) =>
        subjects.flatMap((subject) =>
          (lessonMap[subject.id] ?? [])
            .filter((lesson) => lesson.status === "ongoing")
            .map((lesson) => ({ lesson, subject })),
        ),
    );

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      const phase = ((useQueriesCall - 1) % 4) + 1;

      if (phase === 1) {
        return queries.map(() => ({
          data: [
            {
              id: "module-open",
              classId: "class-1",
              title: "Visible Module",
              order: 1,
              isLocked: false,
              sections: [
                {
                  id: "section-open",
                  title: "Visible Lessons",
                  order: 1,
                  items: [
                    {
                      id: "item-visible-lesson",
                      itemType: "lesson",
                      order: 1,
                      lessonId: "lesson-visible",
                      lesson: { id: "lesson-visible", title: "Visible Lesson", isDraft: false },
                    },
                  ],
                },
              ],
            },
            {
              id: "module-locked",
              classId: "class-1",
              title: "Locked Module",
              order: 2,
              isLocked: true,
              sections: [
                {
                  id: "section-locked",
                  title: "Locked Lessons",
                  order: 1,
                  items: [
                    {
                      id: "item-locked-lesson",
                      itemType: "lesson",
                      order: 1,
                      lessonId: "lesson-locked",
                      lesson: { id: "lesson-locked", title: "Locked Lesson", isDraft: false },
                    },
                  ],
                },
              ],
            },
          ],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }
      if (phase === 2) {
        return queries.map(() => ({
          data: [{ lessonId: "lesson-locked", completed: true }],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }
      if (phase === 3) {
        return queries.map(() => ({
          data: [],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }
      return queries.map(() => ({
        data: [],
        error: null,
        isRefetching: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      }));
    });

    try {
      let testRenderer: TestRenderer.ReactTestRenderer;
      act(() => {
        testRenderer = TestRenderer.create(
          React.createElement(LessonsScreen, {
            navigation: { navigate: jest.fn() } as never,
            route: { key: "Classes", name: "Classes" } as never,
          }),
        );
      });

      let renderedText = testRenderer!.root
        .findAll((node) => node.type === "Text")
        .map((node) => flattenText(node))
        .join(" ");

      expect(renderedText).toContain("My Classes");
      expect(renderedText).toContain("Mathematics");
      expect(renderedText).not.toContain("Continue Learning");

      const classRow = findPressableByText(testRenderer!.root, "Mathematics");
      act(() => {
        classRow.props.onPress();
      });

      renderedText = testRenderer!.root
        .findAll((node) => node.type === "Text")
        .map((node) => flattenText(node))
        .join(" ");

      const zeroProgressFill = testRenderer!.root.findAll((node) => {
        const style = node.props?.style;
        const styles = Array.isArray(style) ? style : [style];
        return styles.some(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            "width" in entry &&
            "height" in entry &&
            (entry as { width?: unknown }).width === "0%" &&
            (entry as { height?: unknown }).height === "100%",
        );
      });

      expect(zeroProgressFill.length).toBeGreaterThan(0);
      expect(renderedText).toContain("1 lesson");
      expect(renderedText).not.toContain("2 lessons");
      expect(renderedText).not.toContain("Locked Lesson");
    } finally {
      mappers.toSubjectCard.mockImplementation(originalToSubjectCard);
      mappers.toLessonCards.mockImplementation(originalToLessonCards);
      mappers.findContinueLearning.mockImplementation(originalFindContinueLearning);
    }
  });

  it("filters redesigned Lessons screen by progress bucket and search input", () => {
    const { LessonsScreen } = require("../LessonsScreen");

    mockedUseStudentClasses.mockReturnValue(
      createQueryState([
        {
          id: "class-1",
          subjectName: "Mathematics",
          subjectCode: "MATH-1",
          schoolYear: "2025-2026",
          section: { id: "section-1", name: "Section A", gradeLevel: "10" },
          teacher: { id: "teacher-1", firstName: "Teacher", lastName: "One" },
        },
        {
          id: "class-2",
          subjectName: "English",
          subjectCode: "ENG-1",
          schoolYear: "2025-2026",
          section: { id: "section-2", name: "Section B", gradeLevel: "10" },
          teacher: { id: "teacher-2", firstName: "Teacher", lastName: "Two" },
        },
      ]) as ReturnType<typeof useStudentClasses>,
    );

    let useQueriesCall = 0;
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) => {
      useQueriesCall += 1;
      const phase = ((useQueriesCall - 1) % 4) + 1;

      if (phase === 1) {
        return [
          {
            data: [
              {
                id: "module-1",
                classId: "class-1",
                title: "Math Module",
                order: 1,
                isLocked: false,
                sections: [
                  {
                    id: "section-1",
                    title: "Lessons",
                    order: 1,
                    items: [
                      {
                        id: "item-lesson-1",
                        itemType: "lesson",
                        order: 1,
                        lessonId: "lesson-1",
                        lesson: { id: "lesson-1", title: "Lesson 1", isDraft: false },
                      },
                    ],
                  },
                ],
              },
            ],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
          {
            data: [
              {
                id: "module-2",
                classId: "class-2",
                title: "English Module",
                order: 1,
                isLocked: false,
                sections: [
                  {
                    id: "section-2",
                    title: "Lessons",
                    order: 1,
                    items: [
                      {
                        id: "item-lesson-2",
                        itemType: "lesson",
                        order: 1,
                        lessonId: "lesson-2",
                        lesson: { id: "lesson-2", title: "Lesson 2", isDraft: false },
                      },
                    ],
                  },
                ],
              },
            ],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
        ];
      }
      if (phase === 2) {
        return [
          {
            data: [],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
          {
            data: [{ lessonId: "lesson-2", completed: true }],
            error: null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          },
        ];
      }
      if (phase === 3) {
        return [
          { data: [], error: null, isRefetching: false, refetch: jest.fn().mockResolvedValue(undefined) },
          { data: [], error: null, isRefetching: false, refetch: jest.fn().mockResolvedValue(undefined) },
        ];
      }

      return [
        {
          data: [],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        },
        {
          data: [],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        },
      ];
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(LessonsScreen, {
          navigation: { navigate: jest.fn() } as never,
          route: { key: "Classes", name: "Classes" } as never,
        }),
      );
    });

    const completedFilter = testRenderer!.root.findAll(
      (node) => node.type === "Pressable" && flattenText(node) === "Completed",
    )[0];
    act(() => {
      completedFilter.props.onPress();
    });

    let renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("English");
    expect(renderedText).not.toContain("Mathematics");

    const searchButton = testRenderer!.root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Open class search",
    );
    act(() => {
      searchButton.props.onPress();
    });

    const searchField = testRenderer!.root.find((node) => node.type === "TextInput");
    act(() => {
      searchField.props.onChangeText("science");
    });

    renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("No classes found");
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

  it("refreshes class-detail queries from pull-to-refresh", async () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    const classRefetch = jest.fn().mockResolvedValue(undefined);
    const moduleRefetch = jest.fn().mockResolvedValue(undefined);
    const completionRefetch = jest.fn().mockResolvedValue(undefined);
    const assessmentRefetch = jest.fn().mockResolvedValue(undefined);
    const announcementRefetch = jest.fn().mockResolvedValue(undefined);
    const attemptRefetch = jest.fn().mockResolvedValue(undefined);

    mockedUseClassDetail.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? {
                id: classId,
                subjectName: "Mathematics",
                subjectCode: "MATH-1",
                sectionId: "section-1",
                section: { id: "section-1", name: "Section A", gradeLevel: "10" },
                teacherId: "teacher-1",
                teacher: { id: "teacher-1", firstName: "Teacher", lastName: "One" },
                schoolYear: "2025-2026",
                isActive: true,
              }
            : undefined,
          { refetch: classRefetch },
        )) as ReturnType<typeof useClassDetail>,
    );
    mockedUseClassModules.mockReturnValue(
      createQueryState(
        [{ id: "module-1", classId: "class-1", title: "Number Sense Module", order: 1, sections: [] }],
        { refetch: moduleRefetch },
      ) as ReturnType<typeof useClassModules>,
    );
    mockedUseLessonCompletions.mockReturnValue(
      createQueryState([], { refetch: completionRefetch }) as ReturnType<typeof useLessonCompletions>,
    );
    mockedUseAssessments.mockReturnValue(
      createQueryState(
        [{ id: "assessment-1", classId: "class-1", title: "Assessment 1", type: "quiz", isPublished: true }],
        { refetch: assessmentRefetch },
      ) as ReturnType<typeof useAssessments>,
    );
    mockedUseAnnouncements.mockReturnValue(
      createQueryState([], { refetch: announcementRefetch }) as ReturnType<typeof useAnnouncements>,
    );
    mockedUseQueries.mockImplementation(({ queries }: { queries: unknown[] }) =>
      queries.map(() => ({
        data: [],
        error: null,
        isRefetching: false,
        refetch: attemptRefetch,
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

    const screenScroll = testRenderer!.root.find((node) => node.type === "ScreenScroll");
    await act(async () => {
      await screenScroll.props.refreshControl.props.onRefresh();
    });

    expect(classRefetch).toHaveBeenCalled();
    expect(moduleRefetch).toHaveBeenCalled();
    expect(completionRefetch).toHaveBeenCalled();
    expect(assessmentRefetch).toHaveBeenCalled();
    expect(announcementRefetch).toHaveBeenCalled();
    expect(attemptRefetch).toHaveBeenCalled();
  });

  it("opens Class detail on the requested initial tab", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: {
            key: "ClassDetail",
            name: "ClassDetail",
            params: { classId: "class-1", initialTab: "announcements" },
          } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Bring your notebook");
    expect(renderedText).not.toContain("Number Sense Module");
  });

  it("renders the live discussion board tab instead of the old placeholder", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");

    mockedUseDiscussionThreads.mockReturnValue(
      createQueryState({
        items: [
          {
            id: "thread-1",
            classId: "class-1",
            authorId: "teacher-1",
            title: "Quadratic Formula Questions",
            bodyHtml: "<p>Post your questions before Friday.</p>",
            themeId: "default",
            commentLimitPerStudent: null,
            allowComments: true,
            isPinned: true,
            status: "published",
            publishedAt: "2026-05-02T08:00:00.000Z",
            closedAt: null,
            createdAt: "2026-05-02T08:00:00.000Z",
            updatedAt: "2026-05-02T08:00:00.000Z",
            author: { id: "teacher-1", firstName: "Teacher", lastName: "One" },
            commentCount: 2,
            attachments: [],
          },
        ],
        page: 1,
        limit: 50,
        total: 1,
      }) as ReturnType<typeof useDiscussionThreads>,
    );
    mockedUseDiscussionThread.mockReturnValue(
      createQueryState({
        id: "thread-1",
        classId: "class-1",
        authorId: "teacher-1",
        title: "Quadratic Formula Questions",
        bodyHtml: "<p>Post your questions before Friday.</p>",
        themeId: "default",
        commentLimitPerStudent: null,
        allowComments: true,
        isPinned: true,
        status: "published",
        publishedAt: "2026-05-02T08:00:00.000Z",
        closedAt: null,
        createdAt: "2026-05-02T08:00:00.000Z",
        updatedAt: "2026-05-02T08:00:00.000Z",
        author: { id: "teacher-1", firstName: "Teacher", lastName: "One" },
        commentCount: 2,
        attachments: [],
        comments: [],
      }) as ReturnType<typeof useDiscussionThread>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: {
            key: "ClassDetail",
            name: "ClassDetail",
            params: { classId: "class-1", initialTab: "discussion" },
          } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Discussion Board");
    expect(renderedText).toContain("Quadratic Formula Questions");
    expect(renderedText).not.toContain("Discussion board is not connected yet");
  });

  it("routes expanded module lesson rows toward the latest visible unlocked module lesson", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    const navigate = jest.fn();

    mockedUseClassModules.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "module-open",
                  classId,
                  title: "Open Module",
                  order: 1,
                  progressPercent: 0,
                  isLocked: false,
                  sections: [
                    {
                      id: "section-open",
                      title: "Visible Lessons",
                      order: 1,
                      items: [
                        {
                          id: "item-visible-lesson",
                          itemType: "lesson",
                          order: 1,
                          lessonId: "lesson-visible",
                          lesson: { id: "lesson-visible", title: "Visible Lesson", isDraft: false },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "module-locked",
                  classId,
                  title: "Locked Module",
                  order: 2,
                  progressPercent: 100,
                  isLocked: true,
                  sections: [
                    {
                      id: "section-locked",
                      title: "Locked Lessons",
                      order: 1,
                      items: [
                        {
                          id: "item-locked-lesson",
                          itemType: "lesson",
                          order: 1,
                          lessonId: "lesson-locked",
                          lesson: { id: "lesson-locked", title: "Locked Lesson", isDraft: false },
                        },
                      ],
                    },
                  ],
                },
              ]
            : [],
        )) as ReturnType<typeof useClassModules>,
    );
    mockedUseLessons.mockImplementation(
      ((classId?: string) =>
        createQueryState(
          classId
            ? [
                {
                  id: "lesson-locked",
                  classId,
                  title: "Locked Lesson",
                  description: "Should stay hidden behind the locked module.",
                  order: 1,
                  isDraft: false,
                },
                {
                  id: "lesson-visible",
                  classId,
                  title: "Visible Lesson",
                  description: "The first student-visible lesson.",
                  order: 2,
                  isDraft: false,
                },
              ]
            : [],
        )) as ReturnType<typeof useLessons>,
    );
    mockedUseLessonCompletions.mockReturnValue(
      createQueryState([{ lessonId: "lesson-locked", completed: true }]) as ReturnType<typeof useLessonCompletions>,
    );

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

    expect(renderedText).toContain("0/1 lessons completed");
    expect(renderedText).not.toContain("1/2 lessons completed");

    const toggleModule = testRenderer!.root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Toggle Open Module",
    );
    act(() => {
      toggleModule.props.onPress();
    });

    const visibleLesson = findPressableByText(testRenderer!.root, "Visible Lesson");
    act(() => {
      visibleLesson.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("LessonDetail", { lessonId: "lesson-visible", classId: "class-1" });
  });

  it("renders the standalone calendar screen and opens assessment items", async () => {
    const { CalendarScreen } = require("../CalendarScreen");
    const navigate = jest.fn();
    const todayIso = new Date().toISOString();

    mockedUseSchoolEvents.mockReturnValue(createQueryState([]) as ReturnType<typeof useSchoolEvents>);
    mockedUseQueries.mockImplementation(({ queries }: { queries: Array<{ queryKey?: unknown[] }> }) => {
      const firstQueryKey = Array.isArray(queries[0]?.queryKey) ? String(queries[0]?.queryKey?.[0] ?? "") : "";

      if (firstQueryKey === "assessments") {
        return queries.map(() => ({
          data: [
            {
              id: "assessment-1",
              classId: "class-1",
              title: "Calendar Quiz",
              description: "Review the chapter notes.",
              type: "quiz",
              isPublished: true,
              dueDate: todayIso,
            },
          ],
          error: null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }

      return queries.map(() => ({
        data: [],
        error: null,
        isRefetching: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      }));
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(CalendarScreen, {
          navigation: { goBack: jest.fn(), navigate } as never,
          route: { key: "Calendar", name: "Calendar", params: { classId: "class-1" } } as never,
        }),
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("Calendar Quiz")),
    ).toBeTruthy();

    act(() => {
      findPressableByText(testRenderer!.root, "Calendar Quiz").props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentDetail", {
      assessmentId: "assessment-1",
      classId: "class-1",
    });
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

    const moreTabsButton = testRenderer!.root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Open more class tabs",
    );
    act(() => {
      moreTabsButton.props.onPress();
    });

    const gradesTab = findPressableByText(testRenderer!.root, "Grades");
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

    const moreTabsButton = testRenderer!.root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Open more class tabs",
    );
    act(() => {
      moreTabsButton.props.onPress();
    });

    const gradesTab = findPressableByText(testRenderer!.root, "Grades");
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

    const moreTabsButton = testRenderer!.root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Open more class tabs",
    );
    act(() => {
      moreTabsButton.props.onPress();
    });

    const gradesTab = findPressableByText(testRenderer!.root, "Grades");
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

  it("renders an explicit empty state when the announcements tab has no class announcements", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    mockedUseAnnouncements.mockReturnValue(createQueryState([]) as ReturnType<typeof useAnnouncements>);

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ClassDetailScreen, {
          navigation: { goBack: jest.fn(), navigate: jest.fn() } as never,
          route: { key: "ClassDetail", name: "ClassDetail", params: { classId: "class-1" } } as never,
        }),
      );
    });

    const announcementsTab = findPressableByText(testRenderer!.root, "Announcements");
    act(() => {
      announcementsTab.props.onPress();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("No announcements yet");
    expect(renderedText).toContain("Your teacher has not posted any class announcements yet.");
  });

  it("renders legacy class workspace and routes expanded lesson previews to lesson detail", () => {
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

    const toggleModule = testRenderer!.root.find(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === "Toggle Number Sense Module",
    );
    act(() => {
      toggleModule.props.onPress();
    });

    const lessonAction = findPressableByText(testRenderer!.root, "Lesson 1");
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

  it("filters locked, draft, and unpublished module content from the student module detail view", () => {
    const { ModuleDetailScreen } = require("../ModuleDetailScreen");
    const navigate = jest.fn();

    mockedUseModuleDetail.mockReturnValue(
      createQueryState({
        id: "module-1",
        classId: "class-1",
        title: "Number Sense Module",
        description: "Foundations for fractions and decimals",
        order: 1,
        isLocked: false,
        progressPercent: 40,
        sections: [
          {
            id: "section-1",
            title: "Visible Lessons",
            order: 1,
            items: [
              {
                id: "item-visible-lesson",
                itemType: "lesson",
                order: 1,
                lessonId: "lesson-visible",
                lesson: { id: "lesson-visible", title: "Visible Lesson", isDraft: false },
              },
              {
                id: "item-draft-lesson",
                itemType: "lesson",
                order: 2,
                lessonId: "lesson-draft",
                lesson: { id: "lesson-draft", title: "Draft Lesson", isDraft: true },
              },
              {
                id: "item-published-assessment",
                itemType: "assessment",
                order: 3,
                assessmentId: "assessment-visible",
                assessment: { id: "assessment-visible", title: "Visible Task", totalPoints: 100, dueDate: "2026-04-20T09:00:00.000Z", isPublished: true },
              },
              {
                id: "item-hidden-assessment",
                itemType: "assessment",
                order: 4,
                assessmentId: "assessment-hidden",
                assessment: { id: "assessment-hidden", title: "Hidden Task", totalPoints: 100, dueDate: "2026-04-20T09:00:00.000Z", isPublished: false },
              },
            ],
          },
        ],
      }) as ReturnType<typeof useModuleDetail>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(ModuleDetailScreen, {
          navigation: { goBack: jest.fn(), navigate } as never,
          route: { key: "ModuleDetail", name: "ModuleDetail", params: { classId: "class-1", moduleId: "module-1" } } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Visible Lesson");
    expect(renderedText).toContain("Visible Task");
    expect(renderedText).not.toContain("Draft Lesson");
    expect(renderedText).not.toContain("Hidden Task");

    const lessonCard = findPressableByText(testRenderer!.root, "Visible Lesson");
    act(() => {
      lessonCard.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("LessonDetail", { lessonId: "lesson-visible", classId: "class-1" });
  });

  it("does not leak locked module items into the student module detail view", () => {
    const { ModuleDetailScreen } = require("../ModuleDetailScreen");
    mockedUseModuleDetail.mockReturnValue(
      createQueryState({
        id: "module-1",
        classId: "class-1",
        title: "Number Sense Module",
        description: "Foundations for fractions and decimals",
        order: 1,
        isLocked: true,
        progressPercent: 40,
        sections: [
          {
            id: "section-1",
            title: "Locked Lessons",
            order: 1,
            items: [
              {
                id: "item-locked-lesson",
                itemType: "lesson",
                order: 1,
                lessonId: "lesson-locked",
                lesson: { id: "lesson-locked", title: "Locked Lesson", isDraft: false },
              },
            ],
          },
        ],
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

    expect(renderedText).toContain("Module locked");
    expect(renderedText).toContain("No module items yet");
    expect(renderedText).not.toContain("Locked Lesson");
  });

  it("opens and downloads module reference files from module detail", async () => {
    const { ModuleDetailScreen } = require("../ModuleDetailScreen");

    mockedUseModuleDetail.mockReturnValue(
      createQueryState({
        id: "module-1",
        classId: "class-1",
        title: "Number Sense Module",
        description: "Foundations for fractions and decimals",
        order: 1,
        isLocked: false,
        progressPercent: 40,
        sections: [
          {
            id: "section-1",
            title: "Resources",
            order: 1,
            items: [
              {
                id: "item-file-1",
                itemType: "file",
                order: 1,
                fileId: "file-1",
                file: {
                  id: "file-1",
                  originalName: "module-guide.pdf",
                  mimeType: "application/pdf",
                  sizeBytes: 1024,
                },
              },
            ],
          },
        ],
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

    const openFileButton = testRenderer!.root.find(
      (node) => node.type === "Pressable" && flattenText(node) === "Open",
    );
    const downloadFileButton = testRenderer!.root.find(
      (node) => node.type === "Pressable" && flattenText(node) === "Download",
    );

    await act(async () => {
      openFileButton.props.onPress();
      await Promise.resolve();
    });
    await act(async () => {
      downloadFileButton.props.onPress();
      await Promise.resolve();
    });

    expect(mockedModulesApi.openAttachedFile).toHaveBeenCalledWith("item-file-1", "module-guide.pdf");
    expect(mockedModulesApi.downloadAttachedFile).toHaveBeenCalledWith("item-file-1", "module-guide.pdf");
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

  it("renders Class detail 404 responses with the not-found state", () => {
    const { ClassDetailScreen } = require("../ClassDetailScreen");
    mockedUseClassDetail.mockReturnValue(
      createQueryState(undefined, {
        error: {
          isAxiosError: true,
          response: {
            status: 404,
            data: {
              message: "Class not found",
            },
          },
          message: "Request failed with status code 404",
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

    expect(renderedText).toContain("Class not found");
    expect(renderedText).not.toContain("Class data is partially unavailable");
  });

  it("renders Module detail 404 responses with the not-found state", () => {
    const { ModuleDetailScreen } = require("../ModuleDetailScreen");
    mockedUseModuleDetail.mockReturnValue(
      createQueryState(undefined, {
        error: {
          isAxiosError: true,
          response: {
            status: 404,
            data: {
              message: "Module not found",
            },
          },
          message: "Request failed with status code 404",
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

    expect(renderedText).toContain("Module not found");
    expect(renderedText).not.toContain("Module data is partially unavailable");
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

  it("renders Lesson detail 404 responses with the not-found state", () => {
    const { LessonDetailScreen } = require("../LessonDetailScreen");
    mockedUseLessonDetail.mockReturnValue(
      createQueryState(undefined, {
        error: {
          isAxiosError: true,
          response: {
            status: 404,
            data: {
              message: "Lesson not found",
            },
          },
          message: "Request failed with status code 404",
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

    expect(renderedText).toContain("Lesson not found");
    expect(renderedText).not.toContain("Lesson data is partially unavailable");
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

  it("renders all-day school events without a midnight time label", async () => {
    const { DashboardScreen } = require("../DashboardScreen");
    mockedUseSchoolEvents.mockReturnValue(
      createQueryState([
        {
          id: "event-2",
          title: "Foundation Day",
          startsAt: "2026-05-22T00:00:00.000Z",
          endsAt: "2026-05-22T23:59:59.000Z",
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

    await act(async () => {
      await Promise.resolve();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Foundation Day");
    expect(renderedText).toContain("May 22");
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

  it("renders the student bottom bar in student order and keeps JA prominently elevated", () => {
    const { BottomTabBar } = require("../../components/ui/BottomTabBar");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(BottomTabBar, {
          state: {
            index: 2,
            routes: [
              { key: "dashboard-key", name: "Dashboard" },
              { key: "classes-key", name: "Classes" },
              { key: "ja-key", name: "JA" },
              { key: "assessments-key", name: "Assessments" },
              { key: "profile-key", name: "Profile" },
            ],
          },
          descriptors: {
            "dashboard-key": { options: {} },
            "classes-key": { options: {} },
            "ja-key": { options: {} },
            "assessments-key": { options: {} },
            "profile-key": { options: {} },
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

    const homeIndex = renderedText.indexOf("Home");
    const classesIndex = renderedText.indexOf("Classes");
    const jaIndex = renderedText.indexOf("JA");
    const assessmentsIndex = renderedText.indexOf("Assessment");
    const profileIndex = renderedText.indexOf("Profile");

    expect(homeIndex).toBeGreaterThanOrEqual(0);
    expect(classesIndex).toBeGreaterThan(homeIndex);
    expect(jaIndex).toBeGreaterThan(classesIndex);
    expect(assessmentsIndex).toBeGreaterThan(jaIndex);
    expect(profileIndex).toBeGreaterThan(assessmentsIndex);

    const jaOrb = testRenderer!.root.findAll((node) => node.type === "LinearGradient")[0];
    expect(jaOrb.props.style.width).toBe(72);
    expect(jaOrb.props.style.marginTop).toBe(-28);

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
    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("Student Identity")),
    ).toBeTruthy();
    expect(
      testRenderer!.root.find((node) => node.type === "Text" && flattenText(node).includes("Profile Status")),
    ).toBeTruthy();

    const saveButton = findPressableByText(testRenderer!.root, "Save Profile Changes");
    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(profileUpdateMutateAsync).toHaveBeenCalledWith({
      phone: "09170001111",
      address: "Sample address",
      familyName: "Parent",
      familyRelationship: "Guardian",
      familyContact: "09990002222",
    });
  });

  it("opens transcript from the profile quick actions", async () => {
    const { ProfileScreen } = require("../ProfileScreen");
    const navigate = jest.fn();
    let testRenderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(ProfileScreen, {
          navigation: { navigate } as never,
          route: { key: "Profile", name: "Profile" } as never,
        }),
      );
    });

    const openTranscript = findPressableByText(testRenderer!.root, "View Transcript");
    await act(async () => {
      openTranscript.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("Transcript");
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

    const saveButton = findPressableByText(testRenderer!.root, "Save Profile Changes");
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

  it("renders the transcript parity screen", () => {
    const { TranscriptScreen } = require("../TranscriptScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;

    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(TranscriptScreen, {
          navigation: { goBack: jest.fn() } as never,
          route: { key: "Transcript", name: "Transcript" } as never,
        }),
      );
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Student Records");
    expect(renderedText).toContain("Subject Enrollment Transcript");
    expect(renderedText).toContain("Every class you have enrolled in, grouped by school year.");
    expect(renderedText).toContain("1 enrollment");
    expect(renderedText).toContain("Mathematics (MATH-1)");
    expect(renderedText).toContain("2025-2026");
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

  it("renders the performance parity screen", () => {
    const { PerformanceScreen } = require("../PerformanceScreen");
    let testRenderer: TestRenderer.ReactTestRenderer;

    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(PerformanceScreen, {
          navigation: {} as never,
          route: { key: "Performance", name: "Performance" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("Performance overview"),
      ),
    ).toBeTruthy();
  });

  function mockAssessmentsAccordionQueries(options?: {
    assessments?: Array<Record<string, unknown>>;
    attemptsByAssessmentId?: Record<string, unknown[]>;
    assessmentError?: unknown;
    attemptsError?: unknown;
  }) {
    const assessments =
      options?.assessments ??
      [
        {
          id: "assessment-1",
          classId: "class-1",
          title: "Assessment 1",
          type: "quiz",
          totalPoints: 100,
          isPublished: true,
          dueDate: "2026-04-20T09:00:00.000Z",
        },
      ];

    mockedUseQueries.mockImplementation(({ queries }: { queries: Array<{ queryKey?: unknown[] }> }) => {
      const firstQueryKey = Array.isArray(queries[0]?.queryKey) ? String(queries[0]?.queryKey?.[0] ?? "") : "";

      if (firstQueryKey === "assessments") {
        return queries.map(() => ({
          data: options?.assessmentError ? [] : assessments,
          error: options?.assessmentError ?? null,
          isRefetching: false,
          refetch: jest.fn().mockResolvedValue(undefined),
        }));
      }

      if (firstQueryKey === "assessment-attempts") {
        return queries.map((_, index) => {
          const assessmentId = String(assessments[index]?.id ?? "");
          return {
            data: options?.attemptsByAssessmentId?.[assessmentId] ?? [],
            error: options?.attemptsError ?? null,
            isRefetching: false,
            refetch: jest.fn().mockResolvedValue(undefined),
          };
        });
      }

      return queries.map(() => ({
        data: [],
        error: null,
        isRefetching: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      }));
    });
  }

  it("renders Assessments screen as an accordion and routes expanded actions", () => {
    const { AssessmentsScreen } = require("../AssessmentsScreen");
    const navigate = jest.fn();
    mockAssessmentsAccordionQueries();
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
        (node) => node.type === "Text" && flattenText(node).includes("Assessments & Actions"),
      ),
    ).toBeTruthy();

    const assessmentCard = findPressableByText(testRenderer!.root, "Assessment 1");
    act(() => {
      assessmentCard.props.onPress();
    });

    const detailAction = findPressableByText(testRenderer!.root, "Open Assessment");
    act(() => {
      detailAction.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentDetail", {
      assessmentId: "assessment-1",
      classId: "class-1",
    });

    const classAction = findPressableByText(testRenderer!.root, "Open Class");
    act(() => {
      classAction.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("ClassDetail", {
      classId: "class-1",
      initialTab: "assignments",
    });
  });

  it("routes from the assessments tab into assessment history", () => {
    const { AssessmentsScreen } = require("../AssessmentsScreen");
    const navigate = jest.fn();
    mockAssessmentsAccordionQueries();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentsScreen, {
          navigation: { navigate } as never,
          route: { key: "Assessments", name: "Assessments" } as never,
        }),
      );
    });

    const historyButton = findPressableByIcon(testRenderer!.root, "history");
    act(() => {
      historyButton.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentHistory");
  });

  it("routes the latest submitted attempt from assessment detail into results", () => {
    const { AssessmentDetailScreen } = require("../AssessmentDetailScreen");
    const navigate = jest.fn();
    const attemptsRefetch = jest.fn().mockResolvedValue(undefined);

    mockedUseAssessmentAttempts.mockReturnValue(
      createQueryState(
        [
          {
            id: "attempt-returned",
            assessmentId: "assessment-1",
            attemptNumber: 1,
            score: 92,
            isSubmitted: true,
            isReturned: true,
            submittedAt: "2026-04-18T08:00:00.000Z",
          },
        ],
        { refetch: attemptsRefetch },
      ) as ReturnType<typeof useAssessmentAttempts>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentDetailScreen, {
          navigation: { navigate, goBack: jest.fn() } as never,
          route: {
            key: "AssessmentDetail",
            name: "AssessmentDetail",
            params: { assessmentId: "assessment-1", classId: "class-1" },
          } as never,
        }),
      );
    });

    const resultButton = findPressableByText(testRenderer!.root, "View Results");
    act(() => {
      resultButton.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentResults", {
      attemptId: "attempt-returned",
      assessmentId: "assessment-1",
    });
  });

  it("renders file upload detail sections without take or retake labels", () => {
    const { AssessmentDetailScreen } = require("../AssessmentDetailScreen");

    mockedUseAssessmentDetail.mockReturnValue(
      createQueryState({
        id: "assessment-1",
        classId: "class-1",
        title: "Upload proof",
        description: "Submit your supporting files.",
        type: "file_upload",
        isPublished: true,
        totalPoints: 20,
        passingScore: 60,
        maxAttempts: 1,
        timeLimitMinutes: null,
        dueDate: "2026-05-02T15:59:00.000Z",
        fileUploadInstructions: "Attach the signed form and photo evidence.",
        teacherAttachmentFile: {
          id: "teacher-file-1",
          originalName: "MOA-SIT-FORM-006.pdf",
          mimeType: "application/pdf",
          sizeBytes: 245760,
        },
        questions: [],
      }) as ReturnType<typeof useAssessmentDetail>,
    );
    mockedUseAssessmentAttempts.mockReturnValue(
      createQueryState([
        {
          id: "attempt-upload-1",
          assessmentId: "assessment-1",
          attemptNumber: 1,
          isSubmitted: true,
          isReturned: false,
          submittedAt: "2026-05-02T14:30:00.000Z",
          submittedFiles: [
            {
              id: "submission-file-1",
              originalName: "endorsement-form.pdf",
              mimeType: "application/pdf",
              sizeBytes: 102400,
            },
            {
              id: "submission-file-2",
              originalName: "group-photo.jpg",
              mimeType: "image/jpeg",
              sizeBytes: 204800,
            },
          ],
        },
      ]) as ReturnType<typeof useAssessmentAttempts>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentDetailScreen, {
          navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
          route: {
            key: "AssessmentDetail",
            name: "AssessmentDetail",
            params: { assessmentId: "assessment-1", classId: "class-1" },
          } as never,
        }),
      );
    });

    const texts = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node));

    expect(texts).toContain("Reference material");
    expect(texts).toContain("My work");
    expect(texts).toContain("MOA-SIT-FORM-006.pdf");
    expect(texts).toContain("endorsement-form.pdf");
    expect(texts).toContain("group-photo.jpg");
    expect(texts).toContain("Unsubmit");
    expect(texts).not.toContain("Attempt history");
    expect(() => findPressableByText(testRenderer!.root, "Retake Assessment")).toThrow();
    expect(() => findPressableByText(testRenderer!.root, "Start Assessment")).toThrow();
    expect(() => findPressableByText(testRenderer!.root, "Open History")).toThrow();
    expect(testRenderer!.root.findAll((node) => node.type === "Pressable" && flattenText(node) === "Open")).toHaveLength(1);
  });

  it("keeps normal assessment attempt history collapsed until expanded", () => {
    const { AssessmentDetailScreen } = require("../AssessmentDetailScreen");

    mockedUseAssessmentAttempts.mockReturnValue(
      createQueryState([
        {
          id: "attempt-returned",
          assessmentId: "assessment-1",
          attemptNumber: 2,
          score: 92,
          isSubmitted: true,
          isReturned: true,
          submittedAt: "2026-04-18T08:00:00.000Z",
        },
      ]) as ReturnType<typeof useAssessmentAttempts>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentDetailScreen, {
          navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
          route: {
            key: "AssessmentDetail",
            name: "AssessmentDetail",
            params: { assessmentId: "assessment-1", classId: "class-1" },
          } as never,
        }),
      );
    });

    expect(() => findPressableByText(testRenderer!.root, "Open Attempt")).toThrow();

    const historyToggle = findPressableByText(testRenderer!.root, "Attempt history");
    act(() => {
      historyToggle.props.onPress();
    });

    expect(findPressableByText(testRenderer!.root, "Open Attempt")).toBeTruthy();
  });

  it("renders assessment history actions for submitted and in-progress attempts", () => {
    const { AssessmentHistoryScreen } = require("../AssessmentHistoryScreen");
    const navigate = jest.fn();

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentHistoryScreen, {
          navigation: { navigate, goBack: jest.fn() } as never,
          route: { key: "AssessmentHistory", name: "AssessmentHistory" } as never,
        }),
      );
    });

    expect(
      testRenderer!.root.find(
        (node) => node.type === "Text" && flattenText(node).includes("Assessment History"),
      ),
    ).toBeTruthy();

    const resultAction = findPressableByText(testRenderer!.root, "View Results");
    act(() => {
      resultAction.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentResults", {
      attemptId: "attempt-returned",
      assessmentId: "assessment-1",
    });

    const continueAction = findPressableByText(testRenderer!.root, "Continue Attempt");
    act(() => {
      continueAction.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentTake", {
      assessmentId: "assessment-2",
    });
  });

  it("uses an expanded first page for route-scoped assessment history", () => {
    const { AssessmentHistoryScreen } = require("../AssessmentHistoryScreen");

    act(() => {
      TestRenderer.create(
        React.createElement(AssessmentHistoryScreen, {
          navigation: { navigate: jest.fn(), goBack: jest.fn() } as never,
          route: {
            key: "AssessmentHistory",
            name: "AssessmentHistory",
            params: { assessmentId: "assessment-1" },
          } as never,
        }),
      );
    });

    expect(mockedUseAssessmentHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 1000,
      }),
    );
  });

  it("routes assessment results back to assessment detail without fabricating classId", () => {
    const { AssessmentResultsScreen } = require("../AssessmentResultsScreen");
    const navigate = jest.fn();

    mockedUseAssessmentResult.mockReturnValue(
      createQueryState({
        attempt: {
          id: "attempt-returned",
          assessmentId: "assessment-1",
          attemptNumber: 2,
          isSubmitted: true,
          isReturned: true,
        },
        attemptNumber: 2,
        score: 94,
        passed: true,
        isReturned: true,
        responses: [],
        assessment: {
          id: "assessment-1",
          title: "Assessment 1",
          type: "quiz",
          totalPoints: 100,
        },
      }) as ReturnType<typeof useAssessmentResult>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentResultsScreen, {
          navigation: { navigate, goBack: jest.fn() } as never,
          route: {
            key: "AssessmentResults",
            name: "AssessmentResults",
            params: { attemptId: "attempt-returned", assessmentId: "assessment-1" },
          } as never,
        }),
      );
    });

    const backToAssessment = findPressableByText(testRenderer!.root, "Back to Assessment");
    act(() => {
      backToAssessment.props.onPress();
    });

    expect(navigate).toHaveBeenCalledWith("AssessmentDetail", {
      assessmentId: "assessment-1",
    });
  });

  it("blocks assessment take submission when attempt preparation fails", async () => {
    const { AssessmentTakeScreen } = require("../AssessmentTakeScreen");
    mockedAssessmentsApi.getOngoingAttempt.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          message: "Attempt history unavailable",
        },
      },
      message: "Attempt history unavailable",
    });

    let testRenderer: TestRenderer.ReactTestRenderer;
    act(() => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentTakeScreen, {
          navigation: { replace: jest.fn(), goBack: jest.fn() } as never,
          route: {
            key: "AssessmentTake",
            name: "AssessmentTake",
            params: { assessmentId: "assessment-1" },
          } as never,
        }),
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Unable to prepare this attempt");
    expect(renderedText).toContain("Attempt history unavailable");
    expect(() => findPressableByText(testRenderer!.root, "Submit Assessment")).toThrow();
  });

  it("renders taker questions with stripped html, images, and dropdown options", async () => {
    const { AssessmentTakeScreen } = require("../AssessmentTakeScreen");

    mockedUseAssessmentDetail.mockReturnValue(
      createQueryState({
        id: "assessment-1",
        classId: "class-1",
        title: "Assessment 1",
        description: "Choose the best answer.",
        type: "quiz",
        isPublished: true,
        totalPoints: 100,
        passingScore: 75,
        maxAttempts: 2,
        timeLimitMinutes: 30,
        dueDate: "2026-04-20T09:00:00.000Z",
        questions: [
          {
            id: "question-1",
            assessmentId: "assessment-1",
            type: "dropdown",
            content: "<p>Pick the correct color</p>",
            imageUrl: "/api/assessments/questions/images/question.png",
            points: 5,
            order: 1,
            options: [
              { id: "option-1", text: "<p>Blue</p>", isCorrect: true, order: 1 },
              { id: "option-2", text: "<p>Red</p>", isCorrect: false, order: 2 },
            ],
          },
        ],
      }) as ReturnType<typeof useAssessmentDetail>,
    );

    let testRenderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      testRenderer = TestRenderer.create(
        React.createElement(AssessmentTakeScreen, {
          navigation: { replace: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) } as never,
          route: {
            key: "AssessmentTake",
            name: "AssessmentTake",
            params: { assessmentId: "assessment-1" },
          } as never,
        }),
      );
      await Promise.resolve();
    });

    const renderedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(renderedText).toContain("Pick the correct color");
    expect(renderedText).not.toContain("<p>");
    expect(testRenderer!.root.findAll((node) => node.type === "Image")).toHaveLength(1);

    const dropdownPressable = findPressableByText(testRenderer!.root, "Select an answer");
    act(() => {
      dropdownPressable.props.onPress();
    });

    const expandedText = testRenderer!.root
      .findAll((node) => node.type === "Text")
      .map((node) => flattenText(node))
      .join(" ");

    expect(expandedText).toContain("Blue");
    expect(expandedText).toContain("Red");
  });

  it("surfaces assessments backend error state in rendered screen flow", () => {
    const { AssessmentsScreen } = require("../AssessmentsScreen");
    mockAssessmentsAccordionQueries({
      assessmentError: {
        isAxiosError: true,
        message: "Request failed with status code 503",
        response: {
          status: 503,
          data: {
            message: "Assessments API unavailable",
          },
        },
      },
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
          flattenText(node).includes("Some assessment data could not load"),
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

    const completedFilter = findPressableByText(testRenderer!.root, "Completed");
    act(() => {
      completedFilter.props.onPress();
    });

    expect(
      testRenderer!.root.find(
        (node) =>
          node.type === "Text" &&
          flattenText(node).includes("No completed assessments match this view."),
      ),
    ).toBeTruthy();
  });
});
