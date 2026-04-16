import { render, screen, waitFor } from "@testing-library/react";
import TeacherInterventionsPage from "./page";
import { classService } from "@/services/class-service";
import { lxpService } from "@/services/lxp-service";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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
  },
}));

const mockedClassService = classService as jest.Mocked<typeof classService>;
const mockedLxpService = lxpService as jest.Mocked<typeof lxpService>;

describe("TeacherInterventionsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedClassService.getByTeacher.mockResolvedValue({
      data: [
        {
          id: "class-1",
          subjectName: "Math",
          subjectCode: "MATH-7",
          section: { name: "Rizal" },
        },
      ],
    } as any);
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
    } as any);
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
    } as any);
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
    } as any);
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

  it("opens student detail side panel from queue action", async () => {
    render(<TeacherInterventionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Navarro, Liam")).toBeInTheDocument();
    });

    screen.getByRole("button", { name: "View" }).click();

    expect(
      await screen.findByText("Intervention Student Detail"),
    ).toBeInTheDocument();
    expect(screen.getByText("Review: Fractions")).toBeInTheDocument();
    expect(mockedLxpService.getTeacherCaseDetail).toHaveBeenCalledWith("case-1");
  });
});
