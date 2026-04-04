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
});
