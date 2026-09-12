import { RESET_ACKNOWLEDGEMENTS } from './system-reset.catalog';
import { getDefaultAcademicPolicy } from '../academic-state/academic-policy';
import {
  buildResetPreview,
  verifyResetPreview,
  assertResetConfirmation,
  hashResetRequest,
} from './system-reset.manifest';

const secret = 'test-only-reset-signature-key-32-characters';
const clock = new Date('2026-09-12T04:00:00Z');
const manifest = {
  actor: {
    id: 'admin-1',
    email: 'admin@example.invalid',
    displayName: 'Admin',
  },
  environment: 'disposable-test',
  schoolYear: '2026-2027',
  period: 'Q2' as const,
  policy: getDefaultAcademicPolicy('2026-2027'),
  schemaHash: 'schema-hash',
  counts: { users: 12, classes: 5 },
  external: { uploadObjects: 2 },
  epoch: 0,
};

describe('reset signed preview and confirmation', () => {
  it('binds a five-minute preview to its admin, environment, schema and target', () => {
    const preview = buildResetPreview(manifest, secret, clock);
    expect(preview.expiresAt).toBe('2026-09-12T04:05:00.000Z');
    expect(
      verifyResetPreview(
        preview.previewToken,
        secret,
        'admin-1',
        'disposable-test',
        clock,
      ),
    ).toMatchObject(manifest);
    expect(preview.confirmation).toBe('RESET disposable-test TO 2026-2027 Q2');
  });
  it('rejects tampered, expired, foreign-admin and foreign-environment previews', () => {
    const preview = buildResetPreview(manifest, secret, clock);
    const [body, signature] = preview.previewToken.split('.');
    const changed = {
      ...JSON.parse(Buffer.from(body, 'base64url').toString()),
      counts: { users: 1 },
    };
    expect(() =>
      verifyResetPreview(
        `${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${signature}`,
        secret,
        'admin-1',
        'disposable-test',
        clock,
      ),
    ).toThrow();
    expect(() =>
      verifyResetPreview(
        preview.previewToken,
        secret,
        'other-admin',
        'disposable-test',
        clock,
      ),
    ).toThrow();
    expect(() =>
      verifyResetPreview(
        preview.previewToken,
        secret,
        'admin-1',
        'production',
        clock,
      ),
    ).toThrow();
    expect(() =>
      verifyResetPreview(
        preview.previewToken,
        secret,
        'admin-1',
        'disposable-test',
        new Date('2026-09-12T04:05:00Z'),
      ),
    ).toThrow('expired');
  });
  it('requires the exact phrase, every acknowledgement and a substantive reason', () => {
    const preview = buildResetPreview(manifest, secret, clock);
    const valid = {
      confirmation: preview.confirmation,
      acknowledgements: [...RESET_ACKNOWLEDGEMENTS],
      reason: 'Start a new local testing run',
    };
    expect(() => assertResetConfirmation(preview, valid)).not.toThrow();
    expect(() =>
      assertResetConfirmation(preview, { ...valid, confirmation: 'RESET' }),
    ).toThrow();
    expect(() =>
      assertResetConfirmation(preview, {
        ...valid,
        acknowledgements: valid.acknowledgements.slice(1),
      }),
    ).toThrow();
    expect(() =>
      assertResetConfirmation(preview, {
        ...valid,
        acknowledgements: [
          ...valid.acknowledgements,
          valid.acknowledgements[0],
        ],
      }),
    ).toThrow();
    expect(() =>
      assertResetConfirmation(preview, { ...valid, reason: '          ' }),
    ).toThrow();
  });
  it('hashes the request without password material while preserving target changes', () => {
    const request = {
      schoolYear: '2026-2027',
      period: 'Q2',
      reason: 'Testing reset',
      acknowledgements: [...RESET_ACKNOWLEDGEMENTS],
    };
    expect(
      hashResetRequest({
        ...request,
        currentPassword: 'one',
        idempotencyKey: 'key-one',
      }),
    ).toBe(
      hashResetRequest({
        ...request,
        currentPassword: 'two',
        idempotencyKey: 'key-two',
      }),
    );
    expect(hashResetRequest(request)).not.toBe(
      hashResetRequest({ ...request, period: 'Q3' }),
    );
  });
});
