import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCREEN_FILES = [
  "AssessmentsScreen.tsx",
  "LessonsScreen.tsx",
  "LxpScreen.tsx",
  "ProfileScreen.tsx",
  "ProgressScreen.tsx",
];

const MOJIBAKE_MARKERS = ["Ã°", "Ã¢", "ðŸ", "âœ", "â€¢"];

describe("mobile screen copy sanitization", () => {
  it("does not contain mojibake artifacts in student-facing screen copy", () => {
    const baseDir = join(__dirname, "..");

    for (const file of SCREEN_FILES) {
      const content = readFileSync(join(baseDir, file), "utf8");
      for (const marker of MOJIBAKE_MARKERS) {
        expect(content).not.toContain(marker);
      }
    }
  });
});

