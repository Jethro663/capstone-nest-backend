import type {
  CreateAdminUserDto,
  ResetAdminUserPasswordResponse,
} from "../../types/admin";
import type { User } from "../../types/user";

describe("mobile administrator user contracts", () => {
  it("represents the complete backend user profile returned to admin clients", () => {
    const user: User = {
      id: "student-1",
      email: "student@gmail.com",
      roles: ["student"],
      status: "ACTIVE",
      isEmailVerified: true,
      graduatedAt: null,
      contactNumber: "09171234567",
      department: "Junior High School",
      specialization: "Mathematics",
      employeeId: "T-001",
      profile: {
        id: "profile-1",
        userId: "student-1",
        gradeLevel: "8",
      },
      teacherProfile: null,
    };

    expect(user.profile?.gradeLevel).toBe("8");
    expect(user.graduatedAt).toBeNull();
  });

  it("includes grade level in the atomic student creation request", () => {
    const payload: CreateAdminUserDto = {
      email: "student@gmail.com",
      firstName: "Juan",
      lastName: "Dela Cruz",
      role: "student",
      lrn: "123456789012",
      gradeLevel: "8",
    };

    expect(payload.gradeLevel).toBe("8");
  });

  it("preserves password-email delivery evidence from the backend", () => {
    const response: ResetAdminUserPasswordResponse = {
      success: true,
      message: "Password reset successfully, but email delivery failed",
      userId: "student-1",
      generatedPassword: "Temporary@123",
      emailDeliveryStatus: "failed",
      emailDeliveryError: "SMTP unavailable",
    };

    expect(response.emailDeliveryStatus).toBe("failed");
    expect(response.emailDeliveryError).toBe("SMTP unavailable");
  });
});
