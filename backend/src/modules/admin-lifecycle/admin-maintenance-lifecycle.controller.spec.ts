import 'reflect-metadata';
import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { AdminMaintenanceLifecycleController } from './admin-maintenance-lifecycle.controller';

const ACTOR = { userId: 'admin-id', roles: ['admin'] };

describe('AdminMaintenanceLifecycleController', () => {
  const lifecycle = {
    previewStudent: jest.fn(),
    executeStudent: jest.fn(),
    previewClass: jest.fn(),
    executeClass: jest.fn(),
    previewSection: jest.fn(),
    executeSection: jest.fn(),
    previewPurge: jest.fn(),
    executePurge: jest.fn(),
    previewPurgeBatch: jest.fn(),
    executePurgeBatch: jest.fn(),
    retryErasureCleanup: jest.fn(),
    getOperation: jest.fn(),
  };
  const controller = new AdminMaintenanceLifecycleController(lifecycle as any);

  beforeEach(() => jest.resetAllMocks());

  it('is restricted to administrators', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminMaintenanceLifecycleController),
    ).toEqual([RoleName.Admin]);
  });

  it('delegates student preview and execution to the governed lifecycle', async () => {
    const preview: any = { studentId: 'student-id' };
    const execute: any = { ...preview, manifestHash: 'a'.repeat(64) };
    lifecycle.previewStudent.mockResolvedValue({ manifest: { decision: {} } });
    lifecycle.executeStudent.mockResolvedValue({ operationId: 'operation-id' });

    await controller.previewStudent(preview, ACTOR);
    await controller.executeStudent(execute, ACTOR);

    expect(lifecycle.previewStudent).toHaveBeenCalledWith(
      preview,
      ACTOR.userId,
    );
    expect(lifecycle.executeStudent).toHaveBeenCalledWith(
      execute,
      ACTOR.userId,
      { requireMaintenance: true },
    );
  });

  it('delegates class, section, purge, and operation routes', async () => {
    lifecycle.previewClass.mockResolvedValue({});
    lifecycle.executeClass.mockResolvedValue({});
    lifecycle.previewSection.mockResolvedValue({});
    lifecycle.executeSection.mockResolvedValue({});
    lifecycle.previewPurge.mockResolvedValue({});
    lifecycle.executePurge.mockResolvedValue({});
    lifecycle.getOperation.mockResolvedValue({});

    await controller.previewClass({} as never);
    await controller.executeClass({} as never, ACTOR);
    await controller.previewSection({} as never, ACTOR);
    await controller.executeSection({} as never, ACTOR);
    await controller.previewPurge({} as never);
    await controller.executePurge({} as never, ACTOR);
    await controller.operation('operation-id');

    expect(lifecycle.executeClass).toHaveBeenCalledWith({}, ACTOR.userId, {
      requireMaintenance: true,
    });
    expect(lifecycle.previewSection).toHaveBeenCalledWith({}, ACTOR.userId);
    expect(lifecycle.executeSection).toHaveBeenCalledWith({}, ACTOR.userId, {
      requireMaintenance: true,
    });
    expect(lifecycle.executePurge).toHaveBeenCalledWith({}, ACTOR.userId, {
      requireMaintenance: true,
    });
    expect(lifecycle.getOperation).toHaveBeenCalledWith('operation-id');
  });

  it('delegates one complete purge batch and cleanup retry with the actor', async () => {
    lifecycle.previewPurgeBatch.mockResolvedValue({ targets: [] });
    lifecycle.executePurgeBatch.mockResolvedValue({
      operationId: 'operation-id',
    });
    lifecycle.retryErasureCleanup.mockResolvedValue({
      status: 'cleanup_pending',
    });
    const preview = {
      targetType: 'CLASS',
      targetIds: ['00000000-0000-4000-8000-000000000001'],
      purgeMode: 'CASCADE_ERASE',
    } as never;
    const execute = { ...preview, confirmation: 'ERASE 1 CLASS' } as never;

    await controller.previewPurgeBatch(preview, ACTOR);
    await controller.executePurgeBatch(execute, ACTOR);
    await controller.retryCleanup('operation-id', ACTOR);

    expect(lifecycle.previewPurgeBatch).toHaveBeenCalledWith(
      preview,
      ACTOR.userId,
    );
    expect(lifecycle.executePurgeBatch).toHaveBeenCalledWith(
      execute,
      ACTOR.userId,
    );
    expect(lifecycle.retryErasureCleanup).toHaveBeenCalledWith(
      'operation-id',
      ACTOR.userId,
    );
  });
});
