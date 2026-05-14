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
});
