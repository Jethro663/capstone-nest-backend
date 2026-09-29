import { Controller, Get, Res, Inject, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { Registry } from 'prom-client';
import { Public } from '../modules/auth/decorators/public.decorator';
import { DatabaseService } from '../database/database.service';
import { WorkflowDiagnosticsService } from '../modules/health/workflow-diagnostics.service';
import {
  dbPoolTotal,
  dbPoolIdle,
  dbPoolWaiting,
  workflowDiagnosticsCollectionFailures,
  workflowFailedJobsTotal,
  workflowJobsTotal,
  workflowOldestNonterminalAgeSeconds,
} from './utils/metrics';

const PROM_CLIENT_REGISTRY = 'PROM_CLIENT_REGISTRY';

@Public()
@Controller()
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    @Inject(PROM_CLIENT_REGISTRY) private readonly register: Registry,
    private readonly databaseService: DatabaseService,
    private readonly workflowDiagnostics: WorkflowDiagnosticsService,
  ) {}

  @Get('/metrics')
  async metrics(@Res() res: Response) {
    const diagnostics = this.databaseService.getPoolDiagnostics();
    dbPoolTotal.set(diagnostics.totalCount);
    dbPoolIdle.set(diagnostics.idleCount);
    dbPoolWaiting.set(diagnostics.waitingCount);

    try {
      const workflow = await this.workflowDiagnostics.getSnapshot();
      workflowJobsTotal.reset();
      for (const entry of workflow.totals) {
        workflowJobsTotal.set({ status: entry.status }, entry.count);
      }
      const oldestNonterminalAge = Math.max(
        0,
        ...workflow.totals
          .filter(
            (entry) =>
              entry.status === 'pending' || entry.status === 'processing',
          )
          .map((entry) => entry.oldestAgeSeconds ?? 0),
      );
      workflowOldestNonterminalAgeSeconds.set(oldestNonterminalAge);
      workflowFailedJobsTotal.set(
        workflow.totals.find((entry) => entry.status === 'failed')?.count ?? 0,
      );
    } catch (error) {
      workflowDiagnosticsCollectionFailures.inc();
      this.logger.warn(
        `Workflow diagnostics collection failed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
    }

    res.set('Content-Type', this.register.contentType);
    res.end(await this.register.metrics());
  }
}
