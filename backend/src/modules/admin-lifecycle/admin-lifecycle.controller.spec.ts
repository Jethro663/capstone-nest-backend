import 'reflect-metadata';
import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { AdminLifecycleController } from './admin-lifecycle.controller';

describe('AdminLifecycleController', () => {
  const lifecycle: any = {
    previewStudent: jest.fn(),
    executeStudent: jest.fn(),
    getOperation: jest.fn(),
  };
  const controller = new AdminLifecycleController(lifecycle);

  beforeEach(() => jest.resetAllMocks());

  it('is restricted to administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminLifecycleController)).toEqual([
      RoleName.Admin,
    ]);
  });

  it('uses the standard response envelope for preview', async () => {
    lifecycle.previewStudent.mockResolvedValue({
      manifest: { safeToExecute: true },
    });
    const dto: any = { studentId: 'student' };

    await expect(controller.previewStudent(dto)).resolves.toEqual({
      success: true,
      message: 'Student lifecycle preview generated',
      data: { manifest: { safeToExecute: true } },
    });
  });

  it('passes the authenticated actor to execution', async () => {
    lifecycle.executeStudent.mockResolvedValue({ operationId: 'operation' });
    const dto: any = { studentId: 'student' };

    await controller.executeStudent(dto, {
      userId: 'admin',
      roles: ['admin'],
    });

    expect(lifecycle.executeStudent).toHaveBeenCalledWith(dto, 'admin');
  });
});
