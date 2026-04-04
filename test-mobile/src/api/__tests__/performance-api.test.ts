import { performanceApi } from "../services/performance";
import { apiClient } from "../client";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("performanceApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads student performance summary from the me endpoint", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          student: {
            id: "student-1",
            firstName: "Ada",
            lastName: "Lovelace",
            email: "ada@example.com",
          },
          threshold: 74,
          classes: [
            {
              classId: "class-1",
              subjectCode: "MATH-7",
              blendedScore: 68.5,
              isAtRisk: true,
            },
          ],
          overall: {
            totalClasses: 1,
            classesWithData: 1,
            atRiskClasses: 1,
            averageBlendedScore: 68.5,
          },
        },
      },
    });

    const result = await performanceApi.getStudentSummary();

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      "/performance/students/me/summary",
    );
    expect(result.threshold).toBe(74);
    expect(result.classes).toHaveLength(1);
  });

  it("falls back to safe defaults when payload structure is malformed", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          student: null,
          threshold: 0,
          classes: "not-an-array",
          overall: null,
        },
      },
    });

    const result = await performanceApi.getStudentSummary();

    expect(result.student.id).toBe("");
    expect(result.classes).toEqual([]);
    expect(result.overall.totalClasses).toBe(0);
    expect(result.overall.averageBlendedScore).toBeNull();
  });
});
