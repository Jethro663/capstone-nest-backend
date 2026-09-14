import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminErasureBatchDialog } from "./AdminErasureBatchDialog";

jest.mock("@/providers/AdminMaintenanceProvider", () => ({
  useOptionalAdminMaintenance: () => ({ status: { active: true }, refresh: jest.fn() }),
}));

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID: () => "00000000-0000-4000-8000-000000000501" },
  });
});

describe("AdminErasureBatchDialog", () => {
  it("reviews and executes every selected target in one password-free request", async () => {
    const preview = jest.fn().mockResolvedValue({
      schemaVersion: 3,
      targetType: "CLASS",
      targetIds: ["one", "two"],
      purgeMode: "CASCADE_ERASE",
      targets: [
        {
          id: "one",
          displayName: "Math 10",
          lifecycleState: "ARCHIVED",
          impactGroups: [
            { code: "lessons", label: "Lessons", rowCount: 3, action: "DELETE" },
          ],
          storageObjectCount: 0,
          storageBytes: 0,
          warnings: [],
          blockers: [],
          canExecute: true,
        },
        {
          id: "two",
          displayName: "ESP 10",
          lifecycleState: "ARCHIVED",
          impactGroups: [],
          storageObjectCount: 0,
          storageBytes: 0,
          warnings: [],
          blockers: [],
          canExecute: true,
        },
      ],
      totals: { lessons: 3 },
      warnings: [{ code: "DATA_WILL_BE_ERASED", message: "Academic evidence will be erased." }],
      blockers: [],
      globalBlockers: [],
      canExecute: true,
      confirmationText: "ERASE 2 CLASSES",
      catalogVersion: 1,
      databaseSchemaHash: "b".repeat(64),
      manifestHash: "a".repeat(64),
      manifestExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const execute = jest.fn().mockResolvedValue({
      operationId: "operation-id",
      status: "completed",
      targetType: "CLASS",
      targetIds: ["one", "two"],
      deletedCount: 2,
      cleanupStatus: "not_required",
      replayed: false,
    });

    render(
      <AdminErasureBatchDialog
        open
        onOpenChange={jest.fn()}
        targetType="CLASS"
        targetIds={["one", "two"]}
        targetLabel="2 archived classes"
        preview={preview}
        execute={execute}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /review deletion impact/i }));
    expect(await screen.findByText("Math 10")).toBeInTheDocument();
    expect(screen.getByText(/2 records selected/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/administrative notes/i), {
      target: { value: "Approved data correction." },
    });
    fireEvent.change(screen.getByLabelText(/type erase 2 classes/i), {
      target: { value: "ERASE 2 CLASSES" },
    });
    fireEvent.click(screen.getByRole("button", { name: /permanently delete 2/i }));

    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute.mock.calls[0][0]).toMatchObject({
      targetIds: ["one", "two"],
      purgeMode: "CASCADE_ERASE",
      confirmation: "ERASE 2 CLASSES",
    });
  });

  it("shows same-code blockers on each responsible target without a global duplicate", async () => {
    const preview = jest.fn().mockResolvedValue({
      schemaVersion: 3,
      targetType: "CLASS",
      targetIds: ["one", "two"],
      purgeMode: "CASCADE_ERASE",
      targets: [
        {
          id: "one",
          displayName: "Math 10",
          lifecycleState: "ACTIVE",
          impactGroups: [],
          storageObjectCount: 0,
          storageBytes: 0,
          warnings: [],
          blockers: [
            {
              code: "TARGET_NOT_ARCHIVED",
              message: "Archive Math 10 first.",
              resolvable: false,
            },
          ],
          canExecute: false,
        },
        {
          id: "two",
          displayName: "ESP 10",
          lifecycleState: "ACTIVE",
          impactGroups: [],
          storageObjectCount: 0,
          storageBytes: 0,
          warnings: [],
          blockers: [
            {
              code: "TARGET_NOT_ARCHIVED",
              message: "Archive ESP 10 first.",
              resolvable: false,
            },
          ],
          canExecute: false,
        },
      ],
      totals: {},
      warnings: [],
      blockers: [
        {
          code: "TARGET_NOT_ARCHIVED",
          message: "Archive Math 10 first.",
          resolvable: false,
        },
      ],
      globalBlockers: [],
      canExecute: false,
      confirmationText: "ERASE 2 CLASSES",
      catalogVersion: 2,
      databaseSchemaHash: "b".repeat(64),
      manifestHash: "a".repeat(64),
      manifestExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    render(
      <AdminErasureBatchDialog
        open
        onOpenChange={jest.fn()}
        targetType="CLASS"
        targetIds={["one", "two"]}
        targetLabel="2 archived classes"
        preview={preview}
        execute={jest.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /review deletion impact/i }),
    );

    expect(
      await screen.findByText("Archive Math 10 first."),
    ).toBeInTheDocument();
    expect(screen.getByText("Archive ESP 10 first.")).toBeInTheDocument();
    expect(
      screen.getAllByText("This record cannot be deleted yet"),
    ).toHaveLength(2);
    expect(screen.queryByText("Cannot continue yet")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /permanently delete/i }),
    ).not.toBeInTheDocument();
  });
});
