import fs from "node:fs";
import path from "node:path";

describe("teacher assessment review modernization", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../TeacherAssessmentReviewScreen.tsx"),
    "utf8",
  );

  it("replaces summary cards with a compact sticky score and grading control", () => {
    expect(source).not.toContain("TeacherStats");
    expect(source).not.toContain("TeacherChip");
    expect(source).toContain("MobileScoreState");
    expect(source).toContain("MobileSegmentedTabs");
    expect(source).toContain('testID="review-control-panel"');
    expect(source).toContain("stickyHeader=");
  });

  it("reviews one navigable question with prominent learner and expected answers", () => {
    expect(source).toContain("activeResponseIndex");
    expect(source).toContain('label="Review question"');
    expect(source).toContain('testID="learner-answer"');
    expect(source).toContain('testID="expected-answer"');
  });
});
