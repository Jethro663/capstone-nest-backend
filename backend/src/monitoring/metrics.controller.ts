import { Controller, Get, Res, Inject } from '@nestjs/common';
import type { Response } from 'express';
import type { Registry } from 'prom-client';
import { Public } from '../modules/auth/decorators/public.decorator';
import { DatabaseService } from '../database/database.service';
import { dbPoolTotal, dbPoolIdle, dbPoolWaiting } from './utils/metrics';

const PROM_CLIENT_REGISTRY = 'PROM_CLIENT_REGISTRY';

@Public()
@Controller()
export class MetricsController {
  constructor(
    @Inject(PROM_CLIENT_REGISTRY) private readonly register: Registry,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get('/metrics')
  async metrics(@Res() res: Response) {
    const diagnostics = this.databaseService.getPoolDiagnostics();
    dbPoolTotal.set(diagnostics.totalCount);
    dbPoolIdle.set(diagnostics.idleCount);
    dbPoolWaiting.set(diagnostics.waitingCount);

    res.set('Content-Type', this.register.contentType);
    res.end(await this.register.metrics());
  }
}
