import { apiClient } from "../client";
import { extractionsApi } from "../services/extractions";
import parityFixture from "../../../../contract-fixtures/extraction-parity.json";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("extractionsApi", () => {
  beforeEach(() => jest.clearAllMocks());

  it("submits the selected extraction style", async () => {
    mockedApiClient.post.mockResolvedValue({
      data: { data: { extractionId: "extract-1", status: "pending" } },
    });

    await extractionsApi.start({
      fileId: "file-1",
      targetSectionCount: 4,
      extractionStyle: "student_friendly",
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith("/ai/extract-module", {
      fileId: "file-1",
      targetSectionCount: 4,
      extractionStyle: "student_friendly",
    });
  });

  it("normalizes nested content and legacy lessons like web", async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: {
          id: "extract-1",
          file_id: "file-1",
          class_id: "class-1",
          teacher_id: "teacher-1",
          extraction_status: "COMPLETED",
          progress_percent: "100",
          structured_content: {
            title: "Module",
            lessons: [
              {
                title: "Legacy lesson",
                blocks: [{ type: "text", content: { text: "Body" }, order: "1" }],
              },
            ],
            mediaAssets: [],
            audit: {
              extractionStyle: "faithful",
              reviewState: "needs_review",
              reviewIssues: [
                {
                  id: "issue-1",
                  code: "low-confidence",
                  severity: "blocking",
                  scope: "section",
                  message: "Review this section",
                  sectionIndex: 0,
                  resolved: false,
                },
              ],
            },
          },
        },
      },
    });

    const result = await extractionsApi.getById("extract-1");

    expect(result.extractionStatus).toBe("completed");
    expect(result.progressPercent).toBe(100);
    expect(result.structuredContent?.sections[0]).toMatchObject({
      title: "Legacy lesson",
      order: 1,
      lessonBlocks: [{ type: "text", order: 1 }],
    });
    expect(result.structuredContent?.audit?.reviewIssues?.[0]).toMatchObject({
      id: "issue-1",
      severity: "blocking",
    });
  });

  it("normalizes the shared extraction fixture to the canonical contract", async () => {
    mockedApiClient.get.mockResolvedValue({ data: { data: parityFixture.raw } });

    const result = await extractionsApi.getById("fixture-extraction");

    expect(result).toMatchObject(parityFixture.expected);
  });

  it("normalizes status and calls retry, cancel, and preview endpoints", async () => {
    mockedApiClient.get.mockResolvedValueOnce({
      data: {
        data: {
          id: "extract-1",
          status: "PROCESSING",
          progress_percent: "42",
          total_chunks: "10",
          processed_chunks: "4",
          model_used: "model-1",
          error_message: null,
        },
      },
    });
    mockedApiClient.post
      .mockResolvedValueOnce({ data: { data: { extractionId: "retry-1", status: "pending" } } })
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({
        data: { data: { moduleId: "module-1", sectionsCreated: 1, lessonsCreated: 1 } },
      });

    const status = await extractionsApi.getStatus("extract-1");
    await extractionsApi.retry("extract-1", { targetSectionCount: 4, extractionStyle: "clean" });
    await extractionsApi.cancel("extract-1");
    const preview = await extractionsApi.previewApply("extract-1", { sectionIndices: [0] });

    expect(status).toMatchObject({ status: "processing", progressPercent: 42, totalChunks: 10 });
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(1, "/ai/extractions/extract-1/retry", {
      targetSectionCount: 4,
      extractionStyle: "clean",
    });
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(2, "/ai/extractions/extract-1/cancel", {});
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(3, "/ai/extractions/extract-1/apply/preview", {
      sectionIndices: [0],
    });
    expect(preview.moduleId).toBe("module-1");
  });
});
