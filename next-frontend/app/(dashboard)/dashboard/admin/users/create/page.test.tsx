"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminCreateUserPage from "./page";
import { userService } from "@/services/user-service";
import { profileService } from "@/services/profile-service";

const pushMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/services/user-service", () => ({
  userService: {
    create: jest.fn(),
  },
}));

jest.mock("@/services/profile-service", () => ({
  profileService: {
    update: jest.fn(),
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;
const mockedProfileService = profileService as jest.Mocked<
  typeof profileService
>;

describe("AdminCreateUserPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.create.mockResolvedValue({
      success: true,
      data: { user: { id: "teacher-1" } },
    } as Awaited<ReturnType<typeof userService.create>>);
  });

  it("sanitizes role-specific text inputs and clears teacher-only fields when role changes", async () => {
    render(<AdminCreateUserPage />);

    fireEvent.change(screen.getByPlaceholderText("John"), {
      target: { value: "  Maria🙂  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: " Dela@@ Cruz🙂 " },
    });
    fireEvent.change(screen.getByPlaceholderText("john.doe@gmail.com"), {
      target: { value: "  Maria.Teacher @Gmail.COM🙂  " },
    });

    fireEvent.click(screen.getAllByRole("combobox")[0]);
    fireEvent.click(screen.getByText("Teacher"));

    fireEvent.change(screen.getByPlaceholderText("e.g. TCH-2026-001"), {
      target: { value: " tch_2026-001🙂 " },
    });
    fireEvent.change(
      screen.getByPlaceholderText("09171234567 or +639171234567"),
      { target: { value: "+63 917-123-4567abc" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() =>
      expect(mockedUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Maria",
          lastName: "Dela Cruz",
          email: "maria.teacher@gmail.com",
          employeeId: "TCH2026-001",
          contactNumber: "09171234567",
        }),
      ),
    );
  });

  it("creates a student with grade level in the authoritative user request", async () => {
    mockedUserService.create.mockResolvedValue({
      success: true,
      data: { user: { id: "student-1" } },
    } as Awaited<ReturnType<typeof userService.create>>);

    render(<AdminCreateUserPage />);

    fireEvent.change(screen.getByPlaceholderText("John"), {
      target: { value: "Juan" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Dela Cruz" },
    });
    fireEvent.change(screen.getByPlaceholderText("john.doe@gmail.com"), {
      target: { value: "juan.student@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("12-digit LRN"), {
      target: { value: "123456789012" },
    });

    fireEvent.click(screen.getAllByRole("combobox")[1]);
    fireEvent.click(screen.getByText("Grade 8"));
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() =>
      expect(mockedUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "student",
          lrn: "123456789012",
          gradeLevel: "8",
        }),
      ),
    );
    expect(mockedProfileService.update).not.toHaveBeenCalled();
  });
});
