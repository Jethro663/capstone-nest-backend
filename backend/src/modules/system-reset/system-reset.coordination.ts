import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { RESET_CATALOG } from './system-reset.catalog';

export function assertResetParticipants(
  required: string[],
  rows: Array<{ id: string; cache_epoch: number; retired?: boolean }>,
  epoch: number,
) {
  if (
    required.some(
      (id) =>
        !rows.some(
          (row) =>
            row.id === id &&
            (row.cache_epoch === epoch || row.retired === true),
        ),
    ) ||
    rows.some((row) => row.cache_epoch !== epoch && row.retired !== true)
  )
    throw new ServiceUnavailableException(
      'Waiting for all reset participants to drain and acknowledge the cache epoch.',
    );
}

export function resetContentCounts(counts: Record<string, number>) {
  const operational = new Set([
    'refresh_tokens',
    'otp_verifications',
    'password_reset_tokens',
  ]);
  return Object.fromEntries(
    Object.entries(counts).filter(
      ([name]) =>
        RESET_CATALOG[name]?.action !== 'preserve' && !operational.has(name),
    ),
  );
}

export function resetPublicStatus(row?: {
  active: boolean;
  operation_id: string | null;
  phase: string | null;
  failure_code: string | null;
}) {
  return {
    active: !!row?.active,
    operationId: row?.operation_id ?? null,
    phase: row?.phase ?? null,
    status: row?.active
      ? 'running'
      : row?.phase === 'complete'
        ? 'completed'
        : row?.phase === 'aborted'
          ? 'aborted'
          : 'idle',
    retrying: !!row?.active && !!row?.failure_code,
  };
}

export function resetRetryMatches(
  operation: { actor_id: string; request_hash: string } | undefined,
  actorId: string,
  hash: string,
) {
  if (!operation) return false;
  if (operation.actor_id !== actorId || operation.request_hash !== hash)
    throw new ConflictException(
      'This reset request identifier belongs to a different request.',
    );
  return true;
}
