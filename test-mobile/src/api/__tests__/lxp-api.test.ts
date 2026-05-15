import { lxpApi } from "../services/lxp";
import { apiClient } from "../client";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("lxpApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("unwraps eligibility payloads and preserves eligible class rows", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          threshold: 74,
          paths: [
            {
              classId: "class-1",
              class: {
                id: "class-1",
                subjectName: "Math",
                subjectCode: "MATH-7",
              },
              interventionCaseId: "case-1",
              status: "active",
              isAtRisk: true,
              blendedScore: 68.25,
              thresholdApplied: 74,
              openedAt: "2026-04-03T00:00:00.000Z",
              closedAt: null,
              counts: {
                steps: 1,
                replays: 1,
                pending: 2,
                total: 2,
                completed: 0,
              },
              progress: {
                totalCheckpoints: 2,
                completedCheckpoints: 0,
                completionPercent: 0,
              },
            },
          ],
          eligibleClasses: [
            {
              classId: "class-1",
              class: {
                id: "class-1",
                subjectName: "Math",
                subjectCode: "MATH-7",
              },
              interventionCaseId: "case-1",
              isAtRisk: true,
              blendedScore: 68.25,
              thresholdApplied: 74,
              openedAt: "2026-04-03T00:00:00.000Z",
            },
          ],
        },
      },
    });

    const result = await lxpApi.getEligibility();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/lxp/me/eligibility");
    expect(result.threshold).toBe(74);
    expect(result.eligibleClasses).toHaveLength(1);
    expect(result.eligibleClasses[0].class.subjectCode).toBe("MATH-7");
    expect(result.paths).toHaveLength(1);
    expect(result.paths?.[0].counts.replays).toBe(1);
  });

  it("returns playlist-safe defaults when payload shape is malformed", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: null,
      },
    });

    const result = await lxpApi.getPlaylist("class-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/lxp/me/playlist/class-1");
    expect(result.interventionCase.status).toBe("inactive");
    expect(result.progress.completionPercent).toBe(0);
    expect(result.checkpoints).toEqual([]);
  });

  it("loads student intervention alerts", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
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
          ],
        },
      },
    });

    const result = await lxpApi.getInterventionAlerts();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/lxp/me/intervention-alerts");
    expect(result.count).toBe(1);
    expect(result.alerts[0].status).toBe("pending");
    expect(result.alerts[0].section?.gradeLevel).toBe("7");
  });

  it("posts checkpoint completion and normalizes response", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          interventionCase: {
            id: "case-1",
            status: "active",
            openedAt: "2026-04-03T00:00:00.000Z",
            thresholdApplied: 74,
            triggerScore: 70,
          },
          progress: {
            xpTotal: 120,
            streakDays: 3,
            checkpointsCompleted: 2,
            completionPercent: 67,
          },
          checkpoints: [],
        },
      },
    });

    const result = await lxpApi.completeCheckpoint("class-1", "assignment-1");

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/lxp/me/playlist/class-1/checkpoints/assignment-1/complete",
      {},
    );
    expect(result.progress.xpTotal).toBe(120);
  });

  it("loads LXP overview for the selected path class", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          selectedClass: {
            classId: "class-1",
            subjectName: "Math",
            subjectCode: "MATH-7",
            section: { id: "section-1", name: "Ruby", gradeLevel: "7" },
            blendedScore: 68,
            thresholdApplied: 74,
            lastComputedAt: null,
          },
          interventionStatus: {
            caseId: "case-1",
            status: "active",
            code: "needs_attention",
            label: "Needs attention",
            message: "Keep going",
            openedAt: "2026-04-03T00:00:00.000Z",
            closedAt: null,
            triggerScore: 68,
            thresholdApplied: 74,
          },
          progress: {
            xpTotal: 120,
            starsTotal: 2,
            streakDays: 3,
            checkpointsCompleted: 1,
            totalCheckpoints: 3,
            completionPercent: 33,
            lastActivityAt: null,
          },
          subjectMastery: [],
          recommendedAction: null,
          upcomingAssessments: [],
          recentActivity: [],
          weakFocusItems: [],
        },
      },
    });

    const result = await lxpApi.getOverview("class-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/lxp/me/overview/class-1");
    expect(result.selectedClass.subjectCode).toBe("MATH-7");
    expect(result.progress.totalCheckpoints).toBe(3);
  });

  it("loads web-shaped teacher intervention history", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          classId: "class-1",
          scoreThreshold: 60,
          history: [
            {
              id: "case-1",
              classId: "class-1",
              studentId: "student-1",
              status: "completed",
              openedAt: "2026-05-01T00:00:00.000Z",
              closedAt: "2026-05-02T00:00:00.000Z",
              triggerScore: 52,
              thresholdApplied: 74,
              completion: {
                totalCheckpoints: 2,
                completedCheckpoints: 2,
                completionPercent: 100,
              },
              pathScore: {
                source: "guided_assessment",
                assignmentId: "assignment-1",
                attemptId: "attempt-1",
                scorePercent: 58,
                submittedAt: "2026-05-02T00:00:00.000Z",
              },
              canRegenerate: true,
              assignments: [{ id: "assignment-1", label: "Guided retry" }],
            },
          ],
        },
      },
    });

    const result = await lxpApi.getTeacherInterventionHistory("class-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/lxp/teacher/classes/class-1/interventions/history");
    expect(result.history).toHaveLength(1);
    expect(result.history[0].pathScore?.scorePercent).toBe(58);
    expect(result.history[0].assignments[0].label).toBe("Guided retry");
  });

  it("loads teacher intervention class report for outcomes and leaderboard", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: {
          classId: "class-1",
          threshold: 74,
          summary: {
            totalCases: 2,
            pendingCases: 1,
            activeCases: 1,
            completedCases: 0,
            interventionParticipation: 2,
            averageDelta: 4.25,
          },
          rows: [{ id: "case-1", studentId: "student-1", status: "active" }],
          leaderboard: [{ rank: 1, studentId: "student-1", xpTotal: 220, starsTotal: 2, streakDays: 3, checkpointsCompleted: 4 }],
        },
      },
    });

    const result = await lxpApi.getClassReport("class-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith("/lxp/teacher/classes/class-1/reports/summary");
    expect(result.summary.averageDelta).toBe(4.25);
    expect(result.leaderboard[0].xpTotal).toBe(220);
  });

  it("posts teacher intervention resolve and regenerate requests", async () => {
    mockedApiClient.post
      .mockResolvedValueOnce({ data: { data: { queue: [] } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            sourceCaseId: "case-1",
            reusedExisting: false,
            scoreThreshold: 60,
            pathScore: {
              source: "assessment_retry",
              assignmentId: "assignment-1",
              attemptId: "attempt-1",
              scorePercent: 55,
              submittedAt: null,
            },
            case: { id: "case-2", status: "active" },
          },
        },
      });

    await lxpApi.resolveIntervention("case-1", "Resolved by teacher queue");
    const regenerated = await lxpApi.regenerateInterventionPath("case-1");

    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      1,
      "/lxp/teacher/interventions/case-1/resolve",
      { note: "Resolved by teacher queue" },
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      2,
      "/lxp/teacher/interventions/case-1/regenerate",
    );
    expect(regenerated.case.id).toBe("case-2");
  });
});
