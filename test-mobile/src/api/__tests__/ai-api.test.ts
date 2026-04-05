import { aiApi } from "../services/ai";
import { apiClient } from "../client";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("aiApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds tutor bootstrap URL with class filter", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          classes: [],
          selectedClassId: null,
          recentLessons: [],
          recentAttempts: [],
          recommendations: [],
          history: [],
        },
      },
    });

    await aiApi.getTutorBootstrap("class-1");

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/ai/student/tutor/bootstrap?classId=class-1",
    );
  });

  it("starts tutor session through backend contract", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          sessionId: "session-1",
          stage: "lesson",
          completed: false,
          message: "Started",
          recommendation: {
            id: "rec-1",
            title: "Fractions",
            reason: "Weak score",
            focusText: "Focus on fractions",
          },
          lessonPlan: [],
          lessonBody: "Lesson body",
          questions: [],
          citations: [],
        },
      },
    });

    const payload = {
      classId: "class-1",
      recommendation: {
        id: "rec-1",
        title: "Fractions",
        reason: "Weak score",
        focusText: "Focus on fractions",
      },
    };

    const result = await aiApi.startTutorSession(payload);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/student/tutor/session",
      payload,
    );
    expect(result.sessionId).toBe("session-1");
  });

  it("posts follow-up tutor message to the session endpoint", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          sessionId: "session-1",
          stage: "practice",
          completed: false,
          message: "Next prompt",
          questions: [],
          citations: [],
        },
      },
    });

    await aiApi.sendTutorMessage("session-1", "Can you explain this again?");

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/ai/student/tutor/session/session-1/message",
      {
        sessionId: "session-1",
        message: "Can you explain this again?",
      },
    );
  });
});
