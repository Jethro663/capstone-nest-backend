import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminLifecycleService } from './admin-lifecycle.service';
import { buildAdminLifecycleManifest } from './admin-lifecycle.manifest';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const actorId = '00000000-0000-4000-8000-000000000401';
const targetId = '00000000-0000-4000-8000-000000000402';
const operationId = '00000000-0000-4000-8000-000000000403';
const idempotencyKey = '00000000-0000-4000-8000-000000000404';

function chain(result: unknown[] = []) {
  return {
    values: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(result),
  };
}

function setup(
  enabled = true,
  demoAllowsGovernedExecutionAvailability = false,
) {
  const operationRows: any[] = [];
  const insertChain = chain([{ id: operationId }]);
  const updateChain = chain([]);
  const db: any = {
    query: {
      users: {
        findFirst: jest.fn().mockResolvedValue({
          id: actorId,
          email: 'admin@example.com',
          firstName: 'Ada',
          lastName: 'Admin',
          password: 'hash',
        }),
      },
      adminLifecycleOperations: {
        findFirst: jest.fn().mockImplementation(() => operationRows[0]),
      },
    },
    insert: jest.fn().mockReturnValue(insertChain),
    update: jest.fn().mockReturnValue(updateChain),
    transaction: jest.fn((work: (tx: any) => unknown) => work(db)),
  };
  const database: any = {
    db,
    academicTransaction: jest.fn((work: () => unknown) => work()),
  };
  const manifest = buildAdminLifecycleManifest({
    action: 'STUDENT_RESOLUTION' as const,
    targetType: 'student',
    targetId,
    request: {},
    academicState: { schoolYear: '2026-2027', period: 'Q3', version: 1 },
    dependencyVersions: [],
    effects: [],
    preserved: [],
    evidence: {},
    blockers: [],
    warnings: [],
    requiredConfirmations: ['PRESERVE_ACADEMIC_HISTORY', 'WITHDRAW'],
  });
  const student: any = {
    prepare: jest.fn().mockResolvedValue({
      manifest,
      plan: { affectedUserIds: [] },
    }),
    apply: jest.fn().mockResolvedValue({
      changed: [],
      preserved: [],
      affectedUserIds: [],
    }),
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-id' }) };
  const service = new AdminLifecycleService(
    database,
    { get: jest.fn().mockReturnValue(enabled) } as any,
    student,
    {} as any,
    {} as any,
    {} as any,
    audit as any,
    { createBulkDeduped: jest.fn().mockResolvedValue([]) } as any,
    {
      resolveForActor: jest.fn().mockResolvedValue({
        allows: jest
          .fn()
          .mockReturnValue(demoAllowsGovernedExecutionAvailability),
        audit: jest.fn().mockReturnValue(
          demoAllowsGovernedExecutionAvailability
            ? {
                demoModeVersion: 9,
                demoModeExpiresAt: '2026-09-12T05:00:00.000Z',
                bypassedRules: ['governed_execution_availability'],
              }
            : undefined,
        ),
      }),
    } as any,
  );
  const dto = {
    studentId: targetId,
    sectionId: '00000000-0000-4000-8000-000000000405',
    resolution: 'WITHDRAW' as const,
    effectivePeriod: 'Q3' as const,
    manifestHash: manifest.manifestHash,
    manifestExpiresAt: manifest.expiresAt,
    currentPassword: 'correct-password',
    reasonCode: 'WITHDREW' as const,
    notes: 'Registrar approved the learner withdrawal.',
    confirmations: [...manifest.requiredConfirmations],
    idempotencyKey,
  };
  return { service, dto, db, database, student, audit, operationRows };
}

describe('AdminLifecycleService execution', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('rejects execution while the operational flag is disabled', async () => {
    const { service, dto, db } = setup(false);
    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('lets active Demo mode satisfy only the lifecycle availability gate', async () => {
    const { service, dto, db, student, audit } = setup(false, true);

    await expect(service.executeStudent(dto, actorId)).resolves.toEqual(
      expect.objectContaining({ action: 'STUDENT_RESOLUTION' }),
    );
    expect(student.prepare).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          demoMode: expect.objectContaining({
            bypassedRules: ['governed_execution_availability'],
          }),
        }),
      }),
    );
  });

  it('still requires the current password after Demo mode opens availability', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const { service, dto, db } = setup(false, true);

    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('still requires exact reviewed confirmations after Demo mode opens availability', async () => {
    const { service, dto, student } = setup(false, true);
    dto.confirmations = [];

    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      'Confirm every reviewed lifecycle effect exactly once',
    );
    expect(student.apply).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password before claiming an operation', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const { service, dto, db } = setup();
    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects a stale manifest and records the operation failure', async () => {
    const { service, dto, student, db } = setup();
    student.prepare.mockResolvedValue({
      manifest: {
        ...student.prepare.mock.results,
        manifestHash: 'b'.repeat(64),
        safeToExecute: true,
        blockers: [],
        requiredConfirmations: dto.confirmations,
      },
      plan: { affectedUserIds: [] },
    });
    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      ConflictException,
    );
    expect(db.update).toHaveBeenCalled();
  });

  it('returns the stored result for an identical completed replay', async () => {
    const { service, dto, operationRows, student } = setup();
    const requestHash = service.executionRequestHash(dto as any);
    operationRows.push({
      id: operationId,
      actorId,
      status: 'completed',
      requestHash,
      result: { operationId, changed: [], preserved: [] },
    });

    const result = await service.executeStudent(dto, actorId);
    expect(result).toEqual(expect.objectContaining({ replayed: true }));
    expect(student.apply).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key reused with a different payload', async () => {
    const { service, dto, operationRows } = setup();
    operationRows.push({
      id: operationId,
      actorId,
      status: 'completed',
      requestHash: 'different-request',
      result: {},
    });

    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      'different lifecycle request',
    );
  });

  it('rejects a fresh in-progress idempotent request', async () => {
    const { service, dto, operationRows } = setup();
    operationRows.push({
      id: operationId,
      actorId,
      status: 'executing',
      requestHash: service.executionRequestHash(dto as any),
      updatedAt: new Date(),
    });

    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      'already executing',
    );
  });

  it('reclaims an abandoned execution lease and increments its attempt', async () => {
    const { service, dto, operationRows, student, db } = setup();
    operationRows.push({
      id: operationId,
      actorId,
      status: 'executing',
      requestHash: service.executionRequestHash(dto as any),
      attemptCount: 1,
      updatedAt: new Date(Date.now() - 11 * 60 * 1000),
    });

    await service.executeStudent(dto, actorId);

    expect(student.apply).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalled();
  });

  it('records failure outside a rolled-back academic mutation', async () => {
    const { service, dto, student, db } = setup();
    student.apply.mockRejectedValue(new Error('event insert failed'));
    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      'event insert failed',
    );
    expect(db.update).toHaveBeenCalled();
  });
});
