import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  AcademicPolicy,
  PeriodKey,
} from '../academic-state/academic-policy';
import {
  RESET_ACKNOWLEDGEMENTS,
  RESET_CATALOG_VERSION,
} from './system-reset.catalog';

export interface ResetManifestInput {
  actor: { id: string; email: string; displayName: string };
  environment: string;
  schoolYear: string;
  period: PeriodKey;
  policy: AcademicPolicy;
  schemaHash: string;
  counts: Record<string, number>;
  external: Record<string, unknown>;
  epoch: number;
}
export interface ResetPreview extends ResetManifestInput {
  catalogVersion: number;
  generatedAt: string;
  expiresAt: string;
  confirmation: string;
  previewToken: string;
}

const TTL = 5 * 60 * 1000;
function signature(body: string, secret: string) {
  if (secret.length < 32)
    throw new Error(
      'Reset preview signing requires the configured JWT secret.',
    );
  return createHmac('sha256', secret)
    .update(`nexora-system-reset-v1:${body}`)
    .digest();
}

export function buildResetPreview(
  input: ResetManifestInput,
  secret: string,
  now = new Date(),
): ResetPreview {
  const preview = {
    ...input,
    catalogVersion: RESET_CATALOG_VERSION,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TTL).toISOString(),
    confirmation: `RESET ${input.environment} TO ${input.schoolYear} ${input.period}`,
  };
  const body = Buffer.from(JSON.stringify(preview)).toString('base64url');
  return {
    ...preview,
    previewToken: `${body}.${signature(body, secret).toString('base64url')}`,
  };
}

export function verifyResetPreview(
  token: string,
  secret: string,
  actorId: string,
  environment: string,
  now = new Date(),
): ResetPreview {
  try {
    if (token.length > 64000) throw new Error('oversized');
    const parts = token.split('.');
    if (
      parts.length !== 2 ||
      !parts.every((part) => /^[a-zA-Z0-9_-]+$/.test(part))
    )
      throw new Error('format');
    const expected = signature(parts[0], secret);
    const actual = Buffer.from(parts[1], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error('signature');
    const parsed: unknown = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8'),
    );
    if (!parsed || typeof parsed !== 'object') throw new Error('payload');
    const preview = parsed as ResetPreview;
    const issued = Date.parse(preview.generatedAt),
      expires = Date.parse(preview.expiresAt);
    if (
      preview.catalogVersion !== RESET_CATALOG_VERSION ||
      preview.actor.id !== actorId ||
      preview.environment !== environment ||
      !Number.isFinite(issued) ||
      !Number.isFinite(expires) ||
      issued > now.getTime() ||
      expires - issued !== TTL ||
      expires <= now.getTime()
    )
      throw new Error('scope or expiry');
    return { ...preview, previewToken: token };
  } catch {
    throw new ConflictException(
      'Reset preview is invalid or expired. Generate a fresh preview.',
    );
  }
}

export function assertResetConfirmation(
  preview: Pick<ResetPreview, 'confirmation'>,
  request: {
    confirmation: string;
    acknowledgements: readonly string[];
    reason: string;
  },
) {
  if (request.confirmation !== preview.confirmation)
    throw new BadRequestException(
      'Type the exact environment and school-year confirmation.',
    );
  if (request.reason.trim().length < 10 || request.reason.length > 500)
    throw new BadRequestException(
      'Give a reset reason between 10 and 500 characters.',
    );
  if (
    request.acknowledgements.length !== RESET_ACKNOWLEDGEMENTS.length ||
    new Set(request.acknowledgements).size !== RESET_ACKNOWLEDGEMENTS.length ||
    !RESET_ACKNOWLEDGEMENTS.every((ack) =>
      request.acknowledgements.includes(ack),
    )
  )
    throw new BadRequestException('Acknowledge every reset consequence.');
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['currentPassword', 'idempotencyKey'].includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}

export function hashResetRequest(input: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(input)))
    .digest('hex');
}
