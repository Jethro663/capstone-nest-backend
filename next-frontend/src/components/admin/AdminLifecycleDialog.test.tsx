import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminLifecycleDialog } from "./AdminLifecycleDialog";

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
  manifestHash: "a".repeat(64),
};

describe("AdminLifecycleDialog", () => {
  it("requires impact review, confirmations, notes, and password before execution", async () => {
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
      await screen.findByText("Close enrollment as withdrawn"),
    ).toBeInTheDocument();
    expect(screen.getByText("Finalized Q1 class record")).toBeInTheDocument();

    const executeButton = screen.getByRole("button", {
      name: /confirm and apply/i,
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
});
