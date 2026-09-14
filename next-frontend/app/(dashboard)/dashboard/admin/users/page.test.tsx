"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UserManagementPage from "./page";
import { userService } from "@/services/user-service";

const pushMock = jest.fn();
const erasureDialogMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
  }),
}));

jest.mock("@/services/user-service", () => ({
  userService: {
    getAll: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    softDelete: jest.fn(),
    exportUser: jest.fn(),
    bulkLifecycle: jest.fn(),
  },
}));

jest.mock("@/services/admin-lifecycle-service", () => ({
  adminLifecycleService: {
    previewPurgeBatch: jest.fn(),
    executePurgeBatch: jest.fn(),
  },
}));

jest.mock("@/components/admin/AdminErasureBatchDialog", () => ({
  AdminErasureBatchDialog: (props: {
    open: boolean;
    targetType: string;
    targetIds: string[];
  }) => {
    erasureDialogMock(props);
    return props.open ? (
      <div data-testid="user-erasure-dialog">
        {props.targetType}:{props.targetIds.join(",")}
      </div>
    ) : null;
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;

function buildResponse(query?: {
  status?: string;
  role?: string;
  gradeLevel?: string;
}): Awaited<ReturnType<typeof userService.getAll>> {
  const status = query?.status ?? "ACTIVE";
  const users =
    query?.role === "teacher"
      ? [
          {
            id: "teacher-1",
            firstName: "Tina",
            lastName: "Teacher",
            email: "teacher@example.com",
            roles: ["teacher"],
            status,
            isEmailVerified: true,
            createdAt: "2026-03-27T00:00:00.000Z",
            updatedAt: "2026-03-27T00:00:00.000Z",
          },
        ]
      : [
          {
            id: "admin-1",
            firstName: "Admin",
            lastName: "User",
            email: "admin@example.com",
            roles: ["admin"],
            status,
            isEmailVerified: true,
            createdAt: "2026-03-27T00:00:00.000Z",
            updatedAt: "2026-03-27T00:00:00.000Z",
          },
          {
            id: `student-${status.toLowerCase()}`,
            firstName: "Student",
            lastName: "User",
            email: "student@example.com",
            roles: ["student"],
            status,
            isEmailVerified: true,
            createdAt: "2026-03-27T00:00:00.000Z",
            updatedAt: "2026-03-27T00:00:00.000Z",
          },
          ...(status === "DELETED"
            ? [
                {
                  id: "teacher-deleted",
                  firstName: "Deleted",
                  lastName: "Teacher",
                  email: "deleted-teacher@example.com",
                  roles: ["teacher"],
                  status,
                  isEmailVerified: true,
                  createdAt: "2026-03-27T00:00:00.000Z",
                  updatedAt: "2026-03-27T00:00:00.000Z",
                },
              ]
            : []),
        ];

  return {
    success: true,
    users,
    page: 1,
    limit: 100,
    total: users.length,
    totalPages: 1,
    statusCounts: {
      ACTIVE: 7,
      PENDING: 2,
      SUSPENDED: 1,
      DELETED: 4,
    },
  } as Awaited<ReturnType<typeof userService.getAll>>;
}

describe("UserManagementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushMock.mockReset();
    erasureDialogMock.mockClear();
    mockedUserService.getAll.mockImplementation(async (query) =>
      buildResponse(query),
    );
    mockedUserService.bulkLifecycle.mockResolvedValue({
      success: true,
      message: "1 user suspended.",
      data: {
        action: "suspend",
        requested: 1,
        succeeded: ["student-active"],
        failed: [],
      },
    });
  });

  it("opens one governed purge review for multiple selected deleted users", async () => {
    render(<UserManagementPage />);
    await screen.findByRole("heading", { name: "Users" });

    const deletedTab = screen.getByRole("tab", { name: /deleted/i });
    fireEvent.mouseDown(deletedTab);
    fireEvent.click(deletedTab);
    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: "DELETED",
        role: undefined,
        limit: 100,
        includeStatusCounts: true,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /select all visible/i }),
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /review selected accounts for permanent deletion/i,
      }),
    );

    expect(await screen.findByTestId("user-erasure-dialog")).toHaveTextContent(
      "USER:student-deleted,teacher-deleted",
    );
    expect(mockedUserService.bulkLifecycle).not.toHaveBeenCalled();
  });

  it("caps a deleted-account batch review at 50 non-self records", async () => {
    mockedUserService.getAll.mockImplementation(async (query) => {
      if (query?.status !== "DELETED") return buildResponse(query);
      const base = buildResponse(query);
      const deletedUsers = Array.from({ length: 51 }, (_, index) => ({
        id: `deleted-${index + 1}`,
        firstName: "Archived",
        lastName: `User ${index + 1}`,
        email: `archived-${index + 1}@example.com`,
        roles: ["student"],
        status: "DELETED",
        isEmailVerified: true,
        createdAt: "2026-03-27T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:00.000Z",
      }));
      return {
        ...base,
        users: [base.users[0], ...deletedUsers],
        total: 52,
      } as Awaited<ReturnType<typeof userService.getAll>>;
    });

    render(<UserManagementPage />);
    await screen.findByRole("heading", { name: "Users" });

    const deletedTab = screen.getByRole("tab", { name: /deleted/i });
    fireEvent.mouseDown(deletedTab);
    fireEvent.click(deletedTab);
    await screen.findByText("archived-51@example.com");

    fireEvent.click(
      screen.getByRole("button", { name: /select all visible/i }),
    );
    expect(screen.getByText("50 selected")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: /review selected accounts for permanent deletion/i,
      }),
    );

    const openCall = [...erasureDialogMock.mock.calls]
      .reverse()
      .map(([props]) => props)
      .find((props) => props.open === true);
    expect(openCall?.targetIds).toHaveLength(50);
    expect(openCall?.targetIds).toContain("deleted-50");
    expect(openCall?.targetIds).not.toContain("deleted-51");
  });

  it("keeps the page shell mounted while tab changes refresh only the table region", async () => {
    let resolvePending!: (value: ReturnType<typeof buildResponse>) => void;
    mockedUserService.getAll
      .mockResolvedValueOnce(buildResponse({ status: "ACTIVE" }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePending = resolve;
          }),
      );

    render(<UserManagementPage />);

    await screen.findByRole("heading", { name: "Users" });
    expect(screen.getByText("7")).toBeInTheDocument();

    const pendingTab = screen.getByRole("tab", { name: /pending/i });
    fireEvent.mouseDown(pendingTab);
    fireEvent.click(pendingTab);

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Refreshing users...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select all visible/i }),
    ).toBeDisabled();

    resolvePending(buildResponse({ status: "PENDING" }));

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: "PENDING",
        role: undefined,
        limit: 100,
        includeStatusCounts: true,
      }),
    );
  });

  it("applies the role filter through the filter menu and refetches the table", async () => {
    render(<UserManagementPage />);

    await screen.findByRole("heading", { name: "Users" });

    fireEvent.change(screen.getByLabelText(/filter users by role/i), {
      target: { value: "teacher" },
    });

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: "ACTIVE",
        role: "teacher",
        limit: 100,
        includeStatusCounts: true,
      }),
    );
    expect(screen.getByLabelText(/filter users by role/i)).toHaveValue(
      "teacher",
    );
  });

  it("requests graduated students from the grade-level filter", async () => {
    render(<UserManagementPage />);

    await screen.findByRole("heading", { name: "Users" });

    fireEvent.change(screen.getByLabelText(/filter students by grade level/i), {
      target: { value: "graduated" },
    });

    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: "ACTIVE",
        role: undefined,
        gradeLevel: "graduated",
        limit: 100,
        includeStatusCounts: true,
      }),
    );
    expect(
      screen.getByLabelText(/filter students by grade level/i),
    ).toHaveValue("graduated");
  });

  it("navigates on row-body click and bulk-select excludes the current admin account", async () => {
    render(<UserManagementPage />);

    await screen.findByRole("heading", { name: "Users" });

    fireEvent.click(screen.getByText("student@example.com"));
    expect(pushMock).toHaveBeenCalledWith(
      "/dashboard/admin/users/student-active",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /select all visible/i }),
    );
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /suspend selected/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /suspend users/i }),
    );

    await waitFor(() =>
      expect(mockedUserService.bulkLifecycle).toHaveBeenCalledWith({
        action: "suspend",
        userIds: ["student-active"],
      }),
    );
  });

  it("warns that archiving a learner retains and marks class-record evidence", async () => {
    render(<UserManagementPage />);
    await screen.findByRole("heading", { name: "Users" });

    const suspendedTab = screen.getByRole("tab", { name: /suspended/i });
    fireEvent.mouseDown(suspendedTab);
    fireEvent.click(suspendedTab);
    await waitFor(() =>
      expect(mockedUserService.getAll).toHaveBeenLastCalledWith({
        status: "SUSPENDED",
        role: undefined,
        limit: 100,
        includeStatusCounts: true,
      }),
    );

    const archiveButtons = await screen.findAllByTitle("Archive user");
    fireEvent.click(archiveButtons.at(-1)!);
    expect(
      screen.getByText(
        /Existing class-record rows, scores, grades, and audit evidence will be retained and marked “Archived account”/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Archiving does not change class enrollment or period eligibility/i,
      ),
    ).toBeInTheDocument();
  });
});
