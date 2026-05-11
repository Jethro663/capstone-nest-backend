import { studentDarkTheme } from "../studentDark";

describe("student mobile theme", () => {
  it("uses the exact LMS Modern Academic palette from the reference", () => {
    expect(studentDarkTheme.bg).toBe("#F7F9FB");
    expect(studentDarkTheme.header).toBe("#FFFFFF");
    expect(studentDarkTheme.surface).toBe("#FFFFFF");
    expect(studentDarkTheme.border).toBe("#E2E8F0");
    expect(studentDarkTheme.red).toBe("#00288E");
  });
});
