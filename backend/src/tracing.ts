import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://tempo:4318';
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'nexora-backend';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
  }),
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'nexora',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]:
      process.env.HOSTNAME ?? `backend-${process.pid}`,
    [SemanticResourceAttributes.SERVICE_VERSION]:
      process.env.npm_package_version ?? '0.0.0',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

console.log('🔍 OpenTelemetry Tracing initialized');

const shutdownTracing = (): Promise<void> =>
  sdk
    .shutdown()
    .then(() => console.log('✅ Tracing shutdown gracefully'))
    .catch((err) => console.error('❌ Error shutting down tracing:', err));

process.on('SIGTERM', () => {
  void shutdownTracing();
});

process.on('SIGINT', () => {
  void shutdownTracing();
});
