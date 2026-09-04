import { apiClient } from "../client";
import { assessmentsApi } from "../services/assessments";
import {
  assessmentResultFixture,
  paginatedFixture,
} from "./fixtures/contracts";

jest.mock("../services/protected-files", () => ({
  downloadProtectedFile: jest.fn(),
  openLocalFile: jest.fn(),
}));

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("assessmentsApi contract parity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends rubric and manual response scores through the complete return-grade DTO", async () => {
    const payload: Parameters<typeof assessmentsApi.returnGrade>[1] = {
      teacherFeedback: "Good reasoning.",
      rubricScores: [
        {
          criterionId: "criterion-1",
          pointsEarned: 8,
          feedback: "Clear explanation.",
        },
      ],
      manualResponseScores: [
        { questionId: "8f59a1f9-2b6c-4f61-9ef2-4ff4ee3c5921", pointsEarned: 4 },
      ],
      bonusPoints: 2,
      bonusReason: "Corrected teacher scoring omission",
    };
    mockedApiClient.post.mockResolvedValue({
      data: { success: true, data: { success: true } },
    });

    await assessmentsApi.returnGrade("attempt-1", payload);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      "/assessments/attempts/attempt-1/return",
      payload,
    );
  });

  it("preserves nullable, locked feedback and rubric result state", async () => {
    const result = {
      ...assessmentResultFixture,
      assessment: {
        id: "assessment-1",
        rubricCriteria: [{ id: "criterion-1", title: "Reasoning", points: 10 }],
      },
    };
    mockedApiClient.get.mockResolvedValue({
      data: { success: true, data: result },
    });

    await expect(
      assessmentsApi.getAttemptResults("attempt-1"),
    ).resolves.toEqual(result);
  });

  it("preserves assessment pagination metadata and loads every page for legacy list consumers", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `assessment-${index + 1}`,
      classId: "class-1",
      title: `Assessment ${index + 1}`,
      type: "quiz",
      isPublished: true,
    }));
    const secondPage = [
      {
        id: "assessment-101",
        classId: "class-1",
        title: "Assessment 101",
        type: "quiz",
        isPublished: true,
      },
    ];
    mockedApiClient.get
      .mockResolvedValueOnce({ data: paginatedFixture(firstPage, 1, 100, 101) })
      .mockResolvedValueOnce({
        data: paginatedFixture(secondPage, 2, 100, 101),
      });

    const page = await assessmentsApi.getAllByClass("class-1");

    expect(page.data).toHaveLength(101);
    expect(page.total).toBe(101);
    expect(page.hasMore).toBe(false);
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      1,
      "/assessments/class/class-1",
      { params: { page: 1, limit: 100 } },
    );
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(
      2,
      "/assessments/class/class-1",
      { params: { page: 2, limit: 100 } },
    );
  });
});
