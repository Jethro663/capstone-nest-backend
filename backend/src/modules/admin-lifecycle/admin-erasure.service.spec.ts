import { ConflictException, HttpException } from '@nestjs/common';
import {
  AdminErasureService,
  assertAdminErasureExecution,
  normalizeAdminErasureFailure,
} from './admin-erasure.service';

const uuid = (suffix: string) =>
  `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

describe('AdminErasureService', () => {
  const databaseSchemaRows = [
    {
      table: 'academic_period_grade_revisions',
      column: 'class_id',
      targetTable: 'classes',
      onDelete: 'NO ACTION',
      definition:
        'FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE NO ACTION',
    },
  ];

  it('previews the complete normalized batch with one confirmation', async () => {
    const db = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ rows: databaseSchemaRows })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const purge = {
      prepare: jest.fn(async (input: { targetId: string }) => ({
        snapshot: {
          targetType: 'CLASS',
          targetId: input.targetId,
          targetName: `Class ${input.targetId.slice(-1)}`,
          isActive: false,
          version: '2026-09-14T00:00:00.000Z',
          evidence: { lessons: 2, assessments: 1 },
        },
        manifest: {
          blockers: [],
          warnings: [
            {
              code: 'DATA_WILL_BE_ERASED',
              message: 'Evidence will be erased.',
            },
          ],
        },
      })),
    };
    const service = new AdminErasureService(
      { db } as never,
      { get: jest.fn().mockReturnValue(true) } as never,
      purge as never,
    );

    const result = await service.prepare(
      {
        targetType: 'CLASS',
        targetIds: [uuid('2'), uuid('1')],
        purgeMode: 'CASCADE_ERASE',
      },
      uuid('9'),
    );

    expect(result.schemaVersion).toBe(3);
    expect(result.targetIds).toEqual([uuid('1'), uuid('2')]);
    expect(result.targets).toHaveLength(2);
    expect(result.totals).toMatchObject({ lessons: 4, assessments: 2 });
    expect(result.confirmationText).toBe('ERASE 2 CLASSES');
    expect(result.canExecute).toBe(true);
    expect(result.catalogVersion).toBeGreaterThan(0);
    expect(result.databaseSchemaHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails closed when the live schema contains an unreviewed restrictive path', async () => {
    const db = {
      execute: jest.fn().mockResolvedValue({
        rows: [
          ...databaseSchemaRows,
          {
            table: 'new_history',
            column: 'class_id',
            targetTable: 'classes',
            onDelete: 'RESTRICT',
            definition: 'FOREIGN KEY (class_id) REFERENCES classes(id)',
          },
        ],
      }),
    };
    const service = new AdminErasureService(
      { db } as never,
      { get: jest.fn().mockReturnValue(true) } as never,
      {
        prepare: jest.fn(async (input: { targetId: string }) => ({
          snapshot: {
            targetType: 'CLASS',
            targetId: input.targetId,
            targetName: 'Archived class',
            isActive: false,
            version: 'v1',
            evidence: {},
          },
          manifest: { blockers: [], warnings: [] },
        })),
      } as never,
    );

    const result = await service.prepare(
      {
        targetType: 'CLASS',
        targetIds: [uuid('1')],
        purgeMode: 'CASCADE_ERASE',
      },
      uuid('9'),
    );

    expect(result.canExecute).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'UNCLASSIFIED_DEPENDENCY' }),
      ]),
    );
  });

  it('keeps same-code lifecycle blockers attached to every responsible target', async () => {
    const db = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ rows: databaseSchemaRows })
        .mockResolvedValueOnce({ rows: [] }),
    };
    const purge = {
      prepare: jest.fn((input: { targetId: string }) => ({
        snapshot: {
          targetType: 'CLASS',
          targetId: input.targetId,
          targetName: `Blocked ${input.targetId.slice(-1)}`,
          isActive: true,
          version: 'v1',
          evidence: {},
        },
        manifest: {
          blockers: [
            {
              code: 'TARGET_NOT_ARCHIVED',
              message: `Archive ${input.targetId} first.`,
              resolvable: false,
            },
          ],
          warnings: [],
        },
      })),
    };
    const service = new AdminErasureService(
      { db } as never,
      { get: jest.fn().mockReturnValue(true) } as never,
      purge as never,
    );

    const result = await service.prepare(
      {
        targetType: 'CLASS',
        targetIds: [uuid('1'), uuid('2')],
        purgeMode: 'CASCADE_ERASE',
      },
      uuid('9'),
    );

    expect(result.globalBlockers).toEqual([]);
    expect(result.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: uuid('1'),
          canExecute: false,
          blockers: [
            expect.objectContaining({
              code: 'TARGET_NOT_ARCHIVED',
              message: expect.stringContaining(uuid('1')),
            }),
          ],
        }),
        expect.objectContaining({
          id: uuid('2'),
          canExecute: false,
          blockers: [
            expect.objectContaining({
              code: 'TARGET_NOT_ARCHIVED',
              message: expect.stringContaining(uuid('2')),
            }),
          ],
        }),
      ]),
    );
    expect(result.blockers).toHaveLength(1);
  });

  it('requires the exact reviewed manifest and one exact confirmation', () => {
    const preview = {
      canExecute: true,
      blockers: [],
      manifestHash: 'reviewed-hash',
      manifestExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      confirmationText: 'ERASE 2 CLASSES',
    } as never;

    expect(() =>
      assertAdminErasureExecution(
        {
          manifestHash: 'reviewed-hash',
          manifestExpiresAt: preview.manifestExpiresAt,
          confirmation: 'ERASE 2 CLASSES',
        },
        preview,
      ),
    ).not.toThrow();
    expect(() =>
      assertAdminErasureExecution(
        {
          manifestHash: 'reviewed-hash',
          manifestExpiresAt: preview.manifestExpiresAt,
          confirmation: 'ERASE 1 CLASS',
        },
        preview,
      ),
    ).toThrow('confirmation');
  });

  it('shows the last-active-admin boundary during preview', async () => {
    const db = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ rows: databaseSchemaRows })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ target_admin_count: '1', active_admin_count: '1' }],
        }),
    };
    const service = new AdminErasureService(
      { db } as never,
      { get: jest.fn().mockReturnValue(true) } as never,
      {
        prepare: jest.fn(async (input: { targetId: string }) => ({
          snapshot: {
            targetType: 'USER',
            targetId: input.targetId,
            targetName: 'Last Admin',
            isActive: false,
            version: '2026-09-14T00:00:00.000Z',
            evidence: {},
          },
          manifest: { blockers: [], warnings: [] },
        })),
      } as never,
    );

    const result = await service.prepare(
      {
        targetType: 'USER',
        targetIds: [uuid('7')],
        purgeMode: 'CASCADE_ERASE',
      },
      uuid('9'),
    );

    expect(result.canExecute).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'LAST_ADMIN_ERASURE_FORBIDDEN' }),
      ]),
    );
  });

  it('reduces nested database failures to safe operation diagnostics', () => {
    const databaseError = Object.assign(
      new Error('violates foreign key constraint'),
      {
        code: '23503',
        constraint: 'academic_legacy_grade_evidence_class_record_id_fk',
        table: 'academic_legacy_grade_evidence',
      },
    );
    const drizzleError = Object.assign(
      new Error(
        'Failed query: DELETE FROM classes WHERE id = $1; params: secret-id',
      ),
      { cause: databaseError },
    );

    const normalized = normalizeAdminErasureFailure(drizzleError, uuid('501'));

    expect(normalized.record).toEqual({
      failureCode: 'ERASURE_EXECUTION_FAILED',
      failureMessage: JSON.stringify({
        operationId: uuid('501'),
        code: 'ERASURE_EXECUTION_FAILED',
        databaseCode: '23503',
        constraint: 'academic_legacy_grade_evidence_class_record_id_fk',
        table: 'academic_legacy_grade_evidence',
      }),
    });
    expect(normalized.exception).toBeInstanceOf(HttpException);
    expect(normalized.exception.getStatus()).toBe(500);
    expect(normalized.exception.getResponse()).toEqual({
      operationId: uuid('501'),
      code: 'ERASURE_EXECUTION_FAILED',
      message: 'Permanent deletion failed. Use the operation ID for support.',
    });
    expect(JSON.stringify(normalized)).not.toContain('secret-id');
    expect(JSON.stringify(normalized)).not.toContain('DELETE FROM');
  });

  it('records and rethrows existing HTTP failures without replacing them', () => {
    const error = new ConflictException({
      code: 'ERASURE_MANIFEST_STALE',
      message: 'Review the current impact again.',
    });

    const normalized = normalizeAdminErasureFailure(error, uuid('502'));

    expect(normalized.exception).toBe(error);
    expect(normalized.record).toEqual({
      failureCode: 'ERASURE_MANIFEST_STALE',
      failureMessage: JSON.stringify({
        operationId: uuid('502'),
        code: 'ERASURE_MANIFEST_STALE',
      }),
    });
  });
});
