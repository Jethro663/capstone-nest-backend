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
      screen.getByRole("link", { name: /turn on maintenance access/i }),
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
      await screen.findByText(
        /maintenance access is no longer active or changed/i,
      ),
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

  it("presents retained evidence as a completed keep-record outcome without deletion ceremony", async () => {
    const onOpenChange = jest.fn();
    const retainedManifest = {
      ...manifest,
      action: "PURGE_USER" as const,
      safeToExecute: false,
      blockers: [
        {
          code: "RETAINED_EVIDENCE",
          message:
            "Permanent deletion is unavailable because this record contains official history.",
          resolvable: false,
          resolutionOptions: ["KEEP_RECORD"],
        },
      ],
      warnings: [
        {
          code: "PERMANENT_ACTION",
          message: "Permanent deletion cannot be undone.",
        },
      ],
      effects: [
        {
          kind: "purge" as const,
          entityType: "user",
          entityId: "student-id",
          summary: "Permanently delete student",
        },
      ],
      preserved: ["Enrollment history: 2 record(s)"],
      requiredConfirmations: ["PERMANENT_DELETE"],
      decision: {
        state: "IMMUTABLE" as const,
        disposition: "RETAIN_REQUIRED" as const,
        code: "RETAINED_EVIDENCE",
        message:
          "Permanent deletion is unavailable because this record contains official history.",
        nextActions: [
          {
            id: "KEEP_RECORD",
            label: "Keep this record",
            kind: "CANCEL" as const,
          },
        ],
      },
    };

    render(
      <AdminLifecycleDialog
        open
        onOpenChange={onOpenChange}
        title="Permanently delete student"
        description="Review retained evidence."
        targetLabel="Ada Luna"
        intents={[
          {
            value: "PURGE",
            label: "Permanently delete",
            description: "Available only for an empty archived record.",
          },
        ]}
        preview={jest.fn().mockResolvedValue({ manifest: retainedManifest })}
        execute={jest.fn()}
        permanent
      />,
    );

    expect(screen.queryByLabelText(/^outcome$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));

    expect(
      (await screen.findAllByText(/permanent deletion is unavailable/i)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /why this record must be kept/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enrollment history: 2 record(s)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/warnings to acknowledge/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^will change$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/current password/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /permanently delete/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /change outcome/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /keep this record/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("invalidates a prepared manifest when controlled lifecycle inputs change", async () => {
    const preview = jest.fn().mockResolvedValue({ manifest });
    const commonProps = {
      open: true,
      onOpenChange: jest.fn(),
      title: "Resolve enrollment",
      description: "Review the result before applying it.",
      targetLabel: "Ada Luna",
      intents: [
        {
          value: "WITHDRAW",
          label: "Withdraw learner",
          description: "Preserve history.",
        },
      ],
      preview,
      execute: jest.fn(),
    };
    const { rerender } = render(
      <AdminLifecycleDialog {...commonProps} previewInputKey="Q3" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));
    expect(
      await screen.findByText("Close enrollment as withdrawn"),
    ).toBeInTheDocument();

    rerender(<AdminLifecycleDialog {...commonProps} previewInputKey="Q4" />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /review impact/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Close enrollment as withdrawn"),
    ).not.toBeInTheDocument();
  });

  it("returns a choice-required section review to refreshed parent-owned inputs", async () => {
    const preview = jest.fn().mockResolvedValue({
      manifest: {
        ...manifest,
        safeToExecute: false,
        blockers: [
          {
            code: "UNRESOLVED_SECTION_LEARNERS",
            message: "One active learner needs an outcome.",
            resolvable: true,
            resolutionOptions: ["WITHDRAW"],
          },
        ],
        effects: [],
        requiredConfirmations: [],
        decision: {
          state: "NEEDS_CHOICE" as const,
          disposition: "CHOICE_REQUIRED" as const,
          code: "UNRESOLVED_SECTION_LEARNERS",
          message: "One active learner needs an outcome.",
          nextActions: [
            {
              id: "WITHDRAW",
              label: "Choose learner outcomes",
              kind: "REPREVIEW" as const,
              intent: "WITHDRAW",
            },
          ],
        },
      },
    });
    const onNextAction = jest.fn().mockResolvedValue(true);
    render(
      <AdminLifecycleDialog
        open
        onOpenChange={jest.fn()}
        title="Retire section"
        description="Review every learner."
        targetLabel="Mabini"
        intents={[
          {
            value: "ARCHIVE",
            label: "Archive section",
            description: "Preserve history.",
          },
        ]}
        preview={preview}
        execute={jest.fn()}
        onNextAction={onNextAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review impact/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /choose learner outcomes/i }),
    );

    await waitFor(() => expect(onNextAction).toHaveBeenCalledTimes(1));
    expect(preview).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /review impact/i }),
    ).toBeInTheDocument();
  });
});
