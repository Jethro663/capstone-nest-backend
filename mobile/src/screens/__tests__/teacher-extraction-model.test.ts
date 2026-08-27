import type { Extraction } from "../../types/extraction";
import {
  getExtractionApplyBlocker,
  getExtractionProvenanceLabel,
  nextExtractionReviewState,
} from "../teacher-extraction/model";

const extraction = {
  id: "extract-1",
  fileId: "file-1",
  classId: "class-1",
  teacherId: "teacher-1",
  extractionStatus: "completed",
  modelUsed: null,
  structuredContent: {
    title: "Module",
    description: "",
    sections: [{ title: "One", order: 1, lessonBlocks: [] }],
    mediaAssets: [],
    audit: { reviewIssues: [] },
  },
  isApplied: false,
  progressPercent: 100,
  totalChunks: 1,
  processedChunks: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} satisfies Extraction;

it("applies the same dirty, selection, quality, and review blockers as web", () => {
  expect(getExtractionApplyBlocker(extraction, { dirty: true, selectedSectionCount: 1 })).toContain("Save");
  expect(getExtractionApplyBlocker(extraction, { dirty: false, selectedSectionCount: 0 })).toContain("Select");
  expect(
    getExtractionApplyBlocker({ ...extraction, qualityGate: "fail" }, { dirty: false, selectedSectionCount: 1 }),
  ).toContain("quality");
  expect(
    getExtractionApplyBlocker({ ...extraction, reviewRequired: true }, { dirty: false, selectedSectionCount: 1 }),
  ).toContain("review");
  expect(
    getExtractionApplyBlocker(
      {
        ...extraction,
        structuredContent: {
          ...extraction.structuredContent,
          audit: {
            reviewIssues: [
              { id: "issue-1", code: "x", severity: "blocking", scope: "module", message: "Fix", resolved: false },
            ],
          },
        },
      },
      { dirty: false, selectedSectionCount: 1 },
    ),
  ).toContain("blocking");
  expect(getExtractionApplyBlocker(extraction, { dirty: false, selectedSectionCount: 1 })).toBeNull();
});

it("derives review state and source provenance", () => {
  expect(
    nextExtractionReviewState([
      { id: "issue-1", code: "x", severity: "blocking", scope: "block", message: "Fix", resolved: false },
    ]),
  ).toBe("needs_review");
  expect(nextExtractionReviewState([])).toBe("ready");
  expect(
    getExtractionProvenanceLabel({ provenance: { pageStart: 2, pageEnd: 4 } }),
  ).toBe("Pages 2-4");
  expect(getExtractionProvenanceLabel(undefined)).toBe("Source unavailable");
});
