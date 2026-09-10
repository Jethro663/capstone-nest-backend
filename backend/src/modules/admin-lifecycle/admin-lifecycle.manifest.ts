import { createHash } from 'node:crypto';
import type {
  AdminLifecycleManifest,
  AdminLifecycleManifestInput,
} from './admin-lifecycle.types';

const MANIFEST_TTL_MS = 5 * 60 * 1000;
const SECRET_FIELDS = new Set(['currentPassword', 'idempotencyKey']);

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
  const stableManifest = {
    schemaVersion: 1 as const,
    ...input,
  };

  const expiresAt = new Date(now.getTime() + MANIFEST_TTL_MS).toISOString();
  const unsigned = {
    ...stableManifest,
    generatedAt: now.toISOString(),
    expiresAt,
    safeToExecute: input.blockers.length === 0,
  };
  return {
    ...unsigned,
    manifestHash: hashAdminLifecycleManifestForExpiry(unsigned, expiresAt),
  };
}
