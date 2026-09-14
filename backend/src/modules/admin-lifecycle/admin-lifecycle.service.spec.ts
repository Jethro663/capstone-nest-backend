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
  maintenanceAllowsGovernedExecutionAvailability = false,
  maintenanceActive = maintenanceAllowsGovernedExecutionAvailability,
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
  const classLifecycle: any = {
    prepare: jest.fn().mockImplementation((request: Record<string, unknown>) =>
      Promise.resolve({
        manifest: { ...manifest, request },
        plan: { affectedUserIds: [] },
      }),
    ),
    apply: jest.fn().mockResolvedValue({
      changed: [],
      preserved: [],
      affectedUserIds: [],
    }),
  };
  const sectionLifecycle: any = {
    prepare: jest.fn().mockImplementation((request: Record<string, unknown>) =>
      Promise.resolve({
        manifest: { ...manifest, request },
        plan: { affectedUserIds: [] },
      }),
    ),
  };
  const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-id' }) };
  const maintenanceContext = {
    active: maintenanceActive,
    sessionId: maintenanceActive
      ? '00000000-0000-4000-8000-000000000499'
      : null,
    allows: jest
      .fn()
      .mockReturnValue(maintenanceAllowsGovernedExecutionAvailability),
    audit: jest.fn().mockReturnValue(
      maintenanceAllowsGovernedExecutionAvailability
        ? {
            maintenanceSessionId: '00000000-0000-4000-8000-000000000499',
            maintenanceExpiresAt: '2026-09-12T05:00:00.000Z',
            maintenanceRuleCodes: ['governed_execution_availability'],
          }
        : undefined,
    ),
  };
  const maintenance = {
    resolveForActor: jest.fn().mockResolvedValue(maintenanceContext),
    requireActiveSession: jest.fn().mockResolvedValue(maintenanceContext),
  };
  const adminErasure = {
    prepare: jest.fn().mockResolvedValue({ canExecute: true }),
    execute: jest.fn().mockResolvedValue({
      operationId,
      status: 'completed',
      targetType: 'CLASS',
      targetIds: [targetId],
      deletedCount: 1,
      cleanupStatus: 'not_required',
      replayed: false,
    }),
    retryCleanup: jest.fn(),
    getOperation: jest.fn().mockResolvedValue({ targetType: 'CLASS' }),
  };
  const notifications = {
    createBulkDeduped: jest.fn().mockResolvedValue([]),
    hideArchivedTeacherContext: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AdminLifecycleService(
    database,
    { get: jest.fn().mockReturnValue(enabled) } as any,
    student,
    classLifecycle,
    sectionLifecycle,
    {} as any,
    audit as any,
    notifications as any,
    maintenance as any,
    adminErasure as any,
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
  return {
    service,
    dto,
    db,
    database,
    student,
    classLifecycle,
    sectionLifecycle,
    audit,
    operationRows,
    maintenance,
    maintenanceContext,
    adminErasure,
    notifications,
  };
}

describe('AdminLifecycleService execution', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('normalizes lifecycle mode and empty historical section outcomes before preview hashing', async () => {
    const { service, classLifecycle, sectionLifecycle } = setup();

    await service.previewClass({
      classId: targetId,
      resolution: 'COMPLETE',
      effectivePeriod: 'Q3',
    });
    expect(classLifecycle.prepare).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycleMode: 'CURRENT_CLOSURE' }),
      expect.anything(),
    );

    await service.previewSection({
      sectionId: targetId,
      lifecycleMode: 'HISTORICAL_RETIREMENT',
    });
    expect(sectionLifecycle.prepare).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleMode: 'HISTORICAL_RETIREMENT',
        studentResolutions: [],
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('binds historical mode to the request hash and audit evidence', async () => {
    const { service, classLifecycle, audit, notifications } = setup();
    const preview = {
      classId: targetId,
      lifecycleMode: 'HISTORICAL_RETIREMENT' as const,
      resolution: 'COMPLETE' as const,
      replacementClassId: undefined,
      effectivePeriod: 'Q4' as const,
    };
    const manifest = buildAdminLifecycleManifest({
      action: 'ARCHIVE_CLASS',
      targetType: 'class',
      targetId,
      request: preview,
      academicState: { schoolYear: '2026-2027', period: 'Q3', version: 1 },
      dependencyVersions: [],
      effects: [
        {
          kind: 'archive',
          entityType: 'class',
          entityId: targetId,
          summary: 'Retire historical class',
        },
      ],
      preserved: ['Academic evidence'],
      evidence: {},
      blockers: [],
      warnings: [],
      requiredConfirmations: [
        'PRESERVE_ACADEMIC_HISTORY',
        'HISTORICAL_RETIREMENT',
        'COMPLETE',
      ],
    });
    classLifecycle.prepare.mockResolvedValue({
      manifest,
      plan: { affectedUserIds: [] },
    });
    const learnerId = '00000000-0000-4000-8000-000000000471';
    const teacherId = '00000000-0000-4000-8000-000000000472';
    classLifecycle.apply.mockResolvedValueOnce({
      changed: [],
      preserved: ['Academic evidence'],
      affectedUserIds: [learnerId, teacherId],
      notificationUserIds: [learnerId],
      notificationRetirement: {
        userIds: [teacherId],
        classIds: [targetId],
        sectionIds: [],
      },
    });
    const dto = {
      ...preview,
      manifestHash: manifest.manifestHash,
      manifestExpiresAt: manifest.expiresAt,
      currentPassword: 'correct-password',
      reasonCode: 'COMPLETED' as const,
      notes: 'Registrar verified the historical completion.',
      confirmations: [...manifest.requiredConfirmations],
      idempotencyKey,
    };

    expect(
      service.executionRequestHash({
        ...dto,
        lifecycleMode: 'CURRENT_CLOSURE',
      }),
    ).not.toBe(service.executionRequestHash(dto));
    await service.executeClass(dto, actorId);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          lifecycleMode: 'HISTORICAL_RETIREMENT',
        }),
      }),
    );
    expect(notifications.hideArchivedTeacherContext).toHaveBeenCalledWith({
      userIds: [teacherId],
      classIds: [targetId],
      sectionIds: [],
    });
    expect(notifications.createBulkDeduped).toHaveBeenCalledWith([
      expect.objectContaining({ userId: learnerId }),
    ]);
  });

  it('rejects a historical class execution when the re-preview resolves a different lifecycle mode', async () => {
    const { service, classLifecycle } = setup();
    const historicalRequest = {
      classId: targetId,
      lifecycleMode: 'HISTORICAL_RETIREMENT' as const,
      resolution: 'COMPLETE' as const,
      replacementClassId: undefined,
      effectivePeriod: 'Q4' as const,
    };
    const reviewed = buildAdminLifecycleManifest({
      action: 'ARCHIVE_CLASS',
      targetType: 'class',
      targetId,
      request: historicalRequest,
      academicState: { schoolYear: '2026-2027', period: 'Q3', version: 1 },
      dependencyVersions: [],
      effects: [],
      preserved: ['Academic evidence'],
      evidence: {},
      blockers: [],
      warnings: [],
      requiredConfirmations: [
        'PRESERVE_ACADEMIC_HISTORY',
        'HISTORICAL_RETIREMENT',
        'COMPLETE',
      ],
    });
    const changedMode = buildAdminLifecycleManifest({
      ...reviewed,
      request: {
        ...historicalRequest,
        lifecycleMode: 'CURRENT_CLOSURE',
      },
    });
    classLifecycle.prepare.mockResolvedValue({
      manifest: changedMode,
      plan: { affectedUserIds: [] },
    });

    await expect(
      service.executeClass(
        {
          ...historicalRequest,
          manifestHash: reviewed.manifestHash,
          manifestExpiresAt: reviewed.expiresAt,
          currentPassword: 'correct-password',
          reasonCode: 'COMPLETED',
          notes: 'Registrar verified the historical completion.',
          confirmations: [...reviewed.requiredConfirmations],
          idempotencyKey,
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
    expect(classLifecycle.apply).not.toHaveBeenCalled();
  });

  it('rejects execution when participant effects change after class preview', async () => {
    const { service, classLifecycle } = setup();
    const request = {
      classId: targetId,
      lifecycleMode: 'HISTORICAL_RETIREMENT' as const,
      resolution: 'DROP' as const,
      replacementClassId: undefined,
      effectivePeriod: 'Q4' as const,
    };
    const reviewed = buildAdminLifecycleManifest({
      action: 'ARCHIVE_CLASS',
      targetType: 'class',
      targetId,
      request,
      academicState: { schoolYear: '2026-2027', period: 'Q3', version: 1 },
      dependencyVersions: [],
      effects: [],
      preserved: ['Academic evidence'],
      evidence: {},
      blockers: [],
      warnings: [],
      requiredConfirmations: [
        'PRESERVE_ACADEMIC_HISTORY',
        'HISTORICAL_RETIREMENT',
        'DROP',
      ],
    });
    const participantChanged = buildAdminLifecycleManifest({
      ...reviewed,
      effects: [
        {
          kind: 'update',
          entityType: 'class_record_participant',
          entityId: '00000000-0000-4000-8000-000000000498',
          summary: 'Record draft participant eligibility as withdrawn',
        },
      ],
    });
    classLifecycle.prepare.mockResolvedValue({
      manifest: participantChanged,
      plan: { affectedUserIds: [] },
    });

    await expect(
      service.executeClass(
        {
          ...request,
          manifestHash: reviewed.manifestHash,
          manifestExpiresAt: reviewed.expiresAt,
          currentPassword: 'correct-password',
          reasonCode: 'WITHDREW',
          notes: 'Registrar verified the historical withdrawal.',
          confirmations: [...reviewed.requiredConfirmations],
          idempotencyKey,
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
    expect(classLifecycle.apply).not.toHaveBeenCalled();
  });

  it('returns the stored result for an identical completed historical-class replay', async () => {
    const { service, classLifecycle, operationRows } = setup();
    const request = {
      classId: targetId,
      lifecycleMode: 'HISTORICAL_RETIREMENT' as const,
      resolution: 'COMPLETE' as const,
      replacementClassId: undefined,
      effectivePeriod: 'Q4' as const,
      manifestHash: 'a'.repeat(64),
      manifestExpiresAt: new Date(Date.now() + 300_000).toISOString(),
      currentPassword: 'correct-password',
      reasonCode: 'COMPLETED' as const,
      notes: 'Registrar verified the historical completion.',
      confirmations: [
        'PRESERVE_ACADEMIC_HISTORY',
        'HISTORICAL_RETIREMENT',
        'COMPLETE',
      ],
      idempotencyKey,
    };
    operationRows.push({
      id: operationId,
      actorId,
      status: 'completed',
      requestHash: service.executionRequestHash(request),
      result: { operationId, changed: [], preserved: ['Academic evidence'] },
    });

    await expect(service.executeClass(request, actorId)).resolves.toEqual(
      expect.objectContaining({ replayed: true }),
    );
    expect(classLifecycle.prepare).not.toHaveBeenCalled();
    expect(classLifecycle.apply).not.toHaveBeenCalled();
  });

  it('rejects execution while the operational flag is disabled', async () => {
    const { service, dto, db } = setup(false);
    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('lets active Maintenance Access satisfy only the lifecycle availability gate', async () => {
    const { service, dto, db, student, audit } = setup(false, true);

    await expect(service.executeStudent(dto, actorId)).resolves.toEqual(
      expect.objectContaining({ action: 'STUDENT_RESOLUTION' }),
    );
    expect(student.prepare).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          maintenanceAccess: expect.objectContaining({
            maintenanceRuleCodes: ['governed_execution_availability'],
          }),
        }),
      }),
    );
  });

  it('requires the current password when Maintenance Access is inactive', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const { service, dto, db } = setup(true, false, false);

    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      ForbiddenException,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('still requires exact reviewed confirmations after Maintenance Access opens availability', async () => {
    const { service, dto, student } = setup(false, true);
    dto.confirmations = [];

    await expect(service.executeStudent(dto, actorId)).rejects.toThrow(
      'Confirm every reviewed lifecycle effect exactly once',
    );
    expect(student.apply).not.toHaveBeenCalled();
  });

  it('does not repeat password verification for routine execution in an active maintenance session', async () => {
    const { service, dto, audit } = setup(true, true, true);
    dto.currentPassword = undefined as never;

    await expect(service.executeStudent(dto, actorId)).resolves.toEqual(
      expect.objectContaining({ action: 'STUDENT_RESOLUTION' }),
    );
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          maintenanceAccess: expect.objectContaining({
            maintenanceSessionId: '00000000-0000-4000-8000-000000000499',
          }),
        }),
      }),
    );
  });

  it('requires the same active maintenance session immediately before mutation', async () => {
    const { service, dto, student, maintenance, maintenanceContext, db } =
      setup(true, true, true);
    maintenance.requireActiveSession
      .mockResolvedValueOnce(maintenanceContext)
      .mockRejectedValueOnce(
        new ForbiddenException({ code: 'MAINTENANCE_SESSION_REQUIRED' }),
      );

    await expect(
      service.executeStudent(dto, actorId, { requireMaintenance: true }),
    ).rejects.toThrow(ForbiddenException);
    expect(maintenance.requireActiveSession).toHaveBeenCalledTimes(2);
    expect(student.apply).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
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

  it('uses active Maintenance Access without requesting the password again for a batch erase', async () => {
    const { service, adminErasure } = setup(true, true, true);
    const dto = {
      targetType: 'CLASS' as const,
      targetIds: [targetId],
      purgeMode: 'CASCADE_ERASE' as const,
      manifestHash: 'a'.repeat(64),
      manifestExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      reasonCode: 'OTHER' as const,
      notes: 'Approved batch erasure.',
      confirmation: 'ERASE 1 CLASS',
      idempotencyKey,
    };

    await service.executePurgeBatch(dto, actorId);

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(adminErasure.execute).toHaveBeenCalledWith(
      dto,
      actorId,
      expect.objectContaining({ userId: actorId }),
    );
  });

  it('requires the matching Maintenance Access scope to retry erasure cleanup', async () => {
    const allowed = setup(true, true, true);
    await allowed.service.retryErasureCleanup(operationId, actorId);
    expect(allowed.adminErasure.retryCleanup).toHaveBeenCalledWith(operationId);

    const denied = setup(true, false, true);
    await expect(
      denied.service.retryErasureCleanup(operationId, actorId),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MAINTENANCE_SCOPE_REQUIRED' }),
    });
    expect(denied.adminErasure.retryCleanup).not.toHaveBeenCalled();
  });
});
