import fs from "node:fs";
import path from "node:path";

const read = (relative: string) =>
  fs.readFileSync(path.resolve(__dirname, relative), "utf8");

describe("administrator class-template contract", () => {
  it("uses every backend-owned template endpoint with the web transport shape", () => {
    const service = read("../services/class-templates.ts");
    for (const token of [
      '"/class-templates"',
      '"/class-templates/compatible"',
      "`/class-templates/${id}`",
      "`/class-templates/${id}/publish`",
      "`/class-templates/${id}/content`",
      "`/class-templates/${id}/assessment-images`",
      "`/class-templates/${id}/engine-export`",
      '"/class-templates/engine-import/validate"',
      '"/class-templates/engine-import"',
    ])
      expect(service).toContain(token);
    expect(service).toContain("sanitizeContentPayload");
  });

  it("retains the complete nested authoring and engine result fields", () => {
    const types = read("../../types/class-template.ts");
    for (const field of [
      "modules:",
      "sections?:",
      "items?:",
      "lessons?:",
      "blocks?:",
      "assessments:",
      "questions?:",
      "options?:",
      "announcements:",
      "chunks?:",
      "normalizedPreview:",
      "regeneratedChunkJobs:",
      "imagePositionX?:",
      "imagePositionY?:",
    ])
      expect(types).toContain(field);
  });
});
