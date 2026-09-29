import type { Response } from 'express';
import { Logger } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import {
  workflowDiagnosticsCollectionFailures,
  workflowFailedJobsTotal,
  workflowJobsTotal,
  workflowOldestNonterminalAgeSeconds,
} from './utils/metrics';

describe('MetricsController workflow metrics', () => {
  const register = {
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('metrics-body'),
  };
  const databaseService = {
    getPoolDiagnostics: jest.fn().mockReturnValue({
      totalCount: 3,
      idleCount: 2,
      waitingCount: 0,
    }),
  };
  const response = {
    set: jest.fn(),
    end: jest.fn(),
  } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('publishes only fixed-status aggregate gauges', async () => {
    const workflowDiagnostics = {
      getSnapshot: jest.fn().mockResolvedValue({
        totals: [
          { status: 'pending', count: 2, oldestAgeSeconds: 600 },
          { status: 'processing', count: 1, oldestAgeSeconds: 30 },
          { status: 'completed', count: 4, oldestAgeSeconds: null },
          { status: 'approved', count: 3, oldestAgeSeconds: null },
          { status: 'cancelled', count: 1, oldestAgeSeconds: null },
          { status: 'rejected', count: 2, oldestAgeSeconds: null },
          { status: 'failed', count: 5, oldestAgeSeconds: null },
        ],
      }),
    };
    const jobsSet = jest.spyOn(workflowJobsTotal, 'set');
    const oldestSet = jest.spyOn(workflowOldestNonterminalAgeSeconds, 'set');
    const failedSet = jest.spyOn(workflowFailedJobsTotal, 'set');
    const controller = new MetricsController(
      register as never,
      databaseService as never,
      workflowDiagnostics as never,
    );

    await controller.metrics(response);

    expect(jobsSet).toHaveBeenCalledTimes(7);
    expect(jobsSet).toHaveBeenCalledWith({ status: 'pending' }, 2);
    expect(jobsSet).toHaveBeenCalledWith({ status: 'approved' }, 3);
    expect(oldestSet).toHaveBeenCalledWith(600);
    expect(failedSet).toHaveBeenCalledWith(5);
    expect(response.end).toHaveBeenCalledWith('metrics-body');
    for (const call of jobsSet.mock.calls) {
      expect(Object.keys(call[0] as object)).toEqual(['status']);
    }
  });

  it('keeps metrics available and counts workflow collection failures', async () => {
    const workflowDiagnostics = {
      getSnapshot: jest.fn().mockRejectedValue(new Error('database offline')),
    };
    const failuresInc = jest.spyOn(
      workflowDiagnosticsCollectionFailures,
      'inc',
    );
    const controller = new MetricsController(
      register as never,
      databaseService as never,
      workflowDiagnostics as never,
    );

    await controller.metrics(response);

    expect(failuresInc).toHaveBeenCalledTimes(1);
    expect(response.end).toHaveBeenCalledWith('metrics-body');
  });
});
