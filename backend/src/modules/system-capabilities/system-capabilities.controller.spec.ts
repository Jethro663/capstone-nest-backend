import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { SystemCapabilitiesController } from './system-capabilities.controller';

describe('SystemCapabilitiesController', () => {
  const snapshot = {
    version: 1 as const,
    observedAt: '2026-09-29T03:00:00.000Z',
    roleScope: ['admin'],
    capabilities: {},
  };
  const capabilities = { getSnapshot: jest.fn().mockResolvedValue(snapshot) };
  const controller = new SystemCapabilitiesController(capabilities as never);

  beforeEach(() => jest.clearAllMocks());

  it('relies on global authentication rather than exposing a public route', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SystemCapabilitiesController),
    ).not.toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        SystemCapabilitiesController.prototype.getCapabilities,
      ),
    ).not.toBe(true);
  });

  it('passes the authenticated actor and uses the standard response envelope', async () => {
    const actor = { userId: 'admin-1', roles: ['admin'] };

    await expect(controller.getCapabilities(actor)).resolves.toEqual({
      success: true,
      message: 'System capabilities retrieved',
      data: snapshot,
    });
    expect(capabilities.getSnapshot).toHaveBeenCalledWith(actor);
  });
});
