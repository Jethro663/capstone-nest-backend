import { studentDarkTheme } from "../studentDark";

describe("student mobile theme", () => {
  it("uses the same navy tint as the current web student sidebar instead of plain black", () => {
    expect(studentDarkTheme.bg).toBe("#0A1630");
    expect(studentDarkTheme.header).toBe("#0B1833");
    expect(studentDarkTheme.surface).toBe("#0F2438");
    expect(studentDarkTheme.active).toBe("#132D45");
  });
});
