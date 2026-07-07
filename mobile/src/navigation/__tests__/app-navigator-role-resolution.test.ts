import { resolveMobileRole } from "../role-resolver";

describe("resolveMobileRole", () => {
  it("returns admin when admin role is present", () => {
    expect(resolveMobileRole(["student", "admin"])).toBe("admin");
    expect(resolveMobileRole([{ name: "admin" }])).toBe("admin");
  });

  it("returns teacher when teacher role is present without admin", () => {
    expect(resolveMobileRole(["teacher"])).toBe("teacher");
    expect(resolveMobileRole([{ name: "teacher" }])).toBe("teacher");
  });

  it("falls back to student for unknown or empty role lists", () => {
    expect(resolveMobileRole(["unknown"])).toBe("student");
    expect(resolveMobileRole([])).toBe("student");
    expect(resolveMobileRole(undefined)).toBe("student");
  });
});
