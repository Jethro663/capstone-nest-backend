import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ExecuteClassLifecycleDto,
  ExecutePurgeLifecycleDto,
  ExecuteSectionLifecycleDto,
  ExecuteStudentLifecycleDto,
  PreviewClassLifecycleDto,
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
        targetType: 'CLASS',
        targetId: ids.class,
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
});
