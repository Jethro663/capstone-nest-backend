import fs from "node:fs";
import path from "node:path";

describe("teacher assessment detail modernization", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../TeacherAssessmentDetailScreen.tsx"), "utf8");

  it("uses a scannable overview and shared submission controls", () => {
    expect(source).toContain('testID="assessment-overview-callout"');
    expect(source).toContain("MobileFilterSheet");
    expect(source).toContain("MobileScoreState");
    expect(source).not.toContain("TeacherChip");
    expect(source).not.toContain("<TeacherContextStrip");
  });

  it("turns question analytics into an evidence drill-down", () => {
    expect(source).toContain("setSelectedQuestion(question)");
    expect(source).toContain('testID="question-analytics-detail"');
    expect(source).toContain("selectedQuestion.options.map");
    expect(source).toContain("selectedQuestion.textAnswers.map");
  });
});
