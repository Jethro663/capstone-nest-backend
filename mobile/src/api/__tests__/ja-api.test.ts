import { apiClient } from "../client";
import { jaApi } from "../services/ja";

jest.mock("../client", () => ({ apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const getMock = apiClient.get as jest.Mock;

describe("JA existing contracts", () => {
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

describe("JA paginated contracts", () => {
  beforeEach(() => getMock.mockReset());

  it("loads, deduplicates, and orders every activity-history page", async () => {
    getMock
      .mockResolvedValueOnce({ data: { data: { items: [
        { id: "new", mode: "ask", classId: "c", title: "New", subtitle: "", status: "ACTIVE", activityAt: "2026-09-02T10:00:00Z" },
        { id: "shared", mode: "review", classId: "c", title: "Shared", subtitle: "", status: "DONE", activityAt: "2026-09-01T10:00:00Z" },
      ], counts: { all: 3, ask: 1, review: 2 }, pagination: { page: 1, limit: 20, total: 3, totalPages: 2, hasNext: true } } } })
      .mockResolvedValueOnce({ data: { data: { items: [
        { id: "shared", mode: "review", classId: "c", title: "Shared", subtitle: "", status: "DONE", activityAt: "2026-09-01T10:00:00Z" },
        { id: "old", mode: "review", classId: "c", title: "Old", subtitle: "", status: "DONE", activityAt: "2026-08-31T10:00:00Z" },
      ], counts: { all: 3, ask: 1, review: 2 }, pagination: { page: 2, limit: 20, total: 3, totalPages: 2, hasNext: false } } } });

    const result = await jaApi.getAllActivityHistory({ classId: "c" });
    expect(result.items.map((item) => item.id)).toEqual(["new", "shared", "old"]);
    expect(getMock).toHaveBeenNthCalledWith(2, "/ai/student/ja/history", { params: { classId: "c", page: 2, limit: 20 } });
  });

  it("walks Ask cursors and returns a single chronological deduplicated thread", async () => {
    const thread = { id: "t", classId: "c", title: "Thread" };
    getMock
      .mockResolvedValueOnce({ data: { data: { thread, messages: [
        { id: "m2", role: "assistant", content: "two", createdAt: "2026-09-02T10:00:00Z" },
        { id: "m3", role: "student", content: "three", createdAt: "2026-09-02T11:00:00Z" },
      ], pageInfo: { hasMore: true, nextCursor: "cursor-1" } } } })
      .mockResolvedValueOnce({ data: { data: { thread, messages: [
        { id: "m1", role: "student", content: "one", createdAt: "2026-09-02T09:00:00Z" },
        { id: "m2", role: "assistant", content: "two", createdAt: "2026-09-02T10:00:00Z" },
      ], pageInfo: { hasMore: false, nextCursor: null } } } });

    const result = await jaApi.getAskThread("t");
    expect(result.messages.map((message) => message.id)).toEqual(["m1", "m2", "m3"]);
    expect(getMock).toHaveBeenNthCalledWith(2, "/ai/student/ja/ask/threads/t", { params: { limit: 40, before: "cursor-1" } });
  });
});
