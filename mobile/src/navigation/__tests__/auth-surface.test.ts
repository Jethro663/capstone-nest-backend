import { resolveAuthenticatedSurface } from "../auth-surface";

describe("authenticated mobile surface", () => {
  it("holds every role at profile completion until the profile is complete", () => {
    for (const role of ["student", "teacher", "admin"] as const) {
      expect(resolveAuthenticatedSurface({ loading: false, isAuthenticated: true, isProfileIncomplete: true, roles: [role] })).toBe("complete-profile");
    }
  });

  it("resumes the correct role surface after completion", () => {
    expect(resolveAuthenticatedSurface({ loading: false, isAuthenticated: true, isProfileIncomplete: false, roles: ["student"] })).toBe("student");
    expect(resolveAuthenticatedSurface({ loading: false, isAuthenticated: true, isProfileIncomplete: false, roles: [{ name: "teacher" }] })).toBe("teacher");
    expect(resolveAuthenticatedSurface({ loading: false, isAuthenticated: true, isProfileIncomplete: false, roles: ["admin"] })).toBe("admin");
  });
});
