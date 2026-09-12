import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { RESET_ACKNOWLEDGEMENTS } from './system-reset.catalog';
import { ResetExecuteDto, ResetPreviewDto } from './system-reset.dto';

describe('reset request validation', () => {
  const valid = {
    previewToken: 'signed-preview-token',
    idempotencyKey: randomUUID(),
    reason: 'Start a new test run',
    currentPassword: 'current-secret',
    confirmation: 'RESET local TO 2026-2027 Q2',
    acknowledgements: [...RESET_ACKNOWLEDGEMENTS],
  };
  const errors = (input: Record<string, unknown>) =>
    validate(plainToInstance(ResetExecuteDto, input), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  it('accepts a valid execute contract', async () => {
    expect(await errors(valid)).toEqual([]);
  });
  it.each(['force', 'preserveUserId', 'tables', 'sql', 'storagePrefix'])(
    'rejects client-controlled scope %s',
    async (field) => {
      expect(
        (await errors({ ...valid, [field]: 'untrusted' })).some(
          (error) => error.property === field,
        ),
      ).toBe(true);
    },
  );
  it.each([
    'currentPassword',
    'previewToken',
    'idempotencyKey',
    'confirmation',
    'reason',
    'acknowledgements',
  ])('requires %s', async (field) => {
    const request: Record<string, unknown> = { ...valid };
    delete request[field];
    expect(
      (await errors(request)).some((error) => error.property === field),
    ).toBe(true);
  });
  it('limits the target to backend period keys and shaped school years', async () => {
    const invalid = await validate(
      plainToInstance(ResetPreviewDto, {
        schoolYear: 'reset-all',
        period: 'Q5',
      }),
    );
    expect(invalid.map((error) => error.property).sort()).toEqual([
      'period',
      'schoolYear',
    ]);
  });
});
