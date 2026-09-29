import { SystemCapabilitiesService } from './system-capabilities.service';

const NOW = new Date('2026-09-29T03:00:00.000Z');

function fixture() {
  const academicPolicy = {
    currentState: jest.fn().mockResolvedValue({
      schoolYear: '2026-2027',
      quarter: 'Q1',
    }),
  };
  const maintenance = {
    getStatus: jest.fn().mockResolvedValue({
      available: true,
      active: false,
      state: 'inactive',
      sessionId: null,
      reason: null,
      rules: [],
      protectedRules: [],
    }),
  };
  const health = {
    getReadiness: jest.fn().mockResolvedValue({
      ready: true,
      dependencies: {
        database: { ok: true },
        redis: { ok: true },
        aiService: { ok: true },
      },
    }),
  };
  const workflow = {
    getSnapshot: jest.fn().mockResolvedValue({
      healthy: false,
      alerts: [
        {
          code: 'failed_jobs_present',
          severity: 'warning',
          message: 'One failed workflow.',
        },
      ],
    }),
  };
  const service = new SystemCapabilitiesService(
    academicPolicy as never,
    maintenance as never,
    health as never,
    workflow as never,
    () => new Date(NOW),
  );
  return { service, academicPolicy, maintenance, health, workflow };
}

describe('SystemCapabilitiesService', () => {
  it('composes current owner state for administrators', async () => {
    const { service } = fixture();

    await expect(
      service.getSnapshot({ userId: 'admin-1', roles: ['admin'] }),
    ).resolves.toEqual({
      version: 1,
      observedAt: NOW.toISOString(),
      roleScope: ['admin'],
      capabilities: {
        academicOperations: {
          available: true,
          allowed: true,
          state: 'active',
          reasonCode: null,
          source: 'academic-state',
          observedAt: NOW.toISOString(),
        },
        maintenanceAccess: {
          available: true,
          allowed: true,
          state: 'inactive',
          reasonCode: null,
          source: 'admin-maintenance',
          observedAt: NOW.toISOString(),
        },
        systemReadiness: {
          available: true,
          allowed: true,
          state: 'ready',
          reasonCode: null,
          source: 'health-readiness',
          observedAt: NOW.toISOString(),
        },
        workflowDiagnostics: {
          available: true,
          allowed: true,
          state: 'degraded',
          reasonCode: 'failed_jobs_present',
          source: 'workflow-diagnostics',
          observedAt: NOW.toISOString(),
        },
      },
    });
  });

  it('does not call protected admin owners for a student', async () => {
    const { service, maintenance, workflow } = fixture();

    const snapshot = await service.getSnapshot({
      userId: 'student-1',
      roles: ['student'],
    });

    expect(maintenance.getStatus).not.toHaveBeenCalled();
    expect(workflow.getSnapshot).not.toHaveBeenCalled();
    expect(snapshot.capabilities.academicOperations).toMatchObject({
      available: true,
      allowed: false,
      state: 'blocked',
      reasonCode: 'role_not_allowed',
    });
    expect(snapshot.capabilities.maintenanceAccess).toMatchObject({
      allowed: false,
      state: 'blocked',
      reasonCode: 'role_not_allowed',
    });
    expect(snapshot.capabilities.workflowDiagnostics).toMatchObject({
      allowed: false,
      state: 'blocked',
      reasonCode: 'role_not_allowed',
    });
    expect(snapshot.capabilities.systemReadiness).toMatchObject({
      allowed: true,
      state: 'ready',
    });
  });

  it('isolates owner failures as unknown without erasing truthful entries', async () => {
    const { service, academicPolicy } = fixture();
    academicPolicy.currentState.mockRejectedValueOnce(
      new Error('academic database unavailable'),
    );

    const snapshot = await service.getSnapshot({
      userId: 'admin-1',
      roles: ['admin'],
    });

    expect(snapshot.capabilities.academicOperations).toMatchObject({
      available: false,
      allowed: true,
      state: 'unknown',
      reasonCode: 'academic_state_unavailable',
    });
    expect(snapshot.capabilities.systemReadiness.state).toBe('ready');
    expect(snapshot.capabilities.maintenanceAccess.state).toBe('inactive');
  });

  it('maps unavailable maintenance and dependency readiness without protected detail leakage', async () => {
    const { service, maintenance, health } = fixture();
    maintenance.getStatus.mockResolvedValueOnce({
      available: false,
      active: false,
      state: 'unavailable',
      sessionId: 'must-not-leak',
      reason: 'must-not-leak',
      rules: [{ code: 'must-not-leak' }],
      protectedRules: [{ code: 'must-not-leak' }],
    });
    health.getReadiness.mockResolvedValueOnce({
      ready: false,
      dependencies: { database: { ok: false } },
    });

    const snapshot = await service.getSnapshot({
      userId: 'admin-1',
      roles: ['admin'],
    });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.capabilities.maintenanceAccess).toMatchObject({
      available: false,
      allowed: false,
      state: 'blocked',
      reasonCode: 'maintenance_unavailable',
    });
    expect(snapshot.capabilities.systemReadiness).toMatchObject({
      available: true,
      allowed: true,
      state: 'degraded',
      reasonCode: 'dependencies_not_ready',
    });
    expect(serialized).not.toContain('sessionId');
    expect(serialized).not.toContain('must-not-leak');
  });
});
