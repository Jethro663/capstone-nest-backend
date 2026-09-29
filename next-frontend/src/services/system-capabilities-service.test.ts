import { api } from '@/lib/api-client';
import { adminService } from '@/services/admin-service';
import { systemCapabilitiesService } from '@/services/system-capabilities-service';

jest.mock('@/lib/api-client', () => ({
  api: { get: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('system safety services', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unwraps the authenticated system capability snapshot', async () => {
    const snapshot = {
      version: 1,
      observedAt: '2026-09-29T03:00:00.000Z',
      roleScope: ['admin'],
      capabilities: {},
    };
    mockedApi.get.mockResolvedValue({
      data: { success: true, message: 'ok', data: snapshot },
    });

    await expect(systemCapabilitiesService.getSnapshot()).resolves.toBe(
      snapshot,
    );
    expect(mockedApi.get).toHaveBeenCalledWith('/system/capabilities');
  });

  it('unwraps aggregate workflow diagnostics for the admin console', async () => {
    const workflow = {
      observedAt: '2026-09-29T03:00:00.000Z',
      healthy: false,
      staleAfterSeconds: 900,
      totals: [],
      alerts: [],
    };
    mockedApi.get.mockResolvedValue({
      data: { success: true, message: 'ok', data: workflow },
    });

    await expect(adminService.getWorkflowDiagnostics()).resolves.toBe(
      workflow,
    );
    expect(mockedApi.get).toHaveBeenCalledWith('/health/workflows');
  });
});
