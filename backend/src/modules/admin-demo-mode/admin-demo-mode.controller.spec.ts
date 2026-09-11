import 'reflect-metadata';
import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { AdminDemoModeController } from './admin-demo-mode.controller';

describe('AdminDemoModeController', () => {
  const demoMode = {
    getStatus: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };
  const controller = new AdminDemoModeController(demoMode as any);

  beforeEach(() => jest.resetAllMocks());

  it('is restricted to administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminDemoModeController)).toEqual([
      RoleName.Admin,
    ]);
  });

  it('wraps status in the standard response envelope', async () => {
    demoMode.getStatus.mockResolvedValue({ active: false, version: 0 });
    await expect(controller.status()).resolves.toEqual({
      success: true,
      message: 'Demo mode status retrieved',
      data: { active: false, version: 0 },
    });
  });

  it('passes authenticated actor identity to activation', async () => {
    const dto: any = { confirmation: 'ENABLE DEMO MODE' };
    demoMode.activate.mockResolvedValue({ active: true });
    await expect(
      controller.activate(dto, { userId: ACTOR_ID, roles: ['admin'] }),
    ).resolves.toEqual({
      success: true,
      message: 'Demo mode activated',
      data: { active: true },
    });
    expect(demoMode.activate).toHaveBeenCalledWith(dto, ACTOR_ID);
  });

  it('passes authenticated actor identity to deactivation', async () => {
    const dto: any = { confirmation: 'DISABLE DEMO MODE' };
    demoMode.deactivate.mockResolvedValue({ active: false });
    await expect(
      controller.deactivate(dto, { userId: ACTOR_ID, roles: ['admin'] }),
    ).resolves.toEqual({
      success: true,
      message: 'Demo mode deactivated',
      data: { active: false },
    });
    expect(demoMode.deactivate).toHaveBeenCalledWith(dto, ACTOR_ID);
  });
});

const ACTOR_ID = '10000000-0000-4000-8000-000000000001';
