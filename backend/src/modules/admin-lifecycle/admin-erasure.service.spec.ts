import {
  AdminErasureService,
  assertAdminErasureExecution,
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

    expect(result.schemaVersion).toBe(2);
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
});
