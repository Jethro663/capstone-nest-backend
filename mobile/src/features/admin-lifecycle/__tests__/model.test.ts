import { buildExecutionEvidence, canExecuteManifest } from "../model";
import type { AdminLifecycleManifest } from "../../../types/admin-lifecycle";

const manifest: AdminLifecycleManifest = {
  schemaVersion: 1,
  action: "ARCHIVE_CLASS",
  targetType: "class",
  targetId: "class-1",
  request: {},
  academicState: { schoolYear: "2026-2027", period: "Q3", version: 5 },
  effects: [],
  preserved: ["grades"],
  evidence: {},
  blockers: [],
  warnings: [],
  requiredConfirmations: ["PRESERVE_OFFICIAL_RECORDS"],
  generatedAt: "2026-09-11T13:00:00.000Z",
  expiresAt: "2026-09-11T14:00:00.000Z",
  safeToExecute: true,
  manifestHash: "a".repeat(64),
};

describe("administrator lifecycle review model", () => {
  it("copies backend manifest evidence into the execute request", () => {
    expect(
      buildExecutionEvidence({
        manifest,
        currentPassword: "Current@123",
        reasonCode: "COMPLETED",
        notes: "Reviewed annual completion.",
        confirmations: ["PRESERVE_OFFICIAL_RECORDS"],
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      manifestHash: "a".repeat(64),
      manifestExpiresAt: "2026-09-11T14:00:00.000Z",
      currentPassword: "Current@123",
      reasonCode: "COMPLETED",
      notes: "Reviewed annual completion.",
      confirmations: ["PRESERVE_OFFICIAL_RECORDS"],
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("blocks execution until the backend permits it and every proof is present", () => {
    expect(
      canExecuteManifest({
        manifest,
        confirmations: [],
        notes: "Reviewed",
        currentPassword: "pw",
      }),
    ).toBe(false);
    expect(
      canExecuteManifest({
        manifest: { ...manifest, safeToExecute: false },
        confirmations: manifest.requiredConfirmations,
        notes: "Reviewed",
        currentPassword: "pw",
      }),
    ).toBe(false);
    expect(
      canExecuteManifest({
        manifest,
        confirmations: manifest.requiredConfirmations,
        notes: "Reviewed",
        currentPassword: "pw",
      }),
    ).toBe(true);
  });
});
