import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ExecuteClassLifecycleDto,
  ExecutePurgeBatchDto,
  ExecutePurgeLifecycleDto,
  ExecuteSectionLifecycleDto,
  ExecuteStudentLifecycleDto,
  PreviewClassLifecycleDto,
  PreviewPurgeBatchDto,
  PreviewPurgeLifecycleDto,
  PreviewSectionLifecycleDto,
  PreviewStudentLifecycleDto,
} from './admin-lifecycle.dto';

const ids = {
  student: '00000000-0000-4000-8000-000000000001',
  section: '00000000-0000-4000-8000-000000000002',
  destinationSection: '00000000-0000-4000-8000-000000000003',
  class: '00000000-0000-4000-8000-000000000004',
  destinationClass: '00000000-0000-4000-8000-000000000005',
  idempotency: '00000000-0000-4000-8000-000000000006',
};

const execution = {
  manifestHash: 'a'.repeat(64),
  manifestExpiresAt: '2026-09-11T10:00:00.000Z',
  currentPassword: 'secret-password',
  reasonCode: 'TRANSFERRED_SECTION',
  notes: 'Approved transfer requested by the registrar.',
  confirmations: ['PRESERVE_ACADEMIC_HISTORY'],
  idempotencyKey: ids.idempotency,
};

async function errors<T extends object>(type: new () => T, input: object) {
  return validate(plainToInstance(type, input));
}

