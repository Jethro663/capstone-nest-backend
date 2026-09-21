import { mobileBrand } from "../mobileBrand";
import { studentDarkTheme } from "../studentDark";

describe("student mobile theme", () => {
  it("uses the shared GABHS navy/red palette", () => {
    expect(studentDarkTheme.bg).toBe(mobileBrand.canvas);
    expect(studentDarkTheme.header).toBe(mobileBrand.navy);
    expect(studentDarkTheme.surface).toBe("#FFFFFF");
    expect(studentDarkTheme.border).toBe(mobileBrand.border);
    expect(studentDarkTheme.red).toBe(mobileBrand.red);
    expect(studentDarkTheme.redText).toBe(mobileBrand.red);
  });
});
