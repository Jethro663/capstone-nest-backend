import { Module, Global } from '@nestjs/common'
import * as client from 'prom-client'
import { MetricsController } from './metrics.controller'
import { allMetrics } from './utils/metrics'

// DI token used to inject the shared Registry
export const PROM_CLIENT_REGISTRY = 'PROM_CLIENT_REGISTRY'

// Create a single Registry and collect default metrics into it
export const register = new client.Registry()
client.collectDefaultMetrics({ register })

// Register custom application metrics
allMetrics.forEach((metric) => {
  register.registerMetric(metric)
})

@Global()
@Module({
  providers: [
    {
      provide: PROM_CLIENT_REGISTRY,
      useValue: register,
    },
  ],
  controllers: [MetricsController],
  exports: [PROM_CLIENT_REGISTRY],
})
export class MetricsModule {}
