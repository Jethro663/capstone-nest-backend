import type {
  AdminLifecycleExecutionEvidence,
  AdminLifecycleManifest,
  AdminLifecycleReasonCode,
} from "../../types/admin-lifecycle";

export function buildExecutionEvidence(input: {
  manifest: AdminLifecycleManifest;
  currentPassword: string;
  reasonCode: AdminLifecycleReasonCode;
  notes: string;
  confirmations: string[];
  idempotencyKey: string;
}): AdminLifecycleExecutionEvidence {
  return {
    manifestHash: input.manifest.manifestHash,
    manifestExpiresAt: input.manifest.expiresAt,
    currentPassword: input.currentPassword,
    reasonCode: input.reasonCode,
    notes: input.notes.trim(),
    confirmations: input.confirmations,
    idempotencyKey: input.idempotencyKey,
  };
}

export function canExecuteManifest(input: {
  manifest: AdminLifecycleManifest;
  confirmations: string[];
  notes: string;
  currentPassword: string;
}) {
  return (
    input.manifest.safeToExecute &&
    input.manifest.requiredConfirmations.every((confirmation) =>
      input.confirmations.includes(confirmation),
    ) &&
    input.notes.trim().length >= 5 &&
    input.currentPassword.length > 0
  );
}
