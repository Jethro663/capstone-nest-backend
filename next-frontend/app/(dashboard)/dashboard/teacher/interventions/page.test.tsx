import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import TeacherInterventionsPage from "./page";
import { classService } from "@/services/class-service";
import { healthService } from "@/services/health-service";
import { lxpService } from "@/services/lxp-service";

const mockRouterPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "teacher-1" },
  }),
}));

jest.mock("@/services/class-service", () => ({
  classService: {
    getByTeacher: jest.fn(),
  },
}));

jest.mock("@/services/lxp-service", () => ({
  lxpService: {
    getTeacherQueue: jest.fn(),
    getClassReport: jest.fn(),
    resolveIntervention: jest.fn(),
    activateIntervention: jest.fn(),
    getTeacherCaseDetail: jest.fn(),
    getTeacherInterventionHistory: jest.fn(),
    regenerateInterventionPath: jest.fn(),
  },
}));

jest.mock("@/services/health-service", () => ({
  healthService: {
    getReadiness: jest.fn(),
  },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedHealthService = healthService as jest.Mocked<typeof healthService>;
const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe("TeacherInterventionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockedHealthService.getReadiness.mockResolvedValue({
      ready: true,
      timestamp: "2026-04-30T00:00:00.000Z",
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    });
    mockedClassService.getByTeacher.mockResolvedValue({
      data: [
        {
          id: "class-1",
          subjectName: "Math",
          subjectCode: "MATH-7",
          section: { name: "Rizal" },
        },
      ],
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);
    mockedLxpService.getTeacherQueue.mockResolvedValue({
      data: {
        classId: "class-1",
        threshold: 74,
        count: 1,
        queue: [
          {
            id: "case-1",
            classId: "class-1",
            status: "pending",
            studentId: "student-1",
            student: {
              id: "student-1",
              firstName: "Liam",
              lastName: "Navarro",
              email: "liam@example.com",
            },
            openedAt: "2026-01-01T00:00:00.000Z",
            triggerScore: 50,
            thresholdApplied: 74,
            isCurrentlyAtRisk: false,
            latestBlendedScore: 79,
            latestThreshold: 74,
            aiPlanEligible: false,
            totalCheckpoints: 2,
            completedCheckpoints: 0,
            completionPercent: 0,
            progress: {
              xpTotal: 0,
              starsTotal: 0,
              streakDays: 0,
              checkpointsCompleted: 0,
              lastActivityAt: null,
            },
          },
        ],
      },
    } as Awaited<ReturnType<typeof lxpService.getTeacherQueue>>);
    mockedLxpService.getClassReport.mockResolvedValue({
      data: {
        classId: "class-1",
        threshold: 74,
        summary: {
          totalCases: 1,
          pendingCases: 1,
          activeCases: 0,
          completedCases: 0,
          interventionParticipation: 1,
          averageDelta: 0,
        },
        rows: [],
        leaderboard: [],
      },
    } as Awaited<ReturnType<typeof lxpService.getClassReport>>);
    mockedLxpService.getTeacherInterventionHistory.mockResolvedValue({
      data: {
        classId: "class-1",
        scoreThreshold: 60,
        history: [
          {
            id: "case-history-low",
            classId: "class-1",
            studentId: "student-1",
            student: {
              id: "student-1",
              firstName: "Liam",
              lastName: "Navarro",
              email: "liam@example.com",
            },
            status: "completed",
            openedAt: "2026-01-01T00:00:00.000Z",
            closedAt: "2026-01-05T00:00:00.000Z",
            triggerSource: "performance_status_changed",
            triggerScore: 50,
            thresholdApplied: 74,
            note: null,
            completion: {
              totalCheckpoints: 2,
              completedCheckpoints: 2,
              completionPercent: 100,
            },
            pathScore: {
              source: "guided_assessment",
              assignmentId: "assignment-guided-low",
              attemptId: "attempt-low",
              scorePercent: 58,
              correctCount: 3,
              totalQuestions: 5,
              passed: null,
              submittedAt: "2026-01-05T01:00:00.000Z",
            },
            canRegenerate: true,
            assignments: [
              {
                id: "assignment-lesson",
                type: "lesson_review",
                label: "Review: Fractions",
                order: 1,
                isCompleted: true,
                completedAt: "2026-01-03T00:00:00.000Z",
                xpAwarded: 20,
                lesson: {
                  id: "lesson-1",
                  title: "Fractions Basics",
                  description: "Review equivalent fractions.",
                },
                assessment: null,
                generatedLesson: null,
                guidedAssessment: null,
                score: null,
              },
              {
                id: "assignment-guided-low",
                type: "guided_assessment",
                label: "AI guided assessment: Fractions recovery",
                order: 2,
                isCompleted: true,
                completedAt: "2026-01-05T00:00:00.000Z",
                xpAwarded: 30,
                lesson: null,
                assessment: null,
                generatedLesson: null,
                guidedAssessment: {
                  id: "guided-low",
                  title: "Fractions recovery",
                  description: "Guided practice",
                  weakConcepts: ["Fractions"],
                  sourceAssessmentId: "assessment-1",
                  sourceReferences: [],
                  formativeSummary: "Needs more work",
                  questions: [],
                  status: "approved",
                  approvedAt: "2026-01-04T00:00:00.000Z",
                  rejectedAt: null,
                },
                score: {
                  source: "guided_assessment",
                  assignmentId: "assignment-guided-low",
                  attemptId: "attempt-low",
                  scorePercent: 58,
                  correctCount: 3,
                  totalQuestions: 5,
                  passed: null,
                  submittedAt: "2026-01-05T01:00:00.000Z",
                },
              },
            ],
          },
          {
            id: "case-history-pass",
            classId: "class-1",
            studentId: "student-2",
            student: {
              id: "student-2",
              firstName: "Mina",
              lastName: "Santos",
              email: "mina@example.com",
            },
            status: "completed",
            openedAt: "2026-01-06T00:00:00.000Z",
            closedAt: "2026-01-08T00:00:00.000Z",
            triggerSource: "performance_status_changed",
            triggerScore: 55,
            thresholdApplied: 74,
            note: null,
            completion: {
              totalCheckpoints: 1,
              completedCheckpoints: 1,
              completionPercent: 100,
            },
            pathScore: {
              source: "guided_assessment",
              assignmentId: "assignment-guided-pass",
              attemptId: "attempt-pass",
              scorePercent: 60,
              correctCount: 3,
              totalQuestions: 5,
              passed: null,
              submittedAt: "2026-01-08T01:00:00.000Z",
            },
            canRegenerate: false,
            assignments: [],
          },
        ],
      },
    } as Awaited<ReturnType<typeof lxpService.getTeacherInterventionHistory>>);
    mockedLxpService.regenerateInterventionPath.mockResolvedValue({
      data: {
        sourceCaseId: "case-history-low",
        reusedExisting: false,
        scoreThreshold: 60,
        pathScore: {
          source: "guided_assessment",
          assignmentId: "assignment-guided-low",
          attemptId: "attempt-low",
          scorePercent: 58,
          correctCount: 3,
          totalQuestions: 5,
          passed: null,
          submittedAt: "2026-01-05T01:00:00.000Z",
        },
        case: {
          id: "case-regenerated",
          classId: "class-1",
          status: "active",
          studentId: "student-1",
          openedAt: "2026-01-09T00:00:00.000Z",
          triggerScore: 58,
          thresholdApplied: 60,
          isCurrentlyAtRisk: false,
          latestBlendedScore: 80,
          latestThreshold: 74,
          aiPlanEligible: true,
          totalCheckpoints: 0,
          completedCheckpoints: 0,
          completionPercent: 0,
          progress: {
            xpTotal: 0,
            starsTotal: 0,
            streakDays: 0,
            checkpointsCompleted: 0,
            lastActivityAt: null,
          },
        },
      },
    } as Awaited<ReturnType<typeof lxpService.regenerateInterventionPath>>);
    mockedLxpService.getTeacherCaseDetail.mockResolvedValue({
      data: {
        id: "case-1",
        classId: "class-1",
        studentId: "student-1",
        student: {
          id: "student-1",
          firstName: "Liam",
          lastName: "Navarro",
          email: "liam@example.com",
        },
        status: "pending",
        openedAt: "2026-01-01T00:00:00.000Z",
        closedAt: null,
        triggerScore: 50,
        thresholdApplied: 74,
        note: null,
        completion: {
          totalCheckpoints: 2,
          completedCheckpoints: 0,
          completionPercent: 0,
        },
        progress: {
          xpTotal: 0,
          starsTotal: 0,
          streakDays: 0,
          checkpointsCompleted: 0,
          lastActivityAt: null,
        },
        assignments: [
          {
            id: "assignment-1",
            type: "lesson_review",
            label: "Review: Fractions",
            order: 1,
            isCompleted: false,
            completedAt: null,
            xpAwarded: 20,
          },
        ],
        latestSnapshot: {
          assessmentAverage: 55,
          classRecordAverage: 52,
          blendedScore: 53,
          thresholdApplied: 74,
          isAtRisk: true,
          lastComputedAt: "2026-01-02T00:00:00.000Z",
        },
        weakConcepts: [
          {
            concept: "Fractions",
            masteryScore: 38,
            evidenceCount: 4,
            errorCount: 3,
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
        recentRiskTransitions: [
          {
            id: "log-1",
            previousIsAtRisk: false,
            currentIsAtRisk: true,
            blendedScore: 53,
            thresholdApplied: 74,
            triggerSource: "performance_status_changed",
            createdAt: "2026-01-02T00:00:00.000Z",
          },
        ],
        links: {
          performancePage:
            "/dashboard/teacher/performance?classId=class-1&studentId=student-1",
        },
      },
    } as Awaited<ReturnType<typeof lxpService.getTeacherCaseDetail>>);
  });

  it("hides AI Plan action when queue entry is not AI-eligible", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "AI Plan" }),
    ).not.toBeInTheDocument();
  });

  it("renders the priority intervention queue as a compact table", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /targeted intervention queue for learners below the support threshold/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /grounded on class-approved materials and teacher review/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Trigger" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Current Standing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "XP" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Checkpoints" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("XP Leaderboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Intervention Outcomes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
  });

  it("combines the intervention metrics into the page header", async () => {
    const { container } = render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    const summary = screen.getByLabelText("Intervention summary");
    expect(within(summary).getByText("Active")).toBeInTheDocument();
    expect(within(summary).getByText("Completed")).toBeInTheDocument();
    expect(within(summary).getByText("Average Delta")).toBeInTheDocument();
    expect(within(summary).getByText("Top XP")).toBeInTheDocument();
    expect(
      container.querySelector(".teacher-figma-stat"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Queue Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Insight of the Week")).not.toBeInTheDocument();
  });

  it("switches from the main queue to leaderboard and outcomes", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Leaderboard & Outcomes" }),
    );

    expect(screen.getByText("XP Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Intervention Outcomes")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Trigger" }),
    ).not.toBeInTheDocument();
  });

  it("renders intervention history and opens learners path detail with scores", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    expect(
      screen.getByRole("columnheader", { name: "Path Score" }),
    ).toBeInTheDocument();
    expect(screen.getByText("58.0%")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regenerate Path" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "View Learners Path" }),
    ).toHaveLength(2);

    fireEvent.click(
      screen.getAllByRole("button", { name: "View Learners Path" })[0],
    );

    expect(await screen.findByText("Learners Path Detail")).toBeInTheDocument();
    expect(screen.getByText("Fractions Basics")).toBeInTheDocument();
    expect(screen.getByText("Fractions recovery")).toBeInTheDocument();
    expect(screen.getByText("58.0% score")).toBeInTheDocument();
  });

  it("regenerates only below-threshold history rows and routes to the returned case", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(
      screen.getAllByRole("button", { name: "Regenerate Path" }),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Regenerate Path" }));

    await waitFor(() => {
      expect(mockedLxpService.regenerateInterventionPath).toHaveBeenCalledWith(
        "case-history-low",
      );
    });
    expect(mockRouterPush).toHaveBeenCalledWith(
      "/dashboard/teacher/interventions/case-regenerated?classId=class-1",
    );
  });

  it("selects the class from the page query string before loading data", async () => {
    mockSearchParams = new URLSearchParams("classId=class-2");
    mockedClassService.getByTeacher.mockResolvedValueOnce({
      data: [
        {
          id: "class-1",
          subjectName: "Math",
          subjectCode: "MATH-7",
          section: { name: "Rizal" },
        },
        {
          id: "class-2",
          subjectName: "Science",
          subjectCode: "SCI-7",
          section: { name: "Bonifacio" },
        },
      ],
    } as Awaited<ReturnType<typeof classService.getByTeacher>>);

    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(mockedLxpService.getTeacherQueue).toHaveBeenCalledWith("class-2");
    });
    expect(mockedLxpService.getClassReport).toHaveBeenCalledWith("class-2");
    expect(mockedLxpService.getTeacherInterventionHistory).toHaveBeenCalledWith(
      "class-2",
    );
  });

  it("opens student detail side panel from queue action", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Open Case Workspace" }),
    );

    expect(
      await screen.findByText("Intervention Student Detail"),
    ).toBeInTheDocument();
    expect(screen.getByText("Review: Fractions")).toBeInTheDocument();
    expect(mockedLxpService.getTeacherCaseDetail).toHaveBeenCalledWith(
      "case-1",
    );
  });

  it("uses the safer remedial-plan and workspace labels in queue actions", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", {
        name: "Generate AI-Assisted Remedial Plan",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Case Workspace" }),
    ).toBeInTheDocument();
  });

  it("opens the helper guide from the question mark button", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /module help/i }));

    expect(
      await screen.findByText("Teacher guide: Interventions Dashboard"),
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Start with the class filter")).toBeInTheDocument();
    expect(screen.getByText("Class filter")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
    expect(
      screen.getByText("Work through the intervention queue"),
    ).toBeInTheDocument();
    expect(screen.getByText("AI Plan button")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 3 of 4")).toBeInTheDocument();
    expect(
      screen.getByText("Use leaderboard and outcomes carefully"),
    ).toBeInTheDocument();
    expect(screen.getByText("Leaderboard switch")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
    expect(
      screen.getByText("Open detail before making a final decision"),
    ).toBeInTheDocument();
    expect(screen.getByText("Performance link")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close guide" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Teacher guide: Interventions Dashboard"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows the AI outage rail and disables AI Plan while keeping queue actions available", async () => {
    mockedHealthService.getReadiness.mockResolvedValueOnce({
      ready: false,
      timestamp: "2026-04-30T00:00:00.000Z",
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: false, message: "connect ECONNREFUSED" },
      },
    });
    mockedLxpService.getTeacherQueue.mockResolvedValueOnce({
      data: {
        classId: "class-1",
        threshold: 74,
        count: 1,
        queue: [
          {
            id: "case-1",
            classId: "class-1",
            status: "pending",
            studentId: "student-1",
            student: {
              id: "student-1",
              firstName: "Liam",
              lastName: "Navarro",
              email: "liam@example.com",
            },
            openedAt: "2026-01-01T00:00:00.000Z",
            triggerScore: 50,
            thresholdApplied: 74,
            isCurrentlyAtRisk: false,
            latestBlendedScore: 79,
            latestThreshold: 74,
            aiPlanEligible: true,
            totalCheckpoints: 2,
            completedCheckpoints: 0,
            completionPercent: 0,
            progress: {
              xpTotal: 0,
              starsTotal: 0,
              streakDays: 0,
              checkpointsCompleted: 0,
              lastActivityAt: null,
            },
          },
        ],
      },
    } as Awaited<ReturnType<typeof lxpService.getTeacherQueue>>);

    render(<TeacherInterventionsPage />);

    expect(await screen.findByText(/AI tools are paused/i)).toBeInTheDocument();
    expect(screen.getByText(/connect ECONNREFUSED/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Generate AI-Assisted Remedial Plan",
      }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Activate" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Open Case Workspace" }),
    ).toBeEnabled();
  });
});
