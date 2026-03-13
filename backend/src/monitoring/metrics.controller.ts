import { Controller, Get, Res, Inject } from '@nestjs/common';
import type { Response } from 'express';
import type { Registry } from 'prom-client';
import { Public } from 'src/modules/auth/decorators/public.decorator';

const PROM_CLIENT_REGISTRY = 'PROM_CLIENT_REGISTRY';

@Public()
@Controller()
export class MetricsController {
  constructor(
    @Inject(PROM_CLIENT_REGISTRY) private readonly register: Registry,
  ) {}

  @Get('/metrics')
  async metrics(@Res() res: Response) {
    res.set('Content-Type', this.register.contentType);
    res.end(await this.register.metrics());
  }
}
