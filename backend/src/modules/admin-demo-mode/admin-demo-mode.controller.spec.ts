import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { AdminDemoModeController } from './admin-demo-mode.controller';

describe('AdminDemoModeController', () => {
  const controller = new AdminDemoModeController();

  beforeEach(() => jest.resetAllMocks());

  it('is restricted to administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminDemoModeController)).toEqual([
      RoleName.Admin,
    ]);
  });

  it('wraps status in the standard response envelope', async () => {
    expect(controller.status()).toEqual({
      success: true,
      message: 'Demo mode status retrieved',
      data: expect.objectContaining({
        available: false,
        active: false,
        state: 'unavailable',
      }),
    });
  });

  it('fails closed instead of activating a second bypass authority', async () => {
    const dto: any = { confirmation: 'ENABLE DEMO MODE' };
    await expect(controller.activate(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a stable retired response to old deactivation clients', () => {
    const dto: any = { confirmation: 'DISABLE DEMO MODE' };
    expect(controller.deactivate(dto)).toEqual({
      success: true,
      message: 'Demo mode deactivated',
      data: expect.objectContaining({ active: false, available: false }),
    });
  });
});
