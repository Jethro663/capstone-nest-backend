import { createHash } from 'node:crypto';
import type {
  AdminLifecycleManifest,
  AdminLifecycleManifestInput,
  AdminMaintenanceDecisionSummary,
  AdminMaintenanceNextAction,
} from './admin-lifecycle.types';

const MANIFEST_TTL_MS = 5 * 60 * 1000;
const SECRET_FIELDS = new Set(['currentPassword', 'idempotencyKey']);
const OVERRIDABLE_WARNING_CODES = new Set([
  'SECTION_CAPACITY',
  'SCHEDULE_COLLISION',
  'ROOM_ADVISER_EXCLUSIVITY',
  'ADMIN_ACADEMIC_WINDOW',
  'DATA_WILL_BE_ERASED',
]);

const actionMetadata: Record<string, Omit<AdminMaintenanceNextAction, 'id'>> = {
  WITHDRAW: {
    label: 'Withdraw learner and preserve history',
    kind: 'REPREVIEW',
    intent: 'WITHDRAW',
  },
  TRANSFER_SECTION: {
    label: 'Move learner to another section',
    kind: 'REPREVIEW',
    intent: 'TRANSFER_SECTION',
    requiredFields: ['destinationSectionId'],
  },
  TRANSFER_CLASS: {
    label: 'Move learner to another class',
    kind: 'REPREVIEW',
    intent: 'TRANSFER_CLASS',
    requiredFields: ['destinationClassId'],
  },
  COMPLETE: {
    label: 'Complete active memberships',
    kind: 'REPREVIEW',
    intent: 'COMPLETE',
  },
  DROP: {
    label: 'Drop active memberships',
    kind: 'REPREVIEW',
    intent: 'DROP',
  },
  TRANSFER: {
    label: 'Transfer active memberships',
    kind: 'REPREVIEW',
    intent: 'TRANSFER',
    requiredFields: ['replacementClassId'],
  },
  USE_ACADEMIC_TRANSITION: {
    label: 'Open academic year transition',
    kind: 'NAVIGATE_REPAIR',
    href: '/dashboard/admin/system-settings/year-transition',
  },
  ACADEMIC_REPAIR: {
    label: 'Open audit and recovery',
    kind: 'NAVIGATE_REPAIR',
    href: '/dashboard/admin/system-settings/audit-recovery',
  },
  OPEN_MAINTENANCE_ACCESS: {
    label: 'Turn on Maintenance Access',
    kind: 'NAVIGATE_REPAIR',
    href: '/dashboard/admin/system-settings/maintenance-access',
  },
  KEEP_RECORD: {
    label: 'Keep this record',
    kind: 'CANCEL',
  },
};

function nextActions(
  input: AdminLifecycleManifestInput,
): AdminMaintenanceNextAction[] {
  const options = input.blockers.flatMap(
    (blocker) => blocker.resolutionOptions ?? [],
  );
  return [...new Set(options)].map((id) => ({
    id,
    ...(actionMetadata[id] ?? {
      label: id
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      kind: 'REPREVIEW' as const,
      intent: id,
    }),
  }));
}

export function deriveAdminMaintenanceDecision(
  input: AdminLifecycleManifestInput,
): AdminMaintenanceDecisionSummary {
  const actions = nextActions(input);
  const immutable = input.blockers.find((blocker) => !blocker.resolvable);
  if (immutable) {
    const retained = input.blockers.find(
      (blocker) => blocker.code === 'RETAINED_EVIDENCE',
    );
    const primary = retained ?? immutable;
    return {
      state: 'IMMUTABLE',
      disposition: retained ? 'RETAIN_REQUIRED' : 'REPAIR_REQUIRED',
      code: primary.code,
      message: primary.message,
      nextActions: actions,
    };
  }
  if (input.blockers.length > 0) {
    return {
      state: 'NEEDS_CHOICE',
      disposition: 'CHOICE_REQUIRED',
      code: input.blockers[0].code,
      message: input.blockers[0].message,
      nextActions: actions,
    };
  }
  const overridable = input.warnings.find((warning) =>
    OVERRIDABLE_WARNING_CODES.has(warning.code),
  );
  if (overridable) {
    return {
      state: 'OVERRIDABLE_WARNING',
      disposition: 'EXECUTABLE',
      code: overridable.code,
      message: overridable.message,
      nextActions: [],
    };
  }
  if (input.effects.length > 1) {
    return {
      state: 'AUTO_RESOLVABLE',
      disposition: 'EXECUTABLE',
      code: 'DEPENDENCIES_AUTO_RESOLVED',
      message: 'Linked academic structure will be reconciled automatically.',
      nextActions: [],
    };
  }
  return {
    state: 'READY',
    disposition: 'EXECUTABLE',
    code: 'READY',
    message: 'This maintenance action is ready to execute.',
    nextActions: [],
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((entry) => canonicalize(entry))
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SECRET_FIELDS.has(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

export function hashAdminLifecycleManifestForExpiry(
  manifest: Omit<AdminLifecycleManifest, 'manifestHash'>,
  expiresAt: string,
): string {
  const {
    generatedAt: _generatedAt,
    expiresAt: _currentExpiry,
    safeToExecute: _safeToExecute,
    ...stableManifest
  } = manifest;
  return sha256({ ...stableManifest, expiresAt });
}

export function hashAdminLifecycleRequest(
  request: Record<string, unknown>,
): string {
  return sha256(request);
}

export function buildAdminLifecycleManifest(
  input: AdminLifecycleManifestInput,
  now = new Date(),
): AdminLifecycleManifest {
  const cascadeErase = input.request.purgeMode === 'CASCADE_ERASE';
  const retainedEvidence = cascadeErase
    ? input.blockers.find((blocker) => blocker.code === 'RETAINED_EVIDENCE')
    : undefined;
  const effectiveInput: AdminLifecycleManifestInput = retainedEvidence
    ? {
        ...input,
        blockers: input.blockers.filter(
          (blocker) => blocker.code !== 'RETAINED_EVIDENCE',
        ),
        warnings: [
          ...input.warnings,
          {
            code: 'DATA_WILL_BE_ERASED',
            message:
              'Cascade erasure will permanently delete the retained academic and lifecycle evidence listed in this preview.',
          },
        ],
      }
    : input;
  const stableManifest = {
    schemaVersion: 1 as const,
    ...effectiveInput,
    decision: deriveAdminMaintenanceDecision(effectiveInput),
  };

  const expiresAt = new Date(now.getTime() + MANIFEST_TTL_MS).toISOString();
  const unsigned = {
    ...stableManifest,
    generatedAt: now.toISOString(),
    expiresAt,
    safeToExecute: effectiveInput.blockers.length === 0,
  };
  return {
    ...unsigned,
    manifestHash: hashAdminLifecycleManifestForExpiry(unsigned, expiresAt),
  };
}
