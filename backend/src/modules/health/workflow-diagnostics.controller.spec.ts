import 'reflect-metadata';
import { ROLES_KEY, RoleName } from '../auth/decorators/roles.decorator';
import { WorkflowDiagnosticsController } from './workflow-diagnostics.controller';

describe('WorkflowDiagnosticsController', () => {
  const snapshot = {
    observedAt: '2026-09-29T02:00:00.000Z',
    healthy: true,
    staleAfterSeconds: 900,
    totals: [],
    alerts: [],
  };
  const diagnostics = { getSnapshot: jest.fn().mockResolvedValue(snapshot) };
  const controller = new WorkflowDiagnosticsController(diagnostics as never);

  beforeEach(() => jest.clearAllMocks());

  it('is restricted to administrators', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, WorkflowDiagnosticsController),
    ).toEqual([RoleName.Admin]);
  });

  it('wraps aggregate workflow health in the standard response envelope', async () => {
    await expect(controller.getWorkflows()).resolves.toEqual({
      success: true,
      message: 'Workflow diagnostics retrieved',
      data: snapshot,
    });
    expect(diagnostics.getSnapshot).toHaveBeenCalledTimes(1);
  });
});