describe('admin lifecycle DTOs', () => {
  it('accepts valid student preview and execute payloads', async () => {
    const preview = {
      studentId: ids.student,
      sectionId: ids.section,
      resolution: 'TRANSFER_SECTION',
      destinationSectionId: ids.destinationSection,
      effectivePeriod: 'Q3',
    };

    await expect(errors(PreviewStudentLifecycleDto, preview)).resolves.toEqual(
      [],
    );
    await expect(
      errors(ExecuteStudentLifecycleDto, { ...preview, ...execution }),
    ).resolves.toEqual([]);
  });

  it('rejects malformed student identifiers, resolution, and period', async () => {
    const result = await errors(PreviewStudentLifecycleDto, {
      studentId: 'student',
      sectionId: 'section',
      resolution: 'DELETE',
      effectivePeriod: 'Q5',
    });

    expect(result.map((entry) => entry.property)).toEqual(
      expect.arrayContaining([
        'studentId',
        'sectionId',
        'resolution',
        'effectivePeriod',
      ]),
    );
  });

  it('accepts concrete class, section, and purge previews', async () => {
    await expect(
      errors(PreviewClassLifecycleDto, {
        classId: ids.class,
        resolution: 'TRANSFER',
        replacementClassId: ids.destinationClass,
        effectivePeriod: 'Q3',
      }),
    ).resolves.toEqual([]);

    await expect(
      errors(PreviewSectionLifecycleDto, {
        sectionId: ids.section,
        effectivePeriod: 'Q3',
        studentResolutions: [
          {
            studentId: ids.student,
            resolution: 'TRANSFER_SECTION',
            destinationSectionId: ids.destinationSection,
          },
        ],
      }),
    ).resolves.toEqual([]);

    await expect(
      errors(PreviewPurgeLifecycleDto, {
        targetType: 'USER',
        targetId: ids.student,
      }),
    ).resolves.toEqual([]);
  });

  it('validates every execute payload with the shared execution contract', async () => {
    const payloads: Array<[new () => object, object]> = [
      [
        ExecuteClassLifecycleDto,
        {
          classId: ids.class,
          resolution: 'COMPLETE',
          effectivePeriod: 'Q3',
        },
      ],
      [
        ExecuteSectionLifecycleDto,
        {
          sectionId: ids.section,
          effectivePeriod: 'Q3',
          studentResolutions: [
            { studentId: ids.student, resolution: 'WITHDRAW' },
          ],
        },
      ],
      [
        ExecutePurgeLifecycleDto,
        { targetType: 'SECTION', targetId: ids.section },
      ],
    ];

    for (const [type, payload] of payloads) {
      await expect(errors(type, { ...payload, ...execution })).resolves.toEqual(
        [],
      );
    }
  });

  it('rejects weak or malformed execution evidence', async () => {
    const result = await errors(ExecuteStudentLifecycleDto, {
      studentId: ids.student,
      sectionId: ids.section,
      resolution: 'WITHDRAW',
      effectivePeriod: 'Q3',
      ...execution,
      manifestHash: 'bad',
      manifestExpiresAt: 'tomorrow',
      currentPassword: '',
      reasonCode: 'ANYTHING',
      notes: '',
      confirmations: [],
      idempotencyKey: 'same-request',
    });

    expect(result.map((entry) => entry.property)).toEqual(
      expect.arrayContaining([
        'manifestHash',
        'manifestExpiresAt',
        'currentPassword',
        'reasonCode',
        'notes',
        'confirmations',
        'idempotencyKey',
      ]),
    );
  });

  it('allows an empty outcome list so an empty section can be closed', async () => {
    await expect(
      errors(PreviewSectionLifecycleDto, {
        sectionId: ids.section,
        effectivePeriod: 'Q3',
        studentResolutions: [],
      }),
    ).resolves.toEqual([]);
  });

  it('accepts structurally empty historical retirement requests without current-period outcomes', async () => {
    await expect(
      errors(PreviewClassLifecycleDto, {
        classId: ids.class,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
      }),
    ).resolves.toEqual([]);

    await expect(
      errors(PreviewSectionLifecycleDto, {
        sectionId: ids.section,
        lifecycleMode: 'HISTORICAL_RETIREMENT',
      }),
    ).resolves.toEqual([]);
  });

  it('keeps current closure fields required when lifecycle mode is omitted', async () => {
    const classErrors = await errors(PreviewClassLifecycleDto, {
      classId: ids.class,
    });
    expect(classErrors.map((entry) => entry.property)).toEqual(
      expect.arrayContaining(['resolution', 'effectivePeriod']),
    );

    const sectionErrors = await errors(PreviewSectionLifecycleDto, {
      sectionId: ids.section,
    });
    expect(sectionErrors.map((entry) => entry.property)).toEqual(
      expect.arrayContaining(['effectivePeriod', 'studentResolutions']),
    );
  });

  it('allows Maintenance execution, including purge, to omit a repeated password', async () => {
    const routine = {
      studentId: ids.student,
      sectionId: ids.section,
      resolution: 'WITHDRAW',
      effectivePeriod: 'Q3',
      ...execution,
    };
    delete (routine as { currentPassword?: string }).currentPassword;
    await expect(errors(ExecuteStudentLifecycleDto, routine)).resolves.toEqual(
      [],
    );

    const purge = {
      targetType: 'SECTION',
      targetId: ids.section,
      ...execution,
    };
    delete (purge as { currentPassword?: string }).currentPassword;
    const purgeErrors = await errors(ExecutePurgeLifecycleDto, purge);
    expect(purgeErrors).toEqual([]);
  });

  it('accepts one to fifty unique targets in a cascade-erasure batch', async () => {
    const targetIds = Array.from(
      { length: 33 },
      (_, index) =>
        `00000000-0000-4000-8000-${(index + 100).toString(16).padStart(12, '0')}`,
    );
    const preview = {
      targetType: 'CLASS',
      targetIds,
      purgeMode: 'CASCADE_ERASE',
    };

    await expect(errors(PreviewPurgeBatchDto, preview)).resolves.toEqual([]);
    await expect(
      errors(ExecutePurgeBatchDto, {
        ...preview,
        manifestHash: 'b'.repeat(64),
        manifestExpiresAt: execution.manifestExpiresAt,
        reasonCode: 'OTHER',
        notes: 'Approved permanent removal after reviewing the full batch.',
        confirmation: 'ERASE 33 CLASSES',
        idempotencyKey: ids.idempotency,
      }),
    ).resolves.toEqual([]);
  });

  it('rejects empty, duplicate, and oversized erasure batches', async () => {
    const one = '00000000-0000-4000-8000-000000000100';
    const oversized = Array.from(
      { length: 51 },
      (_, index) =>
        `00000000-0000-4000-8000-${(index + 200).toString(16).padStart(12, '0')}`,
    );

    for (const targetIds of [[], [one, one], oversized]) {
      const result = await errors(PreviewPurgeBatchDto, {
        targetType: 'SECTION',
        targetIds,
        purgeMode: 'CASCADE_ERASE',
      });
      expect(result.map((entry) => entry.property)).toContain('targetIds');
    }
  });
});
