import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("student mobile follow-up layout contracts", () => {
  it("keeps Home readable on stable surfaces and separates the learning sections", () => {
    const source = read("../student-home/StudentHomeView.tsx");

    expect(source).toContain('testID="student-home-priority-surface"');
    expect(source).toContain('testID="student-home-section-divider"');
    expect(source).toContain("styles.priorityBody");
    expect(source).toContain("styles.sectionDivider");
    expect(source).not.toContain("priorityKicker: { color: \"#FECACA\"");
    expect(source).not.toContain("priorityTitle: { marginTop: 15, color: \"#FFFFFF\"");
  });

  it("renders the class color hero independently from its press state and bounds actions", () => {
    const source = read("../student-classes/StudentClassCard.tsx");

    expect(source).toContain('testID="student-class-hero-surface"');
    expect(source).toContain("styles.heroPressTarget");
    expect(source).toContain("styles.actionSurface");
    expect(source).toContain("numberOfLines={2} style={styles.primaryButtonText}");
    expect(source).not.toContain("style={({ pressed }) => [styles.hero, { backgroundColor: heroColor }");
  });

  it("uses the shared student shell and a compact facts ledger for assessment work", () => {
    const source = read("../AssessmentDetailScreen.tsx");

    expect(source).toContain("StudentScreen");
    expect(source).toContain("StudentContextStrip");
    expect(source).toContain("StudentFlatSection");
    expect(source).toContain("StudentBottomActionBar");
    expect(source).toContain("function AssessmentFactsLedger");
    expect(source).toContain('testID="assessment-facts-ledger"');
    expect(source).not.toContain("function MetricTile");
    expect(source).not.toContain("<MetricTile");
    expect(source).toContain('title="Assessment details"');
    expect(source).toContain('title="Latest activity"');
    expect(source).toContain('title="My work"');
  });
});
