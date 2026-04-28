import { jaApi } from "../services/ja";
import { apiClient } from "../client";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("jaApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates practice sessions through the web-compatible backend route", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          session: {
            id: "session-1",
            classId: "class-1",
            mode: "practice",
            status: "active",
            currentIndex: 0,
            questionCount: 1,
            strikeCount: 0,
            rewardState: "pending",
            groundingStatus: "grounded",
            startedAt: "2026-04-27T00:00:00.000Z",
          },
          items: [],
        },
      },
    });

    const result = await jaApi.createSession({
      classId: "class-1",
      recommendation: {
        id: "rec-1",
        title: "Fractions",
        reason: "Needs support",
        focusText: "Compare fractions",
      },
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/student/ja/practice/sessions",
      {
        classId: "class-1",
        recommendation: {
          id: "rec-1",
          title: "Fractions",
          reason: "Needs support",
          focusText: "Compare fractions",
        },
      },
    );
    expect(result.session.id).toBe("session-1");
  });

  it("sends fixed ask actions with lesson context and quick action metadata", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          thread: {
            id: "thread-1",
            classId: "class-1",
            title: "Explain the lesson",
          },
          message: {
            id: "message-1",
            role: "assistant",
            content: "Grounded answer",
            blocked: false,
          },
          blocked: false,
        },
      },
    });

    await jaApi.sendAskMessage("thread-1", {
      message: "Explain the lesson",
      quickAction: "Explain the lesson",
      lessonId: "lesson-1",
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/student/ja/ask/threads/thread-1/messages",
      {
        message: "Explain the lesson",
        quickAction: "Explain the lesson",
        lessonId: "lesson-1",
      },
    );
  });

  it("creates and completes replay sessions through review routes", async () => {
    mockedApiClient.post
      .mockResolvedValueOnce({
        data: {
          data: {
            session: {
              id: "review-1",
              classId: "class-1",
              mode: "review",
              status: "active",
              currentIndex: 0,
              questionCount: 1,
              strikeCount: 0,
              rewardState: "pending",
              groundingStatus: "grounded",
              startedAt: "2026-04-27T00:00:00.000Z",
            },
            items: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            sessionId: "review-1",
            totalScore: 1,
            questionCount: 1,
            awardedNow: true,
            xpAwarded: 20,
          },
        },
      });

    await jaApi.createReviewSession({
      classId: "class-1",
      attemptId: "attempt-1",
      questionCount: 10,
    });
    const completed = await jaApi.completeReviewSession("review-1");

    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      1,
      "/ai/student/ja/review/sessions",
      {
        classId: "class-1",
        attemptId: "attempt-1",
        questionCount: 10,
      },
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      2,
      "/ai/student/ja/review/sessions/review-1/complete",
      {},
    );
    expect(completed.xpAwarded).toBe(20);
  });
});
