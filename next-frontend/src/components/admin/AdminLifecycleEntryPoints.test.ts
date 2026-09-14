import fs from "node:fs";
import path from "node:path";

const source = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("admin lifecycle entry-point contract", () => {
  it("keeps user, class, and section deletion behind the shared governed review", () => {
    const userDetail = source(
      "app/(dashboard)/dashboard/admin/users/[id]/page.tsx",
    );
    const classes = source("app/(dashboard)/dashboard/admin/classes/page.tsx");
    const sections = source(
      "app/(dashboard)/dashboard/admin/sections/page.tsx",
    );

    for (const entryPoint of [userDetail, classes, sections]) {
      expect(entryPoint).toContain("AdminErasureBatchDialog");
      expect(entryPoint).toContain("previewPurgeBatch");
      expect(entryPoint).toContain("executePurgeBatch");
    }
  });

  it("selects historical retirement from authoritative target and academic years", () => {
    const classes = source("app/(dashboard)/dashboard/admin/classes/page.tsx");
    const sections = source(
      "app/(dashboard)/dashboard/admin/sections/page.tsx",
    );

    for (const entryPoint of [classes, sections]) {
      expect(entryPoint).toContain("academicStateRes.data.schoolYear");
      expect(entryPoint).toContain("historicalLifecycleTarget");
      expect(entryPoint).toContain("HISTORICAL_RETIREMENT");
      expect(entryPoint).toContain("CURRENT_CLOSURE");
      expect(entryPoint).toContain("Historical lifecycle period");
    }
    expect(sections).toContain("onNextAction");
    expect(sections).toContain("sectionService.getRoster");
  });
});
