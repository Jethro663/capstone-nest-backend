import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminLifecycleDialog } from "./AdminLifecycleDialog";

let mockMaintenanceActive = false;
const mockMaintenanceRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock("@/providers/AdminMaintenanceProvider", () => ({
  useOptionalAdminMaintenance: () => ({
    status: { active: mockMaintenanceActive },
    refresh: mockMaintenanceRefresh,
  }),
}));

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "00000000-0000-4000-8000-000000000501" },
  });
});

const manifest = {
  schemaVersion: 1 as const,
  action: "STUDENT_RESOLUTION" as const,
  targetType: "student",
  targetId: "student-id",
  request: {},
  academicState: { schoolYear: "2026-2027", period: "Q3", version: 1 },
  effects: [
    {
      kind: "update" as const,
      entityType: "enrollment",
      entityId: "enrollment-id",
      summary: "Close enrollment as withdrawn",
    },
  ],
  preserved: ["Finalized Q1 class record"],
  evidence: {},
  blockers: [],
  warnings: [],
  requiredConfirmations: ["PRESERVE_ACADEMIC_HISTORY", "WITHDRAW"],
  generatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  safeToExecute: true,
  decision: {
    state: "READY" as const,
    code: "READY",
    message: "This maintenance action is ready to execute.",
    nextActions: [],
  },
  manifestHash: "a".repeat(64),
};

describe("AdminLifecycleDialog", () => {
  beforeEach(() => {
    mockMaintenanceActive = false;
    mockMaintenanceRefresh.mockClear();
  });

  it("requires active Maintenance Access, impact review, confirmations, notes, and purge password", async () => {
    mockMaintenanceActive = true;
    const preview = jest.fn().mockResolvedValue({ manifest });
    const execute = jest.fn().mockResolvedValue({
      operationId: "operation-id",
      action: manifest.action,
      targetType: "student",
      targetId: "student-id",
      replayed: false,
      changed: [],
      preserved: [],
    });
    render(
      <AdminLifecycleDialog
        open
        onOpenChange={jest.fn()}
        title="Resolve enrollment"
        description="Review the result before applying it."
        targetLabel="Ada Luna"
        intents={[
          {
            value: "WITHDRAW",
            label: "Withdraw learner",
            description: "Preserve earlier work and close current membership.",
          },
        ]}
        preview={preview}
        execute={execute}
        permanent
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));
    expect(
      await screen.findByText("Close enrollment as withdrawn"),
    ).toBeInTheDocument();
    expect(screen.getByText("Finalized Q1 class record")).toBeInTheDocument();

    const executeButton = screen.getByRole("button", {
      name: /permanently delete/i,
    });
    expect(executeButton).toBeDisabled();
    screen
      .getAllByRole("checkbox")
      .forEach((checkbox) => fireEvent.click(checkbox));
    fireEvent.change(screen.getByLabelText(/administrative notes/i), {
      target: { value: "Withdrawal approved by the registrar." },
    });
    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(executeButton);

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/operation completed/i)).toBeInTheDocument();
  });

  it("renders warnings and blocks execution until Maintenance Access is active", async () => {
    const preview = jest.fn().mockResolvedValue({
      manifest: {
        ...manifest,
        warnings: [
          {
            code: "SECTION_CAPACITY",
            message: "Destination section will exceed capacity.",
          },
        ],
      },
    });
    render(
      <AdminLifecycleDialog
        open
        onOpenChange={jest.fn()}
        title="Resolve enrollment"
        description="Review the result before applying it."
        targetLabel="Ada Luna"
        intents={[
          {
            value: "WITHDRAW",
            label: "Withdraw learner",
            description: "Preserve history.",
          },
        ]}
        preview={preview}
        execute={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));
    expect(
      await screen.findByText(/destination section will exceed capacity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open maintenance access/i }),
    ).toHaveAttribute(
      "href",
      "/dashboard/admin/system-settings/maintenance-access/",
    );
    expect(
      screen.getByRole("button", { name: /confirm and apply/i }),
    ).toBeDisabled();
  });

  it("refreshes status and clears stale review when the session expires", async () => {
    mockMaintenanceActive = true;
    const execute = jest.fn().mockRejectedValue({
      response: {
        status: 403,
        data: {
          code: "MAINTENANCE_SESSION_REQUIRED",
          message: "Maintenance Access expired.",
        },
      },
    });
    render(
      <AdminLifecycleDialog
        open
        onOpenChange={jest.fn()}
        title="Resolve enrollment"
        description="Review the result before applying it."
        targetLabel="Ada Luna"
        intents={[
          {
            value: "WITHDRAW",
            label: "Withdraw learner",
            description: "Preserve history.",
          },
        ]}
        preview={jest.fn().mockResolvedValue({ manifest })}
        execute={execute}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));
    await screen.findByText("Close enrollment as withdrawn");
    screen
      .getAllByRole("checkbox")
      .forEach((checkbox) => fireEvent.click(checkbox));
    fireEvent.change(screen.getByLabelText(/administrative notes/i), {
      target: { value: "Withdrawal approved by the registrar." },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm and apply/i }));

    expect(
      await screen.findByText(/maintenance access expired or changed/i),
    ).toBeInTheDocument();
    expect(mockMaintenanceRefresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /review impact/i }),
    ).toBeInTheDocument();
  });

  it("omits repeated password evidence during active Maintenance Access", async () => {
    mockMaintenanceActive = true;
    const preview = jest.fn().mockResolvedValue({ manifest });
    const execute = jest.fn().mockResolvedValue({
      operationId: "operation-id",
      action: manifest.action,
      targetType: "student",
      targetId: "student-id",
      replayed: false,
      changed: [],
      preserved: [],
    });
    render(
      <AdminLifecycleDialog
        open
        onOpenChange={jest.fn()}
        title="Resolve enrollment"
        description="Review the result before applying it."
        targetLabel="Ada Luna"
        intents={[
          {
            value: "WITHDRAW",
            label: "Withdraw learner",
            description: "Preserve earlier work and close current membership.",
          },
        ]}
        preview={preview}
        execute={execute}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));
    expect(
      await screen.findByText(/reauthentication is already covered/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/current password/i),
    ).not.toBeInTheDocument();
    screen
      .getAllByRole("checkbox")
      .forEach((checkbox) => fireEvent.click(checkbox));
    fireEvent.change(screen.getByLabelText(/administrative notes/i), {
      target: { value: "Withdrawal approved by the registrar." },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm and apply/i }));

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute.mock.calls[0][1]).not.toHaveProperty("currentPassword");
  });
});
