import { studentDarkTheme } from "../studentDark";

describe("student mobile theme", () => {
  it("uses the approved warm P2 GABHS palette", () => {
    expect(studentDarkTheme.bg).toBe("#FBFAF8");
    expect(studentDarkTheme.header).toBe("#FFFFFF");
    expect(studentDarkTheme.surface).toBe("#FFFFFF");
    expect(studentDarkTheme.border).toBe("#E7E3DF");
    expect(studentDarkTheme.red).toBe("#C96B68");
    expect(studentDarkTheme.redText).toBe("#98484A");
  });
});
