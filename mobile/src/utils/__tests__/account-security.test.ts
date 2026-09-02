import { isProfileIncomplete, validatePasswordChange } from "../accountSecurity";

describe("account security contract helpers", () => {
  it("matches the web profile gate for missing first or last names", () => {
    expect(isProfileIncomplete({ firstName: "", lastName: "Santos" })).toBe(true);
    expect(isProfileIncomplete({ firstName: "Ana", lastName: " " })).toBe(true);
    expect(isProfileIncomplete({ firstName: "Ana", lastName: "Santos" })).toBe(false);
  });

  it("enforces the backend password shape before sending sensitive values", () => {
    expect(validatePasswordChange({ oldPassword: "old", newPassword: "weak", confirmPassword: "different" })).toEqual({ newPassword: "Use at least 8 characters.", confirmPassword: "Passwords do not match." });
    expect(validatePasswordChange({ oldPassword: "Old@Pass1", newPassword: "New@Pass2", confirmPassword: "New@Pass2" })).toEqual({});
  });
});
