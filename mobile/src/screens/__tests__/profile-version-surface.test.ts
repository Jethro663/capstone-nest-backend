import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("mobile role profile version surfaces", () => {
  it.each([
    "ProfileScreen.tsx",
    "TeacherProfileScreen.tsx",
    "AdminProfileScreen.tsx",
  ])("renders the shared app version indicator in %s", (filename) => {
    const source = readFileSync(join(__dirname, "..", filename), "utf8");

    expect(source).toContain(
      'import { AppVersionInfo } from "../components/AppVersionInfo";',
    );
    expect(source).toContain("<AppVersionInfo");
  });
});
